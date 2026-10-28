import { afterEach, describe, expect, it, vi } from 'vitest';
import { solveSteady, buildConfig } from './cycle';
import { RamSim, sweepCacheStats } from './engine';
import { SolveCache, idleQueue } from './sweep-cache';

// The sweeps behind the charts are cached by settings (a solve of the cycle averages is about 6 ms; the simulation panel
// asks for dozens and the performance sheet for about a hundred). The cache must change no figure.

describe('SolveCache', () => {
  it('keeps at most `limit` entries and drops the least recently used first', () => {
    const c = new SolveCache<number>(3);
    c.set('a', 1);
    c.set('b', 2);
    c.set('c', 3);
    expect(c.get('a')).toBe(1); // a is now the most recently used
    c.set('d', 4); // b goes
    expect(c.has('b')).toBe(false);
    expect([c.has('a'), c.has('c'), c.has('d')]).toEqual([true, true, true]);
    expect(c.size).toBe(3);
  });

  it('counts hits and misses, and stores an explicit null', () => {
    const c = new SolveCache<number | null>(2);
    expect(c.get('x')).toBeUndefined();
    c.set('x', null);
    expect(c.get('x')).toBeNull();
    expect([c.hits, c.misses]).toEqual([1, 1]);
  });
});

describe('RamSim.sweep is cached', () => {
  it('answers the same question with the same object, and the figures of an uncached solve', () => {
    const sim = new RamSim('valve-1');
    const patch = { stroke: 2.35, counterweight: 410 };
    expect(sim.isSweepCached(patch)).toBe(false);
    const first = sim.sweep(patch);
    expect(sim.isSweepCached(patch)).toBe(true);
    expect(sim.sweep(patch)).toBe(first);
    // the same settings through another simulation: the cache is shared
    const other = new RamSim('valve-1');
    expect(other.isSweepCached(patch)).toBe(true);
    expect(other.sweep(patch)).toBe(first);
    const direct = solveSteady(
      buildConfig({ ...sim.params, ...patch }),
      sim.state.airFraction,
      sim.params.deliveryHead,
    );
    expect(first.strokesPerMin).toBe(direct.strokesPerMin);
    expect(first.deliveredFlow).toBe(direct.deliveredFlow);
    expect(first.peakPressure).toBe(direct.peakPressure);
  });

  it('does not recompute for settings the cycle does not read', () => {
    const sim = new RamSim('valve-1');
    const patch = { counterweight: 333 };
    const first = sim.sweep(patch);
    sim.set({ sourceFlow: 12, tankVolume: 3000, timeScale: 600 });
    expect(sim.sweep(patch)).toBe(first);
    const before = sweepCacheStats().hits;
    sim.sweep(patch);
    expect(sweepCacheStats().hits).toBe(before + 1);
  });

  it('does compute again when a setting that the cycle reads changes', () => {
    const sim = new RamSim('valve-1');
    const a = sim.sweep({ deliveryHead: 71 });
    const b = sim.sweep({ deliveryHead: 72 });
    expect(b).not.toBe(a);
    expect(b.deliveredFlow).not.toBe(a.deliveredFlow);
    const c = sim.sweep({ deliveryHead: 71, snifterBlocked: true });
    expect(c).not.toBe(a);
  });

  it('keeps the air of the chamber in the question (a water-logged chamber is another answer)', () => {
    const sim = new RamSim('valve-1');
    const healthy = sim.sweep({});
    const logged = sim.sweep({ waterLogged: true });
    expect(logged).not.toBe(healthy);
    expect(logged.peakPressure).toBeGreaterThan(healthy.peakPressure);
  });

  it('shares read-only results', () => {
    const m = new RamSim('valve-1').sweep({ stroke: 2.4 });
    expect(Object.isFrozen(m)).toBe(true);
    expect(Object.isFrozen(m.phaseShare)).toBe(true);
  });

  it('caches the stroke trace too, including "this valve does not cycle"', () => {
    const sim = new RamSim('valve-1');
    const t = sim.strokeTrace({ counterweight: 355 });
    expect(t).not.toBeNull();
    expect(sim.strokeTrace({ counterweight: 355 })).toBe(t);
    expect(sim.strokeTrace({ deliveryHead: 8 })).toBeNull(); // H/h barely above 1: the valve stays shut
    const before = sweepCacheStats().hits;
    expect(sim.strokeTrace({ deliveryHead: 8 })).toBeNull();
    expect(sweepCacheStats().hits).toBe(before + 1);
  });
});

describe('RamSim.sweepTask spreads a solve over several slices', () => {
  it('gives exactly the figures of sweep(), a fraction of a millisecond at a time', () => {
    const sim = new RamSim('valve-3');
    const patch = { stroke: 3.05 };
    const task = sim.sweepTask(patch);
    expect(task.means).toBeNull();
    let slices = 0;
    while (!task.advance(0.01)) slices += 1;
    expect(slices).toBeGreaterThan(3); // not done in one go
    expect(sim.isSweepCached(patch)).toBe(true);
    const direct = solveSteady(
      buildConfig({ ...sim.params, ...patch }),
      sim.state.airFraction,
      sim.params.deliveryHead,
    );
    expect(task.means?.strokesPerMin).toBe(direct.strokesPerMin);
    expect(task.means?.driveFlow).toBe(direct.driveFlow);
    expect(task.means?.deliveredFlow).toBe(direct.deliveredFlow);
    expect(sim.sweep(patch)).toBe(task.means);
  });

  it('is finished at once for settings already solved', () => {
    const sim = new RamSim('valve-1');
    const known = sim.sweep({ stroke: 2.15 });
    const task = sim.sweepTask({ stroke: 2.15 });
    expect(task.means).toBe(known);
    expect(task.advance(0)).toBe(true);
  });
});

describe('prefetch', () => {
  afterEach(() => vi.useRealTimers());

  it('solves the sweeps in the background, a slice at a time, until the cache has them', () => {
    vi.useFakeTimers();
    const sim = new RamSim('valve-1');
    const patches = [{ counterweight: 211 }, { counterweight: 212 }, { counterweight: 213 }];
    sim.prefetch(patches);
    expect(sim.prefetchPending).toBe(3);
    expect(patches.some((p) => sim.isSweepCached(p))).toBe(false); // nothing is computed in the call itself
    for (let i = 0; i < 200 && sim.prefetchPending > 0; i++) vi.advanceTimersByTime(20);
    expect(sim.prefetchPending).toBe(0);
    expect(patches.every((p) => sim.isSweepCached(p))).toBe(true);
  });

  it('queues nothing for settings that are already solved', () => {
    const sim = new RamSim('valve-1');
    sim.sweep({ counterweight: 221 });
    sim.prefetch([{ counterweight: 221 }]);
    expect(sim.prefetchPending).toBe(0);
  });
});

describe('idleQueue', () => {
  afterEach(() => vi.useRealTimers());

  it('runs the work in slices and finishes it', () => {
    vi.useFakeTimers();
    const q = idleQueue(4);
    let steps = 0;
    q.push(() => ++steps >= 3);
    expect(q.pending).toBe(1);
    for (let i = 0; i < 10 && q.pending > 0; i++) vi.advanceTimersByTime(20);
    expect(q.pending).toBe(0);
    expect(steps).toBe(3);
  });

  it('forgets the work not started when cleared', () => {
    vi.useFakeTimers();
    const q = idleQueue(4);
    q.push(() => true);
    q.clear();
    expect(q.pending).toBe(0);
  });
});
