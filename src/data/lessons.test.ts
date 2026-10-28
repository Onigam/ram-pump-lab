import { describe, expect, it, vi } from 'vitest';
import type { Lesson } from '@onigam/lab-kit/content';
import type { L } from '@onigam/lab-kit/i18n';
import { strL } from '@onigam/lab-kit/i18n';
import '../i18n/ui';
import research from '../../docs/research.md?raw';
import { partIds, WORLDS } from '../part-ids';
import { RamSim } from '../sim/engine';
import { AIR_TAU_LOSS, area, G, RHO, WAVE_SPEED } from '../sim/physics';
import {
  CONSUMPTION_VALVE_3,
  CYCLE_PHASES,
  HEAVY_WEIGHT,
  NUT_INTERVAL,
  presetParams,
  PRESET_IDS,
  SCENARIO_IDS,
  SOURCE_FLOW_BEFORE,
  TANK_HOURS_VALVE_3,
} from '../sim/presets';
import { expectedDelivery, LENGTH_RATIO_S4, PIPE_SIZES, sizeRam, TYPICAL_ETA } from '../sim/sizing';
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

/** Words of a text: the tokens that hold a letter or a digit, with « 5 700 » counted as one number and no bold markers. */
const words = (text: string): number =>
  text
    .replace(/\*\*/g, '')
    .replace(/(\d)[ \u202f\u00a0](?=\d{3}(?!\d))/g, '$1')
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

/** Sentences of a paragraph, ignoring the bold numbered label of a phase (« **1. Accélération.** ») and « No. 1 ». */
const sentenceList = (text: string): string[] =>
  text
    .replace(/^\*\*\d\. [^*]+\.\*\*\s*/, '')
    .replace(/\*\*/g, '')
    .replace(/No\. (\d)/g, 'No\u00a0$1')
    .split(/(?<=[.!?])\s+/)
    .filter((x) => x.trim().length > 0);
const sentences = (text: string): number => sentenceList(text).length;

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

  it('keeps the body to 3–6 paragraphs of at most 60 words and sentences of at most 28, and the summary to one sentence', () => {
    for (const ls of LESSONS) {
      expect(ls.body.length, ls.id).toBeGreaterThanOrEqual(3);
      expect(ls.body.length, ls.id).toBeLessThanOrEqual(6);
      for (const lang of ['fr', 'en'] as const) {
        let total = 0;
        ls.body.forEach((p, i) => {
          const w = words(p[lang]);
          total += w;
          expect(w, `${ls.id} body[${i}] ${lang}: ${w} words`).toBeLessThanOrEqual(60);
          const n = sentences(p[lang]);
          expect(n, `${ls.id} body[${i}] ${lang}`).toBeGreaterThanOrEqual(2);
          expect(n, `${ls.id} body[${i}] ${lang}`).toBeLessThanOrEqual(5);
          for (const sentence of sentenceList(p[lang]))
            expect(words(sentence), `${ls.id} body[${i}] ${lang}: ${sentence}`).toBeLessThanOrEqual(28);
        });
        expect(total, `${ls.id} ${lang}: ${total} words in all`).toBeLessThanOrEqual(330);
        expect(sentences(ls.summary[lang]), `${ls.id} summary ${lang}`).toBe(1);
      }
    }
  });

  it('tells in the first paragraph what to look at in the view the lesson opens (« Regardez… » / « Look at… »)', () => {
    for (const ls of LESSONS) {
      expect(ls.body[0]!.fr, `${ls.id} fr`).toMatch(/\*\*Regardez\*\*/);
      expect(ls.body[0]!.en, `${ls.id} en`).toMatch(/\*\*Look at\*\*/);
      expect(
        ls.body.slice(1).some((p) => /Regardez/.test(p.fr)),
        `${ls.id}: one look-at sentence is enough`,
      ).toBe(false);
    }
  });

  it('gives 2 or 3 figure chips, at most one formula on one line, and no markup in titles, summaries, chips and choices', () => {
    for (const ls of LESSONS) {
      expect(ls.figures?.length ?? 0, ls.id).toBeGreaterThanOrEqual(2);
      expect(ls.figures?.length ?? 0, ls.id).toBeLessThanOrEqual(3);
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
  type Question = NonNullable<Lesson['quiz']>[number];
  const questions: { id: string; q: Question }[] = LESSONS.flatMap((ls) => ls.quiz!.map((q) => ({ id: ls.id, q })));
  /** The questions whose choices are words, not the one-to-four character numbers of a calculation. */
  const textual = questions.filter(({ q }) => Math.max(...q.choices.map((c) => c.en.length)) > 12);

  it('has 2 questions per lesson (3 for the last one), 13 in all, of 3 distinct choices, a valid answer and a short explanation', () => {
    for (const ls of LESSONS) expect(ls.quiz?.length, ls.id).toBe(ls.id === 'siting' ? 3 : 2);
    expect(questions.length).toBe(13);
    for (const { id, q } of questions) {
      expect(q.choices.length, `${id}: ${q.q.en}`).toBe(3);
      expect(Number.isInteger(q.answer), `${id}: ${q.q.en}`).toBe(true);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(3);
      for (const lang of ['fr', 'en'] as const) {
        expect(new Set(q.choices.map((c) => c[lang])).size, `${id}: ${q.q[lang]}`).toBe(3);
        expect(q.explain[lang].length, `${id}: ${q.q[lang]}`).toBeGreaterThan(80);
        // 60 words is the aim, 90 the cap (the facts review adds a sentence to the first question of the valve lesson)
        expect(words(q.explain[lang]), `${id}: ${q.q[lang]}`).toBeLessThanOrEqual(90);
        expect(q.q[lang].trim().endsWith('?') || q.q[lang].trim().endsWith('…'), `${id}: ${q.q[lang]}`).toBe(true);
      }
    }
  });

  it('balances the three choices of a text question to within ±10 % of their mean length, in both languages', () => {
    expect(textual.length).toBeGreaterThanOrEqual(9);
    for (const { id, q } of textual) {
      for (const lang of ['fr', 'en'] as const) {
        const lengths = q.choices.map((c) => c[lang].length);
        const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
        for (const n of lengths)
          expect(Math.abs(n - mean) / mean, `${id}: ${q.q[lang]} (${lengths.join('/')}, ${lang})`).toBeLessThanOrEqual(
            0.1,
          );
      }
    }
  });

  it('puts the right answers in all three positions, and not twice in a row within a lesson', () => {
    const positions = questions.map(({ q }) => q.answer);
    for (const p of [0, 1, 2]) {
      const n = positions.filter((x) => x === p).length;
      expect(n, `position ${p}`).toBeGreaterThanOrEqual(3);
      expect(n, `position ${p}`).toBeLessThanOrEqual(6);
    }
    for (const ls of LESSONS)
      ls.quiz!.slice(1).forEach((q, i) => expect(q.answer, `${ls.id} q${i + 1}`).not.toBe(ls.quiz![i]!.answer));
  });

  it('does not make the right answer the longest one in more than 40 % of the text questions, in either language', () => {
    for (const lang of ['fr', 'en'] as const) {
      const longest = textual.filter(({ q }) => {
        const lengths = q.choices.map((c) => c[lang].length);
        const right = lengths[q.answer]!;
        return lengths.every((n, i) => i === q.answer || n < right);
      }).length;
      expect(longest, `${lang}: ${longest} of ${textual.length}`).toBeLessThanOrEqual(Math.floor(0.4 * textual.length));
    }
  });

  it('asks the four phases in order, the law and potability, anchoring and the finger rule, the last two once each', () => {
    const rightEn = (id: string): string[] => lesson(id).quiz!.map((q) => q.choices[q.answer]!.en);
    const rightFr = (id: string): string[] => lesson(id).quiz!.map((q) => q.choices[q.answer]!.fr);
    // the four phases, in the order of the engine
    expect(rightEn('cycle')).toContain('Acceleration, closing, delivery, recoil');
    expect(rightFr('cycle')).toContain('Accélération, fermeture, refoulement, recul');
    expect(CYCLE_PHASES).toEqual(['accel', 'close', 'deliver', 'recoil']);
    expect(lesson('cycle').quiz!.some((q) => /four phases/.test(q.q.en))).toBe(true);
    // the law (DDT, OFB) and potability
    const law = lesson('siting').quiz!.find((q) => /DDT/.test(q.choices[q.answer]!.fr))!;
    expect(law, 'a question on the law').toBeDefined();
    expect(law.choices[law.answer]!.fr).toMatch(/OFB/);
    expect(law.choices[law.answer]!.fr).toMatch(/qualité de l’eau/);
    expect(law.choices[law.answer]!.en).toMatch(/water quality/);
    // anchoring and the finger rule: one question each, the right choice states it
    const mentions = (re: RegExp) =>
      questions.filter(({ q }) => re.test([q.q.fr, ...q.choices.map((c) => c.fr)].join(' ')));
    const finger = mentions(/doigt/i);
    const anchor = mentions(/ancrage|ancré|boulonné/i);
    expect(
      finger.map((x) => x.id),
      'finger rule',
    ).toEqual(['waste-valve']);
    expect(
      anchor.map((x) => x.id),
      'anchoring',
    ).toEqual(['siting']);
    expect(finger[0]!.q.choices[finger[0]!.q.answer]!.fr).toMatch(/jamais avec les doigts/);
    expect(anchor[0]!.q.choices[anchor[0]!.q.answer]!.fr).toMatch(/boulonné/);
    expect(anchor[0]!.q.choices[anchor[0]!.q.answer]!.fr).toMatch(/rigide/);
    const english = (re: RegExp) =>
      questions.filter(({ q }) => re.test([q.q.en, ...q.choices.map((c) => c.en)].join(' '))).map((x) => x.id);
    expect(english(/finger/i), 'finger rule (en)').toEqual(['waste-valve']);
    expect(english(/anchor|bolted/i), 'anchoring (en)').toEqual(['siting']);
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
  /** The head above which valve n°1 delivers nothing (bisection, m): the model's limit, not a rule of the sources. */
  const zeroHeadExact = (() => {
    let lo = 60;
    let hi = 100;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (sweep({ deliveryHead: mid }).deliveredFlow > 0) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
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
    chamberL: CHAMBER.volumeL,
    airPct: 100 * s1.airFraction,
    liftRatio: SITE.deliveryHead / SITE.fall,
    lenRatio: SITE.driveLength / SITE.fall,
    minLen: calc.minLength,
    ceilingDay: perDay(ceiling),
    ceilingPct: (100 * 500) / perDay(ceiling),
    eta04: 500 / perDay(ceiling),
    minFlow1in: PIPE_SIZES.find((p) => p.id === '1')!.minSourceLpm,
    sourcePct: 100 * calc.sourceRatio,
    calcDay: expectedDelivery(SITE.sourceFlowLpm, SITE.fall, SITE.deliveryHead, 0.6).lpd,
    etaTypical: TYPICAL_ETA,
    etaMax: 0.8,
    headRatioMax: 20, // Practical Action, technical brief, table of performances (facts review F11): a reported figure
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
    deliverShare: 100 * m1.phaseShare[2]!, // the engine: 3.5 % (19 ms)
    ml: m1.deliveredPerStroke,
    takenPerL: m1.driveFlow / m1.deliveredFlow,
    swing: DERIVED.chamberSwingBar,
    etaD: m1.etaD,
    etaR: m1.etaR,
    tauLoss: AIR_TAU_LOSS / 3600,
    surplus1: SITE.sourceFlowLpm - m1.driveFlow,
    margin1Pct: (100 * (SITE.sourceFlowLpm - m1.driveFlow)) / SITE.sourceFlowLpm,
    days6: TANK.volumeL / (m1.driveFlow - 6) / 1440,
    spring6: 6,
    deficit6: m1.driveFlow - 6,
    // stroke and weight
    s3: 3,
    q3: sweep({ stroke: 3 }).driveFlow,
    s22: presetParams('valve-1').stroke,
    s15: 1.5,
    s23: 2.3,
    turns: (RAM.springLimitStroke - RAM.noDeliveryStroke) / (VALVE.rodPitch * 1000),
    w720: HEAVY_WEIGHT,
    q155: heavy.averages.driveFlow,
    d788: perDay(heavy.averages.deliveredFlow),
    hoursHeavy: heavy.state.hoursToEmpty,
    // other scenarios
    wlPerDay: perDay(logged.averages.deliveredFlow),
    wlDropPct: 100 * (1 - logged.averages.deliveredFlow / m1.deliveredFlow),
    loggedHours: NaN, // measured below, by running the blocked snifter
    shortLen: short.params.driveLength,
    shortSpm: short.averages.strokesPerMin,
    etaLong: sweep({ driveLength: LENGTH_RATIO_S4 * SITE.fall }).etaD,
    zeroHead: zeroHeadExact,
    zeroRatio: zeroHeadExact / SITE.fall,
    pvcA: plastic.state.waveSpeed,
    pvcSurge: plastic.state.surgeBar,
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
    eta04: 0.05,
    deliverShare: 0.1,
    etaLong: 0.006,
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

  it('delivers nothing from {zeroHead} m and a little just below it: a limit of the model’s valve No. 1, not a rule', () => {
    expect(sweep({ deliveryHead: 85 }).deliveredFlow).toBeGreaterThan(0);
    expect(sweep({ deliveryHead: 86 }).deliveredFlow).toBe(0);
    expect(calc.warnings).not.toContain('headHigh');
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
          expect(sentence, `${lang}: the tank volume is derived`).toMatch(/déduit|dérivé|derived/);
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
    expect(pvc.fr).toMatch(/non mesurée|pas une mesure/);
    expect(pvc.en).toMatch(/model result/);
    expect(pvc.en).toMatch(/assumed/);
    expect(pvc.en).toMatch(/not measured|not a measurement/);
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
    expect(siting).toMatch(/dérivés des dix heures de la vidéo, pour une source supposée à/);
    expect(siting).toMatch(/derived from the video’s ten hours, for a spring assumed at/);
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
    const plain = (lang: 'fr' | 'en'): string =>
      lesson('sizing')
        .body.map((p) => p[lang].replace(/\*\*/g, ''))
        .join(' ');
    const fr = plain('fr');
    const en = plain('en');
    for (const re of [/5 fois la chute/, /NC State/, /d’Aubuisson/, /Rankine/]) expect(fr).toMatch(re);
    for (const re of [/5 times the fall/, /NC State/, /d’Aubuisson/, /Rankine/]) expect(en).toMatch(re);
    // the model result about the pipe length carries its caveat: the valve is not re-tuned (facts review F14)
    expect(fr).toMatch(/ne réajuste pas le clapet/);
    expect(en).toMatch(/does not re-tune the valve/);
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
    // cycle: the surge ρ·a·v grows with the speed (the lesson says « plus de 7 bar » for 0.87 m/s), and the order of the phases
    expect((RHO * WAVE_SPEED.steel * 0.87) / 1e5).toBeGreaterThan(7);
    expect(CYCLE_PHASES.indexOf('close')).toBeLessThan(CYCLE_PHASES.indexOf('deliver'));
  });
});

describe('lessons: the words of the glossary, and the words that must not reach the visitor', () => {
  const body = (lang: 'fr' | 'en'): string => LESSONS.flatMap((ls) => texts(ls).map(({ v }) => v[lang])).join('\n');

  it('keeps source codes, internal vocabulary and the farm out of the text', () => {
    for (const lang of ['fr', 'en'] as const) {
      const text = body(lang);
      expect(text, lang).not.toMatch(/\bS[1-9]\b|\bK\d{1,2}\b/); // research codes
      expect(text, lang).not.toMatch(/monde|world|\bmodèle 3D\b|\b3D model\b/i);
      expect(text, lang).not.toMatch(lang === 'fr' ? /\b(la|une|de|d’une|cette) ferme\b/i : /\bfarm\b/i); // the farm of another source
      expect(text, lang).not.toMatch(/contrepoids|counterweight/i); // « poids » / "weight"
    }
  });

  it('uses the glossary: the ram pit is a « fosse », the English is British and writes No. 1', () => {
    const fr = body('fr');
    const en = body('en');
    expect(fr).not.toMatch(/\bregard\b/i);
    expect(fr).toMatch(/fosse du bélier/);
    expect(en).toMatch(/ram pit/);
    expect(en).not.toMatch(/n°|\bNo \d/); // « n° » never in English; « No. 1 » always with its full stop
    expect(en).toMatch(/\bNo\. [123]\b/);
    expect(en).not.toMatch(/\b(toward|color|meter|liter|center|gray|pressurized|gauge pressure)\b/i);
    expect(fr).not.toMatch(/n° \d/); // the kit adds the fixed space: « n°1 » in the source
  });

  it('gives no time-speed instruction (the scenarios speed time up by themselves) and names no label of the old interface', () => {
    for (const lang of ['fr', 'en'] as const) {
      const text = body(lang);
      expect(text, lang).not.toMatch(/×600|×3600|réglez le temps|set the time|set the speed/i);
      expect(text, lang).not.toMatch(/P\. du corps|Body P\.|\bConsomme\b|\bUses\b/); // the labels the panel and the strip used to have
      expect(text, lang).not.toMatch(/contrepoids|counterweight/i);
    }
    // what the visitor will see happen is said instead
    expect(lesson('waste-valve').body[0]!.fr).toMatch(/le temps accélère de lui-même/);
    expect(lesson('waste-valve').body[0]!.en).toMatch(/time speeds up by itself/);
    expect(lesson('air-chamber').body[4]!.fr).toMatch(/le temps accélère de lui-même/);
    expect(lesson('siting').body[1]!.fr).toMatch(/montre la réserve se vider/);
    expect(lesson('siting').body[1]!.en).toMatch(/shows the tank emptying/);
  });

  it('quotes the water-logged peak as « plus de 7 bar », never as a figure of its own', () => {
    for (const lang of ['fr', 'en'] as const) {
      const text = body(lang);
      expect(text, lang).toMatch(lang === 'fr' ? /plus de 7 bar/ : /over 7 bar/);
      expect(text, lang).not.toMatch(/7[.,][23] bar/);
    }
  });

  it('defines the terms before they are used: waste valve, tank, efficiency, bar in the first lesson; Joukowsky in the second; d’Aubuisson and Rankine in the fifth', () => {
    const first = lesson('principle').body.map((p) => p.fr);
    const idx = (re: RegExp): number => first.findIndex((p) => re.test(p));
    expect(idx(/\*\*clapet de choc\*\*/), 'clapet de choc defined').toBeGreaterThanOrEqual(0);
    expect(idx(/\*\*réserve\*\* \(/), 'réserve defined').toBe(0);
    expect(idx(/\*\*rendement\*\*/), 'rendement defined').toBeGreaterThanOrEqual(0);
    expect(idx(/\*\*bar\*\*/), 'bar defined').toBeGreaterThanOrEqual(0);
    // each term is bold where it is defined, and is not used in an earlier paragraph of the lesson
    expect(first.slice(0, idx(/\*\*clapet de choc\*\*/)).join(' ')).not.toMatch(/clapet de choc/);
    expect(first.slice(0, idx(/\*\*bar\*\*/)).join(' ')).not.toMatch(/\d bar\b/);
    expect(
      lesson('cycle')
        .body.map((p) => p.fr)
        .join(' '),
    ).toMatch(/\*\*Joukowsky\*\*/);
    const sizing = lesson('sizing').body.map((p) => p.fr);
    expect(sizing.findIndex((p) => /\*\*Aubuisson\*\*/.test(p))).toBeGreaterThanOrEqual(0);
    expect(sizing.findIndex((p) => /\*\*Rankine\*\*/.test(p))).toBeGreaterThanOrEqual(0);
  });

  it('says in the cycle lesson that water slower than a walker gives more than 7 bar, and ends the sizing lesson on what the efficiencies mean', () => {
    expect(lesson('cycle').body[1]!.fr).toMatch(/moins vite qu’un marcheur/);
    expect(lesson('cycle').body[1]!.fr).toMatch(/plus de 7 bar/);
    expect(lesson('cycle').body[1]!.en).toMatch(/slower than a walker/);
    expect(lesson('cycle').body[1]!.en).toMatch(/more than 7 bar/);
    const last = lesson('sizing').body.at(-1)!;
    expect(last.fr).toMatch(/rendement compare des énergies, pas des litres/);
    expect(last.en).toMatch(/efficiency compares energies, not litres/);
  });

  it('keeps the stroke-weight caveat of the valve lesson and the weight claim to what the video says', () => {
    const valve = lesson('waste-valve')
      .body.map((p) => p.fr)
      .join(' ');
    const valveEn = lesson('waste-valve')
      .body.map((p) => p.en)
      .join(' ');
    expect(valve).toMatch(/selon le couple course–poids/);
    expect(valveEn).toMatch(/depending on the stroke–weight pair/);
    expect(valve).toMatch(/Selon la vidéo, il joue un peu/);
    expect(valveEn).toMatch(/The video says it plays a small part/);
    expect(valve).not.toMatch(/plutôt que de chercher|n’a pas trouvé plus d’eau/);
    expect(valveEn).not.toMatch(/rather than look|did not find more water/);
  });
});
