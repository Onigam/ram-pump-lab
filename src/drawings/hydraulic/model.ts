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
// (RamSim.sweep / strokeTrace, sizing.ts). The functions are pure and deterministic; results are cached (by the engine for
// each sweep, here for the series built from them) because a sheet is drawn again at every change of language and a sweep
// costs several milliseconds. D09 asks for about a hundred of them: `warmPerformanceData` solves them ahead of need, a
// few milliseconds at a time while the browser is idle, as soon as a sheet is opened. Reported figures (the K-numbers of
// research.md §2) are constants of `REPORTED` below, kept apart so that a sheet can draw them in another style than the
// model curves.

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
  /** K8: consumption of the n°3 valve, an estimate of the author (video 02:07), L/min. */
  consumptionValve3: CONSUMPTION_VALVE_3,
  /** K8: the buffer tank lasted about this long with the n°3 valve (video 00:00, 02:07), hours. */
  tankHoursValve3: TANK_HOURS_VALVE_3,
  /** K10: delivery of the n°1 valve, L/day (video 00:13, 04:43). */
  deliveryValve1: 500,
  /** K11: strokes per minute, old valve (video 13:40). */
  strokesOld: [70, 80] as const,
  /** K11: strokes per minute, new valve (video 13:40). */
  strokesNew: [100, 110] as const,
  /** The delivery stops when the stroke is turned in to about this value, mm (video 13:13 says it stops below some stroke; the value is the model's: scenario `stroke-nut`). */
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

const runCache = new Map<ValveId, ValveRun>();
/** One of the three presets of the video at its site: averages of the stroke model (model result). */
function valveRun({ preset, valve }: (typeof VALVE_STORY)[number]): ValveRun {
  let run = runCache.get(valve);
  if (!run) {
    const s = new RamSim(preset);
    const p = presetParams(preset);
    const means = ram().sweep({ valve, stroke: p.stroke, counterweight: p.counterweight });
    run = {
      preset,
      valve,
      stroke: VALVE_SETTINGS[valve].stroke,
      counterweight: VALVE_SETTINGS[valve].counterweight,
      means,
      hoursToEmpty: s.state.hoursToEmpty,
      perDay: means.deliveredFlow * 1440,
    };
    runCache.set(valve, run);
  }
  return run;
}

/** The three presets of the video at its site: averages of the stroke model (model results). */
export const valveRuns = (): ValveRun[] => VALVE_STORY.map(valveRun);

/** The valve run of the n°1 preset (the "after" of the video's story). */
export const valve1 = (): ValveRun => valveRuns().find((r) => r.valve === 1) as ValveRun;

export interface FrozenInstant {
  /** Body pressure, bar gauge. */
  pressure: number;
  /** Drive pipe velocity, m/s. */
  velocity: number;
  /** Opening of the waste valve, 0 to 1. */
  valve: number;
}

let frozen: FrozenInstant[] | undefined;
/**
 * The four instants of the stroke cycle where the simulation freezes the ram (`RamSim.holdPhase`: acceleration, closing,
 * delivery, recoil), read from a simulation of the n°1 preset (model results): the numbers the panel's step-by-step section
 * shows, so that the sheet and the panel agree to the last digit.
 */
export function frozenInstants(): FrozenInstant[] {
  if (!frozen) {
    const s = new RamSim('valve-1');
    frozen = (['accel', 'close', 'deliver', 'recoil'] as const).map((phase) => {
      s.holdPhase(phase);
      const st = s.state;
      return { pressure: st.bodyPressure, velocity: st.driveVelocity, valve: st.wasteValve };
    });
  }
  return frozen;
}

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

/** Delivery against the head, the weight and the stroke: one sweep per point (the engine answers a repeated one from its cache). */
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
export const WEIGHT_GRID_STEP = 50;
export const WEIGHT_GRID = range(0, 1000, WEIGHT_GRID_STEP);
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

/**
 * First value x in [lo, hi] where `hot` turns true (it is false at lo and true at hi): bisection on the model, `iters`
 * halvings, as a generator that yields before each sweep so that the idle warm-up can stop between two of them.
 */
function* bisect(lo: number, hi: number, hot: (x: number) => boolean, iters: number): Generator<void, number> {
  let a = lo;
  let b = hi;
  for (let i = 0; i < iters; i++) {
    const m = (a + b) / 2;
    yield;
    if (hot(m)) b = m;
    else a = m;
  }
  return (a + b) / 2;
}

/** Run a generator to its end. */
function finish<T>(g: Generator<void, T>): T {
  for (;;) {
    const r = g.next();
    if (r.done) return r.value;
  }
}

export interface WorkingLimits {
  weightFloor: number;
  weightCeiling: number;
  strokeFloor: number;
  headCeiling: number;
}

/**
 * The four bisections that find the edges of the working range. Halvings: 6 on 50 g (under 1 g), 7 on 1 mm (0.008 mm) and
 * 7 on 20 m (0.16 m), enough for what the sheets print (a gram, a tenth of a millimetre, a metre).
 */
function* limitSteps(): Generator<void, WorkingLimits> {
  const weightFloor = yield* bisect(100, 150, (g) => ram().sweep({ counterweight: g }).deliveredFlow > 1e-6, 6);
  const weightCeiling = yield* bisect(900, 950, (g) => ram().sweep({ counterweight: g }).valveStaysOpen, 6);
  const strokeFloor = yield* bisect(1, 2, (x) => ram().sweep({ stroke: x }).deliveredFlow > 1e-6, 7);
  const headCeiling = yield* bisect(75, 95, (H) => ram().sweep({ deliveryHead: H }).deliveredFlow < 1e-6, 7);
  return { weightFloor, weightCeiling, strokeFloor, headCeiling };
}

let limits: WorkingLimits | undefined;
/**
 * Edges of the working range of the n°1 valve, found by bisection on `RamSim.sweep` (model results): below `weightFloor` g
 * and `strokeFloor` mm nothing is delivered, above `weightCeiling` g the valve no longer closes, above `headCeiling` m the
 * surge cannot open the check valve any more.
 */
export function workingLimits(): WorkingLimits {
  limits ??= finish(limitSteps());
  return limits;
}

let optimum: { weight: number; perDay: number } | undefined;
/**
 * Where the delivery curve against the weight peaks, to the nearest 10 g (model result): a golden-section search around the
 * best point of the 50 g grid, then one sweep at the rounded weight so that the value printed is the one the model gives there.
 */
function* optimumSteps(): Generator<void, { weight: number; perDay: number }> {
  const w = sweepWeight();
  const best = w.reduce((m, q) => (q.perDay > m.perDay ? q : m), w[0] as SweepPoint);
  const f = (g: number): number => ram().sweep({ counterweight: g }).deliveredFlow * 1440;
  const phi = (Math.sqrt(5) - 1) / 2;
  let a = Math.max(0, best.x - WEIGHT_GRID_STEP);
  let b = best.x + WEIGHT_GRID_STEP;
  let c = b - phi * (b - a);
  let d = a + phi * (b - a);
  yield;
  let fc = f(c);
  yield;
  let fd = f(d);
  for (let i = 0; i < 6; i++) {
    if (fc > fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - phi * (b - a);
      yield;
      fc = f(c);
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + phi * (b - a);
      yield;
      fd = f(d);
    }
  }
  const weight = Math.round((a + b) / 2 / 10) * 10;
  yield;
  return { weight, perDay: f(weight) };
}

/** The peak of the delivery against the weight, n°1 valve: the weight (nearest 10 g) and the delivery there (model result). */
export function weightOptimum(): { weight: number; perDay: number } {
  optimum ??= finish(optimumSteps());
  return optimum;
}

// ------------------------------------------------------------------------------------------------ idle warm-up

type IdleDeadline = { timeRemaining(): number; didTimeout: boolean };
type IdleRequest = (cb: (deadline: IdleDeadline) => void, opts?: { timeout: number }) => number;
/** One small unit of work (a single sweep): does a bit and says whether the job is finished. */
type Job = () => boolean;

const once =
  (fn: () => void): Job =>
  () => {
    fn();
    return true;
  };
const steps =
  <T>(g: Generator<void, T>, done: (v: T) => void): Job =>
  () => {
    const r = g.next();
    if (r.done) done(r.value);
    return Boolean(r.done);
  };

/** Where there is no `requestIdleCallback` (Safari): one job every 50 ms from a timer. */
const timerIdle: IdleRequest = (cb) =>
  window.setTimeout(() => cb({ timeRemaining: () => 0, didTimeout: true }), 50) as unknown as number;

let warming = false;
/**
 * Solve everything D09 draws ahead of need, one sweep at a time, while the browser is idle (from a timer where it has no
 * idle callback). Nothing happens outside a browser (Node, the tests): the first visit of the sheet then computes it. It is
 * called when a sheet is opened, so that the visitor who flips from the first sheet to the performance charts finds them
 * ready. The results land in the engine's cache, so the series of `sweepHead()` and the others then cost a few lookups.
 */
export function warmPerformanceData(): void {
  const ric: IdleRequest | undefined =
    (globalThis as { requestIdleCallback?: IdleRequest }).requestIdleCallback ??
    (typeof window !== 'undefined' ? timerIdle : undefined);
  if (warming || !ric) return;
  warming = true;
  const jobs: Job[] = [
    // a valve of the story is a sweep and the building of a simulation (≈ 25 ms each): two jobs
    ...VALVE_STORY.flatMap((v) => {
      const p = presetParams(v.preset);
      return [
        once(() => void ram().sweep({ valve: v.valve, stroke: p.stroke, counterweight: p.counterweight })),
        once(() => void valveRun(v)),
      ];
    }),
    ...HEAD_GRID.map((H) => once(() => void ram().sweep({ deliveryHead: H }))),
    ...WEIGHT_GRID.map((g) => once(() => void ram().sweep({ counterweight: g }))),
    ...STROKE_GRID.map((s) => once(() => void ram().sweep({ stroke: s }))),
    steps(limitSteps(), (v) => (limits = v)),
    steps(optimumSteps(), (v) => (optimum = v)),
  ];
  const slice = (deadline: IdleDeadline): void => {
    // a sweep takes several milliseconds: take another one only if the idle period has room for it (a forced call, after the
    // timeout, has none left and still does one, so that the work always moves on)
    do {
      const job = jobs[0];
      if (!job) return;
      if (job()) jobs.shift();
    } while (jobs.length > 0 && deadline.timeRemaining() > 8);
    if (jobs.length > 0) ric(slice, { timeout: 1000 });
  };
  ric(slice, { timeout: 1000 });
}

/** Drive pipe wave speed of the model, m/s (calibrated, physics.ts). */
export const WAVE = WAVE_SPEED.steel;

/** Joukowsky surge ρ·a·v, bar, for a closing velocity v (m/s) in a pipe of wave speed a (m/s). */
export const surgeBar = (v: number, a: number = WAVE): number => joukowsky(v, a) / 1e5;
