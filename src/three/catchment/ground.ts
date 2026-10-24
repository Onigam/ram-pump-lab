import * as THREE from 'three';
import { CATCHMENT as C } from '../dims';
import { smoothstep } from '../common';
import { fbm, vnoise } from '../site/noise';
import {
  BED_FLOOR_Y,
  BED_X0,
  BED_X1,
  BOX_OHL,
  BOX_OHW,
  BOX_SLAB_BOTTOM,
  BEND_X,
  NOTCHES,
  SPRING_X,
  groundY,
  SLAB_R,
} from './layout';

// The ground of the catchment world: a cut-out block of the hillside on a dark plinth (like the Coanda intake of Pelton Lab).
// Its top is a grid with holes where the spring box and the gravel bed are dug in; its four sides show the layers of the
// ground; a section cap at z = 0 shows the same layers when the section tool is on, with the excavations cut out of it.

const X0 = -C.blockWest;
const X1 = C.blockEast;
const Z0 = -C.blockHalfWidth;
const Z1 = C.blockHalfWidth;
export const BASE_Y = -C.blockBase;
export const PLINTH_H = 0.09;

/** The layers, as depths below the natural ground: [from, to, colour]. */
const LAYERS: [number, number, number][] = [
  [0, 0.08, 0x5f7a37], // turf
  [0.08, 0.45, 0x4d3a28], // topsoil
  [0.45, 1.05, 0x8d6c47], // subsoil
  [1.05, 1.9, 0xa59272], // weathered rock and clay
  [1.9, 99, 0x77746c], // bedrock
];

const C_ = {
  grassA: new THREE.Color(0x6f9a3f),
  grassB: new THREE.Color(0x8aa24a),
  dry: new THREE.Color(0xa39a55),
  rock: new THREE.Color(0x85817a),
  rockDark: new THREE.Color(0x66635d),
  gravel: new THREE.Color(0xa59d86),
  dirt: new THREE.Color(0x9a8c64),
};

/** Lines of a grid axis from `a` to `b`: a base step, finer ranges, and lines that must exist (edges of the excavations). */
function axis(a: number, b: number, step: number, fine: [number, number, number][], forced: number[]): number[] {
  const out: number[] = [];
  let x = a;
  while (x < b - 1e-6) {
    out.push(x);
    let s = step;
    for (const [f0, f1, fs] of fine) if (x >= f0 - 1e-6 && x < f1 - 1e-6) s = Math.min(s, fs);
    x += s;
  }
  out.push(b);
  const kept = out.filter((v) => !forced.some((f) => Math.abs(f - v) < 0.06));
  return [...new Set([...kept, ...forced])].sort((p, q) => p - q);
}

/** A small grainy texture (a DataTexture: no canvas, so it also builds in Node). */
function grain(): THREE.DataTexture {
  const N = 128;
  const data = new Uint8Array(N * N * 4);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const v = 0.5 + 0.5 * (0.6 * vnoise(i * 0.4, j * 0.4) + 0.4 * vnoise(i * 1.1 + 40, j * 1.1));
      const g = Math.round(200 + 55 * v);
      const k = (j * N + i) * 4;
      data[k] = g;
      data[k + 1] = g;
      data[k + 2] = Math.round(g * 0.97);
      data[k + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

/** Surface height of the block with a little roughness (none on the bench and in the neighbourhood of the parts). */
export function surfaceY(x: number, z: number): number {
  const y = groundY(x, z);
  const free = smoothstep(-2.4, -1.3, x) < 0.5 ? 1 : 0; // west of the foot of the scarp
  const farFromBox = smoothstep(1.2, 2.6, Math.hypot(Math.max(0, Math.abs(x - SPRING_X) - 2), z));
  const amp = free * farFromBox * 0.045;
  return y + amp * fbm(x * 0.9 + 3, z * 0.9 - 5, 3);
}

export interface Block {
  group: THREE.Group;
  top: THREE.Mesh;
  walls: THREE.Mesh;
  plinth: THREE.Mesh;
  /** The section caps at z = 0 (earth with its layers, plinth). */
  caps: THREE.Mesh[];
  /** Everything the section clips. */
  clipped: THREE.Mesh[];
}

export function buildBlock(): Block {
  const group = new THREE.Group();
  group.name = 'block';

  // ---- top surface
  const hole = (a: number, b: number, c: number, d: number) => ({ x0: a, x1: b, z0: c, z1: d });
  const holes = [
    hole(SPRING_X - BOX_OHL, SPRING_X + BOX_OHL, -BOX_OHW, BOX_OHW),
    hole(SPRING_X + BED_X0, SPRING_X + BED_X1, -C.filterWidth / 2, C.filterWidth / 2),
  ];
  const xs = axis(
    X0,
    X1,
    0.22,
    [
      [-2.5, -1.35, 0.07],
      [BEND_X - 0.6, BEND_X + 0.9, 0.12],
      [-SLAB_R - 0.2, SLAB_R + 0.2, 0.18],
    ],
    holes.flatMap((h) => [h.x0, h.x1]).concat([X0, X1]),
  );
  const zs = axis(Z0, Z1, 0.3, [[-1.1, 1.1, 0.16]], holes.flatMap((h) => [h.z0, h.z1]).concat([Z0, Z1]));
  const NX = xs.length;
  const NZ = zs.length;
  const pos = new Float32Array(NX * NZ * 3);
  const col = new Float32Array(NX * NZ * 3);
  const uv = new Float32Array(NX * NZ * 2);
  const tmp = new THREE.Color();
  for (let j = 0; j < NZ; j++) {
    for (let i = 0; i < NX; i++) {
      const v = j * NX + i;
      const x = xs[i];
      const z = zs[j];
      pos.set([x, surfaceY(x, z), z], v * 3);
      uv.set([x / 3, z / 3], v * 2);
    }
  }
  const slopeAt = (i: number, j: number) => {
    const ip = Math.min(NX - 1, i + 1);
    const im = Math.max(0, i - 1);
    const dx = (pos[(j * NX + ip) * 3 + 1] - pos[(j * NX + im) * 3 + 1]) / (xs[ip] - xs[im]);
    return Math.abs(dx);
  };
  for (let j = 0; j < NZ; j++) {
    for (let i = 0; i < NX; i++) {
      const v = j * NX + i;
      const x = xs[i];
      const z = zs[j];
      const n = fbm(x * 0.5 + 9, z * 0.5 + 4, 3);
      tmp.copy(C_.grassA).lerp(C_.grassB, smoothstep(-0.3, 0.4, n));
      tmp.lerp(C_.dry, smoothstep(0.3, 0.7, n) * 0.4);
      // bare earth and gravel around the tank and along the pipes; rock on the steep ground (the scarp)
      const nearTank = 1 - smoothstep(SLAB_R + 0.3, SLAB_R + 1.6, Math.hypot(x, z * 0.8));
      tmp.lerp(C_.gravel, nearTank * 0.85);
      const sl = slopeAt(i, j);
      tmp.lerp(n > 0 ? C_.rock : C_.rockDark, smoothstep(0.35, 1.4, sl));
      tmp.multiplyScalar(0.94 + 0.12 * vnoise(x * 1.7, z * 1.7));
      col.set([tmp.r, tmp.g, tmp.b], v * 3);
    }
  }
  const idx: number[] = [];
  for (let j = 0; j < NZ - 1; j++) {
    for (let i = 0; i < NX - 1; i++) {
      const cx = (xs[i] + xs[i + 1]) / 2;
      const cz = (zs[j] + zs[j + 1]) / 2;
      if (holes.some((h) => cx > h.x0 && cx < h.x1 && cz > h.z0 && cz < h.z1)) continue;
      const a = j * NX + i;
      idx.push(a, a + NX, a + 1, a + 1, a + NX, a + NX + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const top = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, map: grain(), roughness: 0.97, metalness: 0 }),
  );
  top.name = 'ground';
  top.receiveShadow = true;
  top.castShadow = true;
  group.add(top);

  // earthen lining of the two excavations: what shows when the box or the bed is hidden or exploded (inner faces only)
  const liner = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1, side: THREE.BackSide });
  const linings: THREE.Mesh[] = [];
  for (const [i, h] of holes.entries()) {
    const floor = i === 0 ? BOX_SLAB_BOTTOM : BED_FLOOR_Y - 0.1;
    const top = groundY((h.x0 + h.x1) / 2, 0) + 0.01;
    const m = new THREE.Mesh(new THREE.BoxGeometry(h.x1 - h.x0, top - floor, h.z1 - h.z0), liner);
    m.position.set((h.x0 + h.x1) / 2, (top + floor) / 2, (h.z0 + h.z1) / 2);
    m.receiveShadow = true;
    m.name = 'excavation';
    group.add(m);
    linings.push(m);
  }

  // ---- layered sides
  const walls = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97 }),
  );
  walls.name = 'block-walls';
  walls.receiveShadow = true;
  walls.castShadow = true;
  const wall = new WallBuilder();
  const alongX = (z: number) => xs.map((x) => ({ x, z, top: surfaceY(x, z), ground: groundY(x, z) }));
  const alongZ = (x: number) => zs.map((z) => ({ x, z, top: surfaceY(x, z), ground: groundY(x, z) }));
  wall.add(alongX(Z1), [0, 0, 1]);
  wall.add(alongX(Z0), [0, 0, -1]);
  wall.add(alongZ(X0), [-1, 0, 0]);
  wall.add(alongZ(X1), [1, 0, 0]);
  walls.geometry = wall.geometry();
  group.add(walls);

  // ---- plinth
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(X1 - X0 + 0.08, PLINTH_H, Z1 - Z0 + 0.08),
    new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 0.55, metalness: 0 }),
  );
  plinth.position.set((X0 + X1) / 2, BASE_Y - PLINTH_H / 2, 0);
  plinth.receiveShadow = true;
  plinth.castShadow = true;
  plinth.name = 'plinth';
  group.add(plinth);

  // ---- section caps at z = 0: the layers with the excavations cut out of them, and the plinth
  const cap = new WallBuilder(true);
  const section: { x: number; top: number; ground: number }[] = [];
  const edges = new Set<number>(xs);
  for (const [a, b] of NOTCHES) {
    edges.add(a);
    edges.add(b);
  }
  const xsCut = [...edges].sort((p, q) => p - q);
  for (const x of xsCut) {
    const inside = NOTCHES.filter(([a, b]) => x > a - 1e-9 && x < b + 1e-9);
    const g = surfaceY(x, 0);
    if (inside.length === 0) section.push({ x, top: g, ground: groundY(x, 0) });
    else {
      // on a notch edge: one sample at the top of the ground, one at the bottom of the excavation (a vertical edge)
      const bottom = Math.min(...inside.map((n) => n[2]));
      const edge = inside.some(([a, b]) => Math.abs(x - a) < 1e-9 || Math.abs(x - b) < 1e-9);
      if (edge) section.push({ x, top: g, ground: groundY(x, 0) });
      section.push({ x, top: bottom, ground: groundY(x, 0) });
    }
  }
  cap.add(
    section.map((s) => ({ x: s.x, z: 0, top: s.top, ground: s.ground })),
    [0, 0, 1],
  );
  const capMesh = new THREE.Mesh(
    cap.geometry(),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97, side: THREE.DoubleSide }),
  );
  capMesh.name = 'earth-section';
  capMesh.visible = false;
  capMesh.userData.noShadow = true;
  group.add(capMesh);
  const plinthCap = new THREE.Mesh(
    new THREE.PlaneGeometry(X1 - X0 + 0.08, PLINTH_H),
    new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 0.6, side: THREE.DoubleSide }),
  );
  plinthCap.position.set((X0 + X1) / 2, BASE_Y - PLINTH_H / 2, 0);
  plinthCap.visible = false;
  plinthCap.name = 'plinth-section';
  group.add(plinthCap);

  return { group, top, walls, plinth, caps: [capMesh, plinthCap], clipped: [top, walls, plinth, ...linings] };
}

/**
 * Builds strips of vertex-coloured quads for the layers of the ground along a path. Each sample has the top of the strip
 * (`top`, the surface or the bottom of an excavation) and the natural ground (`ground`) the layers are measured from.
 */
class WallBuilder {
  private readonly pos: number[] = [];
  private readonly nor: number[] = [];
  private readonly col: number[] = [];
  private readonly c = new THREE.Color();

  constructor(private readonly cap = false) {}

  add(path: { x: number; z: number; top: number; ground: number }[], n: [number, number, number]): void {
    for (const [d0, d1, hex] of LAYERS) {
      this.c.setHex(hex);
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i];
        const b = path[i + 1];
        const wob = (p: typeof a, d: number) => d + (d > 0 && d < 90 ? 0.07 * fbm(p.x * 0.6 + d * 5, p.z * 0.6, 2) : 0);
        const up = (p: typeof a) => Math.min(p.top, p.ground - wob(p, d0));
        const lo = (p: typeof a) => Math.max(BASE_Y, Math.min(p.top, p.ground - wob(p, d1)));
        const [a0, a1, b0, b1] = [up(a), lo(a), up(b), lo(b)];
        if (a0 - a1 < 1e-5 && b0 - b1 < 1e-5) continue;
        this.quad(a, a0, a1, b, b0, b1, n);
      }
    }
  }

  private quad(
    a: { x: number; z: number },
    a0: number,
    a1: number,
    b: { x: number; z: number },
    b0: number,
    b1: number,
    n: [number, number, number],
  ): void {
    const P = [
      [a.x, a0, a.z],
      [a.x, a1, a.z],
      [b.x, b0, b.z],
      [b.x, b1, b.z],
    ];
    const tri = (i: number, j: number, k: number) => {
      const u = [P[j][0] - P[i][0], P[j][1] - P[i][1], P[j][2] - P[i][2]];
      const v = [P[k][0] - P[i][0], P[k][1] - P[i][1], P[k][2] - P[i][2]];
      const cx = u[1] * v[2] - u[2] * v[1];
      const cy = u[2] * v[0] - u[0] * v[2];
      const cz = u[0] * v[1] - u[1] * v[0];
      const flip = cx * n[0] + cy * n[1] + cz * n[2] < 0 && !this.cap;
      const order = flip ? [i, k, j] : [i, j, k];
      for (const m of order) {
        this.pos.push(...P[m]);
        this.nor.push(...n);
        this.col.push(this.c.r, this.c.g, this.c.b);
      }
    };
    tri(0, 1, 2);
    tri(2, 1, 3);
  }

  geometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    return g;
  }
}

/** The outer limits of the block (the scene ends the gutter and the drive pipe stub on its east face). */
export const BLOCK = { x0: X0, x1: X1, z0: Z0, z1: Z1, base: BASE_Y };
