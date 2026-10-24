import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '@onigam/lab-kit/three';
import { CATCHMENT as C } from '../dims';
import { BEND_X, OUT_X, SLAB_R, SPRING_X, groundY } from './layout';
import { surfaceY } from './ground';

// A little vegetation on the block: tufts of grass and a few young conifers at the back (north side), instanced.

const flat = (g: THREE.BufferGeometry): THREE.BufferGeometry => (g.index ? g.toNonIndexed() : g);

function tuft(seed: number): THREE.BufferGeometry {
  const r = rng(seed);
  const pos: number[] = [];
  const col: number[] = [];
  for (let b = 0; b < 9; b++) {
    const a = r() * Math.PI * 2;
    const lean = 0.2 + r() * 0.5;
    const h = 0.6 + r() * 0.4;
    const w = 0.045;
    const ox = Math.cos(a) * 0.08;
    const oz = Math.sin(a) * 0.08;
    const tx = ox + Math.cos(a) * lean * h;
    const tz = oz + Math.sin(a) * lean * h;
    const px = -Math.sin(a) * w;
    const pz = Math.cos(a) * w;
    pos.push(ox - px, 0, oz - pz, ox + px, 0, oz + pz, tx, h, tz);
    col.push(0.35, 0.4, 0.25, 0.35, 0.4, 0.25, 1, 1, 0.9);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

function conifer(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const add = (r: number, h: number, y: number) => {
    const c = new THREE.ConeGeometry(r, h, 7, 1);
    c.translate(0, y + h / 2, 0);
    parts.push(c);
  };
  add(2.3, 4.4, 1.8);
  add(1.8, 3.8, 3.8);
  add(1.2, 3.2, 5.9);
  return mergeGeometries(parts.map(flat))!;
}

export function buildVegetation(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'vegetation';
  const R = rng(5);
  // tufts, kept away from the parts and the pipes
  const keep = (x: number, z: number): boolean => {
    if (Math.hypot(x - SPRING_X, z * 0.7) < 2.1 && Math.abs(x - SPRING_X) < 2.6) return false; // spring box and bed
    if (x > -2.5 && x < -1.4) return false; // the scarp: rocks
    if (Math.hypot(x, z) < SLAB_R + 0.4) return false; // the tank
    if (x > OUT_X - 0.2 && Math.abs(z) < 0.7) return false; // drive pipe and its saddles
    if (x > -0.5 && Math.abs(z - C.gutterZ) < 0.6 && x < C.blockEast) return false; // the ditch and the pipes to it
    if (x < SPRING_X - 2 && Math.abs(z) < 3.8) return false; // the outcrop
    if (x > BEND_X - 0.1) return false; // bare slope
    return true;
  };
  const tufts: { x: number; z: number; s: number; r: number }[] = [];
  for (let k = 0; k < 4000 && tufts.length < 190; k++) {
    const x = -C.blockWest + 0.3 + R() * (C.blockWest + C.blockEast - 0.6);
    const z = (R() - 0.5) * 2 * (C.blockHalfWidth - 0.3);
    if (keep(x, z)) tufts.push({ x, z, s: 0.1 + R() * 0.14, r: R() * 6.28 });
  }
  const inst = new THREE.InstancedMesh(
    tuft(3),
    new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.85 }),
    tufts.length,
  );
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const pal = [0x6f8f35, 0x5c7a2c, 0x86a043, 0x7a8a3a].map((h) => new THREE.Color(h));
  tufts.forEach((t, i) => {
    q.setFromAxisAngle(up, t.r);
    m4.compose(
      new THREE.Vector3(t.x, surfaceY(t.x, t.z) - 0.01, t.z),
      q,
      new THREE.Vector3(t.s, t.s * (0.8 + R() * 0.6), t.s),
    );
    inst.setMatrixAt(i, m4);
    inst.setColorAt(i, pal[Math.floor(R() * pal.length)]);
  });
  inst.receiveShadow = true;
  inst.castShadow = false;
  inst.userData.noShadow = true;
  group.add(inst);
  // a few young conifers at the back of the upland and of the bench
  const spots: [number, number, number][] = [
    [-6.8, -3.6, 0.42],
    [-5.2, -4.1, 0.36],
    [-3.4, -3.9, 0.4],
    [1.6, -3.7, 0.38],
    [-7.0, 3.5, 0.34],
  ];
  const trees = new THREE.InstancedMesh(
    conifer(),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true }),
    spots.length,
  );
  const trunk = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.22, 0.34, 3.4, 6).translate(0, 1.7, 0),
    new THREE.MeshStandardMaterial({ color: 0x5b4331, roughness: 0.95, flatShading: true }),
    spots.length,
  );
  const green = [0x37603a, 0x3f6a3c, 0x2f5436, 0x46703f];
  const colour = new THREE.Color();
  spots.forEach(([x, z, s], i) => {
    q.setFromAxisAngle(up, R() * 6.28);
    m4.compose(new THREE.Vector3(x, groundY(x, z) - 0.1, z), q, new THREE.Vector3(s, s, s));
    trees.setMatrixAt(i, m4);
    trunk.setMatrixAt(i, m4);
    trees.setColorAt(i, colour.setHex(green[i % green.length]));
  });
  for (const m of [trees, trunk]) {
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  }
  return group;
}
