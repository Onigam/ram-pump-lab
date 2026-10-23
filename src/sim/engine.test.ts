import { describe, expect, it } from 'vitest';
import { RamSim } from './engine';
import { maxDelivery, minClosingVelocity, WAVE_SPEED } from './physics';
import {
  NUT_INTERVAL,
  presetParams,
  SCENARIO_IDS,
  SOURCE_FLOW_TODAY,
  TANK_VOLUME_DERIVED,
  VALVE_SETTINGS,
} from './presets';
import type { PresetId, RamParams, ScenarioId } from './types';

// The figures of the source video (docs/research.md §2, K-numbers) are retrieved by the simulation. Each test names the
// K-number, the source and the tolerance. Tolerances come from the lead's brief; the model is calibrated on K8, K10 and
// K11 (docs/physics.md), the others are checks.

const DAY = 86400;

/** Run the simulation in real time, frame by frame. */
function run(sim: RamSim, seconds: number, dt = 1 / 60): void {
  const n = Math.round(seconds / dt);
  for (let i = 0; i < n; i++) sim.step(dt);
}

/**
 * Run at ×3600 until a simulated duration has elapsed (frames of 0.1 s real = 360 s simulated). The stroke cycle is
 * slowed to ×1/50 meanwhile so that the long runs stay fast: only the slow quantities are under test there.
 */
function runSimulated(sim: RamSim, hours: number): void {
  sim.set({ timeScale: 3600, slowMo: 0.02 });
  const target = sim.state.simTime + hours * 3600;
  let guard = 0;
  while (sim.state.simTime < target - 1e-6 && guard++ < 100000) sim.step(0.1);
}

function preset(id: PresetId): RamSim {
  return new RamSim(id);
}

describe('the site of the video (K1–K7)', () => {
  it('K1, K2, K3, K5, K6: the presets use the reported site', () => {
    for (const id of ['valve-1', 'valve-2', 'valve-3'] as PresetId[]) {
      const p = presetParams(id);
      expect(p.driveDiameter).toBe(27); // K5: a generic 1" ram (the Walton n°3 is a 1" class), inner bore of a DN25 pipe
      expect(p.fall).toBe(7.5); // K1, S1 01:55
      expect(p.driveLength).toBe(20); // K2, S1 01:55
      expect(p.deliveryHead).toBe(65); // K3, S1 02:01
      expect(p.deliveryLength).toBe(300); // K3, S1 01:15
      expect(p.sourceFlow).toBe(SOURCE_FLOW_TODAY); // K6: 7.5–7.8 L/min today
    }
    const s = preset('valve-1').state;
    expect(s.lengthRatio).toBeCloseTo(2.67, 2); // K2: L/h = 2.7
    expect(s.liftRatio).toBeCloseTo(8.67, 2); // K3: H/h = 8.7
  });

  it('K7: the valve of each preset is the n°1, n°2 or n°3 (DN15, DN20, DN25)', () => {
    expect(presetParams('valve-1').valve).toBe(1);
    expect(presetParams('valve-2').valve).toBe(2);
    expect(presetParams('valve-3').valve).toBe(3);
  });

  it('K4: the ram lifts to H/h = 10 whatever the length of the drive pipe (12–40 m)', () => {
    // research K4: "1 m of fall lifts water 10 m, even if the pipe is very long"; ±10 % on the closing velocity
    const sim = preset('valve-1');
    const closing: number[] = [];
    for (const L of [12, 20, 40]) {
      const m = sim.sweep({ driveLength: L, deliveryHead: 75 });
      expect(m.deliveredFlow).toBeGreaterThan(0.02);
      closing.push(m.closingVelocity);
    }
    const mean = closing.reduce((a, b) => a + b, 0) / closing.length;
    for (const v of closing) expect(Math.abs(v / mean - 1)).toBeLessThan(0.1);
  });
});

describe('K8 / K21: the n°3 valve over-consumes and the ram stops', () => {
  const sim = preset('valve-3');
  const m = sim.averages;

  it('K8: consumes ≈ 17 L/min (±20 %)', () => {
    expect(m.driveFlow).toBeGreaterThan(17 * 0.8);
    expect(m.driveFlow).toBeLessThan(17 * 1.2);
  });

  it('K11: the older, larger valve strikes 70–80 times a minute (±10 %)', () => {
    expect(m.strokesPerMin).toBeGreaterThan(70 * 0.9);
    expect(m.strokesPerMin).toBeLessThan(80 * 1.1);
  });

  it('K8: it takes more than the 7.5 L/min of the spring, so the buffer tank empties in 8–12 h', () => {
    expect(m.driveFlow).toBeGreaterThan(SOURCE_FLOW_TODAY);
    const hours = TANK_VOLUME_DERIVED / (m.driveFlow - SOURCE_FLOW_TODAY) / 60;
    expect(hours).toBeGreaterThan(8);
    expect(hours).toBeLessThan(12);
    expect(sim.state.hoursToEmpty).toBeCloseTo(hours, 1);
  });

  it('K8: run at ×3600, the ram stops (status stalled, tank empty) after 8–12 simulated hours', () => {
    const s = preset('valve-3');
    expect(s.state.status).toBe('running');
    s.set({ timeScale: 3600 });
    let hours = -1;
    for (let i = 0; i < 20 * 14 && hours < 0; i++) {
      s.step(0.05);
      if (s.state.status === 'stalled') hours = s.state.simTime / 3600;
    }
    expect(hours).toBeGreaterThan(8);
    expect(hours).toBeLessThan(12);
    expect(s.state.stallReason).toBe('tank');
    expect(s.state.tankLitres).toBe(0);
    expect(s.state.alarms).toContain('stalledTank');
  });

  it('K8 and K21 agree: a 1" ram needs 17–23 L/min (S4 table 2: 22.7), far more than the 7.5 L/min spring', () => {
    expect(m.driveFlow).toBeGreaterThan(14);
    expect(m.driveFlow).toBeLessThan(23);
    // and it delivers well under the 7.6 m³/day that S4 gives as the maximum of a 1" ram
    expect(sim.state.deliveredPerDay).toBeLessThan(7600);
  });

  it('K19: the stroke rates of all the presets stay in the 40–120 per minute of the literature (S4, S5)', () => {
    for (const id of ['valve-1', 'valve-2', 'valve-3'] as PresetId[]) {
      const n = preset(id).averages.strokesPerMin;
      expect(n).toBeGreaterThan(40);
      expect(n).toBeLessThan(120);
    }
  });
});

describe('K9: the n°2 valve works badly and still consumes too much', () => {
  it('consumes more than the spring (and than the n°1), less than the n°3, and drains the tank in about a day', () => {
    const m1 = preset('valve-1').averages;
    const sim = preset('valve-2');
    const m2 = sim.averages;
    const m3 = preset('valve-3').averages;
    expect(m2.driveFlow).toBeGreaterThan(SOURCE_FLOW_TODAY);
    expect(m2.driveFlow).toBeGreaterThan(m1.driveFlow);
    expect(m2.driveFlow).toBeLessThan(m3.driveFlow);
    expect(sim.state.hoursToEmpty).toBeGreaterThan(12);
    expect(sim.state.hoursToEmpty).toBeLessThan(72);
  });
});

describe('K10–K13: the n°1 valve delivers 500 L/day at 100–110 strokes/min', () => {
  const sim = preset('valve-1');
  const m = sim.averages;
  const s = sim.state;

  it('K10: delivers ≈ 500 L/day with the 7.5 L/min spring (±25 %)', () => {
    expect(s.deliveredPerDay).toBeGreaterThan(500 * 0.75);
    expect(s.deliveredPerDay).toBeLessThan(500 * 1.25);
  });

  it('K11: strikes 100–110 times a minute (±10 %)', () => {
    expect(m.strokesPerMin).toBeGreaterThan(100 * 0.9);
    expect(m.strokesPerMin).toBeLessThan(110 * 1.1);
  });

  it('K12: delivers 3.2–3.5 mL per stroke (±25 %)', () => {
    expect(m.deliveredPerStroke).toBeGreaterThan(3.2 * 0.75);
    expect(m.deliveredPerStroke).toBeLessThan(3.5 * 1.25);
    expect(m.deliveredPerStroke).toBeCloseTo((m.deliveredFlow / m.strokesPerMin) * 1000, 6);
  });

  it("K13: the D'Aubuisson efficiency q·H/(Q·h) is between 0.3 and 0.6", () => {
    expect(m.etaD).toBeGreaterThan(0.3);
    expect(m.etaD).toBeLessThan(0.6);
    expect(m.etaD).toBeCloseTo((m.deliveredFlow * 65) / (m.driveFlow * 7.5), 6);
    expect(s.etaD).toBe(m.etaD);
  });

  it('K8 (the new valve fixes it): it takes less than the spring gives, so it never stops', () => {
    expect(m.driveFlow).toBeLessThan(SOURCE_FLOW_TODAY);
    expect(s.hoursToEmpty).toBe(Infinity);
    const week = preset('valve-1');
    runSimulated(week, 7 * 24);
    expect(week.state.status).toBe('running');
    expect(week.state.tankLevel).toBe(1);
    // and a week of deliveries is 7 × the daily figure
    expect(week.state.deliveredTotal).toBeCloseTo(7 * week.state.deliveredPerDay, -1);
  });

  it('delivers far less than the n°3 for much less water: the n°1 is the more frugal valve', () => {
    const m3 = preset('valve-3').averages;
    expect(m.driveFlow).toBeLessThan(m3.driveFlow / 2);
    expect(m.deliveredFlow).toBeLessThan(m3.deliveredFlow);
  });
});

describe('K14 / energy: nothing is created', () => {
  const all: [string, RamSim][] = [
    ...(['valve-1', 'valve-2', 'valve-3'] as PresetId[]).map((id): [string, RamSim] => [id, preset(id)]),
    ...SCENARIO_IDS.map((id): [string, RamSim] => {
      const sim = preset('valve-1');
      sim.applyScenario(id);
      return [id, sim];
    }),
  ];

  it.each(all)(
    'K14: %s delivers no more than Q·h/H (η ≤ 1) and the delivered power is below the input power',
    (_n, sim) => {
      const m = sim.averages;
      const p = sim.params;
      expect(m.deliveredFlow).toBeLessThanOrEqual(maxDelivery(m.driveFlow, p.deliveryHead, p.fall) + 1e-9);
      expect(m.etaD).toBeLessThanOrEqual(1);
      expect(m.etaR).toBeLessThanOrEqual(1.2);
      // power in = ρ g h Q, power out = ρ g H q, in W
      const pIn = 9810 * p.fall * (m.driveFlow / 60000);
      const pOut = 9810 * p.deliveryHead * (m.deliveredFlow / 60000);
      expect(pOut).toBeLessThanOrEqual(pIn);
    },
  );

  it('K14: holds over a deterministic sweep of 16 sites and valves', () => {
    const sim = preset('valve-1');
    let seed = 20261023;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    let delivering = 0;
    for (let i = 0; i < 16; i++) {
      const patch: Partial<RamParams> = {
        fall: 3 + rnd() * 20,
        driveLength: 8 + rnd() * 50,
        driveDiameter: 20 + rnd() * 30,
        deliveryHead: 12 + rnd() * 120,
        valve: (1 + Math.floor(rnd() * 3)) as 1 | 2 | 3,
        stroke: 1 + rnd() * 5,
        counterweight: 100 + rnd() * 800,
        pipeMaterial: (['steel', 'pvc', 'hdpe'] as const)[Math.floor(rnd() * 3)],
      };
      const m = sim.sweep(patch);
      const p = { ...sim.params, ...patch };
      for (const x of [m.strokesPerMin, m.driveFlow, m.deliveredFlow, m.etaD, m.etaR, m.peakPressure]) {
        expect(Number.isFinite(x)).toBe(true);
      }
      expect(m.deliveredFlow).toBeLessThanOrEqual(maxDelivery(m.driveFlow, p.deliveryHead, p.fall) * 1.0001 + 1e-9);
      expect(m.etaD).toBeLessThanOrEqual(1);
      if (m.deliveredFlow > 0.01) delivering++;
    }
    expect(delivering).toBeGreaterThan(1); // the sweep is not trivially empty
  });
});

describe('K15: no delivery below the minimum closing velocity', () => {
  const sim = preset('valve-1');
  const a = WAVE_SPEED.steel;

  it('the minimum closing velocity for the video site is 0.5–0.65 m/s', () => {
    expect(sim.state.minClosingVelocity).toBeCloseTo(minClosingVelocity(7.5, 65, a), 9);
    expect(sim.state.minClosingVelocity).toBeGreaterThan(0.5);
    expect(sim.state.minClosingVelocity).toBeLessThan(0.65);
    expect(sim.state.waveSpeed).toBe(a);
  });

  it('turning the stroke nut: the ram delivers only if the valve closes faster than that, within ±15 %', () => {
    const vMin = sim.state.minClosingVelocity;
    let below = 0;
    let above = 0;
    for (let stroke = 0.6; stroke <= 3; stroke += 0.2) {
      const m = sim.sweep({ stroke });
      if (m.closingVelocity < vMin * 0.85) {
        expect(m.deliveredFlow).toBeLessThan(0.005);
        below++;
      }
      if (m.closingVelocity > vMin * 1.15) {
        expect(m.deliveredFlow).toBeGreaterThan(0.02);
        above++;
      }
    }
    expect(below).toBeGreaterThan(2);
    expect(above).toBeGreaterThan(2);
  });

  it('a higher lift needs a faster closing: the n°1 valve cannot lift to H/h = 13', () => {
    const m = sim.sweep({ deliveryHead: 100 });
    expect(m.closingVelocity).toBeLessThan(minClosingVelocity(7.5, 100, a));
    expect(m.deliveredFlow).toBe(0);
    expect(m.strokesPerMin).toBeGreaterThan(0); // it still strikes, it just does not pump
  });

  it('a plastic drive pipe (wave speed 350–500 m/s) gives a surge too weak to open the check valve', () => {
    for (const pipeMaterial of ['hdpe', 'pvc'] as const) {
      const m = sim.sweep({ pipeMaterial });
      expect(m.deliveredFlow).toBe(0);
    }
    expect(sim.sweep({ pipeMaterial: 'steel' }).deliveredFlow).toBeGreaterThan(0.2);
  });

  it('the surge shown in the state is ρ·a·v at the closing velocity', () => {
    const s = sim.state;
    expect(s.surgeBar).toBeCloseTo((1000 * a * s.closingVelocity) / 1e5, 6);
    expect(s.surgeBar).toBeGreaterThan(s.deliveryStaticBar - 0.74); // enough to lift from the static head to H
  });
});

describe("K17, K18: the model's best tuned ram reaches the literature's efficiency", () => {
  it('η_D reaches 0.6–0.85 for the best stroke and weight (S4: 0.6, up to 0.8 in S6) and q = η·Q·h/H', () => {
    const sim = preset('valve-3');
    let best = 0;
    for (const stroke of [2.4, 3.6, 4.2]) {
      for (const counterweight of [0, 50, 200]) {
        const m = sim.sweep({ stroke, counterweight });
        best = Math.max(best, m.etaD);
        expect(m.deliveredFlow).toBeCloseTo(m.etaD * maxDelivery(m.driveFlow, 65, 7.5), 9);
      }
    }
    expect(best).toBeGreaterThan(0.6);
    expect(best).toBeLessThan(0.85);
  });
});

describe('state machine: running → stalled → restart', () => {
  it('the ram stops when the tank is empty, stays stopped while the tank refills, restarts by hand', () => {
    const sim = preset('valve-3');
    runSimulated(sim, 11);
    expect(sim.state.status).toBe('stalled');
    expect(sim.state.phase).toBe('stalled');
    expect(sim.state.strokesPerMin).toBe(0);
    expect(sim.state.driveFlow).toBe(0);
    expect(sim.state.deliveredFlow).toBe(0);
    expect(sim.state.wasteValve).toBe(1); // the valve hangs open
    expect(sim.state.driveVelocity).toBe(0);
    // the spring refills the tank, but nothing restarts the ram by itself
    const before = sim.state.tankLitres;
    runSimulated(sim, 1);
    expect(sim.state.tankLitres).toBeGreaterThan(before);
    expect(sim.state.tankLitres).toBeCloseTo(before + 7.5 * 60, -1);
    expect(sim.state.status).toBe('stalled');
    const delivered = sim.state.deliveredTotal;
    // manual restart
    expect(sim.restart()).toBe(true);
    expect(sim.state.status).toBe('running');
    expect(sim.state.stallReason).toBe('none');
    sim.set({ timeScale: 1, slowMo: 1 });
    run(sim, 5);
    expect(sim.state.phase).not.toBe('stalled');
    expect(sim.state.strokesPerMin).toBeGreaterThan(60);
    expect(sim.state.deliveredTotal).toBeGreaterThan(delivered);
    // with only one hour of water in the tank it stops again after ≈ 1 h × 7.5 / (17.4 − 7.5) hours
    runSimulated(sim, 3);
    expect(sim.state.status).toBe('stalled');
  });

  it('a restart is refused when there is no water left to prime the ram', () => {
    const sim = preset('valve-3');
    sim.set({ tankVolume: 200, timeScale: 60 });
    let guard = 0;
    while (sim.state.status === 'running' && guard++ < 10000) sim.step(0.05);
    expect(sim.state.status).toBe('stalled');
    expect(sim.state.tankLitres).toBe(0); // the frame that stalls the ram ends on an empty tank
    expect(sim.restart()).toBe(false);
    expect(sim.state.status).toBe('stalled');
    // later, once the spring has put a little water back, the restart works
    run(sim, 2);
    expect(sim.state.tankLitres).toBeGreaterThan(1);
    expect(sim.restart()).toBe(true);
  });

  it('a very low lift (H barely above the fall) leaves the waste valve shut: stalled, reason "stuck"', () => {
    const sim = preset('valve-1');
    sim.set({ deliveryHead: 9 });
    sim.solve();
    run(sim, 1);
    expect(sim.state.status).toBe('stalled');
    expect(sim.state.stallReason).toBe('stuck');
    expect(sim.state.wasteValve).toBe(0);
    expect(sim.state.alarms).toContain('stalledStuck');
  });
});

describe('two time regimes', () => {
  it('a simulated day at ×3600 delivers the same volume as the mean rate × 1 day (±2 %)', () => {
    const sim = preset('valve-1');
    sim.set({ timeScale: 3600 });
    // 24 s of real time in frames of 0.05 s
    for (let i = 0; i < 480; i++) sim.step(0.05);
    const m = sim.averages;
    expect(sim.state.simTime).toBeCloseTo(DAY, 3);
    expect(sim.state.deliveredTotal).toBeGreaterThan(m.deliveredFlow * 1440 * 0.98);
    expect(sim.state.deliveredTotal).toBeLessThan(m.deliveredFlow * 1440 * 1.02);
    expect(sim.state.drivenTotal).toBeCloseTo(m.driveFlow * 1440, 0);
  });

  it('...and the same as an independent solve of the cycle model, and as the live stroke-by-stroke simulation', () => {
    const sim = preset('valve-1');
    const independent = sim.sweep({}).deliveredFlow;
    expect(independent * 1440).toBeGreaterThan(sim.averages.deliveredFlow * 1440 * 0.98);
    expect(independent * 1440).toBeLessThan(sim.averages.deliveredFlow * 1440 * 1.02);
    // 45 s of real strokes, 1/60 s frames: the water that really went through the check valve
    const live = preset('valve-1');
    let volume = 0;
    let driven = 0;
    let strokes = 0;
    const frames = 45 * 60;
    for (let i = 0; i < frames; i++) {
      live.step(1 / 60);
      volume += live.state.deliveredFlowNow / 60 / 60; // L
      driven += live.state.driveFlowNow / 60 / 60;
      strokes = live.state.strokeCount;
    }
    const minutes = frames / 60 / 60;
    expect(volume / minutes).toBeGreaterThan(live.averages.deliveredFlow * 0.9);
    expect(volume / minutes).toBeLessThan(live.averages.deliveredFlow * 1.1);
    expect(driven / minutes).toBeGreaterThan(live.averages.driveFlow * 0.94);
    expect(driven / minutes).toBeLessThan(live.averages.driveFlow * 1.06);
    expect(strokes / minutes).toBeGreaterThan(live.averages.strokesPerMin * 0.94);
    expect(strokes / minutes).toBeLessThan(live.averages.strokesPerMin * 1.06);
  });

  it('the result does not depend on the frame size', () => {
    const a = preset('valve-1');
    const b = preset('valve-1');
    a.set({ timeScale: 600, slowMo: 0.02 });
    b.set({ timeScale: 600, slowMo: 0.02 });
    run(a, 60, 1 / 120);
    run(b, 60, 0.1);
    expect(a.state.simTime).toBeCloseTo(b.state.simTime, 6);
    expect(a.state.deliveredTotal).toBeCloseTo(b.state.deliveredTotal, 6);
  });

  it('slowMo slows the stroke cycle only, not the tank, the volumes or the clock', () => {
    const fast = preset('valve-1');
    const slow = preset('valve-1');
    slow.set({ slowMo: 0.2 });
    fast.set({ timeScale: 60 });
    slow.set({ timeScale: 60 });
    run(fast, 20);
    run(slow, 20);
    expect(slow.state.strokeCount).toBeGreaterThan(0);
    expect(slow.state.strokeCount / fast.state.strokeCount).toBeGreaterThan(0.12);
    expect(slow.state.strokeCount / fast.state.strokeCount).toBeLessThan(0.28);
    expect(slow.state.simTime).toBeCloseTo(fast.state.simTime, 6);
    expect(slow.state.deliveredTotal).toBeCloseTo(fast.state.deliveredTotal, 6);
  });

  it('pause freezes everything', () => {
    const sim = preset('valve-1');
    run(sim, 3);
    sim.set({ running: false });
    const snap = JSON.stringify(sim.state);
    run(sim, 5);
    expect(JSON.stringify(sim.state)).toBe(snap);
  });

  it('the clock shows the hour of the day and the daily volume restarts at midnight', () => {
    const sim = preset('valve-1');
    expect(sim.state.hour).toBe(8);
    runSimulated(sim, 12);
    expect(sim.state.day).toBe(0);
    expect(sim.state.hour).toBeCloseTo(20, 3);
    expect(sim.state.deliveredToday).toBeCloseTo(sim.state.deliveredTotal, 6);
    runSimulated(sim, 6);
    expect(sim.state.day).toBe(1);
    expect(sim.state.hour).toBeCloseTo(2, 3);
    // 2 h since midnight
    expect(sim.state.deliveredToday).toBeCloseTo(sim.state.deliveredPerDay / 12, 0);
    expect(sim.state.deliveredTotal).toBeCloseTo((sim.state.deliveredPerDay * 18) / 24, 0);
  });
});

describe('the live stroke cycle', () => {
  it('goes through the four phases and keeps every visual field in range', () => {
    const sim = preset('valve-1');
    const seen = new Set<string>();
    let minV = Infinity;
    let maxV = -Infinity;
    let maxP = 0;
    let closedFrames = 0;
    let midFrames = 0;
    let prevValve = sim.state.wasteValve;
    let maxStep = 0;
    for (let i = 0; i < 60 * 30; i++) {
      sim.step(1 / 240);
      const s = sim.state;
      seen.add(s.phase);
      expect(s.wasteValve).toBeGreaterThanOrEqual(0);
      expect(s.wasteValve).toBeLessThanOrEqual(1);
      expect(s.deliveryValve).toBeGreaterThanOrEqual(0);
      expect(s.deliveryValve).toBeLessThanOrEqual(1);
      expect(s.cycleProgress).toBeGreaterThanOrEqual(0);
      expect(s.cycleProgress).toBeLessThanOrEqual(1);
      expect(s.airLevel).toBeGreaterThan(0);
      expect(s.airLevel).toBeLessThanOrEqual(1);
      expect(Number.isFinite(s.bodyPressure)).toBe(true);
      expect(s.wasteJetFlow).toBeGreaterThanOrEqual(0);
      expect(s.deliveredFlowNow).toBeGreaterThanOrEqual(0);
      minV = Math.min(minV, s.driveVelocity);
      maxV = Math.max(maxV, s.driveVelocity);
      maxP = Math.max(maxP, s.bodyPressure);
      if (s.wasteValve === 0) closedFrames++;
      else if (s.wasteValve < 1) midFrames++;
      maxStep = Math.max(maxStep, Math.abs(s.wasteValve - prevValve));
      prevValve = s.wasteValve;
    }
    expect([...seen].sort()).toEqual(['accel', 'close', 'deliver', 'recoil']);
    expect(maxV).toBeGreaterThan(0.7); // the closing velocity of the n°1 valve
    expect(maxV).toBeLessThan(1.1);
    expect(minV).toBeLessThan(-0.3); // the recoil reverses the flow
    expect(maxP).toBeGreaterThan(5.5); // the delivery pressure is reached (6.4 bar static)
    expect(maxP).toBeLessThan(8);
    expect(closedFrames).toBeGreaterThan(0);
    // the valve passes through intermediate positions (the closing and opening take a few ms), never jumps by more than half
    expect(midFrames).toBeGreaterThan(20);
    expect(maxStep).toBeLessThan(0.5);
  });

  it('the cycle counters match the averages after half a minute', () => {
    const sim = preset('valve-1');
    run(sim, 30);
    const expected = (sim.averages.strokesPerMin * 30) / 60;
    expect(sim.state.strokeCount).toBeGreaterThan(expected * 0.94);
    expect(sim.state.strokeCount).toBeLessThan(expected * 1.06);
  });

  it('the pressure, velocity and valve scope keeps the last second and a half of strokes', () => {
    const sim = preset('valve-1');
    run(sim, 5);
    const sc = sim.scope;
    expect(sc.t.length).toBe(sc.pressure.length);
    expect(sc.t.length).toBe(sc.velocity.length);
    expect(sc.t.length).toBe(sc.valve.length);
    expect(sc.t.length).toBeGreaterThan(300);
    expect(sc.t.length).toBeLessThanOrEqual(400);
    expect(sc.t[sc.t.length - 1] - sc.t[0]).toBeGreaterThan(1.2);
    expect(Math.max(...sc.pressure)).toBeGreaterThan(5);
  });
});

describe('live editing', () => {
  it('random edits of every parameter, frame after frame, never produce a non-finite state', () => {
    const sim = preset('valve-1');
    let seed = 4242;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const finite = (x: number) => Number.isFinite(x) || x === Infinity; // hoursToEmpty is Infinity when it never empties
    for (let frame = 0; frame < 8 * 60; frame++) {
      if (frame % 20 === 0) {
        sim.set({
          fall: 2 + rnd() * 28,
          driveLength: 5 + rnd() * 55,
          driveDiameter: 15 + rnd() * 39,
          deliveryHead: 5 + rnd() * 145,
          valve: (1 + Math.floor(rnd() * 3)) as 1 | 2 | 3,
          stroke: 0.5 + rnd() * 7.5,
          counterweight: rnd() * 1000,
          chamberVolume: 0.5 + rnd() * 19.5,
          pipeMaterial: (['steel', 'pvc', 'hdpe'] as const)[Math.floor(rnd() * 3)],
          snifterBlocked: rnd() < 0.3,
          waterLogged: rnd() < 0.2,
        });
      }
      if (frame % 300 === 299) sim.restart();
      sim.step(1 / 60);
      for (const [key, value] of Object.entries(sim.state)) {
        if (typeof value === 'number') expect(finite(value), key).toBe(true);
      }
    }
  });
});

describe('monotone behaviours', () => {
  const sim = preset('valve-1');

  it('a higher lift H/h gives less delivery (and then none)', () => {
    let previous = Infinity;
    for (const head of [20, 30, 45, 65, 80, 100]) {
      const q = sim.sweep({ deliveryHead: head }).deliveredFlow;
      expect(q).toBeLessThanOrEqual(previous + 1e-9);
      previous = q;
    }
    expect(sim.sweep({ deliveryHead: 20 }).deliveredFlow).toBeGreaterThan(5 * sim.averages.deliveredFlow);
    expect(previous).toBe(0);
  });

  it('turning the stroke nut down cuts the consumption, until the ram stops pumping (K11, transcript 13:13)', () => {
    let previousQ = -Infinity;
    let stopped: number | undefined;
    for (let stroke = 0.6; stroke <= 3.2; stroke += 0.2) {
      const m = sim.sweep({ stroke });
      expect(m.driveFlow).toBeGreaterThan(previousQ - 1e-9);
      previousQ = m.driveFlow;
      if (m.deliveredFlow > 0.01 && stopped === undefined) stopped = stroke;
    }
    expect(stopped).toBeGreaterThan(1.2); // below ≈ 1.5 mm there is no delivery
    expect(stopped).toBeLessThan(2);
    // the strokes per minute rise as the stroke falls
    expect(sim.sweep({ stroke: 1.6 }).strokesPerMin).toBeGreaterThan(sim.sweep({ stroke: 2.4 }).strokesPerMin);
    // and the consumption at the smallest stroke is a fraction of that at the video's setting
    expect(sim.sweep({ stroke: 1.0 }).driveFlow).toBeLessThan(sim.averages.driveFlow / 3);
  });

  it('a heavier valve closes faster: consumption and delivery rise with the counterweight', () => {
    const light = sim.sweep({ counterweight: 300 });
    const heavy = sim.sweep({ counterweight: 500 });
    expect(heavy.closingVelocity).toBeGreaterThan(light.closingVelocity);
    expect(heavy.driveFlow).toBeGreaterThan(light.driveFlow);
    expect(heavy.strokesPerMin).toBeLessThan(light.strokesPerMin);
  });

  it('a water-logged chamber gives harsher pressure peaks and less delivery', () => {
    const good = sim.sweep({ waterLogged: false });
    const logged = new RamSim('valve-1');
    logged.set({ waterLogged: true });
    const bad = logged.solve();
    expect(bad.peakPressure).toBeGreaterThan(good.peakPressure + 0.4);
    expect(bad.deliveredFlow).toBeLessThan(good.deliveredFlow * 0.8);
    expect(bad.etaD).toBeLessThan(good.etaD);
    expect(logged.state.alarms).toContain('waterLogged');
  });

  it('K20: a drive pipe that is too short (L/h < 3) is less efficient than a well-proportioned one', () => {
    const shortPipe = sim.sweep({ driveLength: 8 });
    const normal = sim.sweep({ driveLength: 20 });
    expect(shortPipe.etaD).toBeLessThan(normal.etaD * 0.97);
    expect(shortPipe.strokesPerMin).toBeGreaterThan(normal.strokesPerMin * 2); // it hammers
    // a long pipe wastes head in friction
    expect(sim.sweep({ driveLength: 50 }).etaD).toBeLessThan(normal.etaD);
  });

  it('a longer stroke needs less water to lift the same: efficiency is best at moderate strokes', () => {
    const e = [1.8, 2.4, 3.2, 4.4].map((stroke) => sim.sweep({ stroke }).etaD);
    expect(Math.max(...e)).toBeGreaterThan(e[0]);
    expect(e[3]).toBeLessThanOrEqual(Math.max(...e));
  });
});

describe('presets, scenarios and parameters', () => {
  it('the preset values are the calibrated settings and a fresh start fills the tank', () => {
    for (const [id, valve] of [
      ['valve-1', 1],
      ['valve-2', 2],
      ['valve-3', 3],
    ] as [PresetId, 1 | 2 | 3][]) {
      const sim = preset(id);
      expect(sim.params.preset).toBe(id);
      expect(sim.params.valve).toBe(valve);
      expect(sim.params.stroke).toBe(VALVE_SETTINGS[valve].stroke);
      expect(sim.params.counterweight).toBe(VALVE_SETTINGS[valve].counterweight);
      expect(sim.state.tankLevel).toBe(1);
      expect(sim.state.tankLitres).toBe(TANK_VOLUME_DERIVED);
    }
    expect(TANK_VOLUME_DERIVED).toBe(5700); // (17 − 7.5) L/min × 10 h, derived from K8
  });

  it('applyPreset switches the valve and restarts the clock and the tank, but keeps the time controls', () => {
    const sim = preset('valve-1');
    runSimulated(sim, 3);
    sim.set({ timeScale: 600, slowMo: 0.2 });
    sim.applyPreset('valve-3');
    expect(sim.params.valve).toBe(3);
    expect(sim.params.timeScale).toBe(600);
    expect(sim.params.slowMo).toBe(0.2);
    expect(sim.state.simTime).toBe(0);
    expect(sim.state.deliveredTotal).toBe(0);
    expect(sim.state.tankLevel).toBe(1);
    expect(sim.state.strokesPerMin).toBeGreaterThan(70);
  });

  it('K9, K6: the source-drop scenario starts with 10 L/min and falls to 7.5 L/min after an hour', () => {
    const sim = preset('valve-1');
    sim.applyScenario('source-drop');
    expect(sim.params.sourceFlow).toBe(10);
    runSimulated(sim, 0.5);
    expect(sim.params.sourceFlow).toBe(10);
    runSimulated(sim, 1);
    expect(sim.params.sourceFlow).toBe(7.5);
    expect(sim.state.sourceFlow).toBe(7.5);
    runSimulated(sim, 14);
    expect(sim.state.status).toBe('stalled'); // the n°3 valve then drains the tank
    expect(sim.state.stallReason).toBe('tank');
  });

  it('stroke-nut: the nut is turned by 0.1 mm every 10 minutes, consumption falls, then the delivery stops', () => {
    const sim = preset('valve-1');
    sim.applyScenario('stroke-nut');
    const q0 = sim.state.driveFlow;
    const d0 = sim.state.deliveredPerDay;
    runSimulated(sim, (NUT_INTERVAL * 3) / 3600);
    expect(sim.params.stroke).toBeCloseTo(1.9, 6);
    sim.solve();
    expect(sim.state.driveFlow).toBeLessThan(q0);
    runSimulated(sim, (NUT_INTERVAL * 12) / 3600);
    expect(sim.params.stroke).toBeCloseTo(0.8, 6);
    sim.solve();
    run(sim, 0.2);
    expect(sim.state.deliveredPerDay).toBe(0);
    expect(d0).toBeGreaterThan(400);
    expect(sim.state.alarms).toContain('noDelivery');
    expect(sim.state.driveFlow).toBeLessThan(q0 / 4);
  });

  it('water-logged, short-pipe, high-lift and snifter-blocked scenarios raise their alarms', () => {
    const expectAlarm = (id: ScenarioId, alarm: string, hours = 0) => {
      const sim = preset('valve-1');
      sim.applyScenario(id);
      if (hours) runSimulated(sim, hours);
      run(sim, 0.2);
      expect(sim.state.alarms).toContain(alarm);
      return sim;
    };
    expectAlarm('water-logged', 'waterLogged');
    expectAlarm('high-lift', 'headHigh');
    expectAlarm('high-lift', 'noDelivery');
    expectAlarm('snifter-blocked', 'snifterBlocked');
    const short = expectAlarm('short-pipe', 'pipeShort');
    expect(short.state.lengthRatio).toBeLessThan(3);
    expect(short.state.strokesPerMin).toBeGreaterThan(200);
  });

  it('a blocked snifter slowly water-logs the chamber: the air share falls, the delivery drops, the alarm rises', () => {
    const sim = preset('valve-1');
    sim.applyScenario('snifter-blocked');
    const q0 = sim.state.deliveredPerDay;
    expect(sim.state.airFraction).toBeGreaterThan(0.5);
    runSimulated(sim, 6);
    expect(sim.state.airFraction).toBeLessThan(0.3);
    expect(sim.state.alarms).not.toContain('waterLogged');
    runSimulated(sim, 24);
    run(sim, 0.5);
    expect(sim.state.airFraction).toBeLessThan(0.05);
    expect(sim.state.alarms).toContain('waterLogged');
    expect(sim.state.deliveredPerDay).toBeLessThan(q0 * 0.8);
    // unblocking it refills the chamber in the following hours
    sim.set({ snifterBlocked: false });
    runSimulated(sim, 3);
    expect(sim.state.airFraction).toBeGreaterThan(0.5);
  });

  it('applyScenario works for every scenario and leaves a valid running state', () => {
    for (const id of SCENARIO_IDS) {
      const sim = preset('valve-1');
      sim.applyScenario(id);
      run(sim, 0.5);
      expect(sim.state.simTime).toBeGreaterThan(0);
      expect(sim.state.tankLevel).toBeGreaterThan(0.99);
      expect(Number.isFinite(sim.state.strokesPerMin)).toBe(true);
    }
  });

  it('set() clamps to the allowed ranges, ignores nonsense, and makes the preset "custom"', () => {
    const sim = preset('valve-1');
    let changes = 0;
    sim.onChange(() => changes++);
    sim.set({ fall: 1000, deliveryHead: -5, stroke: Number.NaN });
    expect(sim.params.fall).toBe(30);
    expect(sim.params.deliveryHead).toBe(5);
    expect(sim.params.stroke).toBe(2.2);
    expect(sim.params.preset).toBe('custom');
    sim.set({ valve: 7 as unknown as 1 });
    expect(sim.params.valve).toBe(1);
    expect(changes).toBe(2);
    sim.set({ timeScale: 60 });
    expect(sim.params.preset).toBe('custom');
    const fresh = preset('valve-1');
    fresh.set({ timeScale: 60, running: true, slowMo: 0.2 });
    expect(fresh.params.preset).toBe('valve-1'); // time controls do not make a preset custom
  });

  it('editing the site live updates the averages on the next frames', () => {
    const sim = preset('valve-1');
    const q = sim.state.deliveredFlow;
    sim.set({ deliveryHead: 30 });
    run(sim, 0.5);
    expect(sim.state.deliveredFlow).toBeGreaterThan(q * 3);
    expect(sim.state.deliveryStaticBar).toBeCloseTo(2.94, 2);
    expect(sim.state.liftRatio).toBe(4);
    sim.set({ driveLength: 30, fall: 10 });
    run(sim, 0.5);
    expect(sim.state.lengthRatio).toBe(3);
  });

  it('the drive pipe is never shorter than the fall', () => {
    const sim = preset('valve-1');
    sim.set({ fall: 20, driveLength: 5 });
    run(sim, 0.3);
    expect(sim.state.driveLength).toBeGreaterThanOrEqual(20);
    expect(sim.state.lengthRatio).toBeGreaterThan(1);
  });

  it('the slow history samples the tank every 5 simulated minutes', () => {
    const sim = preset('valve-3');
    runSimulated(sim, 2);
    const h = sim.history;
    expect(h.hours.length).toBeGreaterThan(20);
    expect(h.tank.length).toBe(h.hours.length);
    expect(h.tank[0]).toBe(100);
    expect(h.tank[h.tank.length - 1]).toBeLessThan(h.tank[0]);
    expect(h.hours[1] - h.hours[0]).toBeCloseTo(5 / 60, 6);
  });
});
