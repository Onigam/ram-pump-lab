import type { SceneModule } from '@onigam/lab-kit/three';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { RamState } from '../sim/types';
import { createCatchmentScene } from './catchment/scene';
import { MERGE, materialSignature, mergeStatic, shapeKey } from './merge';
import { createRamScene } from './ram/scene';
import { createSiteScene } from './site/scene';
import { runningState, stalledState, view } from './test-utils';
import { createValveScene } from './valve';

// Merging must change the number of draw calls and nothing else. Each world is built twice, with merging off and on, driven
// through the same states, and every triangle of every mesh that is not instanced is compared in world space (its centre
// quantised to a tenth of a millimetre, with the look of its material and its shadow flags). A node that moves at run time
// and is not flagged `dynamic` shows up here as triangles in the wrong place.

type Print = Map<string, { n: number; hash: number }>;

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
/** How a material looks apart from its colour (merged meshes may share one material with vertex colours). */
const look = (m: THREE.Material): string => {
  const s = m as THREE.MeshStandardMaterial;
  // textures are different objects in each build: their identity is not part of the look
  const shape = shapeKey(m);
  const text = shape
    ? `shape ${shape}`
    : (materialSignature(m) ??
      [m.type, s.color?.getHex(), s.roughness, s.metalness, m.opacity, m.transparent, m.side, s.wireframe].join('|'));
  return text.replace(UUID, 'texture');
};

function fingerprint(mod: SceneModule<RamState>): Print {
  mod.scene.updateMatrixWorld(true);
  const out: Print = new Map();
  const p = new THREE.Vector3();
  mod.scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || (m as THREE.InstancedMesh).isInstancedMesh || m.name === 'terrain' || m.name === 'sky') return;
    // hidden by its own flag or by an ancestor, or a coarse copy for the distance (lod.ts), which the plain build has not
    for (let a: THREE.Object3D | null = m; a; a = a.parent) if (!a.visible || a.name.endsWith('-far')) return;
    const g = m.geometry;
    const pos = g.attributes.position;
    const idx = g.index;
    const count = (idx ? idx.count : pos.count) / 3;
    const mat = m.material as THREE.MeshStandardMaterial;
    const key = `${look(mat)}|${m.castShadow}|${m.receiveShadow}`;
    const colours = g.attributes.color;
    const tint = shapeKey(mat) !== undefined && !colours ? mat.color : null;
    let e = out.get(key);
    if (!e) out.set(key, (e = { n: 0, hash: 0 }));
    for (let t = 0; t < count; t++) {
      let x = 0;
      let y = 0;
      let z = 0;
      for (let k = 0; k < 3; k++) {
        const v = idx ? idx.getX(t * 3 + k) : t * 3 + k;
        p.fromBufferAttribute(pos, v).applyMatrix4(m.matrixWorld);
        x += p.x;
        y += p.y;
        z += p.z;
      }
      // the colour of the triangle: from the vertices of a baked mesh, from the material of the others
      let cr = 0;
      let cg = 0;
      let cb = 0;
      if (colours) {
        const v0 = idx ? idx.getX(t * 3) : t * 3;
        cr = colours.getX(v0);
        cg = colours.getY(v0);
        cb = colours.getZ(v0);
      } else if (tint) {
        cr = tint.r;
        cg = tint.g;
        cb = tint.b;
      }
      const qc = Math.round(cr * 255) * 65536 + Math.round(cg * 255) * 256 + Math.round(cb * 255);
      const qx = Math.round((x / 3) * 1e4);
      const qy = Math.round((y / 3) * 1e4);
      const qz = Math.round((z / 3) * 1e4);
      // an order-free sum of integer hashes
      e.hash =
        (e.hash +
          (Math.imul(qx, 73856093) ^ Math.imul(qy, 19349663) ^ Math.imul(qz, 83492791) ^ Math.imul(qc, 2654435761))) |
        0;
      e.n++;
    }
  });
  return out;
}

const countMeshes = (mod: SceneModule<RamState>): number => {
  let n = 0;
  mod.scene.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) n++;
  });
  return n;
};

/** Drive a world through rest, running, slow motion, the section, an explode, a hidden part, a stalled ram and new sliders. */
function run(make: () => SceneModule<RamState>, enabled: boolean): { prints: Print[]; meshes: number } {
  MERGE.enabled = enabled;
  try {
    const mod = make();
    const reg = mod.registry;
    const prints: Print[] = [];
    const frames = (state: RamState, n: number, v = view()) => {
      for (let i = 0; i < n; i++) mod.update(state, 1 / 60, { ...v, time: v.time + i / 60 });
      prints.push(fingerprint(mod));
    };
    const running = runningState();
    frames(running, 1);
    frames(running, 40);
    frames(running, 20, view({ schematic: true, slowMo: 0.1 }));
    frames(running, 5, view({ cutaway: true }));
    reg.setAllFactors(0.7);
    frames(running, 5);
    reg.setAllFactors(0);
    frames(running, 5);
    const first = reg.ids()[0];
    reg.setDisplay(first, 'hidden');
    frames(running, 5);
    reg.setDisplay(first, 'solid');
    frames(stalledState(), 30);
    // the sliders of the site: the landscape is laid again (fall, drive length, delivery head)
    frames({ ...running, fall: 9.5, driveLength: 28, deliveryHead: 72, driveDiameter: 32 }, 40);
    return { prints, meshes: countMeshes(mod) };
  } finally {
    MERGE.enabled = true;
  }
}

const WORLDS: [string, () => SceneModule<RamState>, boolean][] = [
  ['ram', () => createRamScene(), true],
  ['valve', () => createValveScene(), false],
  ['catchment', () => createCatchmentScene(), true],
  ['site', () => createSiteScene(), true],
];

describe('merging static meshes', () => {
  for (const [name, make, merges] of WORLDS) {
    it(`${name}: the same triangles in the same places in every state`, () => {
      const plain = run(make, false);
      const merged = run(make, true);
      expect(merged.prints).toHaveLength(plain.prints.length);
      merged.prints.forEach((print, i) => {
        expect([...print.keys()].sort(), `state ${i}`).toEqual([...plain.prints[i].keys()].sort());
        for (const [key, e] of print) expect(e, `state ${i} ${key}`).toEqual(plain.prints[i].get(key));
      });
      if (merges) expect(merged.meshes).toBeLessThan(plain.meshes * 0.8);
    }, 60000);
  }

  it('leaves dynamic nodes, caps, transparent meshes and registered meshes alone', () => {
    const root = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x884422 });
    const box = () => new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
    const a = box();
    const b = box();
    b.position.x = 2;
    const moving = new THREE.Group();
    moving.userData.dynamic = true;
    moving.add(box(), box());
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x884422, transparent: true, opacity: 0.5 }),
    );
    const cap = box();
    cap.userData.cap = true;
    root.add(a, b, moving, glass, cap);
    const r = mergeStatic(root);
    expect(r).toEqual({ removed: 2, created: 1 });
    expect(moving.children).toHaveLength(2);
    expect(root.children).toContain(glass);
    expect(root.children).toContain(cap);
    const merged = root.children.find((c) => c.userData.merged) as THREE.Mesh;
    merged.geometry.computeBoundingBox();
    expect(merged.geometry.boundingBox!.min.x).toBeCloseTo(-0.5);
    expect(merged.geometry.boundingBox!.max.x).toBeCloseTo(2.5);
  });

  it('bakes the transform of each mesh relative to the merged root, mirrored ones included', () => {
    const root = new THREE.Group();
    root.position.set(5, 0, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x336699 });
    const tri = () =>
      new THREE.Mesh(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(1, 0, 0),
          new THREE.Vector3(0, 1, 0),
        ]),
        mat,
      );
    const a = tri();
    a.geometry.computeVertexNormals();
    const b = tri();
    b.geometry.computeVertexNormals();
    b.scale.x = -1;
    b.position.y = 3;
    root.add(a, b);
    root.updateMatrixWorld(true);
    mergeStatic(root);
    const merged = root.children[0] as THREE.Mesh;
    expect(root.children).toHaveLength(1);
    const pos = merged.geometry.attributes.position;
    const xs = Array.from({ length: pos.count }, (_, i) => pos.getX(i)).sort((p, q) => p - q);
    // the root's own position is not baked in; the mirrored triangle spans x in [-1, 0]
    expect(xs[0]).toBeCloseTo(-1);
    expect(xs[xs.length - 1]).toBeCloseTo(1);
    // winding flipped with the mirror: both faces look towards +z
    merged.geometry.computeBoundingBox();
    const n = merged.geometry.attributes.normal;
    const idx = merged.geometry.index!;
    for (let t = 0; t < idx.count; t += 3) {
      const [i, j, k] = [idx.getX(t), idx.getX(t + 1), idx.getX(t + 2)];
      const e1 = new THREE.Vector3(pos.getX(j) - pos.getX(i), pos.getY(j) - pos.getY(i), pos.getZ(j) - pos.getZ(i));
      const e2 = new THREE.Vector3(pos.getX(k) - pos.getX(i), pos.getY(k) - pos.getY(i), pos.getZ(k) - pos.getZ(i));
      expect(e1.cross(e2).z).toBeGreaterThan(0);
      expect(n.getZ(i)).toBeGreaterThan(0);
    }
  });
});
