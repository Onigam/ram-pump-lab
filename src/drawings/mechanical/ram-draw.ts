// The generic 1" ram drawn from outside, in three views (front elevation, plan, end view from the inlet), from the same numbers
// as the 3D builders (three/ram/*). Frame of the ram: x along the body from the inlet flange face of the body, y up from the body
// axis, z towards the viewer of the front elevation. Each function draws into a View whose model coordinates are
// (x, y) for the elevation, (x, -z) for the plan (the front of the ram at the bottom) and (z, y) for the end view.
import { COLORS, INK_2, W, type Pt, type Stroke, type View } from '@onigam/lab-kit/drawings';
import { DERIVED } from '../../data/parts/ram';
import { FITTINGS } from '../../three/dims';
import { dialAngle } from '../../three/ram/dial';
import { STROKE } from '../../data/part-helpers';
import { PAPER, hatched, hexagon, med, nutSide, poly, silH, silV, thin } from './draw';
import {
  CH_MM,
  CHECK_BASE,
  COVER_END,
  COVER_T,
  CV,
  DRAIN_Y,
  FOOT_X,
  PIPE_FLANGE_X0,
  R,
  S_X0,
  V,
  V1_X0,
  chamberSection,
  corner,
  k,
  stack,
} from './geom';

const SNIFTER = {
  boss: 12,
  bossTop: 50,
  thread: 4.3,
  hexAF: k(FITTINGS.snifterDiameter),
  hexT: 10,
  bodyR: 6.5,
  bodyL: 12,
  domeR: 7.2,
};
/** Cut of the drive pipe stub on the sheets: the stub stands for the 20 m of pipe from the tank. */
export const STUB_CUT = -420;
export const OUTLET_X0 = R.xDelivery + CH_MM.R - 3 + 12;
export const OUTLET_VALVE_X = OUTLET_X0 + 40;
export const UNION_X = OUTLET_VALVE_X + R.smallValveL;
export const PIPE_END_X = UNION_X + R.outletStubL;
export const GAUGE_TOP = CH_MM.shellBottom + chamberSection().yTop + 27 + R.gaugeD;
export const FOUNDATION_BOTTOM = R.floorY - R.padT;
export const VALVE_TOP = R.plateTop + stack(STROKE).rodTop;

const dash: Stroke = { w: W.thin, dash: 'hidden', color: INK_2 };

/** The waste valve, outside, standing on the plate (frame: centre of the top face of the plate at (cx, y0)). */
function valveOutside(v: View, cx: number, y0: number): void {
  const st = stack(STROKE);
  v.rect([cx - V.plateHalf, y0 - V.plateT], [cx + V.plateHalf, y0], med());
  for (const sx of [1, -1]) {
    nutSide(v, cx + sx * V.holeQ, y0, 7.5, 7, med());
    v.rect([cx + sx * V.holeQ - 4, y0 + 7], [cx + sx * V.holeQ + 4, y0 + 16], thin());
  }
  v.rect([cx - V.socketR, y0], [cx + V.socketR, y0 + V.socketH], med());
  poly(
    v,
    silV(
      [
        [V.redR, y0 + V.socketH],
        [V.redR, y0 + V.redTaper],
        [V.redTopR, y0 + V.redTop - 4],
        [V.redTopR, y0 + V.redTop],
      ],
      cx,
    ),
    med(),
  );
  nutSide(v, cx, y0 + V.redTop, corner(V.lockAF) * 0.87, V.lockT, med());
  v.rect([cx - V.threadR, y0 + V.redTop + V.lockT], [cx + V.threadR, y0 + V.sleeveBottom], med());
  v.rect([cx - V.portW / 2, y0 + V.portBottom], [cx + V.portW / 2, y0 + V.portTop], thin());
  v.rect([cx - V.sleeveR, y0 + V.sleeveBottom], [cx + V.sleeveR, y0 + V.sleeveTop], med());
  v.rect([cx - V.collarR, y0 + V.sleeveTop], [cx + V.collarR, y0 + V.guideTop], med());
  v.rect([cx - V.rodR, y0 + V.guideTop], [cx + V.rodR, y0 + st.nut0], thin());
  nutSide(v, cx, y0 + st.nut0, V.nutAF / 2, V.nutT, med());
  v.rect([cx - V.weightR, y0 + st.weight0], [cx + V.weightR, y0 + st.weight1], med());
  nutSide(v, cx, y0 + st.weight1, V.nutAF / 2, V.nutT, med());
  v.rect([cx - V.rodR, y0 + st.lock1], [cx + V.rodR, y0 + st.rodTop], thin());
  v.center([cx, y0 - 14], [cx, y0 + st.rodTop + 6]);
}

interface BallValve {
  x0: number;
  cy: number;
  length: number;
  endR: number;
  bulgeR: number;
  bulgeLen: number;
  flangeR?: number;
  flangeT?: number;
  lever: 'along' | 'across';
}

/** Ball valve along +X in the elevation. */
function ballValve(v: View, o: BallValve): void {
  const ft = o.flangeT ?? 0;
  const mid = o.length / 2;
  const half = o.bulgeLen / 2;
  const a = ft || o.length * 0.12;
  const e = o.endR;
  const b = o.bulgeR;
  const prof: Pt[] = [
    [0, e],
    [a, e],
    [mid - half, e + (b - e) * 0.5],
    [mid - half / 2, b],
    [mid + half / 2, b],
    [mid + half, e + (b - e) * 0.5],
    [o.length - a, e],
    [o.length, e],
  ];
  const shifted = prof.map(([x, r]): Pt => [o.x0 + x, r]);
  poly(v, silH(shifted, o.cy), med());
  if (o.flangeR) {
    v.rect([o.x0, o.cy - o.flangeR], [o.x0 + ft, o.cy + o.flangeR], med());
    v.rect([o.x0 + o.length - ft, o.cy - o.flangeR], [o.x0 + o.length, o.cy + o.flangeR], med());
  }
  const top = o.cy + b;
  const mx = o.x0 + mid;
  v.rect([mx - 5.5, top - 3], [mx + 5.5, top + 27], thin());
  v.rect([mx - 11, top - 2], [mx + 11, top + 8], med());
  const barLen = Math.max(70, b * 2.2);
  if (o.lever === 'along') {
    v.rect([mx - 0.2 * barLen, top + 22], [mx + 0.8 * barLen, top + 26], med());
    v.rect([mx + 0.72 * barLen - 18, top + 16], [mx + 0.72 * barLen + 18, top + 32], med(COLORS.red + '33'));
  } else {
    v.rect([mx - 6, top + 22], [mx + 6, top + 26], med());
    v.circle([mx, top + 24], 8, med(COLORS.red + '33'));
  }
}

/** Y-strainer: run, flanges and the screen holder at 45 degrees downstream and down. */
function strainer(v: View): void {
  const L = R.strainerL;
  const ft = R.inletFlangeT;
  const x0 = S_X0;
  const prof: Pt[] = [
    [0, R.inletFlangeR],
    [ft, R.inletFlangeR],
    [ft, 33.5],
    [ft + 30, 36],
    [L - ft - 30, 36],
    [L - ft, 33.5],
    [L - ft, R.inletFlangeR],
    [L, R.inletFlangeR],
  ];
  poly(v, silH(prof.map(([x, r]): Pt => [x0 + x, r])), med());
  const cx = x0 + L / 2;
  const d: Pt = [Math.SQRT1_2, -Math.SQRT1_2];
  const n: Pt = [Math.SQRT1_2, Math.SQRT1_2];
  const quad = (u0: number, u1: number, w: number, s: Stroke): void => {
    const pt = (u: number, ww: number): Pt => [cx + u * d[0] + ww * n[0], u * d[1] + ww * n[1]];
    poly(v, [pt(u0, -w), pt(u1, -w), pt(u1, w), pt(u0, w)], s);
  };
  quad(20, 70, 27, med());
  quad(70, 82, 30.5, med());
  quad(82, 94, 18, med());
}

/** Bolt heads on the upstream face of a flange joint, in the elevation. */
function boltHeads(v: View, xFace: number): void {
  for (const s of [1, -1]) v.rect([xFace - 7, s * 30 - 6.5], [xFace, s * 30 + 6.5], med());
}

// ------------------------------------------------------------------------------------------------ front elevation

export function elevation(v: View): void {
  const xW = R.xWaste;
  const xS = R.xSnifter;
  const xD = R.xDelivery;
  const ch = chamberSection();
  // foundation and feet
  const c = R.padChamfer;
  poly(
    v,
    [
      [-40, FOUNDATION_BOTTOM],
      [-40 + R.padL, FOUNDATION_BOTTOM],
      [-40 + R.padL, R.floorY - c],
      [-40 + R.padL - c, R.floorY],
      [-40 + c, R.floorY],
      [-40, R.floorY - c],
    ],
    hatched('earth', W.medium),
  );
  for (const fx of FOOT_X) {
    v.line([fx - 5, R.floorY - R.studEmbed], [fx - 5, R.floorY], dash);
    v.line([fx + 5, R.floorY - R.studEmbed], [fx + 5, R.floorY], dash);
    v.rect([fx - 5, R.floorY], [fx + 5, R.floorY + R.studH], med());
    v.rect([fx - 55, R.floorY], [fx + 55, R.floorY + 12], med());
    v.rect([fx - 30, R.floorY + 12], [fx + 30, -R.bodyR + 6], med());
    v.rect([fx - R.washerD / 2, R.floorY + 12], [fx + R.washerD / 2, R.floorY + 12 + R.washerT], med());
    nutSide(v, fx, R.floorY + 12 + R.washerT, corner(R.nutAF), R.nutT, med());
  }
  // body, flanges, blind cover, drain boss
  const fR = R.flangeR;
  poly(
    v,
    [
      [0, fR],
      [R.flangeT, fR],
      [R.flangeT, R.bodyR],
      [R.L - R.flangeT, R.bodyR],
      [R.L - R.flangeT, fR],
      [R.L + COVER_T, fR],
      [R.L + COVER_T, -fR],
      [R.L - R.flangeT, -fR],
      [R.L - R.flangeT, -R.bodyR],
      [R.flangeT, -R.bodyR],
      [R.flangeT, -fR],
      [0, -fR],
    ],
    med(),
  );
  v.line([R.L, -fR], [R.L, fR], { w: W.thin });
  v.rect([R.L + COVER_T, DRAIN_Y - 17], [COVER_END, DRAIN_Y + 17], med());
  for (const s of [1, -1]) v.rect([R.L + COVER_T, s * 30 - 6.5], [R.L + COVER_T + 7, s * 30 + 6.5], med());
  // branches: waste (boss and square flange), snifter boss, delivery boss
  v.rect([xW - 31, R.bodyR - 0.5], [xW + 31, R.wasteFlangeTop - 12], med());
  v.rect([xW - R.wasteFlangeSide / 2, R.wasteFlangeTop - 12], [xW + R.wasteFlangeSide / 2, R.wasteFlangeTop], med());
  v.rect([xS - SNIFTER.boss, R.bodyR - 0.5], [xS + SNIFTER.boss, SNIFTER.bossTop], med());
  v.rect([xD - 34, R.bodyR - 0.5], [xD + 34, CHECK_BASE], med());
  // the waste valve on its plate
  valveOutside(v, xW, R.plateTop);
  // snifter
  const sy = SNIFTER.bossTop;
  v.rect([xS - SNIFTER.hexAF / 2, sy], [xS + SNIFTER.hexAF / 2, sy + SNIFTER.hexT], med());
  v.rect([xS - SNIFTER.bodyR, sy + SNIFTER.hexT], [xS + SNIFTER.bodyR, sy + SNIFTER.hexT + SNIFTER.bodyL], med());
  v.arc([xS, sy + 22], SNIFTER.domeR, 0, 180, { w: W.medium });
  v.rect([xS - 1.1, sy + 26], [xS + 1.1, sy + 33], thin());
  v.circle([xS, sy + 33.2], 2.1, thin());
  v.center([xS, -R.bodyR - 6], [xS, sy + 42]);
  // delivery check valve: hexagonal body, neck
  const yb = CHECK_BASE;
  poly(
    v,
    [
      [xD - CV.rv, yb],
      [xD + CV.rv, yb],
      [xD + CV.rv, yb + 77.5],
      [xD + CV.rv - 2.5, yb + 80],
      [xD + 15, yb + 80],
      [xD + 15, yb + 88],
      [xD - 15, yb + 88],
      [xD - 15, yb + 80],
      [xD - CV.rv + 2.5, yb + 80],
      [xD - CV.rv, yb + 77.5],
    ],
    med(),
  );
  v.rect([xD - 28.9, yb + 16], [xD + 28.9, yb + 42], med());
  // chamber: pressed vessel, weld seams, outlet port
  const sh = CH_MM.shellBottom;
  poly(
    v,
    silV(ch.outer, xD).map(([x, y]): Pt => [x, y + sh]),
    med(),
  );
  for (const y of [0, CH_MM.H]) v.line([xD - CH_MM.R, sh + y], [xD + CH_MM.R, sh + y], { w: W.thin });
  const yo = CH_MM.outletHeight;
  v.rect(
    [xD + CH_MM.R - 3, yo - CH_MM.outletR],
    [xD + CH_MM.R - 3 + CH_MM.outletLength + 3, yo + CH_MM.outletR],
    med(),
  );
  // gauge
  const gy = sh + ch.yTop;
  v.rect([xD - 11, gy], [xD + 11, gy + 12], med());
  v.rect([xD - 7.5, gy + 12], [xD + 7.5, gy + 29], med());
  const gc: Pt = [xD, gy + 27 + R.gaugeD / 2];
  v.circle(gc, R.gaugeD / 2, med());
  v.circle(gc, R.gaugeD / 2 - 2.5, thin());
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI / 2 + dialAngle(i);
    v.line(
      [gc[0] + 24 * Math.cos(a), gc[1] + 24 * Math.sin(a)],
      [gc[0] + 27.5 * Math.cos(a), gc[1] + 27.5 * Math.sin(a)],
      { w: W.thin },
    );
  }
  const ang = Math.PI / 2 + dialAngle(DERIVED.deliveryBar);
  v.line(gc, [gc[0] + 22 * Math.cos(ang), gc[1] + 22 * Math.sin(ang)], { w: W.medium, color: COLORS.red });
  v.circle(gc, 1.8, thin());
  // outlet valve V3, union, pipe
  ballValve(v, {
    x0: OUTLET_VALVE_X,
    cy: yo,
    length: R.smallValveL,
    endR: 12.5,
    bulgeR: 21.5,
    bulgeLen: 42,
    lever: 'along',
  });
  v.rect([OUTLET_X0 - 12, yo - 10.65], [OUTLET_VALVE_X, yo + 10.65], med());
  v.rect([UNION_X, yo - 15], [UNION_X + 10, yo + 15], med());
  v.rect([UNION_X + 10, yo - 18], [UNION_X + 28, yo + 18], med());
  v.rect([UNION_X + 28, yo - 15], [UNION_X + 40, yo + 15], med());
  v.rect([UNION_X + 40, yo - 17], [UNION_X + R.unionL, yo + 17], med());
  v.rect([UNION_X + R.unionL, yo - 12.5], [PIPE_END_X, yo + 12.5], med(COLORS.water + '22'));
  v.line([PIPE_END_X, yo - 12.5], [PIPE_END_X, yo + 12.5], { w: W.thick });
  // drain valve V2 on the cover (lever across) and its hose tail
  ballValve(v, {
    x0: COVER_END + 4,
    cy: DRAIN_Y,
    length: R.smallValveL,
    endR: 12.5,
    bulgeR: 21.5,
    bulgeLen: 42,
    lever: 'across',
  });
  const tail0 = COVER_END + 4 + R.smallValveL;
  v.rect([tail0, DRAIN_Y - 8.5], [tail0 + 30, DRAIN_Y + 8.5], med());
  for (const dx of [12, 24]) v.line([tail0 + dx, DRAIN_Y - 9.5], [tail0 + dx, DRAIN_Y + 9.5], { w: W.medium });
  // inlet side: V1 (flanged ball valve), strainer, bolts, drive pipe flange, gasket, stub cut short
  ballValve(v, {
    x0: V1_X0,
    cy: 0,
    length: R.v1L,
    endR: 30,
    bulgeR: 41,
    bulgeLen: 52,
    flangeR: R.inletFlangeR,
    flangeT: R.inletFlangeT,
    lever: 'along',
  });
  strainer(v);
  boltHeads(v, -R.inletFlangeT - 0);
  boltHeads(v, V1_X0 + R.v1L - R.inletFlangeT - 0);
  boltHeads(v, S_X0 + R.strainerL - R.inletFlangeT);
  boltHeads(v, PIPE_FLANGE_X0);
  const pf = PIPE_FLANGE_X0;
  v.rect([pf, -R.inletFlangeR], [pf + R.inletFlangeT - R.gasketT, R.inletFlangeR], med());
  v.rect([pf + R.inletFlangeT - R.gasketT, -R.inletFlangeR], [S_X0, R.inletFlangeR], { w: W.thin, fill: '#e8e0c8' });
  poly(
    v,
    [
      [pf - 14, R.pipeOR],
      [pf, R.pipeOR + 8],
      [pf, R.pipeOR],
    ],
    med(),
  );
  poly(
    v,
    [
      [pf - 14, -R.pipeOR],
      [pf, -R.pipeOR - 8],
      [pf, -R.pipeOR],
    ],
    med(),
  );
  v.rect([STUB_CUT, -R.pipeOR], [pf - 14, R.pipeOR], med());
  v.polyline(
    [
      [STUB_CUT - 4, -R.pipeOR - 3],
      [STUB_CUT + 2, -R.pipeOR / 3],
      [STUB_CUT - 3, R.pipeOR / 3],
      [STUB_CUT + 4, R.pipeOR + 3],
    ],
    { w: W.thin },
  );
  // centre lines
  v.center([STUB_CUT - 10, 0], [PIPE_END_X + 8, 0]);
  v.center([xD, -R.bodyR - 6], [xD, gy + 27 + R.gaugeD + 6]);
  v.center([FOOT_X[0]!, R.floorY - 8], [FOOT_X[0]!, -R.bodyR]);
  v.center([FOOT_X[1]!, R.floorY - 8], [FOOT_X[1]!, -R.bodyR]);
}

// ------------------------------------------------------------------------------------------------ plan (x, -z)

export function plan(v: View): void {
  const xW = R.xWaste;
  const xS = R.xSnifter;
  const xD = R.xDelivery;
  poly(
    v,
    [
      [-40, -150],
      [-40 + R.padL, -150],
      [-40 + R.padL, 150],
      [-40, 150],
    ],
    hatched('earth', W.medium),
  );
  for (const fx of FOOT_X) {
    v.rect([fx - 55, -65], [fx + 55, 65], med());
    v.rect([fx - 30, -40], [fx + 30, 40], med());
    for (const dz of [-R.studZ, R.studZ]) {
      v.circle([fx, dz], R.washerD / 2, thin());
      hexagon(v, [fx, dz], R.nutAF, med());
      v.circle([fx, dz], R.studR, thin());
    }
  }
  // inlet side
  v.rect([STUB_CUT, -R.pipeOR], [PIPE_FLANGE_X0 - 14, R.pipeOR], med());
  v.rect([PIPE_FLANGE_X0 - 14, -R.pipeOR - 4], [PIPE_FLANGE_X0, R.pipeOR + 4], thin());
  v.rect([PIPE_FLANGE_X0, -R.inletFlangeR], [S_X0, R.inletFlangeR], med());
  poly(
    v,
    silH([
      [S_X0 + R.inletFlangeT, 36],
      [S_X0 + R.strainerL - R.inletFlangeT, 36],
    ]),
    med(),
  );
  v.rect([S_X0, -R.inletFlangeR], [S_X0 + R.inletFlangeT, R.inletFlangeR], med());
  v.rect([V1_X0 - R.inletFlangeT, -R.inletFlangeR], [V1_X0, R.inletFlangeR], med());
  v.rect([V1_X0, -R.inletFlangeR], [V1_X0 + R.inletFlangeT, R.inletFlangeR], med());
  poly(
    v,
    silH([
      [V1_X0 + R.inletFlangeT, 30],
      [V1_X0 + R.inletFlangeT + 21, 35.5],
      [V1_X0 + R.inletFlangeT + 34, 41],
      [V1_X0 + 78, 41],
      [V1_X0 + 91, 35.5],
      [V1_X0 + 112, 30],
    ]),
    med(),
  );
  v.rect([V1_X0 + R.v1L - R.inletFlangeT, -R.inletFlangeR], [V1_X0 + R.v1L, R.inletFlangeR], med());
  v.rect([V1_X0 + 65 - 0.2 * 90.2, -2], [V1_X0 + 65 + 0.8 * 90.2, 2], med());
  // body
  v.rect([0, -R.flangeR], [R.flangeT, R.flangeR], med());
  v.rect([R.L - R.flangeT, -R.flangeR], [R.L + COVER_T, R.flangeR], med());
  v.rect([R.flangeT, -R.bodyR], [R.L - R.flangeT, R.bodyR], med());
  v.line([R.L, -R.flangeR], [R.L, R.flangeR], thin());
  v.rect([R.L + COVER_T, -17], [COVER_END, 17], med());
  // waste branch, valve plate, stack
  v.rect([xW - 50, -50], [xW + 50, 50], med());
  v.circle([xW, 0], 31, thin());
  for (const sx of [1, -1]) for (const sz of [1, -1]) hexagon(v, [xW + sx * V.holeQ, sz * V.holeQ], 13, med());
  v.circle([xW, 0], V.socketR, med());
  v.circle([xW, 0], V.redR, thin());
  v.circle([xW, 0], V.weightR, med());
  hexagon(v, [xW, 0], V.nutAF, med());
  // snifter
  v.circle([xS, 0], SNIFTER.boss, thin());
  hexagon(v, [xS, 0], SNIFTER.hexAF, med());
  v.circle([xS, 0], SNIFTER.domeR, med());
  // delivery valve, chamber, gauge
  v.circle([xD, 0], 34, thin());
  hexagon(v, [xD, 0], CV.rv * 2, thin());
  v.circle([xD, 0], CH_MM.R, med());
  v.circle([xD, 0], CH_MM.R - CH_MM.wall, thin());
  v.rect([xD - R.gaugeD / 2, -12], [xD + R.gaugeD / 2, 16], med());
  v.rect([xD - 11, -11], [xD + 11, 11], thin());
  // outlet valve, union, pipe (z = 0), then the drain valve and its lever across
  const yo = 0;
  v.rect([OUTLET_X0 - 12, yo - 10.65], [OUTLET_VALVE_X, yo + 10.65], med());
  poly(
    v,
    silH([
      [OUTLET_VALVE_X, 12.5],
      [OUTLET_VALVE_X + 14, 12.5],
      [OUTLET_VALVE_X + 26, 21.5],
      [OUTLET_VALVE_X + 52, 21.5],
      [OUTLET_VALVE_X + 61, 12.5],
      [UNION_X, 12.5],
    ]),
    med(),
  );
  v.rect([OUTLET_VALVE_X + 37.5 - 0.2 * 70, -2], [OUTLET_VALVE_X + 37.5 + 0.8 * 70, 2], med());
  v.rect([UNION_X, -15], [UNION_X + 10, 15], med());
  v.rect([UNION_X + 10, -18], [UNION_X + 28, 18], med());
  v.rect([UNION_X + 28, -15], [UNION_X + 40, 15], med());
  v.rect([UNION_X + 40, -17], [UNION_X + R.unionL, 17], med());
  v.rect([UNION_X + R.unionL, -12.5], [PIPE_END_X, 12.5], med());
  poly(
    v,
    silH([
      [COVER_END + 4, 12.5],
      [COVER_END + 18, 12.5],
      [COVER_END + 30, 21.5],
      [COVER_END + 56, 21.5],
      [COVER_END + 65, 12.5],
      [COVER_END + 4 + R.smallValveL, 12.5],
    ]),
    med(),
  );
  v.rect([COVER_END + 4 + 37.5 - 6, -45], [COVER_END + 4 + 37.5 + 6, 45], med());
  v.rect([COVER_END + 4 + R.smallValveL, -8.5], [COVER_END + 4 + R.smallValveL + 30, 8.5], med());
  v.center([STUB_CUT - 10, 0], [PIPE_END_X + 8, 0]);
  v.center([xD, -60], [xD, 60]);
  v.center([xW, -56], [xW, 56]);
  v.center([xS, -20], [xS, 20]);
}

// ------------------------------------------------------------------------------------------------ end view from the inlet (z, y)

export function endView(v: View): void {
  const ch = chamberSection();
  const sh = CH_MM.shellBottom;
  const c = R.padChamfer;
  const half = R.padW / 2;
  poly(
    v,
    [
      [-half, FOUNDATION_BOTTOM],
      [half, FOUNDATION_BOTTOM],
      [half, R.floorY - c],
      [half - c, R.floorY],
      [-half + c, R.floorY],
      [-half, R.floorY - c],
    ],
    hatched('earth', W.medium),
  );
  // feet (lug 130 wide in z, block 80), studs, washers and nuts
  v.rect([-65, R.floorY], [65, R.floorY + 12], med());
  v.rect([-40, R.floorY + 12], [40, -R.bodyR + 6], med());
  for (const sz of [-1, 1]) {
    const z = sz * R.studZ;
    v.rect([z - R.washerD / 2, R.floorY + 12], [z + R.washerD / 2, R.floorY + 12 + R.washerT], med());
    nutSide(v, z, R.floorY + 12 + R.washerT, corner(R.nutAF), R.nutT, med());
    v.rect([z - R.studR, R.floorY + 12 + R.washerT + R.nutT], [z + R.studR, R.floorY + R.studH], thin());
  }
  // chamber, gauge (seen from the side: the dial faces +z), delivery valve, snifter
  poly(
    v,
    silV(ch.outer, 0).map(([x, y]): Pt => [x, y + sh]),
    med(),
  );
  const gy = sh + ch.yTop;
  v.rect([-11, gy], [11, gy + 12], med());
  v.rect([-7.5, gy + 12], [7.5, gy + 29], med());
  v.rect([-16, gy + 27], [12, gy + 27 + R.gaugeD], med());
  v.line([12 + 0.4, gy + 27 + 2], [12 + 0.4, gy + 27 + R.gaugeD - 2], { w: W.thin });
  v.rect([-CV.rv, CHECK_BASE], [CV.rv, CHECK_BASE + 80], med());
  v.rect([-15, CHECK_BASE + 80], [15, CHECK_BASE + 88], med());
  const sy = SNIFTER.bossTop;
  v.rect([-SNIFTER.hexAF / 2, sy], [SNIFTER.hexAF / 2, sy + SNIFTER.hexT + SNIFTER.bodyL], med());
  v.arc([0, sy + 22], SNIFTER.domeR, 0, 180, { w: W.medium });
  // outlet valve, seen end-on
  v.circle([0, CH_MM.outletHeight], 21.5, med());
  v.circle([0, CH_MM.outletHeight], 12.5, thin());
  // waste branch and the valve above it
  v.rect([-31, R.bodyR - 0.5], [31, R.wasteFlangeTop - 12], med());
  valveOutside(v, 0, R.plateTop);
  // body flange, V1, strainer arm, flanges, pipe
  v.rect([-R.bodyR, -R.bodyR], [R.bodyR, R.bodyR], { w: 0, fill: 'none' });
  v.circle([0, 0], R.flangeR, med());
  v.circle([0, 0], R.bodyR, thin());
  const arm0 = 0.7071 * 94;
  v.rect([-18, -arm0], [18, -0.7071 * 82], med());
  v.rect([-30.5, -0.7071 * 82], [30.5, -0.7071 * 70], med());
  v.circle([0, 0], R.inletFlangeR, med());
  v.circle([0, 0], R.boltCircleR, { w: W.thin, dash: 'center', color: INK_2 });
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    hexagon(v, [R.boltCircleR * Math.cos(a), R.boltCircleR * Math.sin(a)], 17, med());
  }
  v.circle([0, 0], R.pipeOR, med(PAPER));
  v.circle([0, 0], R.pipeIR, thin());
  v.circle([0, 0], 41, thin());
  v.center([-70, 0], [70, 0]);
  v.center([0, R.floorY - 8], [0, gy + 27 + R.gaugeD + 6]);
}
