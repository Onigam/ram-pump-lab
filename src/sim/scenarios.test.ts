import { describe, expect, it } from 'vitest';
import { RamSim } from './engine';
import { minClosingVelocity, WAVE_SPEED } from './physics';
import { HEAVY_WEIGHT, PLASTIC_PIPE, presetParams, SCENARIO_IDS, SOURCE_FLOW_TODAY } from './presets';

// The two scenarios of wave 3 (research §11, frozen ids `plastic-pipe` and `heavy-weight`). Their numbers are results of
// the model for an assumed wave speed (plastic) and a round change of the counterweight (heavy), not reported figures:
// the tests say what each scenario must show, with the tolerances of docs/physics.md §5.

function run(sim: RamSim, seconds: number, dt = 1 / 60): void {
  const n = Math.round(seconds / dt);
  for (let i = 0; i < n; i++) sim.step(dt);
}

describe('scenario ids', () => {
  it('lists the two new scenarios after the six existing ones, in this order', () => {
    expect(SCENARIO_IDS).toEqual([
      'source-drop',
      'stroke-nut',
      'water-logged',
      'short-pipe',
      'high-lift',
      'snifter-blocked',
      'plastic-pipe',
      'heavy-weight',
    ]);
  });

  it('every scenario leaves a valid running state with finite numbers', () => {
    for (const id of SCENARIO_IDS) {
      const sim = new RamSim();
      sim.applyScenario(id);
      run(sim, 1);
      expect(sim.state.status).toBe('running');
      for (const [k, v] of Object.entries(sim.state))
        if (typeof v === 'number' && k !== 'hoursToEmpty') expect(Number.isFinite(v), `${id}: ${k}`).toBe(true);
    }
  });
});

describe('plastic-pipe: the surge of a soft pipe cannot open the check valve', () => {
  const steel = new RamSim('valve-1');
  const sim = new RamSim();
  sim.applyScenario('plastic-pipe');
  run(sim, 2);
  const s = sim.state;

  it('starts from the n°1 valve with a PVC drive pipe (500 m/s instead of 900), and says it is a custom setting', () => {
    const base = presetParams('valve-1');
    expect(sim.params.pipeMaterial).toBe(PLASTIC_PIPE);
    expect(sim.params.valve).toBe(1);
    expect(sim.params.stroke).toBe(base.stroke);
    expect(sim.params.counterweight).toBe(base.counterweight);
    expect(sim.params.fall).toBe(base.fall);
    expect(sim.params.deliveryHead).toBe(base.deliveryHead);
    expect(sim.params.preset).toBe('custom');
    expect(s.waveSpeed).toBe(WAVE_SPEED.pvc);
    expect(WAVE_SPEED.pvc).toBeGreaterThanOrEqual(300);
    expect(WAVE_SPEED.pvc).toBeLessThanOrEqual(600);
  });

  it('the valve closes just as fast as with steel (the closing velocity is the valve’s, within 10 %)', () => {
    expect(Math.abs(s.closingVelocity / steel.state.closingVelocity - 1)).toBeLessThan(0.1);
  });

  it('...but the surge ρ·a·v is lower than what the check valve needs, so nothing is delivered (K15)', () => {
    expect(s.surgeBar).toBeLessThan(s.surgeNeededBar);
    expect(s.closingVelocity).toBeLessThan(s.minClosingVelocity);
    expect(s.minClosingVelocity).toBeCloseTo(minClosingVelocity(7.5, 65, WAVE_SPEED.pvc), 6);
    expect(s.surgeNeededBar).toBeCloseTo((9.80665 * 1000 * (65 - 7.5)) / 1e5, 1); // 5.6 bar
    expect(s.deliveredFlow).toBeLessThan(0.001);
    expect(s.deliveredPerDay).toBeLessThan(1);
    expect(s.deliveredPerDay).toBeLessThan(0.01 * steel.state.deliveredPerDay);
  });

  it('the pressure never reaches the head: the peak is below the delivery pressure (≈ 5.1 against 6.4 bar)', () => {
    expect(sim.averages.peakPressure).toBeLessThan(s.deliveryStaticBar);
    expect(sim.averages.peakPressure).toBeGreaterThan(4);
  });

  it('the ram keeps striking (it does not stop), and takes less water than with steel', () => {
    expect(s.strokesPerMin).toBeGreaterThan(40);
    expect(s.status).toBe('running');
    expect(s.driveFlow).toBeLessThan(steel.state.driveFlow);
    expect(s.driveFlow).toBeGreaterThan(1);
  });

  it('the alarms name the cause: nothing delivered and a pipe too soft (a rigid pipe would have been enough)', () => {
    expect(s.alarms).toContain('noDelivery');
    expect(s.alarms).toContain('softPipe');
    // the closing velocity is enough for steel (0.63 m/s at this site): that is what makes it the pipe
    expect(s.closingVelocity).toBeGreaterThan(minClosingVelocity(7.5, 65, WAVE_SPEED.steel));
  });

  it('putting steel back restores the delivery (≈ 500 L/day) and clears both alarms: the pipe was the cause', () => {
    const fix = new RamSim();
    fix.applyScenario('plastic-pipe');
    fix.set({ pipeMaterial: 'steel' });
    fix.solve();
    run(fix, 1);
    expect(Math.abs(fix.state.deliveredPerDay / 500 - 1)).toBeLessThan(0.05);
    expect(fix.state.alarms).not.toContain('noDelivery');
    expect(fix.state.alarms).not.toContain('softPipe');
  });

  it('the polyethylene pipe (350 m/s) is worse still: a lower peak', () => {
    const pe = new RamSim();
    pe.applyScenario('plastic-pipe');
    pe.set({ pipeMaterial: 'hdpe' });
    pe.solve();
    expect(pe.averages.peakPressure).toBeLessThan(sim.averages.peakPressure);
    expect(pe.state.deliveredPerDay).toBeLessThan(1);
  });

  it('a lower delivery head can still be reached with PVC: the failure is a matter of lift (model result)', () => {
    const low = new RamSim();
    low.applyScenario('plastic-pipe');
    low.set({ deliveryHead: 30 });
    low.solve();
    expect(low.averages.deliveredFlow).toBeGreaterThan(0.5);
    expect(low.averages.peakPressure).toBeLessThan(low.state.deliveryStaticBar + 1);
    // ...and a head of 40 m lifts less than steel would
    const steelLow = new RamSim();
    steelLow.set({ deliveryHead: 40 });
    steelLow.solve();
    const plasticLow = new RamSim();
    plasticLow.applyScenario('plastic-pipe');
    plasticLow.set({ deliveryHead: 40 });
    plasticLow.solve();
    expect(plasticLow.averages.etaD).toBeGreaterThan(0.3); // it works, at a head the surge can reach
    expect(plasticLow.averages.deliveredFlow).toBeGreaterThan(0);
    expect(steelLow.averages.deliveredFlow).toBeGreaterThan(0);
  });

  it('the soft-pipe alarm is only for pipes: not on a steel ram that asks too much (high-lift), nor on the plain preset', () => {
    const hl = new RamSim();
    hl.applyScenario('high-lift');
    expect(hl.state.alarms).toContain('noDelivery');
    expect(hl.state.alarms).not.toContain('softPipe');
    expect(new RamSim('valve-1').state.alarms).not.toContain('softPipe');
    expect(new RamSim('valve-3').state.alarms).not.toContain('softPipe');
  });
});

describe('heavy-weight: a heavier counterweight on the n°1 valve', () => {
  const base = new RamSim('valve-1');
  const sim = new RamSim();
  sim.applyScenario('heavy-weight');
  run(sim, 2);
  const m = sim.averages;
  const b = base.averages;

  it('is the n°1 preset with twice the counterweight, nothing else changed', () => {
    const p = presetParams('valve-1');
    expect(HEAVY_WEIGHT).toBe(2 * p.counterweight);
    expect(sim.params.counterweight).toBe(HEAVY_WEIGHT);
    expect(sim.params.valve).toBe(1);
    expect(sim.params.stroke).toBe(p.stroke);
    expect(sim.params.pipeMaterial).toBe('steel');
    expect(sim.params.preset).toBe('custom');
  });

  it('slower rhythm: 75 strokes/min instead of 109 (±10 %)', () => {
    expect(m.strokesPerMin).toBeLessThan(0.8 * b.strokesPerMin);
    expect(Math.abs(m.strokesPerMin / 75 - 1)).toBeLessThan(0.1);
  });

  it('harder strokes: the valve closes at a higher velocity and delivers more per stroke', () => {
    expect(m.closingVelocity).toBeGreaterThan(1.15 * b.closingVelocity);
    expect(m.deliveredPerStroke).toBeGreaterThan(1.8 * b.deliveredPerStroke);
    expect(m.peakPressure).toBeGreaterThanOrEqual(b.peakPressure - 0.05);
  });

  it('a lot more water used: 15.5 L/min, twice the spring, so the tank is draining and empties in 10–14 h', () => {
    expect(Math.abs(m.driveFlow / 15.5 - 1)).toBeLessThan(0.1);
    expect(m.driveFlow).toBeGreaterThan(2 * SOURCE_FLOW_TODAY);
    expect(sim.state.hoursToEmpty).toBeGreaterThan(10);
    expect(sim.state.hoursToEmpty).toBeLessThan(14);
    // the "tank low" alarm waits until the tank is half empty, a few hours later
    expect(sim.state.alarms).not.toContain('tankLow');
    sim.set({ timeScale: 3600, slowMo: 0.02 });
    for (let i = 0; i < 20 * 7; i++) sim.step(0.05); // ≈ 7 simulated hours
    expect(sim.state.tankLevel).toBeLessThan(0.5);
    expect(sim.state.alarms).toContain('tankLow');
  });

  it('...for 58 % more delivery (788 against 500 L/day) at a much lower efficiency (η_D 0.31 against 0.45)', () => {
    expect(Math.abs((m.deliveredFlow * 1440) / 788 - 1)).toBeLessThan(0.08);
    expect(m.deliveredFlow).toBeGreaterThan(1.4 * b.deliveredFlow);
    expect(Math.abs(m.etaD - 0.31)).toBeLessThan(0.04);
    expect(m.etaD).toBeLessThan(b.etaD - 0.1);
  });

  it('run at ×3600, the ram stops for lack of water after ≈ 12 hours: the delivery bought with the weight was borrowed from the tank', () => {
    const s = new RamSim();
    s.applyScenario('heavy-weight');
    s.set({ timeScale: 3600, slowMo: 0.02 });
    let hours = -1;
    for (let i = 0; i < 20 * 16 && hours < 0; i++) {
      s.step(0.05);
      if (s.state.status === 'stalled') hours = s.state.simTime / 3600;
    }
    expect(hours).toBeGreaterThan(10);
    expect(hours).toBeLessThan(14);
    expect(s.state.stallReason).toBe('tank');
  });

  it('the dependence on the weight is not monotonic: delivery peaks around 720 g, then falls, then the valve never closes', () => {
    const weights = [360, 450, 540, 630, 720, 810, 900, 990];
    const q = weights.map((counterweight) => base.sweep({ counterweight }).deliveredFlow * 1440);
    const best = q.indexOf(Math.max(...q));
    expect(weights[best]).toBeGreaterThanOrEqual(630);
    expect(weights[best]).toBeLessThanOrEqual(810);
    // rises up to the best, falls after it
    for (let i = 1; i <= best; i++) expect(q[i]).toBeGreaterThan(q[i - 1]);
    for (let i = best + 1; i < q.length; i++) expect(q[i]).toBeLessThan(q[i - 1]);
    // past the peak it falls fast: at 900 g it delivers a third less than at 720 g, for 1.7 times the water
    const at720 = base.sweep({ counterweight: 720 });
    const at900 = base.sweep({ counterweight: 900 });
    expect(at900.deliveredFlow).toBeLessThan(0.75 * at720.deliveredFlow);
    expect(at900.driveFlow).toBeGreaterThan(1.5 * at720.driveFlow);
    // and beyond the limit the drag can no longer close the valve
    expect(base.sweep({ counterweight: 1000 }).valveStaysOpen).toBe(true);
  });

  it('while the efficiency only falls and the consumption only rises with the weight', () => {
    const weights = [360, 450, 540, 630, 720, 810, 900];
    const runs = weights.map((counterweight) => base.sweep({ counterweight }));
    for (let i = 1; i < runs.length; i++) {
      expect(runs[i].driveFlow).toBeGreaterThan(runs[i - 1].driveFlow);
      expect(runs[i].etaD).toBeLessThan(runs[i - 1].etaD);
      expect(runs[i].strokesPerMin).toBeLessThan(runs[i - 1].strokesPerMin);
      expect(runs[i].closingVelocity).toBeGreaterThan(runs[i - 1].closingVelocity);
    }
  });

  it('is a tuning lesson next to the stroke nut: lighter and shorter both cut the water, down to a ram that no longer delivers', () => {
    const light = base.sweep({ counterweight: 180 });
    expect(light.driveFlow).toBeLessThan(b.driveFlow);
    expect(light.deliveredFlow).toBeLessThan(b.deliveredFlow);
    expect(base.sweep({ counterweight: 100 }).deliveredFlow).toBeLessThan(0.001);
  });
});
