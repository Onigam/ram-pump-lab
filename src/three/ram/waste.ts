import * as THREE from 'three';
import { MAT, group, mesh } from '@onigam/lab-kit/three';
import { RAM, VALVE } from '../dims';
import { DEG, crispRuns, hexRing, lathe, threadedRod, type Profile } from '../common';
import { mirrored, rect, type Poly } from '../cut';
import { squarePlate } from './body';
import { v3, type RamCtx } from './ctx';
import {
  BORE_LOW,
  BORE_UP,
  COLLAR_R,
  CONE_TOP,
  DEFAULT_TRAVEL,
  FINS_BOTTOM,
  HEAD_BASE,
  HEAD_R,
  MALE_R,
  NECK_BOTTOM,
  NIPPLE_BORE,
  NIPPLE_R,
  NIPPLE_TOP,
  PLATE_TOP,
  RED_R,
  ROD_BOTTOM,
  SEAT_TOP,
  SLEEVE_ON_ROD_R,
  SLEEVE_R,
  SLEEVE_TOP,
  SLOT_HALF,
  SOCKET_R,
  STACK_Y,
  T,
  TUBE_BORE,
  TUBE_R,
  nippleBar,
  placeTail,
} from './wastegeo';

// The waste valve of the video (research §3), valve n°1, built in a frame whose origin is the top face of the base
// plate and whose Y is the height above it (the numbers of `VALVE`). The stem hangs on its weight and closes upwards on
// the conical seat, so the model is built in the CLOSED pose and the stem frame is lowered by `lift` when it opens.
//
//   base plate + welded 26x34 socket  ->  reduction 26x34 to 15x21  ->  nipple 15x21 with four exhaust ports
//   (lock nut at the reduction)  ->  15x21 female-female sleeve  ->  thermowell guide (open tube + collar)
//   stem: M6 rod, machined sleeves in the guide bore, stainless countersunk head on the seat, fins nut under it
//   on the rod above the guide: counterweight (rebar, lands on the guide), stroke nut, lock nut

export function buildWaste(ctx: RamCtx): void {
  const at = (g: THREE.Object3D) => g.position.set(RAM.xWaste, PLATE_TOP, 0);
  const rig = ctx.rig;
  const zincCut = MAT.zinc();
  const zinc = MAT.zinc();
  const inox = MAT.inox();
  const brass = MAT.brass();
  const steelCut = MAT.steel();
  const dark = MAT.steelBlack();

  // ================================================================= base plate (+ welded socket, studs, nuts)
  const plate = group('base-plate');
  at(plate);
  plate.add(
    mesh(squarePlate(VALVE.basePlateSide, VALVE.basePlateThickness, BORE_LOW, -VALVE.basePlateThickness), steelCut),
  );
  const socket = mesh(
    lathe(
      crispRuns([
        [SOCKET_R, 0],
        [SOCKET_R, VALVE.weldedFittingHeight],
        [MALE_R, VALVE.weldedFittingHeight],
        [MALE_R, 0],
      ]),
      40,
    ),
    steelCut,
  );
  plate.add(socket);
  const bead = mesh(new THREE.TorusGeometry(SOCKET_R + 0.0012, 0.0016, 8, 40), MAT.steelBlack(), [0, 0.0012, 0]);
  bead.rotation.x = Math.PI / 2;
  plate.add(bead);
  ctx.cut.clip(bead);
  for (const [sx, sz] of [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ]) {
    const x = sx * 0.035;
    const z = sz * 0.035;
    plate.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.036, 10), dark, [x, -0.002, z]));
    plate.add(mesh(hexRing(0.013, 0.007, 0), zinc, [x, 0.0005, z]));
  }
  ctx.cut.clip(socket);
  ctx.cut.cap('base-plate', plate, [
    rect(-VALVE.basePlateSide / 2, -VALVE.basePlateThickness, -BORE_LOW, 0),
    rect(BORE_LOW, -VALVE.basePlateThickness, VALVE.basePlateSide / 2, 0),
    rect(-SOCKET_R, 0, -MALE_R, VALVE.weldedFittingHeight),
    rect(MALE_R, 0, SOCKET_R, VALVE.weldedFittingHeight),
  ]);
  ctx.anchor('base-plate', plate, 0.05, -0.004, 0.05);
  ctx.add('base-plate', plate, v3(0, 0.1, 0));

  // ================================================================= the assembly
  const wv = group('waste-valve');
  at(wv);

  // ---- valve seat ring (child): a conical chamfer machined at the angle of the head
  const seat = group('valve-seat');
  const bottomR = HEAD_R + 0.0001;
  const chamferTop = VALVE.nippleBottom + (bottomR - NIPPLE_BORE);
  const seatProfile: Profile = [
    [bottomR, VALVE.nippleBottom],
    [NIPPLE_R, VALVE.nippleBottom],
    [NIPPLE_R, SEAT_TOP],
    [NIPPLE_BORE, SEAT_TOP],
    [NIPPLE_BORE, chamferTop],
  ];
  const seatMesh = mesh(lathe(crispRuns(seatProfile), 40), MAT.brass());
  seat.add(seatMesh);
  ctx.cut.clip(seatMesh);
  ctx.cut.cap('valve-seat', seat, mirrored(seatProfile));
  ctx.anchor('valve-seat', seat, 0.0105, VALVE.nippleBottom + 0.002, 0);
  wv.add(seat);

  // ---- thermowell guide (child): an open tube hanging from its collar, the end face is the stop of the weight
  const guide = group('valve-guide');
  const guideProfile: Profile = [
    [TUBE_BORE, VALVE.guideTubeBottom],
    [TUBE_R, VALVE.guideTubeBottom],
    [TUBE_R, NECK_BOTTOM],
    [NIPPLE_R, NECK_BOTTOM],
    [NIPPLE_R, SLEEVE_TOP],
    [COLLAR_R, SLEEVE_TOP],
    [COLLAR_R, VALVE.guideTop],
    [TUBE_BORE, VALVE.guideTop],
  ];
  const guideMesh = mesh(lathe(crispRuns(guideProfile), 32), MAT.inox());
  guide.add(guideMesh);
  ctx.cut.clip(guideMesh);
  ctx.cut.cap('valve-guide', guide, mirrored(guideProfile));
  ctx.anchor('valve-guide', guide, 0.0125, VALVE.guideTop - 0.004, 0);
  wv.add(guide);

  // ---- the stem (child): M6 rod, machined sleeves, countersunk head
  const stem = group('valve-stem');
  const stemMotion = group('stem-motion');
  rig.stemFrames.push(stemMotion);
  stem.add(stemMotion);
  stemMotion.add(mesh(threadedRod(T, 0.215 - ROD_BOTTOM, 0.001, 10), inox, [0, ROD_BOTTOM, 0]));
  const tail = mesh(new THREE.CylinderGeometry(T, T, 1, 10), inox);
  stemMotion.add(tail);
  rig.rodTail = tail;
  for (const y0 of [0.12, 0.136]) {
    stemMotion.add(
      mesh(new THREE.CylinderGeometry(SLEEVE_ON_ROD_R, SLEEVE_ON_ROD_R, VALVE.stemSleeveLength, 24), brass, [
        0,
        y0 + VALVE.stemSleeveLength / 2,
        0,
      ]),
    );
  }
  stemMotion.add(
    mesh(
      lathe(
        crispRuns([
          [T, HEAD_BASE],
          [HEAD_R, HEAD_BASE],
          [T, CONE_TOP],
        ]),
        40,
      ),
      inox,
    ),
  );
  ctx.anchor('valve-stem', stem, 0.0, 0.0735, 0.004);
  wv.add(stem);

  // ---- fins nut (child): a hub and four pitched vanes under the head
  const fins = group('valve-fins');
  const finsMotion = group('fins-motion');
  rig.stemFrames.push(finsMotion);
  fins.add(finsMotion);
  const fy = HEAD_BASE - VALVE.finsHeight / 2;
  finsMotion.add(mesh(new THREE.CylinderGeometry(0.0043, 0.0043, VALVE.finsHeight, 16), brass, [0, fy, 0]));
  for (let i = 0; i < VALVE.finsCount; i++) {
    const arm = group('vane');
    arm.rotation.y = (i * Math.PI * 2) / VALVE.finsCount;
    const vane = mesh(new THREE.BoxGeometry(0.0046, VALVE.finsHeight - 0.0006, 0.0012), brass, [0.0066, fy, 0]);
    vane.rotation.x = 32 * DEG;
    arm.add(vane);
    finsMotion.add(arm);
  }
  ctx.anchor('valve-fins', fins, 0.01, FINS_BOTTOM + 0.003, 0);
  wv.add(fins);

  // ---- weight, stroke nut and lock nut (children): stacked on the rod above the guide
  const nutMat = MAT.zinc();
  const stackPart = (id: string, y0: number, build: (b: THREE.Group) => void, ax: number, ay: number): THREE.Group => {
    const g = group(id);
    const motion = group(`${id}-motion`);
    const stack = group(`${id}-stack`);
    rig.stemFrames.push(motion);
    rig.stackFrames.push(stack);
    stack.position.y = DEFAULT_TRAVEL;
    g.add(motion);
    motion.add(stack);
    const body = group(`${id}-body`);
    body.position.y = y0;
    build(body);
    stack.add(body);
    ctx.anchor(id, g, ax, y0 + ay + DEFAULT_TRAVEL, 0.006);
    return g;
  };
  const Lw = VALVE.counterweightLength;
  const weight = stackPart(
    'counterweight',
    STACK_Y,
    (b) => {
      const R = VALVE.counterweightDiameter / 2;
      // rebar: transverse ribs as alternating radii and two longitudinal ribs, tapped on the axis, faced flat
      const n = 20;
      const ribbed: Profile = [];
      for (let i = 0; i <= n; i++) ribbed.push([R - (i % 2 === 0 ? 0.0011 : 0), (Lw * i) / n]);
      const bore = T + 0.0004;
      b.add(
        mesh(
          lathe(
            [
              [
                [bore, 0],
                [R - 0.0011, 0],
              ],
              ribbed,
              [
                [R - 0.0011, Lw],
                [bore, Lw],
              ],
              [
                [bore, Lw],
                [bore, 0],
              ],
            ],
            40,
          ),
          dark,
        ),
      );
      for (const a of [0, Math.PI]) {
        b.add(
          mesh(new THREE.BoxGeometry(0.0022, Lw, 0.0018), dark, [
            (R + 0.0003) * Math.cos(a),
            Lw / 2,
            (R + 0.0003) * Math.sin(a),
          ]),
        );
      }
    },
    VALVE.counterweightDiameter / 2,
    Lw * 0.5,
  );
  const nutGeo = () => hexRing(VALVE.nutAcrossFlats, VALVE.nutThickness, VALVE.rodDiameter + 0.0004);
  const strokeNut = stackPart(
    'stroke-nut',
    STACK_Y + Lw,
    (b) => b.add(mesh(nutGeo(), nutMat)),
    0.005,
    VALVE.nutThickness / 2,
  );
  const lockNut = stackPart(
    'lock-nut',
    STACK_Y + Lw + VALVE.nutThickness,
    (b) => b.add(mesh(nutGeo(), nutMat)),
    0.005,
    VALVE.nutThickness / 2,
  );
  wv.add(weight, strokeNut, lockNut);

  // ================================================================= own meshes of the assembly
  // reduction 26x34 -> 15x21 (male end inside the welded socket, female 15x21 on top)
  const redProfile: Profile = [
    [BORE_LOW, 0],
    [MALE_R, 0],
    [MALE_R, VALVE.weldedFittingHeight],
    [RED_R, VALVE.weldedFittingHeight],
    [RED_R, VALVE.reductionTop - 0.004],
    [RED_R - 0.0045, VALVE.reductionTop],
    [BORE_UP, VALVE.reductionTop],
    [BORE_UP, 0.034],
    [BORE_LOW, 0.026],
  ];
  const red = mesh(lathe(crispRuns(redProfile), 48), zincCut);
  wv.add(red);
  // hex lock nut on the nipple, at the top face of the reduction
  wv.add(
    mesh(hexRing(VALVE.nippleLockNutAcrossFlats, VALVE.nippleLockNutThickness, VALVE.threadDiameter), zincCut, [
      0,
      VALVE.reductionTop,
      0,
    ]),
  );
  // nipple: full tube below the ports, bars between the ports, full tube above
  const lowTop = VALVE.portBottom;
  const upBottom = VALVE.portBottom + VALVE.portHeight;
  const nip = group('nipple');
  nip.add(
    mesh(
      lathe(
        crispRuns([
          [NIPPLE_BORE, SEAT_TOP],
          [NIPPLE_R, SEAT_TOP],
          [NIPPLE_R, lowTop],
          [NIPPLE_BORE, lowTop],
        ]),
        40,
      ),
      zincCut,
    ),
    mesh(
      lathe(
        crispRuns([
          [NIPPLE_BORE, upBottom],
          [NIPPLE_R, upBottom],
          [NIPPLE_R, NIPPLE_TOP],
          [NIPPLE_BORE, NIPPLE_TOP],
        ]),
        40,
      ),
      zincCut,
    ),
  );
  // ports centred on 0, 90, 180 and 270 degrees (towards +Z, +X, -Z, -X)
  const step = (Math.PI * 2) / VALVE.portCount;
  for (let i = 0; i < VALVE.portCount; i++) {
    nip.add(mesh(nippleBar(lowTop, upBottom, i * step + SLOT_HALF, (i + 1) * step - SLOT_HALF), zincCut));
  }
  wv.add(nip);
  // female-female sleeve
  const sleeveProfile: Profile = [
    [NIPPLE_R, VALVE.sleeveBottom],
    [SLEEVE_R, VALVE.sleeveBottom],
    [SLEEVE_R, SLEEVE_TOP],
    [NIPPLE_R, SLEEVE_TOP],
  ];
  wv.add(mesh(lathe(crispRuns(sleeveProfile), 40), zincCut));
  ctx.cut.clip(red);

  // ---- section caps of the assembly's own walls
  const half = VALVE.nippleLockNutAcrossFlats / Math.sqrt(3);
  const polys: Poly[] = [
    ...mirrored(redProfile),
    rect(NIPPLE_R, VALVE.reductionTop, half, VALVE.reductionTop + VALVE.nippleLockNutThickness),
    rect(-half, VALVE.reductionTop, -NIPPLE_R, VALVE.reductionTop + VALVE.nippleLockNutThickness),
    ...mirrored(sleeveProfile),
  ];
  // the nipple wall is interrupted by the ports at 90 and 270 degrees, which the section plane crosses
  for (const [y0, y1] of [
    [SEAT_TOP, lowTop],
    [upBottom, NIPPLE_TOP],
  ]) {
    polys.push(rect(NIPPLE_BORE, y0, NIPPLE_R, y1), rect(-NIPPLE_R, y0, -NIPPLE_BORE, y1));
  }
  ctx.cut.cap('waste-valve', wv, polys);
  ctx.anchor('waste-valve', wv, 0.0, VALVE.portBottom + VALVE.portHeight / 2, 0.012);

  // assembled pose: the valve hangs open on its weight
  for (const f of rig.stemFrames) f.position.y = -DEFAULT_TRAVEL;
  placeTail(tail, DEFAULT_TRAVEL);

  // The assembly is registered after its children (the registry keeps their meshes apart). Absolute offsets along the
  // stack axis at explode 1: the stem leaves downwards (its head cannot pass the seat), the rest upwards, bottom first;
  // children are relative to their parent.
  const parentAbs = 0.2;
  const rel = (abs: number) => v3(0, abs - parentAbs, 0);
  ctx.add('valve-seat', seat, rel(0.15));
  ctx.add('valve-guide', guide, rel(0.34));
  ctx.add('valve-stem', stem, rel(-0.02));
  ctx.add('valve-fins', fins, rel(-0.045));
  ctx.add('counterweight', weight, rel(0.5));
  ctx.add('stroke-nut', strokeNut, rel(0.6));
  ctx.add('lock-nut', lockNut, rel(0.66));
  ctx.add('waste-valve', wv, v3(0, parentAbs, 0));
}
