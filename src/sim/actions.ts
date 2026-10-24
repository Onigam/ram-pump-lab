import type { RamSim } from './engine';
import { RANGES } from './presets';

// The "test" buttons of the part sheets (src/part-actions.ts draws them): each puts the simulation in the state the part
// is about, so that the cause (the part) and the effect (the strip, the alarms, the 3D) can be seen together. The logic is
// here, without any DOM, so that it can be tested; the buttons only frame the part and call these functions.

/** Identifiers of the tests (not part ids: one test may sit on several parts). */
export type PartTestId = 'air-chamber' | 'snifter' | 'waste-valve' | 'drive-gate' | 'tank-drain';

/** Step of the stroke nut, mm. The video's rod is a 6 mm thread (pitch 1 mm): 0.1 mm is a tenth of a turn. */
export const NUT_STEP = 0.1;

/** A fault or an intervention that can be put in place and taken away again. */
export interface PartTest {
  id: PartTestId;
  /** Ids of the parts whose sheet carries the test. */
  parts: readonly string[];
  /** The fault or intervention is in place. */
  active(sim: RamSim): boolean;
  /** Put it in place (`on`) or take it away. */
  set(sim: RamSim, on: boolean): void;
  /**
   * Time speed (simulated seconds per real second) at which the effect shows within a few real seconds. Applied when the
   * test is switched on, if the time is slower. Left out when the effect is immediate.
   */
  pace?: number;
}

export const PART_TESTS: readonly PartTest[] = [
  {
    // drown the chamber: all the air is gone (the fault of the `water-logged` scenario)
    id: 'air-chamber',
    parts: ['air-chamber'],
    active: (sim) => sim.params.waterLogged,
    set: (sim, on) => sim.set({ waterLogged: on }),
  },
  {
    // block the snifter: the air of the chamber dissolves with a time constant of 6 h (assumed), the chamber floods
    id: 'snifter',
    parts: ['snifter'],
    active: (sim) => sim.params.snifterBlocked,
    set: (sim, on) => sim.set({ snifterBlocked: on }),
    pace: 3600,
  },
  {
    // hold the waste valve shut by hand: the column stops, the ram is stopped
    id: 'waste-valve',
    parts: ['waste-valve'],
    active: (sim) => sim.hands.valveHeldShut,
    set: (sim, on) => sim.holdValveShut(on),
  },
  {
    // close the gate valve at the start of the drive pipe: no water, the ram is stopped, the tank refills
    id: 'drive-gate',
    parts: ['drive-gate-valve'],
    active: (sim) => !sim.hands.gateOpen,
    set: (sim, on) => sim.setDriveGate(!on),
    pace: 600,
  },
  {
    // open the drain of the buffer tank: it empties in about 40 minutes (TANK_DRAIN_FLOW, assumed)
    id: 'tank-drain',
    parts: ['tank-drain', 'buffer-tank'],
    active: (sim) => sim.hands.tankDrainOpen,
    set: (sim, on) => sim.setTankDrain(on),
    pace: 600,
  },
];

/** The tests that sit on a part. */
export function testsForPart(partId: string): PartTest[] {
  return PART_TESTS.filter((t) => t.parts.includes(partId));
}

/**
 * Switch a test on or off, and make sure the simulation is running (a test is asked to be seen) and, for a slow effect,
 * fast enough. Returns the new state of the test.
 */
export function runPartTest(sim: RamSim, test: PartTest, on: boolean): boolean {
  if (!sim.params.running) sim.set({ running: true });
  test.set(sim, on);
  if (on && test.pace !== undefined && sim.params.timeScale < test.pace) sim.set({ timeScale: test.pace });
  return test.active(sim);
}

/** Toggle a test: put the fault in place if it is not, take it away if it is. */
export function togglePartTest(sim: RamSim, test: PartTest): boolean {
  return runPartTest(sim, test, !test.active(sim));
}

/**
 * Turn the stroke nut by one step: `in` screws it down, the valve lifts less (shorter stroke, less water, until the ram
 * stops delivering); `out` unscrews it (longer stroke, more water). Returns the new stroke, mm.
 */
export function turnNut(sim: RamSim, direction: 'in' | 'out'): number {
  if (!sim.params.running) sim.set({ running: true });
  const { min, max } = RANGES.stroke;
  const next = Math.round((sim.params.stroke + (direction === 'in' ? -NUT_STEP : NUT_STEP)) * 10) / 10;
  sim.set({ stroke: Math.min(max, Math.max(min, next)) });
  return sim.params.stroke;
}
