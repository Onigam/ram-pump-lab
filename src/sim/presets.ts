import type { CyclePhase, PresetId, RamParams, ScenarioId, ValveId } from './types';

// The lab's story and its knobs. Presets reproduce the three waste valves of the video (research §5); scenarios are
// small scripted situations used by the lessons. Every number below is either REPORTED (video, K-number), DERIVED
// (computed from reported figures) or CALIBRATED / ASSUMED (the video is silent: see docs/physics.md).

/** Allowed range and slider step of every editable parameter. */
export const RANGES = {
  fall: { min: 2, max: 30, step: 0.5 },
  driveLength: { min: 5, max: 60, step: 1 },
  driveDiameter: { min: 15, max: 54, step: 1 },
  deliveryHead: { min: 5, max: 150, step: 1 },
  deliveryLength: { min: 20, max: 1000, step: 10 },
  sourceFlow: { min: 1, max: 40, step: 0.1 },
  tankVolume: { min: 200, max: 20000, step: 100 },
  stroke: { min: 0.5, max: 8, step: 0.1 },
  counterweight: { min: 0, max: 1000, step: 10 },
  chamberVolume: { min: 0.5, max: 20, step: 0.5 },
} as const;

export type RangedKey = keyof typeof RANGES;

/** Source flow of the video today (K6: 7.5–7.8 L/min), L/min. REPORTED. */
export const SOURCE_FLOW_TODAY = 7.5;
/** Source flow two years earlier (K6), L/min. REPORTED. */
export const SOURCE_FLOW_BEFORE = 10;
/** Consumption of the n°3 valve (K8, an estimate of the video's author), L/min. REPORTED. */
export const CONSUMPTION_VALVE_3 = 17;
/** Time the buffer tank lasted with the n°3 valve (K8), hours. REPORTED. */
export const TANK_HOURS_VALVE_3 = 10;
/**
 * Buffer tank volume, L. DERIVED from K8: the tank lasted ≈ 10 h at the deficit (17 − 7.5) L/min, so
 * V = 9.5 L/min × 600 min = 5 700 L. Not stated in the video; this is the volume the other figures imply.
 */
export const TANK_VOLUME_DERIVED = (CONSUMPTION_VALVE_3 - SOURCE_FLOW_TODAY) * TANK_HOURS_VALVE_3 * 60;

/** Hour of the simulated day at which every run starts (an arbitrary morning). */
export const START_HOUR = 8;

/** The site of the video (K1–K3, K6) with the n°1 valve at its calibrated setting: the "after" of the story. */
const BASE: RamParams = {
  slowMo: 1,
  timeScale: 1,
  running: true,
  preset: 'valve-1',
  fall: 7.5, // K1
  driveLength: 20, // K2
  driveDiameter: 27, // 1" steel pipe (the Walton n°3 is a 1" ram, K5), inner diameter. ASSUMPTION
  pipeMaterial: 'steel',
  deliveryHead: 65, // K3
  deliveryLength: 300, // K3
  sourceFlow: SOURCE_FLOW_TODAY, // K6
  tankVolume: TANK_VOLUME_DERIVED, // derived from K8
  valve: 1,
  stroke: 2.2, // CALIBRATED on K10, K11 (docs/physics.md)
  counterweight: 360, // CALIBRATED on K10, K11
  chamberVolume: 4, // ASSUMPTION: a 1" ram carries a chamber of a few litres
  waterLogged: false,
  snifterBlocked: false,
};

/**
 * Stroke (mm) and counterweight (g) of each valve as shown in the video. The video gives neither: they are CALIBRATED
 * so that the model reproduces K8 (n°3: ≈ 17 L/min, 70–80 strokes/min), K10 and K11 (n°1: ≈ 500 L/day at 100–110
 * strokes/min); n°2 only has to consume more than the 7.5 L/min source (K9).
 */
export const VALVE_SETTINGS: Record<ValveId, { stroke: number; counterweight: number }> = {
  1: { stroke: 2.2, counterweight: 360 },
  2: { stroke: 2.0, counterweight: 720 },
  3: { stroke: 2.7, counterweight: 640 },
};

export function presetParams(id: PresetId): RamParams {
  const valve: ValveId = id === 'valve-3' ? 3 : id === 'valve-2' ? 2 : 1;
  return { ...BASE, preset: id, valve, ...VALVE_SETTINGS[valve] };
}

/** A change of parameters scheduled at a simulated time (seconds since the start of the scenario). */
export interface ScheduledEvent {
  at: number;
  patch: Partial<RamParams>;
}

export interface ScenarioSetup {
  params: RamParams;
  events: ScheduledEvent[];
}

/** Drive pipe material of the `plastic-pipe` scenario: PVC (500 m/s, `WAVE_SPEED`), the stiffer of the two plastics of the model. */
export const PLASTIC_PIPE = 'pvc' as const;
/**
 * Counterweight of the `heavy-weight` scenario, g: twice the 360 g of the n°1 preset (a round change, not tuned). The
 * model gives, against 360 g: 75 instead of 109 strokes/min, 15.5 instead of 6.7 L/min taken (twice the spring),
 * 788 instead of 500 L/day, η_D 0.31 instead of 0.45 (docs/physics.md §5).
 */
export const HEAVY_WEIGHT = 720;

/** Interval between two turns of the stroke nut in the "stroke-nut" scenario, simulated seconds. */
export const NUT_INTERVAL = 10 * 60;

/** Time scale a scenario needs to show something within a minute of watching (the others play at the pace chosen). */
export const SCENARIO_PACE: Partial<Record<ScenarioId, number>> = {
  'source-drop': 600,
  'stroke-nut': 600,
  'snifter-blocked': 3600,
};

export function scenarioSetup(id: ScenarioId): ScenarioSetup {
  const setup = scenarioBase(id);
  // a scenario is a variation of a preset: the preset select then shows "custom"
  return { params: { ...setup.params, preset: 'custom' }, events: setup.events };
}

function scenarioBase(id: ScenarioId): ScenarioSetup {
  switch (id) {
    case 'source-drop': {
      // two years earlier the spring gave 10 L/min; after an hour it falls to today's 7.5 (K6)
      const params = { ...presetParams('valve-3'), sourceFlow: SOURCE_FLOW_BEFORE };
      return { params, events: [{ at: 3600, patch: { sourceFlow: SOURCE_FLOW_TODAY } }] };
    }
    case 'stroke-nut': {
      // the n°1 valve, then the stroke nut is turned down by 0.1 mm every 10 simulated minutes (transcript 13:13)
      const params = presetParams('valve-1');
      const events: ScheduledEvent[] = [];
      for (let k = 1; k <= 14; k++) {
        events.push({ at: k * NUT_INTERVAL, patch: { stroke: Math.round((params.stroke - 0.1 * k) * 10) / 10 } });
      }
      return { params, events };
    }
    case 'water-logged':
      return { params: { ...presetParams('valve-1'), waterLogged: true }, events: [] };
    case 'short-pipe':
      // K20: the rule is L ≥ 3 to 5 times the fall; here L is barely longer than the fall (L/h = 1.1)
      return { params: { ...presetParams('valve-1'), driveLength: 8 }, events: [] };
    case 'high-lift':
      // H/h = 13: the n°1 valve cannot lift that high (K4: about 10 m per metre of fall)
      return { params: { ...presetParams('valve-1'), deliveryHead: 100 }, events: [] };
    case 'snifter-blocked':
      return { params: { ...presetParams('valve-1'), snifterBlocked: true }, events: [] };
    case 'plastic-pipe':
      // the drive pipe is PVC: wave speed 500 m/s instead of 900 (WAVE_SPEED). For the same closing velocity the surge
      // ρ·a·v is 44 % lower, below the 5.6 bar the check valve needs at H = 65 m: the ram strikes and delivers nothing.
      // A model result for an ASSUMED wave speed, not a reported figure (docs/physics.md §5)
      return { params: { ...presetParams('valve-1'), pipeMaterial: PLASTIC_PIPE }, events: [] };
    case 'heavy-weight':
      // the n°1 valve with twice its counterweight (360 → 720 g): see HEAVY_WEIGHT
      return { params: { ...presetParams('valve-1'), counterweight: HEAVY_WEIGHT }, events: [] };
    default:
      // an id the lab does not know (a lesson typo): the plain n°1 preset
      return { params: presetParams('valve-1'), events: [] };
  }
}

export const PRESET_IDS: PresetId[] = ['valve-3', 'valve-2', 'valve-1'];
export const SCENARIO_IDS: ScenarioId[] = [
  'source-drop',
  'stroke-nut',
  'water-logged',
  'short-pipe',
  'high-lift',
  'snifter-blocked',
  'plastic-pipe',
  'heavy-weight',
];
/** The four phases of a stroke, in order (the cycle can be frozen at any of them). */
export const CYCLE_PHASES: CyclePhase[] = ['accel', 'close', 'deliver', 'recoil'];
