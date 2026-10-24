import { describe, expect, it } from 'vitest';
import { worldOf } from '../part-ids';
import { NUT_STEP, PART_TESTS, runPartTest, testsForPart, togglePartTest, turnNut, type PartTest } from './actions';
import { RamSim } from './engine';
import { SOURCE_FLOW_TODAY, TANK_VOLUME_DERIVED } from './presets';

// The "test" buttons of the part sheets, without the DOM: each puts the simulation in a state, and the cause and the effect
// are read in the state (strip values, alarms, fields of the 3D).

function run(sim: RamSim, seconds: number, dt = 1 / 60): void {
  const n = Math.round(seconds / dt);
  for (let i = 0; i < n; i++) sim.step(dt);
}

/** Run at ×3600 until a simulated duration has elapsed (the stroke cycle slowed to ×1/50, only the slow quantities matter). */
function runSimulated(sim: RamSim, hours: number): void {
  sim.set({ timeScale: 3600, slowMo: 0.02 });
  const target = sim.state.simTime + hours * 3600;
  let guard = 0;
  while (sim.state.simTime < target - 1e-6 && guard++ < 100000) sim.step(0.1);
}

const test = (id: PartTest['id']): PartTest => PART_TESTS.find((t) => t.id === id)!;

describe('the catalogue of tests', () => {
  it('every part a test sits on is a frozen part id of the lab', () => {
    for (const t of PART_TESTS) for (const id of t.parts) expect(worldOf(id), `${t.id}: ${id}`).toBeDefined();
  });

  it('the parts of the brief carry their test', () => {
    expect(testsForPart('air-chamber').map((t) => t.id)).toEqual(['air-chamber']);
    expect(testsForPart('snifter').map((t) => t.id)).toEqual(['snifter']);
    expect(testsForPart('waste-valve').map((t) => t.id)).toEqual(['waste-valve']);
    expect(testsForPart('drive-gate-valve').map((t) => t.id)).toEqual(['drive-gate']);
    expect(testsForPart('tank-drain').map((t) => t.id)).toEqual(['tank-drain']);
    expect(testsForPart('buffer-tank').map((t) => t.id)).toEqual(['tank-drain']);
    expect(testsForPart('gauge')).toEqual([]);
  });

  it('switching a test on makes it active, off makes it inactive; toggling flips it', () => {
    for (const t of PART_TESTS) {
      const sim = new RamSim('valve-1');
      expect(t.active(sim), t.id).toBe(false);
      expect(runPartTest(sim, t, true), t.id).toBe(true);
      expect(t.active(sim), t.id).toBe(true);
      expect(runPartTest(sim, t, false), t.id).toBe(false);
      expect(togglePartTest(sim, t)).toBe(true);
      expect(togglePartTest(sim, t)).toBe(false);
    }
  });

  it('a test is asked to be seen: it resumes a paused simulation, and speeds up the time for a slow effect only', () => {
    const sim = new RamSim('valve-1');
    sim.set({ running: false });
    runPartTest(sim, test('air-chamber'), true);
    expect(sim.params.running).toBe(true);
    expect(sim.params.timeScale).toBe(1); // immediate effect: the time is left alone
    runPartTest(sim, test('snifter'), true);
    expect(sim.params.timeScale).toBe(3600);
    // a faster time is not slowed down
    const fast = new RamSim('valve-1');
    fast.set({ timeScale: 3600 });
    runPartTest(fast, test('tank-drain'), true);
    expect(fast.params.timeScale).toBe(3600);
  });

  it('the hands go back to normal at reset, preset and scenario', () => {
    for (const reset of [
      (s: RamSim) => s.reset(),
      (s: RamSim) => s.applyPreset('valve-3'),
      (s: RamSim) => s.applyScenario('short-pipe'),
    ]) {
      const sim = new RamSim('valve-1');
      sim.setTankDrain(true);
      sim.holdValveShut(true);
      sim.setDriveGate(false);
      reset(sim);
      expect(sim.hands).toEqual({ gateOpen: true, valveHeldShut: false, tankDrainOpen: false });
      expect(sim.state.status).toBe('running');
    }
  });

  it('the hands survive an edit of the site', () => {
    const sim = new RamSim('valve-1');
    sim.setDriveGate(false);
    sim.set({ fall: 8 });
    run(sim, 1);
    expect(sim.hands.gateOpen).toBe(false);
    expect(sim.state.status).toBe('stalled');
  });
});

describe('stroke-nut: turn the nut by one step', () => {
  it('in: the stroke falls by 0.1 mm and the ram uses less water and strikes faster; out does the opposite', () => {
    const sim = new RamSim('valve-1');
    const before = sim.averages;
    expect(turnNut(sim, 'in')).toBeCloseTo(2.1, 6);
    sim.solve();
    expect(sim.averages.driveFlow).toBeLessThan(before.driveFlow);
    expect(sim.averages.deliveredFlow).toBeLessThan(before.deliveredFlow);
    expect(sim.averages.strokesPerMin).toBeGreaterThan(before.strokesPerMin);
    expect(turnNut(sim, 'out')).toBeCloseTo(2.2, 6);
    expect(turnNut(sim, 'out')).toBeCloseTo(2.3, 6);
    sim.solve();
    expect(sim.averages.driveFlow).toBeGreaterThan(before.driveFlow);
    expect(NUT_STEP).toBe(0.1);
  });

  it('a click is worth seeing: about 10 % of the water used and 15 % of the delivery at the video’s setting', () => {
    const sim = new RamSim('valve-1');
    const b = sim.averages;
    turnNut(sim, 'in');
    sim.solve();
    expect(Math.abs(sim.averages.driveFlow / b.driveFlow - 1)).toBeGreaterThan(0.05);
    expect(Math.abs(sim.averages.deliveredFlow / b.deliveredFlow - 1)).toBeGreaterThan(0.08);
  });

  it('stops at the ends of the range, and a paused simulation is resumed', () => {
    const sim = new RamSim('valve-1');
    sim.set({ stroke: 0.5, running: false });
    expect(turnNut(sim, 'in')).toBe(0.5);
    expect(sim.params.running).toBe(true);
    sim.set({ stroke: 8 });
    expect(turnNut(sim, 'out')).toBe(8);
  });

  it('turned in step after step, the delivery stops near 1.5 mm like the scenario (13:13 of the video)', () => {
    const sim = new RamSim('valve-1');
    let clicks = 0;
    while (sim.params.stroke > 1.0) {
      turnNut(sim, 'in');
      clicks++;
      sim.solve();
      if (sim.averages.deliveredFlow < 0.001) break;
    }
    expect(sim.params.stroke).toBeGreaterThan(1.2);
    expect(sim.params.stroke).toBeLessThan(1.8);
    expect(clicks).toBeLessThan(10);
    run(sim, 0.2);
    expect(sim.state.alarms).toContain('noDelivery');
  });
});

describe('air-chamber: drown the chamber', () => {
  it('the air goes at once, the peaks get harsher and the delivery falls by a third or more; refilling restores it', () => {
    const sim = new RamSim('valve-1');
    run(sim, 1);
    const before = { ...sim.state };
    runPartTest(sim, test('air-chamber'), true);
    run(sim, 1);
    expect(sim.state.airFraction).toBeLessThan(0.01);
    expect(sim.state.airLevel).toBeLessThan(before.airLevel * 0.2);
    expect(sim.state.alarms).toContain('waterLogged');
    expect(sim.averages.peakPressure).toBeGreaterThan(before.peakPressure);
    expect(sim.state.deliveredPerDay).toBeLessThan(0.75 * before.deliveredPerDay);
    runPartTest(sim, test('air-chamber'), false);
    run(sim, 1);
    expect(sim.state.airFraction).toBeGreaterThan(0.5);
    expect(sim.state.alarms).not.toContain('waterLogged');
    expect(Math.abs(sim.state.deliveredPerDay / before.deliveredPerDay - 1)).toBeLessThan(0.05);
  });
});

describe('snifter: block it', () => {
  it('the alarm rises at once, and at ×3600 the chamber floods within a day (air < 5 %) and the delivery falls', () => {
    const sim = new RamSim('valve-1');
    run(sim, 1);
    const before = sim.state.deliveredPerDay;
    runPartTest(sim, test('snifter'), true);
    expect(sim.state.alarms).toContain('snifterBlocked');
    expect(sim.params.timeScale).toBe(3600);
    expect(sim.state.alarms).not.toContain('waterLogged'); // not yet: the fault is slow
    runSimulated(sim, 20);
    expect(sim.state.airFraction).toBeLessThan(0.05);
    expect(sim.state.alarms).toContain('waterLogged');
    expect(sim.state.deliveredPerDay).toBeLessThan(0.93 * before); // the last bubbles still cushion the pulse a little
    runSimulated(sim, 12);
    expect(sim.state.airFraction).toBeLessThan(0.01);
    expect(sim.state.deliveredPerDay).toBeLessThan(0.8 * before);
    // unblocking brings the air back within hours
    runPartTest(sim, test('snifter'), false);
    runSimulated(sim, 3);
    expect(sim.state.airFraction).toBeGreaterThan(0.5);
  });
});

describe('waste-valve: hold it shut by hand', () => {
  it('stops the ram: no strokes, no jet, the valve shut, the cause in the alarms; the tank refills', () => {
    const sim = new RamSim('valve-3');
    runSimulated(sim, 4); // a few hours of the over-consuming valve: the tank is lower
    sim.set({ timeScale: 1, slowMo: 1 });
    const tank = sim.state.tankLitres;
    expect(tank).toBeLessThan(TANK_VOLUME_DERIVED);
    runPartTest(sim, test('waste-valve'), true);
    run(sim, 0.5);
    const s = sim.state;
    expect(s.status).toBe('stalled');
    expect(s.stallReason).toBe('hand');
    expect(s.valveHeldShut).toBe(true);
    expect(s.alarms).toContain('heldShut');
    expect(s.alarms).not.toContain('stalledTank');
    expect(s.phase).toBe('stalled');
    expect(s.wasteValve).toBe(0);
    expect(s.wasteJetFlow).toBe(0);
    expect(s.driveFlow).toBe(0);
    expect(s.strokesPerMin).toBe(0);
    expect(s.deliveredPerDay).toBe(0);
    // the water that was being used now fills the tank at the full spring flow
    runSimulated(sim, 2);
    expect(sim.state.tankLitres - tank).toBeCloseTo(SOURCE_FLOW_TODAY * 120, -2);
  });

  it('letting go restarts the ram, and so does the "restart" of the panel', () => {
    const sim = new RamSim('valve-1');
    run(sim, 1);
    runPartTest(sim, test('waste-valve'), true);
    expect(sim.state.status).toBe('stalled');
    runPartTest(sim, test('waste-valve'), false);
    expect(sim.state.status).toBe('running');
    const n = sim.state.strokeCount;
    run(sim, 2);
    expect(sim.state.strokeCount).toBeGreaterThan(n + 2);
    expect(sim.state.deliveredPerDay).toBeGreaterThan(300);
    // the restart button does the same job
    runPartTest(sim, test('waste-valve'), true);
    expect(sim.restart()).toBe(true);
    expect(sim.state.status).toBe('running');
    expect(sim.state.valveHeldShut).toBe(false);
    expect(test('waste-valve').active(sim)).toBe(false);
  });

  it('holding the valve and stalling on an empty tank do not mix: no restart without water', () => {
    const sim = new RamSim('valve-1');
    sim.setDriveGate(false);
    expect(sim.restart()).toBe(false); // the gate is closed
    sim.setDriveGate(true);
    expect(sim.state.status).toBe('running');
  });
});

describe('drive-gate: close the gate valve of the drive pipe', () => {
  it('the ram stops at once, the tank fills at the spring flow, and the cause is named', () => {
    const sim = new RamSim('valve-3');
    runSimulated(sim, 6);
    sim.set({ timeScale: 1, slowMo: 1 });
    const tank = sim.state.tankLitres;
    expect(sim.state.status).toBe('running');
    runPartTest(sim, test('drive-gate'), true);
    const s = sim.state;
    expect(s.status).toBe('stalled');
    expect(s.stallReason).toBe('gate');
    expect(s.gateOpen).toBe(false);
    expect(s.alarms).toContain('gateClosed');
    expect(s.alarms).not.toContain('stalledTank');
    expect(s.driveFlow).toBe(0);
    expect(s.driveVelocity).toBe(0);
    expect(s.wasteJetFlow).toBe(0);
    expect(sim.restart()).toBe(false); // the panel's restart cannot open a closed gate
    expect(sim.params.timeScale).toBe(600);
    runSimulated(sim, 1);
    expect(sim.state.tankLitres - tank).toBeCloseTo(SOURCE_FLOW_TODAY * 60, -2);
  });

  it('it saves the over-consuming ram from the dry tank: closed in time, the tank does not run out; opened, it works again', () => {
    const sim = new RamSim('valve-3');
    runSimulated(sim, 8); // the tank would be empty at ≈ 10 h
    expect(sim.state.status).toBe('running');
    runPartTest(sim, test('drive-gate'), true);
    runSimulated(sim, 6); // 14 h in all: without the gate the ram would have stopped
    expect(sim.state.stallReason).toBe('gate');
    // 8 h at 9.5 L/min of deficit leave 20 % of the tank, 6 h of the full spring bring it back to 67 %
    expect(sim.state.tankLitres).toBeGreaterThan(0.6 * TANK_VOLUME_DERIVED);
    expect(sim.state.tankLitres).toBeLessThan(0.75 * TANK_VOLUME_DERIVED);
    runPartTest(sim, test('drive-gate'), false);
    expect(sim.state.status).toBe('running');
    expect(sim.state.gateOpen).toBe(true);
    expect(sim.state.alarms).not.toContain('gateClosed');
    run(sim, 0.5);
    expect(sim.state.strokesPerMin).toBeGreaterThan(60);
    expect(sim.state.driveFlow).toBeGreaterThan(10);
  });

  it('reopening on an empty tank with an over-consuming ram stops it again for lack of water (the cause is the tank, not the gate)', () => {
    const sim = new RamSim('valve-3');
    sim.setDriveGate(false);
    sim.setDriveGate(true);
    expect(sim.state.status).toBe('running');
    sim.setDriveGate(false);
    runSimulated(sim, 1);
    sim.setDriveGate(true);
    runSimulated(sim, 14);
    expect(sim.state.status).toBe('stalled');
    expect(sim.state.stallReason).toBe('tank');
  });
});

describe('tank-drain: open the drain of the buffer tank', () => {
  it('empties the 5 700 L tank in ≈ 38 minutes at 150 L/min (assumed), and shows the flow', () => {
    const sim = new RamSim('valve-1');
    runPartTest(sim, test('tank-drain'), true);
    expect(sim.state.tankDrainOpen).toBe(true);
    expect(sim.state.tankDrainFlow).toBe(150);
    expect(sim.state.alarms).toContain('drainOpen');
    expect(sim.params.timeScale).toBe(600);
    expect(sim.state.hoursToEmpty * 60).toBeGreaterThan(30);
    expect(sim.state.hoursToEmpty * 60).toBeLessThan(45);
    runSimulated(sim, 0.5);
    expect(sim.state.tankLitres).toBeGreaterThan(0.2 * TANK_VOLUME_DERIVED);
    runSimulated(sim, 0.3);
    expect(sim.state.tankLitres).toBe(0);
    expect(sim.state.tankDrainFlow).toBe(0); // nothing left to drain
  });

  it('the n°1 valve does not care (it takes less than the spring), the n°3 valve stops at once for lack of water', () => {
    const calm = new RamSim('valve-1');
    runPartTest(calm, test('tank-drain'), true);
    runSimulated(calm, 2);
    expect(calm.state.tankLitres).toBe(0);
    expect(calm.state.status).toBe('running');
    expect(calm.state.deliveredPerDay).toBeGreaterThan(400);

    const thirsty = new RamSim('valve-3');
    runPartTest(thirsty, test('tank-drain'), true);
    runSimulated(thirsty, 2);
    expect(thirsty.state.status).toBe('stalled');
    expect(thirsty.state.stallReason).toBe('tank');
    expect(thirsty.state.alarms).toContain('stalledTank');
  });

  it('closing the drain stops the loss; the tank then refills at the spring flow minus the ram’s use', () => {
    const sim = new RamSim('valve-1');
    runPartTest(sim, test('tank-drain'), true);
    runSimulated(sim, 0.2);
    const mid = sim.state.tankLitres;
    runPartTest(sim, test('tank-drain'), false);
    expect(sim.state.tankDrainFlow).toBe(0);
    expect(sim.state.alarms).not.toContain('drainOpen');
    runSimulated(sim, 1);
    expect(sim.state.tankLitres).toBeGreaterThanOrEqual(mid);
    expect(sim.state.tankLitres).toBeLessThan(mid + 100); // (7.5 − 6.7) L/min for an hour
  });
});
