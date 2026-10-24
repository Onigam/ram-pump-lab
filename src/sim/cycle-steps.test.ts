import { describe, expect, it } from 'vitest';
import { RamSim } from './engine';
import { CYCLE_PHASES } from './presets';
import type { CyclePhase, RamState } from './types';

// The cycle step by step (research §11): the four phases can be frozen on demand and stepped through. The tests check
// that each phase is reached, that the frozen state does not move, that the order is the physical one, and that the
// fields the 3D scene reads are consistent with the phase (valve positions, flows, pressures).

/** Run the simulation in real time, frame by frame. */
function run(sim: RamSim, seconds: number, dt = 1 / 60): void {
  const n = Math.round(seconds / dt);
  for (let i = 0; i < n; i++) sim.step(dt);
}

/** A running ram after a couple of seconds, so that the chamber pressure has settled. */
function warm(setup: (sim: RamSim) => void = () => {}): RamSim {
  const sim = new RamSim('valve-1');
  setup(sim);
  run(sim, 2);
  return sim;
}

/** The fields of the stroke-cycle block of the state: what the 3D reads and what must not move while frozen. */
const CYCLE_FIELDS = [
  'phase',
  'phaseHeld',
  'phaseTime',
  'strokeCount',
  'cycleProgress',
  'wasteValve',
  'deliveryValve',
  'driveVelocity',
  'driveFlowNow',
  'wasteJetFlow',
  'deliveredFlowNow',
  'outletFlowNow',
  'snifterFlow',
  'bodyPressure',
  'chamberPressure',
  'airLevel',
] as const satisfies readonly (keyof RamState)[];

const pick = (s: RamState) => CYCLE_FIELDS.map((k) => s[k]);

describe('freezing the cycle at a phase', () => {
  it('reaches each of the four phases and holds it', () => {
    for (const phase of CYCLE_PHASES) {
      const sim = warm();
      expect(sim.holdPhase(phase)).toBe(true);
      expect(sim.state.phase).toBe(phase);
      expect(sim.state.phaseHeld).toBe(phase);
      expect(sim.heldPhase).toBe(phase);
    }
  });

  it('works from any starting point of the stroke (the cycle is advanced to the next occurrence of the phase)', () => {
    for (const phase of CYCLE_PHASES) {
      for (let frames = 1; frames <= 40; frames += 3) {
        const sim = warm();
        run(sim, frames / 60);
        expect(sim.holdPhase(phase), `${phase} after ${frames} frames`).toBe(true);
        expect(sim.state.phase).toBe(phase);
      }
    }
  });

  it('works on a paused simulation', () => {
    const sim = warm();
    sim.set({ running: false });
    expect(sim.holdPhase('deliver')).toBe(true);
    expect(sim.state.phase).toBe('deliver');
  });

  it('the held state is stable: not one field of the cycle moves while the time goes on', () => {
    for (const phase of CYCLE_PHASES) {
      const sim = warm();
      sim.holdPhase(phase);
      const before = pick(sim.state);
      const t0 = sim.state.simTime;
      run(sim, 3);
      expect(sim.state.simTime).toBeGreaterThan(t0 + 2.9); // the clock goes on
      expect(pick(sim.state)).toEqual(before);
    }
  });

  it('is stable at any time speed and slow motion, and when the ram is run at ×3600', () => {
    const sim = warm();
    sim.holdPhase('close');
    const before = pick(sim.state);
    sim.set({ slowMo: 0.02, timeScale: 3600 });
    run(sim, 2);
    expect(pick(sim.state)).toEqual(before);
  });

  it('releasing resumes the cycle: strokes are counted again', () => {
    const sim = warm();
    sim.holdPhase('recoil');
    const n = sim.state.strokeCount;
    run(sim, 1);
    expect(sim.state.strokeCount).toBe(n);
    expect(sim.holdPhase(null)).toBe(true);
    expect(sim.state.phaseHeld).toBeNull();
    run(sim, 2);
    expect(sim.state.strokeCount).toBeGreaterThanOrEqual(n + 3);
    expect(sim.heldPhase).toBeNull();
  });

  it('is deterministic: the same calls give the same frozen instant', () => {
    const a = warm();
    const b = warm();
    for (const phase of CYCLE_PHASES) {
      a.holdPhase(phase);
      b.holdPhase(phase);
      expect(pick(a.state)).toEqual(pick(b.state));
    }
  });

  it('the instant of a phase is inside it, at the time the model gives (accel ≈ 95 % of its mean duration)', () => {
    const sim = warm();
    const m = sim.averages;
    const period = 60 / m.strokesPerMin;
    sim.holdPhase('accel');
    const expected = 0.95 * period * m.phaseShare[0];
    expect(sim.state.phaseTime).toBeGreaterThan(0.8 * expected);
    expect(sim.state.phaseTime).toBeLessThan(1.2 * expected);
  });

  it('the oscilloscope keeps its samples in order and its phase labels in step, whatever the freezing did', () => {
    const sim = warm();
    for (const phase of ['deliver', 'close', 'recoil', 'accel'] as CyclePhase[]) {
      sim.holdPhase(phase);
      const sc = sim.scope;
      expect(sc.phase.length).toBe(sc.t.length);
      expect(sc.pressure.length).toBe(sc.t.length);
      for (let i = 1; i < sc.t.length; i++) expect(sc.t[i]).toBeGreaterThan(sc.t[i - 1]);
      expect(sc.phase.every((k) => k >= 0 && k <= 3)).toBe(true);
    }
  });
});

describe('stepping through the phases', () => {
  it('goes accel → close → deliver → recoil → accel, and the stroke counter advances once per round', () => {
    const sim = warm();
    sim.holdPhase('accel');
    const n0 = sim.state.strokeCount;
    const seen: (CyclePhase | null)[] = [];
    for (let i = 0; i < 8; i++) seen.push(sim.stepPhase());
    expect(seen).toEqual(['close', 'deliver', 'recoil', 'accel', 'close', 'deliver', 'recoil', 'accel']);
    expect(sim.state.phaseHeld).toBe('accel');
    expect(sim.state.strokeCount).toBe(n0 + 2);
  });

  it('from a running cycle, the first step goes to the phase after the one it is in', () => {
    const sim = warm();
    const live = sim.state.phase as CyclePhase;
    const next = CYCLE_PHASES[(CYCLE_PHASES.indexOf(live) + 1) % 4];
    expect(sim.stepPhase()).toBe(next);
    expect(sim.state.phase).toBe(next);
    expect(sim.state.phaseHeld).toBe(next);
  });

  it('stepping holds the cycle even if it was not held before, and stepping again moves on', () => {
    const sim = warm();
    const a = sim.stepPhase();
    const b = sim.stepPhase();
    expect(a).not.toBe(b);
    expect(sim.heldPhase).toBe(b);
  });

  it('holding the phase already held changes nothing', () => {
    const sim = warm();
    sim.holdPhase('close');
    const before = pick(sim.state);
    expect(sim.holdPhase('close')).toBe(true);
    expect(pick(sim.state)).toEqual(before);
  });

  it('holds for every valve of the video, with the heavy counterweight, the short pipe and the water-logged chamber', () => {
    const setups: ((s: RamSim) => void)[] = [
      (s) => s.applyPreset('valve-3'),
      (s) => s.applyPreset('valve-2'),
      (s) => s.applyScenario('heavy-weight'),
      (s) => s.applyScenario('short-pipe'),
      (s) => s.applyScenario('water-logged'),
    ];
    for (const setup of setups) {
      const sim = warm(setup);
      for (const phase of CYCLE_PHASES) {
        expect(sim.holdPhase(phase)).toBe(true);
        expect(sim.state.phase).toBe(phase);
      }
    }
  });
});

describe('the fields the 3D reads are consistent in each phase', () => {
  const setups: [string, (s: RamSim) => void][] = [
    ['valve n°1', () => {}],
    ['valve n°3', (s) => s.applyPreset('valve-3')],
    ['heavy counterweight', (s) => s.applyScenario('heavy-weight')],
    ['water-logged chamber', (s) => s.applyScenario('water-logged')],
  ];

  for (const [name, setup] of setups) {
    describe(name, () => {
      const at = (phase: CyclePhase): RamState => {
        const sim = warm(setup);
        sim.holdPhase(phase);
        return { ...sim.state };
      };

      it('accel: the waste valve is wide open and the water runs out, nothing is delivered', () => {
        const s = at('accel');
        expect(s.wasteValve).toBeGreaterThan(0.95);
        expect(s.wasteJetFlow).toBeGreaterThan(5);
        expect(s.driveVelocity).toBeGreaterThan(0.3);
        expect(s.driveFlowNow).toBeGreaterThan(5);
        expect(s.deliveryValve).toBeLessThan(0.05);
        expect(s.deliveredFlowNow).toBeLessThan(0.01);
        expect(s.bodyPressure).toBeLessThan(1);
      });

      it('close: the waste valve has shut, no jet, the pressure is climbing to the delivery head, the check valve not yet open', () => {
        const s = at('close');
        expect(s.wasteValve).toBeLessThan(0.05);
        expect(s.wasteJetFlow).toBeLessThan(0.5);
        expect(s.driveVelocity).toBeGreaterThan(0);
        expect(s.bodyPressure).toBeGreaterThan(0.8 * s.deliveryStaticBar);
        expect(s.deliveryValve).toBeLessThan(0.3);
        expect(s.deliveredFlowNow).toBeLessThan(1.5);
      });

      it('deliver: the check valve is open and water goes into the chamber, the waste valve is shut', () => {
        const s = at('deliver');
        expect(s.wasteValve).toBeLessThan(0.05);
        expect(s.wasteJetFlow).toBeLessThan(0.5);
        expect(s.deliveryValve).toBeGreaterThan(0.4);
        expect(s.deliveredFlowNow).toBeGreaterThan(1);
        expect(s.bodyPressure).toBeGreaterThan(0.9 * s.deliveryStaticBar);
        expect(s.driveVelocity).toBeGreaterThan(0);
      });

      it('recoil: the water flows backwards, the waste valve is dropping open, the check valve is shut', () => {
        const s = at('recoil');
        expect(s.driveVelocity).toBeLessThan(-0.1);
        expect(s.driveFlowNow).toBeLessThan(0);
        expect(s.wasteValve).toBeGreaterThan(0.3);
        expect(s.deliveryValve).toBeLessThan(0.2);
        expect(s.deliveredFlowNow).toBeLessThan(0.7);
        expect(s.bodyPressure).toBeLessThan(0.5);
      });

      it('the check valve is open in deliver and only there; the waste valve is open in accel and recoil only', () => {
        const states = Object.fromEntries(CYCLE_PHASES.map((p) => [p, at(p)])) as Record<CyclePhase, RamState>;
        for (const p of CYCLE_PHASES) {
          expect(states[p].deliveryValve > 0.4, `check valve in ${p}`).toBe(p === 'deliver');
          expect(states[p].wasteValve > 0.3, `waste valve in ${p}`).toBe(p === 'accel' || p === 'recoil');
        }
      });
    });
  }

  it('every field stays in its range in every phase', () => {
    const sim = warm();
    for (const phase of CYCLE_PHASES) {
      sim.holdPhase(phase);
      const s = sim.state;
      expect(s.wasteValve).toBeGreaterThanOrEqual(0);
      expect(s.wasteValve).toBeLessThanOrEqual(1);
      expect(s.deliveryValve).toBeGreaterThanOrEqual(0);
      expect(s.deliveryValve).toBeLessThanOrEqual(1);
      expect(s.cycleProgress).toBeGreaterThanOrEqual(0);
      expect(s.cycleProgress).toBeLessThanOrEqual(1);
      for (const k of CYCLE_FIELDS) {
        const v = s[k];
        if (typeof v === 'number') expect(Number.isFinite(v), `${phase}: ${k}`).toBe(true);
      }
    }
  });
});

describe('a phase that does not occur, a stopped ram, and edits while frozen', () => {
  it('a plastic pipe never opens the check valve: there is no deliver phase to freeze, and stepping skips it', () => {
    const sim = warm((s) => s.applyScenario('plastic-pipe'));
    expect(sim.phaseOccurs('deliver')).toBe(false);
    expect(sim.phaseOccurs('close')).toBe(true);
    expect(sim.holdPhase('deliver')).toBe(false);
    expect(sim.heldPhase).toBeNull();
    sim.holdPhase('close');
    expect(sim.stepPhase()).toBe('recoil');
    expect(sim.stepPhase()).toBe('accel');
    expect(sim.stepPhase()).toBe('close');
  });

  it('a stopped ram has no cycle to freeze', () => {
    const sim = warm();
    sim.setDriveGate(false);
    expect(sim.state.status).toBe('stalled');
    expect(sim.holdPhase('close')).toBe(false);
    expect(sim.stepPhase()).toBeNull();
    expect(sim.state.phaseHeld).toBeNull();
  });

  it('editing a parameter while frozen freezes the same phase again with the new settings', () => {
    const sim = warm();
    sim.holdPhase('close');
    const before = pick(sim.state);
    sim.set({ stroke: 2.8 });
    run(sim, 1 / 60);
    expect(sim.state.phaseHeld).toBe('close');
    expect(sim.state.phase).toBe('close');
    expect(sim.state.wasteValve).toBeLessThan(0.05);
    expect(pick(sim.state)).not.toEqual(before);
    // and the new frozen instant is stable too
    const after = pick(sim.state);
    run(sim, 2);
    expect(pick(sim.state)).toEqual(after);
  });

  it('turning the pipe into plastic while frozen on deliver releases the freeze (the phase is gone)', () => {
    const sim = warm();
    sim.holdPhase('deliver');
    sim.set({ pipeMaterial: 'pvc' });
    run(sim, 1);
    expect(sim.heldPhase).toBeNull();
    expect(sim.state.phaseHeld).toBeNull();
  });

  it('a freeze survives the ram stopping and starting again: it is found again at the restart', () => {
    const sim = warm();
    sim.holdPhase('deliver');
    sim.setDriveGate(false);
    expect(sim.state.phaseHeld).toBeNull(); // nothing to show while stopped
    sim.setDriveGate(true);
    run(sim, 1 / 60);
    expect(sim.state.status).toBe('running');
    expect(sim.state.phaseHeld).toBe('deliver');
    expect(sim.state.phase).toBe('deliver');
  });

  it('a reset, a preset and a scenario release the freeze', () => {
    const sim = warm();
    sim.holdPhase('close');
    sim.reset();
    expect(sim.heldPhase).toBeNull();
    sim.holdPhase('close');
    sim.applyPreset('valve-3');
    expect(sim.heldPhase).toBeNull();
    sim.holdPhase('close');
    sim.applyScenario('short-pipe');
    expect(sim.heldPhase).toBeNull();
  });

  it('the slow quantities go on while the cycle is frozen (tank, volumes), and match the averages', () => {
    const sim = warm((s) => s.applyPreset('valve-3'));
    sim.holdPhase('close');
    const tank0 = sim.state.tankLitres;
    const delivered0 = sim.state.deliveredTotal;
    sim.set({ timeScale: 600 });
    run(sim, 3);
    expect(sim.state.tankLitres).toBeLessThan(tank0);
    expect(sim.state.deliveredTotal).toBeGreaterThan(delivered0);
    expect(sim.state.phaseHeld).toBe('close');
  });
});

describe('the trace of one whole stroke', () => {
  it('has the four phases in order, covering the period, with the period of the model', () => {
    const sim = warm();
    const tr = sim.strokeTrace();
    expect(tr).not.toBeNull();
    if (!tr) return;
    const period = 60000 / sim.averages.strokesPerMin;
    expect(Math.abs(tr.period / period - 1)).toBeLessThan(0.06);
    expect(tr.start[0]).toBeCloseTo(0, 0);
    expect(tr.start[0]).toBeLessThan(tr.start[1]);
    expect(tr.start[1]).toBeLessThan(tr.start[2]);
    expect(tr.start[2]).toBeLessThan(tr.start[3]);
    const total = tr.length.reduce((a, b) => a + b, 0);
    expect(Math.abs(total / tr.period - 1)).toBeLessThan(0.03);
    expect(tr.t.length).toBeGreaterThan(100);
    for (let i = 1; i < tr.t.length; i++) expect(tr.t[i]).toBeGreaterThan(tr.t[i - 1]);
    expect(tr.phase.length).toBe(tr.t.length);
    expect(tr.pressure.length).toBe(tr.t.length);
    // the shares of the trace are those of the averages
    sim.averages.phaseShare.forEach((share, k) =>
      expect(Math.abs(tr.length[k] / tr.period - share)).toBeLessThan(0.05),
    );
  });

  it('shows the surge: the pressure peaks near the delivery pressure, the velocity goes negative in the recoil', () => {
    const sim = warm();
    const tr = sim.strokeTrace()!;
    expect(Math.max(...tr.pressure)).toBeGreaterThan(0.9 * sim.state.deliveryStaticBar);
    const recoil = tr.phase.map((k, i) => (k === 3 ? tr.velocity[i] : NaN)).filter(Number.isFinite);
    expect(Math.min(...recoil)).toBeLessThan(-0.3);
  });

  it('does not touch the live run', () => {
    const sim = warm();
    const before = pick(sim.state);
    const tr = sim.strokeTrace({ stroke: 3 });
    expect(tr).not.toBeNull();
    expect(pick(sim.state)).toEqual(before);
  });

  it('has no delivery phase with a plastic pipe, and no trace at all for a valve that never closes', () => {
    const plastic = warm((s) => s.applyScenario('plastic-pipe')).strokeTrace()!;
    expect(plastic.length[2]).toBe(0);
    expect(plastic.start[2]).toBe(-1);
    expect(plastic.length[1]).toBeGreaterThan(0);
    const open = new RamSim('valve-1').strokeTrace({ counterweight: 1000 });
    expect(open).toBeNull();
  });
});
