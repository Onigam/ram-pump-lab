import type { LabSim } from '@onigam/lab-kit/ui';
import {
  buildConfig,
  RamCycle,
  recordStroke,
  solveSteady,
  SteadyRun,
  type CycleConfig,
  type CycleSnapshot,
} from './cycle';
import {
  AIR_FRACTION_LOGGED,
  AIR_FRACTION_NOMINAL,
  AIR_TAU_LOSS,
  AIR_TAU_REFILL,
  G,
  joukowsky,
  minClosingVelocity,
  RHO,
  TANK_DRAIN_FLOW,
  toBar,
  toLpm,
  WAVE_SPEED,
} from './physics';
import {
  CYCLE_PHASES,
  PRESET_PACE,
  presetParams,
  RANGES,
  SCENARIO_PACE,
  scenarioSetup,
  START_HOUR,
  type RangedKey,
  type ScheduledEvent,
} from './presets';
import { idleQueue, SolveCache } from './sweep-cache';
import type {
  AlarmKey,
  CyclePhase,
  Means,
  PresetId,
  RamParams,
  RamState,
  ScenarioId,
  StallReason,
  StrokeTrace,
} from './types';

// Real-time simulation of the ram and its water supply, in two time regimes (like the Pelton lab's engine):
//  - the stroke cycle (≈ 1.7 Hz at 100 strokes/min) is integrated in real time, sub-stepped (cycle.ts), and slowed by
//    `slowMo`; it is what the 3D scene animates;
//  - the slow quantities (buffer tank, cumulative and daily volumes, clock, air share of the chamber, stalled/running
//    status) integrate the cycle *averages* × dt × timeScale, so that at ×3600 a day passes in 24 real seconds without
//    simulating 150 000 strokes. The averages come from the same cycle model run to its periodic regime
//    (`solveSteady`), re-solved when the parameters change.

/** Minimum real time between two solves of the cycle averages while the user drags a slider, s. */
const SOLVE_INTERVAL = 0.12;
/** Spacing of the scope samples, s of cycle time, and length kept. */
const SCOPE_DT = 0.004;
const SCOPE_LENGTH = 400;
/** Spacing of the history samples, simulated seconds, and length kept (48 h). */
const HISTORY_DT = 300;
const HISTORY_LENGTH = 576;
/**
 * Above this H/h the ram is flagged as asked too much. It is the model's own cutoff, not a rule of the sources: the n°1
 * valve as calibrated delivers nothing above H/h ≈ 11.4 (86 m at the video's 7.5 m of fall), and the sources give
 * performance for larger ratios (NC State lists ratios up to 100, Practical Action up to 20). Rounded to 12.
 */
const HEAD_RATIO_ALARM = 12;
/**
 * Below this L/h the drive pipe is flagged as too short. The 2.5 is a threshold of the lab, not of a source: the rules of
 * thumb say 3 to 7 times the fall (the sizing calculator warns below 3), and the video's own 2.7 must not carry a
 * permanent alarm (docs/physics.md §7).
 */
const LENGTH_RATIO_ALARM = 2.5;
/** Below this air share the chamber counts as water-logged. */
const WATERLOGGED_AIR = 0.05;
/**
 * Where, inside its phase, the frozen cycle stops. The instants were chosen on the stroke of the n°1 valve (109
 * strokes/min) to show each phase at its most telling moment; the first and the third are fractions of the mean
 * duration of the phase, counted from its first instant:
 *  - accel, 95 %: the end of the acceleration, the valve still wide open, the jet and the velocity at their highest;
 *  - close: the highest body pressure of the phase, with the valve shut (just before the check valve opens, or, when it
 *    cannot open, the peak of the surge ρ·a·v);
 *  - deliver, 50 %: the check valve is open and water is flowing into the air chamber;
 *  - recoil: the waste valve has dropped half way open, the water flows backwards and air is coming in.
 * When the phase ends before its instant (another stroke of the model), the instant is the last one inside the phase.
 */
const HOLD_AT = { accel: 0.95, deliver: 0.5 } as const;
/** Fraction of the stroke of the waste valve at which the recoil instant is taken. */
const HOLD_RECOIL_VALVE = 0.5;

const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

/**
 * Results of the cycle model for other settings (`RamSim.sweep`, `sweepTask`, `strokeTrace`), shared by every simulation
 * and by the sheets of the drawings: the model is deterministic, so a set of settings is solved once (a solve is about
 * 6 ms; the charts ask for hundreds). Bounded: the least recently used results go first.
 */
const MEANS_CACHE = new SolveCache<Means>(1000);
const TRACE_CACHE = new SolveCache<StrokeTrace | null>(24);
/** Solves started ahead of need (`RamSim.prefetch`), a few milliseconds per idle period of the browser. */
const PREFETCH = idleQueue(4);
/** Steps of the cycle model between two looks at the clock while a solve is spread over several frames (≈ 0.15 ms). */
const TASK_SLICE_STEPS = 500;

/** Size and hit counts of the shared result caches (for tests and measurements). */
export function sweepCacheStats(): { means: number; traces: number; hits: number; misses: number } {
  return {
    means: MEANS_CACHE.size,
    traces: TRACE_CACHE.size,
    hits: MEANS_CACHE.hits + TRACE_CACHE.hits,
    misses: MEANS_CACHE.misses + TRACE_CACHE.misses,
  };
}

/** What decides the result of a solve: every setting the cycle model reads, and the air share of the chamber. */
function settingsKey(p: RamParams, air: number): string {
  return [
    p.fall,
    p.driveLength,
    p.driveDiameter,
    p.pipeMaterial,
    p.deliveryHead,
    p.deliveryLength,
    p.valve,
    p.stroke,
    p.counterweight,
    p.chamberVolume,
    p.snifterBlocked ? 1 : 0,
    air,
  ].join('|');
}

/** Cycle averages shared by several readers are read-only. */
function frozen(m: Means): Means {
  Object.freeze(m.phaseShare);
  return Object.freeze(m);
}

/** A solve of the cycle averages that can be done a few milliseconds at a time (`RamSim.sweepTask`). */
export interface SweepTask {
  /** The averages: set at once when the settings were solved before, otherwise once `advance` has returned true. */
  readonly means: Means | null;
  /** Work for about `budgetMs` milliseconds (at least one small slice); true when `means` is ready. */
  advance(budgetMs: number): boolean;
}

/** A fixed-length record of the last strokes: what an oscilloscope on the ram would show. */
export interface Scope {
  /** Seconds of cycle time, increasing. */
  t: number[];
  /** Body pressure, bar gauge. */
  pressure: number[];
  /** Drive pipe velocity, m/s. */
  velocity: number[];
  /** Waste valve opening 0..1. */
  valve: number[];
  /** Phase index at each sample: 0 accel, 1 close, 2 deliver, 3 recoil. */
  phase: number[];
}

/** Slow history sampled every 5 simulated minutes (the last 48 h). */
export interface History {
  /** Simulated hours since the start. */
  hours: number[];
  /** Tank level, % of its volume. */
  tank: number[];
  /** Delivered flow, L/day (instantaneous rate). */
  delivered: number[];
}

function emptyMeans(): Means {
  return {
    strokesPerMin: 0,
    driveFlow: 0,
    wasteFlow: 0,
    deliveredFlow: 0,
    deliveredPerStroke: 0,
    etaD: 0,
    etaR: 0,
    closingVelocity: 0,
    peakPressure: 0,
    minPressure: 0,
    impactSpeed: 0,
    chamberPressure: 0,
    valveStaysOpen: false,
    valveStuckShut: false,
    phaseShare: [1, 0, 0, 0],
  };
}

function emptyState(): RamState {
  return {
    simTime: 0,
    day: 0,
    hour: START_HOUR,
    phase: 'accel',
    strokeCount: 0,
    cycleProgress: 0,
    wasteValve: 1,
    deliveryValve: 0,
    driveVelocity: 0,
    driveFlowNow: 0,
    wasteJetFlow: 0,
    deliveredFlowNow: 0,
    outletFlowNow: 0,
    snifterFlow: 0,
    bodyPressure: 0,
    peakPressure: 0,
    chamberPressure: 0,
    airLevel: AIR_FRACTION_NOMINAL,
    phaseHeld: null,
    phaseTime: 0,
    strokesPerMin: 0,
    driveFlow: 0,
    wasteFlow: 0,
    deliveredFlow: 0,
    deliveredPerDay: 0,
    etaD: 0,
    etaR: 0,
    closingVelocity: 0,
    minClosingVelocity: 0,
    surgeBar: 0,
    waveSpeed: 0,
    surgeNeededBar: 0,
    status: 'running',
    stallReason: 'none',
    tankLitres: 0,
    tankLevel: 1,
    sourceFlow: 0,
    deliveredTotal: 0,
    deliveredToday: 0,
    drivenTotal: 0,
    airFraction: AIR_FRACTION_NOMINAL,
    hoursToEmpty: Infinity,
    gateOpen: true,
    valveHeldShut: false,
    tankDrainOpen: false,
    tankDrainFlow: 0,
    fall: 0,
    driveLength: 0,
    driveDiameter: 0,
    deliveryHead: 0,
    deliveryStaticBar: 0,
    liftRatio: 0,
    lengthRatio: 0,
    stroke: 0,
    valve: 1,
    alarms: [],
  };
}

export class RamSim implements LabSim {
  readonly params: RamParams;
  readonly state: RamState = emptyState();
  /** Last strokes of the cycle, for the panel's oscilloscope. */
  readonly scope: Scope = { t: [], pressure: [], velocity: [], valve: [], phase: [] };
  /** Slow history for the panel's tank chart. */
  readonly history: History = { hours: [], tank: [], delivered: [] };

  private listeners = new Set<() => void>();
  private cycle: RamCycle;
  private means: Means = emptyMeans();
  private dirty = true;
  private sinceSolve = 0;
  private solvedAir = AIR_FRACTION_NOMINAL;
  private airFraction = AIR_FRACTION_NOMINAL;
  private tank = 0;
  private status: 'running' | 'stalled' = 'running';
  private stallReason: StallReason = 'none';
  private events: ScheduledEvent[] = [];
  private lastScope = 0;
  private historyTimer = 0;
  /** Phase the cycle is frozen at, null while it runs. */
  private held: CyclePhase | null = null;
  /** A parameter changed while the cycle was frozen: find the frozen phase again at the next frame. */
  private reseek = false;
  // hand interventions (part actions): not site parameters, they go back to normal at `reset`
  private gateOpen = true;
  private valveHeld = false;
  private drainOpen = false;

  constructor(preset: PresetId = 'valve-1') {
    this.params = presetParams(preset);
    this.cycle = new RamCycle(buildConfig(this.params), AIR_FRACTION_NOMINAL);
    this.reset();
  }

  // ------------------------------------------------------------------ LabSim

  onChange(fn: () => void): void {
    this.listeners.add(fn);
  }

  /** Notify the listeners (UI re-render). */
  emit(): void {
    this.listeners.forEach((fn) => fn());
  }

  /** Change parameters live. Values are clamped to their range; editing the site or the ram makes the preset 'custom'. */
  set(patch: Partial<RamParams>): void {
    const p = this.params;
    const next: Partial<RamParams> = { ...patch };
    for (const key of Object.keys(RANGES) as RangedKey[]) {
      const v = next[key];
      if (typeof v === 'number' && Number.isFinite(v))
        (next as Record<string, number>)[key] = clamp(v, RANGES[key].min, RANGES[key].max);
      else delete next[key];
    }
    if (next.valve !== undefined && ![1, 2, 3].includes(next.valve)) delete next.valve;
    const wasLogged = p.waterLogged;
    Object.assign(p, next);
    const edited = Object.keys(next).some((k) => !['slowMo', 'timeScale', 'running', 'preset'].includes(k));
    if (edited && patch.preset === undefined) p.preset = 'custom';
    // draining the chamber, or recharging it, is an immediate action of the user
    if (p.waterLogged && !wasLogged) this.airFraction = AIR_FRACTION_LOGGED;
    if (!p.waterLogged && wasLogged) this.airFraction = AIR_FRACTION_NOMINAL;
    // any manual change of the supply cancels the pending scripted events on that quantity
    if (edited && patch.preset === undefined) this.events = this.events.filter((e) => !touches(e, next));
    if (edited && this.held) this.reseek = true;
    this.dirty = true;
    this.cycle.setConfig(buildConfig(p));
    this.publish();
    this.emit();
  }

  applyPreset(id: PresetId): void {
    Object.assign(this.params, presetParams(id), {
      slowMo: this.params.slowMo,
      // the story of the n°3 and n°2 valves unfolds over hours: it is played fast enough to be seen, never slower than the
      // visitor chose
      timeScale: Math.max(this.params.timeScale, PRESET_PACE[id] ?? 1),
      running: this.params.running,
    });
    this.events = [];
    this.reset();
  }

  applyScenario(id: ScenarioId): void {
    const { params, events } = scenarioSetup(id);
    Object.assign(this.params, params, {
      slowMo: this.params.slowMo,
      // a scenario that unfolds over hours is played fast enough to be seen, never slower than the visitor chose
      timeScale: Math.max(this.params.timeScale, SCENARIO_PACE[id] ?? 1),
      running: this.params.running,
    });
    this.reset();
    this.events = events.map((e) => ({ ...e, patch: { ...e.patch } }));
  }

  /** Start again from the present parameters: clock, tank, counters and cycle go back to their initial state. */
  reset(): void {
    const p = this.params;
    this.events = [];
    this.status = 'running';
    this.stallReason = 'none';
    this.held = null;
    this.reseek = false;
    this.gateOpen = true;
    this.valveHeld = false;
    this.drainOpen = false;
    this.airFraction = p.waterLogged ? AIR_FRACTION_LOGGED : AIR_FRACTION_NOMINAL;
    this.tank = p.tankVolume;
    const s = this.state;
    s.simTime = 0;
    s.day = 0;
    s.hour = START_HOUR;
    s.deliveredTotal = 0;
    s.deliveredToday = 0;
    s.drivenTotal = 0;
    this.cycle = new RamCycle(buildConfig(p), this.airFraction);
    this.cycle.strokeCount = 0;
    this.scope.t.length =
      this.scope.pressure.length =
      this.scope.velocity.length =
      this.scope.valve.length =
      this.scope.phase.length =
        0;
    this.history.hours.length = this.history.tank.length = this.history.delivered.length = 0;
    this.lastScope = 0;
    this.historyTimer = 0;
    this.solve();
    this.pushHistory();
    this.publish();
    this.emit();
  }

  /**
   * Manual restart of a stopped ram (in the video, the ram had to be restarted by hand). Returns false when there
   * is no water left in the buffer tank to prime it with.
   */
  restart(): boolean {
    if (this.status === 'running') return true;
    if (!this.gateOpen || this.tank < 1) return false;
    this.valveHeld = false; // the hand that held the waste valve lets go
    this.startAgain();
    this.publish();
    this.emit();
    return true;
  }

  /** The ram runs again from rest (the waste valve open on its stop, the drive pipe full). */
  private startAgain(): void {
    this.status = 'running';
    this.stallReason = 'none';
    this.cycle.rest();
    this.cycle.strokeCount = 0;
    this.dirty = true;
    this.solve();
    if (this.held) this.reseek = true;
  }

  // ------------------------------------------------------------------ hand interventions (part actions)

  /** What the hands are doing now. */
  get hands(): { gateOpen: boolean; valveHeldShut: boolean; tankDrainOpen: boolean } {
    return { gateOpen: this.gateOpen, valveHeldShut: this.valveHeld, tankDrainOpen: this.drainOpen };
  }

  /**
   * Close or open the gate valve at the start of the drive pipe (`drive-gate-valve`). Closed: the water stops, the ram
   * stops (stall reason `gate`) and the tank refills. Opened again: the ram starts by itself (ASSUMPTION: the pipe has
   * drained through the open waste valve and the snifter, so the valve hangs open and nothing holds it shut).
   */
  setDriveGate(open: boolean): void {
    this.gateOpen = open;
    this.applyHands();
  }

  /**
   * Hold the waste valve shut with a hand (`waste-valve`), or let go. Held: the column stops, the pressure falls back to
   * the static head, the ram is stopped (stall reason `hand`). Let go: the valve is pushed open once and the ram
   * restarts, as `restart()` does.
   */
  holdValveShut(on: boolean): void {
    this.valveHeld = on;
    this.applyHands();
  }

  /** Open or close the drain of the buffer tank (`tank-drain`): TANK_DRAIN_FLOW leaves the tank while it holds water. */
  setTankDrain(open: boolean): void {
    this.drainOpen = open;
    this.publish();
    this.emit();
  }

  private applyHands(): void {
    if (!this.gateOpen) this.stall('gate');
    else if (this.valveHeld) this.stall('hand');
    else if (this.status === 'stalled' && (this.stallReason === 'gate' || this.stallReason === 'hand'))
      this.startAgain();
    this.publish();
    this.emit();
  }

  // ------------------------------------------------------------------ the cycle, step by step

  /** The phase the cycle is frozen at, or null while it runs. */
  get heldPhase(): CyclePhase | null {
    return this.held;
  }

  /** Does the phase occur at all with the present settings? (No `deliver` when the check valve never opens.) */
  phaseOccurs(phase: CyclePhase): boolean {
    const m = this.means;
    return this.status === 'running' && m.strokesPerMin > 0 && m.phaseShare[CYCLE_PHASES.indexOf(phase)] > 0.002;
  }

  /**
   * Freeze the stroke cycle at a phase, or let it run again (`null`). The cycle is advanced at once, faster than real
   * time, to the instant of the phase described at `HOLD_AT`, and stays there: the 3D scene and the panel then show the
   * valves, flows and pressures of that instant, unchanged from frame to frame. The slow quantities (tank, clock,
   * volumes) keep running. Editing a parameter while frozen finds the phase again with the new settings. Returns false
   * (and the cycle runs) when the ram is stopped or the phase does not occur with these settings.
   */
  holdPhase(phase: CyclePhase | null): boolean {
    if (phase === null) {
      const was = this.held !== null;
      this.held = null;
      this.reseek = false;
      if (was) {
        this.publish();
        this.emit();
      }
      return true;
    }
    if (this.held === phase && !this.reseek) return true;
    if (this.dirty) this.solve();
    this.reseek = false;
    const ok = this.phaseOccurs(phase) && this.seekPhase(phase);
    this.held = ok ? phase : null;
    this.publish();
    this.emit();
    return ok;
  }

  /**
   * Go to the next phase and freeze there (accel → close → deliver → recoil → accel), skipping a phase that does not
   * occur. From a running cycle, the next phase is the one after the phase it is in now. Returns the phase reached.
   */
  stepPhase(): CyclePhase | null {
    if (this.status !== 'running') return null;
    const from = this.held ?? (this.cycle.phase === 'stalled' ? 'accel' : this.cycle.phase);
    const i = CYCLE_PHASES.indexOf(from);
    for (let k = 1; k <= 4; k++) {
      const next = CYCLE_PHASES[(i + k) % 4];
      if (this.phaseOccurs(next) && this.holdPhase(next)) return next;
    }
    return null;
  }

  /** Run the cycle forward to the held instant of a phase (see `HOLD_AT`); false when it is not reached. */
  private seekPhase(target: CyclePhase): boolean {
    const c = this.cycle;
    const m = this.means;
    const period = m.strokesPerMin > 0 ? 60 / m.strokesPerMin : 0;
    const duration = period * m.phaseShare[CYCLE_PHASES.indexOf(target)];
    c.airFraction = this.airFraction;
    const reached = (): boolean => {
      if (target === 'accel') return c.phaseTime >= HOLD_AT.accel * duration;
      if (target === 'deliver') return c.phaseTime >= HOLD_AT.deliver * duration;
      if (target === 'recoil') return c.z >= HOLD_RECOIL_VALVE * c.cfg.stroke;
      return false; // close: the peak pressure is only known once the phase is over
    };
    const h = c.cfg.dtMax;
    const tEnd = c.t + Math.max(1, 2.5 * period);
    // starting inside the phase but past its instant: wait for the next stroke
    let fresh = !(c.phase === target && reached());
    let prev: CycleSnapshot | null = null;
    let peak: CycleSnapshot | null = null;
    let peakP = -Infinity;
    while (c.t < tEnd) {
      prev = c.phase === target && fresh ? c.save() : null;
      c.step(h);
      this.sample(c);
      if (c.phase === target) {
        if (fresh && target === 'close' && c.p > peakP) {
          peakP = c.p;
          peak = c.save();
        }
        if (fresh && reached()) return true;
      } else if (!fresh) {
        fresh = true;
      } else if (prev) {
        // the phase ended before its instant: go back to the best moment inside it
        c.restore(target === 'close' && peak ? peak : prev);
        this.trimScope(c.t);
        return true;
      }
    }
    return false;
  }

  /** One whole stroke of the periodic regime, for the panel's cycle chart; does not touch the live run. */
  strokeTrace(patch: Partial<RamParams> = {}): StrokeTrace | null {
    const p = { ...this.params, ...patch };
    const air = p.waterLogged ? AIR_FRACTION_LOGGED : this.airFraction;
    const key = settingsKey(p, air);
    const known = TRACE_CACHE.get(key); // shared, read-only (null: the valve does not cycle with these settings)
    if (known !== undefined) return known;
    const trace = recordStroke(buildConfig(p), air);
    TRACE_CACHE.set(key, trace);
    return trace;
  }

  // ------------------------------------------------------------------ cycle averages

  /** Recompute the cycle averages for the present parameters now (otherwise `step` does it, at most ~8 times a second). */
  solve(): Means {
    const cfg = buildConfig(this.params);
    this.cycle.setConfig(cfg);
    this.means = solveSteady(cfg, this.airFraction, this.params.deliveryHead);
    this.dirty = false;
    this.sinceSolve = 0;
    this.solvedAir = this.airFraction;
    return this.means;
  }

  /** The cycle averages of the last solve. */
  get averages(): Means {
    return this.means;
  }

  /**
   * Cycle averages for other parameters (sweeps for the charts); does not touch the live simulation. Cached by the
   * settings and the air share of the chamber (see `MEANS_CACHE`): the same question is answered once, for every
   * simulation and every sheet. The result is shared and read-only.
   */
  sweep(patch: Partial<RamParams>): Means {
    const p = { ...this.params, ...patch };
    const air = p.waterLogged ? AIR_FRACTION_LOGGED : this.airFraction;
    const key = settingsKey(p, air);
    const known = MEANS_CACHE.get(key);
    if (known) return known;
    const means = frozen(solveSteady(buildConfig(p), air, p.deliveryHead));
    MEANS_CACHE.set(key, means);
    return means;
  }

  /** Has `sweep(patch)` been solved already (is the answer instant)? */
  isSweepCached(patch: Partial<RamParams>): boolean {
    const p = { ...this.params, ...patch };
    return MEANS_CACHE.has(settingsKey(p, p.waterLogged ? AIR_FRACTION_LOGGED : this.airFraction));
  }

  /**
   * `sweep(patch)` as a task that is advanced a few milliseconds at a time, for a page that must not hold up a frame:
   * the figures are the same as `sweep`'s, to the last digit, and are cached the same way.
   */
  sweepTask(patch: Partial<RamParams>): SweepTask {
    const p = { ...this.params, ...patch };
    const air = p.waterLogged ? AIR_FRACTION_LOGGED : this.airFraction;
    const key = settingsKey(p, air);
    const known = MEANS_CACHE.get(key);
    if (known) return { means: known, advance: () => true };
    const run = new SteadyRun(buildConfig(p), air, p.deliveryHead);
    const task = {
      means: null as Means | null,
      advance(budgetMs: number): boolean {
        if (task.means) return true;
        const start = performance.now();
        do {
          if (run.advance(TASK_SLICE_STEPS)) {
            task.means = frozen(run.means as Means);
            MEANS_CACHE.set(key, task.means);
            return true;
          }
        } while (performance.now() - start < budgetMs);
        return false;
      },
    };
    return task;
  }

  /**
   * Solve these sweeps ahead of need, a few milliseconds at a time while the browser is idle, so that a later
   * `sweep(patch)` (the first visit of a sheet, the opening of the simulation panel) is answered from the cache. Patches
   * already solved cost nothing. The settings are those of the simulation at the time of the call.
   */
  prefetch(patches: readonly Partial<RamParams>[]): void {
    for (const patch of patches) {
      const task = this.sweepTask(patch);
      if (!task.means) PREFETCH.push((budgetMs) => task.advance(budgetMs));
    }
  }

  /** Number of prefetched solves not finished yet. */
  get prefetchPending(): number {
    return PREFETCH.pending;
  }

  /** Configuration of the live cycle (read only). */
  get config(): CycleConfig {
    return this.cycle.cfg;
  }

  // ------------------------------------------------------------------ stepping

  /** Advance by `dtReal` real seconds. */
  step(dtReal: number): void {
    const p = this.params;
    if (this.reseek && this.held) this.reseekNow();
    if (!p.running) return;
    const dt = Math.min(Math.max(dtReal, 0), 0.1);
    this.sinceSolve += dt;
    // the chamber matters through the log of its air volume (it is the ratio to the stroke volume that counts)
    const airMoved = Math.abs(Math.log(this.airFraction / this.solvedAir)) > 0.2;
    if ((this.dirty || airMoved) && this.sinceSolve >= SOLVE_INTERVAL) this.solve();
    if (this.held === null) this.runCycle(dt * p.slowMo); // a frozen cycle stays as it is; the slow quantities go on
    this.advance(dt * p.timeScale);
    this.publish();
  }

  /** A parameter was edited while the cycle was frozen: freeze it again at the same phase with the new settings. */
  private reseekNow(): void {
    const target = this.held;
    this.reseek = false;
    if (!target) return;
    if (this.dirty) this.solve();
    if (this.status === 'running' && !(this.phaseOccurs(target) && this.seekPhase(target))) {
      this.held = null;
      this.emit();
    }
    this.publish();
  }

  private runCycle(dtFast: number): void {
    if (this.status !== 'running' || dtFast <= 0) return;
    const c = this.cycle;
    c.airFraction = this.airFraction;
    const n = Math.max(1, Math.ceil(dtFast / c.cfg.dtMax));
    const h = dtFast / n;
    for (let i = 0; i < n; i++) {
      c.step(h);
      this.sample(c);
    }
  }

  /** Add a sample to the oscilloscope when 4 ms of cycle time have passed since the last one. */
  private sample(c: RamCycle): void {
    if (c.t - this.lastScope < SCOPE_DT) return;
    const sc = this.scope;
    this.lastScope = c.t;
    sc.t.push(c.t);
    sc.pressure.push(toBar(c.p));
    sc.velocity.push(c.v);
    sc.valve.push(c.z / c.cfg.stroke);
    sc.phase.push(c.phase === 'stalled' ? -1 : CYCLE_PHASES.indexOf(c.phase));
    if (sc.t.length > SCOPE_LENGTH) {
      sc.t.shift();
      sc.pressure.shift();
      sc.velocity.shift();
      sc.valve.shift();
      sc.phase.shift();
    }
  }

  /** Drop the oscilloscope samples later than cycle time `t` (the freeze went back by a step). */
  private trimScope(t: number): void {
    const sc = this.scope;
    while (sc.t.length && sc.t[sc.t.length - 1] > t) {
      sc.t.pop();
      sc.pressure.pop();
      sc.velocity.pop();
      sc.valve.pop();
      sc.phase.pop();
    }
    this.lastScope = Math.min(this.lastScope, t);
  }

  /** Integrate the slow quantities over `dtSim` simulated seconds (split at midnights and scripted events). */
  private advance(dtSim: number): void {
    const s = this.state;
    let remaining = dtSim;
    let guard = 0;
    while (remaining > 1e-9 && guard++ < 1000) {
      const abs = START_HOUR * 3600 + s.simTime;
      let chunk = Math.min(remaining, 86400 - (abs % 86400));
      const next = this.events[0];
      if (next && next.at > s.simTime) chunk = Math.min(chunk, next.at - s.simTime);
      this.integrate(chunk);
      remaining -= chunk;
      // scripted events and the day change fire exactly at the end of their chunk
      while (this.events.length && this.events[0].at <= s.simTime + 1e-6) {
        const e = this.events.shift()!;
        Object.assign(this.params, e.patch, { preset: 'custom' });
        this.dirty = true;
        this.cycle.setConfig(buildConfig(this.params));
        this.emit();
      }
      const absNew = START_HOUR * 3600 + s.simTime;
      const day = Math.floor(absNew / 86400) - Math.floor((START_HOUR * 3600) / 86400);
      if (day !== s.day) {
        s.day = day;
        s.deliveredToday = 0;
      }
      s.hour = (absNew / 3600) % 24;
    }
  }

  private integrate(dtSim: number): void {
    const p = this.params;
    const s = this.state;
    const m = this.means;
    const dtMin = dtSim / 60;
    const running = this.status === 'running';
    const drive = running ? m.driveFlow : 0;
    const delivered = running ? m.deliveredFlow : 0;
    s.simTime += dtSim;

    // buffer tank: the spring fills it, the ram empties it; a full tank overflows
    const drain = this.drainOpen ? TANK_DRAIN_FLOW : 0;
    this.tank = clamp(this.tank + (p.sourceFlow - drive - drain) * dtMin, 0, p.tankVolume);
    s.drivenTotal += drive * dtMin;
    s.deliveredTotal += delivered * dtMin;
    s.deliveredToday += delivered * dtMin;

    // the chamber air: topped up by the snifter, lost by dissolution
    const target = p.waterLogged ? AIR_FRACTION_LOGGED : p.snifterBlocked ? 0 : AIR_FRACTION_NOMINAL;
    const tau = p.waterLogged ? 60 : p.snifterBlocked ? AIR_TAU_LOSS : AIR_TAU_REFILL;
    this.airFraction = Math.max(
      AIR_FRACTION_LOGGED,
      this.airFraction + (target - this.airFraction) * (1 - Math.exp(-dtSim / tau)),
    );

    // stalls: the tank ran dry while the ram draws more than the spring gives; or the valve stays shut
    if (running) {
      if (this.tank <= 0 && drive > p.sourceFlow + 1e-9) this.stall('tank');
      else if (m.valveStuckShut) this.stall('stuck');
    }

    this.historyTimer += dtSim;
    while (this.historyTimer >= HISTORY_DT) {
      this.historyTimer -= HISTORY_DT;
      this.pushHistory(s.simTime - this.historyTimer);
    }
  }

  private stall(reason: StallReason): void {
    this.status = 'stalled';
    this.stallReason = reason;
    this.cycle.rest();
    if (reason === 'stuck' || reason === 'hand') this.cycle.z = 0;
  }

  /** Record a history sample stamped at simulated time `t` (s): the values are those of the end of the step. */
  private pushHistory(t: number = this.state.simTime): void {
    const h = this.history;
    h.hours.push(t / 3600);
    h.tank.push((100 * this.tank) / Math.max(1, this.params.tankVolume));
    h.delivered.push(this.status === 'running' ? this.means.deliveredFlow * 1440 : 0);
    if (h.hours.length > HISTORY_LENGTH) {
      h.hours.shift();
      h.tank.shift();
      h.delivered.shift();
    }
  }

  // ------------------------------------------------------------------ published state

  private publish(): void {
    const p = this.params;
    const s = this.state;
    const c = this.cycle;
    const m = this.means;
    const running = this.status === 'running';
    const cfg = c.cfg;

    s.status = this.status;
    s.stallReason = this.stallReason;
    s.phase = running ? c.phase : 'stalled';
    s.strokeCount = c.strokeCount;
    const period = m.strokesPerMin > 0 ? 60 / m.strokesPerMin : 0;
    s.cycleProgress = running && period > 0 ? clamp(c.sinceClosure / period, 0, 1) : 0;
    s.wasteValve = clamp(c.z / cfg.stroke, 0, 1);
    s.deliveryValve = running ? c.deliveryValve : 0;
    s.driveVelocity = running ? c.v : 0;
    s.driveFlowNow = running ? toLpm(c.qDrive) : 0;
    s.wasteJetFlow = running ? toLpm(c.qWaste) : 0;
    s.deliveredFlowNow = running ? toLpm(c.qDeliver) : 0;
    s.outletFlowNow = running ? toLpm(c.qOut) : 0;
    s.snifterFlow = running ? toLpm(c.qSnifter) : 0;
    s.bodyPressure = running ? toBar(c.p) : 0;
    s.peakPressure = running ? toBar(c.lastPeak > 0 ? c.lastPeak : m.peakPressure * 1e5) : 0;
    s.chamberPressure = toBar(c.pa);
    s.airLevel = clamp(c.airVolume() / cfg.chamberVolume, 0, 1);
    s.phaseHeld = running ? this.held : null;
    s.phaseTime = running ? c.phaseTime : 0;

    s.strokesPerMin = running ? m.strokesPerMin : 0;
    s.driveFlow = running ? m.driveFlow : 0;
    s.wasteFlow = running ? m.wasteFlow : 0;
    s.deliveredFlow = running ? m.deliveredFlow : 0;
    s.deliveredPerDay = s.deliveredFlow * 1440;
    s.etaD = running ? m.etaD : 0;
    s.etaR = running ? m.etaR : 0;
    s.closingVelocity = running ? m.closingVelocity : 0;
    s.minClosingVelocity = minClosingVelocity(p.fall, p.deliveryHead, cfg.waveSpeed);
    s.surgeBar = toBar(joukowsky(s.closingVelocity, cfg.waveSpeed));
    s.waveSpeed = cfg.waveSpeed;
    s.surgeNeededBar = toBar(RHO * G * Math.max(0, p.deliveryHead - p.fall));

    s.tankLitres = this.tank;
    s.tankLevel = this.tank / Math.max(1, p.tankVolume);
    s.sourceFlow = p.sourceFlow;
    s.airFraction = this.airFraction;
    s.gateOpen = this.gateOpen;
    s.valveHeldShut = this.valveHeld;
    s.tankDrainOpen = this.drainOpen;
    s.tankDrainFlow = this.drainOpen && this.tank > 0 ? TANK_DRAIN_FLOW : 0;
    const deficit = s.driveFlow - p.sourceFlow + s.tankDrainFlow;
    s.hoursToEmpty = deficit > 1e-9 ? this.tank / deficit / 60 : Infinity;

    s.fall = p.fall;
    s.driveLength = cfg.length;
    s.driveDiameter = p.driveDiameter;
    s.deliveryHead = p.deliveryHead;
    s.deliveryStaticBar = toBar(RHO * G * p.deliveryHead);
    s.liftRatio = p.deliveryHead / p.fall;
    s.lengthRatio = cfg.length / p.fall;
    s.stroke = p.stroke;
    s.valve = p.valve;
    s.alarms = this.alarms();
  }

  private alarms(): AlarmKey[] {
    const p = this.params;
    const s = this.state;
    const m = this.means;
    const out: AlarmKey[] = [];
    if (this.status === 'stalled') out.push(STALL_ALARM[this.stallReason] ?? 'stalledStuck');
    else {
      if (s.driveFlow > p.sourceFlow + 1e-9 && s.tankLevel < 0.5) out.push('tankLow');
      if (m.valveStaysOpen) out.push('valveOpen');
      else if (m.deliveredFlow < 0.01 && m.strokesPerMin > 0) out.push('noDelivery');
    }
    // a pipe too soft: the ram strikes and delivers nothing although a rigid pipe's surge (steel) would have lifted the water
    if (
      this.status === 'running' &&
      m.strokesPerMin > 0 &&
      m.deliveredFlow < 0.01 &&
      m.closingVelocity < s.minClosingVelocity &&
      m.closingVelocity >= minClosingVelocity(p.fall, p.deliveryHead, WAVE_SPEED.steel)
    )
      out.push('softPipe');
    if (s.lengthRatio < LENGTH_RATIO_ALARM) out.push('pipeShort');
    if (s.liftRatio > HEAD_RATIO_ALARM) out.push('headHigh');
    if (this.airFraction < WATERLOGGED_AIR) out.push('waterLogged');
    if (p.snifterBlocked) out.push('snifterBlocked');
    if (this.drainOpen) out.push('drainOpen');
    return out;
  }
}

const STALL_ALARM: Record<StallReason, AlarmKey | undefined> = {
  none: undefined,
  tank: 'stalledTank',
  stuck: 'stalledStuck',
  gate: 'gateClosed',
  hand: 'heldShut',
};

/** Does the scripted event change a quantity that the user has just edited by hand? */
function touches(e: ScheduledEvent, patch: Partial<RamParams>): boolean {
  return Object.keys(e.patch).some((k) => k in patch);
}
