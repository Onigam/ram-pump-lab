import { describe, expect, it } from 'vitest';
import { RamSim } from './engine';

describe('scenario pace', () => {
  it.each([
    ['source-drop', 600],
    ['stroke-nut', 600],
    ['snifter-blocked', 3600],
  ] as const)('%s is played fast enough to be seen', (id, pace) => {
    const sim = new RamSim();
    sim.applyScenario(id);
    expect(sim.params.timeScale).toBe(pace);
  });

  it('never slows down a pace the visitor chose, and leaves fast-acting scenarios alone', () => {
    const sim = new RamSim();
    sim.set({ timeScale: 3600 });
    sim.applyScenario('stroke-nut');
    expect(sim.params.timeScale).toBe(3600);
    const other = new RamSim();
    other.set({ timeScale: 60 });
    other.applyScenario('water-logged');
    expect(other.params.timeScale).toBe(60);
  });
});

describe('preset pace (the story of the video)', () => {
  it.each([
    ['valve-3', 600],
    ['valve-2', 3600],
  ] as const)('choosing %s speeds time up so that the tank can be watched emptying', (id, pace) => {
    const sim = new RamSim('valve-1');
    expect(sim.params.timeScale).toBe(1);
    sim.applyPreset(id);
    expect(sim.params.timeScale).toBe(pace);
    expect(sim.params.preset).toBe(id);
  });

  it('the n°3 story plays in about a minute: the tank is empty and the ram stopped after 70 real seconds', () => {
    const sim = new RamSim('valve-1');
    sim.applyPreset('valve-3');
    for (let i = 0; i < 70 * 30; i++) sim.step(1 / 30);
    expect(sim.state.status).toBe('stalled');
    expect(sim.state.stallReason).toBe('tank');
  });

  it('leaves the n°1 valve at the pace chosen, and never slows a faster pace', () => {
    const sim = new RamSim('valve-3');
    sim.applyPreset('valve-1');
    expect(sim.params.timeScale).toBe(1);
    sim.set({ timeScale: 3600 });
    sim.applyPreset('valve-3');
    expect(sim.params.timeScale).toBe(3600);
    sim.applyPreset('valve-2');
    expect(sim.params.timeScale).toBe(3600);
    sim.applyPreset('valve-1');
    expect(sim.params.timeScale).toBe(3600);
  });

  it('keeps the slow motion and the pause the visitor chose', () => {
    const sim = new RamSim('valve-1');
    sim.set({ slowMo: 0.2, running: false });
    sim.applyPreset('valve-3');
    expect(sim.params.slowMo).toBe(0.2);
    expect(sim.params.running).toBe(false);
  });
});
