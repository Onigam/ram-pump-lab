import { describe, expect, it, vi } from 'vitest';
import type { Lesson } from '@onigam/lab-kit/content';
import type { L } from '@onigam/lab-kit/i18n';
import { strL } from '@onigam/lab-kit/i18n';
import '../i18n/ui';
import research from '../../docs/research.md?raw';
import { partIds, WORLDS } from '../part-ids';
import { RamSim } from '../sim/engine';
import { area, G, RHO, WAVE_SPEED } from '../sim/physics';
import {
  CONSUMPTION_VALVE_3,
  HEAVY_WEIGHT,
  NUT_INTERVAL,
  presetParams,
  PRESET_IDS,
  SCENARIO_IDS,
  SOURCE_FLOW_BEFORE,
  TANK_HOURS_VALVE_3,
} from '../sim/presets';
import { expectedDelivery, GPM_TO_LPM, PIPE_SIZES, sizeRam } from '../sim/sizing';
import { CHAMBER, SITE, TANK, VALVE } from '../three/dims';
import { LESSON_FIG, LESSONS, USED_FIGURES } from './lessons';
import { DERIVED, MODEL as RAM } from './parts/ram';
import { FIG } from './parts/site';

// Same miniature of the kit's i18n module as in data.test.ts (the built module cannot be resolved by Node outside the
// bundler); the lessons only need `l`, and the interface strings are read through `strL`.
vi.mock('@onigam/lab-kit/i18n', () => {
  const registry = new Map<string, readonly [string, string]>();
  return {
    l: (fr: string, en: string) => ({ fr, en }),
    registerStrings: (dict: Record<string, readonly [string, string]>) => {
      for (const [key, value] of Object.entries(dict)) registry.set(key, value);
    },
    tx: (key: string) => registry.get(key)?.[0] ?? key,
    strL: (key: string) => {
      const entry = registry.get(key);
      return entry ? { fr: entry[0], en: entry[1] } : { fr: key, en: key };
    },
    getLang: () => 'fr',
    colon: () => ' :',
  };
});

// The six lessons (research §11): structure, bilingual parity, the focus each one opens, the quiz, and every figure they
// quote against the engine, the dims and the sources, within the rounding that the text writes.

const VIDEO_SECONDS = 19 * 60 + 57;
const IDS = ['principle', 'cycle', 'waste-valve', 'air-chamber', 'sizing', 'siting'];

/** The focus and video of each lesson, as asked by the contract (frozen ids of src/part-ids.ts). */
const EXPECTED: Record<string, { focus: Lesson['focus']; video: string }> = {
  principle: { focus: { scene: 'site', preset: 'valve-1' }, video: '00:42' },
  cycle: { focus: { scene: 'ram', preset: 'valve-1' }, video: '03:04' },
  'waste-valve': {
    focus: { scene: 'valve', part: 'stroke-nut', preset: 'valve-1', scenario: 'stroke-nut' },
    video: '12:51',
  },
  'air-chamber': {
    focus: { scene: 'ram', part: 'air-chamber', preset: 'valve-1', scenario: 'water-logged' },
    video: '03:26',
  },
  sizing: {
    focus: { scene: 'site', part: 'drive-pipe', preset: 'valve-1', scenario: 'short-pipe' },
    video: '01:55',
  },
  siting: {
    focus: { scene: 'catchment', part: 'tank-shell', preset: 'valve-1', scenario: 'source-drop' },
    video: '02:07',
  },
};

const seconds = (ts: string): number => {
  const [m, s] = ts.split(':').map(Number);
  return (m ?? 0) * 60 + (s ?? 0);
};

/** Sentences of a paragraph, ignoring the bold numbered label of a beat (« **1. Accélération.** »). */
const sentences = (text: string): number =>
  text
    .replace(/^\*\*\d\. [^*]+\.\*\*\s*/, '')
    .split(/[.!?](?:\s|$)/)
    .filter((s) => s.trim().length > 0).length;

/** Numbers of a text, normalised so that the French and English spellings compare equal (same rule as data.test.ts). */
function figures(text: string, lang: 'fr' | 'en'): string[] {
  let t = text.replace(/[−–]/g, '-');
  if (lang === 'fr') t = t.replace(/(\d) (\d{3})(?!\d)/g, '$1$2').replace(/(\d),(\d)/g, '$1.$2');
  else t = t.replace(/(\d),(\d{3})(?!\d)/g, '$1$2');
  return (t.match(/\d+(?:\.\d+)?/g) ?? []).sort();
}

/** Every bilingual text of a lesson, with a label for the failure message and whether it is a long text. */
function texts(ls: Lesson): { label: string; v: L; long: boolean }[] {
  const out: { label: string; v: L; long: boolean }[] = [
    { label: 'title', v: ls.title, long: true },
    { label: 'summary', v: ls.summary, long: true },
  ];
  ls.body.forEach((p, i) => out.push({ label: `body[${i}]`, v: p, long: true }));
  ls.figures?.forEach((f, i) => {
    out.push({ label: `figures[${i}].label`, v: f.label, long: true });
    if (typeof f.value !== 'string') out.push({ label: `figures[${i}].value`, v: f.value, long: false });
  });
  ls.quiz?.forEach((q, i) => {
    out.push({ label: `quiz[${i}].q`, v: q.q, long: true });
    q.choices.forEach((c, j) => out.push({ label: `quiz[${i}].choices[${j}]`, v: c, long: false }));
    out.push({ label: `quiz[${i}].explain`, v: q.explain, long: true });
  });
  return out;
}

const lesson = (id: string): Lesson => {
  const ls = LESSONS.find((x) => x.id === id);
  expect(ls, id).toBeDefined();
  return ls!;
};

describe('lessons: structure', () => {
  it('has the six frozen ids, in order', () => {
    expect(LESSONS.map((x) => x.id)).toEqual(IDS);
  });

  it('has a non-empty French and English text everywhere, different in the two languages for the long texts', () => {
    for (const ls of LESSONS) {
      for (const { label, v, long } of texts(ls)) {
        expect(v.fr.trim().length, `${ls.id}.${label} fr`).toBeGreaterThan(0);
        expect(v.en.trim().length, `${ls.id}.${label} en`).toBeGreaterThan(0);
        if (long) expect(v.fr, `${ls.id}.${label}`).not.toBe(v.en);
      }
    }
  });

  it('keeps the body to 3–5 short paragraphs of 2–3 sentences, and the summary to one sentence', () => {
    for (const ls of LESSONS) {
      expect(ls.body.length, ls.id).toBeGreaterThanOrEqual(3);
      expect(ls.body.length, ls.id).toBeLessThanOrEqual(5);
      ls.body.forEach((p, i) => {
        for (const lang of ['fr', 'en'] as const) {
          const n = sentences(p[lang]);
          expect(n, `${ls.id} body[${i}] ${lang}`).toBeGreaterThanOrEqual(2);
          expect(n, `${ls.id} body[${i}] ${lang}`).toBeLessThanOrEqual(3);
        }
      });
      for (const lang of ['fr', 'en'] as const) expect(sentences(ls.summary[lang]), `${ls.id} summary ${lang}`).toBe(1);
    }
  });

  it('gives 2 to 4 figure chips, at most one formula on one line, and no markup in titles, summaries, chips and choices', () => {
    for (const ls of LESSONS) {
      expect(ls.figures?.length ?? 0, ls.id).toBeGreaterThanOrEqual(2);
      expect(ls.figures?.length ?? 0, ls.id).toBeLessThanOrEqual(4);
      if (ls.formula !== undefined) {
        expect(ls.formula.trim().length, ls.id).toBeGreaterThan(0);
        expect(ls.formula, ls.id).not.toMatch(/\n/);
      }
      for (const { label, v } of texts(ls)) {
        if (label.startsWith('body') || label.endsWith('.q') || label.endsWith('.explain')) continue;
        expect(v.fr + v.en, `${ls.id}.${label}`).not.toMatch(/\*/);
      }
    }
  });

  it('has balanced, well-formed bold markers in the body, the questions and the explanations', () => {
    for (const ls of LESSONS) {
      for (const { label, v } of texts(ls)) {
        if (!(label.startsWith('body') || label.endsWith('.q') || label.endsWith('.explain'))) continue;
        for (const lang of ['fr', 'en'] as const) {
          const text = v[lang];
          expect((text.match(/\*\*/g) ?? []).length % 2, `${ls.id}.${label} ${lang}`).toBe(0);
          expect(text.replace(/\*\*[^*]+\*\*/g, ''), `${ls.id}.${label} ${lang}`).not.toMatch(/\*/);
        }
      }
      // every body paragraph bolds at least one key term, in both languages
      ls.body.forEach((p, i) => {
        if (ls.id === 'cycle' && i === 4) return;
        expect(p.fr, `${ls.id} body[${i}] fr`).toMatch(/\*\*[^*]+\*\*/);
        expect(p.en, `${ls.id} body[${i}] en`).toMatch(/\*\*[^*]+\*\*/);
      });
    }
  });

  it('keeps the same numbers in French and English', () => {
    for (const ls of LESSONS) {
      for (const { label, v } of texts(ls)) {
        expect(figures(v.fr, 'fr'), `${ls.id}.${label}`).toEqual(figures(v.en, 'en'));
      }
    }
  });

  it('follows the typography of the other files (curly apostrophes, « » with spaces, French spaces before : ; ? !)', () => {
    for (const ls of LESSONS) {
      for (const { label, v } of texts(ls)) {
        for (const lang of ['fr', 'en'] as const) {
          const text = v[lang];
          expect(text, `${ls.id}.${label} ${lang}`).not.toMatch(/'/);
          expect(text, `${ls.id}.${label} ${lang}`).not.toMatch(/ {2}/);
          expect(text, `${ls.id}.${label} ${lang}`).not.toMatch(/[{}]|undefined|NaN/);
          expect(text, `${ls.id}.${label} ${lang}`).not.toMatch(/todo|tbd|lorem|xxx|placeholder/i);
        }
        expect(v.fr, `${ls.id}.${label}`).not.toMatch(/«\S|\S»|\S[:;?!]/);
        expect(v.en, `${ls.id}.${label}`).not.toMatch(/[«»]|\s[:;?!]/);
      }
    }
  });
});

describe('lessons: focus and video', () => {
  it('opens the world, part, preset and scenario of the contract', () => {
    for (const ls of LESSONS) expect(ls.focus, ls.id).toEqual(EXPECTED[ls.id]!.focus);
  });

  it('only points to ids that exist (world, part of that world, preset, scenario)', () => {
    for (const ls of LESSONS) {
      const { scene, part, preset, scenario } = ls.focus;
      expect(WORLDS as string[], `${ls.id}: scene`).toContain(scene);
      if (part) expect(partIds(scene as (typeof WORLDS)[number]), `${ls.id}: part ${part}`).toContain(part);
      if (preset) expect(PRESET_IDS as string[], `${ls.id}: preset`).toContain(preset);
      if (scenario) expect(SCENARIO_IDS as string[], `${ls.id}: scenario`).toContain(scenario);
    }
  });

  it('gives a timestamp mm:ss within the 19:57 video, the one of the contract', () => {
    for (const ls of LESSONS) {
      expect(ls.video, ls.id).toBe(EXPECTED[ls.id]!.video);
      expect(ls.video, ls.id).toMatch(/^\d{2}:[0-5]\d$/);
      expect(seconds(ls.video!), ls.id).toBeLessThanOrEqual(VIDEO_SECONDS);
    }
  });

  it('names the scenario it opens, and the other one it points to, as the simulation panel calls them', () => {
    // [lesson, ui string key, the text may only quote the part of the name before " ("]
    const names: [string, string][] = [
      ['waste-valve', 'scenarioStrokeNut'],
      ['waste-valve', 'scenarioHeavyWeight'],
      ['waste-valve', 'presetValve3'],
      ['waste-valve', 'presetValve1'],
      ['air-chamber', 'scenarioWaterLogged'],
      ['air-chamber', 'scenarioSnifterBlocked'],
      ['sizing', 'scenarioShortPipe'],
      ['sizing', 'scenarioHighLift'],
      ['sizing', 'secSize'],
      ['siting', 'scenarioSourceDrop'],
      ['siting', 'scenarioPlasticPipe'],
      ['cycle', 'secCycle'],
      ['cycle', 'cycleStep'],
    ];
    for (const [id, key] of names) {
      const ui = strL(key);
      expect(ui.fr, key).not.toBe(key);
      const fr = ui.fr.split(' (')[0]!;
      const en = ui.en.split(' (')[0]!;
      const body = lesson(id).body;
      expect(body.map((p) => p.fr).join(' '), `${id}: « ${fr} »`).toContain(`« ${fr} »`);
      expect(body.map((p) => p.en).join(' '), `${id}: “${en}”`).toContain(`“${en}”`);
    }
  });
});

describe('lessons: quiz', () => {
  it('has exactly 2 questions of 3 distinct choices, a valid answer and an explanation in both languages', () => {
    for (const ls of LESSONS) {
      expect(ls.quiz?.length, ls.id).toBe(2);
      for (const q of ls.quiz!) {
        expect(q.choices.length, `${ls.id}: ${q.q.en}`).toBe(3);
        expect(Number.isInteger(q.answer), `${ls.id}: ${q.q.en}`).toBe(true);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(3);
        expect(new Set(q.choices.map((c) => c.fr)).size, `${ls.id}: ${q.q.en} fr`).toBe(3);
        expect(new Set(q.choices.map((c) => c.en)).size, `${ls.id}: ${q.q.en} en`).toBe(3);
        expect(q.explain.fr.length, `${ls.id}: ${q.q.en}`).toBeGreaterThan(80);
        expect(q.explain.en.length, `${ls.id}: ${q.q.en}`).toBeGreaterThan(80);
        expect(q.q.fr.trim().endsWith('?') || q.q.fr.trim().endsWith('…'), `${ls.id}: ${q.q.fr}`).toBe(true);
        expect(q.q.en.trim().endsWith('?') || q.q.en.trim().endsWith('…'), `${ls.id}: ${q.q.en}`).toBe(true);
      }
    }
  });

  it('puts the right answers in all three positions, and not twice in a row within a lesson', () => {
    const positions = LESSONS.flatMap((ls) => ls.quiz!.map((q) => q.answer));
    for (const p of [0, 1, 2]) {
      const n = positions.filter((x) => x === p).length;
      expect(n, `position ${p}`).toBeGreaterThanOrEqual(3);
      expect(n, `position ${p}`).toBeLessThanOrEqual(5);
    }
    for (const ls of LESSONS) expect(ls.quiz![0]!.answer, ls.id).not.toBe(ls.quiz![1]!.answer);
  });

  it('does not make the right answer the longest one every time', () => {
    for (const lang of ['fr', 'en'] as const) {
      let longest = 0;
      for (const ls of LESSONS) {
        for (const q of ls.quiz!) {
          const lengths = q.choices.map((c) => c[lang].length);
          const right = lengths[q.answer]!;
          if (lengths.every((n, i) => i === q.answer || n < right)) longest++;
        }
      }
      expect(longest, lang).toBeLessThanOrEqual(6);
    }
  });
});

// ---------------------------------------------------------------------------------------------- the figures

/** Run the simulation in real time, in 1/60 s frames. */
function run(sim: RamSim, seconds: number, dt = 1 / 60): void {
  const n = Math.round(seconds / dt);
  for (let i = 0; i < n; i++) sim.step(dt);
}
const scenario = (id: (typeof SCENARIO_IDS)[number]): RamSim => {
  const sim = new RamSim();
  sim.applyScenario(id);
  run(sim, 2);
  return sim;
};
const sweep = (patch: Parameters<RamSim['sweep']>[0]) => new RamSim('valve-1').sweep(patch);
const perDay = (lpm: number): number => lpm * 1440;

describe('lessons: figures against the model, the dims and the sources', () => {
  const v1 = new RamSim('valve-1');
  run(v1, 2);
  const m1 = v1.averages;
  const s1 = v1.state;
  const v3 = new RamSim('valve-3');
  run(v3, 2);
  const m3 = v3.averages;
  const heavy = scenario('heavy-weight');
  const logged = scenario('water-logged');
  const short = scenario('short-pipe');
  const plastic = scenario('plastic-pipe');
  const trace = v1.strokeTrace()!;
  const closingMs = (() => {
    const t = Array.from(trace.t);
    const v = Array.from(trace.valve);
    let from = -1;
    for (let i = 1; i < t.length; i++) {
      if (from < 0 && v[i - 1]! >= 0.9 && v[i]! < 0.9) from = t[i]!;
      if (from >= 0 && v[i]! <= 0.02) return t[i]! - from;
    }
    return NaN;
  })();
  const ceiling = (SITE.sourceFlowLpm * SITE.fall) / SITE.deliveryHead;
  const calc = sizeRam({ fall: SITE.fall, deliveryHead: SITE.deliveryHead, sourceFlow: SITE.sourceFlowLpm, pipe: '1' });
  const surgeNeeded = (RHO * G * (SITE.deliveryHead - SITE.fall)) / 1e5;
  const thrustN = DERIVED.thrustKn * 1000;

  /** The value each placeholder must have, computed from the engine, the dims or the sources (not from the lessons). */
  const ACTUAL: Record<string, number> = {
    // dims.ts and the reported figures
    fall: SITE.fall,
    driveLen: SITE.driveLength,
    lift: SITE.deliveryHead,
    deliveryLen: SITE.deliveryLength,
    source: SITE.sourceFlowLpm,
    sourceBefore: SOURCE_FLOW_BEFORE,
    drawN3: CONSUMPTION_VALVE_3,
    hoursN3: TANK_HOURS_VALVE_3,
    tankL: TANK.volumeL,
    perDay: perDay(m1.deliveredFlow),
    dropPct: (100 * (SOURCE_FLOW_BEFORE - SITE.sourceFlowLpm)) / SOURCE_FLOW_BEFORE,
    deficitN3: CONSUMPTION_VALVE_3 - SITE.sourceFlowLpm,
    staticBarDrive: (RHO * G * SITE.fall) / 1e5,
    staticBarDelivery: (RHO * G * SITE.deliveryHead) / 1e5,
    driveLitres: area(SITE.driveBore) * SITE.driveLength * 1000,
    bore: SITE.driveBore * 1000,
    chamberL: CHAMBER.volumeL,
    airPct: 100 * s1.airFraction,
    liftRatio: SITE.deliveryHead / SITE.fall,
    lenRatio: SITE.driveLength / SITE.fall,
    minLen: calc.minLength,
    ceilingLpm: ceiling,
    ceilingDay: perDay(ceiling),
    ceilingPct: (100 * 500) / perDay(ceiling),
    eta04: 500 / perDay(ceiling),
    etaLow: ((500 / 1440) * SITE.deliveryHead) / (10 * SITE.fall),
    etaHigh: ((500 / 1440) * SITE.deliveryHead) / (5 * SITE.fall),
    minFlow1in: PIPE_SIZES.find((p) => p.id === '1')!.minSourceLpm,
    min34: 2 * GPM_TO_LPM,
    sourcePct: 100 * calc.sourceRatio,
    calcDay: expectedDelivery(SITE.sourceFlowLpm, SITE.fall, SITE.deliveryHead, 0.6).lpd,
    etaTypical: 0.6,
    etaMax: 0.8,
    // the engine, preset valve n°1 (and n°3)
    drive1: m1.driveFlow,
    delivered1: m1.deliveredFlow,
    waste1: m1.wasteFlow,
    wasteStroke1: (m1.wasteFlow * 1000) / m1.strokesPerMin,
    peak1: m1.peakPressure,
    drive3: m3.driveFlow,
    strokes: m1.strokesPerMin,
    slamMs: closingMs,
    vc: s1.closingVelocity,
    waveSteel: s1.waveSpeed,
    surge: s1.surgeBar,
    deliverShare: 100 * m1.phaseShare[2]!,
    ml: m1.deliveredPerStroke,
    takenPerL: m1.driveFlow / m1.deliveredFlow,
    swing: DERIVED.chamberSwingBar,
    etaD: m1.etaD,
    etaR: m1.etaR,
    refillMin: RAM.refillMinutes,
    surplus1: SITE.sourceFlowLpm - m1.driveFlow,
    margin1Pct: (100 * (SITE.sourceFlowLpm - m1.driveFlow)) / SITE.sourceFlowLpm,
    days6: TANK.volumeL / (m1.driveFlow - 6) / 1440,
    spring6: 6,
    deficit6: m1.driveFlow - 6,
    // stroke and weight
    s3: 3,
    q3: sweep({ stroke: 3 }).driveFlow,
    d3: perDay(sweep({ stroke: 3 }).deliveredFlow),
    s22: presetParams('valve-1').stroke,
    s15: 1.5,
    s23: 2.3,
    turns: (RAM.springLimitStroke - RAM.noDeliveryStroke) / (VALVE.rodPitch * 1000),
    w720: HEAVY_WEIGHT,
    spm75: heavy.averages.strokesPerMin,
    q155: heavy.averages.driveFlow,
    d788: perDay(heavy.averages.deliveredFlow),
    hoursHeavy: heavy.state.hoursToEmpty,
    // other scenarios
    wlPerDay: perDay(logged.averages.deliveredFlow),
    wlDropPct: 100 * (1 - logged.averages.deliveredFlow / m1.deliveredFlow),
    loggedHours: NaN, // measured below, by running the blocked snifter
    shortLen: short.params.driveLength,
    shortSpm: short.averages.strokesPerMin,
    shortQ: short.averages.driveFlow,
    zeroHead: 90,
    zeroRatio: 90 / SITE.fall,
    d75: perDay(sweep({ deliveryHead: 75 }).deliveredFlow),
    pvcA: plastic.state.waveSpeed,
    pvcSurge: plastic.state.surgeBar,
    pvcVc: plastic.state.closingVelocity,
    need: surgeNeeded,
    thrustN,
    kg: thrustN / G,
  };

  /** Tolerances wider than the half unit of the last digit shown, when the text rounds to tens or to fifties. */
  const TOL: Record<string, number> = {
    ceilingDay: 5,
    calcDay: 5,
    wlPerDay: 5.5,
    wlDropPct: 1,
    d75: 5,
    thrustN: 5,
    perDay: 5,
    drawN3: 0.1,
    drive3: 0.1,
    etaLow: 0.05,
    etaHigh: 0.05,
    eta04: 0.05,
    slamMs: 1,
  };

  const shown = (key: string): { value: number; tol: number } => {
    const [value, decimals] = { ...FIG, ...LESSON_FIG }[key as keyof typeof FIG] as readonly [number, number];
    return { value, tol: TOL[key] ?? 0.5 * 10 ** -decimals + 1e-9 };
  };

  it('compares every figure that a lesson writes, and uses every figure of its own table', () => {
    for (const key of USED_FIGURES) expect(Object.keys(ACTUAL), `{${key}} has no check`).toContain(key);
    for (const key of Object.keys(LESSON_FIG))
      expect([...USED_FIGURES], `LESSON_FIG.${key} is never used`).toContain(key);
    for (const key of Object.keys(LESSON_FIG))
      expect(Object.keys(FIG), `LESSON_FIG.${key} duplicates FIG`).not.toContain(key);
  });

  it.each(Object.keys(ACTUAL).filter((k) => k !== 'loggedHours'))(
    '{%s} is what the model, the dims or the sources give',
    (key) => {
      const { value, tol } = shown(key);
      expect(Math.abs(value - ACTUAL[key]!), `${key}: text ${value}, actual ${ACTUAL[key]}`).toBeLessThanOrEqual(tol);
    },
  );

  it('{loggedHours}: a blocked snifter water-logs the chamber after about that many simulated hours', () => {
    const sim = new RamSim();
    sim.applyScenario('snifter-blocked');
    sim.set({ timeScale: 3600 });
    let hours = NaN;
    for (let i = 0; i < 40 * 60 && Number.isNaN(hours); i++) {
      sim.step(1 / 60);
      if (sim.state.alarms.includes('waterLogged')) hours = sim.state.simTime / 3600;
    }
    expect(hours).toBeGreaterThan(shown('loggedHours').value - 2);
    expect(hours).toBeLessThan(shown('loggedHours').value + 2);
  });

  it('the stroke range: the delivery stops near s15, the valve takes the whole spring near s23, in between lies one thread', () => {
    const delivered = (stroke: number) => perDay(sweep({ stroke }).deliveredFlow);
    expect(delivered(ACTUAL.s15!), 'delivery at the stop stroke').toBeLessThan(1);
    expect(delivered(ACTUAL.s15! + 0.2), 'delivery a little above').toBeGreaterThan(20);
    expect(Math.abs(sweep({ stroke: ACTUAL.s23! }).driveFlow - SITE.sourceFlowLpm)).toBeLessThan(0.25);
    expect(sweep({ stroke: ACTUAL.s23! + 0.2 }).driveFlow).toBeGreaterThan(SITE.sourceFlowLpm);
    expect(VALVE.rodPitch * 1000).toBe(1);
    expect(NUT_INTERVAL).toBe(10 * 60);
  });

  it('delivers nothing from {zeroHead} m, a little just below, and the other head figures are below the 12 of the calculator', () => {
    expect(sweep({ deliveryHead: 90 }).deliveredFlow).toBe(0);
    expect(sweep({ deliveryHead: 85 }).deliveredFlow).toBeGreaterThan(0);
    expect(calc.warnings).not.toContain('headHigh');
    expect(sizeRam({ fall: SITE.fall, deliveryHead: 91, sourceFlow: 7.5, pipe: '1' }).warnings).toContain('headHigh');
  });

  it('the delivery pipe rule: 5 × the fall is the minimum, the video’s 20 m is only 2.7 × and the 8 m of the scenario is 1.1 ×', () => {
    const video = sizeRam({ fall: SITE.fall, deliveryHead: 65, sourceFlow: 7.5, pipe: '1', driveLength: 20 });
    expect(video.warnings).toContain('lengthShort');
    expect(video.lengthRatio).toBeCloseTo(2.67, 2);
    expect(short.params.driveLength / SITE.fall).toBeCloseTo(1.07, 2);
    expect(short.averages.driveFlow, 'the short pipe takes more than the spring').toBeGreaterThan(SITE.sourceFlowLpm);
    expect(short.averages.etaD).toBeLessThan(m1.etaD);
  });

  it('the source-drop scenario stops the ram after about the ten hours of the video', () => {
    const sim = new RamSim();
    sim.applyScenario('source-drop');
    sim.set({ timeScale: 3600 });
    let hours = NaN;
    for (let i = 0; i < 20 * 60 && Number.isNaN(hours); i++) {
      sim.step(1 / 60);
      if (sim.state.status === 'stalled') hours = sim.state.simTime / 3600;
    }
    expect(hours).toBeGreaterThan(TANK_HOURS_VALVE_3 - 1);
    expect(hours).toBeLessThan(TANK_HOURS_VALVE_3 + 1);
    expect(sim.state.stallReason).toBe('tank');
  });

  it('the PVC scenario: a soft pipe closes at the same speed, its surge is lower than the one the check valve needs', () => {
    expect(plastic.state.waveSpeed).toBe(WAVE_SPEED.pvc);
    expect(plastic.state.surgeBar).toBeLessThan(plastic.state.surgeNeededBar);
    expect(s1.surgeBar).toBeGreaterThan(s1.surgeNeededBar);
    expect(Math.abs(plastic.state.closingVelocity - s1.closingVelocity)).toBeLessThan(0.05);
    expect(plastic.averages.deliveredFlow).toBe(0);
  });

  it('the water-logged scenario: the peak goes over 7 bar, the delivery falls, and the sheets agree', () => {
    expect(logged.averages.peakPressure).toBeGreaterThan(7);
    expect(logged.averages.peakPressure).toBeLessThan(7.5);
    expect(m1.peakPressure).toBeLessThan(7);
    expect(RAM.loggedDeliveryDropPct).toBe(LESSON_FIG.wlDropPct[0]);
    expect(RAM.noDeliveryStroke).toBe(LESSON_FIG.s15[0]);
  });

  it('the heavy-weight scenario takes more than the spring gives, so the tank empties', () => {
    expect(heavy.averages.driveFlow).toBeGreaterThan(2 * SITE.sourceFlowLpm);
    expect(heavy.averages.deliveredFlow).toBeGreaterThan(m1.deliveredFlow);
    expect(heavy.averages.etaD).toBeLessThan(m1.etaD);
    expect(sweep({ counterweight: 1000 }).deliveredFlow).toBe(0);
  });

  it('the closing speed is above the minimum that opens the check valve, with the K15 range', () => {
    expect(s1.closingVelocity).toBeGreaterThan(s1.minClosingVelocity);
    expect(s1.minClosingVelocity).toBeGreaterThan(0.5);
    expect(s1.minClosingVelocity).toBeLessThan(0.7);
    expect(s1.surgeNeededBar).toBeCloseTo(surgeNeeded, 1);
  });

  it('the reported figures are the ones of docs/research.md', () => {
    expect(research).toMatch(/K1 .*\*\*7\.5 m\*\*/);
    expect(research).toMatch(/K2 .*20 m/);
    expect(research).toMatch(/K3 .*65 m/);
    expect(research).toMatch(/K4 .*1 m of fall lifts water 10 m/);
    expect(research).toMatch(/K8 .*17 L\/min.*10 h/);
    expect(research).toMatch(/K10 .*500 L\/day/);
    expect(research).toMatch(/K11 .*70–80.*100–110/);
    expect(research).toMatch(/K14 .*1 250 L\/day/);
    expect(research).toMatch(/K17 .*0\.6, up to 0\.8/);
    expect(research).toMatch(/K21 .*1" → 22\.7 L\/min/);
    expect(research).toMatch(/K20 .*≥ 5 × fall \(S4\), 3–7 × \(S6\)/);
    expect(research).toMatch(/plastic[\s\S]*discouraged in S7/);
  });
});

// ---------------------------------------------------------------------------------------------- the claims

describe('lessons: what they must not claim, and what they must say', () => {
  const all = (lang: 'fr' | 'en'): string[] =>
    LESSONS.flatMap((ls) => texts(ls).map(({ v }) => v[lang])).flatMap((t) => t.split(/(?<=[.!?])\s+/));

  it('never says the video shows the catchment, the snifter, the gauge, the strainer, the valves, the union or the foundation', () => {
    const things =
      /reniflard|snifter|manomètre|gauge|crépine|strainer|captage|catchment|vanne|gate valve|union|massif|foundation|fondation|ancrage|anchor/i;
    const negation = /\bne\b|\bni\b|\bnot\b|\bneither\b|\bno\b|n’en/i;
    for (const lang of ['fr', 'en'] as const) {
      for (const sentence of all(lang)) {
        if (/vidéo|video/i.test(sentence) && things.test(sentence)) {
          expect(sentence, `${lang}: a thing of the lab attributed to the video`).toMatch(negation);
        }
      }
    }
  });

  it('never says the fins turn the valve, and never says the video gives the 5 700 L of the tank', () => {
    for (const lang of ['fr', 'en'] as const) {
      for (const sentence of all(lang)) {
        expect(sentence, lang).not.toMatch(/ailettes|\bfins\b/i);
        if (/5[ ,]700/.test(sentence) && /vidéo|video/i.test(sentence)) {
          expect(sentence, `${lang}: the tank volume is derived`).toMatch(/déduit|derived/);
        }
      }
    }
  });

  it('says the snifter is not in the video, and the PVC result is a model result for an assumed wave speed', () => {
    const chamber = lesson('air-chamber')
      .body.map((p) => p.fr)
      .join(' ');
    const chamberEn = lesson('air-chamber')
      .body.map((p) => p.en)
      .join(' ');
    expect(chamber).toMatch(/La vidéo ne le montre pas/);
    expect(chamberEn).toMatch(/The video does not show it/);
    const pvc = lesson('siting').body.find((p) => /PVC/.test(p.fr))!;
    expect(pvc.fr).toMatch(/résultat du modèle/);
    expect(pvc.fr).toMatch(/supposée/);
    expect(pvc.fr).toMatch(/pas une mesure|non une mesure/);
    expect(pvc.en).toMatch(/model result/);
    expect(pvc.en).toMatch(/assumed/);
    expect(pvc.en).toMatch(/not a measurement/);
  });

  it('says in the lessons that quote them that the 17 L/min is the author’s estimate and the volume of the tank is derived', () => {
    for (const id of ['waste-valve', 'siting']) {
      const fr = lesson(id)
        .body.map((p) => p.fr)
        .join(' ');
      const en = lesson(id)
        .body.map((p) => p.en)
        .join(' ');
      expect(fr, id).toMatch(/estimation/);
      expect(en, id).toMatch(/estimate/);
    }
    const siting = lesson('siting')
      .body.map((p) => p.fr + p.en)
      .join(' ');
    expect(siting).toMatch(/déduite des dix heures de la vidéo/);
    expect(siting).toMatch(/derived from the video’s ten hours/);
  });

  it('carries the safety and legal wording of the rules (rigid pipe, anchored ram, no finger, DDT and OFB, not potable)', () => {
    const fr = lesson('siting')
      .body.map((p) => p.fr)
      .join(' ');
    const en = lesson('siting')
      .body.map((p) => p.en)
      .join(' ');
    for (const re of [
      /rigide/,
      /ancré/,
      /jamais un doigt dans le clapet de choc/i,
      /DDT/,
      /OFB/,
      /pas garantie potable/,
      /pays/,
    ]) {
      expect(fr).toMatch(re);
    }
    for (const re of [
      /rigid/,
      /anchored/,
      /never a finger in the waste valve/i,
      /DDT/,
      /OFB/,
      /not guaranteed potable/,
      /country/,
    ]) {
      expect(en).toMatch(re);
    }
  });

  it('gives the cycle lesson the four beats in order, and says where to click to freeze them', () => {
    const cycle = lesson('cycle');
    const heads = cycle.body.slice(0, 4).map((p) => /^\*\*(\d)\./.exec(p.fr)?.[1]);
    expect(heads).toEqual(['1', '2', '3', '4']);
    expect(cycle.body[4]!.fr).toMatch(/Simulation/);
    expect(cycle.body[4]!.en).toMatch(/Simulation/);
    expect(cycle.formula).toBe('Δp = ρ · a · v');
    expect(cycle.focus.scenario).toBeUndefined();
  });

  it('makes the sizing lesson quote the 5 × rule, the NC State table and both efficiencies', () => {
    const fr = lesson('sizing')
      .body.map((p) => p.fr)
      .join(' ');
    const en = lesson('sizing')
      .body.map((p) => p.en)
      .join(' ');
    for (const re of [/5 fois la chute/, /NC State/, /D’Aubuisson/, /Rankine/]) expect(fr).toMatch(re);
    for (const re of [/5 times the fall/, /NC State/, /D’Aubuisson/, /Rankine/]) expect(en).toMatch(re);
    expect(lesson('sizing').formula).toBe('η = q · H / (Q · h)');
  });
});

describe('lessons: the quiz questions that carry their own numbers', () => {
  const right = (id: string, q: number): string => {
    const item = lesson(id).quiz![q]!;
    return item.choices[item.answer]!.en;
  };
  const wrong = (id: string, q: number): string[] => {
    const item = lesson(id).quiz![q]!;
    return item.choices.filter((_, i) => i !== item.answer).map((c) => c.en);
  };

  it('puts the computed value on the right answer, and the usual mistakes on the wrong ones', () => {
    // principle: the ceiling q = Q·h/H with Q = 10 L/min, h = 4 m, H = 40 m; the whole spring flow would be 10 L/min
    expect(parseFloat(right('principle', 0))).toBeCloseTo((10 * 4) / 40, 9);
    expect(wrong('principle', 0).map(parseFloat)).toContain(10);
    // sizing: at least 5 times a fall of 4 m
    expect(parseFloat(right('sizing', 0))).toBe(5 * 4);
    // sizing: η = q·H/(Q·h) = 0.5 × 50 / (10 × 5); the plain ratio q/Q is 0.05; and no efficiency is above 1
    expect(parseFloat(right('sizing', 1))).toBeCloseTo((0.5 * 50) / (10 * 5), 9);
    expect(wrong('sizing', 1).map(parseFloat)).toContain(0.5 / 10);
    expect(Math.max(...wrong('sizing', 1).map(parseFloat))).toBeGreaterThan(1);
    // cycle: the surge ρ·a·v is proportional to the speed, the kinetic energy to its square
    const surge = (v: number) => RHO * WAVE_SPEED.steel * v;
    expect(surge(2 * 0.87) / surge(0.87)).toBeCloseTo(2, 9);
    expect(right('cycle', 1)).toBe('twice as big');
  });
});
