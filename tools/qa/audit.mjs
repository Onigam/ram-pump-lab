#!/usr/bin/env node
// QA audit of the whole lab: layout, 3D view, interaction robustness, weight and quality gates.
//
//   node tools/qa/audit.mjs --url http://localhost:5600/ --out /tmp/qa-run
//
// Needs the dev server running (window.__lab is exposed in dev only), Google Chrome, and puppeteer-core
// (`npm i --no-save puppeteer-core` in a scratch copy, then QA_MODULES=<its node_modules>). See tools/qa/README.md.
// Exit code: 1 when a blocker-level finding exists, 0 otherwise. Writes report.json, summary.txt and screenshots to --out.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Findings } from './findings.mjs';
import { launch, loadDeps, findChrome } from './drive.mjs';
import { walk } from './matrix.mjs';
import { runSweep } from './sweep.mjs';
import { runFlows } from './flows.mjs';
import { runPerf } from './perf.mjs';
import { runStatic } from './static.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HERE, '..', '..');

const HELP = `Usage: node tools/qa/audit.mjs [options]
  --url <url>          dev server of the lab (default http://localhost:5600/)
  --out <dir>          where to write report.json, summary.txt and the screenshots (default ./qa-out)
  --phases <list>      comma list of: matrix, sweep, flows, perf, static (default: all, run in this order: matrix, sweep, flows, static, perf)
  --viewports <list>   e.g. 1280x800,768x1024,390x844m  (m = phone emulation; default: these three)
  --langs <list>       fr,en (default both)
  --flows <list>       only these flows: random, random-phone, panel, panel-phone, language, language-phone, guides,
                       guides-phone, sim, sim-phone, reload, tools, model (default: all)
  --sections <list>    matrix sections: base, guides, parts, lessons, sheets, sim, tools (default: all)
  --quick              fewer states (2 lessons, 4 parts, 3 sheets, no 3D tools matrix, fewer flows)
  --shots <png|jpeg|none>  screenshot format (default jpeg)
  --seed <n>           seed of the random world/mode switching (default 1)
  --no-gates           skip typecheck, format:check, test and build in the static phase
  --boot <ms>          wait after load before the first measure (default 6000)
  --help`;

function parseArgs(argv) {
  const a = {
    url: 'http://localhost:5600/',
    out: path.resolve('qa-out'),
    phases: ['matrix', 'sweep', 'flows', 'static', 'perf'],
    viewports: '1280x800,768x1024,390x844m',
    langs: ['fr', 'en'],
    quick: false,
    shots: 'jpeg',
    seed: 1,
    gates: true,
    bootMs: 6000,
  };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    const v = () => argv[++i];
    if (k === '--url') a.url = v();
    else if (k === '--out') a.out = path.resolve(v());
    else if (k === '--phases') a.phases = v().split(',');
    else if (k === '--viewports') a.viewports = v();
    else if (k === '--langs') a.langs = v().split(',');
    else if (k === '--flows') a.flows = v().split(',');
    else if (k === '--sections') a.sections = v().split(',');
    else if (k === '--quick') a.quick = true;
    else if (k === '--shots') a.shots = v();
    else if (k === '--seed') a.seed = Number(v());
    else if (k === '--no-gates') a.gates = false;
    else if (k === '--boot') a.bootMs = Number(v());
    else if (k === '--help' || k === '-h') {
      console.log(HELP);
      process.exit(0);
    } else throw new Error(`Unknown option ${k}\n${HELP}`);
  }
  if (!a.url.endsWith('/')) a.url += '/';
  a.viewportList = a.viewports.split(',').map((s) => {
    const m = s.match(/^(\d+)x(\d+)(m?)$/);
    if (!m) throw new Error(`Bad viewport "${s}" (expected 1280x800 or 390x844m)`);
    const w = Number(m[1]);
    return { w, h: Number(m[2]), mobile: m[3] === 'm', phone: w <= 760, name: `${m[1]}x${m[2]}` };
  });
  return a;
}

const args = parseArgs(process.argv);
fs.mkdirSync(args.out, { recursive: true });
const t0 = Date.now();
const say = (m) => console.log(`[${String(Math.round((Date.now() - t0) / 1000)).padStart(4)} s] ${m}`);

const ctx = {
  args: { ...args, viewports: args.viewportList },
  F: new Findings(),
  states: [],
  logs: [],
  report: {},
  shotDir: path.join(args.out, 'shots'),
  outDir: args.out,
  repo: REPO,
  say,
};

/** Run a block; a hot reload of the dev server or a lost page is retried once. */
async function guard(name, fn) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await fn();
      return true;
    } catch (e) {
      const msg = String(e && e.message ? e.message : e);
      say(`${name}: ${msg.slice(0, 200)} (attempt ${attempt})`);
      if (attempt === 2) {
        ctx.F.add({
          sev: 'blocker',
          key: `audit-crash:${name}`,
          cat: 'audit',
          title: `The audit itself failed in ${name}: ${msg.slice(0, 200)}`,
          where: name,
          detail: msg,
        });
        return false;
      }
    }
  }
  return false;
}

const { puppeteer } = await loadDeps();
say(`chrome: ${findChrome()}`);
ctx.browser = await launch(puppeteer, { scrollbars: true });
ctx.puppeteer = puppeteer;

try {
  ctx.report.meta = {
    url: args.url,
    startedAt: new Date(t0).toISOString(),
    commit: safe(() => execSync('git rev-parse --short HEAD', { cwd: REPO }).toString().trim()),
    dirty: safe(
      () => execSync('git status --short', { cwd: REPO }).toString().trim().split('\n').filter(Boolean).length,
    ),
    chrome: await ctx.browser.version(),
    node: process.version,
    args: { ...args, viewportList: undefined },
    note: 'software renderer (SwiftShader): frame times and fps are not those of a phone GPU; device pixel ratio 1',
  };

  if (args.phases.includes('matrix')) {
    for (const vp of args.viewportList) {
      for (const lang of args.langs) {
        say(`matrix ${vp.name} ${lang}`);
        await guard(`matrix ${vp.name}/${lang}`, () => walk(ctx, vp, lang));
        say(`  ${ctx.states.length} states, findings ${JSON.stringify(ctx.F.counts())}`);
      }
    }
  }
  if (args.phases.includes('sweep')) {
    say('width sweep');
    await guard('sweep', () => runSweep(ctx));
  }
  if (args.phases.includes('flows')) {
    say('interaction flows');
    await guard('flows', () => runFlows(ctx));
  }
  if (args.phases.includes('static')) {
    say('static checks and gates');
    await guard('static', () => runStatic(ctx));
  }
  if (args.phases.includes('perf')) {
    say('performance');
    await guard('perf', () => runPerf(ctx));
  }
} finally {
  await ctx.browser.close().catch(() => {});
}

function safe(fn) {
  try {
    return fn();
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ report
const findings = ctx.F.list();
const counts = ctx.F.counts();
ctx.report.durationSec = Math.round((Date.now() - t0) / 1000);
ctx.report.counts = counts;
ctx.report.findings = findings;
ctx.report.states = ctx.states;
ctx.report.logs = ctx.logs;
fs.writeFileSync(path.join(args.out, 'report.json'), JSON.stringify(ctx.report, null, 1));

const lines = [];
lines.push(
  `QA audit ${ctx.report.meta.startedAt}  commit ${ctx.report.meta.commit}  ${ctx.states.length} states  ${ctx.report.durationSec} s`,
);
lines.push(`blocker ${counts.blocker}  major ${counts.major}  minor ${counts.minor}  info ${counts.info}`);
for (const f of findings) {
  const where =
    f.places.length > 3 ? `${f.places.slice(0, 3).join(' ; ')} … (+${f.places.length - 3})` : f.places.join(' ; ');
  lines.push(
    `${f.sev.toUpperCase().padEnd(7)} [${f.source}${f.ref ? ', ' + f.ref : ''}] ${f.title}  x${f.count}  ${where}`,
  );
  const agg = Object.entries(f.agg ?? {}).sort((a, b) => b[1] - a[1]);
  if (agg.length)
    lines.push(
      `        ${agg
        .slice(0, 8)
        .map(([k, n]) => `${k} (${n})`)
        .join(', ')}`,
    );
  if (f.shots.length) lines.push(`        shots: ${f.shots.join(', ')}`);
}
fs.writeFileSync(path.join(args.out, 'summary.txt'), lines.join('\n') + '\n');
console.log(lines.slice(0, 2).join('\n'));
console.log(`report: ${path.join(args.out, 'report.json')}`);
process.exit(counts.blocker > 0 ? 1 : 0);
