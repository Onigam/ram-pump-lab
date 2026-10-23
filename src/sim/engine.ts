import type { LabSim } from '@onigam/lab-kit/ui';
import { buildConfig, RamCycle, solveSteady, type CycleConfig } from './cycle';
import {
  AIR_FRACTION_LOGGED,
  AIR_FRACTION_NOMINAL,
  AIR_TAU_LOSS,
  AIR_TAU_REFILL,
  G,
  joukowsky,
  minClosingVelocity,
  RHO,
  toBar,
  toLpm,
} from './physics';
import { presetParams, RANGES, scenarioSetup, START_HOUR, type RangedKey, type ScheduledEvent } from './presets';
import type { AlarmKey, Means, PresetId, RamParams, RamState, ScenarioId, StallReason } from './types';

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
/** Above this H/h the ram is flagged as asked too much (research §5: H/h > ~12). */
const HEAD_RATIO_ALARM = 12;
/** Below this L/h the drive pipe is flagged as too short (K20: rules of thumb say 3-5; the video's own 2.7 is not flagged). */
const LENGTH_RATIO_ALARM = 2.5;
/** Below this air share the chamber counts as water-logged. */
const WATERLOGGED_AIR = 0.05;

const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

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
  readonly scope: Scope = { t: [], pressure: [], velocity: [], valve: [] };
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
    this.dirty = true;
    this.cycle.setConfig(buildConfig(p));
    this.publish();
    this.emit();
  }

  applyPreset(id: PresetId): void {
    Object.assign(this.params, presetParams(id), {
      slowMo: this.params.slowMo,
      timeScale: this.params.timeScale,
      running: this.params.running,
    });
    this.events = [];
    this.reset();
  }

  applyScenario(id: ScenarioId): void {
    const { params, events } = scenarioSetup(id);
    Object.assign(this.params, params, {
      slowMo: this.params.slowMo,
      timeScale: this.params.timeScale,
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
    this.scope.t.length = this.scope.pressure.length = this.scope.velocity.length = this.scope.valve.length = 0;
    this.history.hours.length = this.history.tank.length = this.history.delivered.length = 0;
    this.lastScope = 0;
    this.historyTimer = 0;
    this.solve();
    this.pushHistory();
    this.publish();
    this.emit();
  }

  /**
   * Manual restart of a stopped ram (the video: "il fallait venir le remettre en marche"). Returns false when there
   * is no water left in the buffer tank to prime it with.
   */
  restart(): boolean {
    if (this.status === 'running') return true;
    if (this.tank < 1) return false;
    this.status = 'running';
    this.stallReason = 'none';
    this.cycle.rest();
    this.cycle.strokeCount = 0;
    this.dirty = true;
    this.solve();
    this.publish();
    this.emit();
    return true;
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

  /** Cycle averages for other parameters (sweeps for the charts); does not touch the live simulation. */
  sweep(patch: Partial<RamParams>): Means {
    const p = { ...this.params, ...patch };
    const air = p.waterLogged ? AIR_FRACTION_LOGGED : this.airFraction;
    return solveSteady(buildConfig(p), air, p.deliveryHead);
  }

  /** Configuration of the live cycle (read only). */
  get config(): CycleConfig {
    return this.cycle.cfg;
  }

  // ------------------------------------------------------------------ stepping

  /** Advance by `dtReal` real seconds. */
  step(dtReal: number): void {
    const p = this.params;
    if (!p.running) return;
    const dt = Math.min(Math.max(dtReal, 0), 0.1);
    this.sinceSolve += dt;
    // the chamber matters through the log of its air volume (it is the ratio to the stroke volume that counts)
    const airMoved = Math.abs(Math.log(this.airFraction / this.solvedAir)) > 0.2;
    if ((this.dirty || airMoved) && this.sinceSolve >= SOLVE_INTERVAL) this.solve();
    this.runCycle(dt * p.slowMo);
    this.advance(dt * p.timeScale);
    this.publish();
  }

  private runCycle(dtFast: number): void {
    if (this.status !== 'running' || dtFast <= 0) return;
    const c = this.cycle;
    c.airFraction = this.airFraction;
    const n = Math.max(1, Math.ceil(dtFast / c.cfg.dtMax));
    const h = dtFast / n;
    const sc = this.scope;
    for (let i = 0; i < n; i++) {
      c.step(h);
      if (c.t - this.lastScope >= SCOPE_DT) {
        this.lastScope = c.t;
        sc.t.push(c.t);
        sc.pressure.push(toBar(c.p));
        sc.velocity.push(c.v);
        sc.valve.push(c.z / c.cfg.stroke);
        if (sc.t.length > SCOPE_LENGTH) {
          sc.t.shift();
          sc.pressure.shift();
          sc.velocity.shift();
          sc.valve.shift();
        }
      }
    }
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
    this.tank = clamp(this.tank + (p.sourceFlow - drive) * dtMin, 0, p.tankVolume);
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
    if (reason === 'stuck') this.cycle.z = 0;
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

    s.tankLitres = this.tank;
    s.tankLevel = this.tank / Math.max(1, p.tankVolume);
    s.sourceFlow = p.sourceFlow;
    s.airFraction = this.airFraction;
    const deficit = s.driveFlow - p.sourceFlow;
    s.hoursToEmpty = running && deficit > 1e-9 ? this.tank / deficit / 60 : Infinity;

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
    if (this.status === 'stalled') out.push(this.stallReason === 'tank' ? 'stalledTank' : 'stalledStuck');
    else {
      if (s.driveFlow > p.sourceFlow + 1e-9 && s.tankLevel < 0.5) out.push('tankLow');
      if (m.valveStaysOpen) out.push('valveOpen');
      else if (m.deliveredFlow < 0.01 && m.strokesPerMin > 0) out.push('noDelivery');
    }
    if (s.lengthRatio < LENGTH_RATIO_ALARM) out.push('pipeShort');
    if (s.liftRatio > HEAD_RATIO_ALARM) out.push('headHigh');
    if (this.airFraction < WATERLOGGED_AIR) out.push('waterLogged');
    if (p.snifterBlocked) out.push('snifterBlocked');
    return out;
  }
}

/** Does the scripted event change a quantity that the user has just edited by hand? */
function touches(e: ScheduledEvent, patch: Partial<RamParams>): boolean {
  return Object.keys(e.patch).some((k) => k in patch);
}
