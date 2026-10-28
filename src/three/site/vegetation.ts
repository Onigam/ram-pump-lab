import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '@onigam/lab-kit/three';
import { HOUSE, TOWER } from '../dims';
import { PIT_X, routePlan } from './layout';
import { forestMask, type Terrain } from './terrain';
import { fbm } from './noise';

// Instanced low-poly trees (conifers and broadleaves) on the hillside, none on the route, the pipes, the pads and the
// steep ground. The forest is cut into square tiles of `TILE` metres, each with its own instanced meshes (trunks, conifers,
// broadleaves), so that the renderer culls the tiles outside the view. Positions are fixed, only the height of each tree
// follows the terrain when it moves. Faces nobody can see (the base and top of a trunk, the parts of a blob buried in its
// neighbours) are not built.
//
// The sun's shadow map is drawn from other, much coarser meshes: a crown casts the same shadow whether it is a stack of three
// cones or one cone, at a texel of 12 cm or more, and the shadow pass would otherwise draw every crown in the sun's box again.
// Those meshes (`shadowCasters`) share the matrices of the crowns, are never drawn in the colour pass (see `onlyInShadow`),
// and the crowns themselves cast nothing. Trunks cast nothing either: their shadow is a thread under the shadow of the crown.

interface Tree {
  x: number;
  z: number;
  scale: number;
  rot: number;
  kind: 0 | 1;
  colour?: THREE.Color;
}

/** Side of a tile of the forest, metres. */
const TILE = 150;

/** True for the frustum of an orthographic camera (the sun's shadow box): its left and right planes are parallel. */
const isOrthographic = (f: THREE.Frustum): boolean => f.planes[0].normal.dot(f.planes[1].normal) < -0.999;

const flat = (g: THREE.BufferGeometry): THREE.BufferGeometry => (g.index ? g.toNonIndexed() : g);

function coneStack(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const add = (r: number, h: number, y: number) => {
    const c = new THREE.ConeGeometry(r, h, 8, 1);
    c.translate(0, y + h / 2, 0);
    parts.push(c);
  };
  add(2.3, 4.4, 1.8);
  add(1.8, 3.8, 3.8);
  add(1.2, 3.2, 5.9);
  return mergeGeometries(parts.map(flat))!;
}

function blobs(): THREE.BufferGeometry {
  const spec: [number, number, number, number][] = [
    [2.6, 0, 5.4, 0],
    [2.0, 1.4, 4.6, 0.6],
    [1.9, -1.2, 4.3, -0.8],
    [1.7, 0.2, 7.0, 0.4],
  ];
  // the inscribed sphere of an icosahedron (detail 0) has 0.7947 of its radius: a point inside it is inside the solid
  const inner = 0.7947;
  const p = new THREE.Vector3();
  const parts: THREE.BufferGeometry[] = [];
  spec.forEach(([r, x, y, z], i) => {
    const s = flat(new THREE.IcosahedronGeometry(r, 0));
    s.translate(x, y, z);
    const pos = s.attributes.position;
    const keep: number[] = [];
    for (let t = 0; t < pos.count; t += 3) {
      // a face with its three corners inside another blob is buried in it
      const buried = spec.some(([r2, x2, y2, z2], j) => {
        if (j === i) return false;
        for (let k = 0; k < 3; k++) {
          p.fromBufferAttribute(pos, t + k);
          if (Math.hypot(p.x - x2, p.y - y2, p.z - z2) >= r2 * inner) return false;
        }
        return true;
      });
      if (!buried) keep.push(t, t + 1, t + 2);
    }
    const out = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'uv']) {
      const a = s.attributes[name];
      const arr = new Float32Array(keep.length * a.itemSize);
      keep.forEach((v, n) => {
        for (let c = 0; c < a.itemSize; c++) arr[n * a.itemSize + c] = a.array[v * a.itemSize + c];
      });
      out.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize));
    }
    parts.push(out);
  });
  return mergeGeometries(parts)!;
}

export interface Vegetation {
  group: THREE.Group;
  /** Put every tree back on the terrain after it moved. */
  relevel(): void;
}

export function buildVegetation(terrain: Terrain): Vegetation {
  const rand = rng(20240519);
  // exclusion grid of the delivery route and the drive pipe
  const plan = routePlan();
  const cell = 8;
  const grid = new Map<string, { x: number; z: number }[]>();
  const put = (x: number, z: number) => {
    const key = `${Math.floor(x / cell)},${Math.floor(z / cell)}`;
    const list = grid.get(key) ?? [];
    list.push({ x, z });
    grid.set(key, list);
  };
  for (const p of plan) put(p.x, p.z);
  const nearRoute = (x: number, z: number, r: number): boolean => {
    const cx = Math.floor(x / cell);
    const cz = Math.floor(z / cell);
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        for (const p of grid.get(`${cx + i},${cz + j}`) ?? []) if (Math.hypot(p.x - x, p.z - z) < r) return true;
      }
    }
    return false;
  };

  const trees: Tree[] = [];
  const step = 5.2;
  for (let x = -135; x < 235; x += step) {
    for (let z = -295; z < 120; z += step) {
      const px = x + (rand() - 0.5) * step * 0.9;
      const pz = z + (rand() - 0.5) * step * 0.9;
      const f = forestMask(px, pz);
      const meadowTree = rand() < 0.02 * (1 - f);
      if (!(rand() < Math.pow(f, 1.2) * 0.95) && !meadowTree) continue;
      if (nearRoute(px, pz, 5.5)) continue;
      // the pasture along the drive pipe, wide enough for the spring and the tank wherever the sliders put them
      if (Math.abs(pz) < 14 && px > -80 && px < PIT_X + 14) continue;
      if (Math.hypot(px - TOWER.planX, pz - TOWER.planZ) < 16) continue;
      if (Math.hypot(px - HOUSE.planX, pz - HOUSE.planZ) < 18) continue;
      if (terrain.slopeAt(px, pz) > 0.22) continue;
      const kind: 0 | 1 = fbm(px * 0.02, pz * 0.02, 2) > 0.1 ? 0 : 1;
      trees.push({ x: px, z: pz, scale: 0.55 + rand() * 0.6, rot: rand() * Math.PI * 2, kind });
    }
  }

  // open ended: its foot is in the ground and its top is inside the crown
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 3.4, 6, 1, true);
  trunkGeo.translate(0, 1.7, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5b4331, roughness: 0.95, flatShading: true });
  const coniferMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
  const coneGeo = coneStack();
  const blobGeo = blobs();
  const conCols = [0x37603a, 0x3f6a3c, 0x2f5436, 0x46703f];
  const leafCols = [0x587f34, 0x4f7a34, 0x6a9640, 0x74913c, 0x8a9a3a];
  // the colour of each tree is drawn in tree order, as it always was: the forest looks the same
  for (const t of trees) {
    const cols = t.kind === 0 ? conCols : leafCols;
    t.colour = new THREE.Color().setHex(cols[Math.floor(rand() * cols.length)]).multiplyScalar(0.85 + rand() * 0.3);
  }

  // what the sun's shadow map sees of a crown: a cone for a conifer, an ellipsoid for a broadleaf (see the header)
  const coneShadowGeo = new THREE.ConeGeometry(2.2, 7.3, 8, 1);
  coneShadowGeo.translate(0, 1.8 + 3.65, 0);
  blobGeo.computeBoundingBox();
  const box = blobGeo.boundingBox!;
  const blobShadowGeo = new THREE.IcosahedronGeometry(1, 0);
  const half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5 * 0.92);
  blobShadowGeo.scale(half.x, half.y, half.z);
  const middle = box.getCenter(new THREE.Vector3());
  blobShadowGeo.translate(middle.x, middle.y, middle.z);
  // never seen: should the renderer ever draw these in the colour pass, they draw nothing (the shadow pass has its own materials)
  const shadowMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false });

  interface Tile {
    trees: Tree[];
    trunks: THREE.InstancedMesh;
    cones?: THREE.InstancedMesh;
    leaves?: THREE.InstancedMesh;
    /** Same matrices as the crowns, coarse geometry, drawn in the shadow pass only. */
    shadowCasters: THREE.InstancedMesh[];
  }
  const byTile = new Map<string, Tree[]>();
  trees.forEach((t) => {
    const key = `${Math.floor(t.x / TILE)},${Math.floor(t.z / TILE)}`;
    const list = byTile.get(key);
    if (list) list.push(t);
    else byTile.set(key, [t]);
  });
  const group = new THREE.Group();
  group.name = 'vegetation';
  const tiles: Tile[] = [];
  const instanced = (name: string, geo: THREE.BufferGeometry, mat: THREE.Material, n: number) => {
    const m = new THREE.InstancedMesh(geo, mat, n);
    m.name = name;
    // the shadow comes from the coarse meshes (below), never from the meshes that are seen
    m.castShadow = false;
    m.receiveShadow = true;
    // culled by tile (`relevel` refreshes the bounding sphere)
    m.frustumCulled = true;
    group.add(m);
    return m;
  };
  /** A coarse mesh with the matrices of `crowns` that is drawn in the sun's shadow pass and never in the colour pass. */
  const shadowCaster = (crowns: THREE.InstancedMesh, geo: THREE.BufferGeometry): THREE.InstancedMesh => {
    const m = new THREE.InstancedMesh(geo, shadowMat, crowns.count);
    m.name = `${crowns.name} (shadow)`;
    m.instanceMatrix = crowns.instanceMatrix;
    m.castShadow = true;
    m.receiveShadow = false;
    m.intersectsFrustum = function (frustum: THREE.Frustum): boolean {
      // the colour pass looks through a perspective camera, the sun through an orthographic box: only the second one sees it
      return isOrthographic(frustum) && frustum.intersectsObject(this);
    };
    group.add(m);
    return m;
  };
  for (const [key, list] of byTile) {
    const nCon = list.filter((t) => t.kind === 0).length;
    const tile: Tile = {
      trees: list,
      trunks: instanced(`trunks ${key}`, trunkGeo, trunkMat, list.length),
      shadowCasters: [],
    };
    tile.trunks.castShadow = false;
    if (nCon > 0) {
      tile.cones = instanced(`conifers ${key}`, coneGeo, coniferMat, nCon);
      tile.shadowCasters.push(shadowCaster(tile.cones, coneShadowGeo));
    }
    if (list.length > nCon) {
      tile.leaves = instanced(`broadleaves ${key}`, blobGeo, leafMat, list.length - nCon);
      tile.shadowCasters.push(shadowCaster(tile.leaves, blobShadowGeo));
    }
    let a = 0;
    let b = 0;
    list.forEach((t) => {
      if (t.kind === 0) tile.cones!.setColorAt(a++, t.colour!);
      else tile.leaves!.setColorAt(b++, t.colour!);
    });
    tiles.push(tile);
  }

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const pos = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const relevel = () => {
    for (const tile of tiles) {
      let a = 0;
      let b = 0;
      tile.trees.forEach((t, i) => {
        const y = terrain.surfaceY(t.x, t.z) - 0.25;
        q.setFromAxisAngle(up, t.rot);
        pos.set(t.x, y, t.z);
        sc.setScalar(t.scale);
        m4.compose(pos, q, sc);
        tile.trunks.setMatrixAt(i, m4);
        if (t.kind === 0) tile.cones!.setMatrixAt(a++, m4);
        else tile.leaves!.setMatrixAt(b++, m4);
      });
      for (const m of [tile.trunks, tile.cones, tile.leaves, ...tile.shadowCasters]) {
        if (!m) continue;
        m.instanceMatrix.needsUpdate = true;
        m.computeBoundingSphere();
      }
    }
  };
  relevel();

  return { group, relevel };
}
