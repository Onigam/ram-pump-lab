// Node-side helpers of the QA audit: find puppeteer and Chrome, open the lab in a page with its error log, and drive
// the real UI (top bar, rail, side panel) the way a visitor does.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** The modes in the order of the rail, and the worlds in the order of the top bar. */
export const MODES = ['explore', 'assembly', 'install', 'sim', 'plans', 'lessons', 'parts', 'about'];
export const WORLDS = ['site', 'catchment', 'ram', 'valve'];

/** puppeteer-core, pngjs: from the repo, from $QA_MODULES, or from a scratch copy (`npm i --no-save puppeteer-core`). */
export async function loadDeps() {
  const dirs = [
    process.env.QA_MODULES,
    path.join(HERE, '..', '..', 'node_modules'),
    path.join(process.cwd(), 'node_modules'),
    '/tmp/vrnode/node_modules',
  ].filter(Boolean);
  const tried = [];
  for (const d of dirs) {
    const base = d.endsWith('node_modules') ? d : path.join(d, 'node_modules');
    tried.push(base);
    if (!fs.existsSync(path.join(base, 'puppeteer-core'))) continue;
    const req = createRequire(path.join(base, 'x.js'));
    return { puppeteer: req('puppeteer-core'), modules: base };
  }
  throw new Error(
    `puppeteer-core not found (looked in ${tried.join(', ')}). Run: npm i --no-save puppeteer-core in a scratch copy and set QA_MODULES=<its node_modules>.`,
  );
}

export function findChrome() {
  const candidates = [
    process.env.CHROME,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  const found = candidates.find((c) => fs.existsSync(c));
  if (!found) throw new Error('Chrome not found: set CHROME=/path/to/chrome');
  return found;
}

export async function launch(puppeteer, { scrollbars = true } = {}) {
  const args = [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--enable-precise-memory-info',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--no-first-run',
  ];
  if (!scrollbars) args.push('--hide-scrollbars');
  return puppeteer.launch({
    executablePath: findChrome(),
    headless: 'new',
    args,
    timeout: 60000,
    protocolTimeout: 240000,
  });
}

const FONT_HOST = /fonts\.(googleapis|gstatic)\.com/;

/**
 * Open the lab at a viewport and language. The returned object keeps the log of what went wrong in this page:
 * `log.errors` (page errors and console errors), `log.warnings`, `log.failed` (requests), `log.fonts` (ignored font
 * requests), `log.navs` (navigations after the first: a hot reload of the dev server in the middle of a run).
 */
export async function openLab(browser, o) {
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);
  const vp = { width: o.w, height: o.h, deviceScaleFactor: o.dpr ?? 1, isMobile: !!o.mobile, hasTouch: !!o.mobile };
  await page.setViewport(vp);
  const log = { errors: [], warnings: [], failed: [], fonts: [], navs: 0, t0: Date.now() };
  page.on('pageerror', (e) =>
    log.errors.push({ kind: 'pageerror', text: String(e && e.stack ? e.stack : e).slice(0, 600) }),
  );
  page.on('console', (m) => {
    const t = m.type();
    if (t === 'error') {
      const url = m.location()?.url ?? '';
      if (FONT_HOST.test(url) || FONT_HOST.test(m.text())) log.fonts.push(m.text().slice(0, 160));
      else log.errors.push({ kind: 'console.error', text: m.text().slice(0, 400), url });
    } else if (t === 'warning') log.warnings.push(m.text().slice(0, 300));
  });
  page.on('requestfailed', (r) => {
    const rec = { url: r.url().slice(0, 200), error: r.failure()?.errorText ?? '' };
    if (FONT_HOST.test(r.url())) log.fonts.push(`${rec.error} ${rec.url}`);
    else if (!/ERR_ABORTED/.test(rec.error)) log.failed.push(rec);
  });
  page.on('response', (r) => {
    if (r.status() >= 400 && !FONT_HOST.test(r.url()))
      log.failed.push({ url: r.url().slice(0, 200), error: `HTTP ${r.status()}` });
  });
  let first = true;
  page.on('framenavigated', (f) => {
    if (f !== page.mainFrame()) return;
    if (first) first = false;
    else log.navs++;
  });
  if (o.init) await page.evaluateOnNewDocument(o.init);
  if (o.blockFonts) {
    await page.setRequestInterception(true);
    page.on('request', (r) => (FONT_HOST.test(r.url()) ? r.abort() : r.continue()));
  }
  await page.goto(o.url + (o.hash ?? ''), { waitUntil: 'domcontentloaded' });
  log.domReadyMs = Date.now() - log.t0;
  if (o.waitReady !== false) {
    await page.waitForFunction(() => window.__lab && document.querySelector('.rail button'), { timeout: 120000 });
    log.readyMs = Date.now() - log.t0;
    await sleep(o.bootMs ?? 6000);
    log.fontsLoaded = await page.evaluate(() =>
      [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '')),
    );
    if (o.lang && o.lang !== 'fr') await ui.lang(page, o.lang);
    else await ui.lang(page, 'fr');
  }
  return { page, log, vp: { w: o.w, h: o.h, mobile: !!o.mobile, phone: o.w <= 760 }, close: () => page.close() };
}

/** Wait for the camera to stop flying and two more frames (the software renderer is slow). */
export async function settle(page, o = {}) {
  await sleep(o.min ?? 350);
  await page.waitForFunction(() => !window.__lab.stage.fly, { timeout: o.max ?? 60000 }).catch(() => {});
  await waitFrames(page, 2);
}

export async function waitFrames(page, n = 2) {
  await page.evaluate(
    (k) =>
      new Promise((res) => {
        let i = 0;
        const f = () => (++i >= k ? res() : requestAnimationFrame(f));
        requestAnimationFrame(f);
      }),
    n,
  );
}

/** Actions through the real DOM of the shell (the buttons a visitor presses). */
export const ui = {
  /** Top bar: world by id or index. */
  world: (page, id) =>
    page.evaluate(
      (w, worlds) => {
        const i = typeof w === 'number' ? w : worlds.indexOf(w);
        const b = document.querySelectorAll('.scene-switch button')[i];
        if (!b) return false;
        b.click();
        return true;
      },
      id,
      WORLDS,
    ),
  /** Rail: mode by id. */
  mode: (page, id) =>
    page.evaluate(
      (m, modes) => {
        const b = document.querySelectorAll('.rail__btn')[modes.indexOf(m)];
        if (!b) return false;
        b.click();
        return true;
      },
      id,
      MODES,
    ),
  lang: (page, l) =>
    page.evaluate((x) => {
      const b = document.querySelectorAll('.lang-switch button')[x === 'en' ? 1 : 0];
      if (!b) return false;
      if (!b.classList.contains('is-active')) b.click();
      return true;
    }, l),
  /** Click the n-th element that matches the selector (optionally inside a root selector). */
  click: (page, sel, n = 0, root = 'document') =>
    page.evaluate(
      (s, i, r) => {
        const scope = r === 'document' ? document : document.querySelector(r);
        const el = scope && scope.querySelectorAll(s)[i];
        if (!el) return false;
        el.click();
        return true;
      },
      sel,
      n,
      root,
    ),
  /** Click the first element whose text matches the regular expression source. */
  clickText: (page, sel, re, flags = 'i') =>
    page.evaluate(
      (s, source, f) => {
        const rx = new RegExp(source, f);
        const el = [...document.querySelectorAll(s)].find((e) =>
          rx.test((e.getAttribute('aria-label') || '') + ' ' + e.textContent),
        );
        if (!el) return false;
        el.click();
        return true;
      },
      sel,
      re.source ?? re,
      flags,
    ),
  count: (page, sel) => page.evaluate((s) => document.querySelectorAll(s).length, sel),
  store: (page) => page.evaluate(() => ({ ...window.__lab.store.state })),
  set: (page, patch) => page.evaluate((p) => window.__lab.store.set(p), patch),
  /** The collapsed bottom sheet of the phone: open or close it with its grip. */
  sheet: (page, open) =>
    page.evaluate((want) => {
      const on = document.body.classList.contains('sheet-open');
      if (on !== want) document.querySelector('.panel__grip')?.click();
      return document.body.classList.contains('sheet-open');
    }, open),
};

/** A seeded generator so that a "random" run can be replayed. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function tmpDir(name) {
  return fs.mkdtempSync(path.join(os.tmpdir(), name));
}
