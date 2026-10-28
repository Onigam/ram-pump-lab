import {
  AIR_FRACTION_LOGGED,
  airCompliance,
  area,
  CD_DELIVERY,
  CD_SNIFTER,
  CD_WASTE,
  DELIVERY_VALVE_AREA_RATIO,
  deliveryDiameter,
  etaDAubuisson,
  etaRankine,
  frictionOf,
  G,
  K_MINOR,
  P_ATM,
  P_VAPOUR,
  POLYTROPIC,
  RHO,
  RHO_AIR,
  ROUGHNESS,
  SNIFTER_CRACK,
  SNIFTER_DIAMETER,
  toBar,
  toLpm,
  VALVES,
  WAVE_SPEED,
} from './physics';
import type { Means, Phase, RamParams, StrokeTrace } from './types';

// The stroke cycle of the ram, integrated in time (SI units inside).
//
// Model: a *lumped-parameter* version of the rigid-column theory, three nodes joined by orifices.
//  1. Drive pipe: a rigid water column of inertance ρL/A (one velocity v), with Darcy friction and minor losses,
//     driven by the fall ρgh.
//  2. Ram body: a node of pressure p whose compliance C_b = A·L/(ρ·a²) is the elasticity of the pipe and the water.
//     Together with the column it forms an LC circuit of characteristic impedance ρ·a/A: when the column is stopped
//     suddenly it produces exactly the Joukowsky surge Δp = ρ·a·v (research K15), then rings and swings below the
//     static pressure: that swing is the *recoil* that lets the waste valve fall open again.
//  3. Air chamber: a node of compliance V_air/(n·p) feeding the delivery pipe through its wave impedance Z = ρ·a/A
//     (what a stroke pulse sees during the first round trip of the pipe) plus the Darcy friction, against the static
//     head ρgH.
//  The waste valve is a poppet of mass m (bare valve + counterweight) on a stroke stop, closed by the pressure of the
//  body acting on its seat area (the "drag exceeds the weight" of research §5). The curtain area π·d·z under it sets
//  the pressure drop, so the valve closes by itself when the flow is fast enough. The check valve is an ideal
//  one-way orifice; the snifter lets air in when the body pressure falls below its cracking pressure.
//  Everything else (stroke rate, drive flow, delivery, efficiency, peaks) is an *outcome* of this circuit.
//
//  Numerics: backward Euler, one scalar monotone equation per step in the body pressure (solved bracketed), so the
//  orifices cannot make it unstable. The step is a fraction of the ring period of the drive pipe.

/** Everything the cycle model needs, in SI. Built from the user parameters by `buildConfig`. */
export interface CycleConfig {
  /** Fall, m. */
  h: number;
  /** Drive pipe length (≥ fall), m. */
  length: number;
  /** Drive pipe inner diameter, m, and section, m². */
  diameter: number;
  areaPipe: number;
  /** Wave speed, m/s; roughness, m. */
  waveSpeed: number;
  roughness: number;
  /** Static pressure of the delivery head at the ram, Pa. */
  pStatic: number;
  /** Delivery pipe: wave impedance Z = ρa/A_d (Pa·s/m³), inner diameter (m), length (m). */
  zLine: number;
  lineDiameter: number;
  lineLength: number;
  /** Waste valve: seat diameter (m), seat area (m²), stroke (m), moving mass (kg). */
  seatDiameter: number;
  seatArea: number;
  stroke: number;
  mass: number;
  /** Delivery check valve flow area, m². */
  deliveryArea: number;
  /** Air chamber volume (m³) and snifter state. */
  chamberVolume: number;
  snifterOk: boolean;
  /** Compliance of the ram body (pipe + water), m³/Pa. */
  bodyCompliance: number;
  /** Sum of the minor loss coefficients of the drive pipe. */
  kMinor: number;
  /** Largest integration step, s. */
  dtMax: number;
}

export function buildConfig(p: RamParams): CycleConfig {
  const valve = VALVES[p.valve];
  const diameter = p.driveDiameter / 1000;
  const areaPipe = area(diameter);
  const waveSpeed = WAVE_SPEED[p.pipeMaterial];
  const length = Math.max(p.driveLength, p.fall * 1.05);
  const lineDiameter = deliveryDiameter(p.driveDiameter);
  // delivery pipe is plastic whatever the drive pipe is: wave speed of HDPE
  const zLine = (RHO * WAVE_SPEED.hdpe) / area(lineDiameter);
  const bodyCompliance = (areaPipe * length) / (RHO * waveSpeed * waveSpeed);
  // ring period of the drive pipe 2πL/a, about 300 steps per period, never above 0.2 ms
  const ring = (2 * Math.PI * length) / waveSpeed;
  return {
    h: p.fall,
    length,
    diameter,
    areaPipe,
    waveSpeed,
    roughness: ROUGHNESS[p.pipeMaterial],
    pStatic: RHO * G * p.deliveryHead,
    zLine,
    lineDiameter,
    lineLength: p.deliveryLength,
    seatDiameter: valve.seat,
    seatArea: area(valve.seat),
    stroke: Math.max(1e-4, p.stroke / 1000),
    mass: valve.bareMass + p.counterweight / 1000,
    deliveryArea: areaPipe * DELIVERY_VALVE_AREA_RATIO,
    chamberVolume: p.chamberVolume / 1000,
    snifterOk: !p.snifterBlocked,
    bodyCompliance,
    kMinor: K_MINOR,
    dtMax: Math.min(2e-4, Math.max(2e-5, ring / 300)),
  };
}

/**
 * Resistance of the delivery pipe seen from the air chamber, Pa·s/m³: its wave impedance Z = ρa/A (what a stroke pulse
 * meets during the first round trip) plus the Darcy friction at the flow `qOut` (m³/s).
 */
export function lineResistance(cfg: CycleConfig, qOut: number): number {
  const d = cfg.lineDiameter;
  const a = area(d);
  const v = Math.max(Math.abs(qOut) / a, 0.01);
  const friction = (frictionOf(v, d, 1.5e-6) * (cfg.lineLength / d) * RHO * v) / (2 * a);
  return cfg.zLine + friction;
}

/** One stroke, closure to closure. Volumes in m³, times in s, pressures in Pa gauge. */
export interface CycleRecord {
  period: number;
  /** Net water taken from the drive pipe, ∫A·v dt. */
  drive: number;
  /** Water through the check valve. */
  delivered: number;
  vMax: number;
  pMax: number;
  pMin: number;
  /** Speed of the valve when it hit the seat, m/s. */
  impact: number;
  /** Time spent in each phase: accel, close, deliver, recoil. */
  phases: [number, number, number, number];
  pChamber: number;
}

/** What `RamCycle.save` returns. */
export interface CycleSnapshot {
  t: number;
  v: number;
  p: number;
  pa: number;
  z: number;
  zd: number;
  cavity: number;
  phase: Phase;
  phaseTime: number;
  airFraction: number;
  strokeCount: number;
  deliveryValve: number;
  qDrive: number;
  qWaste: number;
  qDeliver: number;
  qOut: number;
  qSnifter: number;
  sinceClosure: number;
  lastPeak: number;
  acc: {
    drive: number;
    delivered: number;
    vMax: number;
    pMax: number;
    pMin: number;
    impact: number;
    phases: [number, number, number, number];
    pChamber: number;
    time: number;
  };
  cycles: number;
}

const PHASE_INDEX: Record<string, number> = { accel: 0, close: 1, deliver: 2, recoil: 3 };
const DELIVER_ON = 2e-5; // m³/s: 1.2 L/min through the check valve counts as "delivering"

// Scratch slots of the body-pressure equation (see `RamCycle.r`). The equation is evaluated several times per step by the
// root finder: its inputs and outputs travel through a preallocated Float64Array instead of closure variables, arguments
// and return values, which would each allocate a boxed number (this was most of the garbage of the simulation).
const R_X = 0; // input: the body pressure tried, Pa
const R_F = 1; // output: the residual of the node equation, m³/s
const R_DT = 2;
const R_V0 = 3;
const R_ACCEL0 = 4;
const R_FRIC = 5;
const R_KWASTE = 6;
const R_SNIFTER = 7;
const R_ALPHA = 8;
const R_BETA = 9;
const R_KD2 = 10;
const R_P0 = 11;
const R_VNEW = 12; // output: the column velocity that goes with the pressure tried, m/s
const R_QW = 13; // output: flow out of the waste valve (negative: air in), m³/s
const R_QS = 14; // output: flow through the snifter (negative: air in), m³/s
const R_QD = 15; // output: flow through the delivery check valve, m³/s
const R_ROOT = 16; // output of the root finder, Pa
const R_COUNT = 17;

export class RamCycle {
  cfg: CycleConfig;
  /** Time since the creation of the cycle, s. */
  t = 0;
  /** Velocity of the drive pipe column, m/s (+ towards the ram). */
  v = 0;
  /** Pressure of the ram body, Pa gauge. */
  p = 0;
  // The numbers below start at 0, not undefined: a field declared without a value is first `undefined`, which makes the
  // engine store every later number in it as a new boxed object (one allocation per step) instead of in place.
  /** Pressure of the air chamber, Pa gauge. */
  pa = 0;
  /** Waste valve lift, m (0 = on its seat), and speed, m/s (+ opening). */
  z = 0;
  zd = 0;
  /** Volume of the water-vapour cavity at the body, m³ (column separation). */
  cavity = 0;
  phase: Phase = 'accel';
  /** Time spent in the present phase so far, s (0 at the step that entered it). */
  phaseTime = 0;
  /** Air share of the chamber (fraction of its volume at working pressure). */
  airFraction = 0;
  strokeCount = 0;
  /** Delivery valve opening, 0..1 (visual lag). */
  deliveryValve = 0;
  // instantaneous flows of the last step, m³/s
  qDrive = 0;
  qWaste = 0;
  qDeliver = 0;
  qOut = 0;
  qSnifter = 0;
  /** Scratch numbers of the step (see the R_ slots): reused by every step so that the hot loop allocates nothing. */
  private readonly r = new Float64Array(R_COUNT);
  // running record of the stroke in progress
  private acc = this.newAcc();
  /** Strokes finished so far (last 32 kept). */
  readonly cycles: CycleRecord[] = [];
  /** Time since the last closure, s. */
  sinceClosure = 0;
  /** Highest body pressure of the last finished stroke, Pa. */
  lastPeak = 0;

  constructor(cfg: CycleConfig, airFraction: number) {
    this.cfg = cfg;
    this.airFraction = airFraction;
    this.pa = cfg.pStatic;
    this.z = cfg.stroke;
  }

  /** Swap the parameters while running (live editing). The state carries over. */
  setConfig(cfg: CycleConfig): void {
    const dStatic = cfg.pStatic - this.cfg.pStatic;
    this.cfg = cfg;
    this.pa += dStatic; // the chamber follows the new head through the delivery pipe within seconds; start close
    this.z = Math.min(this.z, cfg.stroke);
  }

  private newAcc() {
    return {
      drive: 0,
      delivered: 0,
      vMax: -Infinity,
      pMax: -Infinity,
      pMin: Infinity,
      impact: 0,
      phases: [0, 0, 0, 0] as [number, number, number, number],
      pChamber: 0,
      time: 0,
    };
  }

  /** Reset the dynamic state to the standstill before the first stroke (valve open on its stop, pipe full). */
  rest(): void {
    this.v = 0;
    this.p = 0;
    this.pa = this.cfg.pStatic;
    this.z = this.cfg.stroke;
    this.zd = 0;
    this.cavity = 0;
    this.phase = 'accel';
    this.phaseTime = 0;
    this.qDrive = this.qWaste = this.qDeliver = this.qOut = this.qSnifter = 0;
    this.deliveryValve = 0;
    this.sinceClosure = 0;
    this.acc = this.newAcc();
  }

  /**
   * The dynamic state, to come back to it (the freeze of the cycle looks a step ahead and falls back one step when the
   * phase ended too early). The record of finished strokes is append-only: only its length is kept.
   */
  save(): CycleSnapshot {
    return {
      t: this.t,
      v: this.v,
      p: this.p,
      pa: this.pa,
      z: this.z,
      zd: this.zd,
      cavity: this.cavity,
      phase: this.phase,
      phaseTime: this.phaseTime,
      airFraction: this.airFraction,
      strokeCount: this.strokeCount,
      deliveryValve: this.deliveryValve,
      qDrive: this.qDrive,
      qWaste: this.qWaste,
      qDeliver: this.qDeliver,
      qOut: this.qOut,
      qSnifter: this.qSnifter,
      sinceClosure: this.sinceClosure,
      lastPeak: this.lastPeak,
      acc: { ...this.acc, phases: [...this.acc.phases] as [number, number, number, number] },
      cycles: this.cycles.length,
    };
  }

  restore(s: CycleSnapshot): void {
    const { acc, cycles, ...scalars } = s;
    Object.assign(this, scalars);
    this.acc = { ...acc, phases: [...acc.phases] as [number, number, number, number] };
    if (this.cycles.length > cycles) this.cycles.length = cycles;
  }

  /** Air volume of the chamber at its present pressure, m³. */
  airVolume(): number {
    const c = this.cfg;
    const nominalAbs = c.pStatic + P_ATM;
    const abs = Math.max(this.pa + P_ATM, 1e4);
    return (
      Math.max(this.airFraction, AIR_FRACTION_LOGGED) * c.chamberVolume * Math.pow(nominalAbs / abs, 1 / POLYTROPIC)
    );
  }

  /**
   * Advance by dt (≤ cfg.dtMax). Returns true when the waste valve has just closed on its seat (a new stroke starts).
   */
  step(dt: number): boolean {
    this.r[R_DT] = dt;
    return this.advance();
  }

  /** `step(cfg.dtMax)`: the loops that run at the largest step call this one, which takes no number to box. */
  stepMax(): boolean {
    this.r[R_DT] = this.cfg.dtMax;
    return this.advance();
  }

  /** One step of the length in `r[R_DT]`. */
  private advance(): boolean {
    const c = this.cfg;
    const dt = this.r[R_DT];
    const A = c.areaPipe;
    const v0 = this.v;
    const p0 = this.p;
    const z0 = this.z;

    // --- friction of the drive pipe: Darcy λ at the present velocity, lagged by one step
    const lambda = frictionOf(v0, c.diameter, c.roughness);
    const kLoss = (lambda * c.length) / c.diameter + c.kMinor;
    const fricDen = 1 + (dt * kLoss * Math.abs(v0)) / (2 * c.length);
    const accel0 = (G * c.h) / c.length;

    // --- waste valve curtain area
    const aGap = Math.min(Math.PI * c.seatDiameter * z0, c.seatArea);
    const kWaste = CD_WASTE * aGap;
    const aSnif = c.snifterOk ? (Math.PI * SNIFTER_DIAMETER * SNIFTER_DIAMETER) / 4 : 0;

    // --- chamber, eliminated analytically: pa' = alpha + beta * Qd
    const paAbs = this.pa + P_ATM;
    const cAir = airCompliance(this.airVolume(), paAbs);
    const rLine = lineResistance(c, this.qOut);
    const beta = 1 / (cAir / dt + 1 / rLine);
    const alpha = beta * ((cAir * this.pa) / dt + c.pStatic / rLine);
    const kd = CD_DELIVERY * c.deliveryArea * Math.sqrt(2 / RHO);
    const kd2 = kd * kd;

    // body-pressure residual: storage − inflow + outflows (monotone increasing in x), see `residual`
    const r = this.r;
    r[R_V0] = v0;
    r[R_ACCEL0] = accel0;
    r[R_FRIC] = fricDen;
    r[R_KWASTE] = kWaste;
    r[R_SNIFTER] = aSnif;
    r[R_ALPHA] = alpha;
    r[R_BETA] = beta;
    r[R_KD2] = kd2;
    r[R_P0] = p0;

    r[R_X] = P_VAPOUR;
    this.residual();
    const fLow = r[R_F];
    if (fLow >= 0 || this.cavity > 0) {
      // the water cannot go below its vapour pressure: a cavity opens (column separation) and closes again later
      r[R_ROOT] = P_VAPOUR;
      this.cavity = Math.max(0, this.cavity + fLow * dt);
    } else {
      this.solveBody(p0, P_VAPOUR);
      r[R_X] = r[R_ROOT];
      this.residual();
    }
    // read back from the scratch array, always as a plain number (a pressure that is sometimes a whole-number constant
    // and sometimes a fraction would be boxed to be stored)
    const x = r[R_ROOT];
    const vNew = r[R_VNEW];
    const qw = r[R_QW];
    const qs = r[R_QS];
    const qd = r[R_QD];

    // --- chamber and delivery pipe
    const paNew = alpha + beta * qd;
    const qOut = (paNew - c.pStatic) / rLine;

    // --- waste valve: weight against the pressure on the seat
    const weight = c.mass * G;
    const net = weight - x * c.seatArea; // > 0 opens, < 0 closes
    let closed = false;
    if (z0 <= 0 && net <= 0) {
      this.z = 0;
      this.zd = 0;
    } else {
      this.zd += (dt * net) / c.mass;
      this.z = z0 + dt * this.zd;
      if (this.z <= 0) {
        this.acc.impact = Math.max(this.acc.impact, -this.zd);
        this.z = 0;
        this.zd = 0;
        closed = z0 > 0;
      } else if (this.z >= c.stroke) {
        this.z = c.stroke;
        this.zd = 0;
      }
    }

    // --- commit
    this.v = vNew;
    this.p = x;
    this.pa = paNew;
    this.qDrive = A * vNew;
    this.qWaste = Math.max(qw, 0);
    this.qDeliver = qd;
    this.qOut = qOut;
    this.qSnifter = Math.max(-qs, 0);
    this.t += dt;
    this.sinceClosure += dt;

    // delivery valve visual: opens in ~6 ms, closes in ~12 ms
    const target = qd > DELIVER_ON ? 1 : 0;
    const tau = target > this.deliveryValve ? 0.006 : 0.012;
    this.deliveryValve += (target - this.deliveryValve) * (1 - Math.exp(-dt / tau));

    // --- phase machine
    const phaseBefore = this.phase;
    if (closed) {
      this.phase = 'close';
    } else {
      switch (this.phase) {
        case 'accel':
          if (this.zd < 0 || this.z <= 0) this.phase = 'close';
          break;
        case 'close':
          if (qd > DELIVER_ON) this.phase = 'deliver';
          else if (this.z <= 0 && vNew < 0) this.phase = 'recoil';
          break;
        case 'deliver':
          if (qd < DELIVER_ON * 0.5) this.phase = 'recoil';
          break;
        case 'recoil':
          if (this.z > 0.5 * c.stroke && vNew >= 0) this.phase = 'accel';
          break;
        default:
          break;
      }
    }
    this.phaseTime = this.phase === phaseBefore ? this.phaseTime + dt : 0;

    // --- record of the stroke in progress
    const a = this.acc;
    a.drive += this.qDrive * dt;
    a.delivered += qd * dt;
    a.vMax = Math.max(a.vMax, vNew);
    a.pMax = Math.max(a.pMax, x);
    a.pMin = Math.min(a.pMin, x);
    a.pChamber += this.pa * dt;
    a.time += dt;
    const k = PHASE_INDEX[this.phase];
    if (k !== undefined) a.phases[k] += dt;

    if (closed) {
      this.strokeCount += 1;
      // the stroke that has just ended is recorded, except the very first (it starts from rest)
      if (this.strokeCount > 1) {
        this.cycles.push({
          period: a.time,
          drive: a.drive,
          delivered: a.delivered,
          vMax: a.vMax,
          pMax: a.pMax,
          pMin: a.pMin,
          impact: a.impact,
          phases: a.phases,
          pChamber: a.pChamber / Math.max(a.time, 1e-9),
        });
        if (this.cycles.length > 32) this.cycles.shift();
        this.lastPeak = a.pMax;
      }
      this.acc = this.newAcc();
      this.sinceClosure = 0;
    }
    return closed;
  }

  /**
   * The node equation of the ram body for the pressure `r[R_X]`: storage − inflow + outflows, increasing in x. Leaves
   * the residual in `r[R_F]` and the column velocity and the three orifice flows that go with x in `r[R_VNEW]`,
   * `r[R_QW]`, `r[R_QS]` and `r[R_QD]`. Reads the constants of the step from the other slots. Called many times per step
   * by `solveBody`: no argument and no return value, so that nothing is allocated.
   */
  private residual(): void {
    const c = this.cfg;
    const r = this.r;
    const x = r[R_X];
    const dt = r[R_DT];
    const kWaste = r[R_KWASTE];
    const aSnif = r[R_SNIFTER];
    const alpha = r[R_ALPHA];
    const beta = r[R_BETA];
    const kd2 = r[R_KD2];
    const vNew = (r[R_V0] + dt * (r[R_ACCEL0] - x / (RHO * c.length))) / r[R_FRIC];
    const qin = c.areaPipe * vNew;
    const qw = x >= 0 ? kWaste * Math.sqrt((2 * x) / RHO) : -kWaste * Math.sqrt((-2 * x) / RHO_AIR);
    const qs =
      aSnif > 0 && x < -SNIFTER_CRACK ? -CD_SNIFTER * aSnif * Math.sqrt((2 * (-x - SNIFTER_CRACK)) / RHO_AIR) : 0;
    const qd = x > alpha ? 0.5 * (-kd2 * beta + Math.sqrt(kd2 * kd2 * beta * beta + 4 * kd2 * (x - alpha))) : 0;
    r[R_VNEW] = vNew;
    r[R_QW] = qw;
    r[R_QS] = qs;
    r[R_QD] = qd;
    r[R_F] = (c.bodyCompliance * (x - r[R_P0])) / dt - qin + qw + qd + qs;
  }

  /**
   * Root of `residual` (increasing in x): expand a bracket around `start`, then Illinois. `floor` is a known lower bound.
   * The root goes to `r[R_ROOT]`.
   */
  private solveBody(start: number, floor: number): void {
    const r = this.r;
    let xa = Math.max(start, floor);
    r[R_X] = xa;
    this.residual();
    let fa = r[R_F];
    if (fa === 0) {
      r[R_ROOT] = xa;
      return;
    }
    let xb: number;
    let fb: number;
    let step = 2000;
    if (fa < 0) {
      xb = xa + step;
      r[R_X] = xb;
      this.residual();
      fb = r[R_F];
      for (let i = 0; fb < 0 && i < 60; i++) {
        xa = xb;
        fa = fb;
        step *= 3;
        xb = xa + step;
        r[R_X] = xb;
        this.residual();
        fb = r[R_F];
      }
    } else {
      xb = Math.max(floor, xa - step);
      r[R_X] = xb;
      this.residual();
      fb = r[R_F];
      for (let i = 0; fb > 0 && xb > floor && i < 60; i++) {
        xa = xb;
        fa = fb;
        step *= 3;
        xb = Math.max(floor, xa - step);
        r[R_X] = xb;
        this.residual();
        fb = r[R_F];
      }
      // xa is the upper end (fa > 0), xb the lower end (fb < 0 or at the floor)
      let swap = xa;
      xa = xb;
      xb = swap;
      swap = fa;
      fa = fb;
      fb = swap;
    }
    // now fa <= 0 <= fb with xa < xb
    let side = 0;
    for (let i = 0; i < 80; i++) {
      const xm = fb - fa !== 0 ? (xa * fb - xb * fa) / (fb - fa) : 0.5 * (xa + xb);
      r[R_X] = xm;
      this.residual();
      const fm = r[R_F];
      if (Math.abs(fm) < 1e-12 || xb - xa < 2) {
        r[R_ROOT] = xm;
        return;
      }
      if (fm < 0) {
        xa = xm;
        fa = fm;
        if (side === -1) fb *= 0.5;
        side = -1;
      } else {
        xb = xm;
        fb = fm;
        if (side === 1) fa *= 0.5;
        side = 1;
      }
    }
    r[R_ROOT] = 0.5 * (xa + xb);
  }
}

/**
 * Integrate the cycle from rest until it is periodic and return its averages. `warm` strokes are discarded, the next
 * `measure` are averaged. A valve that never closes, or closes and never reopens, is reported as such.
 *
 * The air chamber charges slowly (time constant Z·C, several seconds) towards ρgH + R·q. To avoid integrating for
 * ten seconds, the chamber pressure is set to that equilibrium at every closure from the delivery of the last stroke
 * (it converges in two or three strokes; a chamber with no air has no memory, so nothing changes for it).
 */
export function solveSteady(
  cfg: CycleConfig,
  airFraction: number,
  deliveryHead: number,
  opts: { warm?: number; measure?: number; tMax?: number } = {},
): Means {
  const run = new SteadyRun(cfg, airFraction, deliveryHead, opts);
  while (!run.advance(1 << 30)) {
    // the whole solve in one go
  }
  return run.means as Means;
}

/**
 * `solveSteady` that can be paused: `advance(maxSteps)` integrates a slice of the solve and says whether it has finished,
 * so that a page can spread a solve (about 6 ms of work) over several frames, a millisecond or two at a time. The steps
 * and their order are those of `solveSteady`, which is this class run to the end: same figures to the last digit.
 */
export class SteadyRun {
  /** The averages, once `advance` has returned true. */
  means: Means | null = null;
  private readonly cyc: RamCycle;
  private readonly warm: number;
  private readonly measure: number;
  private readonly tMax: number;
  private vMark = -1;
  private tMark = 0;

  constructor(
    private readonly cfg: CycleConfig,
    airFraction: number,
    private readonly deliveryHead: number,
    opts: { warm?: number; measure?: number; tMax?: number } = {},
  ) {
    this.warm = opts.warm ?? 3;
    this.measure = opts.measure ?? 4;
    this.tMax = opts.tMax ?? 30;
    this.cyc = new RamCycle(cfg, airFraction);
  }

  /** Integrate at most `maxSteps` steps (0.2 ms each at most). True when the averages are ready in `means`. */
  advance(maxSteps: number): boolean {
    if (this.means) return true;
    const cyc = this.cyc;
    const cfg = this.cfg;
    for (let n = 0; n < maxSteps; n++) {
      if (!(cyc.t < this.tMax && cyc.cycles.length < this.warm + this.measure)) return this.finish();
      const closed = cyc.stepMax();
      if (closed && cyc.cycles.length > 0) {
        const r = cyc.cycles[cyc.cycles.length - 1];
        const q = r.delivered / r.period;
        cyc.pa = cfg.pStatic + lineResistance(cfg, q) * q;
      }
      if (cyc.strokeCount > 0 && cyc.sinceClosure > 3) return this.finish(); // closed and never reopened
      if (cyc.strokeCount === 0 && cyc.t - this.tMark >= 0.5) {
        // never closes: the column has reached its terminal velocity with the valve wide open
        if (cyc.t > 1 && Math.abs(cyc.v - this.vMark) < 0.002) return this.finish();
        this.vMark = cyc.v;
        this.tMark = cyc.t;
      }
    }
    return false;
  }

  private finish(): true {
    this.means = summarise(this.cyc, this.cfg, this.deliveryHead, this.warm);
    return true;
  }
}

/**
 * One whole stroke of the periodic regime, sampled for the panel (research §11: the cycle step by step). The cycle is
 * run from rest like `solveSteady` (the chamber pressure is set at every closure to its equilibrium), then the stroke
 * between two entries into the acceleration phase is recorded, about 300 samples. Returns null when the valve does not
 * cycle (never closes, or stays shut).
 */
export function recordStroke(
  cfg: CycleConfig,
  airFraction: number,
  opts: { warm?: number; tMax?: number } = {},
): StrokeTrace | null {
  const warm = opts.warm ?? 3;
  const tMax = opts.tMax ?? 30;
  const cyc = new RamCycle(cfg, airFraction);
  const dt = cfg.dtMax;
  const t: number[] = [];
  const pressure: number[] = [];
  const velocity: number[] = [];
  const valve: number[] = [];
  const phase: number[] = [];
  let recording = false;
  let t0 = 0;
  let every = 1;
  let n = 0;
  while (cyc.t < tMax) {
    const before = cyc.phase;
    const closed = cyc.stepMax();
    if (closed && cyc.cycles.length > 0) {
      const r = cyc.cycles[cyc.cycles.length - 1];
      const q = r.delivered / r.period;
      cyc.pa = cfg.pStatic + lineResistance(cfg, q) * q;
    }
    if (cyc.strokeCount > 0 && cyc.sinceClosure > 3) return null; // closed and never reopened
    const enteredAccel = cyc.phase === 'accel' && before !== 'accel';
    if (enteredAccel && cyc.cycles.length >= warm) {
      if (recording) break; // the next stroke starts: the window is complete
      recording = true;
      t0 = cyc.t;
      // sampling interval from the period of the last strokes
      const last = cyc.cycles.slice(-3);
      const period = last.reduce((a, r) => a + r.period, 0) / last.length;
      every = Math.max(1, Math.round(period / dt / 300));
      n = 0;
    }
    if (recording) {
      if (n++ % every === 0) {
        t.push((cyc.t - t0) * 1000);
        pressure.push(toBar(cyc.p));
        velocity.push(cyc.v);
        valve.push(cyc.z / cfg.stroke);
        phase.push(PHASE_INDEX[cyc.phase] ?? 0);
      }
    }
    if (cyc.strokeCount === 0 && cyc.t > 10) return null; // never closes
  }
  if (!recording || t.length < 10) return null;
  const start: [number, number, number, number] = [-1, -1, -1, -1];
  const last: [number, number, number, number] = [-1, -1, -1, -1];
  phase.forEach((k, i) => {
    if (start[k] < 0) start[k] = t[i];
    last[k] = t[i];
  });
  const span = t[t.length - 1] + (t[1] - t[0]);
  const length: [number, number, number, number] = [0, 0, 0, 0];
  for (let k = 0; k < 4; k++) if (start[k] >= 0) length[k] = last[k] - start[k] + (t[1] - t[0]);
  return { t, pressure, velocity, valve, phase, start, length, period: span };
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

function summarise(cyc: RamCycle, cfg: CycleConfig, deliveryHead: number, warm: number): Means {
  const m = emptyMeans();
  const rec = cyc.cycles.slice(Math.min(warm, Math.max(0, cyc.cycles.length - 2)));
  if (rec.length < 2) {
    // no periodic regime: either the valve never closed, or it closed and stayed shut
    if (cyc.strokeCount === 0) {
      m.valveStaysOpen = true;
      m.driveFlow = toLpm(cfg.areaPipe * cyc.v);
      m.wasteFlow = m.driveFlow;
      m.closingVelocity = cyc.v;
    } else {
      m.valveStuckShut = true;
      m.closingVelocity = cyc.cycles.length ? cyc.cycles[cyc.cycles.length - 1].vMax : 0;
    }
    return m;
  }
  const n = rec.length;
  let tSum = 0;
  let drive = 0;
  let deliv = 0;
  let vMax = 0;
  let pMax = 0;
  let pMin = 0;
  let impact = 0;
  let pCh = 0;
  const ph: [number, number, number, number] = [0, 0, 0, 0];
  for (const r of rec) {
    tSum += r.period;
    drive += r.drive;
    deliv += r.delivered;
    vMax += r.vMax;
    pMax += r.pMax;
    pMin += r.pMin;
    impact += r.impact;
    pCh += r.pChamber;
    for (let i = 0; i < 4; i++) ph[i] += r.phases[i];
  }
  const bigQ = toLpm(drive / tSum);
  const q = toLpm(deliv / tSum);
  m.strokesPerMin = (60 * n) / tSum;
  m.driveFlow = bigQ;
  m.deliveredFlow = q;
  m.wasteFlow = Math.max(0, bigQ - q);
  m.deliveredPerStroke = (deliv / n) * 1e6;
  const h = cfg.h;
  m.etaD = etaDAubuisson(q, bigQ, deliveryHead, h);
  m.etaR = etaRankine(q, bigQ, deliveryHead, h);
  m.closingVelocity = vMax / n;
  m.peakPressure = toBar(pMax / n);
  m.minPressure = toBar(pMin / n);
  m.impactSpeed = impact / n;
  m.chamberPressure = toBar(pCh / n);
  m.phaseShare = [ph[0] / tSum, ph[1] / tSum, ph[2] / tSum, ph[3] / tSum];
  return m;
}
