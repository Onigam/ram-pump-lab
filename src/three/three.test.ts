import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { PartRegistry, SceneModule, ViewOpts } from '@onigam/lab-kit/three';
import { RamSim } from '../sim/engine';
import type { RamState } from '../sim/types';
import * as DIMS from './dims';
import { createRamScene } from './ram/scene';
import { createSiteScene, type SiteScene } from './site/scene';

// Checks of the two 3D worlds by script (BRIEF §7.5): the catalogue ids, no floating or buried part, explode offsets,
// the animation from the state (no NaN), the dimensions, and the geometry of the site against the reported figures.

const RAM_IDS = [
  'ram',
  'inlet-valve',
  'waste-valve',
  'valve-seat',
  'valve-stem',
  'valve-guide',
  'stroke-nut',
  'lock-nut',
  'counterweight',
  'valve-fins',
  'base-plate',
  'delivery-valve',
  'air-chamber',
  'snifter',
  'gauge',
  'outlet-valve',
  'drain-valve',
  'strainer',
];
const SITE_IDS = ['spring', 'buffer-tank', 'drive-pipe', 'ram-pit', 'delivery-pipe', 'water-tower', 'house'];

const view = (patch: Partial<ViewOpts> = {}): ViewOpts => ({
  slowMo: 1,
  cutaway: false,
  schematic: false,
  time: 1,
  ...patch,
});

function runningState(steps = 400): RamState {
  const sim = new RamSim();
  sim.applyPreset('valve-1');
  for (let i = 0; i < steps; i++) sim.step(1 / 60);
  return { ...sim.state };
}

function stalledState(): RamState {
  const sim = new RamSim();
  sim.applyPreset('valve-3');
  sim.set({ timeScale: 3600 });
  for (let i = 0; i < 60 * 40; i++) sim.step(1 / 60);
  return { ...sim.state };
}

const sceneBoxes = (mod: SceneModule<RamState>): Map<string, THREE.Box3> => {
  mod.scene.updateMatrixWorld(true);
  const out = new Map<string, THREE.Box3>();
  for (const id of mod.registry.ids()) out.set(id, mod.registry.bounds(id));
  return out;
};

const touches = (a: THREE.Box3, b: THREE.Box3, tol: number): boolean => a.clone().expandByScalar(tol).intersectsBox(b);

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

describe('site world', () => {
  const mod = createSiteScene() as SiteScene;
  const reg = mod.registry;

  it('registers exactly the frozen catalogue ids', () => {
    expect([...reg.ids()].sort()).toEqual([...SITE_IDS].sort());
  });

  it('owns at least one mesh per part, so that isolate and x-ray act on every part', () => {
    for (const id of SITE_IDS) expect(reg.get(id)!.meshes.length, id).toBeGreaterThan(0);
  });

  it('has one hotspot per part and links the pit to the ram world', () => {
    expect(mod.hotspots.map((h) => h.partId).sort()).toEqual([...SITE_IDS].sort());
    expect(mod.hotspots.find((h) => h.partId === 'ram-pit')?.goto).toBe('ram');
    for (const h of mod.hotspots) {
      let o: THREE.Object3D | null = h.anchor;
      while (o && o !== mod.scene) o = o.parent;
      expect(o, h.partId).toBe(mod.scene);
    }
  });

  it('draws the delivery pipe at the reported 300 m (within 1 %) and the drive pipe at 20 m with a 7.5 m fall', () => {
    expect(Math.abs(mod.deliveryLength() - DIMS.SITE.deliveryLength)).toBeLessThan(DIMS.SITE.deliveryLength * 0.01);
    const boxes = sceneBoxes(mod);
    const drive = boxes.get('drive-pipe')!;
    // the pipe starts at the height of the fall above the ram axis
    expect(drive.max.y).toBeGreaterThan(DIMS.SITE.fall - 0.05);
    expect(drive.max.y).toBeLessThan(DIMS.SITE.fall + 0.35);
    // the tower inlet is at the delivery head
    const tower = boxes.get('water-tower')!;
    expect(tower.max.y).toBeGreaterThan(DIMS.SITE.deliveryHead);
    expect(tower.max.y).toBeLessThan(DIMS.SITE.deliveryHead + 3);
  });

  it('has no floating part: every part touches another part or the ground', () => {
    const boxes = sceneBoxes(mod);
    const bad: string[] = [];
    for (const [id, box] of boxes) {
      const other = [...boxes].some(([oid, ob]) => oid !== id && touches(box, ob, 0.002));
      // ground contact: the lowest point of the box reaches the terrain under its footprint
      const g = Math.min(
        ...[
          [box.min.x, box.min.z],
          [box.max.x, box.min.z],
          [box.min.x, box.max.z],
          [box.max.x, box.max.z],
          [(box.min.x + box.max.x) / 2, (box.min.z + box.max.z) / 2],
        ].map(([x, z]) => groundAt(mod, x, z)),
      );
      const onGround = box.min.y <= g + 0.05;
      if (!other && !onGround) bad.push(id);
    }
    expect(bad).toEqual([]);
  });

  it('keeps the parts out of the ground, except the buried ones', () => {
    // buried on purpose: the pit (a chamber below ground), the tank slab and the pipes that dive under the ground
    const buried: Record<string, string> = {
      'ram-pit': 'a chamber below the ground, the ram stands in it',
      'buffer-tank': 'its slab is sunk into the plateau',
      'drive-pipe': 'the pipe goes under the ground before the pit wall',
      'delivery-pipe': 'the pipe leaves the pit under the ground',
      spring: 'the rock outcrop is embedded in the hillside',
    };
    const boxes = sceneBoxes(mod);
    for (const [id, box] of boxes) {
      if (buried[id]) continue;
      const g = Math.max(groundAt(mod, box.min.x, box.min.z), groundAt(mod, box.max.x, box.max.z));
      expect(box.min.y, id).toBeGreaterThanOrEqual(g - 0.6);
    }
  });

  it('gives every part a non-zero explode offset that lifts it out of its place', () => {
    const before = sceneBoxes(mod);
    reg.setAllFactors(1);
    const after = sceneBoxes(mod);
    reg.setAllFactors(0);
    for (const id of SITE_IDS) {
      expect(reg.get(id)!.explode.length(), id).toBeGreaterThan(0);
      expect(before.get(id)!.containsBox(after.get(id)!), `${id} stays inside its place`).toBe(false);
    }
  });

  it('follows the sliders: head raises the tower, fall raises the spring, the drive pipe keeps its length', () => {
    const s = runningState();
    const towerY = () => reg.bounds('water-tower').max.y;
    const springY = () => reg.bounds('spring').min.y;
    const driveBox = () => reg.bounds('drive-pipe');
    mod.follow({ fall: 7.5, driveLength: 20, deliveryHead: 65, driveDiameter: 27 });
    mod.scene.updateMatrixWorld(true);
    const t0 = towerY();
    const sp0 = springY();
    mod.follow({ fall: 7.5, driveLength: 20, deliveryHead: 100, driveDiameter: 27 });
    mod.scene.updateMatrixWorld(true);
    expect(towerY() - t0).toBeCloseTo(35, 0);
    mod.follow({ fall: 15, driveLength: 40, deliveryHead: 100, driveDiameter: 27 });
    mod.scene.updateMatrixWorld(true);
    expect(springY() - sp0).toBeCloseTo(7.5, 0);
    const d = driveBox();
    expect(d.max.y).toBeGreaterThan(14.9);
    // the horizontal run of a 40 m pipe falling 15 m is about 36 m (plus the level run), no more
    expect(d.max.x - d.min.x).toBeGreaterThan(33);
    expect(d.max.x - d.min.x).toBeLessThan(40);
    // and the world still updates for every state
    for (let i = 0; i < 5; i++) mod.update({ ...s, fall: 15, driveLength: 40, deliveryHead: 100 }, 1 / 60, view());
    mod.follow({ fall: 7.5, driveLength: 20, deliveryHead: 65, driveDiameter: 27 });
  });

  it('survives the extremes of the sliders without NaN', () => {
    const s = runningState();
    for (const fall of [2, 7.5, 30]) {
      for (const driveLength of [Math.max(5, fall * 1.1), 20, 60]) {
        for (const deliveryHead of [5, 65, 150]) {
          for (const driveDiameter of [15, 27, 54]) {
            mod.follow({ fall, driveLength, deliveryHead, driveDiameter });
            mod.update({ ...s, fall, driveLength, deliveryHead, driveDiameter }, 1 / 30, view());
            mod.scene.updateMatrixWorld(true);
            for (const id of SITE_IDS) {
              const b = reg.bounds(id);
              expect(
                [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z].every(Number.isFinite),
                `${id} at fall ${fall}, L ${driveLength}, H ${deliveryHead}, D ${driveDiameter}`,
              ).toBe(true);
            }
            expect(Number.isFinite(mod.deliveryLength())).toBe(true);
          }
        }
      }
    }
    mod.follow({ fall: 7.5, driveLength: 20, deliveryHead: 65, driveDiameter: 27 });
  });

  it('animates without NaN for running, stalled and flow states', () => {
    const run = runningState();
    const stalled = stalledState();
    for (const [name, state, v] of [
      ['running', run, {}],
      ['stalled', stalled, {}],
      ['schematic', run, { schematic: true }],
      ['night', { ...run, hour: 2 }, {}],
    ] as [string, RamState, Partial<ViewOpts>][]) {
      for (let i = 0; i < 20; i++) mod.update(state, 1 / 60, view(v));
      mod.scene.updateMatrixWorld(true);
      let bad = 0;
      mod.scene.traverse((o) => {
        const p = o.position;
        if (![p.x, p.y, p.z, o.scale.x, o.scale.y, o.scale.z].every(Number.isFinite)) bad++;
      });
      expect(bad, name).toBe(0);
      for (const id of SITE_IDS) expect(Number.isFinite(reg.bounds(id).min.x), `${name} ${id}`).toBe(true);
    }
  });
});

/** Terrain height under (x, z) in the site (the rendered surface). */
function groundAt(mod: SiteScene, x: number, z: number): number {
  return mod.surfaceY(x, z);
}

describe('dimensions', () => {
  const positive = (obj: Record<string, unknown>, path: string, out: string[]) => {
    for (const [k, v] of Object.entries(obj)) {
      const name = `${path}.${k}`;
      if (typeof v === 'number') {
        if (!Number.isFinite(v)) out.push(`${name} is not finite`);
        else if (v <= 0 && !SIGNED.has(name)) out.push(`${name} = ${v} is not positive`);
      } else if (Array.isArray(v)) {
        v.forEach((x, i) => {
          if (typeof x === 'number' && !Number.isFinite(x)) out.push(`${name}[${i}] is not finite`);
          if (Array.isArray(x)) x.forEach((y) => !Number.isFinite(y) && out.push(`${name}[${i}] is not finite`));
        });
      } else if (v && typeof v === 'object') positive(v as Record<string, unknown>, name, out);
    }
  };
  // negative or zero by nature: heights below the datum, the datum itself, plan coordinates
  const SIGNED = new Set([
    'RAM.axisY',
    'RAM.floorY',
    'PIT.floorY',
    'TOWER.planZ',
    'TOWER.troughZ',
    'TOWER.riserZ',
    'HOUSE.planZ',
  ]);

  it('exports finite, positive numbers', () => {
    const out: string[] = [];
    for (const [name, v] of Object.entries(DIMS)) {
      if (v && typeof v === 'object') positive(v as Record<string, unknown>, name, out);
    }
    expect(out).toEqual([]);
  });

  it('quotes the reported figures of the video', () => {
    expect(DIMS.SITE.fall).toBe(7.5);
    expect(DIMS.SITE.driveLength).toBe(20);
    expect(DIMS.SITE.deliveryLength).toBe(300);
    expect(DIMS.SITE.deliveryHead).toBe(65);
    expect(DIMS.VALVE.seatBore).toEqual({ 1: 0.015, 2: 0.02, 3: 0.026 });
  });

  it('keeps the guide bore clearly larger than the rod and the sleeves a tenth of a millimetre under it', () => {
    expect(DIMS.VALVE.guideTubeInnerDiameter).toBeGreaterThanOrEqual(0.009);
    expect(DIMS.VALVE.guideTubeInnerDiameter - DIMS.VALVE.stemSleeveDiameter).toBeCloseTo(0.0001, 5);
  });
});
