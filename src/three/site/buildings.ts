import * as THREE from 'three';
import { MAT, glass, group, mesh } from '@onigam/lab-kit/three';
import { HOUSE, TOWER } from '../dims';
import { noShadow, waterMaterial } from '../common';
import { mergeStatic } from '../merge';

// The house and the water tower. Each is built in its own frame (origin on the ground under its centre, +Z towards the
// camera of the home view) and placed by the scene. Dimensions come from dims.ts.

// ------------------------------------------------------------------------------------------------ house

export function buildHouse(): THREE.Group {
  const g = group('house');
  const L = HOUSE.length;
  const W = HOUSE.width;
  const Hh = HOUSE.wallHeight;
  const rise = HOUSE.ridgeRise;
  const walls = MAT.stone();
  const roofMat = MAT.slate();
  const wood = MAT.woodDark();
  const rend = MAT.enclosureGrey();

  // foundation and walls
  g.add(mesh(new THREE.BoxGeometry(L + 0.4, 0.3, W + 0.4), MAT.concrete(), [0, 0.15 - 0.1, 0]));
  g.add(mesh(new THREE.BoxGeometry(L, Hh, W), walls, [0, 0.2 + Hh / 2, 0]));
  // gable ends: triangles of the same stone
  const gable = new THREE.Shape();
  gable.moveTo(-W / 2, 0);
  gable.lineTo(W / 2, 0);
  gable.lineTo(0, rise);
  gable.closePath();
  for (const sx of [-1, 1]) {
    const gm = mesh(new THREE.ExtrudeGeometry(gable, { depth: 0.04, bevelEnabled: false }), walls);
    gm.rotation.y = Math.PI / 2;
    gm.position.set(sx * (L / 2 - 0.02), 0.2 + Hh, 0);
    g.add(gm);
  }
  // roof: two slate slabs with an overhang
  const slope = Math.atan2(rise, W / 2);
  const slabLen = Math.hypot(W / 2, rise) + 0.45;
  for (const sz of [-1, 1]) {
    const slab = mesh(new THREE.BoxGeometry(L + 0.8, 0.1, slabLen), roofMat);
    slab.position.set(0, 0.2 + Hh + rise / 2 - 0.02, (sz * W) / 4 - sz * 0.1);
    slab.rotation.x = sz * slope;
    g.add(slab);
  }
  g.add(mesh(new THREE.BoxGeometry(L + 0.8, 0.12, 0.22), MAT.concrete(), [0, 0.2 + Hh + rise + 0.03, 0]));
  // chimney
  g.add(mesh(new THREE.BoxGeometry(0.7, 1.7, 0.7), walls, [L / 2 - 1.8, 0.2 + Hh + rise * 0.8, -W / 4]));
  g.add(
    mesh(new THREE.BoxGeometry(0.85, 0.12, 0.85), MAT.concrete(), [L / 2 - 1.8, 0.2 + Hh + rise * 0.8 + 0.9, -W / 4]),
  );
  // windows and the door on the south face
  const frame = MAT.woodLight();
  const pane = glass(0.5);
  const window = (x: number, y: number, w: number, h: number, zFace: number, dirZ: number) => {
    g.add(mesh(new THREE.BoxGeometry(w + 0.16, h + 0.16, 0.08), frame, [x, y, zFace + dirZ * 0.02]));
    g.add(mesh(new THREE.BoxGeometry(w, h, 0.09), MAT.slate(), [x, y, zFace + dirZ * 0.04]));
    const p = mesh(new THREE.PlaneGeometry(w * 0.92, h * 0.92), pane, [x, y, zFace + dirZ * 0.09]);
    p.castShadow = false;
    if (dirZ < 0) p.rotation.y = Math.PI;
    g.add(p);
    // shutters
    for (const sx of [-1, 1])
      g.add(
        mesh(new THREE.BoxGeometry(w * 0.5, h + 0.1, 0.05), wood, [
          x + sx * (w / 2 + w * 0.28),
          y,
          zFace + dirZ * 0.04,
        ]),
      );
  };
  const zs = W / 2;
  for (const x of [-L / 2 + 1.5, -L / 2 + 3.6, L / 2 - 1.6]) {
    window(x, 0.2 + 1.5, 0.9, 1.2, zs, 1);
    window(x, 0.2 + 1.5, 0.9, 1.2, -zs, -1);
  }
  g.add(mesh(new THREE.BoxGeometry(1.1, 2.1, 0.1), wood, [0.3, 0.2 + 1.05, zs + 0.05]));
  g.add(mesh(new THREE.BoxGeometry(1.5, 0.2, 0.7), MAT.concrete(), [0.3, 0.2 + 0.1 - 0.1, zs + 0.35]));
  g.add(mesh(new THREE.BoxGeometry(1.7, 0.12, 0.7), roofMat, [0.3, 0.2 + 2.45, zs + 0.5]));
  // rendered base band
  g.add(mesh(new THREE.BoxGeometry(L + 0.06, 0.5, W + 0.06), rend, [0, 0.2 + 0.25, 0]));
  mergeStatic(g, { name: 'house' });
  return g;
}

// ------------------------------------------------------------------------------------------------ water tower

export interface Tower {
  group: THREE.Group;
  /** Where the delivery pipe ends, above the receiving trough, in the tower frame. */
  inlet: THREE.Vector3;
  /** Foot of the riser the pipe climbs, in the tower frame (ground level). */
  riser: THREE.Vector3;
  /** Receiving trough surface (a flowing sheet) and the falling stream. */
  trough: THREE.Mesh;
  stream: THREE.Mesh;
  /** Their materials, animated directly (never through `mesh.material`, which the registry swaps for the ghost one). */
  troughMaterial: THREE.MeshStandardMaterial;
  streamMaterial: THREE.MeshStandardMaterial;
  /** Tower outlet pipe start (bottom of the tank), in the tower frame. */
  outlet: THREE.Vector3;
}

export function buildTower(): Tower {
  const g = group('water-tower');
  const concrete = MAT.concrete();
  const zinc = MAT.zinc();
  const stand = TOWER.standHeight;
  const R = TOWER.tankDiameter / 2;
  const top = TOWER.groundBelowInlet;
  const th = TOWER.tankHeight;
  // four posts, braces, slab
  for (const [sx, sz] of [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ]) {
    g.add(
      mesh(new THREE.BoxGeometry(0.4, stand + 0.1, 0.4), concrete, [sx * 1.15, (stand + 0.1) / 2 - 0.1, sz * 1.15]),
    );
    g.add(mesh(new THREE.BoxGeometry(0.7, 0.25, 0.7), concrete, [sx * 1.15, -0.02, sz * 1.15]));
  }
  for (const y of [1.0, 2.2]) {
    for (const sx of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.2, 0.2, 2.3), concrete, [sx * 1.15, y, 0]));
    for (const sz of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(2.3, 0.2, 0.2), concrete, [0, y, sz * 1.15]));
  }
  g.add(mesh(new THREE.CylinderGeometry(R + 0.3, R + 0.3, 0.22, 40), concrete, [0, stand + 0.1, 0]));
  // tank: wall, bottom ring, lid slab with an access hatch
  g.add(mesh(new THREE.CylinderGeometry(R, R, th - 0.12, 48), concrete, [0, stand + 0.21 + (th - 0.12) / 2, 0]));
  for (const y of [stand + 0.6, stand + 1.5]) {
    g.add(mesh(new THREE.TorusGeometry(R + 0.02, 0.035, 8, 48), zinc, [0, y, 0]));
    (g.children[g.children.length - 1] as THREE.Mesh).rotation.x = Math.PI / 2;
  }
  g.add(mesh(new THREE.CylinderGeometry(R + 0.1, R + 0.1, 0.12, 48), concrete, [0, top - 0.06, 0]));
  g.add(mesh(new THREE.BoxGeometry(0.7, 0.08, 0.7), MAT.steelBlack(), [-0.5, top + 0.04, 0.5]));
  // ladder on the south side
  for (const sx of [-0.2, 0.2])
    g.add(mesh(new THREE.BoxGeometry(0.04, top + 0.8, 0.04), zinc, [sx, (top + 0.8) / 2, R + 0.28]));
  for (let y = 0.4; y < top + 0.6; y += 0.32)
    g.add(mesh(new THREE.BoxGeometry(0.44, 0.03, 0.03), zinc, [0, y, R + 0.28]));
  // receiving trough on the lid (water arrives here; the tank volume is not documented, no level is drawn)
  const trough = group('trough');
  trough.position.set(TOWER.troughX, top, TOWER.troughZ);
  trough.add(mesh(new THREE.BoxGeometry(1.0, 0.34, 0.6), MAT.stone(), [0, 0.17, 0]));
  trough.add(mesh(new THREE.BoxGeometry(0.8, 0.1, 0.4), MAT.steelBlack(), [0, 0.3, 0]));
  g.add(trough);
  const sheetMat = waterMaterial(0.85, 0x6fb4de);
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.36), sheetMat);
  sheet.rotation.x = -Math.PI / 2;
  sheet.position.set(TOWER.troughX, top + 0.345, TOWER.troughZ);
  g.add(sheet);
  const inlet = new THREE.Vector3(TOWER.troughX, top + TOWER.pipeEndAboveLid, TOWER.troughZ);
  const streamMat = waterMaterial(0.8, 0x8cc6ea);
  const stream = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, TOWER.pipeEndAboveLid - 0.35, 8, 1, true),
    streamMat,
  );
  stream.position.set(inlet.x, top + 0.35 + (TOWER.pipeEndAboveLid - 0.35) / 2, inlet.z);
  g.add(stream);
  // outlet at the foot of the tank, going down the south-west post to the ground
  const outlet = new THREE.Vector3(-R - 0.1, stand + 0.4, 0.4);
  noShadow(sheet);
  noShadow(stream);
  mergeStatic(g, { name: 'tower' });
  return {
    group: g,
    inlet,
    riser: new THREE.Vector3(TOWER.riserX, 0, TOWER.riserZ),
    trough: sheet,
    stream,
    troughMaterial: sheetMat,
    streamMaterial: streamMat,
    outlet,
  };
}
