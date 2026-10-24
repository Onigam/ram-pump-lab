import { RamSim } from '../../sim/engine';
import { WAVE_SPEED, joukowsky } from '../../sim/physics';
import {
  CONSUMPTION_VALVE_3,
  SOURCE_FLOW_TODAY,
  TANK_HOURS_VALVE_3,
  presetParams,
  VALVE_SETTINGS,
} from '../../sim/presets';
import type { Means, PresetId, RamParams, StrokeTrace, ValveId } from '../../sim/types';
import { SITE } from '../../three/dims';

// Every number of the hydraulic sheets that is a MODEL RESULT is computed here, at render time, from the simulation
// (RamSim.sweep / strokeTrace, sizing.ts). The functions are pure and deterministic; results are cached because a sheet is
// drawn again at every change of language and a sweep costs ≈ 15 ms. Reported figures (the K-numbers of research.md §2) are
// constants of `REPORTED` below, kept apart so that a sheet can draw them in another style than the model curves.

/** The figures the video and the sources state (research.md §2). Never mixed with model results on a sheet. */
export const REPORTED = {
  /** K1: fall, m. */
  fall: SITE.fall,
  /** K3: delivery head, m. */
  head: SITE.deliveryHead,
  /** K6: flow of the spring today, L/min. */
  springNow: SOURCE_FLOW_TODAY,
  /** K6: two years earlier. */
  springBefore: 10,
  /** K8: consumption of the n°3 valve, an estimate of the author (S1 02:07), L/min. */
  consumptionValve3: CONSUMPTION_VALVE_3,
  /** K8: the buffer tank lasted about this long with the n°3 valve (S1 00:00, 02:07), hours. */
  tankHoursValve3: TANK_HOURS_VALVE_3,
  /** K10: delivery of the n°1 valve, L/day (S1 00:13, 04:43). */
  deliveryValve1: 500,
  /** K11: strokes per minute, old valve (S1 13:40). */
  strokesOld: [70, 80] as const,
  /** K11: strokes per minute, new valve (S1 13:40). */
  strokesNew: [100, 110] as const,
  /** S1 13:13: the delivery stops when the stroke nut is turned in to about this stroke, mm (see the scenario `stroke-nut`). */
  strokeStops: 1.5,
} as const;

/** The three waste valves of the video, in the order of its story: n°3 (as installed), n°2 (the test), n°1 (the new valve). */
export const VALVE_STORY: readonly { preset: PresetId; valve: ValveId }[] = [
  { preset: 'valve-3', valve: 3 },
  { preset: 'valve-2', valve: 2 },
  { preset: 'valve-1', valve: 1 },
];

let sim: RamSim | undefined;
/** One simulation shared by the sheets, at the n°1 preset (the video's site). Never stepped: only `sweep` and `strokeTrace`. */
export function ram(): RamSim {
  sim ??= new RamSim('valve-1');
  return sim;
}

export interface ValveRun {
  preset: PresetId;
  valve: ValveId;
  stroke: number;
  counterweight: number;
  means: Means;
  /** Hours before the buffer tank is empty at the video's site (Infinity when it never empties). */
  hoursToEmpty: number;
  /** Delivered volume per day while it runs, L/day. */
  perDay: number;
}

let runs: ValveRun[] | undefined;
/** The three presets of the video at its site: averages of the stroke model (model results). */
export function valveRuns(): ValveRun[] {
  if (runs) return runs;
  runs = VALVE_STORY.map(({ preset, valve }) => {
    const s = new RamSim(preset);
    const p = presetParams(preset);
    const means = ram().sweep({ valve, stroke: p.stroke, counterweight: p.counterweight });
    return {
      preset,
      valve,
      stroke: VALVE_SETTINGS[valve].stroke,
      counterweight: VALVE_SETTINGS[valve].counterweight,
      means,
      hoursToEmpty: s.state.hoursToEmpty,
      perDay: means.deliveredFlow * 1440,
    };
  });
  return runs;
}

/** The valve run of the n°1 preset (the "after" of the video's story). */
export const valve1 = (): ValveRun => valveRuns().find((r) => r.valve === 1) as ValveRun;

let trace: StrokeTrace | undefined;
/** One stroke of the periodic regime, n°1 valve (model result). */
export function stroke1(): StrokeTrace {
  if (!trace) {
    const t = ram().strokeTrace();
    if (!t) throw new Error('the n°1 valve does not cycle in the model');
    trace = t;
  }
  return trace;
}

export interface SweepPoint {
  x: number;
  means: Means;
  /** Delivered volume per day, L/day. */
  perDay: number;
  /** Upper bound q ≤ Q·h/H (η = 1, K14) with the same drive flow, L/day. */
  bound: number;
}

function sweep(xs: number[], patch: (x: number) => Partial<RamParams>): SweepPoint[] {
  const p = presetParams('valve-1');
  return xs.map((x) => {
    const patched = patch(x);
    const means = ram().sweep(patched);
    const h = patched.fall ?? p.fall;
    const H = patched.deliveryHead ?? p.deliveryHead;
    return { x, means, perDay: means.deliveredFlow * 1440, bound: (means.driveFlow * h * 1440) / H };
  });
}

const range = (a: number, b: number, step: number): number[] => {
  const out: number[] = [];
  for (let x = a; x <= b + 1e-9; x += step) out.push(Math.round(x * 1000) / 1000);
  return out;
};

/** Heads of the delivery chart, m (H/h from 2 to 13.3 at the video's fall). */
export const HEAD_GRID = range(15, 100, 5);
/** Counterweights of the tuning chart, g. */
export const WEIGHT_GRID = range(0, 1000, 50);
/** Strokes of the tuning chart, mm. */
export const STROKE_GRID = range(0.5, 6, 0.25);

let heads: SweepPoint[] | undefined;
let weights: SweepPoint[] | undefined;
let strokes: SweepPoint[] | undefined;
/** Delivery against the delivery head, n°1 valve as tuned in the video (model results). */
export const sweepHead = (): SweepPoint[] => (heads ??= sweep(HEAD_GRID, (H) => ({ deliveryHead: H })));
/** Delivery and consumption against the counterweight, n°1 valve (model results). */
export const sweepWeight = (): SweepPoint[] => (weights ??= sweep(WEIGHT_GRID, (g) => ({ counterweight: g })));
/** Delivery and consumption against the stroke set by the nut, n°1 valve (model results). */
export const sweepStroke = (): SweepPoint[] => (strokes ??= sweep(STROKE_GRID, (s) => ({ stroke: s })));

/** First value x in [lo, hi] where `hot` turns true (it is false at lo and true at hi): bisection on the model, `iters` halvings. */
function boundary(lo: number, hi: number, hot: (x: number) => boolean, iters = 9): number {
  let a = lo;
  let b = hi;
  for (let i = 0; i < iters; i++) {
    const m = (a + b) / 2;
    if (hot(m)) b = m;
    else a = m;
  }
  return (a + b) / 2;
}

let limits: { weightFloor: number; weightCeiling: number; strokeFloor: number; headCeiling: number } | undefined;
/**
 * Edges of the working range of the n°1 valve, found by bisection on `RamSim.sweep` (model results): below `weightFloor` g
 * and `strokeFloor` mm nothing is delivered, above `weightCeiling` g the valve no longer closes, above `headCeiling` m the
 * surge cannot open the check valve any more.
 */
export function workingLimits(): {
  weightFloor: number;
  weightCeiling: number;
  strokeFloor: number;
  headCeiling: number;
} {
  limits ??= {
    weightFloor: boundary(100, 150, (g) => ram().sweep({ counterweight: g }).deliveredFlow > 1e-6),
    weightCeiling: boundary(900, 950, (g) => ram().sweep({ counterweight: g }).valveStaysOpen),
    strokeFloor: boundary(1, 2, (x) => ram().sweep({ stroke: x }).deliveredFlow > 1e-6),
    headCeiling: boundary(75, 95, (H) => ram().sweep({ deliveryHead: H }).deliveredFlow < 1e-6),
  };
  return limits;
}

/** Drive pipe wave speed of the model, m/s (calibrated, physics.ts). */
export const WAVE = WAVE_SPEED.steel;

/** Joukowsky surge ρ·a·v, bar, for a closing velocity v (m/s) in a pipe of wave speed a (m/s). */
export const surgeBar = (v: number, a: number = WAVE): number => joukowsky(v, a) / 1e5;
