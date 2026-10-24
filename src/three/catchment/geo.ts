import * as THREE from 'three';
import { MAT, mesh } from '@onigam/lab-kit/three';
import { roundedPath } from '@onigam/lab-kit/three';
import { TAU } from '../common';

// Small geometry helpers of the catchment world (pipes, perforated baskets, rocks, walls with holes). Everything builds
// geometry and materials only (no canvas), so it also runs in Node under vitest.

export const v3 = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

/** A cylinder lying along X from `x0` to `x1`, on the axis (y, z). */
export function rodX(
  x0: number,
  x1: number,
  radius: number,
  material: THREE.Material,
  y = 0,
  z = 0,
  segments = 16,
): THREE.Mesh {
  const m = mesh(new THREE.CylinderGeometry(radius, radius, Math.abs(x1 - x0), segments), material);
  m.rotation.z = Math.PI / 2;
  m.position.set((x0 + x1) / 2, y, z);
  return m;
}

/** A cylinder standing along Y from `y0` to `y1`. */
export function rodY(
  y0: number,
  y1: number,
  radius: number,
  material: THREE.Material,
  x = 0,
  z = 0,
  segments = 16,
): THREE.Mesh {
  const m = mesh(new THREE.CylinderGeometry(radius, radius, Math.abs(y1 - y0), segments), material);
  m.position.set(x, (y0 + y1) / 2, z);
  return m;
}

/** A cylinder along any axis from point `a` to point `b`. */
export function rodBetween(
  a: THREE.Vector3,
  b: THREE.Vector3,
  radius: number,
  material: THREE.Material,
  segments = 12,
): THREE.Mesh {
  const d = b.clone().sub(a);
  const m = mesh(new THREE.CylinderGeometry(radius, radius, d.length(), segments), material);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}

/** A box between two corners. */
export function boxBetween(
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  material: THREE.Material,
): THREE.Mesh {
  const m = mesh(new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)), material);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return m;
}

/** A pipe along a polyline with rounded corners (bend radius `bend`), a tube of `radius`. */
export function pipe(
  points: THREE.Vector3[],
  radius: number,
  material: THREE.Material,
  bend = radius * 3,
  radial = 14,
): THREE.Mesh {
  const path = roundedPath(points, bend);
  const len = path.getLength();
  const geo = new THREE.TubeGeometry(path, Math.max(6, Math.min(160, Math.round(len / 0.1))), radius, radial, false);
  return mesh(geo, material);
}

/** Points of a pipe's centre line, for the flow dots: the same rounded path, sampled evenly. */
export function pipeLine(points: THREE.Vector3[], bend: number, step = 0.12): THREE.Vector3[] {
  const path = roundedPath(points, bend);
  return path.getSpacedPoints(Math.max(2, Math.round(path.getLength() / step)));
}

/**
 * A wall seen from the side of an extrusion along X: a rectangle `width` (Z) by `height` (Y) with round holes
 * (centre z, centre y, radius), `depth` thick along X, centred on x = 0 in X, z = 0 in Z, with its base at y = 0.
 */
export function wallWithHoles(
  depth: number,
  width: number,
  height: number,
  holes: [number, number, number][],
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(width / 2, height);
  shape.lineTo(-width / 2, height);
  shape.closePath();
  for (const [hz, hy, r] of holes) {
    const h = new THREE.Path();
    h.absarc(hz, hy, r, 0, TAU, true);
    shape.holes.push(h);
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 14 });
  // the extrusion runs along +Z in the shape's frame: turn it so that the shape's x is Z and the extrusion is X
  g.rotateY(Math.PI / 2);
  g.translate(-depth / 2, 0, 0);
  return g;
}

/** Rough boulder with flat shading (deterministic from `seed`). */
export function boulderGeometry(seed: number, detail = 1): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const pa = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pa.count; i++) {
    const x = pa.getX(i);
    const y = pa.getY(i);
    const z = pa.getZ(i);
    const k =
      1 +
      0.26 * Math.sin(x * 4.1 + seed * 1.7) * Math.cos(z * 3.7 - seed) +
      0.14 * Math.sin(y * 6.3 + seed * 3.1) +
      0.08 * Math.sin((x + z) * 9.1 + seed);
    pa.setXYZ(i, x * k, y * k * 0.78, z * k);
  }
  // PolyhedronGeometry is already non-indexed: the normals computed per face give the flat shading
  const flat = geo.index ? geo.toNonIndexed() : geo;
  flat.computeVertexNormals();
  return flat;
}

/** A rough rock of its own material, centred on (x, y, z), scale (sx, sy, sz), turned by `ry` around Y. */
export function rock(
  seed: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  ry = seed * 1.3,
  detail = 1,
): THREE.Mesh {
  const m = mesh(boulderGeometry(seed, detail), material, [x, y, z]);
  m.scale.set(sx, sy, sz);
  m.rotation.y = ry;
  return m;
}

/** Perforated sheet as an alpha map (a DataTexture: no canvas): opaque with round holes, one hole per tile. */
export function perforationMap(holeFraction = 0.34, size = 32): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const r = holeFraction / 2;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const d = Math.hypot((i + 0.5) / size - 0.5, (j + 0.5) / size - 0.5);
      const a = d < r ? 0 : 255;
      const k = (j * size + i) * 4;
      data[k] = data[k + 1] = data[k + 2] = a;
      data[k + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

/** Stainless perforated material: the holes are cut by an alpha test on `perforationMap`. */
export function perforatedSteel(repeatX: number, repeatY: number, holeFraction = 0.34): THREE.MeshStandardMaterial {
  const map = perforationMap(holeFraction);
  map.repeat.set(repeatX, repeatY);
  const m = MAT.inox();
  m.alphaMap = map;
  m.alphaTest = 0.5;
  m.side = THREE.DoubleSide;
  return m;
}

/** Sweep a U-shaped (or any) profile along a path in the XZ plane: `profile` points are (lateral offset, height) pairs. */
export function sweepProfile(
  path: { x: number; y: number; z: number }[],
  profile: [number, number][],
  closed = false,
): THREE.BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  const n = path.length;
  const m = profile.length;
  for (let i = 0; i < n; i++) {
    const a = path[Math.max(0, i - 1)];
    const b = path[Math.min(n - 1, i + 1)];
    let tx = b.x - a.x;
    let tz = b.z - a.z;
    const tl = Math.hypot(tx, tz) || 1;
    tx /= tl;
    tz /= tl;
    // lateral direction (to the right of the travel direction in plan)
    const lx = -tz;
    const lz = tx;
    for (const [off, h] of profile) pos.push(path[i].x + lx * off, path[i].y + h, path[i].z + lz * off);
  }
  for (let i = 0; i < n - 1; i++) {
    for (let k = 0; k < m - (closed ? 0 : 1); k++) {
      const k2 = (k + 1) % m;
      const a = i * m + k;
      const b = i * m + k2;
      const c = (i + 1) * m + k;
      const d = (i + 1) * m + k2;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ------------------------------------------------------------------------------------------------ pipe material

export type PipeKind = 'steel' | 'pvc' | 'hdpe';

/**
 * The material of the drive pipe from the wave speed of the state (the state does not carry the material): 900 m/s is steel,
 * 500 PVC, 350 polyethylene. An unknown speed (before the first update) stays steel.
 */
export function pipeKindOf(waveSpeed: number): PipeKind {
  if (!(waveSpeed > 0)) return 'steel';
  return waveSpeed > 700 ? 'steel' : waveSpeed > 420 ? 'pvc' : 'hdpe';
}

/** Dress a standard material as a steel, PVC or polyethylene pipe (colour and finish only: the shader stays the same). */
export function applyPipeKind(m: THREE.MeshStandardMaterial, kind: PipeKind): void {
  if (kind === 'steel') {
    m.color.setHex(0xb7bcc2);
    m.metalness = 0.9;
    m.roughness = 0.3;
  } else if (kind === 'pvc') {
    m.color.setHex(0xd6d8d3);
    m.metalness = 0.05;
    m.roughness = 0.4;
  } else {
    m.color.setHex(0x1b1d20);
    m.metalness = 0;
    m.roughness = 0.5;
  }
}
