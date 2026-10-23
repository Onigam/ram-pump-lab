import * as THREE from 'three';
import { smoothstep } from '../common';
import { HOUSE, PIT, TOWER } from '../dims';
import { fbm, vnoise } from './noise';
import { PIT_X, createGround, driveGeometry, type Ground, type SiteParams } from './layout';

// The hillside as one tensor-product grid whose cells grow with the distance to the places that matter (the ram, the
// drive pipe, the route, the buildings), so a few tens of thousands of vertices reach the far mountains. The height is
// affine in the head H (the rise, the tower pad and the house terrace are all proportional to it), so a change of H is a
// single multiply-add per vertex; a change of the fall or of the drive length re-evaluates only the western part.

export interface Terrain {
  mesh: THREE.Mesh;
  ground: Ground;
  /** Recolour after a drag of the head (the colours follow the slope; they are refreshed lazily while it moves). */
  settle(): void;
  /** Move the ground to new parameters; returns true when the mesh changed. */
  setParams(p: SiteParams): boolean;
  /** Height of the rendered surface (exact triangle interpolation). */
  surfaceY(x: number, z: number): number;
  /** Mean surface slope 1 - n.y at (x, z). */
  slopeAt(x: number, z: number): number;
  /** Parameters the surface currently has. */
  readonly params: SiteParams;
}

interface Focus {
  a: number;
  b: number;
  fine: number;
}

/** Grid lines from `min` to `max`, the step growing with the distance to the nearest focus interval. */
function axisLines(
  min: number,
  max: number,
  foci: Focus[],
  forced: number[] = [],
  growth = 0.1,
  maxStep = 45,
): Float32Array {
  const out: number[] = [min];
  let x = min;
  while (x < max) {
    let step = maxStep;
    for (const f of foci) {
      const d = x < f.a ? f.a - x : x > f.b ? x - f.b : 0;
      step = Math.min(step, f.fine + growth * d);
    }
    x = Math.min(max, x + step);
    out.push(x);
  }
  // lines that must exist (the edges of the pit hole): they replace the generated lines closer than 0.2 m
  const kept = out.filter((v) => !forced.some((f) => Math.abs(f - v) < 0.2));
  return Float32Array.from([...kept, ...forced].sort((a, b) => a - b));
}

/** A subtle micro-variation texture (a DataTexture: no canvas needed). */
function detailTexture(): THREE.DataTexture {
  const N = 128;
  const data = new Uint8Array(N * N * 4);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const v = 0.5 + 0.5 * (0.6 * vnoise(i * 0.35, j * 0.35) + 0.4 * vnoise(i * 0.9 + 40, j * 0.9));
      const g = Math.round(205 + 50 * v);
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

/** Half sizes of the opening of the ram pit: the terrain has a hole there (the pit is a real chamber). */
const HOLE_X = PIT.innerLength / 2;
const HOLE_Z = PIT.innerWidth / 2;

const C = {
  grassA: new THREE.Color(0x6f9a3f),
  grassB: new THREE.Color(0x93a44c),
  dry: new THREE.Color(0xa39a55),
  forest: new THREE.Color(0x4a5f33),
  rock: new THREE.Color(0x85817a),
  rockDark: new THREE.Color(0x66635d),
  gravel: new THREE.Color(0xa59d86),
  dirt: new THREE.Color(0x9a8c64),
  alpine: new THREE.Color(0x8b8d6c),
  snow: new THREE.Color(0xe9eef2),
};

export function buildTerrain(initial: SiteParams): Terrain {
  const ground = createGround();
  // fine around the ram and its drive pipe, medium along the route and at the buildings, coarse beyond
  const xs = axisLines(
    -1800,
    1800,
    [
      { a: -36, b: 12, fine: 0.8 },
      { a: 0, b: 85, fine: 3 },
    ],
    [PIT_X - HOLE_X, PIT_X + HOLE_X],
  );
  const zs = axisLines(
    -1800,
    1800,
    [
      { a: -12, b: 12, fine: 0.8 },
      { a: -185, b: -125, fine: 3 },
      { a: -125, b: -12, fine: 5 },
    ],
    [-HOLE_Z, HOLE_Z],
  );
  const NX = xs.length;
  const NZ = zs.length;
  const count = NX * NZ;

  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  const stat = new Float32Array(count); // parameter-free part of the height
  const p0 = new Float32Array(count); // height at H = 0 (for the current fall and length)
  const q = new Float32Array(count); // dh/dH
  const tint = new Float32Array(count); // colour noise
  const forest = new Float32Array(count); // forest mask 0..1 (shared with the trees)
  const nearWest = new Uint8Array(count); // vertices that depend on the fall and the drive length
  for (let j = 0; j < NZ; j++) {
    for (let i = 0; i < NX; i++) {
      const v = j * NX + i;
      const x = xs[i];
      const z = zs[j];
      pos[v * 3] = x;
      pos[v * 3 + 2] = z;
      uv[v * 2] = x / 4;
      uv[v * 2 + 1] = z / 4;
      stat[v] = ground.staticPart(x, z);
      tint[v] = fbm(x * 0.03 + 5, z * 0.03 + 9, 3);
      forest[v] = forestMask(x, z);
      nearWest[v] = x < 14 && Math.abs(z) < 110 ? 1 : 0;
    }
  }

  const idx: number[] = [];
  for (let j = 0; j < NZ - 1; j++) {
    for (let i = 0; i < NX - 1; i++) {
      const v00 = j * NX + i;
      const v10 = v00 + 1;
      const v01 = v00 + NX;
      const v11 = v01 + 1;
      const cx = (xs[i] + xs[i + 1]) / 2 - PIT_X;
      const cz = (zs[j] + zs[j + 1]) / 2;
      if (Math.abs(cx) < HOLE_X && Math.abs(cz) < HOLE_Z) continue; // the opening of the pit
      idx.push(v00, v01, v10, v10, v01, v11);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: detailTexture(),
    roughness: 0.97,
    metalness: 0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'terrain';
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.frustumCulled = false;

  let params: SiteParams = { fall: NaN, driveLength: NaN, head: NaN };

  const evalFull = (i: number, j: number, p: SiteParams): number => {
    const v = j * NX + i;
    return ground.height(xs[i], zs[j], p, stat[v]);
  };

  const refreshDynamic = (p: SiteParams, mode: 'all' | 'west' | 'none') => {
    if (mode === 'none') return;
    const z0 = { ...p, head: 0 };
    const z1 = { ...p, head: 1 };
    const d = driveGeometry(p);
    const qx0 = d.outlet.x - 25; // where the corridor and the tank plateau change dh/dH
    for (let j = 0; j < NZ; j++) {
      for (let i = 0; i < NX; i++) {
        const v = j * NX + i;
        if (mode === 'west' && !nearWest[v]) continue;
        const h0 = evalFull(i, j, z0);
        p0[v] = h0;
        // the head only reaches the ground through the rise, which the corridor and the plateau replace: elsewhere dh/dH is fixed
        if (mode === 'all' || (xs[i] > qx0 && Math.abs(zs[j]) < 20)) q[v] = evalFull(i, j, z1) - h0;
      }
    }
  };

  const normal = new THREE.Vector3();
  const nrmArr = new Float32Array(count * 3);
  geo.setAttribute('normal', new THREE.BufferAttribute(nrmArr, 3));
  /** Normals from central differences of the grid heights (a fraction of the cost of computeVertexNormals). */
  const computeNormals = () => {
    for (let j = 0; j < NZ; j++) {
      const jm = Math.max(0, j - 1);
      const jp = Math.min(NZ - 1, j + 1);
      for (let i = 0; i < NX; i++) {
        const im = Math.max(0, i - 1);
        const ip = Math.min(NX - 1, i + 1);
        const dx = (pos[(j * NX + ip) * 3 + 1] - pos[(j * NX + im) * 3 + 1]) / (xs[ip] - xs[im]);
        const dz = (pos[(jp * NX + i) * 3 + 1] - pos[(jm * NX + i) * 3 + 1]) / (zs[jp] - zs[jm]);
        const l = Math.hypot(dx, 1, dz);
        const o = (j * NX + i) * 3;
        nrmArr[o] = -dx / l;
        nrmArr[o + 1] = 1 / l;
        nrmArr[o + 2] = -dz / l;
      }
    }
    (geo.attributes.normal as THREE.BufferAttribute).needsUpdate = true;
  };
  let colouredHead = NaN;
  let colourStale = false;
  const westOrBigHeadStep = (p: SiteParams, _mode: string) => Math.abs(p.head - colouredHead) > 25;
  const recolour = () => {
    colouredHead = params.head;
    colourStale = false;
    const nrm = geo.attributes.normal as THREE.BufferAttribute;
    const c = new THREE.Color();
    const g = new THREE.Color();
    const w = new THREE.Color();
    for (let v = 0; v < count; v++) {
      const y = pos[v * 3 + 1];
      const x = pos[v * 3];
      const z = pos[v * 3 + 2];
      const slope = 1 - nrm.getY(v);
      const n = tint[v];
      g.copy(C.grassA)
        .lerp(C.grassB, smoothstep(-0.3, 0.35, n))
        .lerp(C.dry, smoothstep(0.25, 0.7, n) * 0.55);
      c.copy(g).lerp(C.forest, forest[v] * 0.8);
      // bare ground around the buildings and the tank, the pit and the route start
      const dirt = Math.max(
        1 - smoothstep(3, 9, Math.hypot(x - PIT_X, z)),
        1 - smoothstep(5, 11, Math.hypot(x - TOWER.planX, z - TOWER.planZ)),
        1 - smoothstep(7, 14, Math.hypot(x - HOUSE.planX, z - HOUSE.planZ)),
      );
      c.lerp(dirt > 0.5 ? C.gravel : C.dirt, dirt * 0.6);
      // rock on the steep ground, alpine tint and a little snow on the far peaks
      c.lerp(n > 0 ? C.rock : C.rockDark, smoothstep(0.1, 0.26, slope));
      c.lerp(C.alpine, smoothstep(120, 260, y));
      c.lerp(C.snow, smoothstep(300, 380, y + n * 30) * (1 - smoothstep(0.25, 0.5, slope)));
      c.multiplyScalar(0.94 + 0.12 * vnoise(x * 0.2, z * 0.2));
      w.copy(c);
      col[v * 3] = w.r;
      col[v * 3 + 1] = w.g;
      col[v * 3 + 2] = w.b;
    }
    (geo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  };

  const rebuild = (p: SiteParams, mode: 'all' | 'west' | 'none') => {
    refreshDynamic(p, mode);
    for (let v = 0; v < count; v++) pos[v * 3 + 1] = p0[v] + p.head * q[v];
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    computeNormals();
    if (mode === 'all' || westOrBigHeadStep(p, mode)) recolour();
    else colourStale = true;
    geo.computeBoundingSphere();
  };

  const surfaceY = (x: number, z: number): number => {
    const i = bracket(xs, x);
    const j = bracket(zs, z);
    const fx = (x - xs[i]) / (xs[i + 1] - xs[i]);
    const fz = (z - zs[j]) / (zs[j + 1] - zs[j]);
    const h = (a: number, b: number) => pos[(b * NX + a) * 3 + 1];
    const h00 = h(i, j);
    const h10 = h(i + 1, j);
    const h01 = h(i, j + 1);
    const h11 = h(i + 1, j + 1);
    if (fx + fz <= 1) return h00 + (h10 - h00) * fx + (h01 - h00) * fz;
    return h11 + (h01 - h11) * (1 - fx) + (h10 - h11) * (1 - fz);
  };

  const terrain: Terrain = {
    mesh,
    ground,
    settle() {
      if (colourStale) recolour();
    },
    get params() {
      return params;
    },
    setParams(p) {
      const same = p.fall === params.fall && p.driveLength === params.driveLength && p.head === params.head;
      if (same) return false;
      const firstTime = Number.isNaN(params.head);
      const westChanged = p.fall !== params.fall || p.driveLength !== params.driveLength;
      params = { ...p };
      rebuild(p, firstTime ? 'all' : westChanged ? 'west' : 'none');
      return true;
    },
    surfaceY,
    slopeAt(x, z) {
      const e = 1.5;
      const dx = (surfaceY(x + e, z) - surfaceY(x - e, z)) / (2 * e);
      const dz = (surfaceY(x, z + e) - surfaceY(x, z - e)) / (2 * e);
      normal.set(-dx, 1, -dz).normalize();
      return 1 - normal.y;
    },
  };
  terrain.setParams(initial);
  return terrain;
}

function bracket(arr: Float32Array, v: number): number {
  let lo = 0;
  let hi = arr.length - 1;
  if (v <= arr[0]) return 0;
  if (v >= arr[hi]) return hi - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] <= v) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** Forest density 0..1 from noise, cleared around the buildings, the drive pipe and the ram (shared with the trees). */
export function forestMask(x: number, z: number): number {
  const base = smoothstep(0.1, 0.42, fbm(x * 0.011 + 40, z * 0.011 - 20, 3));
  const clear =
    smoothstep(18, 40, Math.hypot(x - PIT_X, z)) *
    smoothstep(14, 32, Math.hypot(x - TOWER.planX, z - TOWER.planZ)) *
    smoothstep(16, 34, Math.hypot(x - HOUSE.planX, z - HOUSE.planZ));
  return base * clear;
}
