import * as THREE from 'three';
import { clamp } from '@onigam/lab-kit/three';
import type { PartRegistry, ViewOpts } from '@onigam/lab-kit/three';
import type { RamState } from '../../sim/types';
import { CHAMBER } from '../dims';
import { CutKit } from '../cut';
import { DEG, smoothstep } from '../common';
import { buildBody } from './body';
import { buildChamber, buildCheckValve, SPRING_REST } from './chamber';
import type { RamCtx, Rig } from './ctx';
import { dialAngle } from './dial';
import { buildDrain, buildGauge, buildOutlet, buildSnifter } from './fittings';
import { buildInlet } from './inlet';
import { buildWaste } from './waste';
import { placeTail, travelOf } from './wastegeo';
import { buildFlows, buildWater, Spray, type RamFlows } from './water';

// The ram as one object, with its animation. Used twice: registered in the "ram" world, and unregistered (a second
// instance) in the pit of the site world.

/** Visual time constants of the waste valve, seconds: the real closing takes 18 ms and the opening 13 ms (one frame). */
const VALVE_CLOSE_TAU = 0.012;
const VALVE_OPEN_TAU = 0.03;
/** Check valve disc lift is drawn twice as large as the real lift. */
const DISC_VISUAL = 2;
/** Turn of the stem per stroke (fins), degrees, and the visual speed limit (no wagon-wheel effect). */
const SPIN_PER_STROKE = 14;
const SPIN_MAX_RATE = 160;
/** Parts whose hollow bodies hold the water. */
const CONTAINERS = ['ram', 'delivery-valve', 'air-chamber', 'base-plate', 'waste-valve'];

export interface RamModel {
  root: THREE.Group;
  rig: Rig;
  cut: CutKit;
  /** True while the model is exploded or incomplete: nothing moves, no water. */
  exploded(): boolean;
  update(state: RamState, dt: number, view: ViewOpts): void;
}

export function createRamModel(registry: PartRegistry | null): RamModel {
  const root = new THREE.Group();
  root.name = 'ram-model';
  const rig: Rig = { stemFrames: [], stackFrames: [], anchors: {} };
  const cut = new CutKit();
  const ctx: RamCtx = {
    root,
    reg: registry,
    cut,
    rig,
    add(id, obj, explode) {
      if (!obj.parent) root.add(obj);
      const e = explode instanceof THREE.Vector3 ? explode : new THREE.Vector3(...explode);
      registry?.add(id, obj, e);
      return obj;
    },
    anchor(id, parent, x, y, z) {
      const a = new THREE.Object3D();
      a.name = `anchor-${id}`;
      a.position.set(x, y, z);
      parent.add(a);
      rig.anchors[id] = a;
      return a;
    },
  };

  buildBody(ctx);
  buildInlet(ctx);
  buildWaste(ctx);
  const check = buildCheckValve(ctx);
  const chamber = buildChamber(ctx);
  buildGauge(ctx, chamber.yTop);
  buildSnifter(ctx);
  buildOutlet(ctx);
  buildDrain(ctx);
  const water = buildWater(ctx, chamber, check.waterProfile);
  root.add(water.group);
  const spray = new Spray(water.ports);
  root.add(spray.object);
  const flows: RamFlows = buildFlows();
  root.add(flows.water.object, flows.air.object);

  // ---- animation state
  let visW = 1;
  let visD = 0;
  let visP = 0;
  let spin = 0;
  let lastTravel = -1;
  const tmpV = new THREE.Vector3();

  const exploded = (): boolean => {
    if (!registry) return false;
    for (const p of registry.parts.values()) {
      if (p.factor > 0.001 || p.display === 'wire') return true;
    }
    for (const id of CONTAINERS) if (registry.get(id)?.display === 'hidden') return true;
    return false;
  };

  const area = (r: number) => Math.PI * r * r;
  const lpm = (q: number, a: number) => q / 60000 / a; // L/min through a section -> m/s

  function update(s: RamState, dt: number, view: ViewOpts): void {
    const frozen = exploded();
    const k = (tau: number) => 1 - Math.exp(-Math.max(dt, 0) / tau);

    // ---- waste valve: the state jumps in about a frame; a short smoothing keeps the slam and the reopening readable
    const targetW = frozen ? 1 : clamp(s.wasteValve, 0, 1);
    visW += (targetW - visW) * k(targetW < visW ? VALVE_CLOSE_TAU : VALVE_OPEN_TAU);
    const travel = travelOf(s.stroke);
    const lift = -visW * travel; // closed pose is the model's origin; open hangs `travel` lower
    // fins turn the stem a little at every stroke
    const spinTarget = frozen ? 0 : s.strokeCount * SPIN_PER_STROKE * DEG;
    const diff = spinTarget - spin;
    if (Math.abs(diff) > Math.PI * 2) spin = spinTarget;
    else {
      const step = SPIN_MAX_RATE * DEG * Math.max(dt, 0);
      spin += clamp(diff * k(0.07), -step, step);
    }
    for (const f of rig.stemFrames) {
      f.position.y = lift;
      f.rotation.y = spin;
    }
    if (travel !== lastTravel) {
      lastTravel = travel;
      for (const f of rig.stackFrames) f.position.y = travel;
    }
    if (rig.rodTail) placeTail(rig.rodTail, travel);

    // ---- delivery check valve
    visD += (clamp(frozen ? 0 : s.deliveryValve, 0, 1) - visD) * k(0.02);
    const lift2 = visD * 0.006 * DISC_VISUAL;
    if (rig.disc) rig.disc.position.y = 0.034 + lift2;
    if (rig.spring) {
      rig.spring.position.y = 0.034 + 0.004 + lift2;
      rig.spring.scale.y = (SPRING_REST - lift2) / SPRING_REST;
    }

    // ---- gauge: a real needle is damped, it shows the mean pressure with a slight flutter
    visP += ((frozen ? 0 : s.chamberPressure) - visP) * k(0.22);
    if (rig.needle) rig.needle.rotation.z = dialAngle(visP);
    if (rig.snifterPin) rig.snifterPin.position.y = 0.028 + 0.0022 * smoothstep(0.05, 3, frozen ? 0 : s.snifterFlow);

    // ---- air chamber: level of the water from the air share (the air sits on top)
    const ci = rig.chamberInner;
    if (ci && rig.surface && rig.levelPlane) {
      const yb = ci.yBottom;
      const yLocal = yb + (1 - clamp(s.airLevel, 0, 1)) * ci.height;
      rig.surface.position.y = CHAMBER.shellBottom + yLocal;
      const r = Math.max(0.001, ci.radiusAt(yLocal) - 0.0006);
      rig.surface.scale.set(r, r, 1);
      tmpV.set(0, CHAMBER.shellBottom + yLocal, 0).applyMatrix4(root.matrixWorld);
      rig.levelPlane.constant = tmpV.y;
    }
    if (rig.water) rig.water.visible = !frozen;

    // ---- stream through the open waste valve and the spray out of its ports
    const jet = frozen ? 0 : s.wasteJetFlow;
    if (rig.wasteStream && rig.wasteStreamMaterial) {
      rig.wasteStream.visible = jet > 0.3 && visW > 0.05;
      rig.wasteStreamMaterial.opacity = 0.2 + 0.5 * clamp(jet / 20, 0, 1);
    }
    spray.update(dt, jet, !frozen && visW > 0.1);

    // ---- "Flux": dots along the water paths, speeds from the flows of the state
    const show = view.schematic && !frozen;
    flows.water.object.visible = show;
    flows.air.object.visible = show;
    if (show) {
      flows.water.advance(flows.drive, s.driveVelocity, dt);
      flows.water.advance(flows.waste, lpm(s.wasteJetFlow, area(0.0098)), dt);
      flows.water.advance(flows.inflow, lpm(s.deliveredFlowNow, area(0.0095)), dt);
      flows.water.advance(flows.outflow, lpm(s.outletFlowNow, area(0.0081)), dt);
      flows.air.advance(flows.snifter, Math.min(1.5, s.snifterFlow * 0.1), dt);
      flows.water.place();
      flows.air.place();
    }

    // ---- section tool
    cut.update(root, view.cutaway, registry);
  }

  return { root, rig, cut, exploded, update };
}
