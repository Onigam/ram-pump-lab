// Phase "static": the quality gates of BRIEF §6 (typecheck, format, tests, build), the weight of the production bundle
// attributed to its sources, and the content checks that need no browser (lab.json, README, notices, credits, assets).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { openLab, sleep, ui } from './drive.mjs';
import { loadContent } from './matrix.mjs';

function run(cmd, args, cwd, timeoutMs = 600000) {
  const t0 = Date.now();
  const r = spawnSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    timeout: timeoutMs,
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, CI: '1', FORCE_COLOR: '0' },
  });
  const out = `${r.stdout || ''}\n${r.stderr || ''}`;
  return { ok: r.status === 0, status: r.status, ms: Date.now() - t0, out };
}

/** Decode a source map `mappings` string into segments [genLine, genCol, srcIdx]. */
function decodeMappings(mappings) {
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const val = new Map([...B64].map((c, i) => [c, i]));
  const lines = mappings.split(';');
  const out = [];
  let src = 0;
  let sl = 0;
  let sc = 0;
  let nm = 0;
  lines.forEach((line, gl) => {
    let gc = 0;
    if (!line) return;
    const segs = [];
    for (const seg of line.split(',')) {
      const nums = [];
      let shift = 0;
      let value = 0;
      for (const ch of seg) {
        const d = val.get(ch);
        const cont = d & 32;
        value += (d & 31) << shift;
        if (cont) shift += 5;
        else {
          nums.push(value & 1 ? -(value >> 1) : value >> 1);
          value = 0;
          shift = 0;
        }
      }
      if (!nums.length) continue;
      gc += nums[0];
      if (nums.length >= 4) {
        src += nums[1];
        sl += nums[2];
        sc += nums[3];
        if (nums.length >= 5) nm += nums[4];
        segs.push([gl, gc, src]);
      } else segs.push([gl, gc, -1]);
    }
    out.push(segs);
  });
  return out;
}

/** Bytes of a built chunk attributed to the source file they come from (through its source map). */
function attribute(jsFile) {
  const code = fs.readFileSync(jsFile, 'utf8');
  const map = JSON.parse(fs.readFileSync(`${jsFile}.map`, 'utf8'));
  const lines = code.split('\n');
  const segsByLine = decodeMappings(map.mappings);
  const bySource = new Map();
  segsByLine.forEach((segs, gl) => {
    const len = Buffer.byteLength(lines[gl] ?? '');
    for (let i = 0; i < segs.length; i++) {
      const start = segs[i][1];
      const end = i + 1 < segs.length ? segs[i + 1][1] : (lines[gl] ?? '').length;
      const name = segs[i][2] >= 0 ? map.sources[segs[i][2]] : '(unmapped)';
      bySource.set(name, (bySource.get(name) ?? 0) + Math.max(0, end - start));
    }
    void len;
  });
  return { total: Buffer.byteLength(code), bySource };
}

/** Group a source path into what could be loaded apart. */
function group(src) {
  const p = src.replace(/^(\.\.\/)+/, '').replace(/^\.\//, '');
  const rules = [
    [/node_modules\/three\/examples/, 'three (examples: controls, composer, outline)'],
    [/node_modules\/three\//, 'three (core)'],
    [/@onigam\/lab-kit\/dist\/drawings/, 'kit: drawings'],
    [/@onigam\/lab-kit/, 'kit: ui, three, i18n, sim'],
    [/src\/drawings\/hydraulic/, 'src/drawings/hydraulic (7 sheets)'],
    [/src\/drawings\/mechanical/, 'src/drawings/mechanical (6 sheets)'],
    [/src\/drawings/, 'src/drawings (index)'],
    [/src\/data\/parts\//, 'src/data/parts (44 sheets)'],
    [/src\/data\/lessons/, 'src/data/lessons'],
    [/src\/data\/(assembly|install|chapters)/, 'src/data guides'],
    [/src\/data/, 'src/data (helpers)'],
    [/src\/three\/site/, 'src/three/site (world)'],
    [/src\/three\/catchment/, 'src/three/catchment (world)'],
    [/src\/three\/ram/, 'src/three/ram (world)'],
    [/src\/three\/valve/, 'src/three/valve (world)'],
    [/src\/three/, 'src/three (shared: dims, common, cut)'],
    [/src\/sim/, 'src/sim (engine)'],
    [/src\/panels/, 'src/panels (sim panel)'],
    [/src\/i18n/, 'src/i18n (strings)'],
    [/src\//, 'src (lab, main, part actions)'],
    [/node_modules\//, 'other dependencies'],
  ];
  for (const [rx, name] of rules) if (rx.test(p)) return name;
  return p.startsWith('(') ? p : 'other';
}

export async function runStatic(ctx) {
  const repo = ctx.repo;
  const S = (ctx.report.static = {});

  // ------------------------------------------------------------ bundle (own build, with a source map, outside the repo)
  const dist = path.join(ctx.outDir, 'dist-qa');
  ctx.distDir = dist;
  const b = run('npx', ['vite', 'build', '--outDir', dist, '--emptyOutDir', '--sourcemap'], repo);
  S.bundleBuild = { ok: b.ok, ms: b.ms, tail: b.out.split('\n').filter(Boolean).slice(-12) };
  if (b.ok) {
    const assets = path.join(dist, 'assets');
    const files = fs.readdirSync(assets).filter((f) => !f.endsWith('.map'));
    S.files = files.map((f) => {
      const buf = fs.readFileSync(path.join(assets, f));
      return {
        file: f,
        bytes: buf.length,
        gzip: zlib.gzipSync(buf).length,
        brotli: zlib.brotliCompressSync(buf).length,
      };
    });
    S.jsBytes = S.files.filter((f) => f.file.endsWith('.js')).reduce((a, f) => a + f.bytes, 0);
    S.jsGzip = S.files.filter((f) => f.file.endsWith('.js')).reduce((a, f) => a + f.gzip, 0);
    S.jsBrotli = S.files.filter((f) => f.file.endsWith('.js')).reduce((a, f) => a + f.brotli, 0);
    S.cssBytes = S.files.filter((f) => f.file.endsWith('.css')).reduce((a, f) => a + f.bytes, 0);
    const groups = new Map();
    for (const f of S.files.filter((x) => x.file.endsWith('.js'))) {
      if (!fs.existsSync(path.join(assets, `${f.file}.map`))) continue;
      const { bySource } = attribute(path.join(assets, f.file));
      for (const [src, n] of bySource) groups.set(group(src), (groups.get(group(src)) ?? 0) + n);
    }
    const total = [...groups.values()].reduce((a, n) => a + n, 0) || 1;
    S.byGroup = [...groups.entries()]
      .map(([name, n]) => ({ name, bytes: n, pct: Math.round((1000 * n) / total) / 10 }))
      .sort((a, b) => b.bytes - a.bytes);
    // the entry document: what is loaded before the first frame
    S.indexHtml = fs.readFileSync(path.join(dist, 'index.html'), 'utf8').length;
    S.chunks = S.files.filter((f) => f.file.endsWith('.js')).length;
    S.eager =
      'all: the entry chunk statically imports every world, every drawing, every lesson and the whole catalogue (src/lab.ts)';
    if (S.chunks > 1) S.eager = `${S.chunks} chunks`;
    if (S.jsGzip > 500 * 1024) {
      ctx.F.add({
        sev: 'major',
        key: 'bundle-size',
        cat: 'weight',
        title: `The JavaScript to download before the first frame is ${(S.jsGzip / 1024).toFixed(0)} KB gzipped (${(S.jsBytes / 1024).toFixed(0)} KB raw) in ${S.chunks} chunk(s)`,
        where: 'build',
        detail: S.byGroup.slice(0, 6),
        source: 'lab',
      });
    }
  } else
    ctx.F.add({
      sev: 'blocker',
      key: 'bundle-build-failed',
      cat: 'gates',
      title: 'vite build failed in the audit',
      where: 'build',
      detail: S.bundleBuild.tail,
    });

  // ------------------------------------------------------------ gates
  if (ctx.args.gates) {
    S.gates = [];
    for (const [name, args] of [
      ['typecheck', ['run', 'typecheck']],
      ['format:check', ['run', 'format:check']],
      ['test', ['test']],
      ['build', ['run', 'build']],
    ]) {
      ctx.say(`  gate ${name}`);
      const r = run('npm', args, repo);
      const tail = r.out
        .split('\n')
        .filter((l) => l.trim())
        .slice(-8);
      const summary =
        name === 'test'
          ? (r.out.match(/Tests\s+[^\n]*/) || [''])[0] + ' | ' + (r.out.match(/Test Files\s+[^\n]*/) || [''])[0]
          : '';
      S.gates.push({
        name,
        ok: r.ok,
        status: r.status,
        seconds: Math.round(r.ms / 100) / 10,
        summary: summary.trim(),
        tail,
      });
      if (!r.ok)
        ctx.F.add({
          sev: 'blocker',
          key: `gate:${name}`,
          cat: 'gates',
          title: `Quality gate failed: npm ${args.join(' ')}`,
          where: 'gates',
          detail: tail,
          source: 'lab',
        });
    }
  }

  // ------------------------------------------------------------ content: lab.json, README, notices, assets
  const read = (f) => (fs.existsSync(path.join(repo, f)) ? fs.readFileSync(path.join(repo, f), 'utf8') : '');
  const C = (S.content = {});
  let lab = {};
  try {
    lab = JSON.parse(read('public/lab.json'));
  } catch (e) {
    ctx.F.add({
      sev: 'blocker',
      key: 'lab-json-invalid',
      cat: 'content',
      title: 'public/lab.json is not valid JSON',
      where: 'public/lab.json',
      detail: String(e),
    });
  }
  const missing = [];
  for (const k of ['title', 'tagline'])
    for (const l of ['fr', 'en']) if (!lab[k] || !lab[k][l] || !String(lab[k][l]).trim()) missing.push(`${k}.${l}`);
  if (!Array.isArray(lab.tags) || !lab.tags.length) missing.push('tags');
  if (!(lab.difficulty >= 1)) missing.push('difficulty');
  if (!(lab.minutes > 0)) missing.push('minutes');
  C.labJson = {
    missing,
    tags: lab.tags,
    difficulty: lab.difficulty,
    minutes: lab.minutes,
    energyProfile: lab.energyProfile ?? null,
  };
  if (missing.length)
    ctx.F.add({
      sev: 'major',
      key: 'lab-json-incomplete',
      cat: 'content',
      title: `public/lab.json lacks ${missing.join(', ')}`,
      where: 'public/lab.json',
      detail: missing,
    });
  if (lab.energyProfile === null || lab.energyProfile === undefined) {
    ctx.F.add({
      sev: 'info',
      key: 'lab-json-energy-profile',
      cat: 'content',
      title: 'public/lab.json: energyProfile is null (check that the hub accepts it for a lab with no electricity)',
      where: 'public/lab.json',
    });
  }

  const readme = read('README.md');
  const idxFr = readme.search(/^##\s+Fran[cç]ais/im);
  const wrong = [];
  if (/Scaffold generated from/i.test(readme)) wrong.push('still says "Scaffold generated from lab-template"');
  if (/Read `BRIEF\.md` first|Lire `BRIEF\.md`/i.test(readme))
    wrong.push('tells the reader to read BRIEF.md and to fill docs/research.md (a note to the team, not to a visitor)');
  if (/fill `docs\/research\.md`|remplir `docs\/research\.md`/i.test(readme))
    wrong.push('asks to fill docs/research.md, which is long since written');
  if (!/independent educational reconstruction|reconstruction p[ée]dagogique ind[ée]pendante/i.test(readme))
    wrong.push('has no "independent educational reconstruction" notice');
  if (!/youtube\.com|L['’]énergie partout/i.test(readme))
    wrong.push('does not credit or link the source video and its maker');
  if (!/four worlds|quatre mondes|4 worlds|catchment|captage/i.test(readme))
    wrong.push('does not describe what the lab offers (worlds, assembly, simulation, drawings, lessons)');
  if (!/safety|sécurité|potable|DDT|OFB/i.test(readme))
    wrong.push('carries none of the safety and legal notes (rigid anchored pipe, regulated water taking, potability)');
  if (idxFr < 0 || idxFr < readme.length * 0.3) wrong.push('French section is missing or not at the end');
  const frPart = idxFr >= 0 ? readme.slice(idxFr) : '';
  if (frPart && frPart.length < 600)
    wrong.push(
      `the French section is a 3-line stub (${frPart.length} characters), not a translation of the English one`,
    );
  if (!/MIT|licen[cs]e/i.test(readme)) wrong.push('does not mention the licence');
  if (!/lab-kit/i.test(readme.split(/^##\s+Fran/im)[0] || ''))
    wrong.push('does not say the frame comes from lab-kit (only in the template note)');
  C.readme = { chars: readme.length, frenchAt: idxFr, frenchChars: frPart.length, wrong };
  if (wrong.length)
    ctx.F.add({
      sev: 'major',
      key: 'readme-template',
      cat: 'content',
      title: `README.md does not describe the lab truthfully (${wrong.length} points)`,
      where: 'README.md',
      detail: wrong,
    });

  // assets: nothing taken from the video
  const walk = (dir, acc = []) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist' || e.name.startsWith('qa-out')) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p, acc);
      else acc.push(p);
    }
    return acc;
  };
  const all = walk(repo).map((p) => path.relative(repo, p));
  const media = all.filter((p) => /\.(png|jpe?g|gif|webp|avif|mp4|webm|mov|mp3|wav)$/i.test(p));
  const ytimg = all
    .filter((p) => /\.(ts|mjs|html|css|md|json|svg)$/i.test(p) && !/^docs\/transcript|^tools\/qa|^docs\/qa\.md/.test(p))
    .filter((p) => /i\.ytimg\.com|img\.youtube\.com|maxresdefault|hqdefault/.test(read(p)));
  C.assets = { mediaFiles: media, thumbnailReferences: ytimg, publicFiles: all.filter((p) => p.startsWith('public/')) };
  if (media.length)
    ctx.F.add({
      sev: 'major',
      key: 'media-files',
      cat: 'content',
      title: `Image, audio or video files in the repository (check none comes from the video): ${media.slice(0, 5).join(', ')}`,
      where: 'repo',
      detail: media,
    });
  if (ytimg.length)
    ctx.F.add({
      sev: 'major',
      key: 'video-thumbnails',
      cat: 'content',
      title: 'A file references a YouTube thumbnail',
      where: 'repo',
      detail: ytimg,
    });
  const transcriptTracked = spawnSync('git', ['ls-files', 'docs/transcript.md'], {
    cwd: repo,
    encoding: 'utf8',
  }).stdout.trim();
  C.transcriptTracked = !!transcriptTracked;
  if (transcriptTracked)
    ctx.F.add({
      sev: 'blocker',
      key: 'transcript-tracked',
      cat: 'content',
      title: 'docs/transcript.md is tracked by git (it must stay private)',
      where: 'docs/transcript.md',
    });

  // ------------------------------------------------------------ notices, credits, warnings in the running app
  const N = (C.notices = {});
  for (const lang of ctx.args.langs) {
    const P = await openLab(ctx.browser, {
      url: ctx.args.url,
      w: 1280,
      h: 800,
      lang,
      bootMs: Math.min(ctx.args.bootMs, 3000),
    });
    try {
      const content = await loadContent(P.page);
      await ui.mode(P.page, 'about');
      await sleep(500);
      const about = await P.page.evaluate(() => ({
        text: document.querySelector('.panel__body').innerText,
        links: [...document.querySelectorAll('.panel__body a')].map((a) => ({
          href: a.href,
          text: a.textContent.trim().slice(0, 50),
          rel: a.rel,
          target: a.target,
        })),
        warns: document.querySelectorAll('.panel__body .callout--warn').length,
        tips: document.querySelectorAll('.panel__body .callout--tip').length,
      }));
      const guideText = await P.page.evaluate(async () => {
        const [a, i] = await Promise.all([import('/src/data/assembly.ts'), import('/src/data/install.ts')]);
        const lang = document.documentElement.lang === 'en' ? 'en' : 'fr';
        const txt = (s) =>
          [s.text, s.warning, s.tip]
            .filter(Boolean)
            .map((x) => x[lang] ?? '')
            .join(' ');
        return {
          assembly: a.ASSEMBLY.map(txt).join('\n'),
          install: i.INSTALL.map(txt).join('\n'),
          warned: i.INSTALL.filter((s) => s.warning).length,
          warnedAssembly: a.ASSEMBLY.filter((s) => s.warning).length,
        };
      });
      const has = (rx, t) => rx.test(t);
      const checks = {
        disclaimer: has(/independent educational|indépendante|independent/i, about.text),
        notOfficial: has(/not an official|pas un plan officiel|not a product|pas un produit|official/i, about.text),
        credit:
          about.links.some((l) => /youtube\.com\/watch\?v=mc0gq5rObcM/.test(l.href)) &&
          has(/L’énergie partout/, about.text),
        thanks: has(/Nebreda/, about.text),
        noFootage: has(/No footage|Aucune image/i, about.text),
        safety: has(/rigid|rigide|anchor|ancr|finger|doigt/i, about.text),
        legal: has(/DDT|OFB|regulated|réglement/i, about.text),
        potable: has(/potable/i, about.text),
        externalLinksSafe: about.links
          .filter((l) => /^https?:/.test(l.href) && !/localhost/.test(l.href))
          .every((l) => /noopener/.test(l.rel) && l.target === '_blank'),
        installWarnsLegal: has(/DDT|OFB|regulated|réglement/i, guideText.install),
        installWarnsPotable: has(/potable/i, guideText.install),
        installWarnsRigid: has(/rigid|rigide/i, guideText.install),
        assemblyWarnsFinger: has(/finger|doigt/i, guideText.assembly),
        sourcesLinks: about.links.length,
        warnCallouts: about.warns,
      };
      N[lang] = checks;
      const lacks = Object.entries(checks)
        .filter(([k, v]) => v === false)
        .map(([k]) => k);
      if (lacks.length)
        ctx.F.add({
          sev: lacks.some((k) => ['disclaimer', 'credit', 'safety', 'legal', 'potable'].includes(k))
            ? 'major'
            : 'minor',
          key: `notices:${lang}`,
          cat: 'content',
          title: `Missing or not found in the ${lang} app: ${lacks.join(', ')}`,
          where: `about/${lang}`,
          detail: checks,
        });
      N[`${lang}-install-steps-with-warning`] = `${guideText.warned}/${content.install.length}`;
    } finally {
      await P.close().catch(() => {});
    }
  }
  // the page head
  const html = read('index.html');
  C.head = {
    title: (html.match(/<title>([^<]*)<\/title>/) || [])[1],
    description: /<meta\s+name="description"/.test(html),
    lang: (html.match(/<html lang="([^"]+)"/) || [])[1],
    favicon: fs.existsSync(path.join(repo, 'public/favicon.svg')),
  };
}
