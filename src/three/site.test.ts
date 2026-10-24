import type { ViewOpts } from '@onigam/lab-kit/three';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { partIds } from '../part-ids';
import type { RamState } from '../sim/types';
import { H_FULL, SPRING_X } from './catchment/layout';
import * as DIMS from './dims';
import { createSiteScene, type SiteScene } from './site/scene';
import { runningState, sceneBoxes, stalledState, touches, view } from './test-utils';

// The `site` world by script: ids, floating and buried parts, explode, the 300 m route, the sliders, the catchment model it
// shares with the `catchment` world, the waste-water drain, NaN-free animation.

const SITE_IDS = partIds('site');

describe('site world', () => {
  const mod = createSiteScene() as SiteScene;
  const reg = mod.registry;

  it('registers exactly the frozen catalogue ids', () => {
    expect(SITE_IDS).toHaveLength(8);
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
    // buried on purpose: the pit (a chamber below ground), the tank slab and the dug-in spring box, the pipes that dive under the ground
    const buried: Record<string, string> = {
      'ram-pit': 'a chamber below the ground, the ram stands in it',
      'buffer-tank': 'its slab is sunk into the bench',
      'drive-pipe': 'the pipe goes under the ground before the pit wall',
      'delivery-pipe': 'the pipe leaves the pit under the ground',
      'waste-drain': 'the drain pipe is buried from the pit to its headwall',
      spring: 'the box and the gravel bed are dug into the shelf, the rocks into the scarp',
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
    // the horizontal run of a 40 m pipe falling 15 m is about 36 m (with the level runs at both ends), no more
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
            expect(Number.isFinite(mod.waste.outfall.x + mod.waste.soakaway.y)).toBe(true);
          }
        }
      }
    }
    mod.follow({ fall: 7.5, driveLength: 20, deliveryHead: 65, driveDiameter: 27 });
  });

  it('animates without NaN for running, stalled, empty, overflowing, gate closed, drain open and flow states', () => {
    const run = runningState();
    const stalled = stalledState();
    const states: [string, RamState, Partial<ViewOpts>][] = [
      ['running', run, {}],
      ['stalled', stalled, {}],
      ['schematic', run, { schematic: true }],
      ['night', { ...run, hour: 2 }, {}],
      ['empty tank', { ...run, tankLevel: 0, tankLitres: 0, driveFlow: 0 }, { schematic: true }],
      ['full, ram stopped', { ...stalled, tankLevel: 1, tankLitres: 5700 }, { schematic: true }],
      ['gate closed', { ...run, gateOpen: false, driveFlow: 0 }, {}],
      ['drain open', { ...run, tankDrainOpen: true, tankDrainFlow: 20, tankLevel: 0.6 }, { schematic: true }],
      ['plastic pipe', { ...run, waveSpeed: 500 }, {}],
      ['no state fields', { ...run, tankLevel: NaN, wasteFlow: NaN, waveSpeed: NaN }, {}],
    ];
    for (const [name, state, v] of states) {
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

  describe('the catchment of the site is the catchment model', () => {
    it('registers the two frames of the model as `spring` and `buffer-tank`, the spring 4.2 m west of the tank axis at the same level', () => {
      mod.follow({ fall: 7.5, driveLength: 20, deliveryHead: 65, driveDiameter: 27 });
      expect(reg.get('buffer-tank')!.object).toBe(mod.catchment.tankFrame);
      expect(reg.get('spring')!.object).toBe(mod.catchment.springFrame);
      const t = mod.catchment.tankFrame.position;
      const s = mod.catchment.springFrame.position;
      expect(t.x - s.x).toBeCloseTo(DIMS.SPRING.distanceToTank, 6);
      expect(SPRING_X).toBe(-DIMS.SPRING.distanceToTank);
      expect(s.y).toBeCloseTo(t.y, 9);
      // the outlet of the tank is exactly the fall above the ram axis
      expect(t.y + DIMS.TANK.outletAboveFloor).toBeCloseTo(DIMS.SITE.fall, 9);
    });

    it('stands on a bench of the terrain: the slab in the ground, the spring box dug into the shelf 2.45 m higher', () => {
      mod.follow({ fall: 7.5, driveLength: 20, deliveryHead: 65, driveDiameter: 27 });
      const t = mod.catchment.tankFrame.position;
      const s = mod.catchment.springFrame.position;
      expect(groundAt(mod, t.x, 0)).toBeCloseTo(t.y - DIMS.CATCHMENT.benchDepth, 1);
      expect(groundAt(mod, s.x, 0)).toBeCloseTo(t.y + DIMS.CATCHMENT.shelfHeight, 1);
    });

    it('draws the water at the level of the state and the overflow only when the tank is full and the spring gives more than the ram takes', () => {
      const run = runningState();
      mod.update({ ...run, tankLevel: 0.5, sourceFlow: 7.5, driveFlow: 6.7 }, 1 / 60, view());
      expect(mod.catchment.status.waterY).toBeCloseTo(0.5 * H_FULL, 9);
      expect(mod.catchment.status.overflow).toBe(0);
      mod.update({ ...run, tankLevel: 1, sourceFlow: 7.5, driveFlow: 6.7 }, 1 / 60, view());
      expect(mod.catchment.status.overflow).toBeCloseTo(0.8, 9);
      mod.update({ ...run, tankLevel: 1, sourceFlow: 7.5, driveFlow: 17 }, 1 / 60, view());
      expect(mod.catchment.status.overflow).toBe(0);
    });
  });

  describe('waste-water drain', () => {
    it('runs from the pit to a soakaway on the ground, 15 m of ditch away, and touches the pit', () => {
      mod.follow({ fall: 7.5, driveLength: 20, deliveryHead: 65, driveDiameter: 27 });
      mod.scene.updateMatrixWorld(true);
      const { outfall, soakaway } = mod.waste;
      const pit = reg.bounds('ram-pit');
      const drain = reg.bounds('waste-drain');
      expect(touches(drain, pit, 0.002)).toBe(true);
      expect(outfall.z).toBeGreaterThan(pit.max.z); // downhill of the pit (south)
      expect(Math.abs(outfall.y - groundAt(mod, outfall.x, outfall.z))).toBeLessThan(0.25);
      expect(Math.abs(soakaway.y - groundAt(mod, soakaway.x, soakaway.z))).toBeLessThan(0.1);
      expect(outfall.distanceTo(soakaway)).toBeGreaterThan(9);
      expect(outfall.distanceTo(soakaway)).toBeLessThan(DIMS.WASTE_DRAIN.ditchLength + 2.5);
      // lower than the pit's floor drain at the end of the run: the water goes down
      expect(soakaway.y).toBeLessThan(outfall.y);
    });

    it('carries the waste flow of the state: water when the ram runs, none when it is stopped', () => {
      const run = runningState();
      mod.update(run, 1 / 60, view());
      expect(mod.waste.flowing).toBeGreaterThan(5);
      expect(mod.waste.flowing).toBeLessThan(8);
      mod.update(stalledState(), 1 / 60, view());
      expect(mod.waste.flowing).toBe(0);
    });
  });

  it('dresses the drive pipe as steel, PVC or polyethylene from the wave speed of the state', () => {
    const pipe = reg
      .get('drive-pipe')!
      .meshes.find((m) => (m.material as THREE.MeshStandardMaterial).metalness !== undefined)!;
    const colour = () => (pipe.material as THREE.MeshStandardMaterial).color.getHex();
    const run = runningState();
    mod.update({ ...run, waveSpeed: 900 }, 1 / 60, view());
    const steel = colour();
    mod.update({ ...run, waveSpeed: 500 }, 1 / 60, view());
    const pvc = colour();
    mod.update({ ...run, waveSpeed: 350 }, 1 / 60, view());
    const pe = colour();
    expect(new Set([steel, pvc, pe]).size).toBe(3);
    mod.update({ ...run, waveSpeed: 900 }, 1 / 60, view());
  });
});

/** Terrain height under (x, z) in the site (the rendered surface). */
function groundAt(mod: SiteScene, x: number, z: number): number {
  return mod.surfaceY(x, z);
}
