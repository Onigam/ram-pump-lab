import type { PartRegistry, ViewOpts } from '@onigam/lab-kit/three';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { partIds } from '../part-ids';
import type { RamState } from '../sim/types';
import * as DIMS from './dims';
import { CH } from './ram/chamber';
import { STUB_X0 } from './ram/inlet';
import { FOUNDATION_BOTTOM } from './ram/foundation';
import { createRamScene } from './ram/scene';
import { VALVE_PART_IDS } from './valve/model';
import { runningState, sceneBoxes, stalledState, touches, view } from './test-utils';

// The `ram` world by script (BRIEF §7.5): ids, floating and buried parts, explode, NaN-free animation. The waste valve is ONE
// registered part here; its fourteen parts are checked in valve.test.ts, which also proves that both worlds agree.

const RAM_IDS = partIds('ram');
const worldBox = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o, true);
/** Visual travel of the stem for a stroke in mm (the 3D draws it larger, see VALVE.strokeVisualScale). */
const travelFor = (strokeMm: number) =>
  Math.min(0.03, Math.max(0.002, (strokeMm / 1000) * DIMS.VALVE.strokeVisualScale));

describe('ram world', () => {
  const mod = createRamScene();
  const reg: PartRegistry = mod.registry;

  it('registers exactly the frozen catalogue ids', () => {
    expect([...reg.ids()].sort()).toEqual([...RAM_IDS].sort());
    expect(RAM_IDS).toHaveLength(13);
  });

  it('owns at least one mesh per part, so that isolate and x-ray act on every part', () => {
    for (const id of RAM_IDS) expect(reg.get(id)!.meshes.length, id).toBeGreaterThan(0);
  });

  it('registers the waste valve as one single part: its fourteen parts belong to the valve world', () => {
    for (const id of partIds('valve')) expect(reg.get(id), id).toBeUndefined();
    mod.scene.updateMatrixWorld(true);
    const owned = new Set(reg.get('waste-valve')!.meshes);
    const stray: string[] = [];
    for (const id of VALVE_PART_IDS)
      mod.model.valve.parts[id].traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && !m.userData.cap && !owned.has(m)) stray.push(`${id}/${m.name}`);
      });
    expect(stray).toEqual([]);
    // the water and the spray stay outside every part: they are never ghosted, hidden or picked
    mod.model.valve.water.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) expect(owned.has(m)).toBe(false);
    });
  });

  it('has one hotspot per part, each anchored in the scene, and no world link (the lead wires them)', () => {
    mod.scene.updateMatrixWorld(true);
    expect(mod.hotspots.map((h) => h.partId).sort()).toEqual([...RAM_IDS].sort());
    for (const h of mod.hotspots) {
      let o: THREE.Object3D | null = h.anchor;
      while (o && o !== mod.scene) o = o.parent;
      expect(o, h.partId).toBe(mod.scene);
      expect(h.goto, h.partId).toBeUndefined();
    }
  });

  it('has no floating part: every part touches another part or the foundation floor within 2 mm', () => {
    const boxes = sceneBoxes(mod);
    const bad: string[] = [];
    for (const [id, box] of boxes) {
      const onFloor = box.min.y <= FOUNDATION_BOTTOM + 0.002;
      const other = [...boxes].some(([oid, ob]) => oid !== id && touches(box, ob, 0.002));
      if (!onFloor && !other) bad.push(id);
    }
    expect(bad).toEqual([]);
  });

  it('has nothing below the floor, which is the underside of the foundation', () => {
    const boxes = sceneBoxes(mod);
    for (const [id, box] of boxes) expect(box.min.y, id).toBeGreaterThanOrEqual(FOUNDATION_BOTTOM - 0.002);
    expect(boxes.get('foundation')!.min.y).toBeCloseTo(FOUNDATION_BOTTOM, 3);
  });

  it('anchors the ram: the feet stand on the foundation, whose studs rise through the lugs', () => {
    const boxes = sceneBoxes(mod);
    const f = boxes.get('foundation')!;
    const body = boxes.get('ram')!;
    expect(body.min.y).toBeCloseTo(DIMS.RAM.floorY, 3); // the lugs of the feet
    expect(f.max.y).toBeGreaterThan(
      DIMS.RAM.floorY + 0.012 + DIMS.FOUNDATION.washerThickness + DIMS.FOUNDATION.nutThickness,
    );
    // the pad covers both feet (lugs 0.11 m long, 0.13 m wide), and the studs rise above them
    const feet = [
      DIMS.RAM.bodyLength / 2 - DIMS.RAM.footSpacing / 2,
      DIMS.RAM.bodyLength / 2 + DIMS.RAM.footSpacing / 2,
    ];
    expect(f.min.x).toBeLessThan(feet[0] - 0.055);
    expect(f.max.x).toBeGreaterThan(feet[1] + 0.055);
    expect(f.max.z).toBeGreaterThan(0.065);
  });

  it('keeps the connections where the site expects them', () => {
    const boxes = sceneBoxes(mod);
    // the drive pipe stub starts at STUB_X0 (the site draws the drive pipe up to it)
    expect(boxes.get('inlet-flange')!.min.x).toBeCloseTo(STUB_X0, 3);
    // the four bolts of the flange end inside the flange of the strainer (14 to 16 mm deep), behind the gasket
    const s = boxes.get('strainer')!;
    expect(boxes.get('inlet-flange')!.max.x).toBeGreaterThan(s.min.x + DIMS.INLET.gasketThickness);
    expect(boxes.get('inlet-flange')!.max.x).toBeLessThan(s.min.x + DIMS.INLET.flangeThickness);
    // the delivery pipe leaves at OUT_X (site/routes.ts): outlet port, valve V3, then the union with the pipe stub
    const out =
      DIMS.RAM.xDelivery + CH.R + 0.009 + 0.04 + DIMS.FITTINGS.smallBallValveLength + DIMS.FITTINGS.outletStubLength;
    expect(boxes.get('delivery-union')!.max.x).toBeCloseTo(out, 3);
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

  it('lifts the whole ram off the studs of its foundation when exploded, the outlet staying level with the chamber port', () => {
    reg.setAllFactors(1);
    const boxes = sceneBoxes(mod);
    reg.setAllFactors(0);
    const f = boxes.get('foundation')!;
    // nothing but the foundation stays on it: every other part clears the nuts of the studs
    for (const id of RAM_IDS) if (id !== 'foundation') expect(boxes.get(id)!.min.y, id).toBeGreaterThan(f.max.y - 0.03);
    // the outlet valve and the union ride with the chamber, so that they stay level with its outlet port
    const port = DIMS.CHAMBER.outletHeight + reg.get('air-chamber')!.explode.y;
    for (const id of ['outlet-valve', 'delivery-union']) {
      expect(boxes.get(id)!.min.y, id).toBeLessThan(port);
      expect(boxes.get(id)!.max.y, id).toBeGreaterThan(port);
    }
  });

  it('closes the waste valve on its seat and hangs it on its stroke nut when open', () => {
    const s = runningState();
    const valve = mod.model.valve;
    const step = (w: number) => {
      for (let i = 0; i < 80; i++) mod.update({ ...s, wasteValve: w, strokeCount: 0 }, 1 / 60, view());
      mod.scene.updateMatrixWorld(true);
      const b = (id: (typeof VALVE_PART_IDS)[number]) => worldBox(valve.parts[id]);
      return { nut: b('stroke-nut'), guide: b('valve-guide'), head: b('valve-head'), seat: b('valve-seat') };
    };
    const open = step(1);
    expect(open.nut.min.y).toBeCloseTo(open.guide.max.y, 3);
    expect(open.seat.min.y - open.head.min.y).toBeCloseTo(travelFor(s.stroke), 3);
    const closed = step(0);
    expect(closed.nut.min.y - closed.guide.max.y).toBeCloseTo(travelFor(s.stroke), 3);
    // closed: the flat face of the head is level with the bottom of the seat (the cone is on the cone)
    expect(closed.head.min.y).toBeCloseTo(closed.seat.min.y, 3);
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

  it('draws the section of the waste valve under the id waste-valve, and hides it with the part', () => {
    const run = runningState();
    mod.update(run, 1 / 60, view({ cutaway: true }));
    const caps: THREE.Mesh[] = [];
    mod.model.valve.root.traverse((o) => o.userData.cap && caps.push(o as THREE.Mesh));
    expect(caps.length).toBeGreaterThanOrEqual(8);
    for (const c of caps) {
      expect(c.userData.ownerPart).toBe('waste-valve');
      expect(c.visible).toBe(true);
    }
    reg.setDisplay('waste-valve', 'ghost');
    mod.update(run, 1 / 60, view({ cutaway: true }));
    for (const c of caps) expect(c.visible).toBe(false);
    reg.setDisplay('waste-valve', 'solid');
    mod.update(run, 1 / 60, view({ cutaway: false }));
    for (const c of caps) expect(c.visible).toBe(false);
  });

  it('isolates and X-rays every part: the others hidden or ghosted, the part itself and the update untouched', () => {
    const run = runningState();
    for (const id of RAM_IDS) {
      for (const mode of ['hidden', 'ghost'] as const) {
        for (const other of RAM_IDS) reg.setDisplay(other, other === id ? 'solid' : mode);
        for (let i = 0; i < 3; i++) mod.update(run, 1 / 60, view({ cutaway: true, schematic: true }));
        const own = reg.get(id)!;
        expect(own.display).toBe('solid');
        expect(
          own.meshes.every((m) => m.visible),
          `${id} stays visible`,
        ).toBe(true);
        for (const other of RAM_IDS)
          if (other !== id)
            expect(
              reg.get(other)!.meshes.every((m) => m.visible === (mode === 'ghost')),
              `${other} ${mode} while ${id} is shown`,
            ).toBe(true);
        mod.scene.updateMatrixWorld(true);
        expect(Number.isFinite(reg.bounds(id).min.x)).toBe(true);
      }
    }
    reg.setAllDisplay('solid');
    mod.update(run, 1 / 60, view());
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
