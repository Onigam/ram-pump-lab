import * as THREE from 'three';
import { MAT, group, mesh } from '@onigam/lab-kit/three';
import { PIT, RAM, SITE } from '../dims';
import { noShadow, waterMaterial } from '../common';
import { PIT_X } from './layout';

// ------------------------------------------------------------------------------------------------ ram pit

export interface Pit {
  group: THREE.Group;
  lid: THREE.Group;
  /** Wet floor of the pit (opacity follows the waste water) and its material, animated directly. */
  puddle: THREE.Mesh;
  puddleMaterial: THREE.MeshStandardMaterial;
  /** Where the drain pipe goes through the south wall, in the pit frame. */
  drainStart: THREE.Vector3;
}

/** Concrete pit around the ram; frame = the ram's frame (the datum is y = 0, ground at SITE.groundAtRam). */
export function buildPit(): Pit {
  const g = group('ram-pit');
  const concrete = MAT.concrete();
  const L = PIT.innerLength;
  const W = PIT.innerWidth;
  const t = PIT.wall;
  const floor = PIT.floorY;
  const top = SITE.groundAtRam + PIT.curb;
  const h = top - floor;
  const cx = PIT_X;
  g.add(mesh(new THREE.BoxGeometry(L + 2 * t, 0.2, W + 2 * t), concrete, [cx, floor - 0.1, 0]));
  // plinth under the feet of the ram (its feet are RAM.floorY, the pit floor is lower)
  g.add(
    mesh(new THREE.BoxGeometry(1.3, RAM.floorY - floor, 0.6), concrete, [0.3, floor + (RAM.floorY - floor) / 2, 0]),
  );
  g.add(mesh(new THREE.BoxGeometry(L + 2 * t, h, t), concrete, [cx, floor + h / 2, -(W + t) / 2]));
  g.add(mesh(new THREE.BoxGeometry(L + 2 * t, h, t), concrete, [cx, floor + h / 2, (W + t) / 2]));
  for (const sx of [-1, 1])
    g.add(mesh(new THREE.BoxGeometry(t, h, W), concrete, [cx + (sx * (L + t)) / 2, floor + h / 2, 0]));
  // wet floor
  const puddleMat = waterMaterial(0.0, 0x5aa6d6);
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.42, 28), puddleMat);
  puddle.rotation.x = -Math.PI / 2;
  puddle.position.set(cx + 0.9, floor + 0.012, W / 2 - 0.3);
  noShadow(puddle);
  g.add(puddle);
  // drain: grating and a pipe through the south wall
  g.add(mesh(new THREE.BoxGeometry(0.25, 0.015, 0.25), MAT.steelBlack(), [cx + 0.9, floor + 0.0075, W / 2 - 0.3]));
  const drain = new THREE.Mesh(
    new THREE.CylinderGeometry(PIT.drainDiameter / 2, PIT.drainDiameter / 2, t + 0.5, 20),
    MAT.pvcGrey(),
  );
  drain.rotation.x = Math.PI / 2;
  drain.position.set(cx + 0.9, floor + 0.07, W / 2 + t / 2 + 0.1);
  g.add(drain);
  // lid: a concrete slab in a steel frame hinged on the north wall, propped open
  const hinge = new THREE.Group();
  hinge.position.set(cx, top + PIT.lidThickness / 2, -(W / 2 + t) + 0.05);
  const lid = new THREE.Group();
  lid.add(mesh(new THREE.BoxGeometry(L + 0.2, PIT.lidThickness, W + 0.3), concrete, [0, 0, (W + 0.3) / 2]));
  const steel = MAT.steelBlack();
  lid.add(mesh(new THREE.BoxGeometry(L + 0.24, 0.05, 0.06), steel, [0, 0.03, 0.03]));
  lid.add(mesh(new THREE.BoxGeometry(L + 0.24, 0.05, 0.06), steel, [0, 0.03, W + 0.27]));
  for (const sx of [-1, 1])
    lid.add(mesh(new THREE.BoxGeometry(0.06, 0.05, W + 0.3), steel, [(sx * (L + 0.2)) / 2, 0.03, (W + 0.3) / 2]));
  lid.add(mesh(new THREE.BoxGeometry(0.4, 0.04, 0.04), steel, [0, 0.07, W * 0.7]));
  hinge.add(lid);
  hinge.rotation.x = -105 * (Math.PI / 180);
  g.add(hinge);
  // hinges
  for (const sx of [-0.7, 0.7])
    g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 12), steel, [cx + sx, top + 0.03, -(W / 2 + t) + 0.05]));
  g.children[g.children.length - 1].rotation.z = Math.PI / 2;
  return {
    group: g,
    lid: hinge,
    puddle,
    puddleMaterial: puddleMat,
    drainStart: new THREE.Vector3(cx + 0.9, floor + 0.07, W / 2 + t + 0.35),
  };
}
