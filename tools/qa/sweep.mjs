// Phase "sweep": the frame at many widths, because breakpoints break between the three standard sizes (the owner saw a
// broken panel on a narrow screen on Pelton Lab). DOM measures only, no screenshots except at the breakpoints.
import fs from 'node:fs';
import path from 'node:path';
import { openLab, settle, sleep, ui } from './drive.mjs';
import { layoutProbe, subjectProbe } from './measure.mjs';
import { analyzeLayout, analyzeSubject } from './rules.mjs';

/** Widths × heights: the kit's breakpoints are 760, 900, 1020, 1100 and 1280; landscape phones come last. */
export const SIZES = [
  [320, 568],
  [360, 740],
  [390, 844],
  [414, 896],
  [480, 800],
  [600, 900],
  [700, 900],
  [760, 900],
  [761, 900],
  [768, 1024],
  [820, 1180],
  [900, 800],
  [1020, 768],
  [1024, 768],
  [1100, 800],
  [1180, 820],
  [1280, 800],
  [1440, 900],
  [1920, 1080],
  [667, 375],
  [844, 390],
  [932, 430],
  [1024, 600],
];

const STATES = [
  { name: 'ram-explore', world: 'ram', mode: 'explore' },
  { name: 'ram-part-sheet', world: 'ram', mode: 'explore', part: 'air-chamber' },
  { name: 'ram-sim', world: 'ram', mode: 'sim' },
  { name: 'valve-assembly', world: 'valve', mode: 'assembly' },
  { name: 'site-parts', world: 'site', mode: 'parts' },
];

export async function runSweep(ctx) {
  const dir = path.join(ctx.shotDir, 'sweep');
  if (ctx.args.shots !== 'none') fs.mkdirSync(dir, { recursive: true });
  const sizes = ctx.args.quick ? SIZES.filter((_, i) => i % 3 === 0 || i > 18) : SIZES;
  const states = ctx.args.quick ? STATES.slice(0, 3) : STATES;
  const table = [];
  for (const lang of ctx.args.langs) {
    const P = await openLab(ctx.browser, { url: ctx.args.url, w: 1280, h: 800, lang, bootMs: ctx.args.bootMs });
    const { page } = P;
    try {
      await page.evaluate(() => window.__lab.engine.set({ running: false }));
      for (const s of states) {
        await ui.mode(page, 'explore');
        await ui.world(page, s.world);
        await ui.mode(page, s.mode);
        await settle(page);
        if (s.part) {
          await ui.set(page, { selected: s.part });
          await page.evaluate((id) => window.__lab.stage.frameParts([id], 2.2), s.part);
        }
        for (const [w, h] of sizes) {
          const phone = w <= 760;
          await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: false, hasTouch: false });
          await sleep(400);
          // the camera is not re-framed by a resize: what a window resize or a phone rotation shows
          const keep = s.name === 'ram-explore' ? await page.evaluate(subjectProbe, { phone }) : null;
          await page.evaluate(() => window.__lab.stage.frameAll(0.01));
          if (s.part) await page.evaluate((id) => window.__lab.stage.frameParts([id], 2.2), s.part);
          await settle(page, { min: 250 });
          const L = await page.evaluate(layoutProbe, { phone });
          const S =
            s.mode === 'explore'
              ? await page.evaluate(subjectProbe, { phone, ids: s.part ? [s.part] : undefined })
              : null;
          const at = `sweep/${w}x${h}/${lang}/${s.name}`;
          const wh = { at, phone, world: s.world, exploded: false, kind: s.part ? 'part' : 'device' };
          let shot;
          if (ctx.args.shots !== 'none' && s.name === 'ram-explore' && [320, 761, 1020, 844].includes(w)) {
            shot = `sweep/${w}x${h}-${lang}-${s.name}.jpg`;
            await page.screenshot({ path: path.join(ctx.shotDir, shot), type: 'jpeg', quality: 80 });
          }
          analyzeLayout(ctx.F, wh, L, shot);
          analyzeSubject(ctx.F, wh, S, shot);
          if (keep && keep.union && keep.outsideCanvasPct >= 25 && (!S || S.outsideCanvasPct < 10)) {
            ctx.F.add({
              sev: 'minor',
              key: 'resize-no-reframe',
              cat: '3d-view',
              title:
                'After a window resize or a rotation the subject is cropped until "Overview" is pressed (the camera is not re-framed)',
              where: at,
              detail: { cropped: keep.outsideCanvasPct, afterReframe: S && S.outsideCanvasPct },
              source: 'kit',
            });
          }
          table.push({
            at,
            hscroll: L.pageScroll.overW,
            overlaps: L.overlaps.length,
            covered: L.covered.length,
            offscreen: L.outOfViewport.length + L.cutOff.length,
            truncated: L.truncated.length,
            panelOverflow: L.panelOverflow ? L.panelOverflow.hScroll || L.panelOverflow.wide.length > 0 : false,
            view: S && S.canvas ? `${S.canvas.w}x${S.canvas.h}` : null,
            subjectPct: S ? S.sizePct : null,
          });
        }
        await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1, isMobile: false, hasTouch: false });
        await sleep(300);
      }
    } finally {
      ctx.logs.push({ at: `sweep/${lang}`, ...P.log });
      for (const e of P.log.errors) {
        ctx.F.add({
          sev: 'blocker',
          key: `error:${e.kind}:${e.text.slice(0, 80)}`,
          cat: 'errors',
          title: `${e.kind}: ${e.text.slice(0, 160)}`,
          where: `sweep/${lang}`,
          detail: e,
        });
      }
      await P.close().catch(() => {});
    }
  }
  ctx.report.sweep = table;
}
