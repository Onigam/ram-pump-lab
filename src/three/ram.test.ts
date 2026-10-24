import type { PartRegistry, ViewOpts } from '@onigam/lab-kit/three';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { partIds } from '../part-ids';
import type { RamState } from '../sim/types';
import * as DIMS from './dims';
import { createRamScene } from './ram/scene';
import { runningState, sceneBoxes, stalledState, touches, view } from './test-utils';

// The `ram` world by script (BRIEF §7.5): ids, floating and buried parts, explode, NaN-free animation.

const RAM_IDS = partIds('ram');

describe('ram world', () => {
  const mod = createRamScene();
  const reg: PartRegistry = mod.registry;

  it('registers exactly the frozen catalogue ids', () => {
    expect([...reg.ids()].sort()).toEqual([...RAM_IDS].sort());
  });

  it('owns at least one mesh per part, so that isolate and x-ray act on every part', () => {
    for (const id of RAM_IDS) expect(reg.get(id)!.meshes.length, id).toBeGreaterThan(0);
  });

  it('has one hotspot per part, each anchored in the scene', () => {
    mod.scene.updateMatrixWorld(true);
    expect(mod.hotspots.map((h) => h.partId).sort()).toEqual([...RAM_IDS].sort());
    for (const h of mod.hotspots) {
      let o: THREE.Object3D | null = h.anchor;
      while (o && o !== mod.scene) o = o.parent;
      expect(o, h.partId).toBe(mod.scene);
    }
  });

  it('has no floating part: every part touches another part or the floor within 2 mm', () => {
    const boxes = sceneBoxes(mod);
    const bad: string[] = [];
    for (const [id, box] of boxes) {
      const onFloor = box.min.y <= DIMS.RAM.floorY + 0.002;
      const other = [...boxes].some(([oid, ob]) => oid !== id && touches(box, ob, 0.002));
      if (!onFloor && !other) bad.push(id);
    }
    expect(bad).toEqual([]);
  });

  it('has nothing below the floor', () => {
    const boxes = sceneBoxes(mod);
    for (const [id, box] of boxes) expect(box.min.y, id).toBeGreaterThanOrEqual(DIMS.RAM.floorY - 0.002);
  });

  it('gives every part a non-zero explode offset that moves it out of its place', () => {
    const before = sceneBoxes(mod);
    reg.setAllFactors(1);
    const after = sceneBoxes(mod);
    reg.setAllFactors(0);
    for (const id of RAM_IDS) {
      const e = reg.get(id)!;
      expect(e.explode.length(), id).toBeGreaterThan(0);
      expect(before.get(id)!.containsBox(after.get(id)!), `${id} stays inside its place`).toBe(false);
    }
  });

  it('keeps the weight on the guide when open and raises the stack by the visual travel when closed', () => {
    const s = runningState();
    const step = (w: number) => {
      for (let i = 0; i < 80; i++) mod.update({ ...s, wasteValve: w, strokeCount: 0 }, 1 / 60, view());
      mod.scene.updateMatrixWorld(true);
      return { weight: reg.bounds('counterweight'), guide: reg.bounds('valve-guide'), head: reg.bounds('valve-seat') };
    };
    const open = step(1);
    expect(open.weight.min.y).toBeCloseTo(open.guide.max.y, 3);
    const closed = step(0);
    const travel = Math.min(0.03, Math.max(0.002, (s.stroke / 1000) * DIMS.VALVE.strokeVisualScale));
    expect(closed.weight.min.y - closed.guide.max.y).toBeCloseTo(travel, 3);
  });

  it('animates without NaN for running, stalled, section and flow states', () => {
    const run = runningState();
    const stalled = stalledState();
    expect(stalled.status).toBe('stalled');
    const cases: [string, RamState, Partial<ViewOpts>][] = [
      ['running', run, {}],
      ['stalled', stalled, {}],
      ['cutaway', run, { cutaway: true }],
      ['schematic', run, { schematic: true }],
      ['slow motion', run, { slowMo: 0.02, schematic: true, cutaway: true }],
    ];
    for (const [name, state, v] of cases) {
      for (let i = 0; i < 30; i++) mod.update(state, 1 / 60, view(v));
      mod.scene.updateMatrixWorld(true);
      let bad = 0;
      mod.scene.traverse((o) => {
        const p = o.position;
        const r = o.rotation;
        const sc = o.scale;
        if (![p.x, p.y, p.z, r.x, r.y, r.z, sc.x, sc.y, sc.z].every(Number.isFinite)) bad++;
      });
      expect(bad, name).toBe(0);
      for (const id of RAM_IDS)
        expect(reg.bounds(id).isEmpty() || Number.isFinite(reg.bounds(id).min.x), `${name} ${id}`).toBe(true);
    }
  });

  it('does not move when the ram is stalled', () => {
    const stalled = stalledState();
    const snap = () => {
      const out: number[] = [];
      mod.scene.updateMatrixWorld(true);
      for (const id of RAM_IDS) out.push(...reg.bounds(id).min.toArray(), ...reg.bounds(id).max.toArray());
      return out;
    };
    for (let i = 0; i < 90; i++) mod.update(stalled, 1 / 60, view());
    const a = snap();
    for (let i = 0; i < 60; i++) mod.update({ ...stalled, simTime: stalled.simTime + i }, 1 / 60, view());
    const b = snap();
    expect(b.length).toBe(a.length);
    b.forEach((v, i) => expect(v).toBeCloseTo(a[i], 6));
  });
});
