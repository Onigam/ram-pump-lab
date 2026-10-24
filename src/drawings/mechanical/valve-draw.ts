// The waste valve in section on its axis, drawn from dims.ts (through geom.ts) exactly as the 3D builders (three/valve/parts.ts)
// build it. Frame: model mm, origin on the axis at the top face of the base plate, Y up. The closed pose has the head on its
// seat and the weight `s` above the guide; the open pose is the same stack lowered by `s`.
import { COLORS, W, type Pt, type Stroke, type View } from '@onigam/lab-kit/drawings';
import { MOVING, WATER_FILL, hatched, med, nutSide, poly, thin, threadV, PAPER } from './draw';
import { CHAMFER_TOP, CONE_TOP, FINS_BOTTOM, NECK_BOTTOM, ROD_BOTTOM, SEAT_FOOT_R, V, corner, stack } from './geom';

/** Right-hand profile of the reducer (three/valve/parts.ts reducerProfile), [radius, y]. */
export const REDUCER: Pt[] = [
  [V.plateBoreR, 0],
  [V.maleR, 0],
  [V.maleR, V.socketH],
  [V.redR, V.socketH],
  [V.redR, V.redTaper],
  [V.redTopR, V.redTop - 4],
  [V.redTopR, V.redTop],
  [V.redBoreR, V.redTop],
  [V.redBoreR, 34],
  [V.plateBoreR, 26],
];

/** Right-hand profile of the socket (welded 26×34 fitting). */
export const SOCKET: Pt[] = [
  [V.maleR, 0],
  [V.socketR, 0],
  [V.socketR, V.socketH - 1.5],
  [V.socketR - 1.5, V.socketH],
  [V.maleR, V.socketH],
];

/** Right-hand profile of the seat ring: the milled foot of the nipple (three/valve/parts.ts seatProfile). */
export const SEAT: Pt[] = [
  [SEAT_FOOT_R, V.nippleBottom],
  [V.threadR, V.nippleBottom],
  [V.threadR, V.seatTop],
  [V.seatBoreR, V.seatTop],
  [V.seatBoreR, CHAMFER_TOP],
];

/** Right-hand profile of the head (a countersunk screw cut short, drilled for the rod), [radius, y]. */
export const HEAD: Pt[] = [
  [V.rodR, V.headBase],
  [V.headR, V.headBase],
  [V.rodR, CONE_TOP],
];

/** Right-hand profile of the guide (thermowell tube, threaded neck, collar). */
export const GUIDE: Pt[] = [
  [V.tubeBoreR, V.tubeBottom],
  [V.tubeR, V.tubeBottom],
  [V.tubeR, NECK_BOTTOM],
  [V.threadR, NECK_BOTTOM],
  [V.threadR, V.sleeveTop],
  [V.collarR, V.sleeveTop],
  [V.collarR, V.guideTop - 0.8],
  [V.collarR - 0.8, V.guideTop],
  [V.tubeBoreR, V.guideTop],
];

/** Right-hand profile of the sleeve (female-female 15×21). */
export const SLEEVE: Pt[] = [
  [V.threadR, V.sleeveBottom],
  [V.sleeveR - 1, V.sleeveBottom],
  [V.sleeveR, V.sleeveBottom + 1],
  [V.sleeveR, V.sleeveTop - 1],
  [V.sleeveR - 1, V.sleeveTop],
  [V.threadR, V.sleeveTop],
];

const rect = (v: View, x0: number, y0: number, x1: number, y1: number, s: Stroke): void => {
  v.rect([x0, y0], [x1, y1], s);
};

/** The water of the passage, from under the plate to the head, pale blue behind the metal. */
export function waterColumn(v: View, yBottom: number): void {
  const pts: Pt[] = [
    [V.plateBoreR, yBottom],
    [V.plateBoreR, 26],
    [V.redBoreR, 34],
    [V.redBoreR, V.headBase],
  ];
  poly(v, [...pts, ...[...pts].reverse().map(([x, y]): Pt => [-x, y])], { w: 0, fill: WATER_FILL });
}

/** The parts that never move: plate, socket with its weld, reducer, nipple with seat and lock nut, sleeve, guide. */
export function fixedParts(v: View): void {
  const steel = hatched('steel');
  const back = hatched('plastic');
  const inox = hatched('alu');
  // base plate: cut through the bore
  rect(v, -V.plateHalf, -V.plateT, -V.plateBoreR, 0, steel);
  rect(v, V.plateBoreR, -V.plateT, V.plateHalf, 0, steel);
  // reducer first (the socket and the nipple are drawn over its edges)
  for (const sx of [1, -1])
    poly(
      v,
      REDUCER.map(([r, y]): Pt => [sx * r, y]),
      back,
    );
  for (const sx of [1, -1])
    poly(
      v,
      SOCKET.map(([r, y]): Pt => [sx * r, y]),
      steel,
    );
  // weld bead between plate and socket
  for (const sx of [1, -1]) {
    poly(
      v,
      [
        [sx * V.socketR, 0],
        [sx * (V.socketR + 1.8), 0],
        [sx * V.socketR, 1.8],
      ],
      { w: W.thin, fill: COLORS.ink },
    );
  }
  // nipple walls (the ports at +/-X interrupt them), seat ring, lock nut
  for (const sx of [1, -1]) {
    for (const [y0, y1] of [
      [V.seatTop, V.portBottom],
      [V.portTop, V.nippleTop],
    ] as const) {
      rect(v, sx * V.seatBoreR, y0, sx * V.threadR, y1, steel);
    }
    poly(
      v,
      SEAT.map(([r, y]): Pt => [sx * r, y]),
      steel,
    );
    rect(v, sx * V.threadR, V.redTop, sx * corner(V.lockAF), V.redTop + V.lockT, steel);
  }
  v.line([-V.threadR, V.seatTop], [-V.seatBoreR, V.seatTop], { w: W.thin });
  v.line([V.threadR, V.seatTop], [V.seatBoreR, V.seatTop], { w: W.thin });
  // sleeve and guide
  for (const sx of [1, -1])
    poly(
      v,
      SLEEVE.map(([r, y]): Pt => [sx * r, y]),
      back,
    );
  for (const sx of [1, -1])
    poly(
      v,
      GUIDE.map(([r, y]): Pt => [sx * r, y]),
      inox,
    );
}

/**
 * The parts that follow the stem, with `dy` = 0 in the closed pose and -s in the open pose: head, fins nut, rod, stem sleeves,
 * counterweight and the two nuts. `s` is the stroke (the weight sits `s` above the guide when closed).
 */
export function movingParts(v: View, s: number, dy: number, o: { phantom?: boolean } = {}): void {
  const st = stack(s);
  const phantom = o.phantom === true;
  const line: Stroke = phantom ? { w: W.medium, dash: 'phantom', color: MOVING } : med();
  const none = (fill: string): Stroke => (phantom ? { ...line, fill: 'none' } : { w: W.medium, fill });
  const hatch = (h: NonNullable<Stroke['hatch']>): Stroke => (phantom ? { ...line, fill: 'none' } : hatched(h));
  const up = (y: number): number => y + dy;
  // head (a ring of triangular section around the rod)
  for (const sx of [1, -1])
    poly(
      v,
      HEAD.map(([r, y]): Pt => [sx * r, up(y)]),
      hatch('alu'),
    );
  // fins nut: hub and two vanes seen edge-on
  for (const sx of [1, -1]) {
    rect(v, sx * V.rodR, up(FINS_BOTTOM), sx * V.finsHub, up(V.headBase), none(PAPER));
    rect(
      v,
      sx * V.finsHub,
      up(FINS_BOTTOM + 0.5),
      sx * V.finsR,
      up(V.headBase - 0.5),
      phantom ? { ...line, fill: 'none' } : thin(),
    );
  }
  // stem sleeves
  for (let i = 0; i < 2; i++) {
    const y0 = V.sleeveOnRodBottom + i * V.sleeveOnRodSpacing;
    for (const sx of [1, -1])
      rect(v, sx * V.rodR, up(y0), sx * V.sleeveOnRodR, up(y0 + V.sleeveOnRodL), hatch('copper'));
  }
  // counterweight (tapped on the axis, faced flat) and the two M6 nuts
  const bore = V.rodR + 0.4;
  for (const sx of [1, -1]) rect(v, sx * bore, up(st.weight0), sx * V.weightR, up(st.weight1), hatch('plastic'));
  nutSide(v, 0, up(st.weight1), V.nutAF / 2, V.nutT, phantom ? { ...line, fill: 'none' } : med(), V.rodR);
  nutSide(v, 0, up(st.stroke1), V.nutAF / 2, V.nutT, phantom ? { ...line, fill: 'none' } : med(), V.rodR);
  // the rod: whole, not hatched, with its thread
  const y0 = up(ROD_BOTTOM);
  const y1 = up(st.rodTop);
  if (phantom) {
    for (const sx of [1, -1]) v.line([sx * V.rodR, y0], [sx * V.rodR, y1], line);
    v.line([-V.rodR, y1], [V.rodR, y1], line);
    v.line([-V.rodR, y0], [V.rodR, y0], line);
  } else {
    rect(v, -V.rodR, y0, V.rodR, y1, { w: W.medium, fill: PAPER });
    threadV(v, 0, V.rodR, y0, y1);
  }
}

/** The whole valve in the closed pose, in section. */
export function drawValveSection(v: View, s: number): void {
  waterColumn(v, -V.plateT - 14);
  fixedParts(v);
  movingParts(v, s, 0);
}
