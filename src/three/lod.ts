import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MERGE, bakedGeometry, colourMaterial, materialSignature, shapeKey } from './merge';

// A coarse copy of a model for the distance. The site shows the ram in its pit: 60 000 triangles of bolts, threads and
// turned bodies that cover a handful of pixels from the default view, and again in the shadow map. `farCopy` bakes the model in
// its present pose, welds the vertices that lie in the same cell of a grid (vertex clustering) and merges what is left by
// material. Used as the far level of a `THREE.LOD` (the detailed model is the near level), whose switch distance puts the
// size of a cell under a pixel.

/**
 * Weld the vertices of an indexed geometry (position, normal, optional uv) that fall in the same cube of side `cell`, and
 * drop the triangles that collapse. Returns null when nothing is left. Normals are averaged, so hard edges soften: fine from
 * a distance at which a cell is under a pixel.
 */
export function decimate(g: THREE.BufferGeometry, cell: number): THREE.BufferGeometry | null {
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const uv = g.attributes.uv;
  const index = g.index!;
  const ids = new Map<string, number>();
  const map = new Int32Array(pos.count);
  const sum: number[] = [];
  for (let v = 0; v < pos.count; v++) {
    const key = `${Math.floor(pos.getX(v) / cell)},${Math.floor(pos.getY(v) / cell)},${Math.floor(pos.getZ(v) / cell)}`;
    let id = ids.get(key);
    if (id === undefined) {
      id = ids.size;
      ids.set(key, id);
      sum.push(0, 0, 0, 0, 0, 0, 0, 0, 0);
    }
    map[v] = id;
    const o = id * 9;
    sum[o] += pos.getX(v);
    sum[o + 1] += pos.getY(v);
    sum[o + 2] += pos.getZ(v);
    sum[o + 3] += nor.getX(v);
    sum[o + 4] += nor.getY(v);
    sum[o + 5] += nor.getZ(v);
    if (uv) {
      sum[o + 6] += uv.getX(v);
      sum[o + 7] += uv.getY(v);
    }
    sum[o + 8]++;
  }
  const kept: number[] = [];
  const seen = new Set<string>();
  for (let t = 0; t < index.count; t += 3) {
    const a = map[index.getX(t)];
    const b = map[index.getX(t + 1)];
    const c = map[index.getX(t + 2)];
    if (a === b || b === c || a === c) continue;
    // a closed shape welded flat leaves two copies of the same triangle: keep one
    const lo = Math.min(a, b, c);
    const hi = Math.max(a, b, c);
    const cyclic = (a < b && b < c) || (b < c && c < a) || (c < a && a < b);
    const key = `${lo},${a + b + c - lo - hi},${hi},${cyclic}`;
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(a, b, c);
  }
  if (kept.length === 0) return null;
  // only the vertices that are used, renumbered
  const renumber = new Map<number, number>();
  const used: number[] = [];
  const index2 = kept.map((id) => {
    let n = renumber.get(id);
    if (n === undefined) {
      n = used.length;
      renumber.set(id, n);
      used.push(id);
    }
    return n;
  });
  const p = new Float32Array(used.length * 3);
  const n = new Float32Array(used.length * 3);
  const u = uv ? new Float32Array(used.length * 2) : null;
  used.forEach((id, i) => {
    const o = id * 9;
    const k = sum[o + 8];
    p[i * 3] = sum[o] / k;
    p[i * 3 + 1] = sum[o + 1] / k;
    p[i * 3 + 2] = sum[o + 2] / k;
    const l = Math.hypot(sum[o + 3], sum[o + 4], sum[o + 5]);
    n[i * 3] = l > 1e-9 ? sum[o + 3] / l : 0;
    n[i * 3 + 1] = l > 1e-9 ? sum[o + 4] / l : 1;
    n[i * 3 + 2] = l > 1e-9 ? sum[o + 5] / l : 0;
    if (u) {
      u[i * 2] = sum[o + 6] / k;
      u[i * 2 + 1] = sum[o + 7] / k;
    }
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(p, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(n, 3));
  if (u) out.setAttribute('uv', new THREE.BufferAttribute(u, 2));
  out.setIndex(index2);
  return out;
}

export interface FarOptions {
  /** Side of the welding cube, metres. */
  cell: number;
  /** Meshes whose bounding sphere is smaller than this after welding are left out, metres. */
  minRadius: number;
  /** Copy the transparent meshes (the water) instead of the opaque ones. */
  transparent?: boolean;
}

/**
 * The coarse copy of every visible mesh under `source`, in the frame of `source`, as it stands now (frames that move are frozen
 * in their present pose). Materials are shared with the original, so whatever the original does to them follows. Opaque meshes
 * that differ only by their colour are merged under one material with vertex colours; transparent ones stay apart (their order
 * matters).
 */
export function farCopy(source: THREE.Object3D, opts: FarOptions): THREE.Group {
  const out = new THREE.Group();
  out.name = `${source.name || 'model'}-far`;
  if (!MERGE.enabled) return out;
  source.updateWorldMatrix(true, true);
  const inverse = new THREE.Matrix4().copy(source.matrixWorld).invert();
  const rel = new THREE.Matrix4();
  const wantTransparent = opts.transparent === true;

  const sources: THREE.Mesh[] = [];
  source.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || (m as THREE.InstancedMesh).isInstancedMesh || Array.isArray(m.material) || m.userData.cap) return;
    for (let a: THREE.Object3D | null = m; a && a !== source.parent; a = a.parent) if (!a.visible) return;
    const mat = m.material as THREE.Material;
    if (
      mat.transparent !== wantTransparent ||
      ((mat as THREE.MeshStandardMaterial).vertexColors && !mat.userData.baked)
    )
      return;
    if (!m.geometry.attributes.position) return;
    sources.push(m);
  });
  const uv = sources.some((m) => m.geometry.attributes.uv);
  const buckets = new Map<string, { first: THREE.Mesh; geos: THREE.BufferGeometry[]; shape?: string }>();
  for (const m of sources) {
    const mat = m.material as THREE.MeshStandardMaterial;
    const shape = wantTransparent ? undefined : shapeKey(mat);
    const baked = bakedGeometry(
      m.geometry,
      uv,
      rel.multiplyMatrices(inverse, m.matrixWorld),
      shape ? mat.color : undefined,
    );
    const coarse = decimate(baked, opts.cell);
    baked.dispose();
    if (!coarse) continue;
    coarse.computeBoundingSphere();
    if (coarse.boundingSphere!.radius < opts.minRadius) continue;
    if (wantTransparent) {
      const c = new THREE.Mesh(coarse, m.material);
      c.renderOrder = m.renderOrder;
      c.castShadow = false;
      c.receiveShadow = false;
      c.userData.noShadow = true;
      out.add(c);
      continue;
    }
    const key = [
      shape ? `colour ${shape}` : (materialSignature(mat) ?? mat.uuid),
      m.castShadow,
      m.receiveShadow,
      m.userData.noShadow === true,
    ].join('#');
    const b = buckets.get(key);
    if (b) b.geos.push(coarse);
    else buckets.set(key, { first: m, geos: [coarse], shape });
  }
  for (const { first, geos, shape } of buckets.values()) {
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (!merged) continue;
    const c = new THREE.Mesh(merged, shape ? colourMaterial(shape, first.material as THREE.Material) : first.material);
    c.castShadow = first.castShadow;
    c.receiveShadow = first.receiveShadow;
    if (first.userData.noShadow) c.userData.noShadow = true;
    out.add(c);
  }
  return out;
}
