import * as THREE from 'three';
import { MAT, group, mesh } from '@onigam/lab-kit/three';
import { TAU, hexRing, lathe, type Profile } from '../common';

// Small fittings shared by several parts: bolts and flanged / threaded ball valves. Axis of a bolt is Y.

/** Hex bolt: head from y = 0 to headT, shank from 0 down to -length. */
export function boltY(r: number, length: number, headAF: number, headT: number, material: THREE.Material): THREE.Group {
  const g = group('bolt');
  g.add(mesh(hexRing(headAF, headT, 0), material));
  g.add(mesh(new THREE.CylinderGeometry(r, r, length, 12), material, [0, -length / 2, 0]));
  return g;
}

/** Bolts on a bolt circle around the X axis, heads towards -X (the shank enters the flange at +X). */
export function flangeBolts(
  x: number,
  circleR: number,
  count: number,
  r: number,
  length: number,
  headAF: number,
  headT: number,
  material: THREE.Material,
  firstAngle = Math.PI / 4,
): THREE.Group {
  const g = group('bolts');
  for (let i = 0; i < count; i++) {
    const a = firstAngle + (i * TAU) / count;
    const b = boltY(r, length, headAF, headT, material);
    // local -Y (the shank) -> +X, so the head sits on the low-x side of the face at x
    b.rotation.z = Math.PI / 2;
    b.position.set(x, circleR * Math.cos(a), circleR * Math.sin(a));
    g.add(b);
  }
  return g;
}

/** A flange disc (axis X) from x0 to x0 + t. */
export function flangeX(x0: number, t: number, outerR: number, innerR: number, material: THREE.Material) {
  const m = mesh(
    lathe(
      [
        [
          [innerR, 0],
          [outerR, 0],
        ],
        [
          [outerR, 0],
          [outerR, t],
        ],
        [
          [outerR, t],
          [innerR, t],
        ],
        [
          [innerR, t],
          [innerR, 0],
        ],
      ],
      48,
    ),
    material,
  );
  m.rotation.z = -Math.PI / 2;
  m.position.x = x0;
  return m;
}

export interface BallValveOpts {
  length: number;
  endR: number;
  bulgeR: number;
  bulgeLen: number;
  /** Radius of the flanges at both ends (0 = threaded ends). */
  flangeR?: number;
  flangeT?: number;
  /** 0 = lever along the pipe (open), 90 = across (closed), degrees about Y. */
  leverAngle?: number;
  body: THREE.Material;
  steel: THREE.Material;
  grip: THREE.Material;
}

/** Ball valve along +X from x = 0 to `length`, axis on y = 0, lever on top. */
export function ballValve(o: BallValveOpts): THREE.Group {
  const g = group('ball-valve');
  const L = o.length;
  const ft = o.flangeT ?? 0;
  const mid = L / 2;
  const half = o.bulgeLen / 2;
  const prof: Profile[] = [
    [
      [o.endR * 0.8, 0],
      [o.endR, 0],
    ],
    [
      [o.endR, 0],
      [o.endR, ft || L * 0.12],
      [o.endR + (o.bulgeR - o.endR) * 0.5, mid - half],
      [o.bulgeR, mid - half * 0.5],
      [o.bulgeR, mid + half * 0.5],
      [o.endR + (o.bulgeR - o.endR) * 0.5, mid + half],
      [o.endR, L - (ft || L * 0.12)],
      [o.endR, L],
    ],
    [
      [o.endR, L],
      [o.endR * 0.8, L],
    ],
    [
      [o.endR * 0.8, L],
      [o.endR * 0.8, 0],
    ],
  ];
  const body = mesh(lathe(prof, 40), o.body);
  body.rotation.z = -Math.PI / 2;
  g.add(body);
  if (o.flangeR) {
    g.add(flangeX(0, ft, o.flangeR, o.endR * 0.8, o.body));
    g.add(flangeX(L - ft, ft, o.flangeR, o.endR * 0.8, o.body));
  }
  // stem, gland nut and lever
  const top = o.bulgeR;
  g.add(mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.03, 16), o.steel, [mid, top + 0.012, 0]));
  g.add(mesh(hexRing(0.019, 0.01, 0), o.body, [mid, top - 0.002, 0]));
  const lever = group('lever');
  lever.position.set(mid, top + 0.024, 0);
  lever.rotation.y = ((o.leverAngle ?? 0) * Math.PI) / 180;
  const barLen = Math.max(0.07, o.bulgeR * 2.2);
  lever.add(mesh(new THREE.BoxGeometry(barLen, 0.004, 0.012), o.steel, [barLen * 0.3, 0, 0]));
  lever.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.036, 14), o.grip, [barLen * 0.3 + barLen * 0.42, 0, 0]));
  lever.children[1].rotation.z = Math.PI / 2;
  lever.add(mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.006, 14), o.steel, [0, 0.005, 0]));
  g.add(lever);
  return g;
}

export const darker = (m: THREE.MeshStandardMaterial, k = 0.8): THREE.MeshStandardMaterial => {
  const c = m.clone();
  c.color.multiplyScalar(k);
  return c;
};

export { MAT };
