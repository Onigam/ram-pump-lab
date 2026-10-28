import { l, type L } from '@onigam/lab-kit/i18n';
import { COLORS, Drawing, INK, INK_2, W, type Pt, type View } from '@onigam/lab-kit/drawings';
import type { DrawingSheet } from '@onigam/lab-kit/drawings';
import { CATCHMENT as C, SITE, SPRING, TANK } from '../../three/dims';
import {
  BED_FLOOR_Y,
  BED_TOP_Y,
  BED_X0,
  BED_X1,
  BEND_X,
  BENCH_Y,
  BOX_FLOOR_Y,
  BOX_HL,
  BOX_HW,
  BOX_OHL,
  BOX_OHW,
  BOX_RIM_Y,
  BOX_SLAB_BOTTOM,
  BOX_WATER_Y,
  FEED_X0,
  FEED_Y0,
  GATE_X_OFFSET,
  H_FULL,
  H_LID,
  H_SHELL,
  OUT_Y,
  R,
  R_OUT,
  SHELF_Y,
  SLAB_BOTTOM,
  SLAB_R,
  SLAB_TOP,
  SPRING_X,
  feedY,
  groundY,
} from './catchment-geo';
import { partName } from './names';
import { balloon, cat, chip, flowArrow, gridTable, kindKey, nf, para, type Kind } from './util';

// D13 — Spring box and buffer tank: section A–A and plan at 1:40 (from the 3D `catchment` world: src/three/catchment/
// layout.ts and dims.ts) and detail B at 1:10 (the outlet of the tank: intake screen, gate valve, drain). Balloons 1 to 9 are the nine
// parts of that world, with the names of the catalogue. Nothing here is in the video (it only says that a buffer tank
// exists): the layout follows the common practice of spring protection (Oxfam TB5; Practical Action) and every
// dimension is an estimate of the lab (dims.ts), written in millimetres as on a workshop drawing.

const BLUE = COLORS.water;

/** Metres (tank frame, y above the inner floor of the tank) to model millimetres. */
const S = (x: number, y: number): Pt => [x * 1000, y * 1000];
/** Plan: x east, z south (down the sheet): a model view has y up, so z is negated. */
const Z = (x: number, z: number): Pt => [x * 1000, -z * 1000];

/** Scale denominator of the section and of the plan, and millimetres of paper per metre. */
const SCALE = 40;
const KM = 1000 / SCALE;

const gateX0 = R_OUT + GATE_X_OFFSET;
const gateX1 = gateX0 + C.gateBodyLength;
const screenX1 = R - C.screenStub;
const screenX0 = screenX1 - C.screenLength;
const plateY = OUT_Y + C.screenDiameter / 2 + C.vortexGap;
const bx = SPRING_X; // centre of the spring box (tank frame)
const NUM = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

// ------------------------------------------------------------------------------------------------ section A–A, 1:40

function stones(v: View, x0: number, x1: number, y0: number, y1: number, seed: number): void {
  const zones = C.filterZones;
  const radius = [C.grainFine, C.grainMedium, C.grainCoarse];
  for (let k = 0; k < 3; k++) {
    const a = x0 + (x1 - x0) * (k === 0 ? 0 : zones[0] + (k === 2 ? zones[1] : 0));
    const b = x0 + (x1 - x0) * (k === 0 ? zones[0] : k === 1 ? zones[0] + zones[1] : 1);
    const n = Math.round(((b - a) * (y1 - y0) * 1e6) / (radius[k] as number) ** 2 / 90);
    for (let i = 0; i < Math.min(n, 18); i++) {
      const u = (i * 0.6180339 + seed * 0.37 + k * 0.11) % 1;
      const w = (i * 0.7548776 + seed * 0.21 + k * 0.29) % 1;
      v.circle(
        S(a + 0.03 + u * (b - a - 0.06), y0 + 0.03 + w * (y1 - y0 - 0.06)),
        (radius[k] as number) * 1000 * 0.4 + 3,
        { w: W.thin },
      );
    }
    if (k < 2) v.line(S(b, y0), S(b, y1), { w: W.thin, dash: [0.8, 0.8], color: INK_2 });
  }
}

function section(d: Drawing, ox: number, oy: number): void {
  const v = d.view(ox, oy, 1 / SCALE);
  const x0 = -7.2;
  const x1 = 3.5;
  // ground and earth under it
  const ground: Pt[] = [];
  for (let x = x0; x <= x1 + 1e-9; x += 0.05) ground.push(S(x, groundY(x, 0)));
  v.polyline([...ground, S(x1, -0.5), S(x0, -0.5)], { closed: true, w: 0, fill: COLORS.paper, hatch: 'earth' });
  v.polyline(ground, { w: W.medium });
  // rock outcrop behind the gravel bed, the seep in its foot
  const rockX = bx + BED_X0 - C.filterKerb;
  v.polyline(
    [
      S(x0, SHELF_Y + 0.5),
      S(-6.9, SHELF_Y + 1.5),
      S(-6.5, SHELF_Y + C.outcropHeight),
      S(-6.05, SHELF_Y + C.outcropHeight - 0.25),
      S(rockX - 0.1, SHELF_Y + 1.1),
      S(rockX, SHELF_Y + 0.4),
      S(rockX, SHELF_Y - 0.05),
      S(x0, SHELF_Y - 0.5),
    ],
    { closed: true, w: W.thick, fill: COLORS.paper, hatch: 'alu' },
  );
  v.rect(S(rockX - 0.02, SHELF_Y + C.seepHeight - 0.05), S(rockX + 0.02, SHELF_Y + C.seepHeight + 0.05), {
    w: 0,
    fill: INK,
  });
  // gravel bed: kerb stones at the rock end, then the three zones of stones
  const bed0 = bx + BED_X0;
  const bed1 = bx + BED_X1;
  v.rect(S(rockX, BED_FLOOR_Y - 0.03), S(bed0, BED_TOP_Y), { w: W.medium, fill: '#e4ddcf' });
  v.rect(S(bed0, BED_FLOOR_Y), S(bed1, BED_TOP_Y), { w: W.thin, fill: COLORS.paper });
  stones(v, bed0, bed1, BED_FLOOR_Y, BED_TOP_Y, 3);
  v.rect(S(bed0, BED_FLOOR_Y - 0.06), S(bed1, BED_FLOOR_Y), { w: W.thin, fill: '#e4ddcf' });
  // spring box: floor slab and walls, cut (hatched), the ports of the west wall, the outlet of the east wall
  const wxO = bx - BOX_OHL;
  const wxI = bx - BOX_HL;
  const exI = bx + BOX_HL;
  const exO = bx + BOX_OHL;
  const portY0 = BOX_FLOOR_Y + C.boxPortHeight - C.boxPortDiameter / 2;
  const portY1 = BOX_FLOOR_Y + C.boxPortHeight + C.boxPortDiameter / 2;
  const outY0 = BOX_FLOOR_Y + C.boxOutletHeight - SPRING.feedPipeDiameter / 2 - 0.006;
  const outY1 = BOX_FLOOR_Y + C.boxOutletHeight + SPRING.feedPipeDiameter / 2 + 0.006;
  const cut = { w: W.medium, fill: COLORS.paper, hatch: 'steel' as const };
  v.rect(S(wxO, BOX_SLAB_BOTTOM), S(exO, BOX_FLOOR_Y), cut);
  v.rect(S(wxO, BOX_FLOOR_Y), S(wxI, portY0), cut);
  v.rect(S(wxO, portY1), S(wxI, BOX_RIM_Y), cut);
  v.rect(S(exI, BOX_FLOOR_Y), S(exO, outY0), cut);
  v.rect(S(exI, outY1), S(exO, BOX_RIM_Y), cut);
  // water in the box, silt on the floor
  v.rect(S(wxI, BOX_FLOOR_Y), S(exI, BOX_WATER_Y), { w: 0, fill: COLORS.waterFill });
  v.rect(S(wxI, BOX_FLOOR_Y), S(exI, BOX_FLOOR_Y + C.boxSediment), { w: W.thin, fill: '#d9c9a3' });
  v.line(S(wxI, BOX_WATER_Y), S(exI, BOX_WATER_Y), { w: W.thin, color: BLUE });
  // lid (closed): a steel plate on the rim, and the vent seen beyond the section plane
  v.rect(S(wxO - C.boxLidMargin, BOX_RIM_Y), S(exO + C.boxLidMargin, BOX_RIM_Y + C.boxLidThickness), {
    w: W.medium,
    fill: INK,
  });
  v.polyline(
    [
      S(bx + 0.4, BOX_RIM_Y - 0.06),
      S(bx + 0.4, BOX_RIM_Y + C.boxVentRise),
      S(bx + 0.5, BOX_RIM_Y + C.boxVentRise + 0.05),
    ],
    { w: W.thin, color: INK_2 },
  );
  // strainer at the start of the feed pipe, then the pipe: ground level at the box, falling 2 % to the lid of the tank
  const fx0 = bx + FEED_X0;
  v.rect(
    S(fx0, FEED_Y0 - C.boxStrainerDiameter / 2),
    S(fx0 + C.boxStrainerLength, FEED_Y0 + C.boxStrainerDiameter / 2),
    { w: W.medium, fill: COLORS.paper, dash: [4, 3] },
  );
  const inlet = -C.feedInlet;
  const feed: Pt[] = [
    S(fx0 + C.boxStrainerLength, feedY(fx0 + C.boxStrainerLength - bx)),
    S(inlet, feedY(inlet - bx)),
    S(inlet, C.feedEnd),
  ];
  v.polyline(feed, { w: 1.2 });
  for (let i = 0; i < 2; i++) v.circle(S(inlet, C.feedEnd - 0.07 - i * 0.07), 5, { w: W.thin, color: BLUE });
  // ---- the buffer tank: slab, floor, shell (cut), hoops, lid, water and silt
  v.rect(S(-SLAB_R, SLAB_BOTTOM), S(SLAB_R, SLAB_TOP), cut);
  v.rect(S(-R_OUT, SLAB_TOP), S(R_OUT, 0), { w: W.medium, fill: COLORS.paper, hatch: 'plastic' });
  v.rect(S(-R, 0), S(R, H_FULL), { w: 0, fill: COLORS.waterFill });
  v.rect(S(-R, 0), S(R, C.sludgeDepth), { w: W.thin, fill: '#d9c9a3' });
  for (const sx of [-1, 1]) {
    v.rect(S(sx * R, SLAB_TOP), S(sx * R_OUT, H_SHELL), { w: W.medium, fill: COLORS.paper, hatch: 'plastic' });
    for (const hY of TANK.hoopHeights)
      v.rect(S(sx * R_OUT, hY - TANK.hoopWidth / 2), S(sx * (R_OUT + 0.008), hY + TANK.hoopWidth / 2), {
        w: W.medium,
        fill: INK,
      });
  }
  v.line(S(-R, H_FULL), S(R, H_FULL), { w: W.thin, color: BLUE });
  v.rect(S(-R_OUT - TANK.lidOverhang, H_SHELL), S(R_OUT + TANK.lidOverhang, H_LID), {
    w: W.medium,
    fill: COLORS.paper,
    hatch: 'plastic',
  });
  // vent and overflow, seen beyond the plane (their axes are at 50° and in front)
  v.polyline([S(C.ventX, H_LID), S(C.ventX, H_LID + C.ventRise), S(C.ventX + 0.1, H_LID + C.ventRise + 0.05)], {
    w: W.thin,
    color: INK_2,
  });
  const oz = (C.overflowAzimuthDeg * Math.PI) / 180;
  v.polyline(
    [
      S(R_OUT * Math.cos(oz), H_FULL - 0.03),
      S(C.overflowDischargeRadius * Math.cos(oz), H_FULL - 0.03),
      S(C.overflowDischargeRadius * Math.cos(oz), C.overflowDischargeHeight),
    ],
    { w: W.thin, color: INK_2, dash: [3, 2] },
  );
  // ---- outlet: bulkhead, pipe, intake screen under its plate, gate valve, drive pipe, drain
  v.rect(S(R - 0.012, OUT_Y - C.bulkheadDiameter / 2), S(R_OUT + 0.025, OUT_Y + C.bulkheadDiameter / 2), {
    w: W.medium,
    fill: COLORS.paper,
    hatch: 'alu',
  });
  v.rect(S(screenX0, OUT_Y - C.screenDiameter / 2), S(screenX1, OUT_Y + C.screenDiameter / 2), {
    w: W.medium,
    fill: COLORS.paper,
    dash: [6, 3],
  });
  v.line(S(screenX1, OUT_Y), S(R_OUT, OUT_Y), { w: 1.2 });
  v.line(S(screenX0 - 0.1, plateY), S(screenX0 + C.vortexDiameter - 0.1, plateY), { w: W.thick });
  v.line(S(screenX0 + 0.02, plateY), S(screenX0 + 0.02, 0), { w: W.thin });
  v.line(S(screenX0 + C.vortexDiameter - 0.12, plateY), S(screenX0 + C.vortexDiameter - 0.12, 0), { w: W.thin });
  v.line(S(R_OUT, OUT_Y), S(gateX0, OUT_Y), { w: 1.2 });
  v.rect(S(gateX0, OUT_Y - C.gateBodyDiameter / 2), S(gateX1, OUT_Y + C.gateBodyDiameter / 2), {
    w: W.medium,
    fill: COLORS.paper,
    hatch: 'copper',
  });
  v.line(S((gateX0 + gateX1) / 2, OUT_Y), S((gateX0 + gateX1) / 2, OUT_Y + C.gateBonnetHeight + C.gateStemRise), {
    w: W.medium,
  });
  v.line(
    S((gateX0 + gateX1) / 2 - C.gateWheelDiameter / 2, OUT_Y + C.gateBonnetHeight + C.gateStemRise),
    S((gateX0 + gateX1) / 2 + C.gateWheelDiameter / 2, OUT_Y + C.gateBonnetHeight + C.gateStemRise),
    { w: 1 },
  );
  const driveSlope = C.driveSlope;
  v.polyline([S(gateX1, OUT_Y), S(BEND_X, OUT_Y), S(x1, OUT_Y - driveSlope * (x1 - BEND_X))], { w: 1.5 });
  const drainY = C.drainAxisHeight;
  v.line(S(R_OUT, drainY), S(C.drainTurnX, drainY), { w: W.thin, color: INK, dash: [4, 2] });
  v.rect(S(R_OUT + 0.034, drainY - 0.035), S(R_OUT + 0.034 + C.drainValveLength, drainY + 0.035), {
    w: W.medium,
    fill: INK,
  });
}

function sectionNotes(d: Drawing, ox: number, oy: number): void {
  const p = d.paper();
  const X = (x: number): number => ox + x * KM;
  const Y = (y: number): number => oy - y * KM;
  const lead = (n: number, x: number, y: number, dx: number, dy: number) => {
    const q: Pt = [X(x), Y(y)];
    p.circle(q, 0.45, { w: 0, fill: INK });
    p.line(q, [q[0] + dx, q[1] + dy], { w: W.thin });
    balloon(p, [q[0] + dx, q[1] + dy], String(n), 2.6, INK);
  };
  lead(1, bx + 0.45, BOX_FLOOR_Y + 0.2, 9, 10);
  lead(2, bx + BED_X0 + 0.5, BED_FLOOR_Y + 0.3, -6, 12);
  lead(3, -1.9, feedY(-1.9 - bx), -5, -9);
  lead(4, -R_OUT - 0.002, 1.2, -9, -2);
  lead(5, -0.6, H_LID + 0.02, -6, -8);
  lead(6, 0.9, H_FULL - 0.5 + 0.5, 10, -14);
  lead(7, screenX0 + 0.1, OUT_Y, -6, 11);
  lead(8, (gateX0 + gateX1) / 2, OUT_Y + C.gateBonnetHeight + C.gateStemRise, 4, -8);
  lead(9, C.drainTurnX - 0.18, C.drainAxisHeight, 4, 9);
  // levels
  const lv = (x: number, y: number, text: L, left = false) => {
    p.polyline(
      [
        [X(x) - 1.3, Y(y) - 2],
        [X(x) + 1.3, Y(y) - 2],
        [X(x), Y(y)],
      ],
      { closed: true, w: W.thin, fill: COLORS.paper },
    );
    p.text([X(x) + (left ? -2.2 : 2.2), Y(y) - 1.2], text, { size: 1.5, anchor: left ? 'end' : 'start', halo: true });
  };
  lv(0.4, H_FULL, l('débordement', 'overflow level'));
  lv(bx - BOX_HL + 0.05, BOX_WATER_Y, l('niveau d’eau', 'water level'));
  p.text([X(-6.55), Y(SHELF_Y + 1.1)], l('roche', 'rock'), { size: 1.6, color: INK_2, anchor: 'middle' });
  p.text([X(bx + BED_X0 - C.filterKerb) + 6, Y(SHELF_Y + C.seepHeight) + 1.6], l('suintement', 'seep'), {
    size: 1.5,
    color: BLUE,
  });
  for (let i = 0; i < 3; i++)
    flowArrow(
      p,
      [X(bx + BED_X0 - C.filterKerb + 0.18 + 0.0) + i * 0, Y(SHELF_Y + C.seepHeight) + (i - 1) * 1.2 - 0.2],
      0,
      BLUE,
      0.7,
    );
  p.text(
    [X(bx + BED_X0) + 1, Y(BED_TOP_Y + 0.55)],
    cat(l('fin ', 'fine '), '5–15 · ', l('moyen ', 'medium '), '15–30 · ', l('gros ', 'coarse '), '40–60 mm'),
    { size: 1.4, color: INK_2 },
  );
  // dimensions in millimetres, on the model view of the sheet
  const v = d.view(ox, oy, 1 / SCALE);
  v.dim(S(-R, SLAB_BOTTOM), S(R, SLAB_BOTTOM), 4, { dir: 'h', size: 1.7 });
  v.dim(S(-R_OUT - 0.1, 0), S(-R_OUT - 0.1, H_FULL), -4.5, { dir: 'v', size: 1.7 });
  v.dim(S(bx - BOX_HL, BOX_SLAB_BOTTOM), S(bx + BOX_HL, BOX_SLAB_BOTTOM), 4.5, { dir: 'h', size: 1.7 });
  p.text([X(bx + 2.0), Y(feedY(2.0)) - 3.4], cat(l('pente ', 'fall '), nf(C.feedFall * 100, 0), ' %'), {
    size: 1.5,
    color: INK_2,
    anchor: 'middle',
  });
  // caption
  p.text(
    [14, oy + 17],
    l('COUPE A–A — plan de coupe sur l’axe de la conduite, 1:40', 'SECTION A–A — cut on the axis of the pipe, 1:40'),
    { size: 2.4, weight: 'bold' },
  );
}

// ------------------------------------------------------------------------------------------------ plan, 1:40

function plan(d: Drawing, ox: number, oy: number): void {
  const v = d.view(ox, oy, 1 / SCALE);
  const p = d.paper();
  const X = (x: number): number => ox + x * KM;
  const Yz = (z: number): number => oy + z * KM;
  // rock, the gravel bed with its stone kerbs, the three zones
  const bed0 = bx + BED_X0;
  const bed1 = bx + BED_X1;
  const hw = C.filterWidth / 2;
  const k = C.filterKerb;
  v.polyline(
    [
      Z(bed0 - k - 0.2, -hw - 0.9),
      Z(bed0 - k - 0.6, -hw - 0.1),
      Z(bed0 - k - 0.85, 0.3),
      Z(bed0 - k - 0.55, hw + 0.7),
      Z(bed0 - k - 0.1, hw + 0.9),
    ],
    { closed: true, w: W.thick, fill: COLORS.paper, hatch: 'alu' },
  );
  v.rect(Z(bed0 - k, -hw - k), Z(bed1, hw + k), { w: W.medium, fill: '#e4ddcf' });
  v.rect(Z(bed0, -hw), Z(bed1, hw), { w: W.thin, fill: COLORS.paper });
  const zones = C.filterZones;
  let a = bed0;
  const rad = [C.grainFine, C.grainMedium, C.grainCoarse];
  zones.forEach((share, i) => {
    const b = a + share * (bed1 - bed0);
    for (let j = 0; j < 22; j++) {
      const u = (j * 0.6180339 + i * 0.31) % 1;
      const w = (j * 0.7548776 + i * 0.17) % 1;
      v.circle(
        Z(a + 0.04 + u * (b - a - 0.08), -hw + 0.06 + w * (2 * hw - 0.12)),
        (rad[i] as number) * 1000 * 0.4 + 3,
        { w: W.thin },
      );
    }
    if (i < 2) v.line(Z(b, -hw), Z(b, hw), { w: W.thin, dash: [0.8, 0.8], color: INK_2 });
    a = b;
  });
  // spring box: walls, the ports of the west wall, water, overflow stub and vent through the south wall, washout plug
  v.rect(Z(bx - BOX_OHL, -BOX_OHW), Z(bx + BOX_OHL, BOX_OHW), { w: W.thick, fill: COLORS.paper, hatch: 'steel' });
  v.rect(Z(bx - BOX_HL, -BOX_HW), Z(bx + BOX_HL, BOX_HW), { w: W.medium, fill: COLORS.waterFill });
  for (let i = 0; i < C.boxPortCount; i++) {
    const zz = (i - (C.boxPortCount - 1) / 2) * C.boxPortSpacing;
    v.rect(Z(bx - BOX_OHL, zz - C.boxPortDiameter / 2), Z(bx - BOX_HL, zz + C.boxPortDiameter / 2), {
      w: W.thin,
      fill: COLORS.waterFill,
    });
  }
  v.circle(Z(bx - 0.45, 0.2), (C.boxWashoutDiameter / 2) * 1000, { w: W.thin, dash: [2, 1.4] });
  v.rect(Z(bx - 0.3 - C.boxOverflowDiameter / 2, BOX_HW), Z(bx - 0.3 + C.boxOverflowDiameter / 2, BOX_OHW + 0.18), {
    w: W.medium,
    fill: COLORS.paper,
  });
  v.circle(Z(bx + 0.4, BOX_OHW + C.boxVentDiameter / 2 + 0.004), (C.boxVentDiameter / 2) * 1000, {
    w: W.medium,
    fill: INK,
  });
  v.rect(Z(bx + 0.4 - 0.1, -BOX_HW), Z(bx + 0.4, -BOX_HW + 0.03), { w: 0 });
  // feed pipe to the lid of the tank
  const f0 = bx + FEED_X0;
  v.rect(Z(f0, -C.boxStrainerDiameter / 2), Z(f0 + C.boxStrainerLength, C.boxStrainerDiameter / 2), {
    w: W.medium,
    fill: COLORS.paper,
  });
  v.line(Z(f0 + C.boxStrainerLength, 0), Z(-C.feedInlet, 0), { w: 1.2 });
  v.circle(Z(-C.feedInlet, 0), 14, { w: W.medium, fill: COLORS.paper });
  flowArrow(p, [X(bx + 2), Yz(0)], 0, BLUE, 0.9);
  // tank: slab, shell, lid, manhole, vent
  v.circle(Z(0, 0), SLAB_R * 1000, { w: W.medium, fill: '#e4ddcf', dash: [4, 2] });
  v.circle(Z(0, 0), R_OUT * 1000, { w: W.thick, fill: COLORS.waterFill });
  v.circle(Z(0, 0), (R_OUT + TANK.lidOverhang) * 1000, { w: W.medium });
  v.circle(Z(C.manholeX, C.manholeZ), (C.manholeDiameter / 2) * 1000, { w: W.medium, fill: COLORS.paper });
  v.circle(Z(C.manholeX, C.manholeZ), (C.manholeDiameter / 2 - 0.04) * 1000, { w: W.thin });
  v.circle(Z(C.ventX, C.ventZ), (C.ventDiameter / 2) * 1000, { w: W.medium, fill: INK });
  // overflow pipe over the gutter, the gutter, the drain, the drive pipe
  const oz = (C.overflowAzimuthDeg * Math.PI) / 180;
  v.line(
    Z(R_OUT * Math.cos(oz), R_OUT * Math.sin(oz)),
    Z(C.overflowDischargeRadius * Math.cos(oz), C.overflowDischargeRadius * Math.sin(oz)),
    { w: 1.5 },
  );
  flowArrow(
    p,
    [X(C.overflowDischargeRadius * Math.cos(oz)), Yz(C.overflowDischargeRadius * Math.sin(oz))],
    -45,
    BLUE,
    0.9,
  );
  const gx1 = 3.5;
  v.rect(Z(C.gutterStart, C.gutterZ - C.gutterWidth / 2), Z(gx1, C.gutterZ + C.gutterWidth / 2), {
    w: W.medium,
    fill: '#e4ddcf',
  });
  v.rect(
    Z(C.gutterStart + C.gutterWall, C.gutterZ - C.gutterWidth / 2 + C.gutterWall),
    Z(gx1, C.gutterZ + C.gutterWidth / 2 - C.gutterWall),
    { w: 0, fill: COLORS.waterFill },
  );
  v.polyline([Z(R_OUT, 0.03), Z(C.drainTurnX, 0.03), Z(C.drainTurnX, C.gutterZ), Z(C.gutterStart + 0.2, C.gutterZ)], {
    w: 1,
    color: INK_2,
    dash: [3, 2],
  });
  v.line(Z(R_OUT, 0), Z(gx1, 0), { w: 1.5 });
  v.rect(Z(gateX0, -C.gateBodyDiameter / 2), Z(gateX1, C.gateBodyDiameter / 2), {
    w: W.medium,
    fill: COLORS.paper,
    hatch: 'copper',
  });
  v.circle(Z((gateX0 + gateX1) / 2, 0), (C.gateWheelDiameter / 2) * 1000, { w: W.thin });
  // north, break mark of the pipe, labels
  p.polyline(
    [
      [X(2.7), Yz(-1.3)],
      [X(2.7) + 1.8, Yz(-0.8)],
      [X(2.7), Yz(-0.95)],
      [X(2.7) - 1.8, Yz(-0.8)],
    ],
    { closed: true, w: W.thin, fill: INK },
  );
  p.text([X(2.7), Yz(-1.45)], 'N', { size: 2, weight: 'bold', anchor: 'middle' });
  p.text([14, 244], l('PLAN — 1:40', 'PLAN — 1:40'), { size: 2.4, weight: 'bold' });
  v.sectionMark(Z(-6.9, 0), Z(3.4, 0), 'A', 1);
  const lead = (n: number, x: number, z: number, dx: number, dy: number) => {
    const q: Pt = [X(x), Yz(z)];
    p.circle(q, 0.45, { w: 0, fill: INK });
    p.line(q, [q[0] + dx, q[1] + dy], { w: W.thin });
    balloon(p, [q[0] + dx, q[1] + dy], String(n), 2.6, INK);
  };
  lead(1, bx + 0.3, -0.3, 4, -10);
  lead(2, bed0 + 0.5, -0.5, -4, -10);
  lead(3, bx + 2, 0, 0, -8);
  lead(4, R_OUT * Math.cos(2.4), R_OUT * Math.sin(2.4), -9, 10);
  lead(5, C.manholeX + 0.1, C.manholeZ - 0.2, -3, -12);
  lead(6, 0.92, 1.1, -12, 8);
  lead(7, (screenX0 + screenX1) / 2, 0, -2, -8);
  lead(8, (gateX0 + gateX1) / 2, 0, 3, -8);
  lead(9, C.drainTurnX, 0.8, 8, 2);
  p.text(
    [X(C.gutterStart + 0.6), Yz(C.gutterZ) + 5.2],
    l('fossé en béton → pente', 'concrete ditch → down the slope'),
    { size: 1.5, color: INK_2 },
  );
  p.text([X(bx - 0.3) - 1.4, Yz(BOX_OHW + 0.42)], l('trop-plein du regard', 'box overflow'), {
    size: 1.4,
    color: INK_2,
    anchor: 'end',
  });
  p.text([X(bx + 0.4) + 3, Yz(BOX_OHW + 0.42)], l('évent', 'vent'), { size: 1.4, color: INK_2 });
}

// ------------------------------------------------------------------------------------------------ detail B, 1:10

function detailB(d: Drawing, ox: number, oy: number): void {
  const v = d.view(ox, oy, 1 / 10);
  const p = d.paper();
  const xa = 0.42;
  const xb = 1.52;
  const ya = -0.27;
  const yb = 0.74;
  const X = (x: number): number => ox + x * 100;
  const Y = (y: number): number => oy - y * 100;
  p.rect([X(xa), Y(yb)], [X(xb), Y(ya)], { w: W.thin, color: INK_2 });
  // earth, concrete slab, the shell wall (cut) and its floor plate
  v.rect(S(xa, ya), S(xb, BENCH_Y), { w: W.medium, fill: COLORS.paper, hatch: 'earth' });
  v.rect(S(xa, SLAB_BOTTOM), S(SLAB_R, SLAB_TOP), { w: W.medium, fill: COLORS.paper, hatch: 'steel' });
  v.rect(S(xa, SLAB_TOP), S(R, 0), { w: W.medium, fill: COLORS.paper, hatch: 'plastic' });
  v.rect(S(R, SLAB_TOP), S(R_OUT, yb), { w: W.medium, fill: COLORS.paper, hatch: 'plastic' });
  // water in the tank, silt, then the fittings
  v.rect(S(xa, 0), S(R, yb), { w: 0, fill: COLORS.waterFill });
  v.rect(S(xa, 0), S(R, C.sludgeDepth), { w: W.thin, fill: '#d9c9a3' });
  v.line(S(R, 0), S(xa, 0), { w: W.medium });
  p.text(
    [X(xa) + 2, Y(yb) + 4],
    l('l’eau monte jusqu’à 2,00 m au-dessus du fond ↑', 'the water rises to 2.00 m above the floor ↑'),
    { size: 1.5, color: BLUE },
  );
  // bulkhead outlet: nipple through the wall, flange inside, lock nut outside
  const rp = SITE.driveOuterDiameter / 2;
  v.rect(S(R - 0.014, OUT_Y - C.bulkheadDiameter / 2), S(R, OUT_Y + C.bulkheadDiameter / 2), {
    w: W.medium,
    fill: COLORS.paper,
    hatch: 'alu',
  });
  v.rect(S(R_OUT, OUT_Y - 0.03), S(R_OUT + 0.02, OUT_Y + 0.03), { w: W.medium, fill: COLORS.paper, hatch: 'alu' });
  // intake screen: perforated basket on the stub, end cap, the anti-vortex plate on three legs
  const sr = C.screenDiameter / 2;
  v.rect(S(screenX0, OUT_Y - sr), S(screenX1, OUT_Y + sr), { w: W.medium, fill: COLORS.paper });
  for (let i = 0; i < 9; i++) {
    const xx = screenX0 + 0.012 + (i * (screenX1 - screenX0 - 0.024)) / 8;
    for (const yy of [OUT_Y + sr - 0.008, OUT_Y - sr + 0.008, OUT_Y])
      v.circle(S(xx, yy), (C.screenHole / 2) * 1000, { w: W.thin });
  }
  v.rect(S(screenX0 - 0.01, OUT_Y - sr), S(screenX0, OUT_Y + sr), { w: W.medium, fill: INK });
  v.rect(S(screenX1, OUT_Y - rp), S(R, OUT_Y + rp), { w: W.medium, fill: COLORS.paper, hatch: 'alu' });
  const px0 = screenX0 + (C.screenLength - C.vortexDiameter) / 2;
  v.rect(S(px0, plateY), S(px0 + C.vortexDiameter, plateY + 0.004), { w: W.medium, fill: INK });
  for (const lx of [px0 + 0.02, px0 + C.vortexDiameter - 0.02]) v.line(S(lx, plateY), S(lx, 0), { w: W.medium });
  // gate valve outside: pipe, body, bonnet, rising stem, hand wheel; then the drive pipe on a concrete saddle
  const gcx = (gateX0 + gateX1) / 2;
  v.rect(S(R_OUT + 0.02, OUT_Y - rp), S(gateX0, OUT_Y + rp), { w: W.medium, fill: COLORS.paper, hatch: 'steel' });
  v.rect(S(gateX0, OUT_Y - C.gateBodyDiameter / 2), S(gateX1, OUT_Y + C.gateBodyDiameter / 2), {
    w: W.thick,
    fill: COLORS.paper,
    hatch: 'copper',
  });
  v.rect(S(gcx - 0.014, OUT_Y + C.gateBodyDiameter / 2), S(gcx + 0.014, OUT_Y + C.gateBonnetHeight), {
    w: W.medium,
    fill: COLORS.paper,
    hatch: 'copper',
  });
  v.line(S(gcx, OUT_Y), S(gcx, OUT_Y + C.gateBonnetHeight + C.gateStemRise), { w: 1.2 });
  v.rect(
    S(gcx - C.gateWheelDiameter / 2, OUT_Y + C.gateBonnetHeight + C.gateStemRise),
    S(gcx + C.gateWheelDiameter / 2, OUT_Y + C.gateBonnetHeight + C.gateStemRise + 0.008),
    { w: W.medium, fill: INK },
  );
  v.rect(S(gateX1, OUT_Y - rp), S(xb, OUT_Y + rp), { w: W.medium, fill: COLORS.paper, hatch: 'steel' });
  v.rect(S(1.32, BENCH_Y), S(1.46, OUT_Y - rp), { w: W.medium, fill: COLORS.paper, hatch: 'steel' });
  // drain: nipple, PVC ball valve with its lever, pipe going east under the drive pipe
  const dr = C.drainDiameter / 2;
  const dy = C.drainAxisHeight;
  v.rect(S(R, dy - dr * 0.9), S(R_OUT + 0.046, dy + dr * 0.9), { w: W.medium, fill: COLORS.paper, hatch: 'plastic' });
  v.rect(S(R_OUT + 0.034, dy - dr * 1.45), S(R_OUT + 0.034 + C.drainValveLength, dy + dr * 1.45), {
    w: W.thick,
    fill: INK,
  });
  v.line(
    S(R_OUT + 0.034 + C.drainValveLength / 2, dy + dr * 1.45),
    S(R_OUT + 0.034 + C.drainValveLength / 2, dy + dr * 1.45 + 0.03),
    { w: 1 },
  );
  v.rect(
    S(R_OUT + 0.034 + C.drainValveLength / 2, dy + dr * 1.45 + 0.03),
    S(R_OUT + 0.034 + C.drainValveLength / 2 + 0.105, dy + dr * 1.45 + 0.042),
    { w: W.medium, fill: COLORS.red },
  );
  v.rect(S(R_OUT + 0.034 + C.drainValveLength, dy - dr * 0.9), S(xb, dy + dr * 0.9), {
    w: W.medium,
    fill: COLORS.paper,
    hatch: 'plastic',
  });
  // dimensions (mm) and balloons
  v.dim(S(xa + 0.02, 0), S(xa + 0.02, OUT_Y), -3.2, { dir: 'v', size: 1.6 });
  v.dim(S(xa + 0.02, 0), S(xa + 0.02, plateY), -9, { dir: 'v', size: 1.6 });
  v.dim(S(screenX0, OUT_Y - sr), S(screenX1, OUT_Y - sr), 3.5, { dir: 'h', size: 1.6 });
  v.dim(S(px0, plateY + 0.004), S(px0 + C.vortexDiameter, plateY + 0.004), -4, { dir: 'h', size: 1.6 });
  v.dim(S(gateX0, OUT_Y - C.gateBodyDiameter / 2), S(gateX1, OUT_Y - C.gateBodyDiameter / 2), 4, {
    dir: 'h',
    size: 1.6,
  });
  v.dim(S(C.drainTurnX - 0.06, 0), S(C.drainTurnX - 0.06, dy), 4, { dir: 'v', size: 1.6 });
  const lead = (n: number, x: number, y: number, dx: number, dy2: number) => {
    const q: Pt = [X(x), Y(y)];
    p.circle(q, 0.45, { w: 0, fill: INK });
    p.line(q, [q[0] + dx, q[1] + dy2], { w: W.thin });
    balloon(p, [q[0] + dx, q[1] + dy2], String(n), 2.6, INK);
  };
  lead(7, (screenX0 + screenX1) / 2, OUT_Y - sr + 0.01, 2, 14);
  lead(8, gcx, OUT_Y + C.gateBonnetHeight, -8, -10);
  lead(9, R_OUT + 0.034 + C.drainValveLength * 0.8, dy - dr, 4, 13);
  lead(4, (R + R_OUT) / 2, 0.55, 8, 0);
  p.text([X(xb) - 1, Y(OUT_Y) - 7.2], l('conduite motrice → ', 'drive pipe → '), {
    size: 1.5,
    anchor: 'end',
    color: INK_2,
  });
  p.text([X(px0 + C.vortexDiameter / 2), Y(plateY) - 8.4], l('plaque anti-vortex', 'anti-vortex plate'), {
    size: 1.4,
    anchor: 'middle',
    color: INK_2,
  });
  p.text([292, 131], l('DÉTAIL B — DÉPART DE LA CONDUITE MOTRICE, 1:10', 'DETAIL B — START OF THE DRIVE PIPE, 1:10'), {
    size: 2.4,
    weight: 'bold',
  });
}

// ------------------------------------------------------------------------------------------------ parts, levels and notes

function partsList(p: View, x: number, y: number): void {
  const ids = [
    'spring-box',
    'gravel-filter',
    'feed-pipe',
    'tank-shell',
    'tank-lid',
    'overflow-pipe',
    'intake-screen',
    'drive-gate-valve',
    'tank-drain',
  ];
  p.text([x, y], l('REPÈRES (noms du catalogue)', 'TAGS (catalogue names)'), { size: 2.3, weight: 'bold' });
  ids.forEach((id, i) => {
    const cy = y + 6 + i * 5.2;
    balloon(p, [x + 2.6, cy], NUM[i] as string, 2.1, INK);
    p.text([x + 7, cy], partName(id), { size: 1.7, baseline: 'middle' });
  });
}

function levelsTable(p: View, x: number, y: number): void {
  p.text([x, y], l('NIVEAUX (m au-dessus du fond de la réserve)', 'LEVELS (m above the tank floor)'), {
    size: 2.3,
    weight: 'bold',
  });
  const rows: { name: L; v: number; kind: Kind }[] = [
    { name: l('Sol au regard de captage', 'Ground at the spring box'), v: SHELF_Y, kind: 'E' },
    {
      name: l('Eau dans le regard (sortie au sol + 12 mm)', 'Water in the box (outlet at ground + 12 mm)'),
      v: BOX_WATER_Y,
      kind: 'E',
    },
    { name: l('Bout libre de la conduite d’alimentation', 'Free end of the feed pipe'), v: C.feedEnd, kind: 'E' },
    { name: l('Dessus du couvercle de la réserve', 'Top of the tank lid'), v: H_LID, kind: 'E' },
    { name: l('Niveau de débordement (100 %)', 'Overflow level (100 %)'), v: H_FULL, kind: 'E' },
    { name: l('Axe du départ de la conduite motrice', 'Axis of the drive pipe outlet'), v: OUT_Y, kind: 'E' },
    { name: l('Point bas : vidange', 'Low point: drain'), v: C.drainAxisHeight, kind: 'E' },
  ];
  gridTable(
    p,
    x,
    y + 3,
    [
      { label: l('Repère', 'Point'), w: 70 },
      { label: l('Niveau', 'Level'), w: 20, align: 'end', mono: true },
      { label: '', w: 8, align: 'middle' },
    ],
    rows.map((r) => [r.name, cat(nf(r.v, 3), ' m'), '']),
    { rowH: 4.9, size: 1.55 },
  );
  rows.forEach((r, i) => chip(p, [x + 70 + 20 + 4, y + 3 + 4.9 * (i + 1.5)], r.kind, 0.85));
}

export const catchmentLayout: DrawingSheet = {
  id: 'catchment-layout',
  number: 'D13',
  group: 'site',
  title: l('Captage et réserve tampon', 'Spring box and buffer tank'),
  description: l(
    'Le captage et la réserve tampon en coupe et en plan au 1:40, puis le départ de la conduite motrice au 1:10. L’eau suinte de la roche, traverse le filtre à gravier, entre dans le regard, descend par la conduite d’alimentation jusqu’à un bout libre au-dessus du niveau de débordement, puis quitte la réserve par une crépine sous une plaque anti-vortex et une vanne ; le trop-plein et la vidange vont au fossé. Rien de cela n’est dans la vidéo : c’est la pratique courante (Oxfam, Practical Action) et toutes les cotes sont des estimations du labo. Les repères 1 à 9 sont les pièces du catalogue.',
    'The spring box and the buffer tank in section and in plan at 1:40, then the start of the drive pipe at 1:10. Water seeps out of the rock, crosses the gravel filter, enters the box and falls through the feed pipe to a free end above the overflow level, then leaves the tank through a screen under an anti-vortex plate and a gate valve; the overflow and the drain go to the ditch. None of this is in the video: it is common practice (Oxfam, Practical Action) and every dimension is an estimate of the lab. Tags 1 to 9 are the catalogue’s parts.',
  ),
  scene: 'catchment',
  parts: [
    'spring-box',
    'gravel-filter',
    'feed-pipe',
    'tank-shell',
    'tank-lid',
    'overflow-pipe',
    'intake-screen',
    'drive-gate-valve',
    'tank-drain',
  ],
  render(): Drawing {
    const d = new Drawing();
    d.frame({
      title: l('Captage et réserve tampon', 'Spring box and buffer tank'),
      subtitle: l(
        'Coupe et plan 1:40, détail du départ de la conduite motrice 1:10 — cotes estimées',
        'Section and plan 1:40, detail of the start of the drive pipe 1:10 — estimated dimensions',
      ),
      number: 'D13',
      scale: '1:40 · 1:10',
    });
    const p = d.paper();
    // section at the top left: x from −7.2 m (paper 14) to 3.5 m, floor of the tank at paper y 112
    const ox = 14 + 7.2 * KM;
    section(d, ox, 130);
    sectionNotes(d, ox, 130);
    plan(d, ox, 196);
    detailB(d, 250, 98);
    partsList(p, 292, 142);
    levelsTable(p, 292, 199);
    kindKey(p, 14, 268, { kinds: ['E'] });
    para(
      p,
      14,
      249,
      200,
      l(
        'Le captage n’est pas dans la vidéo : le regard, le filtre à gravier, le trop-plein, la vidange et la vanne de départ suivent la pratique courante de protection d’une source (Oxfam, fiche technique TB5) et d’une petite réserve (Practical Action). Le lit de gravier est dessiné à nu pour qu’on le voie, Oxfam le recouvre d’une bâche et de terre. Toutes les cotes sont des estimations (E), écrites en millimètres. L’eau de source n’est pas garantie potable ; le prélèvement est réglementé (en France : DDT, OFB).',
        'The catchment is not in the video: the spring box, the gravel filter, the overflow, the drain and the outlet valve follow the common practice of protecting a spring (Oxfam, technical brief TB5) and of a small tank (Practical Action). The gravel bed is drawn bare so that it can be seen; Oxfam covers it with sheeting and soil. Every dimension is an estimate (E), written in millimetres. Spring water is not guaranteed potable; taking it is regulated (in France: DDT, OFB).',
      ),
      1.6,
      INK_2,
    );
    return d;
  },
};
