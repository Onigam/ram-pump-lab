import * as THREE from 'three';
import { MAT, group, mesh, rng } from '@onigam/lab-kit/three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CATCHMENT as C, SPRING } from '../dims';
import { DEG } from '../common';
import { dynamic } from '../merge';
import type { Detail } from './tank';
import {
  boulderGeometry,
  boxBetween,
  perforatedSteel,
  pipe,
  pipeLine,
  rock,
  rodX,
  rodY,
  v3,
  wallWithHoles,
} from './geo';
import {
  BED_FLOOR_Y,
  BED_TOP_Y,
  BED_X0,
  BED_X1,
  BOX_FLOOR_Y,
  BOX_HL,
  BOX_HW,
  BOX_OHL,
  BOX_OHW,
  BOX_RIM_Y,
  BOX_SLAB_BOTTOM,
  BOX_T,
  FEED_X0,
  H_LID,
  SHELF_Y,
  SPRING_X,
  feedY,
} from './layout';

// The spring side of the catchment, in the SPRING frame (origin: centre of the spring box, Y measured from the inner floor of
// the tank like everywhere): the box dug into the shelf with its hinged cover, the gravel bed against its west wall, the
// feed pipe that falls from the box to the lid of the tank, and the rock outcrop where the water comes out.

const lowRes = (d: Detail, full: number, site: number) => (d === 'full' ? full : site);

// ------------------------------------------------------------------------------------------------ spring box

export interface SpringBox {
  group: THREE.Group;
  anchor: THREE.Object3D;
}

export function buildSpringBox(detail: Detail): SpringBox {
  const g = group('spring-box');
  const concrete = MAT.concrete();
  const H = BOX_RIM_Y - BOX_FLOOR_Y;
  // floor slab and the four walls: the north and south walls run the full length, the west wall has the ports of the filter, the east
  // wall the outlet of the feed pipe
  g.add(boxBetween(-BOX_OHL, BOX_SLAB_BOTTOM, -BOX_OHW, BOX_OHL, BOX_FLOOR_Y, BOX_OHW, concrete));
  g.add(boxBetween(-BOX_OHL, BOX_FLOOR_Y, -BOX_OHW, BOX_OHL, BOX_RIM_Y, -BOX_HW, concrete));
  g.add(boxBetween(-BOX_OHL, BOX_FLOOR_Y, BOX_HW, BOX_OHL, BOX_RIM_Y, BOX_OHW, concrete));
  const ports: [number, number, number][] = [];
  for (let i = 0; i < C.boxPortCount; i++) {
    ports.push([(i - (C.boxPortCount - 1) / 2) * C.boxPortSpacing, C.boxPortHeight, C.boxPortDiameter / 2]);
  }
  const west = mesh(wallWithHoles(BOX_T, 2 * BOX_HW, H, ports), concrete, [-(BOX_HL + BOX_T / 2), BOX_FLOOR_Y, 0]);
  g.add(west);
  const east = mesh(
    wallWithHoles(BOX_T, 2 * BOX_HW, H, [[0, C.boxOutletHeight, SPRING.feedPipeDiameter / 2 + 0.001]]),
    concrete,
    [BOX_HL + BOX_T / 2, BOX_FLOOR_Y, 0],
  );
  g.add(east);
  // silt on the floor (the box is a settling basin: the outlet is 0.45 m above the floor)
  const silt = mesh(
    new THREE.BoxGeometry(2 * BOX_HL - 0.002, C.boxSediment, 2 * BOX_HW - 0.002),
    new THREE.MeshStandardMaterial({ color: 0x6b5a40, roughness: 1 }),
    [0, BOX_FLOOR_Y + C.boxSediment / 2, 0],
  );
  silt.castShadow = false;
  g.add(silt);
  // the hinged galvanised cover, propped open: hinge on the north edge
  const hinge = new THREE.Group();
  hinge.name = 'box-lid-hinge';
  const m = C.boxLidMargin;
  hinge.position.set(0, BOX_RIM_Y + C.boxLidThickness / 2, -BOX_OHW - m);
  const lid = new THREE.Group();
  const lidL = 2 * (BOX_OHL + m);
  const lidW = 2 * (BOX_OHW + m);
  // galvanised checker plate: duller than polished zinc, or it mirrors the sky
  const zinc = new THREE.MeshStandardMaterial({ color: 0x6b7178, metalness: 0.15, roughness: 0.7 });
  const steel = MAT.steel();
  lid.add(mesh(new THREE.BoxGeometry(lidL, C.boxLidThickness, lidW), zinc, [0, 0, lidW / 2]));
  for (const z of [0.02, lidW - 0.02]) lid.add(mesh(new THREE.BoxGeometry(lidL, 0.03, 0.04), steel, [0, -0.012, z]));
  for (const x of [-lidL / 2 + 0.02, lidL / 2 - 0.02])
    lid.add(mesh(new THREE.BoxGeometry(0.04, 0.03, lidW), steel, [x, -0.012, lidW / 2]));
  lid.add(mesh(new THREE.BoxGeometry(0.22, 0.02, 0.03), steel, [0, 0.018, lidW * 0.82]));
  hinge.add(lid);
  hinge.rotation.x = -C.boxLidOpenDeg * DEG;
  g.add(hinge);
  // two hinge knuckles on the rim
  for (const x of [-0.5, 0.5]) {
    const k = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.12, 10), steel, [x, BOX_RIM_Y + 0.01, -BOX_OHW - m]);
    k.rotation.z = Math.PI / 2;
    g.add(k);
  }
  // prop rod from the cover down to a peg in the ground behind the box
  const leafDir = v3(0, Math.sin(C.boxLidOpenDeg * DEG), Math.cos(C.boxLidOpenDeg * DEG));
  const leafPoint = hinge.position.clone().addScaledVector(leafDir, 0.9);
  leafPoint.x = 0.45;
  g.add(rodBetweenPoints(leafPoint, v3(0.45, SHELF_Y - 0.05, hinge.position.z - 0.85), steel));
  // overflow stub through the south wall, just above the working level and well below the top of the bed (nothing can back up
  // into the gravel), with a flap against animals; a washout plug on its chain in the floor
  const ov = C.boxOverflowDiameter / 2;
  const ovY = BOX_FLOOR_Y + C.boxOverflowHeight;
  const pvcO = MAT.pvcGrey();
  const ovStub = mesh(new THREE.CylinderGeometry(ov, ov, BOX_T + 0.22, lowRes(detail, 16, 10)), pvcO, [
    -0.3,
    ovY,
    BOX_HW + (BOX_T + 0.22) / 2 - 0.04,
  ]);
  ovStub.rotation.x = Math.PI / 2;
  g.add(ovStub);
  const flap = mesh(new THREE.CylinderGeometry(ov * 1.12, ov * 1.12, 0.006, 16), MAT.rubber(), [
    -0.3,
    ovY - 0.012,
    BOX_OHW + 0.185,
  ]);
  flap.rotation.x = Math.PI / 2 - 0.22;
  g.add(flap);
  const plug = mesh(
    new THREE.CylinderGeometry(C.boxWashoutDiameter / 2, C.boxWashoutDiameter / 2 - 0.006, 0.018, 18),
    MAT.rubber(),
    [-0.45, BOX_FLOOR_Y + C.boxSediment + 0.006, 0.2],
  );
  g.add(plug);
  const chain = mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.5, 5), MAT.inox());
  const chainA = v3(-0.45, BOX_FLOOR_Y + C.boxSediment + 0.02, 0.2);
  const chainB = v3(-0.5, BOX_RIM_Y - 0.03, BOX_HW - 0.02);
  chain.position.copy(chainA).lerp(chainB, 0.5);
  chain.scale.y = chainA.distanceTo(chainB) / 0.5;
  chain.quaternion.setFromUnitVectors(v3(0, 1, 0), chainB.clone().sub(chainA).normalize());
  g.add(chain);
  g.add(boxBetween(-0.53, BOX_RIM_Y - 0.05, BOX_HW - 0.035, -0.47, BOX_RIM_Y - 0.01, BOX_HW, MAT.steel()));
  // the vent: a stub through the south wall, up the outside of the wall and over in a goose-neck with a mesh cap
  const pvc = MAT.pvcGrey();
  const vr = C.boxVentDiameter / 2;
  const vx = 0.4;
  const vz = BOX_OHW + vr + 0.004;
  g.add(rodY(BOX_RIM_Y - 0.06, BOX_RIM_Y + C.boxVentRise, vr, pvc, vx, vz, lowRes(detail, 14, 10)));
  g.add(mesh(new THREE.TorusGeometry(vr * 2, vr, 8, 16, Math.PI), pvc, [vx + vr * 2, BOX_RIM_Y + C.boxVentRise, vz]));
  g.add(rodY(BOX_RIM_Y + C.boxVentRise - 0.07, BOX_RIM_Y + C.boxVentRise, vr, pvc, vx + vr * 4, vz, 14));
  g.add(
    mesh(
      new THREE.CylinderGeometry(vr * 1.2, vr * 1.2, 0.025, 14),
      new THREE.MeshStandardMaterial({ color: 0xcfd3d6, roughness: 0.8 }),
      [vx + vr * 4, BOX_RIM_Y + C.boxVentRise - 0.08, vz],
    ),
  );
  const anchor = new THREE.Object3D();
  anchor.name = 'anchor-spring-box';
  anchor.position.set(0.3, BOX_RIM_Y + 0.3, 0.3);
  g.add(anchor);
  return { group: g, anchor };
}

function rodBetweenPoints(a: THREE.Vector3, b: THREE.Vector3, material: THREE.Material): THREE.Mesh {
  const d = b.clone().sub(a);
  const m = mesh(new THREE.CylinderGeometry(0.007, 0.007, d.length(), 8), material);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(v3(0, 1, 0), d.normalize());
  return m;
}

// ------------------------------------------------------------------------------------------------ gravel bed

export interface GravelBed {
  group: THREE.Group;
  /** Darker, wet gravel on top of each zone (opacity follows the flow of the spring). */
  wet: THREE.Mesh;
  /** Where the trickle falls onto the bed (SPRING frame), and the zones' x ranges (coarse, medium, fine). */
  drop: THREE.Vector3;
  zones: [number, number][];
  anchor: THREE.Object3D;
}

/** Zones of the bed: [x0, x1] in the SPRING frame, from the rock (fine stones) to the box (coarse stones): Oxfam TB5. */
export function bedZones(): [number, number][] {
  const out: [number, number][] = [];
  let x = BED_X0;
  for (const f of C.filterZones) {
    out.push([x, x + f * C.filterLength]);
    x += f * C.filterLength;
  }
  return out;
}

/** Colours of the three zones from the rock to the box: fine (light), medium, coarse (dark). */
export const ZONE_COLOURS = [0xb3ab92, 0x8d887b, 0x6f6b63];

const stoneGeometry = (() => {
  let g: THREE.BufferGeometry | null = null;
  return () => {
    if (!g) g = boulderGeometry(3, 0);
    return g;
  };
})();

export function buildGravelBed(detail: Detail): GravelBed {
  const g = group('gravel-filter');
  const W = C.filterWidth;
  const zones = bedZones();
  const colours = ZONE_COLOURS;
  const grains = [C.grainFine, C.grainMedium, C.grainCoarse];
  const counts = detail === 'full' ? [130, 100, 66] : [40, 30, 20];
  const topY = BED_TOP_Y - 0.035;
  const R = rng(7);
  // the zone blocks (a flat top; the stones on it give the grain)
  zones.forEach(([x0, x1], i) => {
    g.add(
      boxBetween(
        x0,
        BED_FLOOR_Y,
        -W / 2,
        x1,
        topY,
        W / 2,
        new THREE.MeshStandardMaterial({ color: colours[i], roughness: 1 }),
      ),
    );
    const inst = new THREE.InstancedMesh(
      stoneGeometry(),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true }),
      counts[i],
    );
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const tint = new THREE.Color();
    for (let k = 0; k < counts[i]; k++) {
      const s = grains[i] * (0.45 + 0.35 * R());
      const x = x0 + 0.02 + R() * (x1 - x0 - 0.04);
      const z = (R() - 0.5) * (W - 0.06);
      e.set(R() * 3, R() * 6, R() * 3);
      q.setFromEuler(e);
      m4.compose(v3(x, topY + s * 0.12, z), q, v3(s, s * 0.7, s));
      inst.setMatrixAt(k, m4);
      inst.setColorAt(k, tint.setHex(colours[i]).multiplyScalar(0.8 + R() * 0.45));
    }
    inst.castShadow = detail === 'full';
    inst.receiveShadow = true;
    g.add(inst);
  });
  // a bottom slab and the stone kerbs on the north and south sides and against the rock on the west
  const concrete = MAT.concrete();
  g.add(
    boxBetween(BED_X0, BED_FLOOR_Y - 0.1, -W / 2 - C.filterKerb, BED_X1, BED_FLOOR_Y, W / 2 + C.filterKerb, concrete),
  );
  const kerbTop = SHELF_Y + 0.1;
  const courses = 4;
  const ch = (kerbTop - BED_FLOOR_Y) / courses;
  const stones: { x: number; y: number; z: number; sx: number; sy: number; sz: number; ry: number }[] = [];
  for (let c = 0; c < courses; c++) {
    const y = BED_FLOOR_Y + ch * (c + 0.5);
    for (const side of [-1, 1]) {
      let x = BED_X0 + (c % 2) * 0.1;
      while (x < BED_X1 - 0.05) {
        const len = Math.min(0.26 + 0.1 * R(), BED_X1 - x);
        stones.push({
          x: x + len / 2,
          y,
          z: side * (W / 2 + C.filterKerb / 2),
          sx: len - 0.012,
          sy: ch - 0.012,
          sz: C.filterKerb,
          ry: 0,
        });
        x += len;
      }
    }
    // west end, against the rock
    let z = -W / 2 - C.filterKerb + (c % 2) * 0.1;
    while (z < W / 2 + C.filterKerb - 0.05) {
      const len = Math.min(0.26 + 0.1 * R(), W / 2 + C.filterKerb - z);
      stones.push({
        x: BED_X0 - C.filterKerb / 2,
        y,
        z: z + len / 2,
        sx: C.filterKerb,
        sy: ch - 0.012,
        sz: len - 0.012,
        ry: 0,
      });
      z += len;
    }
  }
  const kerb = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }),
    stones.length,
  );
  const m4 = new THREE.Matrix4();
  const tint = new THREE.Color();
  stones.forEach((s, i) => {
    m4.compose(v3(s.x, s.y, s.z), new THREE.Quaternion(), v3(s.sx, s.sy, s.sz));
    kerb.setMatrixAt(i, m4);
    kerb.setColorAt(i, tint.setHex(0x7c776d).multiplyScalar(0.82 + R() * 0.3));
  });
  kerb.castShadow = true;
  kerb.receiveShadow = true;
  g.add(kerb);
  // wet gravel on top (a slightly darker, glossy film): its opacity follows the flow of the spring
  const wetMat = new THREE.MeshStandardMaterial({
    color: 0x2f3d44,
    roughness: 0.3,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const wet = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), wetMat);
  wet.rotation.x = -Math.PI / 2;
  wet.scale.set(BED_X1 - BED_X0 - 0.04, W - 0.08, 1);
  wet.position.set((BED_X0 + BED_X1) / 2, BED_TOP_Y - 0.003, 0);
  wet.userData.noShadow = true;
  wet.castShadow = false;
  wet.renderOrder = 1;
  g.add(dynamic(wet));
  const anchor = new THREE.Object3D();
  anchor.name = 'anchor-gravel-filter';
  anchor.position.set(BED_X0 + 0.3, BED_TOP_Y + 1.3, -0.3);
  g.add(anchor);
  return { group: g, wet, drop: v3(BED_X0 + 0.02, BED_TOP_Y, 0.12), zones, anchor };
}

// ------------------------------------------------------------------------------------------------ feed pipe

export interface FeedPipe {
  group: THREE.Group;
  /** Centre line of the water inside, from the strainer in the box to the free end in the tank (SPRING frame). */
  path: THREE.Vector3[];
  /** The free end of the pipe in the tank (SPRING frame). */
  end: THREE.Vector3;
  anchor: THREE.Object3D;
}

export function buildFeedPipe(detail: Detail): FeedPipe {
  const g = group('feed-pipe');
  const rp = SPRING.feedPipeDiameter / 2;
  const black = MAT.pe();
  const xInlet = -C.feedInlet - SPRING_X; // x of the lid inlet in the SPRING frame
  const xStrainer1 = FEED_X0 + C.boxStrainerLength;
  const xs = [xStrainer1 + 0.05, xInlet];
  const pts = [
    v3(xStrainer1 - 0.02, feedY(xStrainer1 - 0.02), 0),
    v3(xs[0], feedY(xs[0]), 0),
    v3(xs[1], feedY(xs[1]), 0),
    v3(xs[1], C.feedEnd, 0),
  ];
  g.add(pipe(pts, rp, black, 0.1, lowRes(detail, 12, 8)));
  // strainer on the start of the pipe: a perforated stainless cap with a round end
  const sr = C.boxStrainerDiameter / 2;
  const sy = feedY(xStrainer1);
  const cap = mesh(
    new THREE.CylinderGeometry(sr, sr, C.boxStrainerLength, lowRes(detail, 20, 12), 1, true),
    perforatedSteel(14, 6),
  );
  cap.rotation.z = Math.PI / 2;
  cap.position.set(FEED_X0 + C.boxStrainerLength / 2, sy + 0.002, 0);
  cap.castShadow = false;
  g.add(cap);
  const end = mesh(new THREE.SphereGeometry(sr, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), MAT.inox());
  end.rotation.z = Math.PI / 2;
  end.position.set(FEED_X0, sy + 0.002, 0);
  g.add(end);
  // collar where the pipe goes through the wall
  const collar = rodX(BOX_HL - 0.01, BOX_HL + BOX_T + 0.01, rp * 1.35, MAT.rubber(), feedY(BOX_HL), 0, 14);
  collar.castShadow = false;
  g.add(collar);
  // a flat stone under the pipe at the edge of the shelf, and a post with a clamp on the lid of the tank
  const lipX = -C.scarpLip - SPRING_X;
  const stone = rock(4, MAT.stone(), lipX + 0.05, feedY(lipX) - rp - 0.02, 0, 0.14, 0.05, 0.14, 0.4, 0);
  g.add(stone);
  const postX = xInlet + 0.2;
  const postTop = feedY(postX) - rp;
  const steel = MAT.steel();
  g.add(boxBetween(postX - 0.015, H_LID, -0.015, postX + 0.015, postTop, 0.015, steel));
  const clamp = mesh(new THREE.TorusGeometry(rp + 0.004, 0.004, 6, 14), MAT.inox(), [postX, feedY(postX), 0]);
  clamp.rotation.y = Math.PI / 2;
  g.add(clamp);
  const anchor = new THREE.Object3D();
  anchor.name = 'anchor-feed-pipe';
  anchor.position.set(1.6, feedY(1.6) + 0.45, 0);
  g.add(anchor);
  return { group: g, path: pipeLine(pts, 0.1, 0.12), end: v3(xs[1], C.feedEnd, 0), anchor };
}

// ------------------------------------------------------------------------------------------------ rock outcrop and scarp

export interface Outcrop {
  group: THREE.Group;
  /** The fissure the water comes out of (SPRING frame). */
  fissure: THREE.Vector3;
}

/** Colours of the rocks, picked per rock. */
const ROCK_COLOURS = [0x8a857b, 0x77736b, 0x9a9488, 0x6d6a64, 0x857f72];

/** The rocks of the outcrop behind the gravel bed and of the scarp between the shelf and the bench, merged into one mesh. */
export function buildOutcrop(detail: Detail): Outcrop {
  const g = group('outcrop');
  const R = rng(11);
  const geos: THREE.BufferGeometry[] = [];
  const tint = new THREE.Color();
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const add = (seed: number, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
    const geo = boulderGeometry(seed, detail === 'full' ? 1 : 0);
    e.set(0, R() * 6.28, (R() - 0.5) * 0.3);
    q.setFromEuler(e);
    m4.compose(v3(x, y, z), q, v3(sx, sy, sz));
    geo.applyMatrix4(m4);
    tint.setHex(ROCK_COLOURS[Math.floor(R() * ROCK_COLOURS.length)]).multiplyScalar(0.62 + R() * 0.26);
    const n = geo.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([tint.r, tint.g, tint.b], i * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geos.push(geo);
  };
  // the outcrop: tall boulders on both sides of the fissure (a gap of a hand's width), rocks above and around, a dark core behind
  const xFace = BED_X0 - 0.12; // the face, on the bed side
  const core = rock(
    31,
    new THREE.MeshStandardMaterial({ color: 0x2b2924, roughness: 1, flatShading: true }),
    xFace - 0.3,
    SHELF_Y + 0.35,
    0.12,
    0.55,
    0.5,
    0.3,
    0.3,
    1,
  );
  g.add(core);
  // depth behind the face, height above the shelf, z, half size in plan, half height
  const rows: [number, number, number, number, number][] = [
    [0.0, 0.5, -0.5, 0.5, 0.55],
    [0.0, 0.5, 0.74, 0.5, 0.55],
    [0.0, 1.45, -0.45, 0.55, 0.6],
    [0.0, 1.4, 0.7, 0.55, 0.6],
    [0.02, 1.1, 0.12, 0.62, 0.4],
    [0.1, 0.35, -1.35, 0.55, 0.45],
    [0.1, 0.35, 1.5, 0.55, 0.45],
    [0.15, 1.4, -1.3, 0.55, 0.7],
    [0.15, 1.3, 1.5, 0.55, 0.7],
    [0.5, 0.3, -2.2, 0.7, 0.5],
    [0.5, 0.3, 2.3, 0.7, 0.5],
    [0.6, 1.9, -0.55, 0.65, 0.5],
    [0.6, 1.9, 0.8, 0.65, 0.5],
    [0.7, 1.1, 0.12, 0.7, 1.0],
    [0.5, 1.9, -1.5, 0.55, 0.45],
    [0.5, 1.8, 1.7, 0.55, 0.45],
    [1.3, 0.4, -1.0, 0.75, 0.6],
    [1.3, 0.4, 1.3, 0.75, 0.6],
    [1.3, 1.6, 0.0, 0.8, 0.75],
    [1.5, 0.3, -3.1, 0.8, 0.5],
    [1.5, 0.3, 3.2, 0.8, 0.5],
    [1.9, 0.6, -2.0, 0.85, 0.65],
    [1.9, 0.6, 2.2, 0.85, 0.65],
  ];
  rows.forEach(([depth, y, z, rxz, ry], i) =>
    add(i + 20, xFace - rxz * 0.8 - depth, SHELF_Y + y, z, rxz, ry, rxz * 0.95),
  );
  // the scarp: three courses of boulders on the steep ground between the shelf and the bench
  const sx0 = -C.scarpLip - SPRING_X;
  const sx1 = -C.scarpFoot - SPRING_X;
  const zMax = C.blockHalfWidth - 0.2;
  for (let c = 0; c < 3; c++) {
    const t = (c + 0.5) / 3;
    const y = SHELF_Y + (0 - SHELF_Y) * t * 0.98; // from the lip down to the foot
    const x = sx0 + (sx1 - sx0) * t;
    const step = detail === 'full' ? 0.85 : 1.1;
    for (let z = -zMax; z <= zMax; z += step) {
      const j = (R() - 0.5) * 0.35;
      const s = 0.42 + 0.22 * R();
      add(60 + c * 40 + Math.round((z + 5) * 3), x + j * 0.4, y + 0.1 * c + 0.05, z + j, s, s * 0.8, s * 0.95);
    }
  }
  const rocks = new THREE.Mesh(
    mergeGeometries(geos)!,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }),
  );
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  rocks.name = 'rocks';
  g.add(rocks);
  // the fissure: a dark slit in the face with a wet streak under it
  const fissure = v3(xFace - 0.005, SHELF_Y + C.seepHeight, 0.12);
  const dark = new THREE.MeshStandardMaterial({ color: 0x14130f, roughness: 1 });
  const slit = mesh(new THREE.BoxGeometry(0.03, 0.5, 0.05), dark, [fissure.x - 0.01, fissure.y + 0.1, fissure.z]);
  slit.castShadow = false;
  g.add(slit);
  const lip = rock(
    8,
    new THREE.MeshStandardMaterial({ color: 0x6d6a64, roughness: 1, flatShading: true }),
    xFace + 0.05,
    SHELF_Y + C.seepHeight - 0.03,
    fissure.z,
    0.16,
    0.05,
    0.14,
    0.3,
    0,
  );
  g.add(lip);
  const streak = mesh(
    new THREE.BoxGeometry(0.004, C.seepHeight - 0.1, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x4a4a45, roughness: 0.6 }),
    [xFace + 0.001, SHELF_Y + (C.seepHeight - 0.1) / 2 + 0.05, fissure.z],
  );
  streak.castShadow = false;
  g.add(streak);
  return { group: g, fissure };
}
