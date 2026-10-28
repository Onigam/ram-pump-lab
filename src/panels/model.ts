import type { UiKey } from '../i18n/ui';
import { VALVE_SETTINGS } from '../sim/presets';
import type { CyclePhase, PresetId, RamParams, RamState, ScenarioId, ValveId } from '../sim/types';

// What the simulation panel shows, as plain data (no DOM): which figures, in which group, which text goes with which
// scenario or part test, and how the curve computations share a frame. src/panels/sim.ts draws it; the tests read it.

/** One figure of the grid of readouts: its label (a UI key), unit, decimals, and where it comes from in the state. */
export interface ReadoutDef {
  key: UiKey;
  unit: string;
  digits: number;
  value: (s: RamState) => number;
}

/** The six figures that tell what the ram does: always on view. */
export const KEY_READOUTS: readonly ReadoutDef[] = [
  { key: 'liveStrokes', unit: '', digits: 0, value: (s) => s.strokesPerMin },
  { key: 'liveDrive', unit: 'L/min', digits: 1, value: (s) => s.driveFlow },
  { key: 'liveWaste', unit: 'L/min', digits: 1, value: (s) => s.wasteFlow },
  { key: 'liveDelivered', unit: 'L/min', digits: 2, value: (s) => s.deliveredFlow },
  { key: 'liveDeliveredDay', unit: 'L', digits: 0, value: (s) => s.deliveredPerDay },
  { key: 'liveEtaD', unit: '%', digits: 0, value: (s) => s.etaD * 100 },
];

/**
 * The nine figures behind "More figures": the physics of the stroke and the state of the chamber and the tank. The pressure
 * of the ram body is the peak of the last stroke (`peakPressure`), which only changes once per stroke: the instantaneous
 * body pressure is a sawtooth that, sampled five times a second, would jump between 0 and 7 bar. The instantaneous value
 * stays in the card of a frozen phase, where it is steady and meant.
 */
export const MORE_READOUTS: readonly ReadoutDef[] = [
  { key: 'liveEtaR', unit: '%', digits: 0, value: (s) => s.etaR * 100 },
  { key: 'liveClosing', unit: 'm/s', digits: 2, value: (s) => s.closingVelocity },
  { key: 'liveClosingMin', unit: 'm/s', digits: 2, value: (s) => s.minClosingVelocity },
  { key: 'liveSurge', unit: 'bar', digits: 1, value: (s) => s.surgeBar },
  { key: 'livePeak', unit: 'bar', digits: 1, value: (s) => s.peakPressure },
  { key: 'liveChamber', unit: 'bar', digits: 1, value: (s) => s.chamberPressure },
  { key: 'liveTank', unit: 'L', digits: 0, value: (s) => s.tankLitres },
  { key: 'liveAir', unit: '%', digits: 0, value: (s) => s.airFraction * 100 },
  { key: 'liveWave', unit: 'm/s', digits: 0, value: (s) => s.waveSpeed },
];

export const PRESET_KEYS: Record<PresetId, UiKey> = {
  'valve-3': 'presetValve3',
  'valve-2': 'presetValve2',
  'valve-1': 'presetValve1',
};

export const SCENARIO_KEYS: Record<ScenarioId, UiKey> = {
  'source-drop': 'scenarioSourceDrop',
  'stroke-nut': 'scenarioStrokeNut',
  'water-logged': 'scenarioWaterLogged',
  'short-pipe': 'scenarioShortPipe',
  'high-lift': 'scenarioHighLift',
  'snifter-blocked': 'scenarioSnifterBlocked',
  'plastic-pipe': 'scenarioPlasticPipe',
  'heavy-weight': 'scenarioHeavyWeight',
};

/** The line under the chips that says what to look at once a scenario is playing. */
export const SCENARIO_CAPTION_KEYS: Record<ScenarioId, UiKey> = {
  'source-drop': 'capSourceDrop',
  'stroke-nut': 'capStrokeNut',
  'water-logged': 'capWaterLogged',
  'short-pipe': 'capShortPipe',
  'high-lift': 'capHighLift',
  'snifter-blocked': 'capSnifterBlocked',
  'plastic-pipe': 'capPlasticPipe',
  'heavy-weight': 'capHeavyWeight',
};

export const PHASE_KEYS: Record<CyclePhase, UiKey> = {
  accel: 'phaseAccel',
  close: 'phaseClose',
  deliver: 'phaseDeliver',
  recoil: 'phaseRecoil',
};

/** The plain sentence that opens the card of a frozen phase. */
export const PHASE_HEADLINE_KEYS: Record<CyclePhase, UiKey> = {
  accel: 'headAccel',
  close: 'headClose',
  deliver: 'headDeliver',
  recoil: 'headRecoil',
};

/** The line shown under the test buttons of a part sheet: what to look at once the button has acted (by part id). */
export const PART_HINT_KEYS: Record<string, UiKey> = {
  'air-chamber': 'hintAirChamber',
  snifter: 'hintSnifter',
  'waste-valve': 'hintWasteValve',
  'drive-gate-valve': 'hintDriveGate',
  'tank-drain': 'hintTankDrain',
  'buffer-tank': 'hintTankDrain',
  'stroke-nut': 'hintStrokeNut',
};

/** Real milliseconds per frame the simulation panel may spend on its curves (the model is solved a slice at a time). */
export const SWEEP_BUDGET_MS = 4;

/** A unit of work for the curves: given the milliseconds it may use, it works and says whether it has finished. */
export type CurveJob = (budgetMs: number) => boolean;

/**
 * Run the jobs of the queues, the first non-empty queue first, for about `budgetMs` milliseconds in all. A finished job
 * leaves its queue; a job that is not finished has used its time, and the pump stops. At least one slice of work is done
 * whenever a queue is not empty, so the curves always progress. Returns the number of jobs finished. `now` is the clock (milliseconds), replaceable in tests.
 */
export function pumpQueues(
  queues: readonly CurveJob[][],
  budgetMs: number,
  now: () => number = () => performance.now(),
): number {
  const start = now();
  let done = 0;
  let first = true;
  for (;;) {
    const queue = queues.find((q) => q.length > 0);
    if (!queue) break;
    const left = budgetMs - (now() - start);
    if (left <= 0 && !first) break;
    first = false;
    if (!queue[0](Math.max(left, 0))) break; // not finished: it has used the time it was given
    queue.shift();
    done += 1;
  }
  return done;
}

/** Delivery heads (m), strokes (mm) and weights (g) of the sweeps drawn as charts. */
export const HEADS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130];
export const STROKES = Array.from({ length: 23 }, (_, i) => 0.5 + i * 0.25);
export const WEIGHTS = Array.from({ length: 26 }, (_, i) => i * 40);

/** The solves behind the head chart: each valve at the settings of the video, for every head (for the present site). */
export function headPatches(): Partial<RamParams>[] {
  return ([1, 2, 3] as ValveId[]).flatMap((valve) =>
    HEADS.map((deliveryHead) => ({ valve, ...VALVE_SETTINGS[valve], deliveryHead })),
  );
}

/** The solves behind the consumption and delivery charts: the stroke or the weight swept, the rest as it is. */
export function strokePatches(by: 'stroke' | 'weight'): Partial<RamParams>[] {
  return by === 'stroke' ? STROKES.map((stroke) => ({ stroke })) : WEIGHTS.map((counterweight) => ({ counterweight }));
}

/**
 * Everything the panel asks the cycle model when it opens on the site of the video: `ram.prefetch(panelPatches())` in an
 * idle moment after the start (see `RamSim.prefetch`) leaves the curves already computed when the visitor opens it.
 */
export function panelPatches(): Partial<RamParams>[] {
  return [...headPatches(), ...strokePatches('stroke')];
}
