import * as THREE from 'three';
import { clamp } from '@onigam/lab-kit/three';
import type { PartRegistry, ViewOpts } from '@onigam/lab-kit/three';
import type { RamState } from '../../sim/types';
import { CHAMBER, RAM } from '../dims';
import { CutKit } from '../cut';
import { mergeStatic } from '../merge';
import { smoothstep } from '../common';
import { createWasteValveModel, type WasteValveModel } from '../valve/model';
import { PLATE_TOP_Y, buildBody } from './body';
import { buildChamber, buildCheckValve, SPRING_REST } from './chamber';
import type { RamCtx, Rig } from './ctx';
import { dialAngle } from './dial';
import { EXPLODE } from './explode';
import { buildDrain, buildGauge, buildOutlet, buildSnifter, buildUnion } from './fittings';
import { buildFoundation } from './foundation';
import { buildInlet } from './inlet';
import { buildFlows, buildWater, dropFloor, type RamFlows } from './water';

// The ram as one object, with its animation. Used twice: registered in the "ram" world, and unregistered (a second
// instance) in the pit of the site world. The waste valve is a model of its own, shared with the "valve" world: here its
// fourteen parts are ONE registered part, `waste-valve`.

/** Check valve disc lift is drawn twice as large as the real lift. */
const DISC_VISUAL = 2;
/** Parts whose hollow bodies hold the water. */
const CONTAINERS = ['ram', 'delivery-valve', 'air-chamber', 'waste-valve'];

export interface RamModel {
  root: THREE.Group;
  rig: Rig;
  cut: CutKit;
  /** The waste valve (the very model of the `valve` world), standing on the body's waste flange. */
  valve: WasteValveModel;
  /** True while the model is exploded or incomplete: nothing moves, no water. */
  exploded(): boolean;
  update(state: RamState, dt: number, view: ViewOpts): void;
}

export function createRamModel(registry: PartRegistry | null): RamModel {
  const root = new THREE.Group();
  root.name = 'ram-model';
  const rig: Rig = { anchors: {} };
  const cut = new CutKit();
  const ctx: RamCtx = {
    root,
    reg: registry,
    cut,
    rig,
    add(id, obj, explode) {
      if (!obj.parent) root.add(obj);
      // the waste valve keeps its fourteen sub-parts (the `valve` world and its tests compare them one by one)
      if (id !== 'waste-valve') mergeStatic(obj, { isClipped: (m) => cut.clips(m), name: id });
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

  buildFoundation(ctx);
  buildBody(ctx);
  buildInlet(ctx);
  // the waste valve: its model stands on the waste flange; the metal is one part, the water and spray are not parts
  const origin = new THREE.Vector3(RAM.xWaste, PLATE_TOP_Y, 0);
  const valve = createWasteValveModel({
    cut,
    hardware: 'ram',
    capId: () => 'waste-valve',
    floorAt: (x, z) => dropFloor(x + origin.x, z + origin.z) - origin.y,
  });
  valve.root.position.copy(origin);
  root.add(valve.root);
  // high on the stack (the weight): its label then stands clear of the inlet valve's, on every size of the view
  ctx.anchor('waste-valve', valve.assembly, 0, 0.17, 0.0115);
  ctx.add('waste-valve', valve.assembly, EXPLODE['waste-valve']);
  const check = buildCheckValve(ctx);
  const chamber = buildChamber(ctx);
  buildGauge(ctx, chamber.yTop);
  buildSnifter(ctx);
  buildOutlet(ctx);
  buildUnion(ctx);
  buildDrain(ctx);
  const water = buildWater(ctx, chamber, check.waterProfile);
  root.add(water.group);
  const flows: RamFlows = buildFlows(valve.path.map((p) => p.clone().add(origin)));
  root.add(flows.water.object, flows.air.object);
  cut.clip(flows.water.object);
  cut.clip(flows.air.object);

  // ---- animation state
  let visD = 0;
  let visP = 0;
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

    // ---- waste valve (the shared model): stem, fins, weight and nuts, stream and spray
    valve.update(s, dt, frozen);

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

    // ---- "Flux": dots along the water paths, speeds from the flows of the state
    const show = view.schematic && !frozen;
    flows.water.object.visible = show;
    flows.air.object.visible = show;
    if (show) {
      flows.water.advance(flows.drive, s.driveVelocity, dt);
      flows.water.advance(flows.waste, lpm(s.wasteJetFlow, area(0.0075)), dt);
      flows.water.advance(flows.inflow, lpm(s.deliveredFlowNow, area(0.0095)), dt);
      flows.water.advance(flows.outflow, lpm(s.outletFlowNow, area(0.0081)), dt);
      flows.air.advance(flows.snifter, Math.min(1.5, s.snifterFlow * 0.1), dt);
      flows.water.place();
      flows.air.place();
    }

    // ---- section tool
    cut.update(root, view.cutaway, registry);
  }

  return { root, rig, cut, valve, exploded, update };
}
