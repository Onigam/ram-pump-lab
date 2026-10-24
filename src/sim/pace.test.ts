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
