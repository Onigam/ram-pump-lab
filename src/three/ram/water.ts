import * as THREE from 'three';
import { CHAMBER, FITTINGS, FOUNDATION, RAM } from '../dims';
import { FlowDots, lathe, noShadow, waterMaterial, type Profile } from '../common';
import { PLATE_TOP_Y } from './body';
import { CHECK_BASE_Y, CH, type ChamberGeometry } from './chamber';
import { S_X0, STUB_X0 } from './inlet';
import type { RamCtx } from './ctx';

// Water in the ram: the volumes that fill the body, the check valve and the chamber (seen through the section or the
// x-ray), and the "Flux" dots. The stream and the spray of the waste valve belong to the valve model (valve/water.ts), which
// is shared with the `valve` world. Sizes of the motion come from RamState only.

const BORE_WATER = RAM.bodyInnerRadius - 0.0004;

export interface RamWater {
  group: THREE.Group;
}

export function buildWater(ctx: RamCtx, chamber: ChamberGeometry, checkWater: Profile): RamWater {
  const group = new THREE.Group();
  group.name = 'water';
  const mat = waterMaterial(0.5);
  const chamberMat = waterMaterial(0.5);
  const surfaceMat = waterMaterial(0.7, 0x7fc0e8);

  // main bore
  const bore = new THREE.Mesh(new THREE.CylinderGeometry(BORE_WATER, BORE_WATER, RAM.bodyLength, 40, 1, false), mat);
  bore.rotation.z = Math.PI / 2;
  bore.position.x = RAM.bodyLength / 2;
  group.add(bore);

  // column of the waste branch, up to the base plate of the valve (the valve model carries on from there)
  const column: Profile = [
    [0, 0.02],
    [0.0126, 0.02],
    [0.0126, PLATE_TOP_Y - 0.008],
    [0, PLATE_TOP_Y - 0.008],
  ];
  const col = new THREE.Mesh(lathe([column], 36), mat);
  col.position.x = RAM.xWaste;
  group.add(col);

  // delivery valve cavity and neck
  const check = new THREE.Mesh(lathe([checkWater], 36), mat);
  check.position.set(RAM.xDelivery, CHECK_BASE_Y, 0);
  group.add(check);

  // air chamber: interior cut by a horizontal level plane
  const level = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1);
  ctx.rig.levelPlane = level;
  const inner = new THREE.Mesh(chamber.interior, chamberMat);
  inner.position.set(RAM.xDelivery, CHAMBER.shellBottom, 0);
  group.add(inner);
  const surface = new THREE.Mesh(new THREE.CircleGeometry(1, 48), surfaceMat);
  surface.rotation.x = -Math.PI / 2;
  surface.position.set(RAM.xDelivery, CHAMBER.shellBottom, 0);
  group.add(surface);
  ctx.rig.surface = surface;
  ctx.rig.chamberInner = {
    yBottom: chamber.innerUp[1][1],
    height: chamber.yTop - chamber.innerUp[1][1],
    radiusAt: (y: number) => {
      const pts = chamber.innerUp;
      for (let i = 1; i < pts.length; i++) {
        const [r0, y0] = pts[i - 1];
        const [r1, y1] = pts[i];
        if (y >= y0 && y <= y1 && y1 > y0) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
      }
      return pts[pts.length - 1][0];
    },
  };

  noShadow(group);
  group.renderOrder = 3;
  ctx.cut.clip(bore);
  ctx.cut.clip(surface);
  ctx.cut.clip(inner, [level]);
  ctx.rig.water = group;
  return { group };
}

/**
 * Height (frame of the ram root) of whatever catches a drop falling at (x, z) besides the waste valve: the body, the pad of the
 * foundation, or the floor of the world.
 */
export function dropFloor(x: number, z: number): number {
  if (x > 0 && x < RAM.bodyLength && Math.abs(z) < RAM.bodyOuterRadius) {
    return Math.sqrt(RAM.bodyOuterRadius ** 2 - z * z);
  }
  const L = FOUNDATION.length;
  if (Math.abs(x - RAM.bodyLength / 2) < L / 2 && Math.abs(z) < FOUNDATION.width / 2) return RAM.floorY;
  return RAM.floorY - FOUNDATION.thickness;
}

// ------------------------------------------------------------------------------------------------ "Flux" dots

export interface RamFlows {
  water: FlowDots;
  air: FlowDots;
  drive: number;
  waste: number;
  inflow: number;
  outflow: number;
  snifter: number;
}

/**
 * Paths of the water and of the snifter air through the ram, in the frame of the root. Speeds come from the state.
 * `wastePath` is the path of the water through the waste valve, already in the frame of the root.
 */
export function buildFlows(wastePath: THREE.Vector3[]): RamFlows {
  const water = new FlowDots(420, { color: 0x1c7fe0, size: 0.012, throughWalls: true, opacity: 0.95 });
  const air = new FlowDots(30, { color: 0xffffff, size: 0.01, throughWalls: true, opacity: 0.95 });
  const v = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);
  const drive = water.addPath([v(STUB_X0 + 0.03, 0), v(S_X0 + 0.1, 0), v(0, 0), v(RAM.xWaste, 0)], 40);
  const waste = water.addPath([v(RAM.xWaste, 0), ...wastePath.slice(1)], 22);
  const inflow = water.addPath(
    [v(RAM.xDelivery, 0), v(RAM.xDelivery, CHECK_BASE_Y + 0.05), v(RAM.xDelivery, CHAMBER.shellBottom + 0.05)],
    18,
  );
  const xOutEnd = RAM.xDelivery + CH.R + 0.009 + 0.04 + FITTINGS.smallBallValveLength + FITTINGS.outletStubLength;
  const outflow = water.addPath([v(RAM.xDelivery, CHAMBER.outletHeight), v(xOutEnd, CHAMBER.outletHeight)], 26);
  const snifter = air.addPath([v(RAM.xSnifter, 0.115), v(RAM.xSnifter, 0), v(RAM.xSnifter + 0.03, -0.01)], 8);
  return { water, air, drive, waste, inflow, outflow, snifter };
}
