// Phase "perf": what the lab costs, as far as a software renderer (SwiftShader, no GPU) can tell. The counts (draw calls,
// triangles, geometries, textures, sweeps, JS milliseconds per frame, heap growth) are real; frame times of the GPU
// part are not. CPU throttling (x4) approximates the JavaScript side of a mid-range phone.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import zlib from 'node:zlib';
import { WORLDS, openLab, settle, sleep, ui } from './drive.mjs';
import { renderStats } from './measure.mjs';

const RESET = {
  explode: 0,
  xray: false,
  isolate: false,
  cutaway: false,
  schematic: false,
  labels: 'main',
  selected: null,
};

async function cdpOf(page) {
  const cdp = await page.createCDPSession();
  await cdp.send('Performance.enable');
  return cdp;
}
async function metrics(cdp) {
  const { metrics: m } = await cdp.send('Performance.getMetrics');
  return Object.fromEntries(m.map((x) => [x.name, x.value]));
}
async function gc(cdp) {
  await cdp.send('HeapProfiler.enable').catch(() => {});
  await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
}
async function counters(cdp, page) {
  const d = await cdp.send('Memory.getDOMCounters');
  const heap = await page.evaluate(() => (performance.memory ? performance.memory.usedJSHeapSize : null));
  const info = await page.evaluate(() => {
    const i = window.__lab.stage.renderer.info;
    return {
      geometries: i.memory.geometries,
      textures: i.memory.textures,
      programs: i.programs ? i.programs.length : 0,
    };
  });
  return { nodes: d.nodes, listeners: d.jsEventListeners, heapMB: heap ? Math.round(heap / 1048576) : null, ...info };
}

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.map': 'application/json',
};
function serve(dir) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(dir, p);
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    const ext = path.extname(file);
    let body = fs.readFileSync(file);
    const headers = { 'Content-Type': MIME[ext] ?? 'application/octet-stream', 'Cache-Control': 'no-store' };
    if (/\.(js|css|html|svg|json)$/.test(ext) && /gzip/.test(req.headers['accept-encoding'] ?? '')) {
      body = zlib.gzipSync(body);
      headers['Content-Encoding'] = 'gzip';
    }
    res.writeHead(200, headers);
    res.end(body);
  });
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })),
  );
}

export async function runPerf(ctx) {
  const R = (ctx.report.perf = {});
  const quick = ctx.args.quick;

  // ------------------------------------------------------------------ 1. render budget per world
  {
    const P = await openLab(ctx.browser, { url: ctx.args.url, w: 1280, h: 800, lang: 'fr', bootMs: ctx.args.bootMs });
    const { page } = P;
    const cdp = await cdpOf(page);
    try {
      await page.evaluate(() => window.__lab.engine.set({ running: true, timeScale: 1 }));
      R.budget = {};
      for (const world of WORLDS) {
        await ui.mode(page, 'explore');
        await ui.world(page, world);
        await ui.set(page, RESET);
        await settle(page);
        const variants = {};
        variants.home = await page.evaluate(renderStats, { frames: quick ? 8 : 16 });
        await ui.set(page, { explode: 1 });
        await sleep(1800);
        variants.exploded = await page.evaluate(renderStats, { frames: 8 });
        await ui.set(page, { explode: 0 });
        await sleep(1500);
        await ui.set(page, { xray: true });
        await sleep(600);
        variants.xray = await page.evaluate(renderStats, { frames: 8 });
        await ui.set(page, { xray: false, cutaway: true });
        await sleep(600);
        variants.section = await page.evaluate(renderStats, { frames: 8 });
        await ui.set(page, { cutaway: false, schematic: true });
        await sleep(600);
        variants.flows = await page.evaluate(renderStats, { frames: 8 });
        await ui.set(page, RESET);
        const part = { site: 'drive-pipe', catchment: 'intake-screen', ram: 'air-chamber', valve: 'valve-seat' }[world];
        await ui.set(page, { selected: part });
        await sleep(600);
        variants.selected = await page.evaluate(renderStats, { frames: 8 });
        await ui.set(page, RESET);
        R.budget[world] = variants;
      }
      // what one frame costs on the main thread, per world and per mode, at 1x and 4x CPU
      R.frameCost = {};
      for (const throttle of [1, 4]) {
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
        for (const [label, world, mode] of [
          ['site explore', 'site', 'explore'],
          ['catchment explore', 'catchment', 'explore'],
          ['ram explore', 'ram', 'explore'],
          ['valve explore', 'valve', 'explore'],
          ['ram simulation panel', 'ram', 'sim'],
          ['ram plans', 'ram', 'plans'],
        ]) {
          await ui.mode(page, 'explore');
          await ui.world(page, world);
          await ui.set(page, RESET);
          await ui.mode(page, mode);
          await settle(page);
          await page.evaluate(() => {
            const lab = window.__lab;
            const acc = (window.__qa = { frames: 0, frame: 0, step: 0, update: 0, render: 0, longest: 0 });
            if (!window.__qaWrapped) {
              window.__qaWrapped = true;
              const timed = (obj, key, slot) => {
                const orig = obj[key];
                obj[key] = function (...a) {
                  const s = performance.now();
                  const r = orig.apply(this, a);
                  window.__qa[slot] += performance.now() - s;
                  return r;
                };
              };
              timed(lab.engine, 'step', 'step');
              timed(lab.stage, 'render', 'render');
              for (const m of lab.stage.modules.values()) timed(m, 'update', 'update');
              const raf = window.requestAnimationFrame.bind(window);
              window.requestAnimationFrame = (cb) =>
                raf((t) => {
                  const s = performance.now();
                  cb(t);
                  const d = performance.now() - s;
                  window.__qa.frame += d;
                  window.__qa.frames++;
                  window.__qa.longest = Math.max(window.__qa.longest, d);
                });
            }
          });
          const m0 = await metrics(cdp);
          await sleep(quick ? 3000 : 6000);
          const m1 = await metrics(cdp);
          const a = await page.evaluate(() => window.__qa);
          const secs = m1.Timestamp - m0.Timestamp;
          const per = (x) => Math.round((x / Math.max(1, a.frames)) * 100) / 100;
          (R.frameCost[`x${throttle}`] ??= {})[label] = {
            frames: a.frames,
            fps: Math.round((a.frames / secs) * 10) / 10,
            jsMsPerFrame: per(a.frame),
            stepMs: per(a.step),
            sceneUpdateMs: per(a.update),
            renderMs: per(a.render),
            otherMs: per(a.frame - a.step - a.update - a.render),
            longestFrameMs: Math.round(a.longest),
            layoutsPerSec: Math.round((m1.LayoutCount - m0.LayoutCount) / secs),
            styleRecalcsPerSec: Math.round((m1.RecalcStyleCount - m0.RecalcStyleCount) / secs),
            layoutMsPerSec: Math.round(((m1.LayoutDuration - m0.LayoutDuration) / secs) * 1000),
            scriptMsPerSec: Math.round(((m1.ScriptDuration - m0.ScriptDuration) / secs) * 1000),
            mainThreadBusyPct: Math.round(((m1.TaskDuration - m0.TaskDuration) / secs) * 100),
          };
        }
      }
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });

      // ---------------------------------------------------------------- allocation rate and DOM churn
      const alloc = async () => {
        await gc(cdp);
        return page.evaluate(async () => {
          const samples = [];
          let churn = 0;
          let frames = 0;
          const mo = new MutationObserver((l) =>
            l.forEach((r) => (churn += r.addedNodes.length + r.removedNodes.length)),
          );
          mo.observe(document.getElementById('app'), { childList: true, subtree: true });
          let live = true;
          const loop = () => {
            if (!live) return;
            frames++;
            requestAnimationFrame(loop);
          };
          requestAnimationFrame(loop);
          const t0 = performance.now();
          while (performance.now() - t0 < 6000) {
            samples.push(performance.memory.usedJSHeapSize);
            await new Promise((r) => setTimeout(r, 50));
          }
          live = false;
          mo.disconnect();
          let up = 0;
          let drops = 0;
          for (let i = 1; i < samples.length; i++) {
            const d = samples[i] - samples[i - 1];
            if (d > 0) up += d;
            else if (d < -50000) drops++;
          }
          const secs = (performance.now() - t0) / 1000;
          return {
            mbPerSec: Math.round((up / 1048576 / secs) * 100) / 100,
            kbPerFrame: Math.round(up / 1024 / Math.max(1, frames)),
            fps: Math.round((frames / secs) * 10) / 10,
            gcDrops: drops,
            domNodeChurnPerSec: Math.round(churn / secs),
          };
        });
      };
      R.allocation = {};
      for (const world of WORLDS) {
        await ui.mode(page, 'explore');
        await ui.world(page, world);
        await ui.set(page, RESET);
        await settle(page);
        await page.evaluate(() => window.__lab.engine.set({ running: true, timeScale: 1 }));
        R.allocation[`${world} explore, simulation running`] = await alloc();
      }
      // what the 3D and the simulation each cost: same world, paused simulation, then no 3D at all (Plans mode)
      await ui.world(page, 'ram');
      await ui.mode(page, 'explore');
      await settle(page);
      await page.evaluate(() => window.__lab.engine.set({ running: false }));
      R.allocation['ram explore, simulation paused'] = await alloc();
      await page.evaluate(() => window.__lab.engine.set({ running: true, timeScale: 1 }));
      await ui.mode(page, 'plans');
      await sleep(500);
      R.allocation['ram plans (no 3D frame), simulation running'] = await alloc();
      await ui.mode(page, 'sim');
      await sleep(1500);
      R.allocation['ram simulation panel open'] = await alloc();

      // ---------------------------------------------------------------- who allocates: the sampling heap profiler, garbage included
      R.allocationSites = {};
      for (const [label, world, mode] of [
        ['site explore', 'site', 'explore'],
        ['ram explore', 'ram', 'explore'],
        ['ram simulation panel', 'ram', 'sim'],
      ]) {
        await ui.mode(page, 'explore');
        await ui.world(page, world);
        await ui.set(page, RESET);
        await ui.mode(page, mode);
        await settle(page);
        await page.evaluate(() => window.__lab.engine.set({ running: true, timeScale: 1 }));
        await cdp.send('HeapProfiler.enable').catch(() => {});
        await cdp.send('HeapProfiler.startSampling', {
          samplingInterval: 2048,
          includeObjectsCollectedByMajorGC: true,
          includeObjectsCollectedByMinorGC: true,
        });
        await sleep(6000);
        const { profile } = await cdp.send('HeapProfiler.stopSampling');
        const by = new Map();
        let total = 0;
        const visit = (n) => {
          const cf = n.callFrame;
          const key = `${cf.functionName || '(anonymous)'} ${cf.url.replace(/^.*\/(node_modules\/)?/, '')}:${cf.lineNumber}`;
          by.set(key, (by.get(key) ?? 0) + n.selfSize);
          total += n.selfSize;
          n.children.forEach(visit);
        };
        visit(profile.head);
        R.allocationSites[label] = {
          totalKB: Math.round(total / 1024),
          top: [...by.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12)
            .map(([k, v]) => `${Math.round(v / 1024)} KB  ${k}`),
        };
      }

      // ---------------------------------------------------------------- building the four worlds (CPU only, no GL), x1 and x4
      R.worldBuild = {};
      for (const throttle of [1, 4]) {
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
        R.worldBuild[`x${throttle}`] = await page.evaluate(async () => {
          const m = await import('/src/three/index.ts');
          const out = {};
          for (const [k, f] of [
            ['site', m.createSiteScene],
            ['catchment', m.createCatchmentScene],
            ['ram', m.createRamScene],
            ['valve', m.createValveScene],
          ]) {
            const t = performance.now();
            const mod = f();
            out[k] = Math.round(performance.now() - t);
            mod.scene.traverse((o) => {
              if (o.geometry) o.geometry.dispose();
            });
          }
          out.total = out.site + out.catchment + out.ram + out.valve;
          return out;
        });
      }
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    } finally {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }).catch(() => {});
      R.errors = P.log.errors.length;
      await P.close().catch(() => {});
    }
  }

  // ------------------------------------------------------------------ 2. memory after many world switches
  {
    const P = await openLab(ctx.browser, { url: ctx.args.url, w: 1280, h: 800, lang: 'fr', bootMs: ctx.args.bootMs });
    const { page } = P;
    const cdp = await cdpOf(page);
    try {
      await page.evaluate(() => window.__lab.engine.set({ running: true, timeScale: 1 }));
      // visit every world and every mode once so that lazily created resources exist, then take the reference
      for (const w of WORLDS) {
        await ui.world(page, w);
        await settle(page);
      }
      for (const m of ['sim', 'parts', 'plans', 'lessons', 'about', 'explore']) {
        await ui.mode(page, m);
        await sleep(400);
      }
      await ui.world(page, 'site');
      await settle(page);
      await gc(cdp);
      await gc(cdp);
      const before = await counters(cdp, page);
      const N = quick ? 24 : 52;
      for (let i = 0; i < N; i++) {
        await ui.world(page, WORLDS[(i * 3 + 1) % 4]);
        if (i % 4 === 0) await ui.mode(page, ['explore', 'sim', 'parts', 'plans', 'lessons', 'explore'][(i / 4) % 6]);
        await sleep(160);
      }
      await ui.mode(page, 'explore');
      await ui.world(page, 'site');
      await settle(page);
      await gc(cdp);
      await gc(cdp);
      const after = await counters(cdp, page);
      R.memory = {
        switches: N,
        before,
        after,
        delta: Object.fromEntries(Object.keys(before).map((k) => [k, after[k] == null ? null : after[k] - before[k]])),
      };
      if (after.geometries > before.geometries + 5 || after.textures > before.textures + 2) {
        ctx.F.add({
          sev: 'major',
          key: 'leak-gpu-resources',
          cat: 'weight',
          title: `GPU resources grow with world switches (geometries ${before.geometries} → ${after.geometries}, textures ${before.textures} → ${after.textures})`,
          where: 'perf/memory',
          detail: R.memory,
        });
      }
      if (after.nodes > before.nodes + 200 || after.listeners > before.listeners + 100) {
        ctx.F.add({
          sev: 'major',
          key: 'leak-dom',
          cat: 'weight',
          title: `The DOM grows with world switches (nodes ${before.nodes} → ${after.nodes}, listeners ${before.listeners} → ${after.listeners})`,
          where: 'perf/memory',
          detail: R.memory,
        });
      }
      if (before.heapMB != null && after.heapMB > before.heapMB * 1.25 + 10) {
        ctx.F.add({
          sev: 'major',
          key: 'leak-heap',
          cat: 'weight',
          title: `JS heap grows ${before.heapMB} → ${after.heapMB} MB after ${N} world switches (after a forced GC)`,
          where: 'perf/memory',
          detail: R.memory,
        });
      }

      // ------------------------------------------------------------ 3. sweeps: opening the sim panel and every drawing sheet
      await page.evaluate(() => {
        const proto = Object.getPrototypeOf(window.__lab.engine);
        window.__sw = { sweep: 0, trace: 0, ms: 0 };
        for (const k of ['sweep', 'strokeTrace']) {
          if (!proto[k] || proto[k].__qa) continue;
          const orig = proto[k];
          proto[k] = function (...a) {
            const s = performance.now();
            const r = orig.apply(this, a);
            window.__sw.ms += performance.now() - s;
            window.__sw[k === 'sweep' ? 'sweep' : 'trace']++;
            return r;
          };
          proto[k].__qa = true;
        }
      });
      const swCount = () => page.evaluate(() => ({ ...window.__sw }));
      const reset = () => page.evaluate(() => (window.__sw = { sweep: 0, trace: 0, ms: 0 }));
      await ui.mode(page, 'explore');
      await ui.world(page, 'ram');
      await reset();
      await ui.mode(page, 'sim');
      await sleep(8000);
      const simOpen = await swCount();
      await reset();
      await page.evaluate(() => {
        const el = document.querySelector('.sim input[type=range]');
        el.value = String(Number(el.min) + (Number(el.max) - Number(el.min)) * 0.4);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await sleep(8000);
      const simSlider = await swCount();
      R.sweeps = { simPanelOpen: simOpen, afterOneSliderMove: simSlider, sheets: [] };
      const content = await (await import('./matrix.mjs')).loadContent(page);
      await ui.mode(page, 'plans');
      for (let i = 0; i < content.sheets.length; i++) {
        await reset();
        const ms = await page.evaluate((k) => {
          const t = performance.now();
          document.querySelectorAll('.sheet-row')[k].click();
          return performance.now() - t;
        }, i);
        await sleep(300);
        const c = await swCount();
        R.sweeps.sheets.push({
          sheet: content.sheets[i].number,
          id: content.sheets[i].id,
          renderMs: Math.round(ms),
          sweeps: c.sweep,
          traces: c.trace,
          sweepMs: Math.round(c.ms),
        });
      }
      // the same sheet visited again, and after a language switch: is anything cached?
      const d09b = content.sheets.findIndex((s) => /performance/.test(s.id));
      if (d09b >= 0) {
        await ui.click(page, '.sheet-row', 0);
        await sleep(300);
        await reset();
        const ms2 = await page.evaluate((k) => {
          const t = performance.now();
          document.querySelectorAll('.sheet-row')[k].click();
          return performance.now() - t;
        }, d09b);
        await sleep(300);
        R.sweeps.d09Revisit = { ...(await swCount()), renderMs: Math.round(ms2) };
      }
      const d09 = content.sheets.findIndex((s) => /performance/.test(s.id));
      if (d09 >= 0) {
        await ui.click(page, '.sheet-row', d09);
        await sleep(300);
        await reset();
        await ui.lang(page, 'en');
        await sleep(600);
        R.sweeps.d09AfterLanguageSwitch = await swCount();
        await ui.lang(page, 'fr');
      }
      const slow = R.sweeps.sheets.filter((s) => s.renderMs > 250);
      if (slow.length) {
        ctx.F.add({
          sev: 'major',
          key: 'sheet-render-slow',
          cat: 'weight',
          title: `Opening ${slow.map((s) => `${s.sheet} (${s.renderMs} ms, ${s.sweeps} sweeps)`).join(', ')} blocks the page on its first visit (the sheet is rendered synchronously in the click handler: its sweeps run in one go, with no placeholder; later visits are cached: ${R.sweeps.d09Revisit ? R.sweeps.d09Revisit.renderMs : '?'} ms)`,
          where: 'perf/sheets',
          detail: slow,
        });
      }
    } finally {
      await P.close().catch(() => {});
    }
  }

  // ------------------------------------------------------------------ 4. production boot (the built bundle, served with gzip)
  if (ctx.distDir && fs.existsSync(path.join(ctx.distDir, 'index.html'))) {
    const { server, port } = await serve(ctx.distDir);
    R.boot = {};
    try {
      for (const throttle of [1, 4]) {
        const page = await ctx.browser.newPage();
        await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
        const cdp = await page.createCDPSession();
        await cdp.send('Performance.enable');
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e)));
        page.on(
          'console',
          (m) =>
            m.type() === 'error' &&
            !/fonts\.(googleapis|gstatic)/.test(m.text()) &&
            errors.push(m.text().slice(0, 200)),
        );
        await page.evaluateOnNewDocument(() => {
          window.__boot = { railAt: null, frames: [] };
          const mo = new MutationObserver(() => {
            if (!window.__boot.railAt && document.querySelector('.rail button') && document.querySelector('canvas')) {
              window.__boot.railAt = performance.now();
              let n = 0;
              const f = () => {
                window.__boot.frames.push(performance.now());
                if (++n < 4) requestAnimationFrame(f);
              };
              requestAnimationFrame(f);
              mo.disconnect();
            }
          });
          mo.observe(document, { childList: true, subtree: true });
        });
        await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => window.__boot && window.__boot.frames.length >= 4, { timeout: 180000 });
        await sleep(1500);
        const t = await page.evaluate(() => {
          const nav = performance.getEntriesByType('navigation')[0];
          const paint = Object.fromEntries(
            performance.getEntriesByType('paint').map((p) => [p.name, Math.round(p.startTime)]),
          );
          return {
            domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
            railAndCanvasAt: Math.round(window.__boot.railAt),
            firstFrames: window.__boot.frames.map((x) => Math.round(x)),
            paint,
            transferKB: Math.round(
              performance.getEntriesByType('resource').reduce((a, r) => a + (r.transferSize || 0), 0) / 1024,
            ),
            resources: performance.getEntriesByType('resource').length,
          };
        });
        const m = await metrics(cdp);
        R.boot[`x${throttle}`] = {
          ...t,
          scriptMs: Math.round(m.ScriptDuration * 1000),
          layoutMs: Math.round(m.LayoutDuration * 1000),
          taskMs: Math.round(m.TaskDuration * 1000),
          heapMB: Math.round(m.JSHeapUsedSize / 1048576),
          errors,
        };
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
        await page.close();
      }
    } finally {
      server.close();
    }
  }
}
