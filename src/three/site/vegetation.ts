import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '@onigam/lab-kit/three';
import { HOUSE, TOWER } from '../dims';
import { PIT_X, routePlan } from './layout';
import { forestMask, type Terrain } from './terrain';
import { fbm } from './noise';

// Instanced low-poly trees (conifers and broadleaves) on the hillside, none on the route, the pipes, the pads and the
// steep ground. Three draw calls; positions are fixed, only their height follows the terrain when it moves.

interface Tree {
  x: number;
  z: number;
  scale: number;
  rot: number;
  kind: 0 | 1;
}

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
  const parts: THREE.BufferGeometry[] = [];
  const add = (r: number, x: number, y: number, z: number) => {
    const s = new THREE.IcosahedronGeometry(r, 0);
    s.translate(x, y, z);
    parts.push(flat(s));
  };
  add(2.6, 0, 5.4, 0);
  add(2.0, 1.4, 4.6, 0.6);
  add(1.9, -1.2, 4.3, -0.8);
  add(1.7, 0.2, 7.0, 0.4);
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

  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 3.4, 6);
  trunkGeo.translate(0, 1.7, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5b4331, roughness: 0.95, flatShading: true });
  const coniferMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
  const nCon = trees.filter((t) => t.kind === 0).length;
  const nLeaf = trees.length - nCon;
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, trees.length);
  const cones = new THREE.InstancedMesh(coneStack(), coniferMat, Math.max(1, nCon));
  const leaves = new THREE.InstancedMesh(blobs(), leafMat, Math.max(1, nLeaf));
  for (const m of [trunks, cones, leaves]) {
    m.castShadow = true;
    m.receiveShadow = true;
    m.frustumCulled = false;
  }
  const conCols = [0x37603a, 0x3f6a3c, 0x2f5436, 0x46703f];
  const leafCols = [0x587f34, 0x4f7a34, 0x6a9640, 0x74913c, 0x8a9a3a];
  const colour = new THREE.Color();
  let ci = 0;
  let li = 0;
  trees.forEach((t) => {
    if (t.kind === 0)
      cones.setColorAt(
        ci++,
        colour.setHex(conCols[Math.floor(rand() * conCols.length)]).multiplyScalar(0.85 + rand() * 0.3),
      );
    else
      leaves.setColorAt(
        li++,
        colour.setHex(leafCols[Math.floor(rand() * leafCols.length)]).multiplyScalar(0.85 + rand() * 0.3),
      );
  });

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const pos = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const relevel = () => {
    let a = 0;
    let b = 0;
    trees.forEach((t, i) => {
      const y = terrain.surfaceY(t.x, t.z) - 0.25;
      q.setFromAxisAngle(up, t.rot);
      pos.set(t.x, y, t.z);
      sc.setScalar(t.scale);
      m4.compose(pos, q, sc);
      trunks.setMatrixAt(i, m4);
      if (t.kind === 0) cones.setMatrixAt(a++, m4);
      else leaves.setMatrixAt(b++, m4);
    });
    trunks.instanceMatrix.needsUpdate = true;
    cones.instanceMatrix.needsUpdate = true;
    leaves.instanceMatrix.needsUpdate = true;
  };
  relevel();
  const group = new THREE.Group();
  group.name = 'vegetation';
  group.add(trunks, cones, leaves);
  return { group, relevel };
}
