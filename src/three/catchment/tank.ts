import * as THREE from 'three';
import { MAT, group, mesh, pmma } from '@onigam/lab-kit/three';
import { CATCHMENT as C, SITE, TANK } from '../dims';
import { DEG, TAU } from '../common';
import { dynamic } from '../merge';
import { boxBetween, perforatedSteel, pipe, pipeLine, rodBetween, rodX, rodY, sweepProfile, v3 } from './geo';
import {
  BEND_X,
  CORNER,
  H_FULL,
  H_LID,
  H_SHELL,
  OUT_X,
  OUT_Y,
  R,
  R_OUT,
  SLAB_BOTTOM,
  SLAB_R,
  SLAB_TOP,
  groundY,
} from './layout';

// The buffer tank and what is bolted to it, in the TANK frame (origin on the axis, at the level of the inner floor): the
// shell on its slab, the lid with its manhole and vent, the overflow pipe and the ditch it pours into, the intake screen at
// the start of the drive pipe, the gate valve, the drain. See layout.ts for the derived coordinates.

/** `site` draws the same things with fewer facets and no small details; `full` is the catchment world. */
export type Detail = 'full' | 'site';

const polar = (az: number, r: number): [number, number] => [r * Math.cos(az * DEG), r * Math.sin(az * DEG)];
const lowRes = (d: Detail, full: number, site: number) => (d === 'full' ? full : site);

// ------------------------------------------------------------------------------------------------ shell

export interface Shell {
  group: THREE.Group;
  /** Silt on the floor (visible when the tank is empty). */
  sludge: THREE.Mesh;
}

export function buildTankShell(detail: Detail): Shell {
  const g = group('tank-shell');
  const seg = lowRes(detail, 64, 40);
  // the slab, the moulded floor and the translucent polyethylene wall
  g.add(
    mesh(new THREE.CylinderGeometry(SLAB_R, SLAB_R + 0.03, TANK.slabThickness, seg), MAT.concrete(), [
      0,
      (SLAB_TOP + SLAB_BOTTOM) / 2,
      0,
    ]),
  );
  g.add(mesh(new THREE.CylinderGeometry(R_OUT, R_OUT, TANK.wall, seg), MAT.printCream(), [0, -TANK.wall / 2, 0]));
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(R_OUT, R_OUT, H_SHELL, seg, 1, true), pmma(0.16));
  wall.position.y = H_SHELL / 2;
  wall.castShadow = false;
  wall.receiveShadow = false;
  wall.renderOrder = 2;
  g.add(wall);
  // galvanised hoops with a tensioner each
  const zinc = MAT.zinc();
  for (const y of TANK.hoopHeights) {
    const hoop = mesh(new THREE.CylinderGeometry(R_OUT + 0.008, R_OUT + 0.008, TANK.hoopWidth, seg, 1, true), zinc, [
      0,
      y,
      0,
    ]);
    hoop.castShadow = false;
    g.add(hoop);
    const [bx, bz] = polar(100, R_OUT + 0.02);
    const buckle = mesh(new THREE.BoxGeometry(0.03, TANK.hoopWidth + 0.01, 0.075), zinc, [bx, y, bz]);
    buckle.rotation.y = -100 * DEG;
    g.add(buckle);
  }
  // silt on the floor
  const sludge = mesh(
    new THREE.CylinderGeometry(R - 0.004, R - 0.004, C.sludgeDepth, lowRes(detail, 48, 32)),
    new THREE.MeshStandardMaterial({ color: 0x5a4b36, roughness: 1 }),
    [0, C.sludgeDepth / 2, 0],
  );
  sludge.castShadow = false;
  g.add(sludge);
  // bulkhead fittings: the outlet (+X), the overflow and the drain, a flange inside and a lock nut outside
  const brass = MAT.brass();
  const fitting = (azDeg: number, y: number, rad: number) => {
    const [x, z] = polar(azDeg, R - 0.004);
    const inner = mesh(new THREE.CylinderGeometry(rad, rad, 0.012, 20), brass, [x, y, z]);
    inner.rotation.set(0, -azDeg * DEG, Math.PI / 2);
    g.add(inner);
    const [ox, oz] = polar(azDeg, R_OUT + 0.011);
    const nut = mesh(new THREE.CylinderGeometry(rad * 1.12, rad * 1.12, 0.022, 6), brass, [ox, y, oz]);
    nut.rotation.set(0, -azDeg * DEG, Math.PI / 2);
    g.add(nut);
  };
  fitting(0, OUT_Y, C.bulkheadDiameter / 2);
  fitting(C.overflowAzimuthDeg, H_FULL + (C.overflowDiameter - 0.006) / 2, (C.overflowDiameter + 0.012) / 2);
  fitting(0, C.drainAxisHeight, (C.drainDiameter + 0.02) / 2);
  // level marks on the front of the shell: 0, 25, 50, 75 % and, in red, the overflow level (100 %)
  if (detail === 'full') {
    const red = MAT.pvcRed();
    const az = 118;
    [0.02, 0.25, 0.5, 0.75, 1].forEach((f, i) => {
      const y = i === 0 ? 0.02 : f * H_FULL;
      const [x, z] = polar(az, R_OUT + 0.004);
      const w = i === 4 ? 0.2 : i % 2 === 0 ? 0.14 : 0.1;
      const m = mesh(new THREE.BoxGeometry(0.008, 0.014, w), i === 4 ? red : zinc, [x, y, z]);
      m.rotation.y = -az * DEG;
      m.castShadow = false;
      g.add(m);
    });
  }
  return { group: g, sludge };
}

// ------------------------------------------------------------------------------------------------ lid

export interface Lid {
  group: THREE.Group;
  /** Where the feed pipe goes through, and the vent mouth (anchors for the dots of the air, if any). */
  anchor: THREE.Object3D;
}

export function buildTankLid(detail: Detail): Lid {
  const g = group('tank-lid');
  const seg = lowRes(detail, 64, 40);
  const black = MAT.pe();
  const lidR = R_OUT + TANK.lidOverhang;
  g.add(
    mesh(new THREE.CylinderGeometry(lidR, lidR, TANK.lidThickness, seg), black, [
      0,
      H_SHELL + TANK.lidThickness / 2,
      0,
    ]),
  );
  // manhole: a collar and a screw-on hatch with a handle and bolts
  const mh = C.manholeDiameter;
  const grey = MAT.printGrey();
  const dark = MAT.pvcDark();
  g.add(
    mesh(new THREE.CylinderGeometry(mh / 2 + 0.02, mh / 2 + 0.03, 0.04, 40), dark, [
      C.manholeX,
      H_LID + 0.02,
      C.manholeZ,
    ]),
  );
  g.add(
    mesh(new THREE.CylinderGeometry(mh / 2 + 0.012, mh / 2 + 0.012, 0.03, 40), grey, [
      C.manholeX,
      H_LID + 0.055,
      C.manholeZ,
    ]),
  );
  g.add(mesh(new THREE.BoxGeometry(0.2, 0.025, 0.035), dark, [C.manholeX, H_LID + 0.083, C.manholeZ]));
  if (detail === 'full') {
    for (let i = 0; i < 8; i++) {
      const a = (i * TAU) / 8;
      g.add(
        mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.012, 6), MAT.steel(), [
          C.manholeX + Math.cos(a) * (mh / 2 - 0.02),
          H_LID + 0.076,
          C.manholeZ + Math.sin(a) * (mh / 2 - 0.02),
        ]),
      );
    }
  }
  // vent: a pipe with a goose-neck and an insect mesh, open to the air (the tank must breathe when the level moves)
  const vr = C.ventDiameter / 2;
  const pvc = MAT.pvcGrey();
  const vx = C.ventX;
  const vz = C.ventZ;
  g.add(mesh(new THREE.CylinderGeometry(vr * 1.5, vr * 1.5, 0.014, 20), pvc, [vx, H_LID + 0.007, vz]));
  g.add(rodY(H_LID, H_LID + C.ventRise, vr, pvc, vx, vz, 16));
  const neck = mesh(new THREE.TorusGeometry(vr * 2, vr, 10, 18, Math.PI), pvc, [vx + vr * 2, H_LID + C.ventRise, vz]);
  g.add(neck);
  g.add(rodY(H_LID + C.ventRise - 0.07, H_LID + C.ventRise, vr, pvc, vx + vr * 4, vz, 16));
  g.add(
    mesh(
      new THREE.CylinderGeometry(vr * 1.25, vr * 1.25, 0.03, 18),
      new THREE.MeshStandardMaterial({ color: 0xcfd3d6, roughness: 0.8 }),
      [vx + vr * 4, H_LID + C.ventRise - 0.085, vz],
    ),
  );
  // rubber grommet where the feed pipe goes through
  const grommet = mesh(new THREE.TorusGeometry(0.02, 0.007, 8, 18), MAT.rubber(), [-C.feedInlet, H_LID + 0.005, 0]);
  grommet.rotation.x = Math.PI / 2;
  g.add(grommet);
  const anchor = new THREE.Object3D();
  anchor.name = 'anchor-tank-lid';
  anchor.position.set(C.manholeX, H_LID + 0.4, C.manholeZ);
  g.add(anchor);
  return { group: g, anchor };
}

// ------------------------------------------------------------------------------------------------ intake screen

export interface Screen {
  group: THREE.Group;
  anchor: THREE.Object3D;
}

/** X range of the basket, and the height of the top of the plate. */
export const SCREEN_X1 = R - C.screenStub;
export const SCREEN_X0 = SCREEN_X1 - C.screenLength;
export const PLATE_Y = OUT_Y + C.screenDiameter / 2 + C.vortexGap;

export function buildIntakeScreen(detail: Detail): Screen {
  const g = group('intake-screen');
  const r = C.screenDiameter / 2;
  const mat = perforatedSteel(36, 18);
  // the basket: a perforated tube closed at its far end, with two bands, hanging on a stub of the drive pipe
  const body = mesh(new THREE.CylinderGeometry(r, r, C.screenLength, lowRes(detail, 28, 18), 1, true), mat);
  body.rotation.z = Math.PI / 2;
  body.position.set((SCREEN_X0 + SCREEN_X1) / 2, OUT_Y, 0);
  body.castShadow = false;
  g.add(body);
  const inox = MAT.inox();
  g.add(
    mesh(new THREE.CylinderGeometry(r, r, 0.01, lowRes(detail, 28, 18)), inox, [SCREEN_X0 - 0.002, OUT_Y, 0]),
  ).rotation.z = Math.PI / 2;
  for (const x of [SCREEN_X0 + 0.012, SCREEN_X1 - 0.012]) {
    const band = mesh(new THREE.CylinderGeometry(r + 0.003, r + 0.003, 0.014, lowRes(detail, 28, 18), 1, true), inox, [
      x,
      OUT_Y,
      0,
    ]);
    band.rotation.z = Math.PI / 2;
    g.add(band);
  }
  // the stub from the basket to the wall, the same 33.7 mm steel tube as the drive pipe
  g.add(rodX(SCREEN_X1, R + 0.004, SITE.driveOuterDiameter / 2, MAT.zinc(), OUT_Y, 0, 16));
  // anti-vortex plate on three legs, standing on the floor
  const plateX = (SCREEN_X0 + SCREEN_X1) / 2;
  const plate = mesh(new THREE.CylinderGeometry(C.vortexDiameter / 2, C.vortexDiameter / 2, 0.004, 32), MAT.aluDark(), [
    plateX,
    PLATE_Y + 0.002,
    0,
  ]);
  g.add(plate);
  for (let i = 0; i < 3; i++) {
    const a = (90 + i * 120) * DEG;
    g.add(
      rodY(
        C.sludgeDepth * 0.5,
        PLATE_Y,
        0.005,
        MAT.steel(),
        plateX + Math.cos(a) * (C.vortexDiameter / 2 - 0.02),
        Math.sin(a) * (C.vortexDiameter / 2 - 0.02),
        8,
      ),
    );
  }
  const anchor = new THREE.Object3D();
  anchor.name = 'anchor-intake-screen';
  anchor.position.set(plateX - 0.2, PLATE_Y, 0);
  g.add(anchor);
  return { group: g, anchor };
}

// ------------------------------------------------------------------------------------------------ drive gate valve

export interface Gate {
  group: THREE.Group;
  /** Stem and wheel, lifted by `gateStemRise` when the valve is open; the wheel turns around Y. */
  rising: THREE.Group;
  wheel: THREE.Group;
  anchor: THREE.Object3D;
}

/** X range of the valve body on the outlet. */
export const GATE_X0 = R_OUT + 0.068;
export const GATE_X1 = GATE_X0 + C.gateBodyLength;

export function buildGateValve(detail: Detail): Gate {
  const g = group('drive-gate-valve');
  const rp = SITE.driveOuterDiameter / 2;
  const zinc = MAT.zinc();
  const brass = MAT.brass();
  const seg = lowRes(detail, 24, 14);
  // nipples either side of the body, with a union nut each, then the body (a barrel with a bonnet)
  g.add(rodX(R_OUT + 0.003, GATE_X0 + 0.004, rp, zinc, OUT_Y, 0, seg));
  g.add(rodX(GATE_X1 - 0.004, OUT_X, rp, zinc, OUT_Y, 0, seg));
  const bodyR = C.gateBodyDiameter / 2;
  const barrel = mesh(new THREE.SphereGeometry(bodyR, seg, Math.round(seg * 0.7)), brass, [
    (GATE_X0 + GATE_X1) / 2,
    OUT_Y,
    0,
  ]);
  barrel.scale.set(C.gateBodyLength / 2 / bodyR, 1, 1);
  g.add(barrel);
  for (const x of [GATE_X0, GATE_X1]) {
    const nut = mesh(new THREE.CylinderGeometry(bodyR * 0.82, bodyR * 0.82, 0.016, 6), brass, [x, OUT_Y, 0]);
    nut.rotation.z = Math.PI / 2;
    g.add(nut);
  }
  const cx = (GATE_X0 + GATE_X1) / 2;
  const bonnetR = 0.016;
  g.add(rodY(OUT_Y + bodyR * 0.6, OUT_Y + C.gateBonnetHeight, bonnetR, brass, cx, 0, seg));
  const packing = mesh(new THREE.CylinderGeometry(bonnetR * 1.25, bonnetR * 1.25, 0.014, 6), brass, [
    cx,
    OUT_Y + C.gateBonnetHeight + 0.007,
    0,
  ]);
  g.add(packing);
  // rising stem and the red hand wheel (they move together: rising stem)
  const rising = new THREE.Group();
  rising.name = 'gate-rising';
  dynamic(rising);
  rising.position.set(cx, OUT_Y + C.gateBonnetHeight + 0.014, 0);
  const stemH = C.gateStemRise + 0.02;
  rising.add(rodY(-0.012, stemH, 0.005, MAT.inox(), 0, 0, 10));
  const wheel = new THREE.Group();
  wheel.position.y = C.gateStemRise;
  const wr = C.gateWheelDiameter / 2;
  const red = MAT.redPaint();
  const rim = mesh(new THREE.TorusGeometry(wr - 0.004, 0.0045, 8, lowRes(detail, 28, 16)), red);
  rim.rotation.x = Math.PI / 2;
  wheel.add(rim);
  wheel.add(mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.014, 10), red, [0, 0.003, 0]));
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const spoke = mesh(new THREE.BoxGeometry(wr * 2 - 0.016, 0.006, 0.007), red);
    spoke.rotation.y = a + Math.PI / 4;
    if (i < 2) wheel.add(spoke);
  }
  wheel.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.012, 6), MAT.steel(), [0, 0.012, 0]));
  rising.add(wheel);
  g.add(rising);
  const anchor = new THREE.Object3D();
  anchor.name = 'anchor-drive-gate-valve';
  anchor.position.set(1.65, 1.3, 0);
  g.add(anchor);
  return { group: g, rising, wheel, anchor };
}

// ------------------------------------------------------------------------------------------------ tank drain

export interface Drain {
  group: THREE.Group;
  /** Lever of the ball valve: aligned with the pipe when open, across it when closed. */
  lever: THREE.Group;
  /** Centre line of the drain pipe, from the wall to the mouth over the ditch. */
  path: THREE.Vector3[];
  /** The mouth (where the drain pours out). */
  mouth: THREE.Vector3;
  anchor: THREE.Object3D;
}

export function buildDrain(detail: Detail): Drain {
  const g = group('tank-drain');
  const seg = lowRes(detail, 12, 8);
  const pvc = MAT.pvcGrey();
  const rp = C.drainDiameter / 2;
  const y = C.drainAxisHeight;
  // wall nipple, ball valve (lever on top), then the pipe east under the drive pipe, south to the ditch, east into its head
  const x0 = R_OUT + 0.001;
  const xv0 = R_OUT + 0.034;
  const xv1 = xv0 + C.drainValveLength;
  g.add(rodX(x0, xv0 + 0.012, rp * 0.9, pvc, y, 0, seg));
  const body = mesh(
    new THREE.CylinderGeometry(rp * 1.45, rp * 1.45, C.drainValveLength, lowRes(detail, 20, 12)),
    MAT.pvcDark(),
  );
  body.rotation.z = Math.PI / 2;
  body.position.set((xv0 + xv1) / 2, y, 0);
  body.userData.noClip = true;
  g.add(body);
  for (const x of [xv0, xv1]) {
    const col = mesh(new THREE.CylinderGeometry(rp * 1.25, rp * 1.25, 0.018, 6), MAT.pvcDark(), [x, y, 0]);
    col.rotation.z = Math.PI / 2;
    col.userData.noClip = true;
    g.add(col);
  }
  // lever on a vertical stem in the middle of the valve: along the pipe when open, across it when closed
  const lever = dynamic(new THREE.Group());
  lever.position.set((xv0 + xv1) / 2, y + rp * 1.45, 0);
  const stem = rodY(0, 0.03, 0.007, MAT.steel(), 0, 0, 8);
  stem.userData.noClip = true;
  lever.add(stem);
  const handle = mesh(new THREE.BoxGeometry(0.105, 0.012, 0.024), MAT.pvcRed(), [0.045, 0.034, 0]);
  handle.userData.noClip = true;
  lever.add(handle);
  g.add(lever);
  const gz = C.gutterZ;
  const mouth = v3(C.gutterStart + 0.2, y, gz);
  const pts = [
    v3(xv1 + 0.01, y, 0),
    v3(C.drainTurnX, y, 0),
    v3(C.drainTurnX, y, gz),
    v3(mouth.x - 0.1, y, gz),
    mouth.clone(),
  ];
  g.add(pipe(pts, rp, pvc, 0.08, seg));
  // blocks under the pipe, which lies 0.08 m above the bench
  const conc = MAT.concrete();
  for (const [bx, bz] of [
    [C.drainTurnX, 0.8],
    [C.drainTurnX + 0.25, gz],
  ] as [number, number][]) {
    g.add(boxBetween(bx - 0.07, groundY(bx, bz) - 0.02, bz - 0.06, bx + 0.07, y - rp, bz + 0.06, conc));
  }
  const anchor = new THREE.Object3D();
  anchor.name = 'anchor-tank-drain';
  anchor.position.set(xv1 + 0.06, 0.5, 0);
  g.add(anchor);
  return { group: g, lever, path: [v3(R - 0.02, y, 0), ...pipeLine(pts, 0.08, 0.1)], mouth, anchor };
}

// ------------------------------------------------------------------------------------------------ overflow and ditch

export interface Overflow {
  group: THREE.Group;
  /** Centre line of the overflow from its inlet in the tank to the mouth over the ditch. */
  path: THREE.Vector3[];
  /** The mouth, over the head of the ditch. */
  mouth: THREE.Vector3;
  /** Centre line of the gutter bottom, from its head to the end of the block. */
  gutterPath(): THREE.Vector3[];
  /** Re-lay the gutter on the ground (`ground(x, z)` gives the height at a TANK-frame position). */
  layGutter(ground: (x: number, z: number) => number, xEnd: number): void;
  anchor: THREE.Object3D;
}

export function buildOverflow(detail: Detail): Overflow {
  const g = group('overflow-pipe');
  const seg = lowRes(detail, 12, 8);
  const pvc = MAT.pvcGrey();
  const rp = C.overflowDiameter / 2;
  const az = C.overflowAzimuthDeg;
  const [ux, uz] = [Math.cos(az * DEG), Math.sin(az * DEG)];
  const yIn = H_FULL + (C.overflowDiameter - 0.006) / 2; // invert of the opening = the overflow level
  const rv = R_OUT + 0.02 + rp; // the down pipe stands against the wall
  const yMouth = C.overflowDischargeHeight;
  const rEnd = C.overflowDischargeRadius;
  const mouth = v3(C.gutterStart + 0.3, yMouth, uz * rEnd);
  const pts = [
    v3(ux * (R - 0.02), yIn, uz * (R - 0.02)),
    v3(ux * rv, yIn, uz * rv),
    v3(ux * rv, yMouth, uz * rv),
    v3(ux * rEnd, yMouth, uz * rEnd),
    v3(mouth.x - 0.1, yMouth, mouth.z),
    mouth.clone(),
  ];
  g.add(pipe(pts, rp, pvc, 0.09, seg));
  // socket rings at the bends and two stainless clamps on the down pipe
  const inox = MAT.inox();
  for (const p of [pts[1], pts[2], pts[3]]) {
    const ring = mesh(new THREE.SphereGeometry(rp * 1.18, 14, 10), pvc, [p.x, p.y, p.z]);
    g.add(ring);
  }
  for (const y of [1.45, 0.75]) {
    const clamp = mesh(new THREE.TorusGeometry(rp + 0.003, 0.004, 6, 16), inox, [ux * rv, y, uz * rv]);
    clamp.rotation.x = Math.PI / 2;
    g.add(clamp);
    const [sx, sz] = [ux * (rv - rp - 0.004), uz * (rv - rp - 0.004)];
    const stand = rodBetween(v3(ux * (R_OUT + 0.002), y, uz * (R_OUT + 0.002)), v3(sx, y, sz), 0.004, inox, 6);
    g.add(stand);
  }
  // concrete post under the horizontal run that hangs over the slope
  const conc = MAT.concrete();
  const px = rEnd * ux + 0.45;
  const gy = groundY(px, mouth.z);
  g.add(boxBetween(px - 0.06, gy - 0.03, mouth.z - 0.06, px + 0.06, yMouth - rp, mouth.z + 0.06, conc));
  // the gutter: a concrete U lying on the ground with a 1 % fall, swept along the line of the ditch (laid by `layGutter`)
  const gutterMesh = new THREE.Mesh(new THREE.BufferGeometry(), MAT.concrete());
  gutterMesh.material.side = THREE.DoubleSide;
  gutterMesh.castShadow = true;
  gutterMesh.receiveShadow = true;
  gutterMesh.name = 'gutter';
  dynamic(gutterMesh); // laid again on the ground when the landscape moves
  g.add(gutterMesh);
  // splash stone in the head of the gutter, under the mouth
  const splash = mesh(new THREE.BoxGeometry(0.2, 0.02, 0.17), MAT.stone(), [mouth.x, 0, mouth.z]);
  splash.rotation.y = 0.3;
  g.add(dynamic(splash)); // `layGutter` sets its height on the ground
  let line: THREE.Vector3[] = [];
  const outerW = C.gutterWidth;
  const w = C.gutterWall;
  const d = C.gutterDepth;
  const profile: [number, number][] = [
    [-outerW / 2, d],
    [-outerW / 2, 0],
    [outerW / 2, 0],
    [outerW / 2, d],
    [outerW / 2 - w, d],
    [outerW / 2 - w, w],
    [-outerW / 2 + w, w],
    [-outerW / 2 + w, d],
    [-outerW / 2, d],
  ];
  const layGutter = (ground: (x: number, z: number) => number, xEnd: number) => {
    const z = C.gutterZ;
    const pts2: THREE.Vector3[] = [];
    const x0 = C.gutterStart;
    const n = Math.max(4, Math.round((xEnd - x0) / 0.25));
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((xEnd - x0) * i) / n;
      // a screed with a 1 % fall to the east on the level part, then the ground itself on the slope
      const y = ground(x, z) + 0.01 * Math.max(0, BEND_X - x);
      pts2.push(v3(x, y, z));
    }
    gutterMesh.geometry.dispose();
    gutterMesh.geometry = sweepProfile(pts2, profile);
    splash.position.y = (pts2[Math.min(2, pts2.length - 1)]?.y ?? 0) + w + 0.01;
    line = pts2.map((p) => p.clone().setY(p.y + w + 0.02));
  };
  layGutter(groundY, 5.2);
  const anchor = new THREE.Object3D();
  anchor.name = 'anchor-overflow-pipe';
  anchor.position.set(ux * rv, 1.52, uz * rv);
  g.add(anchor);
  return {
    group: g,
    path: pipeLine(pts, 0.09, 0.1),
    mouth,
    gutterPath: () => line,
    layGutter,
    anchor,
  };
}

// ------------------------------------------------------------------------------------------------ start of the drive pipe

/** The drive pipe from the end of the gate valve down the slope, on two concrete saddles (decoration of the catchment world). */
export function buildDriveStub(xEnd: number): {
  group: THREE.Group;
  path: THREE.Vector3[];
  material: THREE.MeshStandardMaterial;
} {
  const g = group('drive-stub');
  const k = SITE.driveOuterDiameter / 2;
  const slope = C.driveSlope;
  const yAxis = (x: number) => OUT_Y - slope * Math.max(0, x - BEND_X);
  const pts = [v3(OUT_X - 0.03, OUT_Y, 0), v3(BEND_X, OUT_Y, 0), v3(xEnd, yAxis(xEnd), 0)];
  const material = MAT.zinc();
  g.add(pipe(pts, k, material, CORNER, 12));
  const conc = MAT.concrete();
  for (const x of [OUT_X + 0.9, BEND_X + 1.45]) {
    const gy = groundY(x, 0);
    const top = yAxis(x) - k;
    const sad = mesh(new THREE.BoxGeometry(0.5, top - gy + 0.06, 0.28), conc);
    sad.position.set(x, (top + gy - 0.06) / 2, 0);
    // a saddle on the slope stands level, its top follows the pipe
    g.add(sad);
  }
  return { group: g, path: pipeLine(pts, CORNER, 0.15), material };
}
