// Shared types of the ram simulation. The engine (engine.ts) writes `RamState` every frame; the 3D scene, the strip and
// the simulation panel only read it. Units are written in the field comments: litres and minutes for flows (what the
// owner of the video talks about), metres, bar and m/s for the hydraulics. Inside the cycle model (cycle.ts) everything
// is SI.

export type ValveId = 1 | 2 | 3;
export type PipeMaterial = 'steel' | 'pvc' | 'hdpe';

export type PresetId = 'valve-3' | 'valve-2' | 'valve-1';
export type ScenarioId = 'source-drop' | 'stroke-nut' | 'water-logged' | 'short-pipe' | 'high-lift' | 'snifter-blocked';

/** Where the stroke cycle is. `stalled` = the ram is not cycling at all (see `RamState.stallReason`). */
export type Phase = 'accel' | 'close' | 'deliver' | 'recoil' | 'stalled';
export type Status = 'running' | 'stalled';
/**
 * Why the ram stopped: `tank` = the buffer tank ran dry and air got into the drive pipe (K8, the video's problem);
 * `stuck` = the waste valve stays shut because the recoil is too weak to reopen it (a delivery head barely above the
 * fall). A ram whose stroke nut is turned in too far does not stop: it keeps striking and delivers nothing (alarm
 * `noDelivery`, transcript 13:13).
 */
export type StallReason = 'none' | 'tank' | 'stuck';

export type AlarmKey =
  | 'stalledTank'
  | 'stalledStuck'
  | 'tankLow'
  | 'noDelivery'
  | 'valveOpen'
  | 'pipeShort'
  | 'headHigh'
  | 'waterLogged'
  | 'snifterBlocked';

/** Everything the user can edit live (all through `RamSim.set`). Ranges are in presets.ts (`RANGES`). */
export interface RamParams {
  // ---- kit time controls (required by LabSim)
  /** Visual slow motion of the stroke cycle (1, 0.2, 0.05, 0.02). Only the fast cycle is slowed. */
  slowMo: number;
  /** Simulated seconds per real second for the slow quantities (tank, volumes, clock): 1, 60, 600, 3600. */
  timeScale: number;
  running: boolean;
  /** Which preset the values come from; becomes 'custom' as soon as the user edits something. */
  preset: PresetId | 'custom';

  // ---- site
  /** Fall h: vertical drop from the buffer tank to the ram, m. */
  fall: number;
  /** Drive pipe length L, m (never shorter than the fall). */
  driveLength: number;
  /** Drive pipe inner diameter D, mm. */
  driveDiameter: number;
  /** Drive pipe material: sets the wave speed of the water hammer (and the roughness). */
  pipeMaterial: PipeMaterial;
  /** Delivery head H: height of the water tower above the ram, m. */
  deliveryHead: number;
  /** Delivery pipe length, m. */
  deliveryLength: number;
  /** Flow of the spring that fills the buffer tank, L/min. */
  sourceFlow: number;
  /** Buffer tank volume, L. */
  tankVolume: number;

  // ---- ram
  /** Waste valve size: n°1 = DN15, n°2 = DN20, n°3 = DN25 (K7). */
  valve: ValveId;
  /** Valve stroke set by the stroke nut, mm. */
  stroke: number;
  /** Counterweight added to the bare valve, g. */
  counterweight: number;
  /** Air chamber volume, L. */
  chamberVolume: number;
  /** Fault: the chamber has lost all its air. */
  waterLogged: boolean;
  /** Fault: the snifter valve is blocked, so the chamber cannot be refilled with air. */
  snifterBlocked: boolean;
}

/** Cycle-averaged results of the stroke model for one set of parameters (see `solveSteady`). */
export interface Means {
  /** Strokes (waste valve closures) per minute. 0 when the valve never cycles. */
  strokesPerMin: number;
  /** Water taken from the drive pipe, Q, L/min (waste + delivered). */
  driveFlow: number;
  /** Water lost through the waste valve, L/min. */
  wasteFlow: number;
  /** Water pushed up the delivery pipe, q, L/min. */
  deliveredFlow: number;
  /** Delivered volume per stroke, mL. */
  deliveredPerStroke: number;
  /** D'Aubuisson efficiency q·H/(Q·h). */
  etaD: number;
  /** Rankine efficiency q·(H−h)/((Q−q)·h). */
  etaR: number;
  /** Mean of the highest drive pipe velocity of each stroke (≈ closing velocity), m/s. */
  closingVelocity: number;
  /** Mean peak body pressure of a stroke, bar gauge. */
  peakPressure: number;
  /** Lowest body pressure of a stroke (recoil), bar gauge. */
  minPressure: number;
  /** Mean speed of the waste valve when it hits its seat, m/s. */
  impactSpeed: number;
  /** Mean of the lumped chamber pressure, bar gauge. */
  chamberPressure: number;
  /** The valve never closes (water just runs out of the waste valve). */
  valveStaysOpen: boolean;
  /** The valve closed once and was never reopened by the recoil. */
  valveStuckShut: boolean;
  /** Fraction of the stroke period spent in each phase: accel, close, deliver, recoil. */
  phaseShare: [number, number, number, number];
}

/** The state handed to the 3D scene and the UI every frame. */
export interface RamState {
  // ---- clock
  /** Simulated seconds since the start (advances by dt × timeScale). */
  simTime: number;
  /** Whole days elapsed since the start. */
  day: number;
  /** Hour of the simulated day, 0..24. */
  hour: number;

  // ---- stroke cycle (real time, sub-stepped; slowed by slowMo)
  phase: Phase;
  /** Number of waste valve closures since the start. */
  strokeCount: number;
  /** 0..1 progress through the current stroke (0 at a closure, 1 at the next one). Estimated from the mean period. */
  cycleProgress: number;
  /** Waste valve lift / stroke: 0 closed on its seat .. 1 fully open on the stroke nut. Moves smoothly. */
  wasteValve: number;
  /** Delivery check valve opening 0..1 (lags the flow by a few ms so it is visible). */
  deliveryValve: number;
  /** Velocity in the drive pipe, m/s. Positive towards the ram; negative during the recoil. */
  driveVelocity: number;
  /** Instantaneous drive flow A·v, L/min (negative during the recoil). */
  driveFlowNow: number;
  /** Instantaneous flow out of the waste valve, L/min (the jet), ≥ 0. */
  wasteJetFlow: number;
  /** Instantaneous flow through the check valve into the air chamber, L/min, ≥ 0. */
  deliveredFlowNow: number;
  /** Instantaneous flow from the air chamber into the delivery pipe, L/min. */
  outletFlowNow: number;
  /** Instantaneous air drawn in by the snifter during the recoil, L/min at ambient pressure, ≥ 0. */
  snifterFlow: number;
  /** Body pressure at the ram, bar gauge (sawtooth with the water hammer peak). */
  bodyPressure: number;
  /** Highest body pressure of the last stroke, bar gauge. */
  peakPressure: number;
  /** Pressure in the air chamber, bar gauge. */
  chamberPressure: number;
  /** Air chamber: fraction of its height filled by air (top part), 0..1. The rest is water. */
  airLevel: number;

  // ---- cycle averages (what the strip and the charts show)
  strokesPerMin: number;
  /** Drive flow Q taken from the buffer tank, L/min (0 when stalled). */
  driveFlow: number;
  /** Waste valve flow, L/min. */
  wasteFlow: number;
  /** Delivered flow q, L/min. */
  deliveredFlow: number;
  /** Delivered flow as a daily volume, L/day (rate: q × 1440). */
  deliveredPerDay: number;
  /** D'Aubuisson efficiency q·H/(Q·h), 0..1. */
  etaD: number;
  /** Rankine efficiency q·(H−h)/((Q−q)·h), 0..1. */
  etaR: number;
  /** Velocity at which the waste valve closes, m/s. */
  closingVelocity: number;
  /** Smallest closing velocity able to open the check valve at this head (Joukowsky, K15), m/s. */
  minClosingVelocity: number;
  /** Joukowsky pressure rise ρ·a·v for the current closing velocity, bar. */
  surgeBar: number;
  /** Wave speed of the drive pipe, m/s. */
  waveSpeed: number;

  // ---- slow quantities (integrate mean rates × dt × timeScale)
  status: Status;
  stallReason: StallReason;
  /** Buffer tank content, L. */
  tankLitres: number;
  /** Buffer tank content as a fraction of its volume, 0..1. */
  tankLevel: number;
  /** Source flow actually entering the tank, L/min. */
  sourceFlow: number;
  /** Water delivered to the tower since the start, L. */
  deliveredTotal: number;
  /** Water delivered since 00:00 of the simulated day, L. */
  deliveredToday: number;
  /** Water drawn from the tank by the ram since the start, L. */
  drivenTotal: number;
  /** Air share of the chamber, 0..1 (drops slowly when the snifter is blocked). */
  airFraction: number;
  /** Time left before the tank is empty at the present deficit, hours (Infinity when it never empties). */
  hoursToEmpty: number;

  // ---- site (copies of the parameters, so the 3D scene reads only the state)
  fall: number;
  driveLength: number;
  driveDiameter: number;
  deliveryHead: number;
  /** Static pressure of the delivery pipe at the ram, ρ·g·H, bar. */
  deliveryStaticBar: number;
  /** H/h, the lift ratio (K4: about 10 for a good ram). */
  liftRatio: number;
  /** L/h, the drive pipe length ratio (3 to 7 recommended, K20). */
  lengthRatio: number;
  stroke: number;
  valve: ValveId;

  alarms: AlarmKey[];
}
