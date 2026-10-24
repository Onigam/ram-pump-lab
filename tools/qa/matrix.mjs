// Phase "matrix": every viewport × language × world × mode (and the states that need a part, a guide step, a lesson, a
// sheet, a simulation panel section or a 3D tool), measured by DOM and by projection, with a screenshot of each.
import fs from 'node:fs';
import path from 'node:path';
import { WORLDS, openLab, settle, sleep, ui } from './drive.mjs';
import { analyzeCanvas, analyzeDrawing, analyzeLayout, analyzeState, analyzeSubject } from './rules.mjs';
import { canvasHealth, drawingProbe, layoutProbe, stateProbe, subjectProbe } from './measure.mjs';

/** One part per world and category (and the ones with a test button), checked on its four tabs. */
export const PARTS_TO_CHECK = [
  'spring', // site, site
  'drive-pipe', // site, hydraulic
  'water-tower', // site, structure
  'tank-shell', // catchment, structure
  'tank-drain', // catchment, hydraulic, test button
  'air-chamber', // ram, hydraulic, test button
  'waste-valve', // ram, hydraulic, test button + link to the valve world
  'foundation', // ram, structure
  'valve-seat', // valve, mechanical
  'stroke-nut', // valve, mechanical, two buttons
  'base-plate', // valve, structure
];

/** The part shown for the tools of each world (X-ray in a landscape needs one). */
const TOOL_PART = { site: 'drive-pipe', catchment: 'intake-screen', ram: 'air-chamber', valve: 'valve-seat' };

/** Content of the lab read from the running app (the same modules the app loaded). */
export async function loadContent(page) {
  return page.evaluate(async () => {
    const [parts, assembly, install, lessons, sheets] = await Promise.all([
      import('/src/data/parts.ts'),
      import('/src/data/assembly.ts'),
      import('/src/data/install.ts'),
      import('/src/data/lessons.ts'),
      import('/src/drawings/index.ts'),
    ]);
    const step = (s) => ({ id: s.id, scene: s.scene ?? null, parts: s.parts, hasWarning: !!s.warning });
    return {
      parts: parts.PARTS.map((p) => ({ id: p.id, scene: p.scene, category: p.category, hasDesign: !!p.design })),
      assembly: assembly.ASSEMBLY.map(step),
      install: install.INSTALL.map(step),
      lessons: lessons.LESSONS.map((x) => ({
        id: x.id,
        quiz: (x.quiz ?? []).length,
        scene: x.focus.scene,
        part: x.focus.part ?? null,
      })),
      sheets: sheets.SHEETS.map((s) => ({ id: s.id, number: s.number, group: s.group })),
    };
  });
}

/** Indexes of the first and the last step of each stretch of a guide that plays in one world. */
export function stepEdges(steps, defaultScene) {
  const edges = [];
  let prev = null;
  steps.forEach((s, i) => {
    const sc = s.scene ?? defaultScene;
    if (sc !== prev) {
      if (prev !== null) edges.push({ i: i - 1, scene: prev, kind: 'last' });
      edges.push({ i, scene: sc, kind: 'first' });
      prev = sc;
    }
  });
  edges.push({ i: steps.length - 1, scene: prev, kind: 'last' });
  return edges;
}

/** A recorder for the states of one (viewport, language) page. */
export function makeSnap(ctx, P, vp, lang) {
  let n = 0;
  const dir = path.join(ctx.shotDir, `${vp.name}-${lang}`);
  if (ctx.args.shots !== 'none') fs.mkdirSync(dir, { recursive: true });
  return async function snap(name, o = {}) {
    const { page } = P;
    if (o.wait !== false) await settle(page);
    else await sleep(o.sleep ?? 150);
    const st = await page.evaluate(stateProbe);
    const mode = st.ui.mode;
    const at = `${vp.name}/${lang}/${st.ui.scene}/${mode}/${name}`;
    const file = `${String(++n).padStart(3, '0')}-${st.ui.scene}-${name}.${ctx.args.shots === 'png' ? 'png' : 'jpg'}`;
    const shotRel = `${vp.name}-${lang}/${file}`;
    const w = {
      at,
      phone: vp.phone,
      world: st.ui.scene,
      exploded: st.ui.explode > 0.3,
      kind: o.kind ?? 'device',
      sheet: o.sheetId,
    };
    const L = await page.evaluate(layoutProbe, { phone: vp.phone });
    let S = null;
    let C = null;
    let D = null;
    if (mode === 'plans') D = await page.evaluate(drawingProbe);
    else if (!o.no3d) {
      S = await page.evaluate(subjectProbe, { phone: vp.phone, ids: o.ids });
      C = await page.evaluate(canvasHealth);
    }
    if (ctx.args.shots !== 'none') {
      const opts = ctx.args.shots === 'png' ? { type: 'png' } : { type: 'jpeg', quality: 80 };
      await page.screenshot({ path: path.join(dir, file), ...opts });
    }
    const shot = ctx.args.shots === 'none' ? undefined : shotRel;
    analyzeState(ctx.F, w, st, shot);
    analyzeLayout(ctx.F, w, L, shot);
    analyzeSubject(ctx.F, w, S, shot);
    analyzeCanvas(ctx.F, w, C, shot);
    analyzeDrawing(ctx.F, w, D, shot);
    ctx.states.push({
      at,
      shot,
      counts: {
        interactive: L.counts.interactive,
        overlaps: L.overlaps.length,
        covered: L.covered.length,
        truncated: L.truncated.length,
        hotspots: L.hotspots.count,
        hotspotOverlaps: L.hotspots.overlapping.length,
      },
      subject:
        S && S.union
          ? { outsideCanvasPct: S.outsideCanvasPct, underSheetPct: S.underSheetPct, sizePct: S.sizePct }
          : null,
      canvas: C ? { meanLuma: C.meanLuma, nonBackgroundPct: C.nonBackgroundPct } : null,
    });
    return { st, L, S, C, D, shot };
  };
}

/** Walk every state of one viewport and language. */
export async function walk(ctx, vp, lang) {
  const P = await openLab(ctx.browser, {
    url: ctx.args.url,
    w: vp.w,
    h: vp.h,
    mobile: vp.mobile,
    lang,
    bootMs: ctx.args.bootMs,
  });
  const { page } = P;
  const snap = makeSnap(ctx, P, vp, lang);
  try {
    await page.evaluate(() => window.__lab.engine.set({ running: false }));
    const content = await loadContent(page);
    ctx.content = content;
    const first = lang === ctx.args.langs[0];
    const quick = ctx.args.quick;
    const want = (name) => !ctx.args.sections || ctx.args.sections.includes(name);

    // ---- every world × mode
    if (want('base')) {
      for (const world of WORLDS) {
        await ui.mode(page, 'explore');
        await ui.world(page, world);
        for (const mode of ['explore', 'sim', 'plans', 'lessons', 'parts', 'about']) {
          await ui.mode(page, mode);
          await snap(`${world}-${mode}`, {
            wait: mode !== 'about' && mode !== 'parts' && mode !== 'lessons' && mode !== 'plans',
          });
        }
        if (vp.phone) {
          await ui.mode(page, 'explore');
          await ui.sheet(page, false);
          await snap(`${world}-explore-sheet-closed`);
          await ui.sheet(page, true);
        }
      }
      await ui.mode(page, 'explore');
      await ui.world(page, 'site');
      await settle(page);
    }

    // ---- guides: first and last step of each stretch
    if (want('guides')) {
      for (const [mode, key, def] of [
        ['assembly', 'assembly', 'valve'],
        ['install', 'install', 'site'],
      ]) {
        await ui.mode(page, mode);
        await settle(page);
        const steps = content[key];
        for (const e of stepEdges(steps, def)) {
          await ui.click(page, '.timeline .tick', e.i);
          await settle(page);
          await snap(`${mode}-step${e.i + 1}-${e.kind}-${e.scene}`, {
            wait: false,
            kind: 'step',
            ids: steps[e.i].parts.length ? steps[e.i].parts : undefined,
          });
        }
        await ui.mode(page, 'explore');
      }
    }

    // ---- a selected part on its four tabs
    if (want('parts')) {
      const ids = quick ? PARTS_TO_CHECK.slice(0, 4) : PARTS_TO_CHECK;
      for (const id of ids) {
        const idx = content.parts.findIndex((p) => p.id === id);
        if (idx < 0) continue;
        await ui.mode(page, 'parts');
        await ui.click(page, '.cat-row', idx);
        await settle(page, { min: 600 });
        const tabs = await ui.count(page, '.tabs .tab');
        for (let t = 0; t < tabs; t++) {
          await ui.click(page, '.tabs .tab', t);
          await snap(`part-${id}-tab${t + 1}`, { wait: t === 0, kind: 'part', ids: [id] });
        }
      }
      await ui.set(page, { selected: null });
    }

    // ---- the lessons, with their quiz
    if (want('lessons')) {
      await ui.mode(page, 'lessons');
      const lessonN = content.lessons.length;
      for (let i = 0; i < (quick ? 2 : lessonN); i++) {
        await ui.mode(page, 'lessons');
        await ui.click(page, '.lesson-card', i);
        await settle(page, { min: 600 });
        await snap(`lesson-${content.lessons[i].id}`, { wait: false });
        // a right and a wrong answer: the feedback is part of the layout
        const groups = await ui.count(page, '.quiz__choices');
        for (let g = 0; g < groups; g++) await ui.click(page, '.quiz__choice', g * 4 + (g % 2 ? 3 : 0));
        await sleep(200);
        await snap(`lesson-${content.lessons[i].id}-quiz`, { wait: false, no3d: true });
      }
      await ui.set(page, { lesson: null, selected: null });
    }

    // ---- the drawing sheets
    if (want('sheets')) {
      await ui.mode(page, 'plans');
      const all = vp.w === 1280 && !quick;
      const picks = all
        ? content.sheets.map((_, i) => i)
        : [0, Math.floor(content.sheets.length / 2), content.sheets.length - 1];
      for (const i of picks) {
        await ui.click(page, '.sheet-row', i);
        await snap(`sheet-${content.sheets[i].number}`, { wait: false, sleep: 300, sheetId: content.sheets[i].number });
      }
    }

    // ---- the simulation panel
    if (want('sim')) {
      await ui.mode(page, 'explore');
      await ui.world(page, 'ram');
      await ui.mode(page, 'sim');
      await settle(page);
      await page.evaluate(() => document.querySelectorAll('.sim details').forEach((d) => (d.open = false)));
      await snap('sim-sections-closed', { wait: false });
      await page.evaluate(() => document.querySelectorAll('.sim details').forEach((d) => (d.open = true)));
      await sleep(500);
      await snap('sim-sections-open', { wait: false });
      await page.evaluate(() => {
        const b = document.querySelector('.panel__body');
        b.scrollTop = b.scrollHeight;
      });
      await sleep(300);
      const sim = await snap('sim-scrolled-to-end', { wait: false });
      const reach = await page.evaluate(() => {
        const b = document.querySelector('.panel__body');
        return { left: b.scrollHeight - b.clientHeight - b.scrollTop };
      });
      if (reach.left > 2) {
        ctx.F.add({
          sev: 'major',
          key: 'sim-end-unreachable',
          cat: 'layout',
          title: 'The end of the simulation panel cannot be scrolled to',
          where: `${vp.name}/${lang}`,
          detail: reach,
          source: 'kit',
        });
      }
      void sim;
      await page.evaluate(() => document.querySelector('.panel__body').scrollTo(0, 0));
      const presets = ['valve-3', 'valve-2', 'valve-1'];
      const scenarioN = await ui.count(page, '.sim > .part-chips .part-chip');
      const runSim = async (ms) => {
        await page.evaluate(() => window.__lab.engine.set({ running: true, timeScale: 3600 }));
        await sleep(ms);
        await page.evaluate(() => window.__lab.engine.set({ running: false, timeScale: 1 }));
      };
      if (first || vp.phone) {
        for (const p of presets) {
          await page.evaluate((id) => {
            const sel = document.querySelector('.sim select');
            sel.value = id;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          }, p);
          await runSim(1800);
          await snap(`sim-preset-${p}`, { wait: false, no3d: true });
        }
        for (let i = 0; i < Math.min(scenarioN, quick ? 3 : 8); i++) {
          await ui.click(page, '.sim > .part-chips .part-chip', i);
          await runSim(1800);
          await snap(`sim-scenario-${i + 1}`, { wait: false, no3d: true });
        }
      }
    }

    // ---- the 3D tools in each world (first language only: the 3D does not depend on it)
    if (want('tools')) {
      if ((first || ctx.args.sections) && !quick) {
        await page.evaluate(() => window.__lab.engine.set({ running: false }));
        await ui.mode(page, 'explore');
        // on a phone the toolbar sits behind the open sheet: a visitor who wants a tool closes the sheet first
        if (vp.phone) await ui.sheet(page, false);
        for (const world of WORLDS) {
          await ui.world(page, world);
          await settle(page);
          const reset = {
            explode: 0,
            xray: false,
            isolate: false,
            cutaway: false,
            schematic: false,
            labels: 'main',
            selected: null,
          };
          await ui.set(page, reset);
          await settle(page);
          await ui.set(page, { explode: 0.5 });
          await sleep(1800);
          await snap(`tool-explode-0.5`, { wait: true });
          await ui.set(page, { explode: 1 });
          await sleep(1800);
          await snap(`tool-explode-1`, { wait: true });
          await ui.set(page, reset);
          await sleep(1800); // the explode factor decays over about a second: select and frame the part once it is home
          const part = TOOL_PART[world];
          await ui.set(page, { selected: part });
          await page.evaluate((id) => window.__lab.stage.frameParts([id], 2.2), part);
          await settle(page);
          await ui.set(page, { xray: true });
          await snap('tool-xray-selected', { wait: false, sleep: 500, kind: 'part', ids: [part] });
          await ui.set(page, { xray: false, isolate: true });
          await page.evaluate((id) => window.__lab.stage.frameParts([id], 1.5), part);
          await settle(page);
          await snap('tool-isolate', { wait: false, sleep: 300, kind: 'part', ids: [part] });
          await ui.set(page, reset);
          await sleep(700); // the display (isolate, X-ray) is applied on the next frames: frame the whole device after it
          await page.evaluate(() => window.__lab.stage.frameAll(0.01));
          await settle(page);
          if (world !== 'site') {
            await ui.set(page, { xray: true });
            await sleep(600);
            await snap('tool-xray-whole', { wait: false });
            await ui.set(page, { xray: false });
          }
          await ui.set(page, { cutaway: true });
          await sleep(600);
          await snap('tool-section', { wait: false });
          await ui.set(page, { cutaway: false, schematic: true });
          await page.evaluate(() => window.__lab.engine.set({ running: true }));
          await sleep(1500);
          await snap('tool-flows', { wait: false });
          await page.evaluate(() => window.__lab.engine.set({ running: false }));
          await ui.set(page, { schematic: false, labels: 'all' });
          await sleep(300);
          await snap('tool-labels-all', { wait: false });
          await ui.set(page, reset);
        }
      }
    }
  } finally {
    ctx.logs.push({ at: `${vp.name}/${lang}`, ...P.log });
    for (const e of P.log.errors) {
      ctx.F.add({
        sev: 'blocker',
        key: `error:${e.kind}:${e.text.slice(0, 80)}`,
        cat: 'errors',
        title: `${e.kind}: ${e.text.slice(0, 160)}`,
        where: `${vp.name}/${lang}`,
        detail: e,
      });
    }
    for (const e of P.log.failed) {
      ctx.F.add({
        sev: 'blocker',
        key: `request-failed:${e.url.replace(/\?.*$/, '')}`,
        cat: 'errors',
        title: `Request failed: ${e.error} ${e.url}`,
        where: `${vp.name}/${lang}`,
        detail: e,
      });
    }
    for (const wmsg of new Set(P.log.warnings)) {
      ctx.F.add({
        sev: 'minor',
        key: `console-warning:${wmsg.slice(0, 80)}`,
        cat: 'errors',
        title: `Console warning: ${wmsg.slice(0, 160)}`,
        where: `${vp.name}/${lang}`,
        detail: wmsg,
      });
    }
    await P.close().catch(() => {});
  }
}
