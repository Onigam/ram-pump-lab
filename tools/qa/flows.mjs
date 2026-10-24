// Phase "flows": scripted interaction robustness. Each flow opens its own page, drives the real UI, and checks that nothing
// throws, that the shell stays consistent (stateProbe invariants) and that the 3D keeps answering afterwards.
import fs from 'node:fs';
import path from 'node:path';
import { MODES, WORLDS, openLab, rng, settle, sleep, ui, waitFrames } from './drive.mjs';
import { floatingProbe, layoutProbe, stateProbe, subjectProbe, visibleTexts } from './measure.mjs';
import { analyzeLayout, analyzeSubject } from './rules.mjs';
import { loadContent, stepEdges } from './matrix.mjs';

const DESKTOP = { w: 1280, h: 800, mobile: false, phone: false, name: '1280x800' };
const PHONE = { w: 390, h: 844, mobile: true, phone: true, name: '390x844' };

/** Small recorder: a flow = a name, the checks it made, and how long it took. */
function recorder(ctx, name, where) {
  const rec = { name, where, checks: [], notes: {}, t0: Date.now(), failed: 0 };
  rec.shots = 0;
  rec.check = async (cond, key, title, detail, sev = 'major', source = 'lab') => {
    rec.checks.push({ ok: !!cond, key, title });
    if (!cond) {
      rec.failed++;
      let img;
      if (rec.page && rec.shots < 30) {
        rec.shots++;
        img = await shot(
          ctx,
          rec.page,
          `${name.replace(/[^a-z0-9]+/gi, '-').slice(0, 30)}-${key.replace(/[^a-z0-9]+/gi, '-').slice(0, 50)}`,
        );
      }
      ctx.F.add({ sev, key: `flow:${key}`, cat: 'interaction', title, where, detail, source, shot: img });
    }
    return !!cond;
  };
  rec.note = (k, v) => (rec.notes[k] = v);
  rec.done = () => {
    rec.ms = Date.now() - rec.t0;
    ctx.report.flows.push({
      name,
      where,
      ms: rec.ms,
      failed: rec.failed,
      checks: rec.checks.length,
      notes: rec.notes,
      failures: rec.checks.filter((c) => !c.ok).map((c) => c.title),
    });
  };
  return rec;
}

/** Page errors raised since `mark` are blockers of the flow that was running. */
function errorsSince(ctx, P, mark, where) {
  const fresh = P.log.errors.slice(mark);
  for (const e of fresh) {
    ctx.F.add({
      sev: 'blocker',
      key: `error:${e.kind}:${e.text.slice(0, 80)}`,
      cat: 'errors',
      title: `${e.kind}: ${e.text.slice(0, 160)}`,
      where,
      detail: e,
    });
  }
  return fresh.length;
}

/** A screenshot of a state that a flow found wrong (kept in shots/flows). */
async function shot(ctx, page, name) {
  if (ctx.args.shots === 'none') return undefined;
  const rel = `flows/${name}.jpg`;
  fs.mkdirSync(path.join(ctx.shotDir, 'flows'), { recursive: true });
  await page.screenshot({ path: path.join(ctx.shotDir, rel), type: 'jpeg', quality: 80 }).catch(() => {});
  return rel;
}

async function frames(page) {
  return page.evaluate(() => window.__lab.stage.renderer.info.render.frame);
}

/** 3D still answers: frames advance, dragging moves the camera. Looks at the 3D view in Explore, sheet closed on a phone. */
async function responds(page, rec, label) {
  await ui.mode(page, 'explore');
  await ui.sheet(page, false);
  await ui.set(page, { panelOpen: true });
  await sleep(800);
  await settle(page);
  const f0 = await frames(page);
  await sleep(1500);
  const f1 = await frames(page);
  await rec.check(f1 > f0, 'render-loop-alive', `The render loop stopped (${label})`, { f0, f1 }, 'blocker');
  const before = await page.evaluate(() => window.__lab.stage.camera.position.toArray());
  // a point where the canvas itself is what the pointer hits (not a label, the toolbar or the sheet)
  const at = await page.evaluate(() => {
    const c = window.__lab.stage.renderer.domElement;
    const r = c.getBoundingClientRect();
    for (const fy of [0.25, 0.35, 0.45, 0.2, 0.55]) {
      for (const fx of [0.5, 0.3, 0.7, 0.2]) {
        const x = r.left + r.width * fx;
        const y = r.top + r.height * fy;
        if (document.elementFromPoint(x, y) === c) return { x, y };
      }
    }
    return null;
  });
  if (!at) {
    await rec.check(false, 'canvas-reachable', `No point of the 3D view can be dragged (${label})`, {});
    return;
  }
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.mouse.move(at.x + 80, at.y + 30, { steps: 5 });
  await page.mouse.up();
  await waitFrames(page, 4);
  const after = await page.evaluate(() => window.__lab.stage.camera.position.toArray());
  const moved = before.some((v, i) => Math.abs(v - after[i]) > 1e-4);
  await rec.check(moved, 'orbit-responds', `Dragging the 3D view does not move the camera (${label})`, {
    before,
    after,
  });
}

// ---------------------------------------------------------------------------------------------- random switching

async function flowRandom(ctx, vp) {
  const where = `flows/random/${vp.name}`;
  const rec = recorder(ctx, `random world/mode switching x50 (${vp.name})`, where);
  const P = await openLab(ctx.browser, {
    url: ctx.args.url,
    w: vp.w,
    h: vp.h,
    mobile: vp.mobile,
    lang: 'fr',
    bootMs: ctx.args.bootMs,
  });
  const { page } = P;
  rec.page = page;
  const mark = P.log.errors.length;
  try {
    await page.evaluate(() => window.__lab.engine.set({ running: true, timeScale: 60 }));
    const rand = rng(ctx.args.seed);
    const pick = (a) => a[Math.floor(rand() * a.length)];
    const log = [];
    const N = ctx.args.quick ? 25 : 50;
    for (let i = 0; i < N; i++) {
      const r = rand();
      let act;
      if (r < 0.25) act = ['world', pick(WORLDS)];
      else if (r < 0.5) act = ['mode', pick(MODES)];
      else if (r < 0.58) act = ['lang', rand() < 0.5 ? 'fr' : 'en'];
      else if (r < 0.68) act = ['panel', ''];
      else if (r < 0.8) act = ['hotspot', ''];
      else if (r < 0.9) act = ['tool', Math.floor(rand() * 8)];
      else if (r < 0.95) act = ['tick', Math.floor(rand() * 20)];
      else act = ['canvas', ''];
      log.push(act.join(':'));
      if (act[0] === 'world') await ui.world(page, act[1]);
      else if (act[0] === 'mode') await ui.mode(page, act[1]);
      else if (act[0] === 'lang') await ui.lang(page, act[1]);
      else if (act[0] === 'panel')
        await page.evaluate(
          (phone) => document.querySelector(phone ? '.panel__grip' : '.panel-toggle')?.click(),
          vp.phone,
        );
      else if (act[0] === 'hotspot') {
        await page.evaluate(() => {
          const hs = [...document.querySelectorAll('.hotspot')].filter((e) => getComputedStyle(e).display !== 'none');
          hs[Math.floor(Math.random() * hs.length)]?.click();
        });
      } else if (act[0] === 'tool') await ui.click(page, '.toolbar button', act[1]);
      else if (act[0] === 'tick') await ui.click(page, '.timeline .tick', act[1]);
      else {
        const b = await page.evaluate(() => {
          const r = window.__lab.stage.renderer.domElement.getBoundingClientRect();
          return { x: r.left, y: r.top, w: r.width, h: r.height };
        });
        await page.mouse.click(b.x + b.w * (0.2 + 0.6 * rand()), b.y + b.h * (0.2 + 0.4 * rand()));
      }
      await sleep(120 + Math.floor(rand() * 200));
      await waitFrames(page, 2);
      if (i % 5 === 4) {
        const st = await page.evaluate(stateProbe);
        for (const msg of st.invariants)
          await rec.check(
            false,
            `invariant:${msg.replace(/"[^"]*"/g, '"…"')}`,
            `Shell inconsistent after random switching: ${msg}`,
            { after: log.slice(-6) },
            'major',
            'kit',
          );
      }
    }
    rec.note('actions', log.join(' '));
    await settle(page);
    const st = await page.evaluate(stateProbe);
    await rec.check(
      st.invariants.length === 0,
      'random-final-invariants',
      'Shell inconsistent at the end of the random run',
      st.invariants,
    );
    const L = await page.evaluate(layoutProbe, { phone: vp.phone });
    analyzeLayout(ctx.F, { at: `${where}/final`, phone: vp.phone, world: st.ui.scene }, L);
    await responds(page, rec, 'after random switching');
    await rec.check(
      errorsSince(ctx, P, mark, where) === 0,
      'random-no-errors',
      'Errors during random switching',
      P.log.errors.slice(mark),
      'blocker',
    );
  } finally {
    rec.done();
    await P.close().catch(() => {});
  }
}

// ---------------------------------------------------------------------------------------------- side panel

async function flowPanel(ctx, vp) {
  const where = `flows/panel/${vp.name}`;
  const rec = recorder(ctx, `side panel / bottom sheet (${vp.name})`, where);
  const P = await openLab(ctx.browser, {
    url: ctx.args.url,
    w: vp.w,
    h: vp.h,
    mobile: vp.mobile,
    lang: 'fr',
    bootMs: ctx.args.bootMs,
  });
  const { page } = P;
  rec.page = page;
  const mark = P.log.errors.length;
  try {
    await page.evaluate(() => window.__lab.engine.set({ running: false }));
    await ui.world(page, 'ram');
    await settle(page);
    const info = () =>
      page.evaluate(() => {
        const v = document.getElementById('viewport').getBoundingClientRect();
        const c = window.__lab.stage.renderer.domElement;
        const p = document.querySelector('.panel').getBoundingClientRect();
        const tb = document.querySelector('.toolbar').getBoundingClientRect();
        const cs = getComputedStyle(document.getElementById('viewport'));
        return {
          view: { w: Math.round(v.width), h: Math.round(v.height) },
          canvas: { w: c.clientWidth, h: c.clientHeight, bufW: c.width },
          aspect: window.__lab.stage.camera.aspect,
          panelW: Math.round(p.width),
          panelDisplay: getComputedStyle(document.querySelector('.panel')).display,
          toolbar: { l: Math.round(tb.left), r: Math.round(tb.right), t: Math.round(tb.top), b: Math.round(tb.bottom) },
          viewVisibility: cs.visibility,
          classes: document.body.className,
          panelVar: document.documentElement.style.getPropertyValue('--panel-w'),
        };
      });
    if (!vp.phone) {
      const a = await info();
      await page.evaluate(() => document.querySelector('.panel-toggle').click());
      await settle(page, { min: 700 });
      const b = await info();
      await rec.check(
        b.view.w > a.view.w + 200,
        'panel-closes',
        'Hiding the side panel does not give the width to the 3D view',
        { a, b },
      );
      await rec.check(
        Math.abs(b.aspect - b.canvas.w / b.canvas.h) < 0.02,
        'panel-closed-aspect',
        'Camera aspect differs from the canvas after hiding the panel',
        { aspect: b.aspect, canvas: b.canvas },
      );
      await rec.check(
        b.toolbar.l >= 0 && b.toolbar.r <= vp.w,
        'panel-closed-toolbar',
        'Toolbar leaves the screen with the panel hidden',
        b.toolbar,
      );
      const S = await page.evaluate(subjectProbe, { phone: false });
      await rec.check(
        !S.union || S.outsideCanvasPct < 12,
        'panel-closed-subject',
        'Subject cropped after hiding the panel (the view is re-framed with a delay)',
        { outsideCanvasPct: S.outsideCanvasPct },
        'minor',
        'kit',
      );
      await page.evaluate(() => document.querySelector('.panel-toggle').click());
      await settle(page, { min: 700 });
      const c = await info();
      await rec.check(
        Math.abs(c.view.w - a.view.w) <= 2,
        'panel-reopens',
        'The 3D view does not return to its width after reopening the panel',
        { a, c },
      );
      // reading mode: the panel takes the whole width and the 3D view is hidden
      await page.evaluate(() => document.querySelector('.panel__wide').click());
      await sleep(400);
      const d = await info();
      await rec.check(
        d.viewVisibility === 'hidden' && d.panelW > vp.w - 120,
        'panel-wide',
        'Reading mode: the panel does not take the whole width',
        d,
        'major',
        'kit',
      );
      const ws = await page.evaluate(stateProbe);
      await rec.check(
        ws.invariants.length === 0,
        'panel-wide-state',
        'Shell inconsistent in reading mode',
        ws.invariants,
      );
      // a mode change while reading: the panel must stay usable, and leaving the mode must be possible
      await ui.mode(page, 'sim');
      await sleep(300);
      const Lw = await page.evaluate(layoutProbe, { phone: false });
      analyzeLayout(ctx.F, { at: `${where}/reading-sim`, phone: false, world: 'ram' }, Lw);
      await page.evaluate(() => document.querySelector('.panel__wide').click());
      await settle(page, { min: 600 });
      // drag the left edge of the panel: width follows, the view keeps at least 320 px, a double click resets
      const edge = await page.evaluate(() => {
        const r = document.querySelector('.panel__edge').getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + 40 };
      });
      await page.mouse.move(edge.x, edge.y);
      await page.mouse.down();
      await page.mouse.move(edge.x - 160, edge.y, { steps: 6 });
      await page.mouse.up();
      await sleep(300);
      const e1 = await info();
      await rec.check(
        e1.panelW > a.panelW + 100,
        'panel-resize',
        'Dragging the panel edge does not widen it',
        { before: a.panelW, after: e1.panelW },
        'major',
        'kit',
      );
      const edge2 = await page.evaluate(() => {
        const r = document.querySelector('.panel__edge').getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + 40 };
      });
      await page.mouse.move(edge2.x, edge2.y);
      await page.mouse.down();
      await page.mouse.move(100, edge2.y, { steps: 8 });
      await page.mouse.up();
      await sleep(300);
      const e2 = await info();
      await rec.check(
        e2.view.w >= 300,
        'panel-resize-clamp',
        'The 3D view gets narrower than 320 px when the panel is dragged wide',
        e2.view,
        'major',
        'kit',
      );
      const L2 = await page.evaluate(layoutProbe, { phone: false });
      analyzeLayout(ctx.F, { at: `${where}/panel-dragged-wide`, phone: false, world: 'ram' }, L2);
      await page.evaluate(() =>
        document.querySelector('.panel__edge').dispatchEvent(new MouseEvent('dblclick', { bubbles: true })),
      );
      await sleep(300);
      const e3 = await info();
      await rec.check(
        Math.abs(e3.panelW - a.panelW) <= 2,
        'panel-resize-reset',
        'Double click on the panel edge does not reset its width',
        { a: a.panelW, e3: e3.panelW },
        'minor',
        'kit',
      );
    } else {
      const a = await info();
      const top = () => page.evaluate(() => document.querySelector('.panel').getBoundingClientRect().top);
      // the slide is a CSS transition that a busy main thread starts late: wait for the end position
      const reachSheet = async (open) => {
        await ui.sheet(page, open);
        const t0 = Date.now();
        await page
          .waitForFunction(
            (want) => {
              const t = document.querySelector('.panel').getBoundingClientRect().top;
              return want ? t < window.innerHeight * 0.6 : t > window.innerHeight * 0.8;
            },
            { timeout: 15000 },
            open,
          )
          .catch(() => {});
        await sleep(400);
        return { top: await top(), ms: Date.now() - t0 };
      };
      const c1 = await reachSheet(false);
      const o1 = await reachSheet(true);
      const closed = c1.top;
      const open = o1.top;
      rec.note('sheetSlideMs', { open: o1.ms, close: c1.ms });
      await rec.check(closed > open + 150, 'sheet-toggles', 'The grip does not open and close the bottom sheet', {
        closed,
        open,
      });
      rec.note('sheetTop', { closed, open, viewportH: vp.h });
      // the toolbar while the sheet is open: is any tool reachable?
      const reach = await page.evaluate(() => {
        const tools = [...document.querySelectorAll('.toolbar .tool, .toolbar button')];
        let free = 0;
        for (const t of tools) {
          const r = t.getBoundingClientRect();
          const el = document.elementFromPoint(
            Math.min(window.innerWidth - 2, Math.max(2, r.left + r.width / 2)),
            r.top + r.height / 2,
          );
          if (el && (el === t || t.contains(el))) free++;
        }
        return { tools: tools.length, reachable: free };
      });
      await rec.check(
        reach.reachable > 0,
        'toolbar-behind-sheet',
        '3D tools (explode, X-ray, section, flows) are all behind the open bottom sheet on a phone',
        reach,
        'major',
        'kit',
      );
      rec.note('toolbarWithSheetOpen', reach);
      // swipe up on the grip: a sheet usually follows a drag
      const grip = await page.evaluate(() => {
        const r = document.querySelector('.panel__grip').getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      await reachSheet(false);
      await page.touchscreen.touchStart(grip.x, grip.y + 300);
      await page.touchscreen.touchMove(grip.x, grip.y + 100);
      await page.touchscreen.touchEnd();
      await sleep(500);
      const afterSwipe = await page.evaluate(() => document.body.classList.contains('sheet-open'));
      await rec.check(
        afterSwipe,
        'sheet-swipe',
        'Swiping the bottom sheet up does not open it (only a tap on the grip does)',
        { afterSwipe },
        'minor',
        'kit',
      );
      void a;
    }
    await rec.check(
      errorsSince(ctx, P, mark, where) === 0,
      'panel-no-errors',
      'Errors while opening and closing the panel',
      P.log.errors.slice(mark),
      'blocker',
    );
  } finally {
    rec.done();
    await P.close().catch(() => {});
  }
}

// ---------------------------------------------------------------------------------------------- language

const FR_WORDS = /\b(le|la|les|des|du|une|et|pour|avec|dans|sur|est|sont|vous|votre|aux|par|que|qui|pas|plus)\b/i;
const EN_WORDS = /\b(the|and|with|for|of|is|are|your|you|this|that|from|into|not|then|when)\b/i;
const NAMES =
  /NC State|Practical Action|NITK|Oxfam|Three\.js|Wikipedia|YouTube|Média24|Bernard Le Poder|L’énergie partout|Création clapet|Didier Nebreda|SSWM|DDT|OFB|RP-D\d\d/i;

async function flowLanguage(ctx, vp) {
  const where = `flows/language/${vp.name}`;
  const rec = recorder(ctx, `language switch in every mode (${vp.name})`, where);
  const P = await openLab(ctx.browser, {
    url: ctx.args.url,
    w: vp.w,
    h: vp.h,
    mobile: vp.mobile,
    lang: 'fr',
    bootMs: ctx.args.bootMs,
  });
  const { page } = P;
  rec.page = page;
  const mark = P.log.errors.length;
  const leaks = { fr: [], en: [] };
  try {
    await page.evaluate(() => window.__lab.engine.set({ running: false }));
    const content = await loadContent(page);
    const scan = async (lang, tag) => {
      const texts = await page.evaluate(visibleTexts);
      for (const t of texts) {
        if (NAMES.test(t)) continue;
        if (lang === 'fr' && EN_WORDS.test(t) && !FR_WORDS.test(t)) leaks.fr.push(`${tag}: ${t.slice(0, 90)}`);
        if (lang === 'en' && (FR_WORDS.test(t) || /[àâçéèêëîïôùûü]/i.test(t)) && !EN_WORDS.test(t))
          leaks.en.push(`${tag}: ${t.slice(0, 90)}`);
      }
    };
    const states = [
      [
        'explore-site',
        async () => {
          await ui.mode(page, 'explore');
          await ui.world(page, 'site');
        },
      ],
      [
        'explore-ram-part',
        async () => {
          await ui.mode(page, 'parts');
          await ui.click(
            page,
            '.cat-row',
            content.parts.findIndex((p) => p.id === 'air-chamber'),
          );
        },
      ],
      [
        'assembly-ram-step',
        async () => {
          await ui.mode(page, 'assembly');
          await ui.click(page, '.timeline .tick', 15);
        },
      ],
      [
        'install-catchment-step',
        async () => {
          await ui.mode(page, 'install');
          await ui.click(page, '.timeline .tick', 2);
        },
      ],
      [
        'sim',
        async () => {
          await ui.mode(page, 'sim');
        },
      ],
      [
        'plans-open-sheet',
        async () => {
          await ui.mode(page, 'plans');
          await ui.click(page, '.sheet-row', 7);
        },
      ],
      [
        'lessons-list',
        async () => {
          await ui.mode(page, 'lessons');
        },
      ],
      [
        'lesson-open',
        async () => {
          await ui.mode(page, 'lessons');
          await ui.click(page, '.lesson-card', 1);
          await ui.click(page, '.quiz__choice', 0);
        },
      ],
      [
        'parts',
        async () => {
          await ui.mode(page, 'parts');
        },
      ],
      [
        'about',
        async () => {
          await ui.mode(page, 'about');
        },
      ],
    ];
    for (const [name, setup] of states) {
      await ui.lang(page, 'fr');
      await setup();
      await settle(page, { min: 500 });
      const before = await page.evaluate(stateProbe);
      await scan('fr', name);
      const frText = await page.evaluate(() => document.querySelector('.panel__body')?.innerText.slice(0, 400) ?? '');
      const frSvg = await page.evaluate(() => document.querySelector('.dv svg')?.textContent.slice(0, 300) ?? '');
      await ui.lang(page, 'en');
      // the strip is redrawn on a later frame than the panel: give the slow software renderer time before reading
      await settle(page, { min: 1500 });
      const after = await page.evaluate(stateProbe);
      const enText = await page.evaluate(() => document.querySelector('.panel__body')?.innerText.slice(0, 400) ?? '');
      const enSvg = await page.evaluate(() => document.querySelector('.dv svg')?.textContent.slice(0, 300) ?? '');
      await scan('en', name);
      await rec.check(
        after.lang === 'en' && before.lang === 'fr',
        `lang-attr:${name}`,
        `<html lang> does not follow the language (${name})`,
        { before: before.lang, after: after.lang },
        'minor',
      );
      await rec.check(
        before.title !== after.title,
        `lang-title:${name}`,
        `The document title does not change with the language (${name})`,
        { before: before.title, after: after.title },
        'minor',
        'kit',
      );
      for (const key of ['mode', 'scene', 'selected', 'step', 'lesson', 'drawing']) {
        await rec.check(
          before.ui[key] === after.ui[key],
          `lang-keeps-${key}:${name}`,
          `Switching language changes the ${key} (${name})`,
          { before: before.ui[key], after: after.ui[key] },
        );
      }
      await rec.check(
        after.invariants.length === 0,
        `lang-invariants:${name}`,
        `Shell inconsistent after a language switch (${name})`,
        after.invariants,
      );
      if (name !== 'plans-open-sheet')
        await rec.check(
          frText !== enText || !frText,
          `lang-panel:${name}`,
          `The side panel text does not change with the language (${name})`,
          { frText: frText.slice(0, 80) },
        );
      else
        await rec.check(frSvg !== enSvg, 'lang-drawing', 'The open drawing does not change with the language', {
          fr: frSvg.slice(0, 80),
          en: enSvg.slice(0, 80),
        });
      const L = await page.evaluate(layoutProbe, { phone: vp.phone });
      analyzeLayout(ctx.F, { at: `${where}/${name}/en`, phone: vp.phone, world: after.ui.scene }, L);
      await ui.lang(page, 'fr');
      await sleep(300);
    }
    rec.note('untranslatedInFrench', leaks.fr.slice(0, 20));
    rec.note('untranslatedInEnglish', leaks.en.slice(0, 20));
    if (leaks.fr.length)
      ctx.F.add({
        sev: 'minor',
        key: 'lang-english-in-french',
        cat: 'i18n',
        title: `English text in the French interface (${leaks.fr.length})`,
        where,
        detail: leaks.fr.slice(0, 8),
      });
    if (leaks.en.length)
      ctx.F.add({
        sev: 'minor',
        key: 'lang-french-in-english',
        cat: 'i18n',
        title: `French text in the English interface (${leaks.en.length})`,
        where,
        detail: leaks.en.slice(0, 8),
      });
    await rec.check(
      errorsSince(ctx, P, mark, where) === 0,
      'lang-no-errors',
      'Errors while switching language',
      P.log.errors.slice(mark),
      'blocker',
    );
  } finally {
    rec.done();
    await P.close().catch(() => {});
  }
}

// ---------------------------------------------------------------------------------------------- guides

/** The display each part of the active world should have at step `i` of a guide (see the kit's DisplayController). */
function expectedDisplays(steps, i, ghost) {
  const all = new Set(steps.flatMap((s) => s.parts));
  const before = new Set(steps.slice(0, i).flatMap((s) => s.parts));
  const current = new Set(steps[i].parts);
  return (id) => (current.has(id) || before.has(id) || !all.has(id) ? 'solid' : ghost ? 'wire' : 'hidden');
}

async function flowGuides(ctx, vp) {
  const where = `flows/guides/${vp.name}`;
  const rec = recorder(ctx, `assembly and installation guides (${vp.name})`, where);
  const P = await openLab(ctx.browser, {
    url: ctx.args.url,
    w: vp.w,
    h: vp.h,
    mobile: vp.mobile,
    lang: 'fr',
    bootMs: ctx.args.bootMs,
  });
  const { page } = P;
  rec.page = page;
  const mark = P.log.errors.length;
  try {
    await page.evaluate(() => window.__lab.engine.set({ running: false }));
    const content = await loadContent(page);
    const guides = [
      { mode: 'assembly', steps: content.assembly, def: 'valve' },
      { mode: 'install', steps: content.install, def: 'site' },
    ];
    const sceneOf = (g, i) => g.steps[i].scene ?? g.def;
    const registryOf = () =>
      page.evaluate(() => {
        const reg = window.__lab.stage.active.registry;
        const out = {};
        for (const p of reg.parts.values()) out[p.id] = p.display;
        return {
          world: window.__lab.stage.active.id,
          display: out,
          outline: window.__lab.stage.outline.selectedObjects.length,
        };
      });

    for (const g of guides) {
      const n = g.steps.length;
      await ui.mode(page, 'explore');
      await ui.mode(page, g.mode);
      await settle(page);
      let st = await ui.store(page);
      await rec.check(
        st.mode === g.mode && st.step === 0 && st.scene === sceneOf(g, 0),
        `${g.mode}-enter`,
        `Entering ${g.mode} does not start at step 1 in ${sceneOf(g, 0)}`,
        st,
      );
      const framing = [];
      // ---- forward with the Next button, every step
      for (let i = 1; i <= n; i++) {
        const cur = i - 1;
        // what the step shows: displays of the parts, the highlight, the camera
        const wantScene = sceneOf(g, cur);
        await settle(page, { min: 400 });
        await sleep(1700);
        const reg = await registryOf();
        const stt = await ui.store(page);
        await rec.check(
          reg.world === wantScene,
          `${g.mode}-world:${cur}`,
          `${g.mode} step ${cur + 1} plays in "${reg.world}" instead of "${wantScene}"`,
          { reg: reg.world, wantScene },
        );
        const exp = expectedDisplays(g.steps, cur, stt.ghost);
        const bad = Object.entries(reg.display).filter(([id, d]) => d !== exp(id));
        await rec.check(
          bad.length === 0,
          `${g.mode}-displays:${cur}`,
          `${g.mode} step ${cur + 1}: parts shown wrongly (ghost/hidden/solid): ${bad
            .slice(0, 4)
            .map(([id, d]) => `${id}=${d}`)
            .join(', ')}`,
          { bad: bad.slice(0, 8) },
        );
        if (g.steps[cur].parts.length) {
          await rec.check(
            reg.outline > 0,
            `${g.mode}-highlight:${cur}`,
            `${g.mode} step ${cur + 1}: nothing is highlighted`,
            { outline: reg.outline },
            'minor',
          );
          const S = await page.evaluate(subjectProbe, { phone: vp.phone, ids: g.steps[cur].parts });
          analyzeSubject(
            ctx.F,
            {
              at: `${where}/${g.mode}-step${cur + 1}`,
              phone: vp.phone,
              world: wantScene,
              exploded: false,
              kind: 'step',
            },
            S,
          );
          framing.push({
            step: cur + 1,
            outsideFreePct: S.outsideFreePct,
            sizePct: S.sizePct,
            underSheetPct: S.underSheetPct,
          });
          if (S.union && S.sizePct < 0.5)
            await rec.check(
              false,
              `${g.mode}-framing-tiny:${cur}`,
              `${g.mode} step ${cur + 1}: the parts are almost invisible (${S.sizePct} % of the free view)`,
              S,
              'minor',
              'kit',
            );
        }
        const sp = await page.evaluate(stateProbe);
        await rec.check(
          sp.invariants.length === 0,
          `${g.mode}-invariants:${cur}`,
          `${g.mode} step ${cur + 1}: shell inconsistent`,
          sp.invariants,
        );
        if (i < n) {
          await page.evaluate((k) => document.querySelectorAll('.transport .icon-btn')[2].click(), cur);
          await waitFrames(page, 2);
          st = await ui.store(page);
          await rec.check(
            st.step === cur + 1,
            `${g.mode}-next:${cur}`,
            `Next does not go from step ${cur + 1} to ${cur + 2}`,
            st,
          );
        }
      }
      rec.note(`${g.mode}Framing`, framing);
      // ---- backwards with Previous
      for (let i = n - 1; i > 0; i--) {
        await page.evaluate(() => document.querySelectorAll('.transport .icon-btn')[0].click());
        await sleep(200);
        st = await ui.store(page);
        await rec.check(
          st.step === i - 1 && st.scene === sceneOf(g, i - 1),
          `${g.mode}-prev:${i}`,
          `Previous from step ${i + 1} ends at step ${st.step + 1} in "${st.scene}" (expected ${i} in "${sceneOf(g, i - 1)}")`,
          st,
        );
      }
      await settle(page);
      // ---- jumps with the timeline
      const rand = rng(ctx.args.seed + 7);
      for (let k = 0; k < 8; k++) {
        const to = Math.floor(rand() * n);
        if (k % 2) await ui.click(page, '.timeline .tick', to);
        else {
          await page.evaluate((v) => {
            const input = document.querySelector('.timeline input[type=range]');
            input.value = String(v);
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }, to);
        }
        await sleep(250);
        st = await ui.store(page);
        await rec.check(
          st.step === to && st.scene === sceneOf(g, to),
          `${g.mode}-jump:${k}`,
          `Jump to step ${to + 1}: store at step ${st.step + 1} in "${st.scene}" (expected "${sceneOf(g, to)}")`,
          st,
        );
        const sp = await page.evaluate(stateProbe);
        await rec.check(
          sp.invariants.length === 0,
          `${g.mode}-jump-invariants:${k}`,
          `${g.mode} jump: shell inconsistent`,
          sp.invariants,
        );
      }
      // ---- change world by hand in the middle of the guide
      for (const manual of WORLDS) {
        await ui.mode(page, 'explore');
        await ui.mode(page, g.mode);
        const mid = Math.min(4, n - 1);
        await ui.click(page, '.timeline .tick', mid);
        await sleep(300);
        const was = await ui.store(page);
        await ui.world(page, manual);
        await settle(page, { min: 500 });
        const now = await ui.store(page);
        const sp = await page.evaluate(stateProbe);
        const inGuide = new Set(g.steps.map((_, i) => sceneOf(g, i))).has(manual);
        if (manual === was.scene) continue;
        if (!inGuide) {
          await rec.check(
            now.mode === 'explore',
            `${g.mode}-manual-${manual}-leaves`,
            `Switching to "${manual}" during ${g.mode} (a world outside the guide) keeps the guide`,
            { was, now },
          );
        } else {
          // a world of the guide: the guide stays, but the step is about another world
          const stepWorld = sceneOf(g, now.step);
          await rec.check(
            now.mode !== g.mode || stepWorld === now.scene,
            `${g.mode}-manual-mismatch:${manual}`,
            `Switching to "${manual}" by hand during ${g.mode} step ${now.step + 1} (a "${stepWorld}" step): the step text and the highlighted parts belong to another world than the one shown`,
            { was, now, stepWorld },
            'major',
            'kit',
          );
        }
        await rec.check(
          sp.invariants.length === 0,
          `${g.mode}-manual-invariants:${manual}`,
          `${g.mode}: shell inconsistent after switching to ${manual}`,
          sp.invariants,
        );
      }
      // ---- leave and come back: everything solid again, no highlight, the guide restarts at step 1
      await ui.mode(page, 'explore');
      await ui.mode(page, g.mode);
      await ui.click(page, '.timeline .tick', Math.min(6, n - 1));
      await sleep(300);
      await ui.mode(page, 'explore');
      await settle(page, { min: 600 });
      await sleep(800);
      const out = await registryOf();
      const notSolid = Object.entries(out.display).filter(([, d]) => d !== 'solid');
      await rec.check(
        notSolid.length === 0,
        `${g.mode}-leave-restores`,
        `After leaving ${g.mode} the world still shows ghosted or hidden parts (${notSolid
          .map(([id, d]) => `${id}=${d}`)
          .slice(0, 4)
          .join(', ')})`,
        { notSolid, world: out.world },
      );
      await rec.check(
        out.outline === 0,
        `${g.mode}-leave-highlight`,
        `After leaving ${g.mode} the step highlight stays on`,
        { outline: out.outline },
        'minor',
        'kit',
      );
      await ui.mode(page, g.mode);
      st = await ui.store(page);
      await rec.check(
        st.step === 0 && st.scene === sceneOf(g, 0),
        `${g.mode}-reenter`,
        `Re-entering ${g.mode} does not restart at step 1`,
        st,
      );
      // ---- autoplay across the first world boundary
      const edges = stepEdges(g.steps, g.def).filter((e) => e.kind === 'last');
      if (edges.length > 1 && !ctx.args.quick) {
        const from = edges[0].i;
        await ui.click(page, '.timeline .tick', from);
        await sleep(300);
        await page.evaluate(() => document.querySelectorAll('.transport .icon-btn')[1].click());
        const t0 = Date.now();
        let crossed = false;
        while (Date.now() - t0 < 60000) {
          await sleep(1000);
          st = await ui.store(page);
          if (st.step > from) {
            crossed = true;
            break;
          }
        }
        await rec.check(
          crossed && st.scene === sceneOf(g, from + 1),
          `${g.mode}-autoplay-cross`,
          `Autoplay does not move on from step ${from + 1} to the next world`,
          { st, waitedMs: Date.now() - t0 },
        );
        await ui.set(page, { playing: false });
      }
      await ui.mode(page, 'explore');
    }
    await responds(page, rec, 'after the guides');
    await rec.check(
      errorsSince(ctx, P, mark, where) === 0,
      'guides-no-errors',
      'Errors while driving the guides',
      P.log.errors.slice(mark),
      'blocker',
    );
  } finally {
    rec.done();
    await P.close().catch(() => {});
  }
}

// ---------------------------------------------------------------------------------------------- simulation

const nanScan = () => {
  const lab = window.__lab;
  const bad = [];
  for (const [k, v] of Object.entries(lab.engine.state)) if (typeof v === 'number' && Number.isNaN(v)) bad.push(k);
  const text = [...document.querySelectorAll('.sim, .strip, .panel__body')].map((e) => e.innerText).join(' ');
  const shown = (text.match(/NaN|undefined|\[object|Infinity/g) || []).length;
  return {
    bad,
    shown,
    text: shown ? (text.match(/.{0,30}(NaN|undefined|\[object|Infinity).{0,30}/g) || []).slice(0, 3) : [],
  };
};

async function flowSim(ctx, vp) {
  const where = `flows/sim/${vp.name}`;
  const rec = recorder(ctx, `simulation controls (${vp.name})`, where);
  const P = await openLab(ctx.browser, {
    url: ctx.args.url,
    w: vp.w,
    h: vp.h,
    mobile: vp.mobile,
    lang: 'fr',
    bootMs: ctx.args.bootMs,
  });
  const { page } = P;
  rec.page = page;
  const mark = P.log.errors.length;
  const run = async (ms, scale = 600) => {
    await page.evaluate((s) => window.__lab.engine.set({ running: true, timeScale: s }), scale);
    await sleep(ms);
  };
  try {
    await ui.world(page, 'ram');
    await ui.mode(page, 'sim');
    await settle(page);
    // ---- presets
    const presets = await page.evaluate(() =>
      [...document.querySelector('.sim select').options].map((o) => o.value).filter((v) => v !== 'custom'),
    );
    rec.note('presets', presets);
    for (const p of presets) {
      await page.evaluate((id) => {
        const sel = document.querySelector('.sim select');
        sel.value = id;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }, p);
      await run(1500);
      const s = await page.evaluate(nanScan);
      await rec.check(
        !s.bad.length && !s.shown,
        `preset-nan:${p}`,
        `Preset ${p}: NaN or undefined in the state or in the readouts`,
        s,
      );
    }
    // ---- scenarios (the chips under "Scénarios")
    const scen = await page.evaluate(() =>
      [...document.querySelectorAll('.sim > .part-chips .part-chip')].map((b) => b.textContent.trim()),
    );
    rec.note('scenarios', scen);
    const alarmsSeen = {};
    for (let i = 0; i < scen.length; i++) {
      await ui.click(page, '.sim > .part-chips .part-chip', i);
      await run(2500, 3600);
      const s = await page.evaluate(nanScan);
      const alarms = await page.evaluate(() =>
        [...document.querySelectorAll('.strip__alarms .alarm')].map((a) => a.textContent.trim()),
      );
      alarmsSeen[scen[i]] = alarms;
      await rec.check(
        !s.bad.length && !s.shown,
        `scenario-nan:${i}`,
        `Scenario "${scen[i]}": NaN or undefined in the state or in the readouts`,
        s,
      );
      const L = await page.evaluate(layoutProbe, { phone: vp.phone });
      analyzeLayout(ctx.F, { at: `${where}/scenario-${i + 1}`, phone: vp.phone, world: 'ram' }, L);
    }
    rec.note('alarmsByScenario', alarmsSeen);
    // ---- the cycle step by step: freeze each phase, step through four phases and the release; from the site too
    await ui.world(page, 'site');
    await page.evaluate(() => window.__lab.engine.applyPreset('valve-1'));
    await run(1500, 60);
    await page.evaluate(() => {
      const d = [...document.querySelectorAll('.sim details')][0];
      d.open = true;
    });
    const chips = await ui.count(page, '.sim details .part-chip');
    await rec.check(chips === 4, 'cycle-chips', 'The cycle section does not offer four phase chips', { chips });
    await ui.click(page, '.sim details .part-chip', 1);
    await sleep(700);
    let st = await page.evaluate(() => ({
      held: window.__lab.engine.state.phaseHeld,
      scene: window.__lab.store.state.scene,
    }));
    await rec.check(
      st.held === 'close' && st.scene === 'ram',
      'cycle-freeze',
      'Freezing a phase from the site does not freeze it and move to the ram world',
      st,
    );
    const order = [];
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => document.querySelectorAll('.sim details .sim-top button')[0].click());
      await sleep(400);
      order.push(await page.evaluate(() => window.__lab.engine.state.phaseHeld));
    }
    rec.note('phasesOnStep', order);
    await rec.check(
      new Set(order).size >= 3 && order.every(Boolean),
      'cycle-step',
      'The step button does not walk through the phases',
      { order },
    );
    await page.evaluate(() => document.querySelectorAll('.sim details .sim-top button')[1].click());
    await sleep(500);
    st = await page.evaluate(() => ({ held: window.__lab.engine.state.phaseHeld }));
    await rec.check(st.held === null, 'cycle-release', 'The release button does not unfreeze the cycle', st);
    const s2 = await page.evaluate(nanScan);
    await rec.check(!s2.bad.length && !s2.shown, 'cycle-nan', 'NaN or undefined while stepping through the cycle', s2);
    // ---- the sliders and selects of the panel at their extremes
    await ui.mode(page, 'sim');
    await page.evaluate(() => document.querySelectorAll('.sim details').forEach((d) => (d.open = true)));
    const nRanges = await ui.count(page, '.sim input[type=range]');
    rec.note('ranges', nRanges);
    for (let i = 0; i < nRanges; i++) {
      for (const which of ['min', 'max']) {
        await page.evaluate(
          (k, w) => {
            const el = document.querySelectorAll('.sim input[type=range]')[k];
            el.value = el[w];
            el.dispatchEvent(new Event('input', { bubbles: true }));
          },
          i,
          which,
        );
        await sleep(60);
      }
      await page.evaluate((k) => {
        const el = document.querySelectorAll('.sim input[type=range]')[k];
        el.value = String((Number(el.min) + Number(el.max)) / 2);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, i);
    }
    await run(1500, 600);
    const s3 = await page.evaluate(nanScan);
    await rec.check(
      !s3.bad.length && !s3.shown,
      'sliders-nan',
      'NaN or undefined after moving every slider to its extremes',
      s3,
    );
    const nSel = await ui.count(page, '.sim select');
    for (let i = 0; i < nSel; i++) {
      const opts = await page.evaluate(
        (k) => [...document.querySelectorAll('.sim select')[k].options].map((o) => o.value),
        i,
      );
      for (const v of opts) {
        await page.evaluate(
          (k, val) => {
            const sel = document.querySelectorAll('.sim select')[k];
            if (!sel) return;
            sel.value = val;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          },
          i,
          v,
        );
        await sleep(80);
      }
    }
    await page.evaluate(() => document.querySelectorAll('.sim input[type=checkbox]').forEach((c) => c.click()));
    await sleep(300);
    await page.evaluate(() => document.querySelectorAll('.sim input[type=checkbox]').forEach((c) => c.click()));
    await run(1000, 600);
    const s4 = await page.evaluate(nanScan);
    await rec.check(!s4.bad.length && !s4.shown, 'selects-nan', 'NaN or undefined after every select and toggle', s4);
    // ---- the sizing calculator (the last section): extremes and every pipe
    const sizeIdx = await page.evaluate(() => [...document.querySelectorAll('.sim details')].length - 1);
    const sizeSel = `.sim details:nth-of-type(${sizeIdx + 1})`;
    const hasSize = await page.evaluate((s) => !!document.querySelector(s), sizeSel);
    await rec.check(hasSize, 'size-section', 'The sizing calculator section is missing');
    for (const which of ['min', 'max']) {
      await page.evaluate(
        (sel, w) => {
          document.querySelectorAll(`${sel} input[type=range]`).forEach((el) => {
            el.value = el[w];
            el.dispatchEvent(new Event('input', { bubbles: true }));
          });
        },
        sizeSel,
        which,
      );
      const pipes = await page.evaluate(
        (sel) => [...(document.querySelector(`${sel} select`)?.options ?? [])].map((o) => o.value),
        sizeSel,
      );
      for (const v of pipes) {
        await page.evaluate(
          (sel, val) => {
            const el = document.querySelector(`${sel} select`);
            el.value = val;
            el.dispatchEvent(new Event('change', { bubbles: true }));
          },
          sizeSel,
          v,
        );
        await sleep(60);
        const s = await page.evaluate(nanScan);
        await rec.check(
          !s.shown,
          `size-nan:${which}:${v}`,
          `Sizing calculator at ${which} with pipe ${v}: NaN/undefined/Infinity in the result`,
          s,
        );
      }
    }
    // the "load the live site" and "apply to the simulation" buttons
    await page.evaluate(
      (sel) => document.querySelectorAll(`${sel} .sim-top button`).forEach((b) => b.click()),
      sizeSel,
    );
    await sleep(400);
    const s5 = await page.evaluate(nanScan);
    await rec.check(
      !s5.bad.length && !s5.shown,
      'size-apply-nan',
      'NaN or undefined after applying the calculator to the simulation',
      s5,
    );
    // ---- the test buttons of the part sheets
    const content = await loadContent(page);
    const testParts = ['air-chamber', 'snifter', 'waste-valve', 'drive-gate-valve', 'tank-drain', 'stroke-nut'];
    const tests = [];
    for (const id of testParts) {
      const idx = content.parts.findIndex((p) => p.id === id);
      await page.evaluate(() => window.__lab.engine.reset?.());
      await ui.mode(page, 'parts');
      await ui.click(page, '.cat-row', idx);
      await settle(page, { min: 500 });
      const buttons = await page.evaluate(() => {
        const acts = [...document.querySelectorAll('.panel .actions > .btn, .panel .actions > button')];
        return acts.map((b) => ({
          label: b.textContent.trim(),
          title: b.title,
          toggle: b.classList.contains('is-on'),
        }));
      });
      // the first two are "Isoler" and "Focus" of the kit; the test buttons come next
      const extra = buttons.slice(2).filter((b) => b.title);
      for (let k = 0; k < extra.length; k++) {
        const camBefore = await page.evaluate(() => window.__lab.stage.camera.position.toArray());
        const paramsBefore = await page.evaluate(() => JSON.stringify(window.__lab.engine.params));
        const alarmsBefore = await page.evaluate(() => JSON.stringify(window.__lab.engine.state.alarms));
        await page.evaluate((j) => [...document.querySelectorAll('.panel .actions > .btn')][2 + j].click(), k);
        await sleep(1800);
        const camAfter = await page.evaluate(() => window.__lab.stage.camera.position.toArray());
        const paramsAfter = await page.evaluate(() => JSON.stringify(window.__lab.engine.params));
        const alarmsAfter = await page.evaluate(() => JSON.stringify(window.__lab.engine.state.alarms));
        const label2 = await page.evaluate(
          (j) => [...document.querySelectorAll('.panel .actions > .btn')][2 + j]?.textContent.trim(),
          k,
        );
        tests.push({
          part: id,
          button: extra[k].label,
          after: label2,
          camMoved: camBefore.some((v, i) => Math.abs(v - camAfter[i]) > 1e-3),
          paramsChanged: paramsBefore !== paramsAfter,
          alarmsChanged: alarmsBefore !== alarmsAfter,
        });
        await rec.check(
          paramsBefore !== paramsAfter || alarmsBefore !== alarmsAfter,
          `test-effect:${id}:${k}`,
          `The test button "${extra[k].label}" on ${id} changes nothing in the simulation`,
          tests[tests.length - 1],
        );
        if (extra[k].toggle === false && label2 && label2 !== extra[k].label) {
          // toggle back
          await page.evaluate((j) => [...document.querySelectorAll('.panel .actions > .btn')][2 + j].click(), k);
          await sleep(600);
        }
        const s = await page.evaluate(nanScan);
        await rec.check(
          !s.bad.length && !s.shown,
          `test-nan:${id}:${k}`,
          `NaN/undefined after the test button "${extra[k].label}" on ${id}`,
          s,
        );
      }
      await rec.check(extra.length > 0, `test-buttons:${id}`, `The part sheet of ${id} has no test button`, {
        buttons,
      });
    }
    rec.note('partTests', tests);
    await page.evaluate(() => window.__lab.engine.set({ running: true, timeScale: 1 }));
    await responds(page, rec, 'after the simulation controls');
    await rec.check(
      errorsSince(ctx, P, mark, where) === 0,
      'sim-no-errors',
      'Errors while driving the simulation',
      P.log.errors.slice(mark),
      'blocker',
    );
  } finally {
    rec.done();
    await P.close().catch(() => {});
  }
}

// ---------------------------------------------------------------------------------------------- reload, storage, deep links

async function flowReload(ctx) {
  const where = 'flows/reload';
  const rec = recorder(ctx, 'reload with stored state, deep links, blocked storage, no WebGL', where);
  const url = ctx.args.url;
  const mk = async (o) => openLab(ctx.browser, { url, w: 1280, h: 800, bootMs: Math.min(ctx.args.bootMs, 3000), ...o });
  // ---- the browser remembers: language, lesson progress, panel width
  let P = await mk({ lang: 'en' });
  let mark = 0;
  await P.page.evaluate(() => {
    localStorage.setItem(
      'ram-pump-lab:lessons-done',
      JSON.stringify(['principle', 'cycle', 'waste-valve', 'air-chamber', 'sizing', 'siting']),
    );
    localStorage.setItem('ram-pump-lab.panelWidth', '520');
  });
  await P.page.reload({ waitUntil: 'domcontentloaded' });
  await P.page.waitForFunction(() => window.__lab && document.querySelector('.rail button'), { timeout: 120000 });
  await sleep(2000);
  let s = await P.page.evaluate(() => ({
    lang: document.documentElement.lang,
    progress: document.querySelector('.progress b')?.textContent,
    panelW: Math.round(document.querySelector('.panel').getBoundingClientRect().width),
    mode: window.__lab.store.state.mode,
  }));
  await rec.check(s.lang === 'en', 'reload-lang', 'The language is not kept after a reload', s);
  await rec.check(s.progress === '6/6', 'reload-lessons', 'Lesson progress is not kept after a reload', s);
  await rec.check(
    Math.abs(s.panelW - 520) <= 2,
    'reload-panel-width',
    'The panel width is not kept after a reload',
    s,
    'minor',
    'kit',
  );
  rec.note('afterReload', s);
  rec.note(
    'modeIsStored',
    s.mode !== 'explore'
      ? 'yes'
      : 'no: the mode, the world and the open lesson are not stored; the page always starts on the site in Explore (only #world/part deep links are read)',
  );
  // corrupted storage must not crash the boot
  await P.page.evaluate(() => {
    localStorage.setItem('ram-pump-lab:lessons-done', '{not json');
    localStorage.setItem('ram-pump-lab.panelWidth', 'abc');
    localStorage.setItem('ram-pump-lab:lang', 'xx');
  });
  mark = P.log.errors.length;
  await P.page.reload({ waitUntil: 'domcontentloaded' });
  await P.page.waitForFunction(() => window.__lab && document.querySelector('.rail button'), { timeout: 120000 });
  await sleep(1500);
  s = await P.page.evaluate(() => ({
    lang: document.documentElement.lang,
    progress: document.querySelector('.progress b')?.textContent,
  }));
  await rec.check(
    P.log.errors.length === mark,
    'reload-corrupt-storage',
    'Corrupted stored values break the boot',
    P.log.errors.slice(mark),
    'blocker',
  );
  await rec.check(
    ['fr', 'en'].includes(s.lang),
    'reload-bad-lang',
    'An unknown stored language leaves <html lang> invalid',
    s,
    'minor',
    'kit',
  );
  rec.note('afterCorruptStorage', s);
  errorsSince(ctx, P, 0, where);
  await P.close();

  // ---- deep links
  for (const hash of [
    '#ram',
    '#valve',
    '#catchment/spring-box',
    '#ram/air-chamber',
    '#site/air-chamber',
    '#ram/does-not-exist',
    '#nonsense',
    '#valve/',
  ]) {
    P = await mk({ hash, lang: 'fr', waitReady: true });
    const st = await P.page.evaluate(() => ({
      scene: window.__lab.store.state.scene,
      selected: window.__lab.store.state.selected,
      active: window.__lab.stage.active.id,
    }));
    const errs = P.log.errors.length;
    await sleep(1500);
    const expect = {
      '#ram': 'ram',
      '#valve': 'valve',
      '#catchment/spring-box': 'catchment',
      '#ram/air-chamber': 'ram',
      '#site/air-chamber': 'ram',
      '#ram/does-not-exist': 'ram',
      '#nonsense': 'site',
      '#valve/': 'valve',
    }[hash];
    await rec.check(
      st.scene === expect,
      `deeplink-scene:${hash}`,
      `Deep link ${hash} opens "${st.scene}" instead of "${expect}"`,
      st,
    );
    await rec.check(
      P.log.errors.length === 0 && errs === 0,
      `deeplink-errors:${hash}`,
      `Deep link ${hash} raises an error`,
      P.log.errors,
      hash === '#ram/does-not-exist' ? 'major' : 'blocker',
    );
    if (hash === '#ram/does-not-exist')
      rec.note('unknownPart', { selected: st.selected, errors: P.log.errors.map((e) => e.text.slice(0, 120)) });
    errorsSince(ctx, P, 0, `${where}/${hash}`);
    await P.close();
  }

  // ---- storage blocked (private window, blocked site data): the lab must still start
  P = await mk({
    lang: undefined,
    waitReady: false,
    init: () => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('denied', 'SecurityError');
        },
      });
    },
  });
  let ok = true;
  try {
    await P.page.waitForFunction(() => window.__lab && document.querySelector('.rail button'), { timeout: 60000 });
  } catch {
    ok = false;
  }
  await rec.check(
    ok,
    'storage-blocked-boot',
    'The lab does not start when localStorage throws (private window, blocked site data)',
    P.log.errors.map((e) => e.text.slice(0, 160)),
    'blocker',
    'kit',
  );
  await P.close();

  // ---- no WebGL: what does the visitor see?
  P = await mk({
    waitReady: false,
    init: () => {
      const real = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        if (/webgl/i.test(type)) return null;
        return real.call(this, type, ...rest);
      };
    },
  });
  await sleep(6000);
  const body = await P.page.evaluate(() => ({
    text: document.body.innerText.slice(0, 200),
    rail: !!document.querySelector('.rail button'),
    canvas: !!document.querySelector('canvas'),
  }));
  rec.note('noWebGL', { body, errors: P.log.errors.map((e) => e.text.slice(0, 120)) });
  await rec.check(
    body.rail || /webgl/i.test(body.text),
    'no-webgl-message',
    'Without WebGL the page stays blank: no message tells the visitor what is missing',
    { body, errors: P.log.errors.map((e) => e.text.slice(0, 100)) },
    'major',
    'kit',
  );
  await P.close();

  // ---- fonts blocked (offline, privacy extension): the fallback fonts must not break the frame
  P = await mk({ blockFonts: true, lang: 'fr' });
  const fonts = await P.page.evaluate(() => ({
    space: document.fonts.check('12px "Space Grotesk"'),
    mono: document.fonts.check('12px "JetBrains Mono"'),
  }));
  const L = await P.page.evaluate(layoutProbe, { phone: false });
  analyzeLayout(ctx.F, { at: `${where}/fonts-blocked`, phone: false, world: 'site' }, L);
  rec.note('fontsBlocked', { fonts, overlaps: L.overlaps.length, truncated: L.truncated.length });
  await P.close();
  rec.done();
}

// ---------------------------------------------------------------------------------------------- model

/** Parts that touch nothing in the assembled model (numerical cross-check of the tests), and the waste valve in two worlds. */
async function flowModel(ctx) {
  const where = 'flows/model';
  const rec = recorder(ctx, 'assembled model: floating parts and the waste valve in two worlds', where);
  const P = await openLab(ctx.browser, {
    url: ctx.args.url,
    w: 1280,
    h: 800,
    lang: 'fr',
    bootMs: Math.min(ctx.args.bootMs, 3000),
  });
  const { page } = P;
  rec.page = page;
  try {
    await page.evaluate(() => window.__lab.engine.set({ running: false }));
    const tol = { site: 1.5, catchment: 0.03, ram: 0.008, valve: 0.004 };
    const out = {};
    for (const world of WORLDS) {
      await ui.mode(page, 'explore');
      await ui.world(page, world);
      await ui.set(page, { explode: 0, isolate: false, xray: false, selected: null });
      await settle(page);
      await sleep(1500);
      const f = await page.evaluate(floatingProbe, { tol: tol[world] });
      out[world] = f;
      rec.note(`${world}`, {
        parts: f.parts,
        components: f.components.map((c) => c.size),
        isolated: f.isolated,
        size: f.size,
      });
      await rec.check(
        f.isolated.length === 0,
        `floating:${world}`,
        `${world}: parts whose box touches no other part (tolerance ${tol[world] * 1000} mm): ${f.isolated.join(', ')}`,
        f.isolated,
        world === 'site' ? 'minor' : 'major',
      );
    }
    // the waste valve of the ram world against the same valve in its own world
    const rv = out.ram.boxes['waste-valve'];
    const valveBoxes = Object.entries(out.valve.boxes);
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (const [, b] of valveBoxes) {
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], b.min[i]);
        max[i] = Math.max(max[i], b.min[i] + b.size[i]);
      }
    }
    const vsize = max.map((m, i) => m - min[i]);
    rec.note('wasteValveRamWorld', rv && rv.size);
    rec.note(
      'wasteValveValveWorld',
      vsize.map((v) => +v.toFixed(4)),
    );
    if (rv) {
      // the ram's box includes the water jets and the studs; compare the height and the diameter within 15 %
      const dh = Math.abs(rv.size[1] - vsize[1]) / vsize[1];
      await rec.check(
        dh < 0.15,
        'valve-height',
        `The waste valve is ${Math.round(rv.size[1] * 1000)} mm high in the ram world and ${Math.round(vsize[1] * 1000)} mm in the valve world`,
        { ram: rv.size, valve: vsize },
        'minor',
      );
    }
    ctx.report.model = out;
  } finally {
    rec.done();
    await P.close().catch(() => {});
  }
}

// ---------------------------------------------------------------------------------------------- toolbar

/** The real toolbar buttons in each world: each toggles its flag, and "Overview" after "Isolate" shows the whole device. */
async function flowTools(ctx) {
  const where = 'flows/tools';
  const rec = recorder(ctx, 'toolbar buttons in every world (desktop)', where);
  const P = await openLab(ctx.browser, {
    url: ctx.args.url,
    w: 1280,
    h: 800,
    lang: 'fr',
    bootMs: Math.min(ctx.args.bootMs, 3000),
  });
  const { page } = P;
  rec.page = page;
  const mark = P.log.errors.length;
  const tool = (re) =>
    page.evaluate((src) => {
      const b = [...document.querySelectorAll('.toolbar button')].find((x) => new RegExp(src, 'i').test(x.textContent));
      if (!b) return false;
      b.click();
      return true;
    }, re.source);
  const has = (re) =>
    page.evaluate(
      (src) => [...document.querySelectorAll('.toolbar button')].some((x) => new RegExp(src, 'i').test(x.textContent)),
      re.source,
    );
  const ids = { site: 'drive-pipe', catchment: 'intake-screen', ram: 'air-chamber', valve: 'valve-seat' };
  try {
    await page.evaluate(() => window.__lab.engine.set({ running: false }));
    for (const world of WORLDS) {
      await ui.mode(page, 'explore');
      await ui.world(page, world);
      await ui.set(page, {
        explode: 0,
        isolate: false,
        xray: false,
        cutaway: false,
        schematic: false,
        labels: 'main',
        selected: null,
      });
      await settle(page);
      let st = await ui.store(page);
      // flows, labels cycle, slow motion cycle
      await tool(/^Flux/);
      st = await ui.store(page);
      await rec.check(
        st.schematic === true,
        `tool-flows:${world}`,
        `${world}: the Flux button does not switch the flows on`,
        st,
      );
      await tool(/^Flux/);
      const seq = [];
      for (let i = 0; i < 3; i++) {
        await tool(/^Étiquettes/);
        seq.push((await ui.store(page)).labels);
      }
      await rec.check(
        seq.join() === 'all,none,main',
        `tool-labels:${world}`,
        `${world}: the labels button cycles ${seq.join('>')} instead of all>none>main`,
        seq,
      );
      const slow = [];
      for (let i = 0; i < 4; i++) {
        await tool(/^Ralenti/);
        slow.push(await page.evaluate(() => window.__lab.engine.params.slowMo));
      }
      await rec.check(
        slow.join() === '0.2,0.05,0.02,1',
        `tool-slowmo:${world}`,
        `${world}: slow motion cycles ${slow.join('>')}`,
        slow,
      );
      // section and X-ray availability
      const cut = await has(/^Coupe/);
      await rec.check(
        cut === (world !== 'site'),
        `tool-section-visible:${world}`,
        `${world}: the section button is ${cut ? 'shown' : 'hidden'}`,
        { cut },
        'minor',
      );
      if (cut) {
        await tool(/^Coupe/);
        await rec.check(
          (await ui.store(page)).cutaway === true,
          `tool-section:${world}`,
          `${world}: the section button does not switch the section on`,
          {},
        );
        await tool(/^Coupe/);
      }
      const xr = await has(/^Transparence/);
      await rec.check(
        xr === (world !== 'site'),
        `tool-xray-visible:${world}`,
        `${world}: the X-ray button is ${xr ? 'shown' : 'hidden'} with nothing selected`,
        { xr },
        'minor',
      );
      if (xr) {
        await tool(/^Transparence/);
        await rec.check(
          (await ui.store(page)).xray === true,
          `tool-xray:${world}`,
          `${world}: the X-ray button does not switch it on`,
          {},
        );
        await tool(/^Transparence/);
      }
      // the explode slider by its real input, and its two end buttons
      await page.evaluate(() => {
        const el = document.querySelector('.toolbar input[type=range]');
        el.value = '0.6';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await rec.check(
        Math.abs((await ui.store(page)).explode - 0.6) < 0.01,
        `tool-explode-slider:${world}`,
        `${world}: the explode slider does not set the explode`,
        {},
      );
      await page.evaluate(() => document.querySelectorAll('.toolbar .tool__mini')[1].click());
      await rec.check(
        (await ui.store(page)).explode === 1,
        `tool-explode-end:${world}`,
        `${world}: the end button does not explode fully`,
        {},
      );
      await sleep(1500);
      await page.evaluate(() => document.querySelectorAll('.toolbar .tool__mini')[0].click());
      await sleep(1500);
      // select a part, isolate it with the toolbar, then ask for the overview
      await page.evaluate((id) => window.__lab.store.set({ selected: id }), ids[world]);
      await sleep(300);
      await tool(/^Isoler/);
      await settle(page, { min: 900 });
      st = await ui.store(page);
      await rec.check(
        st.isolate === true,
        `tool-isolate:${world}`,
        `${world}: the Isolate button does not isolate`,
        st,
      );
      await tool(/^Vue d/);
      await settle(page, { min: 900 });
      await sleep(600);
      const S = await page.evaluate(subjectProbe, { phone: false });
      st = await ui.store(page);
      await rec.check(
        S.partsOutsideFree.length === 0 && (world === 'site' || S.sizePct >= 12),
        `tool-overview-after-isolate:${world}`,
        `${world}: "Overview" pressed while a part is isolated frames ${S.partsVisible} part(s) with ${S.partsOutsideFree.length} outside the view (${S.sizePct} % of the view): it does not show the whole device`,
        { S: { union: S.union, sizePct: S.sizePct, outside: S.partsOutsideFree.slice(0, 5) }, isolate: st.isolate },
        'major',
        'kit',
      );
      // un-isolate with the button of the part sheet: where does the camera go?
      await ui.set(page, { isolate: true });
      await page.evaluate((id) => window.__lab.stage.frameParts([id], 1.5), ids[world]);
      await settle(page, { min: 700 });
      await ui.click(page, '.panel .actions > .btn', 0);
      await settle(page, { min: 900 });
      const S2 = await page.evaluate(subjectProbe, { phone: false });
      st = await ui.store(page);
      rec.note(`showAllFromPartSheet:${world}`, {
        isolate: st.isolate,
        outside: S2.partsOutsideFree.length,
        sizePct: S2.sizePct,
      });
      await rec.check(
        st.isolate === false && S2.partsOutsideFree.length === 0,
        `tool-show-all:${world}`,
        `${world}: "Show all" in the part sheet leaves the camera on the part (${S2.partsOutsideFree.length} of ${S2.partsVisible} parts outside the view)`,
        { outside: S2.partsOutsideFree.slice(0, 5) },
        'minor',
        'kit',
      );
      await ui.set(page, { selected: null, isolate: false, explode: 0 });
    }
    await rec.check(
      errorsSince(ctx, P, mark, where) === 0,
      'tools-no-errors',
      'Errors while driving the toolbar',
      P.log.errors.slice(mark),
      'blocker',
    );
  } finally {
    rec.done();
    await P.close().catch(() => {});
  }
}

export async function runFlows(ctx) {
  ctx.report.flows = [];
  const quick = ctx.args.quick;
  // [name, run, kept by --quick]
  const list = [
    ['random', () => flowRandom(ctx, DESKTOP), true],
    ['random-phone', () => flowRandom(ctx, PHONE), false],
    ['panel', () => flowPanel(ctx, DESKTOP), true],
    ['panel-phone', () => flowPanel(ctx, PHONE), true],
    ['language', () => flowLanguage(ctx, DESKTOP), true],
    ['language-phone', () => flowLanguage(ctx, PHONE), false],
    ['guides', () => flowGuides(ctx, DESKTOP), true],
    ['guides-phone', () => flowGuides(ctx, PHONE), false],
    ['sim', () => flowSim(ctx, DESKTOP), true],
    ['sim-phone', () => flowSim(ctx, PHONE), false],
    ['reload', () => flowReload(ctx), true],
    ['tools', () => flowTools(ctx), true],
    ['model', () => flowModel(ctx), true],
  ].filter(([name, , keep]) => (ctx.args.flows ? ctx.args.flows.includes(name) : !quick || keep));
  for (const [, f] of list) {
    try {
      await f();
    } catch (e) {
      const msg = String(e && e.message ? e.message : e);
      ctx.F.add({
        sev: 'blocker',
        key: `audit-crash:flow:${msg.slice(0, 60)}`,
        cat: 'audit',
        title: `A flow of the audit stopped: ${msg.slice(0, 200)}`,
        where: 'flows',
        detail: msg,
      });
      ctx.say(`flow failed: ${msg.slice(0, 160)}`);
    }
  }
}
