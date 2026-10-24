import * as THREE from 'three';
import { MAT, group, mesh } from '@onigam/lab-kit/three';
import { BENCH, VALVE } from '../dims';
import { paperFloor } from '../common';

// The workshop staging of the `valve` world: a plain wooden plinth on the paper floor, the two steel parallels the base plate
// stands on (so that the head and the fins nut can leave downwards when exploded), and a steel rule for the scale.
// Nothing here is a part.

/** Top face of the plinth in the valve frame (origin on the top face of the base plate). */
export const BENCH_TOP_Y = -(VALVE.basePlateThickness + BENCH.parallelHeight);
/** Bottom face of the plinth, which stands on the paper floor. */
export const FLOOR_Y = BENCH_TOP_Y - BENCH.plinthThickness;

/** Height of the bench surface that catches a falling drop at (x, z) (valve frame). */
export function benchFloor(x: number, z: number): number {
  const onPlinth = Math.abs(x) < BENCH.plinthLength / 2 && Math.abs(z) < BENCH.plinthDepth / 2;
  return onPlinth ? BENCH_TOP_Y : FLOOR_Y;
}

/** Steel rule: a flat strip with a graduation every millimetre, long ticks every centimetre (a DataTexture). */
function rule(length: number, width: number): THREE.Mesh {
  const W = 2048;
  const H = 64;
  const data = new Uint8Array(W * H * 4);
  const mmPx = W / (length * 1000);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = (y * W + x) * 4;
      let c = 214; // light steel
      const mm = x / mmPx;
      const nearest = Math.abs(mm - Math.round(mm)) * mmPx;
      const idx = Math.round(mm);
      const len = idx % 10 === 0 ? 0.55 : idx % 5 === 0 ? 0.38 : 0.24;
      if (nearest < 0.75 && y < H * len) c = 40;
      data[k] = data[k + 1] = c;
      data[k + 2] = c + 4;
      data[k + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  const geo = new THREE.BoxGeometry(length, 0.0008, width);
  const m = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.6, roughness: 0.4 });
  const r = mesh(geo, m);
  r.name = 'rule';
  return r;
}

export interface Bench {
  group: THREE.Group;
  floor: THREE.Mesh;
}

export function buildBench(): Bench {
  const g = group('bench');
  const wood = MAT.woodLight();
  const steel = MAT.steel();
  // plinth: a thick wooden slab
  g.add(
    mesh(new THREE.BoxGeometry(BENCH.plinthLength, BENCH.plinthThickness, BENCH.plinthDepth), wood, [
      0,
      BENCH_TOP_Y - BENCH.plinthThickness / 2,
      0,
    ]),
  );
  // the parallels: two ground steel bars, the plate stands on them
  const side = VALVE.basePlateSide;
  for (const sx of [-1, 1])
    g.add(
      mesh(new THREE.BoxGeometry(BENCH.parallelWidth, BENCH.parallelHeight, side), steel, [
        sx * BENCH.parallelOffsetX,
        BENCH_TOP_Y + BENCH.parallelHeight / 2,
        0,
      ]),
    );
  // the rule lies on the plinth in front, parallel to the X axis
  const r = rule(0.3, 0.025);
  r.position.set(0, BENCH_TOP_Y + 0.0004, BENCH.plinthDepth / 2 - 0.035);
  g.add(r);
  const floor = paperFloor(1.6, 0.4, FLOOR_Y - 0.0005);
  return { group: g, floor };
}
