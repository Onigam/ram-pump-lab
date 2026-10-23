import * as THREE from 'three';
import { MAT, group, mesh, pmma } from '@onigam/lab-kit/three';
import { SPRING, TANK } from '../dims';
import { noShadow, waterMaterial } from '../common';

// The buffer tank (translucent, so that its level can be seen) and the spring catchment on its rock outcrop.

// ------------------------------------------------------------------------------------------------ buffer tank and spring

export interface TankGroup {
  group: THREE.Group;
  water: THREE.Mesh;
  /** Where the drive pipe leaves, in the tank frame (origin at the floor centre). */
  outlet: THREE.Vector3;
  overflow: THREE.Vector3;
  /** Feed inlet on the lid. */
  inlet: THREE.Vector3;
}

export function buildTank(): TankGroup {
  const g = group('buffer-tank');
  const R = TANK.diameter / 2;
  const H = TANK.height;
  const zinc = MAT.zinc();
  // slab
  g.add(mesh(new THREE.CylinderGeometry(R + 0.25, R + 0.3, 0.18, 40), MAT.concrete(), [0, -0.09 + 0.02, 0]));
  // translucent polyethylene shell, steel hoops and a dark lid
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(R + TANK.wall, R + TANK.wall, H, 48, 1, true), pmma(0.16));
  shell.position.y = H / 2;
  shell.castShadow = false;
  shell.renderOrder = 2;
  g.add(shell);
  for (const y of [0.35, 0.95, 1.55]) {
    g.add(
      mesh(new THREE.CylinderGeometry(R + TANK.wall + 0.012, R + TANK.wall + 0.012, 0.05, 48, 1, true), zinc, [
        0,
        y,
        0,
      ]),
    );
  }
  g.add(mesh(new THREE.CylinderGeometry(R + 0.03, R + 0.03, 0.06, 48), MAT.pe(), [0, H + 0.03, 0]));
  g.add(mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.07, 24), MAT.printGrey(), [0.45, H + 0.09, 0.2]));
  // the water: a cylinder scaled in Y by the level
  const water = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.01, R - 0.01, H, 48), waterMaterial(0.9, 0x3b8ccb));
  water.position.y = H / 2;
  water.renderOrder = 1;
  noShadow(water);
  g.add(water);
  // outlet: wall socket, ball valve, union towards the drive pipe (+X)
  const oy = TANK.outletAboveFloor;
  const sock = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 16), MAT.brass(), [R + 0.02, oy, 0]);
  sock.rotation.z = Math.PI / 2;
  g.add(sock);
  const valve = new THREE.Group();
  valve.position.set(R + 0.1, oy, 0);
  const body = mesh(new THREE.SphereGeometry(0.052, 20, 14), MAT.brass());
  valve.add(body);
  const stem = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 10), MAT.steel(), [0, 0.07, 0]);
  valve.add(stem);
  const lever = mesh(new THREE.BoxGeometry(0.22, 0.012, 0.03), MAT.pvcRed(), [0.07, 0.12, 0]);
  valve.add(lever);
  g.add(valve);
  const out = new THREE.Mesh(new THREE.CylinderGeometry(0.0169, 0.0169, 0.22, 14), MAT.zinc());
  out.rotation.z = Math.PI / 2;
  out.position.set(R + 0.28, oy, 0);
  out.castShadow = true;
  g.add(out);
  // overflow pipe on the south side near the top, pointing down
  const ovPipe = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 12), MAT.pvcGrey(), [0, H - 0.2 - 0.25, R + 0.2]);
  g.add(ovPipe);
  const ovElbow = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.24, 12), MAT.pvcGrey(), [0, H - 0.2, R + 0.09]);
  ovElbow.rotation.x = Math.PI / 2;
  g.add(ovElbow);
  return {
    group: g,
    water,
    outlet: new THREE.Vector3(R + 0.38, oy, 0),
    overflow: new THREE.Vector3(0, H - 0.65, R + 0.2).setY(0.25),
    inlet: new THREE.Vector3(0.45, H + 0.1, 0.2),
  };
}

export interface SpringGroup {
  group: THREE.Group;
  /** Surface of the water in the basin and the trickle falling into it. */
  basinWater: THREE.Mesh;
  trickle: THREE.Mesh;
  trickleMaterial: THREE.MeshStandardMaterial;
  /** Outlet at the bottom of the basin, and where the trickle starts, in the group frame. */
  basinOutlet: THREE.Vector3;
  /** Height of the water surface of the basin above the group origin. */
  basinTop: number;
}

/** Rock with a rough, flat-shaded outline (deterministic from `seed`). */
function roughRock(seed: number, material: THREE.Material): THREE.Mesh {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const pa = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pa.count; i++) {
    const x = pa.getX(i);
    const y = pa.getY(i);
    const z = pa.getZ(i);
    const k =
      1 + 0.3 * Math.sin(x * 4.1 + seed * 1.7) * Math.cos(z * 3.7 - seed) + 0.15 * Math.sin(y * 6.3 + seed * 3.1);
    pa.setXYZ(i, x * k, y * k * 0.8, z * k);
  }
  geo.computeVertexNormals();
  return mesh(geo.toNonIndexed(), material);
}

/**
 * Spring catchment: a rock outcrop with a small stone hut over the seep, a spout and a stone trough, from which a pipe
 * goes to the tank; `moundHeight` is the height of the outcrop above the tank plateau (the trough must be higher than the
 * lid of the tank for the water to flow in).
 */
export function buildSpring(moundHeight: number): SpringGroup {
  const g = group('spring');
  const rockMat = MAT.stone();
  rockMat.flatShading = true;
  const rockDark = MAT.slate();
  rockDark.flatShading = true;
  const top = moundHeight;
  const rocks: [number, number, number, number, number, number][] = [
    [-0.4, 0.4, 0.2, 2.6, 1.4, 0],
    [-2.0, 0.5, 0.8, 1.7, 1.2, 1],
    [1.6, 0.5, -0.6, 1.9, 1.3, 2],
    [0.2, 1.1, -1.4, 2.1, 1.1, 3],
    [-1.2, 0.8, -1.6, 1.6, 1.0, 4],
    [1.2, 0.4, 1.6, 1.6, 0.9, 5],
    [-0.6, top * 0.55, -0.2, 2.4, 1.1, 6],
    [0.9, top * 0.5, 0.3, 1.5, 0.9, 7],
  ];
  for (const [x, y, z, s, h, seed] of rocks) {
    const r = roughRock(seed, seed % 2 ? rockMat : rockDark);
    r.position.set(x, y * (top / 2.4) * 0.8, z);
    r.scale.set(s * 0.6, h * (top / 2.4), s * 0.6);
    r.rotation.y = seed * 1.3;
    g.add(r);
  }
  // hut over the seep, on the top of the outcrop
  const hx = -0.55;
  const hz = -0.7;
  g.add(mesh(new THREE.BoxGeometry(1.5, 1.15, 1.3), MAT.stone(), [hx, top + 0.45, hz]));
  const slab = mesh(new THREE.BoxGeometry(1.85, 0.12, 1.6), MAT.slate(), [hx, top + 1.08, hz]);
  slab.rotation.x = 0.12;
  g.add(slab);
  g.add(mesh(new THREE.BoxGeometry(0.55, 0.85, 0.06), MAT.woodDark(), [hx + 0.2, top + 0.28, hz + 0.67]));
  // spout out of the wall, trough in front of it
  const spout = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.35, 10), MAT.brass(), [
    hx - 0.35,
    top + 0.72,
    hz + 0.82,
  ]);
  spout.rotation.x = Math.PI / 2;
  g.add(spout);
  const bl = SPRING.basinLength;
  const bw = SPRING.basinWidth;
  const bd = SPRING.basinDepth;
  const t = SPRING.basinWall;
  const tz = hz + 1.55;
  const tx = hx;
  const wallMat = MAT.stone();
  for (const [x, z, w, d] of [
    [0, bw / 2 + t / 2, bl + 2 * t, t],
    [0, -bw / 2 - t / 2, bl + 2 * t, t],
    [bl / 2 + t / 2, 0, t, bw],
    [-bl / 2 - t / 2, 0, t, bw],
  ]) {
    g.add(mesh(new THREE.BoxGeometry(w, bd, d), wallMat, [tx + x, top + bd / 2 - 0.1, tz + z]));
  }
  g.add(mesh(new THREE.BoxGeometry(bl, 0.12, bw), MAT.concrete(), [tx, top - 0.14, tz]));
  const wy = top + bd - 0.2;
  const basinWater = new THREE.Mesh(new THREE.PlaneGeometry(bl - 0.04, bw - 0.04), waterMaterial(0.8, 0x6bb0d8));
  basinWater.rotation.x = -Math.PI / 2;
  basinWater.position.set(tx, wy, tz);
  noShadow(basinWater);
  g.add(basinWater);
  const fall = top + 0.72 - 0.018 - wy;
  const trickleMat = waterMaterial(0.8, 0x8cc6ea);
  const trickle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, fall, 8, 1, true), trickleMat);
  trickle.position.set(hx - 0.35, wy + fall / 2, hz + 0.99);
  noShadow(trickle);
  g.add(trickle);
  return {
    group: g,
    basinWater,
    trickle,
    trickleMaterial: trickleMat,
    basinOutlet: new THREE.Vector3(tx + bl / 2 + t, wy - 0.12, tz),
    basinTop: wy,
  };
}
