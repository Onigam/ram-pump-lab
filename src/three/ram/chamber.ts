import * as THREE from 'three';
import { MAT, group, mesh } from '@onigam/lab-kit/three';
import { CHAMBER, CHECK_VALVE, RAM } from '../dims';
import { arc, crispRuns, hexRing, lathe, type Profile } from '../common';
import { mirrored, rect, type Poly } from '../cut';
import type { RamCtx } from './ctx';
import { EXPLODE } from './explode';

// The delivery side: the spring check valve screwed on the body and the air chamber on top of it. Both are hollow so
// that the section shows the seat, the disc and spring, and the cushion of air over the water.

export const CHECK_BASE_Y = 0.062; // top of the delivery boss (the valve stands on it)
const RV = CHECK_VALVE.acrossFlats / 2; // round body radius = apothem of the hex ring
const SEAT_BORE_R = CHECK_VALVE.seatBore / 2;
const SEAT_Y = 0.034;
const CAV_R = 0.0185;
const DISC_R = 0.016;
const DISC_T = 0.004;
const CEIL_Y = 0.066;
const NECK_R = 0.0155;
const SPRING_R = 0.0135;
export const SPRING_REST = 0.0337;

export const CH = {
  R: CHAMBER.diameter / 2,
  H: CHAMBER.shellHeight,
  dome: CHAMBER.domeHeight,
  wall: CHAMBER.wall,
  neckOuter: 0.0185,
  neckBore: NECK_R,
  neckBottom: -0.0485,
  bossOuter: 0.0145,
  bossBore: 0.0095,
  bossHeight: 0.018,
  outletR: 0.0165,
  outletBore: 0.0107,
  outletLength: 0.022,
};
/** Local height (above the shell bottom) of the outlet port. */
export const OUTLET_Y = CHAMBER.outletHeight - CHAMBER.shellBottom;

/**
 * The vessel as revolved runs (smooth along the domes and the shell, crisp at the neck, boss and rims), its closed
 * polygon for the section and the interior profile from the bottom up. Frame: origin at the bottom of the straight shell.
 */
function vesselProfiles() {
  const { R, H, dome, wall } = CH;
  const Ri = R - wall;
  const di = dome - wall;
  const t0 = Math.acos(CH.neckOuter / R);
  const tb = Math.acos(CH.bossOuter / R);
  const ti = Math.acos(CH.neckBore / Ri);
  const tbi = Math.acos(CH.bossBore / Ri);
  const bottomOuter = arc(R, -dome, t0, 0, 12); // neck junction to (R, 0)
  const topOuter = arc(R, dome, 0, tb, 12, 0, H); // (R, H) to the boss junction
  const bottomInner = arc(Ri, -di, ti, 0, 12);
  const topInner = arc(Ri, di, 0, tbi, 12, 0, H);
  const yTop = topOuter[topOuter.length - 1][1] + CH.bossHeight;
  const outerBody: Profile = [...bottomOuter, ...topOuter];
  const innerBody: Profile = [...bottomInner, ...topInner];
  const runs: Profile[] = [
    [[CH.neckOuter, CH.neckBottom], bottomOuter[0]],
    outerBody,
    [topOuter[topOuter.length - 1], [CH.bossOuter, yTop]],
    [
      [CH.bossOuter, yTop],
      [CH.bossBore, yTop],
    ],
    [[CH.bossBore, yTop], topInner[topInner.length - 1]],
    [...innerBody].reverse(),
    [bottomInner[0], [CH.neckBore, CH.neckBottom]],
    [
      [CH.neckBore, CH.neckBottom],
      [CH.neckOuter, CH.neckBottom],
    ],
  ];
  const poly: Profile = [
    [CH.neckOuter, CH.neckBottom],
    ...outerBody,
    [CH.bossOuter, yTop],
    [CH.bossBore, yTop],
    ...[...innerBody].reverse(),
    [CH.neckBore, CH.neckBottom],
  ];
  const innerUp: Profile = [[CH.neckBore, CH.neckBottom], ...innerBody, [CH.bossBore, yTop]];
  return {
    outerRuns: [runs[0], runs[1], runs[2], runs[3], runs[7]],
    innerRuns: [runs[4], runs[5], runs[6]],
    poly,
    innerUp,
    yTop,
  };
}

/** Radius of the water surface at a local height y of the vessel (interior), by interpolation of the profile. */
export function interiorRadius(innerUp: Profile, y: number): number {
  for (let i = 1; i < innerUp.length; i++) {
    const [r0, y0] = innerUp[i - 1];
    const [r1, y1] = innerUp[i];
    if (y >= y0 && y <= y1 && y1 > y0) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
  }
  return innerUp[innerUp.length - 1][0];
}

export interface ChamberGeometry {
  innerUp: Profile;
  yBottom: number;
  yTop: number;
  /** The full interior as a solid of revolution; the water is this volume cut by a horizontal plane. */
  interior: THREE.BufferGeometry;
}

export function buildChamber(ctx: RamCtx): ChamberGeometry {
  const blue = MAT.pvcBlue();
  const steel = MAT.steel();
  const { outerRuns, innerRuns, poly, innerUp, yTop } = vesselProfiles();
  const g = group('air-chamber');
  g.position.set(RAM.xDelivery, CHAMBER.shellBottom, 0);
  const shell = mesh(lathe(outerRuns, 64), blue);
  // the inside of the vessel is bare steel: air and water read against it in the section
  const lining = mesh(lathe(innerRuns, 64), MAT.zinc());
  g.add(shell, lining);
  // weld seam rings at the shell / dome joints
  const seam = MAT.steelBlack();
  for (const y of [0, CH.H]) {
    const bead = mesh(new THREE.TorusGeometry(CH.R + 0.0004, 0.0016, 8, 64), seam, [0, y, 0]);
    bead.rotation.x = Math.PI / 2;
    g.add(bead);
  }
  ctx.cut.clip(g.children[g.children.length - 1]);

  // outlet port on the right side (the delivery pipe leaves here), along +X
  const portY = OUTLET_Y;
  const port = mesh(
    lathe(
      crispRuns([
        [CH.outletBore, 0],
        [CH.outletR, 0],
        [CH.outletR, CH.outletLength + 0.003],
        [CH.outletBore, CH.outletLength + 0.003],
      ]),
      32,
    ),
    steel,
  );
  port.rotation.z = -Math.PI / 2;
  port.position.set(CH.R - 0.003, portY, 0);
  g.add(port);

  ctx.cut.clip(shell);
  ctx.cut.clip(lining);
  ctx.cut.clip(port);
  const polys: Poly[] = [...mirrored(poly)];
  const px0 = CH.R - 0.003;
  polys.push(
    rect(px0, portY + CH.outletBore, px0 + CH.outletLength + 0.003, portY + CH.outletR),
    rect(px0, portY - CH.outletR, px0 + CH.outletLength + 0.003, portY - CH.outletBore),
  );
  ctx.cut.cap('air-chamber', g, polys);
  ctx.anchor('air-chamber', g, -CH.R, 0.2, 0.02);
  ctx.add('air-chamber', g, EXPLODE['air-chamber']);

  // interior volume for the water: the solid of revolution of the inner profile, 0.4 mm inside the lining (no z-fighting)
  const wet = innerUp.map(([r, y]) => [Math.max(0, r - 0.0004), y] as [number, number]);
  const interior = lathe(
    [
      [
        [0, wet[0][1]],
        [wet[0][0], wet[0][1]],
      ],
      wet,
      [
        [wet[wet.length - 1][0], yTop],
        [0, yTop],
      ],
    ],
    64,
  );
  return { innerUp, yBottom: innerUp[0][1], yTop, interior };
}

/** The spring check valve. Returns the geometry of the water inside it (frame: origin at the boss top). */
export function buildCheckValve(ctx: RamCtx): { waterProfile: Profile } {
  const brass = MAT.brass();
  const g = group('delivery-valve');
  g.position.set(RAM.xDelivery, CHECK_BASE_Y, 0);
  const bodyProfile: Profile = [
    [SEAT_BORE_R, -0.012],
    [0.0135, -0.012],
    [0.0135, 0],
    [RV, 0],
    [RV, 0.0775],
    [RV - 0.0025, 0.08],
    [0.015, 0.08],
    [0.015, 0.088],
    [0.0115, 0.088],
    [0.0115, 0.074],
    [CAV_R, CEIL_Y],
    [CAV_R, SEAT_Y],
    [SEAT_BORE_R, SEAT_Y],
  ];
  const body = mesh(lathe(crispRuns(bodyProfile), 48), brass);
  g.add(body);
  g.add(mesh(hexRing(CHECK_VALVE.acrossFlats, 0.026, 2 * (RV - 0.0005)), brass, [0, 0.016, 0]));

  // disc with its rubber seal, on the seat; the spring pushes it down from the ceiling
  const disc = group('disc');
  disc.position.y = SEAT_Y;
  disc.add(mesh(new THREE.CylinderGeometry(DISC_R, DISC_R, DISC_T, 36), MAT.inox(), [0, DISC_T / 2, 0]));
  const seal = mesh(new THREE.TorusGeometry(0.0125, 0.0016, 8, 36), MAT.rubber(), [0, -0.0004, 0]);
  seal.rotation.x = Math.PI / 2;
  disc.add(seal);
  disc.add(mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.006, 16), MAT.inox(), [0, DISC_T + 0.003, 0]));
  g.add(disc);
  ctx.rig.disc = disc;

  // coil spring from the disc top to the ceiling shoulder: a helix of unit-free rest length, squashed in Y with the lift
  const turns = 7;
  const pts: THREE.Vector3[] = [];
  const n = turns * 14;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * turns * Math.PI * 2;
    pts.push(new THREE.Vector3(SPRING_R * Math.cos(a), (i / n) * SPRING_REST, SPRING_R * Math.sin(a)));
  }
  const springGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, 0.0008, 6, false);
  const spring = mesh(springGeo, MAT.steel());
  spring.position.y = SEAT_Y + DISC_T;
  g.add(spring);
  ctx.rig.spring = spring;

  ctx.cut.clip(body);
  ctx.cut.cap('delivery-valve', g, [
    ...mirrored(bodyProfile),
    rect(RV - 0.0005, 0.016, RV + 0.0045, 0.042),
    rect(-RV - 0.0045, 0.016, -RV + 0.0005, 0.042),
  ]);
  ctx.anchor('delivery-valve', g, RV + 0.004, 0.03, 0.0);
  ctx.add('delivery-valve', g, EXPLODE['delivery-valve']);
  const waterProfile: Profile = [
    [0, -0.036],
    [SEAT_BORE_R - 0.0004, -0.036],
    [SEAT_BORE_R - 0.0004, SEAT_Y],
    [CAV_R - 0.0004, SEAT_Y],
    [CAV_R - 0.0004, CEIL_Y],
    [0.0113, 0.074],
    [0.0113, 0.08],
    [0, 0.08],
  ];
  return { waterProfile };
}
