import type { ViewOpts } from '@onigam/lab-kit/three';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { partIds } from '../part-ids';
import { RamSim } from '../sim/engine';
import type { RamState } from '../sim/types';
import {
  BED_X0,
  BED_X1,
  BENCH_Y,
  BOX_FLOOR_Y,
  BOX_OHL,
  FEED_X0,
  H_FULL,
  H_LID,
  H_SHELL,
  OUT_X,
  OUT_Y,
  R,
  SHELF_Y,
  SPRING_X,
  feedY,
  groundY,
} from './catchment/layout';
import { EXPLODE, createCatchmentScene, type CatchmentScene } from './catchment/scene';
import { bedZones } from './catchment/spring';
import { PLATE_Y } from './catchment/tank';
import * as DIMS from './dims';
import { runningState, sceneBoxes, stalledState, touches, view } from './test-utils';

// The `catchment` world by script: the nine frozen ids, floating and buried parts, explode, the water and what it does in the states
// of the simulation, the hydraulics the drawing claims (the water goes down all the way, the overflow is above the working level, the
// drain is the lowest point...), the section, the triangle budget.

const IDS = partIds('catchment');
const THOUSAND = 1000;

const triangles = (root: THREE.Object3D, instanced = true): number => {
  let n = 0;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const inst = (m as THREE.InstancedMesh).isInstancedMesh;
    if (inst && !instanced) return;
    const g = m.geometry;
    n += ((g.index ? g.index.count : g.attributes.position.count) / 3) * (inst ? (m as THREE.InstancedMesh).count : 1);
  });
  return n;
};

const finiteBox = (b: THREE.Box3) => [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z].every(Number.isFinite);

describe('catchment world', () => {
  const mod = createCatchmentScene() as CatchmentScene;
  const reg = mod.registry;
  const model = mod.model;

  const hold = (patch = {}) => ({ tank: false, box: false, flows: false, ...patch });
  const step = (s: RamState, v: Partial<ViewOpts> = {}, n = 5) => {
    for (let i = 0; i < n; i++) mod.update(s, 1 / 60, view(v));
    mod.scene.updateMatrixWorld(true);
  };

  it('registers exactly the nine frozen catalogue ids', () => {
    expect(IDS).toHaveLength(9);
    expect([...reg.ids()].sort()).toEqual([...IDS].sort());
  });

  it('owns at least one mesh per part, so that isolate and x-ray act on every part', () => {
    for (const id of IDS) expect(reg.get(id)!.meshes.length, id).toBeGreaterThan(0);
  });

  it('has a hotspot per part, the main ones and the minor ones, and one link to the site', () => {
    expect(mod.hotspots.map((h) => h.partId).sort()).toEqual([...IDS].sort());
    expect(mod.hotspots.filter((h) => h.goto).map((h) => [h.partId, h.goto])).toEqual([['drive-gate-valve', 'site']]);
    expect(mod.hotspots.filter((h) => h.minor).length).toBeGreaterThan(0);
    expect(mod.hotspots.filter((h) => !h.minor).length).toBeGreaterThanOrEqual(5);
    for (const h of mod.hotspots) {
      let o: THREE.Object3D | null = h.anchor;
      while (o && o !== mod.scene) o = o.parent;
      expect(o, h.partId).toBe(mod.scene);
    }
    expect(mod.home.position.distanceTo(mod.home.target)).toBeGreaterThan(mod.minDistance);
    expect(mod.home.position.distanceTo(mod.home.target)).toBeLessThan(mod.maxDistance);
  });

  describe('assembly', () => {
    const boxes = () => sceneBoxes(mod);

    it('has no floating part: every part touches another part (within 2 mm), and the chain reaches the ground', () => {
      const b = boxes();
      // what is bolted to what (the connections of the drawing)
      const joined: [string, string][] = [
        ['spring-box', 'gravel-filter'], // the bed is built against the west wall of the box
        ['spring-box', 'feed-pipe'], // the strainer inside, the collar through the east wall
        ['feed-pipe', 'tank-lid'], // the free end goes down through the lid
        ['tank-shell', 'tank-lid'],
        ['tank-shell', 'overflow-pipe'], // bulkhead fitting
        ['tank-shell', 'intake-screen'], // the stub screws into the outlet bulkhead
        ['tank-shell', 'drive-gate-valve'],
        ['tank-shell', 'tank-drain'],
      ];
      for (const [a, c] of joined) expect(touches(b.get(a)!, b.get(c)!, 0.002), `${a} touches ${c}`).toBe(true);
      // every part is in the chain, and the tank (slab), the box and the bed stand on the ground
      const linked = new Set<string>(['tank-shell']);
      let grown = true;
      while (grown) {
        grown = false;
        for (const [a, c] of joined) {
          if (linked.has(a) !== linked.has(c)) {
            linked.add(a);
            linked.add(c);
            grown = true;
          }
        }
      }
      expect([...linked].sort()).toEqual([...IDS].sort());
      expect(b.get('tank-shell')!.min.y).toBeLessThan(BENCH_Y); // slab dug into the bench
      for (const id of ['spring-box', 'gravel-filter']) {
        const g = groundY((b.get(id)!.min.x + b.get(id)!.max.x) / 2, 0);
        expect(b.get(id)!.min.y, id).toBeLessThan(g); // dug into the shelf
        expect(b.get(id)!.min.y, id).toBeGreaterThan(g - 0.7);
      }
    });

    it('keeps every part out of the ground, except the three that are dug in', () => {
      const buried: Record<string, string> = {
        'tank-shell': 'slab 0.14 m into the bench',
        'spring-box': 'box 0.45 m under the shelf',
        'gravel-filter': 'bed 0.5 m under the shelf',
      };
      for (const [id, box] of boxes()) {
        if (buried[id]) continue;
        // the lowest point of the box against the ground under its footprint (the ditch, the supports and the stone under the
        // pipe lie on it; a post may be pushed 3 cm into it)
        const g = Math.min(
          ...[box.min.x, box.max.x, (box.min.x + box.max.x) / 2].map((x) => groundY(x, (box.min.z + box.max.z) / 2)),
        );
        const gmax = Math.max(groundY(box.min.x, 0), groundY(box.max.x, 0));
        expect(box.min.y, id).toBeGreaterThanOrEqual(Math.min(g, gmax) - 0.06);
      }
    });

    it('explodes every part but the shell along sensible axes, and no two parts end up in each other', () => {
      const before = boxes();
      reg.setAllFactors(1);
      mod.scene.updateMatrixWorld(true);
      const after = boxes();
      const overlaps: string[] = [];
      // the shell is the body the others hang on: its box encloses the screen, the fittings and the foot of the overflow; the overflow's
      // box and the drain's cross in plan but the pipes are 0.8 m apart in height
      const allowed = new Set(['overflow-pipe|tank-drain']);
      for (const a of IDS) {
        for (const c of IDS) {
          if (a >= c || a === 'tank-shell' || c === 'tank-shell') continue;
          if (after.get(a)!.intersectsBox(after.get(c)!) && !allowed.has(`${a}|${c}`)) overlaps.push(`${a}|${c}`);
        }
      }
      reg.setAllFactors(0);
      mod.scene.updateMatrixWorld(true);
      expect(overlaps).toEqual([]);
      for (const id of IDS) {
        const e = reg.get(id)!.explode;
        if (id === 'tank-shell') continue;
        expect(e.length(), id).toBeGreaterThan(0);
        expect(e.z, `${id} goes straight up (the section plane stays valid)`).toBe(0);
        expect(before.get(id)!.containsBox(after.get(id)!), `${id} leaves its place`).toBe(false);
        expect(after.get(id)!.min.y, id).toBeGreaterThan(before.get(id)!.min.y + 0.4);
      }
      // the lid comes off first, the screen goes up inside the shell and stays inside its walls
      expect(EXPLODE['tank-lid'][1]).toBeGreaterThan(EXPLODE['intake-screen'][1]);
      const s = after.get('intake-screen')!;
      expect(Math.hypot(s.min.x, s.min.z)).toBeLessThan(R);
      expect(Math.hypot(s.max.x, s.max.z)).toBeLessThan(R);
    });
  });

  describe('the hydraulics of the drawing', () => {
    it('lets the water fall all the way from the spring box to the tank, and into the tank above the overflow level', () => {
      const path = model.paths.feed;
      for (let i = 1; i < path.length; i++) {
        expect(path[i].y, `feed pipe point ${i}`).toBeLessThanOrEqual(path[i - 1].y + 1e-9);
      }
      // the outlet of the box is the highest point, above the lid of the tank: the box never feels the tank
      expect(path[0].y).toBeLessThanOrEqual(feedY(FEED_X0) + 1e-9);
      expect(feedY(0.65)).toBeGreaterThan(H_LID);
      // the free end is over the overflow level: it never dips in the water and cannot siphon back
      const end = path[path.length - 1];
      expect(end.y).toBeGreaterThan(H_FULL);
      expect(end.y).toBeLessThan(H_SHELL);
      expect(Math.hypot(end.x + SPRING_X, end.z)).toBeLessThan(R); // x of the SPRING frame shifted to the tank frame
    });

    it('draws the spring through the gravel (fine stones at the rock, coarse next to the box) into the ports of the box', () => {
      expect(DIMS.CATCHMENT.grainFine).toBeLessThan(DIMS.CATCHMENT.grainMedium);
      expect(DIMS.CATCHMENT.grainMedium).toBeLessThan(DIMS.CATCHMENT.grainCoarse);
      const z = bedZones();
      expect(z).toHaveLength(3);
      expect(z[0][0]).toBeCloseTo(BED_X0, 9); // first zone against the rock
      expect(z[2][1]).toBeCloseTo(BED_X1, 9); // last zone against the box
      expect(DIMS.CATCHMENT.filterZones.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
      expect(BED_X1).toBeCloseTo(-BOX_OHL, 9);
      // the ports are under the working water level, the overflow stub of the box is above it and under the top of the gravel
      expect(DIMS.CATCHMENT.boxPortHeight).toBeLessThan(DIMS.CATCHMENT.boxWaterLevel);
      expect(DIMS.CATCHMENT.boxOverflowHeight - DIMS.CATCHMENT.boxOverflowDiameter / 2).toBeGreaterThanOrEqual(
        DIMS.CATCHMENT.boxWaterLevel,
      );
      expect(DIMS.CATCHMENT.boxOverflowHeight).toBeLessThan(SHELF_Y + DIMS.CATCHMENT.filterTop - BOX_FLOOR_Y);
      // the outlet of the box (at ground level) is the pipe's high point, above the working level
      expect(DIMS.CATCHMENT.boxOutletHeight).toBeCloseTo(DIMS.SPRING.basinDepth - DIMS.SPRING.boxRim, 9);
      expect(DIMS.CATCHMENT.boxWaterLevel).toBeGreaterThan(DIMS.CATCHMENT.boxOutletHeight);
    });

    it('takes the drive water low (0.18 m) behind a strainer, away from the silt, with a vortex plate above it', () => {
      const b = reg.bounds('intake-screen');
      expect(OUT_Y).toBe(DIMS.TANK.outletAboveFloor);
      expect(b.min.y).toBeGreaterThan(DIMS.CATCHMENT.sludgeDepth * 3); // basket bottom well above the silt
      expect(b.max.y).toBeGreaterThan(PLATE_Y);
      expect(PLATE_Y).toBeGreaterThan(OUT_Y + DIMS.CATCHMENT.screenDiameter / 2);
      // the basket is inside the tank, its stub reaches the wall, the gate valve is outside, then the drive pipe starts at x = OUT_X
      expect(b.max.x).toBeLessThanOrEqual(R + 0.01);
      const gate = reg.bounds('drive-gate-valve');
      expect(gate.min.x).toBeGreaterThan(R);
      expect(gate.max.x).toBeCloseTo(OUT_X, 6);
    });

    it('puts the overflow at the overflow level, the vent open on the lid and the drain at the lowest point', () => {
      const over = model.paths.overflow;
      expect(over[0].y - (DIMS.CATCHMENT.overflowDiameter - 0.006) / 2).toBeCloseTo(H_FULL, 9); // bottom of the opening = the overflow level
      expect(over[over.length - 1].y).toBeLessThan(over[0].y); // it goes down to the ditch
      expect(reg.bounds('tank-lid').max.y).toBeGreaterThan(H_LID + DIMS.CATCHMENT.ventRise);
      const drain = model.paths.drain;
      expect(drain[0].y - DIMS.CATCHMENT.drainDiameter / 2).toBeLessThan(0.01); // invert flush with the floor
      expect(Math.max(...drain.map((p) => p.y))).toBeLessThanOrEqual(drain[0].y + 1e-9);
      expect(drain[0].y).toBeLessThan(OUT_Y); // lower than the drive outlet
    });

    it('makes the tank the 5 700 L of the model: π·R²·height at the overflow level', () => {
      const litres = Math.PI * R * R * H_FULL * 1000;
      expect(Math.abs(litres - DIMS.TANK.volumeL) / DIMS.TANK.volumeL).toBeLessThan(0.01);
    });
  });

  describe('behaviour from the state', () => {
    it("draws the water at the level of the state, and the intake screen dry when the tank is empty (the video's story)", () => {
      const run = runningState();
      for (const level of [1, 0.5, 0.1]) {
        step({ ...run, tankLevel: level });
        expect(model.status.waterY).toBeCloseTo(level * H_FULL, 9);
      }
      step({ ...run, tankLevel: 0.5 });
      expect(model.status.screenDry).toBe(false);
      expect(model.status.plateDry).toBe(false);
      step({ ...run, tankLevel: 0.1 }); // 0.2 m: the basket (top at 0.25 m) is half out, the plate is dry
      expect(model.status.plateDry).toBe(true);
      const stalled = stalledState();
      step({ ...stalled, tankLevel: 0, tankLitres: 0 });
      expect(model.status.screenDry).toBe(true);
      expect(model.status.waterY).toBe(0);
      expect(stalled.status).toBe('stalled');
    });

    it('overflows only when the tank is full and the spring gives more than the ram and the drain take', () => {
      const run = runningState();
      step({ ...run, tankLevel: 0.99, sourceFlow: 7.5, driveFlow: 6.7 });
      expect(model.status.overflow).toBe(0);
      step({ ...run, tankLevel: 1, sourceFlow: 7.5, driveFlow: 6.7 });
      expect(model.status.overflow).toBeCloseTo(0.8, 9);
      step({ ...run, tankLevel: 1, sourceFlow: 7.5, driveFlow: 0 }); // ram stopped, tank full: the whole spring overflows
      expect(model.status.overflow).toBeCloseTo(7.5, 9);
      step({ ...run, tankLevel: 1, sourceFlow: 7.5, driveFlow: 17 }); // valve n°3: the tank never fills, no overflow
      expect(model.status.overflow).toBe(0);
      step({ ...run, tankLevel: 1, sourceFlow: 7.5, driveFlow: 6.7, tankDrainOpen: true, tankDrainFlow: 5 });
      expect(model.status.overflow).toBe(0);
      expect(model.status.drain).toBe(5);
    });

    it('follows the hand: the gate valve closes, the drain lever opens, with the state', () => {
      const run = runningState();
      step({ ...run, gateOpen: false, tankDrainOpen: true, tankDrainFlow: 10 }, {}, 120);
      expect(model.status.gateOpen).toBe(false);
      expect(model.status.drainOpen).toBe(true);
      const wheel = reg.get('drive-gate-valve')!.object;
      const stemClosed = new THREE.Box3().setFromObject(wheel).max.y;
      step({ ...run, gateOpen: true, tankDrainOpen: false }, {}, 240);
      const stemOpen = new THREE.Box3().setFromObject(wheel).max.y;
      expect(stemOpen).toBeGreaterThan(stemClosed + 0.03); // the rising stem and its wheel come up
      expect(model.status.gateOpen).toBe(true);
    });

    it('hides the water of an exploded or hidden container and every flow, and shows the rest', () => {
      const run = runningState();
      const water = (id: string) => model.tankFrame.getObjectByName(id) ?? model.springFrame.getObjectByName(id);
      step(run);
      expect(water('catchment-water-tank')!.visible).toBe(true);
      model.update(run, 1 / 60, view(), hold({ tank: true, flows: true }));
      expect(water('catchment-water-tank')!.visible).toBe(false);
      expect(water('catchment-water-spring')!.visible).toBe(true); // the box keeps its own
      expect(water('catchment-jets-tank')!.visible).toBe(false);
      model.update(run, 1 / 60, view(), hold());
      expect(water('catchment-water-tank')!.visible).toBe(true);
    });

    it('shows the flow dots only in schematic mode, never in the air of an exploded model', () => {
      const run = runningState();
      const dots = () =>
        [model.tankFrame, model.springFrame].flatMap((f) => f.children.filter((c) => (c as THREE.Points).isPoints));
      step(run, { schematic: false });
      expect(dots().every((d) => !d.visible)).toBe(true);
      step(run, { schematic: true });
      expect(dots().some((d) => d.visible)).toBe(true);
      reg.setAllFactors(1);
      step(run, { schematic: true });
      expect(dots().every((d) => !d.visible)).toBe(true);
      reg.setAllFactors(0);
    });

    it('animates without NaN for running, stalled, empty, full, flows, drain, gate and section states', () => {
      const run = runningState();
      const stalled = stalledState();
      const states: [string, RamState, Partial<ViewOpts>][] = [
        ['running', run, {}],
        ['stalled', stalled, {}],
        [
          'empty tank, ram stalled',
          { ...stalled, tankLevel: 0, tankLitres: 0, driveFlow: 0, driveVelocity: 0 },
          { schematic: true },
        ],
        ['full tank, overflow', { ...run, tankLevel: 1, driveFlow: 0 }, { schematic: true }],
        ['cutaway', run, { cutaway: true }],
        ['cutaway, empty', { ...run, tankLevel: 0 }, { cutaway: true, schematic: true }],
        ['flows', run, { schematic: true }],
        ['drain open', { ...run, tankDrainOpen: true, tankDrainFlow: 25, tankLevel: 0.4 }, { schematic: true }],
        ['gate closed', { ...run, gateOpen: false, driveFlow: 0, driveVelocity: 0 }, {}],
        ['plastic pipe', { ...run, waveSpeed: 350 }, {}],
        ['dry spring', { ...run, sourceFlow: 0 }, { schematic: true }],
        ['big spring', { ...run, sourceFlow: 40, tankLevel: 1, driveFlow: 6.7 }, { schematic: true }],
        [
          'missing fields',
          { ...run, tankLevel: NaN, sourceFlow: NaN, driveFlow: NaN, driveVelocity: NaN },
          { schematic: true },
        ],
      ];
      for (const [name, state, v] of states) {
        step(state, v, 20);
        let bad = 0;
        mod.scene.traverse((o) => {
          const p = o.position;
          if (![p.x, p.y, p.z, o.scale.x, o.scale.y, o.scale.z].every(Number.isFinite)) bad++;
        });
        expect(bad, name).toBe(0);
        for (const id of IDS) expect(finiteBox(reg.bounds(id)), `${name} ${id}`).toBe(true);
        for (const v of Object.values(model.status))
          if (typeof v === 'number') expect(Number.isFinite(v), `${name} status`).toBe(true);
      }
    });
  });

  describe('the hands of the visitor (states built with the simulation)', () => {
    /** A running n°1 ram, then `act` on the simulation, then a few real seconds. */
    const handled = (act: (sim: RamSim) => void, seconds = 4, timeScale = 1): RamState => {
      const sim = new RamSim();
      sim.applyPreset('valve-1');
      for (let i = 0; i < 120; i++) sim.step(1 / 60);
      act(sim);
      if (timeScale > 1) sim.set({ timeScale });
      for (let i = 0; i < seconds * 60; i++) sim.step(1 / 60);
      return { ...sim.state };
    };
    const named = (name: string) =>
      (model.tankFrame.getObjectByName(name) ?? model.springFrame.getObjectByName(name)) as THREE.Object3D;
    const dots = (name: string) =>
      Array.from(((named(name) as THREE.Points).geometry.attributes.position as THREE.BufferAttribute).array);
    const moved = (before: number[], after: number[]) => before.some((v, i) => Math.abs(v - after[i]) > 1e-6);

    it('draws the gate valve closed and the drive pipe at rest when the visitor closes it, the tank full and overflowing the whole spring', () => {
      const s = handled((sim) => sim.setDriveGate(false), 3);
      expect(s.gateOpen).toBe(false);
      expect(s.stallReason).toBe('gate');
      expect(s.driveFlow).toBe(0);
      step(s, { schematic: true }, 240);
      expect(model.status.gateOpen).toBe(false);
      expect(model.status.overflow).toBeCloseTo(s.sourceFlow, 6);
      const wheel = reg.get('drive-gate-valve')!.object;
      const closedTop = new THREE.Box3().setFromObject(wheel).max.y;
      const before = dots('flow-drive');
      step(s, { schematic: true }, 30);
      expect(moved(before, dots('flow-drive')), 'no dot moves in the drive pipe').toBe(false);
      // open again: the stem and wheel rise, the column runs
      const run = handled(() => {}, 6);
      step({ ...run, gateOpen: true }, { schematic: true }, 240);
      const openTop = new THREE.Box3().setFromObject(wheel).max.y;
      expect(openTop).toBeGreaterThan(closedTop + 0.03);
      const b2 = dots('flow-drive');
      step(run, { schematic: true }, 30);
      expect(moved(b2, dots('flow-drive')), 'the dots run in the drive pipe').toBe(true);
    });

    it('shows the drain valve open, a stream leaving it and the level falling when the visitor opens it', () => {
      const s0 = handled(() => {}, 1);
      const s = handled((sim) => sim.setTankDrain(true), 20, 60); // 20 simulated minutes: 150 L/min takes about 3 000 L
      expect(s.tankDrainOpen).toBe(true);
      expect(s.tankDrainFlow).toBeGreaterThan(100);
      expect(s.tankLevel).toBeLessThan(s0.tankLevel);
      step(s, { schematic: true }, 10);
      expect(model.status.drainOpen).toBe(true);
      expect(model.status.drain).toBe(s.tankDrainFlow);
      expect(model.status.waterY).toBeCloseTo(s.tankLevel * H_FULL, 9);
      expect(named('jet-drain').visible).toBe(true);
      expect(named('gutter-water').visible).toBe(true);
      expect(named('flow-drain').visible).toBe(true);
      // the tank empty: nothing runs out any more
      const empty = handled((sim) => sim.setTankDrain(true), 3, 3600);
      expect(empty.tankLevel).toBe(0);
      expect(empty.tankDrainFlow).toBe(0);
      step(empty, { schematic: true }, 10);
      expect(named('jet-drain').visible).toBe(false);
      expect(model.status.screenDry).toBe(true);
    });

    it('stops everything when the waste valve is held shut by hand: no drive flow, the whole spring overflows a full tank', () => {
      const s = handled((sim) => sim.holdValveShut(true), 3);
      expect(s.valveHeldShut).toBe(true);
      expect(s.stallReason).toBe('hand');
      step(s, { schematic: true }, 240);
      expect(model.status.overflow).toBeCloseTo(s.sourceFlow, 6);
      const before = dots('flow-drive');
      step(s, { schematic: true }, 30);
      expect(moved(before, dots('flow-drive'))).toBe(false);
    });
  });

  describe('section', () => {
    it('clips the ground, the box, the bed and the tank on z = 0 when the section is on, and shows the caps of the parts', () => {
      const run = runningState();
      const caps = () => {
        const out: THREE.Object3D[] = [];
        mod.scene.traverse((o) => {
          if (o.userData.cap) out.push(o);
        });
        return out;
      };
      expect(caps().length).toBeGreaterThanOrEqual(8);
      step(run, { cutaway: false });
      expect(caps().every((c) => !c.visible)).toBe(true);
      expect(mod.block.caps.every((c) => !c.visible)).toBe(true);
      step(run, { cutaway: true });
      expect(caps().every((c) => c.visible)).toBe(true);
      expect(mod.block.caps.every((c) => c.visible)).toBe(true);
      const clipped = (m: THREE.Mesh) => ((m.material as THREE.Material).clippingPlanes ?? []).length > 0;
      expect(clipped(mod.block.top)).toBe(true);
      expect(clipped(reg.get('tank-shell')!.meshes[2])).toBe(true);
      // x-ray (ghost) hides the cap of the part that is a ghost
      reg.setDisplay('tank-shell', 'ghost');
      step(run, { cutaway: true });
      const shellCaps = caps().filter((c) => c.userData.ownerPart === 'tank-shell');
      expect(shellCaps.length).toBeGreaterThan(0);
      expect(shellCaps.every((c) => !c.visible)).toBe(true);
      reg.setDisplay('tank-shell', 'solid');
      step(run, { cutaway: false });
    });
  });

  describe('budget', () => {
    it('stays comfortably lighter than the site (about 156 000 static triangles): under 40 000 for the whole world', () => {
      const n = triangles(mod.scene);
      expect(n).toBeLessThan(40 * THOUSAND);
      // the ground, the rocks and the vegetation are decoration, the nine parts are the rest
      let parts = 0;
      for (const id of IDS) parts += triangles(reg.get(id)!.object);
      expect(parts).toBeLessThan(25 * THOUSAND);
    });
  });
});
