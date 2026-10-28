import * as THREE from 'three';
import { clamp } from '@onigam/lab-kit/three';
import type { RamState } from '../../sim/types';
import { DEG } from '../common';
import type { CutKit, Poly } from '../cut';
import { dynamic } from '../merge';
import * as G from './geo';
import {
  buildFins,
  buildGuide,
  buildHead,
  buildLockNut,
  buildNipple,
  buildPlate,
  buildReducer,
  buildSeat,
  buildSleeve,
  buildSocket,
  buildStem,
  buildStemSleeves,
  buildStrokeNut,
  buildWeight,
  type PartEnv,
  type ValveRig,
} from './parts';
import { Spray, buildValveWater, valveFloor } from './water';

// The waste valve of the video as ONE model, built once and used twice: in the `ram` world (its fourteen parts are one
// registered part, `waste-valve`) and in the `valve` world (registered part by part). Both worlds call the same builders and
// the same `update`, so they cannot disagree. Frame: origin at the centre of the top face of the base plate, Y up.

/** The fourteen part ids of the valve, in assembly order (src/part-ids.ts, research §11). */
export const VALVE_PART_IDS = [
  'base-plate',
  'valve-socket',
  'valve-reducer',
  'valve-nipple',
  'valve-sleeve',
  'valve-guide',
  'valve-seat',
  'valve-head',
  'valve-stem',
  'stem-sleeves',
  'valve-fins',
  'counterweight',
  'stroke-nut',
  'lock-nut',
] as const;
export type ValvePartId = (typeof VALVE_PART_IDS)[number];

/** Visual time constants of the waste valve, seconds: the real closing takes 18 ms and the opening 13 ms (one frame). */
export const VALVE_CLOSE_TAU = 0.012;
export const VALVE_OPEN_TAU = 0.03;
/** Turn of the stem per stroke (fins), degrees, and the visual speed limit (no wagon-wheel effect). */
const SPIN_PER_STROKE = 14;
const SPIN_MAX_RATE = 160;

export interface WasteValveOpts {
  /** Section tool of the host world (it calls `cut.update` itself). */
  cut: CutKit;
  /** `ram`: the plate carries the studs of the waste flange; `bench`: the plate alone. */
  hardware: 'ram' | 'bench';
  /** Id that owns the section caps of a part (default: the part itself). */
  capId?: (partId: string) => string;
  /** Height (valve frame) of whatever catches a drop falling at (x, z), besides the valve itself. */
  floorAt?: (x: number, z: number) => number;
}

export interface WasteValveModel {
  /** Wrapper placed by the host: the metal `assembly` and the unregistered water. */
  root: THREE.Group;
  /** The metal parts. Registered as one part in the `ram` world; its children are registered one by one in `valve`. */
  assembly: THREE.Group;
  /** The fourteen part groups, children of `assembly`. */
  parts: Record<ValvePartId, THREE.Group>;
  /** Hotspot anchors by part id (inside the part groups, so they follow the explode and the motion). */
  anchors: Record<string, THREE.Object3D>;
  rig: ValveRig;
  /** Water volumes, stream and spray (never registered). */
  water: THREE.Group;
  /** Path of the water through the open valve, valve frame. */
  path: THREE.Vector3[];
  /** Cross-sections of the parts in the open (assembled, weight on the guide) or the closed pose, valve frame (for tests). */
  sections(pose: 'open' | 'closed'): Record<string, Poly[]>;
  /** Smoothed openness the drawing follows, 0 closed .. 1 open (for tests). */
  openness(): number;
  /** Visual travel of the stem at the last update, metres. */
  travel(): number;
  /** `frozen`: the host is exploded or incomplete, so the valve is held open and the water is hidden. */
  update(s: RamState, dt: number, frozen: boolean): void;
}

export function createWasteValveModel(opts: WasteValveOpts): WasteValveModel {
  const rig: ValveRig = { liftFrames: [], spinFrames: [], stackFrames: [], anchors: {}, sections: {} };
  const env: PartEnv = { cut: opts.cut, capId: opts.capId ?? ((id) => id), hardware: opts.hardware, rig };

  const root = new THREE.Group();
  root.name = 'waste-valve-model';
  const assembly = new THREE.Group();
  assembly.name = 'waste-valve-assembly';
  root.add(assembly);

  const parts = {
    'base-plate': buildPlate(env),
    'valve-socket': buildSocket(env),
    'valve-reducer': buildReducer(env),
    'valve-nipple': buildNipple(env),
    'valve-sleeve': buildSleeve(env),
    'valve-guide': buildGuide(env),
    'valve-seat': buildSeat(env),
    'valve-head': buildHead(env),
    'valve-stem': buildStem(env),
    'stem-sleeves': buildStemSleeves(env),
    'valve-fins': buildFins(env),
    counterweight: buildWeight(env),
    'stroke-nut': buildStrokeNut(env),
    'lock-nut': buildLockNut(env),
  } satisfies Record<ValvePartId, THREE.Group>;
  for (const id of VALVE_PART_IDS) assembly.add(parts[id]);

  // what moves at run time is never merged (merge.ts)
  for (const f of [...rig.liftFrames, ...rig.spinFrames, ...rig.stackFrames]) dynamic(f);
  if (rig.rodTail) dynamic(rig.rodTail);

  // assembled pose: the valve hangs open on its weight
  for (const f of rig.liftFrames) f.position.y = -G.DEFAULT_TRAVEL;
  if (rig.rodTail) G.placeTail(rig.rodTail, G.DEFAULT_TRAVEL);

  // water: the column, the stream through the open valve, the spray out of the ports
  const water = buildValveWater(opts.cut);
  const waterRoot = new THREE.Group();
  waterRoot.name = 'valve-water-root';
  waterRoot.add(water.group);
  const floorAt = (x: number, z: number): number => Math.max(valveFloor(x, z), opts.floorAt?.(x, z) ?? -Infinity);
  const spray = new Spray(water.ports, floorAt, opts.hardware === 'ram' ? 0.008 : 0.0035);
  opts.cut.clip(spray.object);
  waterRoot.add(spray.object);
  root.add(waterRoot);

  let visW = 1;
  let spin = 0;
  let lastTravel = -1;
  let travel = G.DEFAULT_TRAVEL;

  function update(s: RamState, dt: number, frozen: boolean): void {
    const k = (tau: number) => 1 - Math.exp(-Math.max(dt, 0) / tau);
    // the state jumps in about a frame: a short smoothing keeps the slam and the reopening readable
    const targetW = frozen ? 1 : clamp(s.wasteValve, 0, 1);
    visW += (targetW - visW) * k(targetW < visW ? VALVE_CLOSE_TAU : VALVE_OPEN_TAU);
    travel = G.travelOf(s.stroke);
    const lift = -visW * travel; // the closed pose is the model's origin; open hangs `travel` lower
    // the fins turn the stem a little at every stroke
    const spinTarget = frozen ? 0 : s.strokeCount * SPIN_PER_STROKE * DEG;
    const diff = spinTarget - spin;
    if (Math.abs(diff) > Math.PI * 2) spin = spinTarget;
    else {
      const step = SPIN_MAX_RATE * DEG * Math.max(dt, 0);
      spin += clamp(diff * k(0.07), -step, step);
    }
    for (const f of rig.liftFrames) f.position.y = lift;
    for (const f of rig.spinFrames) f.rotation.y = spin;
    if (travel !== lastTravel) {
      lastTravel = travel;
      for (const f of rig.stackFrames) f.position.y = travel;
    }
    if (rig.rodTail) G.placeTail(rig.rodTail, travel);

    // stream through the open valve and the spray out of its ports
    const jet = frozen ? 0 : s.wasteJetFlow;
    water.group.visible = !frozen;
    water.stream.visible = jet > 0.3 && visW > 0.05;
    water.streamMaterial.opacity = 0.2 + 0.5 * clamp(jet / 20, 0, 1);
    spray.update(dt, jet, !frozen && visW > 0.1);
  }

  return {
    root,
    assembly,
    parts,
    anchors: rig.anchors,
    rig,
    water: waterRoot,
    path: water.path,
    sections(pose) {
      const dt = G.DEFAULT_TRAVEL;
      const out: Record<string, Poly[]> = {};
      for (const [id, sec] of Object.entries(rig.sections)) {
        // built in the closed pose with the stack `dt` above the guide; open: the stem is `dt` lower, the stack lands
        const shift = pose === 'closed' ? (sec.kind === 'stack' ? dt : 0) : sec.kind === 'stem' ? -dt : 0;
        out[id] = sec.polys.map((p) => p.map(([x, y]) => [x, y + shift] as [number, number]));
      }
      return out;
    },
    openness: () => visW,
    travel: () => travel,
    update,
  };
}
