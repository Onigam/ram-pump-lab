import { beforeAll, describe, expect, it } from 'vitest';
import { Drawing, configureDrawings } from '@onigam/lab-kit/drawings';
import { setLang } from '@onigam/lab-kit/i18n';
import { partIds, type WorldId } from '../../part-ids';
import { RamSim } from '../../sim/engine';
import { presetParams } from '../../sim/presets';
import { PIPE_SIZES, expectedDelivery, sizeRam } from '../../sim/sizing';
import { DELIVERY_ROUTE, SITE } from '../../three/dims';
import { Chart } from './chart';
import { contourLines, sampleGrid, simplify } from './contour';
import { profileNumbers } from './d12-site-profile';
import { HYDRAULIC_SHEETS } from './index';
import {
  HEAD_GRID,
  STROKE_GRID,
  WEIGHT_GRID,
  stroke1,
  sweepHead,
  sweepStroke,
  sweepWeight,
  valveRuns,
  weightOptimum,
  workingLimits,
} from './model';
import { siteGeo } from './site-geo';
import { FakeElement, installFakeDom, textBoxes, textExtent } from './test-dom';
import { nf } from './util';

// The seven hydraulic and site sheets (D07 … D13) by script: the contract (ids, numbers, groups, worlds, parts), that
// every sheet renders in both languages without a NaN, that the texts stay inside the paper and do not pile up, that the
// charts and the profile carry the model's values and the site's dimensions, and that FR and EN are both written.

const CONTRACT: { id: string; number: string; group: string; scene: WorldId }[] = [
  { id: 'principle-diagram', number: 'D07', group: 'hydraulic', scene: 'site' },
  { id: 'cycle-diagram', number: 'D08', group: 'hydraulic', scene: 'ram' },
  { id: 'performance-chart', number: 'D09', group: 'hydraulic', scene: 'ram' },
  { id: 'sizing-table', number: 'D10', group: 'hydraulic', scene: 'ram' },
  { id: 'site-plan', number: 'D11', group: 'site', scene: 'site' },
  { id: 'site-profile', number: 'D12', group: 'site', scene: 'site' },
  { id: 'catchment-layout', number: 'D13', group: 'site', scene: 'catchment' },
];

const LANGS = ['fr', 'en'] as const;
type Lang = (typeof LANGS)[number];
const root = (d: Drawing): FakeElement => d.svg as unknown as FakeElement;

/** Every sheet rendered once per language (a render is a few hundred ms: do it once). */
const rendered = new Map<string, FakeElement>();
const key = (id: string, lang: Lang) => `${id}/${lang}`;

beforeAll(() => {
  installFakeDom();
  configureDrawings({ project: { fr: 'LABO DU BÉLIER HYDRAULIQUE', en: 'HYDRAULIC RAM LAB' } });
  for (const lang of LANGS) {
    setLang(lang);
    for (const sheet of HYDRAULIC_SHEETS) rendered.set(key(sheet.id, lang), root(sheet.render()));
  }
});

const allTexts = (id: string, lang: Lang) => textBoxes(rendered.get(key(id, lang)) as FakeElement);
const textsOf = (id: string, lang: Lang): string[] => allTexts(id, lang).map((t) => t.content);

describe('the contract', () => {
  it('has the seven sheets, in reading order, with the frozen ids, numbers, groups and worlds', () => {
    expect(HYDRAULIC_SHEETS.map((s) => s.id)).toEqual(CONTRACT.map((c) => c.id));
    HYDRAULIC_SHEETS.forEach((s, i) => {
      const c = CONTRACT[i] as (typeof CONTRACT)[0];
      expect(s.number, s.id).toBe(c.number);
      expect(s.group, s.id).toBe(c.group);
      expect(s.scene, s.id).toBe(c.scene);
    });
  });

  it('only shows parts that belong to the world of the sheet', () => {
    for (const s of HYDRAULIC_SHEETS) {
      expect(s.parts?.length ?? 0, s.id).toBeGreaterThan(0);
      for (const id of s.parts ?? []) expect(partIds(s.scene as WorldId), `${s.id}: ${id}`).toContain(id);
    }
  });

  it('writes a different, non-empty description and title in French and in English', () => {
    for (const s of HYDRAULIC_SHEETS) {
      for (const f of [s.title, s.description]) {
        expect(f.fr.trim().length, s.id).toBeGreaterThan(5);
        expect(f.en.trim().length, s.id).toBeGreaterThan(5);
        expect(f.fr, s.id).not.toBe(f.en);
      }
      // 2 to 4 sentences
      const sentences = (t: string) => t.split(/[.!?]\s/).length;
      expect(sentences(s.description.fr), s.id).toBeGreaterThanOrEqual(2);
      expect(sentences(s.description.fr), s.id).toBeLessThanOrEqual(5);
    }
  });
});

describe('the descriptions', () => {
  it('quote the figures of the video the way dims.ts has them', () => {
    const text = (id: string, lang: Lang) =>
      (HYDRAULIC_SHEETS.find((s) => s.id === id)?.description as { fr: string; en: string })[lang];
    for (const lang of LANGS) {
      for (const v of [nf(SITE.fall, 1), nf(SITE.driveLength, 0), nf(SITE.deliveryHead, 0), nf(SITE.deliveryLength, 0)])
        expect(text('site-profile', lang), `${lang} ${v[lang]}`).toContain(v[lang]);
      expect(text('site-plan', lang)).toContain(nf(SITE.deliveryLength, 0)[lang]);
      expect(text('sizing-table', lang)).toContain(nf(SITE.sourceFlowLpm, 1)[lang]);
    }
  });
});

describe('every sheet renders', () => {
  for (const c of CONTRACT) {
    for (const lang of LANGS) {
      it(`${c.number} (${lang}): a full A3 drawing with no NaN, no infinity and no empty text`, () => {
        const svg = rendered.get(key(c.id, lang)) as FakeElement;
        expect(svg.getAttribute('viewBox')).toBe('0 0 420 297');
        const nodes = svg.all();
        expect(nodes.length, 'elements').toBeGreaterThan(250);
        for (const e of nodes) {
          for (const [k, v] of e.attrs)
            expect(/NaN|Infinity|undefined/.test(v), `${c.id} ${e.tag} ${k}="${v.slice(0, 60)}"`).toBe(false);
        }
        const texts = allTexts(c.id, lang);
        expect(texts.length).toBeGreaterThan(60);
        for (const t of texts) {
          expect(t.content.trim().length, `${c.id}: empty text at ${t.x},${t.y}`).toBeGreaterThan(0);
          expect(/undefined|\[object|NaN/.test(t.content), `${c.id}: "${t.content}"`).toBe(false);
          // typographic apostrophes and French spaces: no straight quote, no double space
          expect(/'|\s\s/.test(t.content), `${c.id}: "${t.content}"`).toBe(false);
          expect(Number.isFinite(t.x) && Number.isFinite(t.y) && t.size > 0, `${c.id}: ${t.content}`).toBe(true);
        }
        // the title block carries the number of the sheet
        expect(texts.some((t) => t.content === c.number)).toBe(true);
      });

      it(`${c.number} (${lang}): every text stays inside the frame of the paper`, () => {
        for (const t of allTexts(c.id, lang)) {
          if (t.rotated) continue;
          const b = textExtent(t);
          expect(b.x0, `${c.id}: "${t.content}"`).toBeGreaterThan(8.5);
          expect(b.x1, `${c.id}: "${t.content}"`).toBeLessThan(411.5);
          expect(b.y0, `${c.id}: "${t.content}"`).toBeGreaterThan(8.5);
          expect(b.y1, `${c.id}: "${t.content}"`).toBeLessThan(288.5);
        }
      });
    }
  }

  it('writes both languages with the same level of detail (about as many texts)', () => {
    for (const c of CONTRACT) {
      const fr = textsOf(c.id, 'fr');
      const en = textsOf(c.id, 'en');
      expect(Math.abs(fr.length - en.length) / Math.max(fr.length, en.length), c.id).toBeLessThan(0.12);
      // a French drawing has French words: a good share of the texts differ from the English ones
      const same = fr.filter((t, i) => t === en[i]).length / fr.length;
      expect(same, c.id).toBeLessThan(0.75);
    }
  });

  it('keeps the texts from piling up on each other (estimated boxes, a rotated or tiny text is left out)', () => {
    const offenders: string[] = [];
    for (const c of CONTRACT) {
      for (const lang of LANGS) {
        const boxes = allTexts(c.id, lang)
          .filter((t) => !t.rotated && t.content.trim().length > 1)
          .map((t) => ({ t, b: textExtent(t) }));
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i] as (typeof boxes)[0];
            const b = boxes[j] as (typeof boxes)[0];
            const w = Math.min(a.b.x1, b.b.x1) - Math.max(a.b.x0, b.b.x0);
            const h = Math.min(a.b.y1, b.b.y1) - Math.max(a.b.y0, b.b.y0);
            if (w <= 0.3 || h <= 0.3) continue;
            const area = Math.min((a.b.x1 - a.b.x0) * (a.b.y1 - a.b.y0), (b.b.x1 - b.b.x0) * (b.b.y1 - b.b.y0));
            if ((w * h) / area > 0.3) offenders.push(`${c.number} ${lang}: "${a.t.content}" × "${b.t.content}"`);
          }
        }
      }
    }
    expect(offenders, offenders.slice(0, 12).join('\n')).toEqual([]);
  });
});

describe('the charts carry the model, not typed numbers', () => {
  const sim = new RamSim('valve-1');

  it('draws a series at the data coordinates of its chart (clipped to the box)', () => {
    installFakeDom();
    const d = new Drawing();
    const c = new Chart(d.paper(), { x: 20, y: 30, w: 100, h: 50 }, { min: 0, max: 10 }, { min: 0, max: 100 });
    c.line([
      [0, 0],
      [5, 50],
      [10, 150],
    ]);
    const poly = root(d)
      .all()
      .filter((e) => e.tag === 'polyline')
      .pop() as FakeElement;
    const pts = (poly.getAttribute('points') as string)
      .split(' ')
      .map((q) => q.split(',').map(Number) as [number, number]);
    expect(pts[0]).toEqual([20, 80]);
    expect(pts[1]).toEqual([70, 55]);
    // the third point is above the box: the line stops on its upper edge, at x = 5 + 5 × (100 − 50)/(150 − 50)
    expect(pts[2]?.[1]).toBeCloseTo(30, 6);
    expect(pts[2]?.[0]).toBeCloseTo(c.X(7.5), 6);
  });

  it('computes the three valves of the video with RamSim: 17 L/min, 500 L/day, 109 strokes/min, 10 h', () => {
    const runs = valveRuns();
    expect(runs.map((r) => r.valve)).toEqual([3, 2, 1]);
    for (const r of runs) {
      const p = presetParams(r.preset);
      const m = sim.sweep({ valve: p.valve, stroke: p.stroke, counterweight: p.counterweight });
      expect(r.means.driveFlow).toBeCloseTo(m.driveFlow, 9);
      expect(r.perDay).toBeCloseTo(m.deliveredFlow * 1440, 6);
    }
    const [v3, , v1] = runs as [(typeof runs)[0], (typeof runs)[0], (typeof runs)[0]];
    expect(v3.means.driveFlow).toBeGreaterThan(15);
    expect(v3.means.driveFlow).toBeLessThan(19);
    expect(v1.perDay).toBeGreaterThan(400);
    expect(v1.perDay).toBeLessThan(600);
    expect(v1.means.strokesPerMin).toBeGreaterThan(100);
    expect(v1.means.strokesPerMin).toBeLessThan(121);
    expect(v3.hoursToEmpty).toBeGreaterThan(8);
    expect(v3.hoursToEmpty).toBeLessThan(12);
    expect(v1.hoursToEmpty).toBe(Infinity);
  });

  it('computes the delivery against the head, the counterweight and the stroke point by point', () => {
    const head = sweepHead();
    expect(head.map((q) => q.x)).toEqual(HEAD_GRID);
    for (const q of [head[0], head[10], head[head.length - 1]] as (typeof head)[0][]) {
      expect(q.perDay).toBeCloseTo(sim.sweep({ deliveryHead: q.x }).deliveredFlow * 1440, 6);
      // K14: the delivery never exceeds the bound q ≤ Q·h/H at the same drive flow
      expect(q.perDay).toBeLessThanOrEqual(q.bound + 1e-6);
    }
    const atSite = head.find((q) => q.x === SITE.deliveryHead);
    expect(atSite?.perDay).toBeCloseTo(valveRuns()[2]?.perDay ?? -1, 6);
    const w = sweepWeight();
    expect(w.map((q) => q.x)).toEqual(WEIGHT_GRID);
    expect(w[8]?.means.driveFlow).toBeCloseTo(sim.sweep({ counterweight: w[8]?.x }).driveFlow, 9);
    const st = sweepStroke();
    expect(st.map((q) => q.x)).toEqual(STROKE_GRID);
    expect(st[5]?.perDay).toBeCloseTo(sim.sweep({ stroke: st[5]?.x }).deliveredFlow * 1440, 6);
    // the edges of the working range come from the model: nothing is delivered beyond them
    const lim = workingLimits();
    expect(sim.sweep({ counterweight: lim.weightFloor - 5 }).deliveredFlow).toBe(0);
    expect(sim.sweep({ stroke: lim.strokeFloor - 0.05 }).deliveredFlow).toBe(0);
    expect(sim.sweep({ deliveryHead: lim.headCeiling + 1 }).deliveredFlow).toBeLessThan(1e-6);
    expect(sim.sweep({ counterweight: lim.weightCeiling + 5 }).valveStaysOpen).toBe(true);
  });

  it('draws the whole stroke trace of the model on the cycle sheet (every sample of strokeTrace)', () => {
    const t = stroke1();
    const ref = sim.strokeTrace();
    expect(t.t.length).toBe(ref?.t.length);
    expect(t.pressure).toEqual(ref?.pressure);
    expect(t.velocity).toEqual(ref?.velocity);
    for (const lang of LANGS) {
      const polys = (rendered.get(key('cycle-diagram', lang)) as FakeElement).all().filter((e) => e.tag === 'polyline');
      const n = polys.filter((e) => (e.getAttribute('points') ?? '').split(' ').length >= t.t.length - 2).length;
      // pressure, velocity and valve opening: three traces of one sample per point
      expect(n, lang).toBeGreaterThanOrEqual(3);
    }
    // the four phases tile the stroke
    expect(t.length.reduce((a, b) => a + b, 0)).toBeCloseTo(t.period, 0);
  });

  it('draws the four instants of the cycle where the simulation freezes them (RamSim.holdPhase), and its phase shares', () => {
    const fr = textsOf('cycle-diagram', 'fr');
    const num = (t: string, re: RegExp): number =>
      Number((re.exec(t)?.[1] ?? 'NaN').replace(',', '.').replace('−', '-'));
    const ps = fr.filter((t) => /^p = /.test(t));
    const vs = fr.filter((t) => /^v = /.test(t));
    const zs = fr.filter((t) => /^clapet \d+ %$/.test(t));
    expect([ps.length, vs.length, zs.length]).toEqual([4, 4, 4]);
    (['accel', 'close', 'deliver', 'recoil'] as const).forEach((phase, k) => {
      const s = new RamSim('valve-1');
      expect(s.holdPhase(phase), phase).toBe(true);
      const st = s.state;
      expect(Math.abs(num(ps[k] as string, /p = (\S+) bar/) - st.bodyPressure), `${phase} p`).toBeLessThan(0.051);
      expect(Math.abs(num(vs[k] as string, /v = (\S+) m/) - st.driveVelocity), `${phase} v`).toBeLessThan(0.0051);
      expect(Math.abs(num(zs[k] as string, /clapet (\d+)/) - 100 * st.wasteValve), `${phase} valve`).toBeLessThan(0.51);
    });
    // the duration and the share of each phase are the engine's (physics.md §8: 265, 61, 19, 203 ms; 3.5 % for the delivery)
    const m = valveRuns()[2]?.means as (typeof valveRuns extends () => (infer R)[] ? R : never)['means'];
    const durations = fr.filter((t) => /^durée \d+ ms · /.test(t));
    expect(durations.length).toBe(4);
    m.phaseShare.forEach((share, k) => {
      expect(durations[k], `phase ${k}`).toContain(`${Math.round((share * 60000) / m.strokesPerMin)} ms`);
    });
    expect(durations[2]).toContain('3,5 %');
  });

  it('finds the peak of the delivery against the weight to the nearest 10 g, as a scan of the model would', () => {
    const peak = weightOptimum();
    expect(peak.weight % 10).toBe(0);
    const at = (g: number): number => sim.sweep({ counterweight: g }).deliveredFlow * 1440;
    expect(peak.perDay).toBeCloseTo(at(peak.weight), 9);
    // no weight on a 5 g scan around it delivers more than 1 L/day above it, and the peak is above the 50 g grid's best
    for (let g = peak.weight - 60; g <= peak.weight + 60; g += 5) expect(at(g)).toBeLessThanOrEqual(peak.perDay + 1);
    expect(peak.perDay).toBeGreaterThanOrEqual(Math.max(...sweepWeight().map((q) => q.perDay)) - 1e-6);
  });

  it('writes the model numbers on the sheets (Joukowsky, the flows of valve n°1, the table, the example)', () => {
    const s = sim.state;
    const has = (id: string, lang: Lang, needle: string) => textsOf(id, lang).some((x) => x.includes(needle));
    for (const lang of LANGS) {
      expect(has('cycle-diagram', lang, tl(nf(s.surgeBar, 1), lang)), `${lang} surge`).toBe(true);
      expect(has('cycle-diagram', lang, tl(nf(s.surgeNeededBar, 1), lang)), `${lang} needed`).toBe(true);
      const v1 = valveRuns()[2] as typeof valveRuns extends () => (infer R)[] ? R : never;
      expect(has('principle-diagram', lang, tl(nf(v1.means.driveFlow, 1), lang)), `${lang} Q`).toBe(true);
      expect(has('principle-diagram', lang, tl(nf(v1.means.deliveredFlow, 2), lang)), `${lang} q`).toBe(true);
      for (const size of PIPE_SIZES)
        expect(has('sizing-table', lang, tl(nf(size.minSourceLpm, 1), lang)), `${lang} ${size.id}`).toBe(true);
      const r = sizeRam({
        fall: SITE.fall,
        deliveryHead: SITE.deliveryHead,
        sourceFlow: SITE.sourceFlowLpm,
        pipe: '1',
        driveLength: SITE.driveLength,
      });
      expect(has('sizing-table', lang, tl(nf(r.minSource, 1), lang))).toBe(true);
      expect(
        has(
          'sizing-table',
          lang,
          tl(nf(expectedDelivery(SITE.sourceFlowLpm, SITE.fall, SITE.deliveryHead, 0.6).lpd, 0), lang),
        ),
      ).toBe(true);
    }
  });
});

/** A bilingual number as the string of one language (the sheets draw the resolved text). */
function tl(v: { fr: string; en: string }, lang: Lang): string {
  return v[lang];
}

describe('the site sheets agree with the 3D world and dims.ts', () => {
  it('draws the fall and the head of the video at their levels, and the delivery pipe at the reported 300 m (within 1 %)', () => {
    const n = profileNumbers();
    expect(n.fall).toBe(SITE.fall);
    expect(n.head).toBe(SITE.deliveryHead);
    expect(n.towerInlet).toBe(SITE.deliveryHead);
    expect(Math.abs(n.pipeLength - SITE.deliveryLength)).toBeLessThan(SITE.deliveryLength * 0.01);
    // the pipe ends over the trough of the tower, just above the inlet level
    expect(n.riserTop).toBeGreaterThan(SITE.deliveryHead - 0.1);
    expect(n.riserTop).toBeLessThan(SITE.deliveryHead + 2);
  });

  it('has a drive pipe of 20 m for a 7.5 m fall, and a delivery route that follows DELIVERY_ROUTE with its ten bends', () => {
    const g = siteGeo();
    const slopeLen = Math.hypot(g.drive.elbow.x - g.drive.outlet.x, g.drive.outlet.y - g.drive.elbow.y);
    const total = g.drive.outlet.x - g.drive.start.x + slopeLen + (g.drive.end.x - g.drive.elbow.x);
    expect(total).toBeCloseTo(SITE.driveLength, 6);
    expect(g.drive.start.y - g.drive.end.y).toBeCloseTo(SITE.fall, 9);
    expect(g.bends.length).toBe(DELIVERY_ROUTE.length - 1);
    g.bends.forEach((b, i) => {
      expect(b.x).toBe((DELIVERY_ROUTE[i] as readonly [number, number])[0]);
      expect(b.z).toBe((DELIVERY_ROUTE[i] as readonly [number, number])[1]);
      if (i) expect(b.s).toBeGreaterThan((g.bends[i - 1] as (typeof g.bends)[0]).s);
    });
    // the pipe climbs the whole way (no high point on the profile), from the ram to the tower
    const climb = g.pipe.slice(0, g.riserIndex + 1);
    for (let i = 1; i < climb.length; i++)
      expect((climb[i] as { y: number }).y).toBeGreaterThanOrEqual((climb[i - 1] as { y: number }).y - 0.02);
    expect(Number.isFinite(g.waste.soakaway.x) && Number.isFinite(g.waste.soakaway.z)).toBe(true);
  });

  it('writes h, L, H and the length on the profile, in both languages', () => {
    for (const lang of LANGS) {
      const t = textsOf('site-profile', lang).join(' | ');
      expect(t).toContain(`h = ${tl(nf(SITE.fall, 1), lang)} m`);
      expect(t).toContain(`H = ${tl(nf(SITE.deliveryHead, 0), lang)} m`);
      expect(t).toContain(`L = ${tl(nf(SITE.driveLength, 0), lang)} m`);
    }
  });
});

describe('the contour helper', () => {
  it('chains the crossings of a cone into one closed line of the right radius, and simplifies without losing the ends', () => {
    const grid = sampleGrid((x, z) => 10 - Math.hypot(x, z), -12, 12, -12, 12, 0.5);
    const lines = contourLines(grid, 4);
    expect(lines.length).toBe(1);
    const ring = lines[0] as [number, number][];
    for (const [x, z] of ring) expect(Math.hypot(x, z)).toBeCloseTo(6, 1);
    expect(ring.length).toBeGreaterThan(40);
    const s = simplify(ring, 0.05);
    expect(s.length).toBeLessThan(ring.length);
    expect(s[0]).toEqual(ring[0]);
    expect(s[s.length - 1]).toEqual(ring[ring.length - 1]);
  });
});
