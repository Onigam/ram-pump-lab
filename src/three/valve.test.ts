import type { PartRegistry, ViewOpts } from '@onigam/lab-kit/three';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { partIds } from '../part-ids';
import type { RamState } from '../sim/types';
import type { Poly } from './cut';
import * as DIMS from './dims';
import { PLATE_TOP_Y } from './ram/body';
import { createRamScene } from './ram/scene';
import { runningState, sceneBoxes, stalledState, touches, view } from './test-utils';
import { createValveScene } from './valve';
import { BENCH_TOP_Y } from './valve/bench';
import { DEFAULT_TRAVEL } from './valve/geo';
import { VALVE_PART_IDS } from './valve/model';

// The `valve` world by script: the video's waste valve at workshop scale. Same checks as the other worlds (ids, floating and
// buried parts, explode, NaN-free animation) and the mechanical ones that matter for this world: the stem really passes
// through the guide, the head sits on the cone when closed, the weight lands on the guide, no part interpenetrates another,
// and the valve of the `ram` world is the very same model.

const VALVE_IDS = partIds('valve');
const box = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o, true);

/** Parts that are allowed to touch nothing: an explicit allow-list, with the reason. */
const ALLOWED_FLOATING: Record<string, string> = {
  'base-plate': 'rests on the two steel parallels of the bench, which are staging, not parts',
};

describe('valve world', () => {
  const mod = createValveScene();
  const reg: PartRegistry = mod.registry;
  const part = (id: (typeof VALVE_PART_IDS)[number]) => box(mod.model.parts[id]);

  it('registers exactly the frozen catalogue ids', () => {
    expect([...reg.ids()].sort()).toEqual([...VALVE_IDS].sort());
    expect(VALVE_IDS).toHaveLength(14);
    expect([...VALVE_PART_IDS].sort()).toEqual([...VALVE_IDS].sort());
  });

  it('owns at least one mesh per part, so that isolate and x-ray act on every part', () => {
    for (const id of VALVE_IDS) expect(reg.get(id)!.meshes.length, id).toBeGreaterThan(0);
  });

  it('keeps the water, the spray and the bench out of every part', () => {
    const owned = new Set(VALVE_IDS.flatMap((id) => reg.get(id)!.meshes));
    mod.model.water.traverse((o) => expect(owned.has(o as THREE.Mesh)).toBe(false));
    mod.scene.getObjectByName('bench')!.traverse((o) => expect(owned.has(o as THREE.Mesh)).toBe(false));
  });

  it('has one hotspot per part, each anchored in the scene, with main and minor labels and no world link', () => {
    mod.scene.updateMatrixWorld(true);
    expect(mod.hotspots.map((h) => h.partId).sort()).toEqual([...VALVE_IDS].sort());
    for (const h of mod.hotspots) {
      let o: THREE.Object3D | null = h.anchor;
      while (o && o !== mod.scene) o = o.parent;
      expect(o, h.partId).toBe(mod.scene);
      expect(h.goto, h.partId).toBeUndefined();
    }
    const minor = mod.hotspots.filter((h) => h.minor).length;
    expect(minor).toBeGreaterThan(3);
    expect(mod.hotspots.length - minor).toBeGreaterThan(4);
  });

  it('keeps every hotspot on its part: within 3 cm of the box of the part it labels, also at explode 1', () => {
    for (const f of [0, 1]) {
      reg.setAllFactors(f);
      mod.scene.updateMatrixWorld(true);
      for (const h of mod.hotspots) {
        const p = new THREE.Vector3().setFromMatrixPosition(h.anchor.matrixWorld);
        expect(reg.bounds(h.partId).distanceToPoint(p), `${h.partId} at ${f}`).toBeLessThan(0.03);
      }
    }
    reg.setAllFactors(0);
  });

  it('has no floating part: every part touches another part within 2 mm, but for the explicit allow-list', () => {
    const boxes = sceneBoxes(mod);
    const bad: string[] = [];
    for (const [id, b] of boxes) {
      const other = [...boxes].some(([oid, ob]) => oid !== id && touches(b, ob, 0.002));
      if (!other && !ALLOWED_FLOATING[id]) bad.push(id);
    }
    expect(bad).toEqual([]);
    // the allowed one really rests on the parallels of the bench
    expect(boxes.get('base-plate')!.min.y).toBeCloseTo(BENCH_TOP_Y + DIMS.BENCH.parallelHeight, 3);
  });

  it('has nothing below the bench, also exploded', () => {
    for (const f of [0, 1]) {
      reg.setAllFactors(f);
      const boxes = sceneBoxes(mod);
      for (const [id, b] of boxes) expect(b.min.y, `${id} at ${f}`).toBeGreaterThan(BENCH_TOP_Y);
    }
    reg.setAllFactors(0);
  });

  it('gives every part a non-zero explode offset along the axis that moves it out of its place', () => {
    const before = sceneBoxes(mod);
    reg.setAllFactors(1);
    const after = sceneBoxes(mod);
    reg.setAllFactors(0);
    for (const id of VALVE_IDS) {
      const e = reg.get(id)!;
      expect(e.explode.length(), id).toBeGreaterThan(0.005);
      expect(Math.abs(e.explode.x) + Math.abs(e.explode.z), `${id} moves along the axis only`).toBe(0);
      expect(before.get(id)!.containsBox(after.get(id)!), `${id} stays inside its place`).toBe(false);
    }
  });

  it('explodes into a clean stack: parts keep their order on the axis, 5 mm apart, the stem skewering the lower ones', () => {
    reg.setAllFactors(1);
    const boxes = sceneBoxes(mod);
    reg.setAllFactors(0);
    const ids = VALVE_IDS.filter((id) => id !== 'valve-stem');
    for (const a of ids)
      for (const b of ids) {
        if (a >= b) continue;
        const A = boxes.get(a)!;
        const B = boxes.get(b)!;
        const apart = A.max.y + 0.005 <= B.min.y || B.max.y + 0.005 <= A.min.y;
        expect(apart, `${a} and ${b} overlap along the axis when exploded`).toBe(true);
      }
    // fitted from below: the seat, the head and the fins nut end under the plate; the rest of the valve goes up
    const plate = boxes.get('base-plate')!;
    for (const id of ['valve-seat', 'valve-head', 'valve-fins'])
      expect(boxes.get(id)!.max.y, id).toBeLessThan(plate.min.y);
    for (const id of ['valve-socket', 'valve-reducer', 'valve-nipple', 'valve-sleeve', 'valve-guide', 'counterweight'])
      expect(boxes.get(id)!.min.y, id).toBeGreaterThan(plate.max.y);
    // top to bottom along the stack: guide, weight, stroke nut, lock nut
    const order = ['valve-guide', 'counterweight', 'stroke-nut', 'lock-nut'];
    for (let i = 1; i < order.length; i++)
      expect(boxes.get(order[i])!.min.y).toBeGreaterThan(boxes.get(order[i - 1])!.max.y);
    // the stem passes through the lower fittings of the exploded stack (reducer, nipple, sleeve)
    const stem = boxes.get('valve-stem')!;
    for (const id of ['valve-reducer', 'valve-nipple', 'valve-sleeve']) {
      expect(stem.min.y, id).toBeLessThan(boxes.get(id)!.min.y);
      expect(stem.max.y, id).toBeGreaterThan(boxes.get(id)!.max.y);
    }
  });

  it('puts the weight on the guide when open, and the head on the seat when closed', () => {
    const s = runningState();
    const hold = (w: number) => {
      for (let i = 0; i < 90; i++) mod.update({ ...s, wasteValve: w, strokeCount: 0 }, 1 / 60, view());
      mod.scene.updateMatrixWorld(true);
    };
    hold(1);
    const travel = mod.model.travel();
    expect(part('counterweight').min.y).toBeCloseTo(part('valve-guide').max.y, 4);
    expect(part('stroke-nut').min.y).toBeCloseTo(part('counterweight').max.y, 4);
    expect(part('lock-nut').min.y).toBeCloseTo(part('stroke-nut').max.y, 4);
    expect(part('valve-seat').min.y - part('valve-head').min.y).toBeCloseTo(travel, 4);
    hold(0);
    // closed: the flat face of the head is level with the bottom of the seat, the weight stands `travel` above the guide
    expect(part('valve-head').min.y).toBeCloseTo(part('valve-seat').min.y, 4);
    expect(part('counterweight').min.y - part('valve-guide').max.y).toBeCloseTo(travel, 4);
    // the stem stays through the guide: its rod runs from under the fins nut to above the lock nut
    const stem = part('valve-stem');
    expect(stem.min.y).toBeLessThan(part('valve-fins').min.y + 0.002);
    expect(stem.max.y).toBeGreaterThan(part('lock-nut').max.y + 0.006);
    hold(1);
  });

  it('turns the stem with the fins, without ever turning a hotspot', () => {
    const s = runningState();
    const anchors = mod.hotspots.map((h) => h.anchor);
    const at = () => {
      mod.scene.updateMatrixWorld(true);
      return anchors.map((a) => new THREE.Vector3().setFromMatrixPosition(a.matrixWorld));
    };
    for (let i = 0; i < 60; i++) mod.update({ ...s, strokeCount: 0, wasteValve: 1 }, 1 / 60, view());
    const a = at();
    for (let i = 0; i < 120; i++) mod.update({ ...s, strokeCount: 9, wasteValve: 1 }, 1 / 60, view());
    expect(mod.model.rig.spinFrames[0].rotation.y).toBeGreaterThan(0.5);
    const b = at();
    a.forEach((p, i) => expect(p.distanceTo(b[i]), mod.hotspots[i].partId).toBeLessThan(1e-9));
  });

  it('fits: the machined sleeves 0.1 mm under the bore of the guide, the rod in their thread, the nipple 7 to 8 cm', () => {
    expect(DIMS.VALVE.guideTubeInnerDiameter - DIMS.VALVE.stemSleeveDiameter).toBeCloseTo(0.0001, 5);
    expect(DIMS.VALVE.sleeveRodDiameter).toBe(DIMS.VALVE.rodDiameter);
    expect(DIMS.VALVE.nippleLockNutAcrossFlats).toBeGreaterThan(DIMS.VALVE.threadDiameter);
    expect(DIMS.VALVE.nippleLength).toBeGreaterThanOrEqual(0.07);
    expect(DIMS.VALVE.nippleLength).toBeLessThanOrEqual(0.08);
    // the sleeves stay inside the bore of the guide over the whole visual travel (30 mm at most), at every stroke
    const top = DIMS.VALVE.stemSleeveBottom + DIMS.VALVE.stemSleeveSpacing + DIMS.VALVE.stemSleeveLength;
    expect(DIMS.VALVE.stemSleeveBottom - 0.03).toBeGreaterThanOrEqual(DIMS.VALVE.guideTubeBottom - 1e-9);
    expect(top).toBeLessThan(DIMS.VALVE.guideTop);
  });

  it('machines the four exhaust ports in the nipple, between the seat and the guide', () => {
    const nipple = mod.model.parts['valve-nipple'];
    const bars: THREE.Mesh[] = [];
    nipple.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const b = new THREE.Box3().setFromObject(m, true);
      const top = DIMS.VALVE.portBottom + DIMS.VALVE.portHeight;
      if (Math.abs(b.min.y - DIMS.VALVE.portBottom) < 1e-4 && Math.abs(b.max.y - top) < 1e-4) bars.push(m);
    });
    expect(bars).toHaveLength(DIMS.VALVE.portCount);
    const nb = box(nipple);
    expect(nb.max.y - DIMS.VALVE.nippleBottom - DIMS.VALVE.seatThickness).toBeGreaterThan(0.07);
    for (const m of bars) {
      const b = new THREE.Box3().setFromObject(m, true);
      expect(b.min.y).toBeCloseTo(DIMS.VALVE.portBottom, 4);
    }
  });

  it('has no two parts that interpenetrate (section of every part, closed and open, thread engagement allowed)', () => {
    // sample the half plane r >= 0 of the section on a grid that avoids the exact edges
    const step = 0.0002;
    const inside = (poly: Poly, x: number, y: number): boolean => {
      let c = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i];
        const [xj, yj] = poly[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    // pairs that screw into each other: the 0.2 mm of thread engagement of the 15x21 male thread in its female thread
    const threaded = new Set(['valve-nipple|valve-reducer', 'valve-reducer|valve-seat']);
    for (const pose of ['closed', 'open'] as const) {
      const sections = mod.model.sections(pose);
      const ids = Object.keys(sections);
      expect(ids.sort()).toEqual([...VALVE_IDS].sort());
      const overlap = new Map<string, number>();
      for (let yi = -0.01 / step; yi < 0.27 / step; yi++) {
        const y = (yi + 0.37) * step;
        for (let xi = 0; xi < 0.06 / step; xi++) {
          const x = (xi + 0.41) * step;
          const hit = ids.filter((id) => sections[id].some((p) => inside(p, x, y)));
          for (let a = 0; a < hit.length; a++)
            for (let b = a + 1; b < hit.length; b++) {
              const k = [hit[a], hit[b]].sort().join('|');
              overlap.set(k, (overlap.get(k) ?? 0) + step * step);
            }
        }
      }
      for (const [k, area] of overlap) {
        const limit = threaded.has(k) ? 4e-6 : 1e-9; // m²: 4 mm² of thread, otherwise none
        expect(area, `${k} (${pose})`).toBeLessThan(limit);
      }
    }
  });

  it('animates without NaN for running, stalled, section and flow states', () => {
    const run = runningState();
    const stalled = stalledState();
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
      for (const id of VALVE_IDS)
        expect(reg.bounds(id).isEmpty() || Number.isFinite(reg.bounds(id).min.x), `${name} ${id}`).toBe(true);
    }
  });

  it('cuts the housing, the seat and the head in half, with a cap for each, shown only for solid parts', () => {
    const run = runningState();
    const caps = () => {
      const out: THREE.Mesh[] = [];
      mod.scene.traverse((o) => o.userData.cap && out.push(o as THREE.Mesh));
      return out;
    };
    mod.update(run, 1 / 60, view({ cutaway: false }));
    expect(caps().every((c) => !c.visible)).toBe(true);
    mod.update(run, 1 / 60, view({ cutaway: true }));
    const owners = new Set(caps().map((c) => c.userData.ownerPart));
    for (const id of [
      'base-plate',
      'valve-socket',
      'valve-reducer',
      'valve-nipple',
      'valve-sleeve',
      'valve-guide',
      'valve-seat',
      'valve-head',
    ])
      expect(owners.has(id), id).toBe(true);
    expect(caps().every((c) => c.visible)).toBe(true);
    reg.setDisplay('valve-seat', 'ghost');
    mod.update(run, 1 / 60, view({ cutaway: true }));
    expect(
      caps()
        .filter((c) => c.userData.ownerPart === 'valve-seat')
        .every((c) => !c.visible),
    ).toBe(true);
    reg.setDisplay('valve-seat', 'solid');
    mod.update(run, 1 / 60, view({ cutaway: false }));
    // the caps lie on the plane z = 0 of the valve, through the axis
    for (const c of caps()) expect(c.getWorldPosition(new THREE.Vector3()).z).toBeCloseTo(0, 6);
  });

  it('cuts the spray and the flow dots with the section too, 3 mm behind the plane so that dots on the axis stay', () => {
    const run = runningState();
    mod.update(run, 1 / 60, view({ cutaway: true, schematic: true }));
    const dots: THREE.Points[] = [];
    mod.scene.traverse((o) => (o as THREE.Points).isPoints && dots.push(o as THREE.Points));
    expect(dots.length).toBeGreaterThanOrEqual(2); // the spray and the Flux dots
    for (const d of dots) {
      const planes = (d.material as THREE.Material).clippingPlanes ?? [];
      expect(planes.length).toBeGreaterThan(0);
      expect(planes[0].distanceToPoint(new THREE.Vector3(0, 0.1, 0.0))).toBeGreaterThan(0);
      expect(planes[0].distanceToPoint(new THREE.Vector3(0, 0.1, 0.002))).toBeGreaterThan(0);
      expect(planes[0].distanceToPoint(new THREE.Vector3(0, 0.1, 0.02))).toBeLessThan(0);
    }
    mod.update(run, 1 / 60, view({ cutaway: false }));
    for (const d of dots) expect((d.material as THREE.Material).clippingPlanes ?? []).toHaveLength(0);
  });

  it('holds the valve open and hides the water while exploded or incomplete, and shows them again after', () => {
    const run = runningState();
    const water = mod.model.water.children[0];
    for (let i = 0; i < 40; i++) mod.update({ ...run, wasteValve: 0 }, 1 / 60, view());
    expect(water.visible).toBe(true);
    reg.setFactor('valve-guide', 0.5);
    for (let i = 0; i < 40; i++) mod.update({ ...run, wasteValve: 0 }, 1 / 60, view());
    expect(water.visible).toBe(false);
    expect(mod.model.openness()).toBeGreaterThan(0.99);
    reg.setFactor('valve-guide', 0);
    reg.setDisplay('valve-nipple', 'hidden');
    mod.update(run, 1 / 60, view());
    expect(water.visible).toBe(false);
    reg.setDisplay('valve-nipple', 'solid');
    mod.update(run, 1 / 60, view());
    expect(water.visible).toBe(true);
    // x-ray (ghost) keeps the water: that is the point of seeing through the fittings
    reg.setDisplay('valve-reducer', 'ghost');
    mod.update(run, 1 / 60, view());
    expect(water.visible).toBe(true);
    reg.setDisplay('valve-reducer', 'solid');
  });

  it('isolates and X-rays every part: the others hidden or ghosted, the part itself and the update untouched', () => {
    const run = runningState();
    for (const id of VALVE_IDS) {
      for (const mode of ['hidden', 'ghost'] as const) {
        for (const other of VALVE_IDS) reg.setDisplay(other, other === id ? 'solid' : mode);
        for (let i = 0; i < 3; i++) mod.update(run, 1 / 60, view({ cutaway: true, schematic: true }));
        const own = reg.get(id)!;
        expect(own.display).toBe('solid');
        expect(
          own.meshes.every((m) => m.visible),
          `${id} stays visible`,
        ).toBe(true);
        for (const other of VALVE_IDS)
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
      for (const id of VALVE_IDS) out.push(...reg.bounds(id).min.toArray(), ...reg.bounds(id).max.toArray());
      return out;
    };
    for (let i = 0; i < 90; i++) mod.update(stalled, 1 / 60, view());
    const a = snap();
    for (let i = 0; i < 60; i++) mod.update({ ...stalled, simTime: stalled.simTime + i }, 1 / 60, view());
    const b = snap();
    b.forEach((v, i) => expect(v).toBeCloseTo(a[i], 6));
  });
});

describe('the waste valve of the ram world and of the valve world are one model', () => {
  const valveWorld = createValveScene();
  const ramWorld = createRamScene();
  const run = runningState();
  const origin = new THREE.Vector3(DIMS.RAM.xWaste, PLATE_TOP_Y, 0);

  /** Box of a part in the frame of its valve (origin = centre of the top face of the plate). */
  const local = (o: THREE.Object3D, at: THREE.Vector3) => box(o).translate(at.clone().negate());

  it('builds the same fourteen parts, to the micron, in the same pose', () => {
    valveWorld.scene.updateMatrixWorld(true);
    ramWorld.scene.updateMatrixWorld(true);
    // the ram's valve has the studs of the waste flange under its plate and the bench's has not: compare all but the plate
    for (const id of VALVE_PART_IDS) {
      if (id === 'base-plate') continue;
      const a = local(valveWorld.model.parts[id], valveWorld.model.root.position);
      const b = local(ramWorld.model.valve.parts[id], origin);
      a.min.toArray().forEach((v, i) => expect(v, `${id} min ${i}`).toBeCloseTo(b.min.getComponent(i), 6));
      a.max.toArray().forEach((v, i) => expect(v, `${id} max ${i}`).toBeCloseTo(b.max.getComponent(i), 6));
    }
    // the plate is the same too: 100 mm square, 8 mm; the ram's adds the studs (down 20 mm, up 16 mm)
    const a = local(valveWorld.model.parts['base-plate'], valveWorld.model.root.position);
    const b = local(ramWorld.model.valve.parts['base-plate'], origin);
    expect(a.min.x).toBeCloseTo(b.min.x, 6);
    expect(a.max.z).toBeCloseTo(b.max.z, 6);
    expect(b.min.y).toBeLessThan(a.min.y);
  });

  it('moves the same way for the same state, closed, open, slowed and with the fins turning', () => {
    const states: RamState[] = [
      { ...run, wasteValve: 1, strokeCount: 0 },
      { ...run, wasteValve: 0, strokeCount: 0 },
      { ...run, wasteValve: 0.5, strokeCount: 7, stroke: 3.4 },
      { ...run, wasteValve: 1, strokeCount: 20, stroke: 1 },
    ];
    for (const s of states) {
      for (let i = 0; i < 90; i++) {
        valveWorld.update(s, 1 / 60, view());
        ramWorld.update(s, 1 / 60, view());
      }
      valveWorld.scene.updateMatrixWorld(true);
      ramWorld.scene.updateMatrixWorld(true);
      for (const id of VALVE_PART_IDS) {
        if (id === 'base-plate') continue;
        const a = local(valveWorld.model.parts[id], valveWorld.model.root.position);
        const b = local(ramWorld.model.valve.parts[id], origin);
        expect(a.min.distanceTo(b.min), `${id} wasteValve ${s.wasteValve}`).toBeLessThan(1e-6);
        expect(a.max.distanceTo(b.max), `${id} wasteValve ${s.wasteValve}`).toBeLessThan(1e-6);
      }
    }
    expect(valveWorld.model.travel()).toBeCloseTo(ramWorld.model.valve.travel(), 9);
    expect(DEFAULT_TRAVEL).toBeGreaterThan(0.002);
  });

  it('shares the cross-sections, so that the interpenetration test of the valve world holds for the ram', () => {
    const a = valveWorld.model.sections('open');
    const b = ramWorld.model.valve.sections('open');
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });
});
