import { l, tr, type L } from '@onigam/lab-kit/i18n';
import { COLORS, Drawing, INK, INK_2, W, type Pt, type View } from '@onigam/lab-kit/drawings';
import type { DrawingSheet } from '@onigam/lab-kit/drawings';
import { PIT, SITE, TANK } from '../../three/dims';
import { G, RHO } from '../../sim/physics';
import { valve1 } from './model';
import { partName } from './names';
import { airChamber, ballValve, checkValve, gateValve, houseSymbol, instrument, strainer, wasteValve } from './symbols';
import {
  arrowLine,
  breakMark,
  cat,
  flowArrow,
  kindKey,
  levelMark,
  nf,
  notes,
  rotVal,
  tag,
  val,
  type Kind,
} from './util';

// RP-D07 — Hydraulic diagram of the whole system in symbols, not to scale: spring → spring box → buffer tank → drive pipe
// → ram (waste valve, check valve, air chamber, snifter, gauge) → delivery pipe → water tower → house, and the waste drain.
// The three flows are model results for the n°1 valve of the video (RamSim); the fall h and the head H are the video's;
// every pipe size and every piece of equipment is dims.ts (estimates, flagged by the E discs).

const BLUE = COLORS.water;
const pipe = (p: View, pts: Pt[], w = 0.7) => p.polyline(pts, { w });
const bar = (m: number) => (RHO * G * m) / 1e5;

/** Paper y of the three levels of the diagram (not proportional: the vertical is broken to keep the symbols legible). */
const Y0 = 160; // ±0, axis of the ram inlet
const YH = 119; // +h, outlet of the buffer tank
const YT = 38; // +H, inlet of the water tower

/** A flow label: bold blue text with its provenance disc in front. */
const flow = (p: View, x: number, y: number, kind: Kind, text: L, size = 2.1) =>
  val(p, x, y, kind, text, { size, bold: true, color: BLUE });

function catchment(p: View): void {
  // ground: upland shelf, scarp, bench of the tank, slope of the drive pipe down to the pit
  const ground: Pt[] = [
    [14, 87],
    [58, 88],
    [67, 90],
    [72, 122],
    [136, 122],
    [194, 163],
  ];
  p.polyline([...ground, [194, 167], [136, 126], [72, 126], [67, 94], [14, 91]], {
    closed: true,
    w: 0,
    hatch: 'earth',
  });
  p.polyline(ground, { w: W.medium });
  // spring: rock outcrop, the seep, the gravel bed
  p.polyline(
    [
      [14, 70],
      [24, 66],
      [30, 70],
      [31, 87],
      [14, 87],
    ],
    { closed: true, w: W.medium, fill: COLORS.paper, hatch: 'steel' },
  );
  for (let i = 0; i < 3; i++) flowArrow(p, [33, 82.2 + i * 1.7], 0, BLUE, 0.7);
  p.rect([31, 80], [44, 88], { w: W.thin, fill: COLORS.paper });
  for (const [x, y] of [
    [33.5, 82],
    [36, 85],
    [39, 82.5],
    [41.5, 86],
    [34.5, 87],
    [38, 87],
    [42, 83.5],
  ] as const)
    p.circle([x, y], 0.55, { w: W.thin });
  // spring box SB-01 (water just above the outlet pipe, rim a little over the ground) and its lid
  p.rect([44, 86.8], [60, 96], { w: W.thick, fill: COLORS.paper });
  p.rect([44.4, 90.4], [59.6, 95.6], { w: 0, fill: COLORS.waterFill });
  p.line([44.4, 90.4], [59.6, 90.4], { w: W.thin, color: BLUE });
  p.rect([43, 85.6], [61, 86.8], { w: W.medium, fill: INK });
  // feed pipe FP-01: leaves at ground level, falls all the way to a free end above the overflow level of the tank
  pipe(p, [
    [60, 91.8],
    [64, 91.8],
    [84, 97.5],
    [84, 100.6],
  ]);
  flowArrow(p, [73, 94.6], -16);
  // buffer tank TK-01
  p.rect([77, 92], [116, 122], { w: 0, fill: COLORS.paper });
  p.rect([77.5, 98], [115.5, 121.5], { w: 0, fill: COLORS.waterFill });
  p.line([77.5, 98], [115.5, 98], { w: W.thin, color: BLUE });
  p.polyline(
    [
      [77, 92],
      [77, 122],
      [116, 122],
      [116, 92],
    ],
    { w: W.thick },
  );
  p.line([75.5, 91.4], [117.5, 91.4], { w: 1.1 });
  levelMark(p, [101, 98], '', { water: true });
  // vent of the lid (goose-neck) and drops from the free end of the feed pipe
  pipe(p, [
    [108, 91.4],
    [108, 86.5],
  ]);
  p.arc([106, 86.5], 2, 0, 180, { w: 0.7 });
  p.line([104, 86.5], [104, 88.2], { w: 0.7 });
  for (const dy of [0, 4]) p.circle([84, 103.4 + dy], 0.45, { w: W.thin, color: BLUE });
  // overflow OF-01 from the overflow level, then down to the ditch
  pipe(p, [
    [116, 98],
    [125, 98],
    [125, 107],
  ]);
  flowArrow(p, [125, 108.2], -90);
  // intake screen IS-01 with its anti-vortex plate, gate valve VG-01 on the drive outlet
  strainer(p, [109.5, 119], { scale: 0.85 });
  p.line([104.5, 115.6], [114.5, 115.6], { w: W.medium, color: INK });
  pipe(p, [
    [112, 119],
    [138, 119],
    [192, 156],
    [196, Y0],
    [206, Y0],
  ]);
  pipe(p, [
    [105, 119],
    [112, 119],
  ]);
  gateValve(p, [124, 119]);
  // tank drain VD-01 at the lowest point, normally closed
  pipe(p, [
    [94, 122],
    [94, 135],
  ]);
  ballValve(p, [94, 128.5], { rot: 90, closed: true });
  flowArrow(p, [94, 136], -90);
  // reference level of the tank outlet
  p.line([14, YH], [76, YH], { w: W.thin, color: INK_2, dash: 'center' });
}

function driveDims(p: View): void {
  // fall h between the outlet of the tank and the axis of the ram
  const x = 146;
  p.line([136, YH], [152, YH], { w: W.thin, color: INK_2, dash: 'center' });
  p.line([138, Y0], [152, Y0], { w: W.thin, color: INK_2, dash: 'center' });
  arrowLine(p, [x, YH], [x, Y0], INK, W.thin, true);
  const ym = (YH + Y0) / 2;
  rotVal(p, [x - 1.5, ym], 90, 'R', cat('h = ', nf(SITE.fall, 1), ' m'));
  levelMark(p, [154, YH], cat('+', nf(SITE.fall, 1), ' m'), { size: 1.9 });
  levelMark(p, [139, Y0], '±0', { size: 1.9, left: true });
  // length L along the pipe, offset up and to the right
  const a: Pt = [142, 114];
  const b: Pt = [196, 151];
  arrowLine(p, a, b, INK, W.thin, true);
  const ang = (Math.atan2(-(b[1] - a[1]), b[0] - a[0]) * 180) / Math.PI;
  rotVal(p, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], ang, 'R', cat('L = ', nf(SITE.driveLength, 0), ' m'));
}

function ram(p: View): void {
  // pit boundary
  p.rect([198, 106], [314, 184], { w: W.thin, dash: 'phantom', color: INK_2 });
  p.text([201, 110.8], tr(partName('ram-pit')).toUpperCase(), { size: 1.8, weight: 'bold', color: INK_2 });
  val(p, 201, 181.4, 'E', l('regard : dimensions estimées', 'pit: estimated dimensions'), { size: 1.5, color: INK_2 });
  // inlet: flange pair, strainer ST-01, inlet valve V1
  for (const x of [204, 206.4]) p.line([x, Y0 - 3.6], [x, Y0 + 3.6], { w: 1.1 });
  pipe(p, [
    [206.4, Y0],
    [228, Y0],
  ]);
  strainer(p, [213, Y0]);
  ballValve(p, [223, Y0], { scale: 0.85 });
  // body: a horizontal tube with end flanges
  const bx0 = 228;
  const bx1 = 288;
  p.rect([bx0, Y0 - 3.2], [bx1, Y0 + 3.2], { w: W.thick, fill: COLORS.waterFill });
  for (const x of [bx0, bx1]) p.line([x, Y0 - 5], [x, Y0 + 5], { w: 1.2 });
  // waste valve WV-01 (open: the poppet is down, the jets leave by the ports)
  wasteValve(p, [240, Y0 - 3.2], { open: true, scale: 1.2 });
  // snifter SN-01: a small non-return valve that lets air in
  pipe(p, [
    [254, Y0 - 3.2],
    [254, Y0 - 8.5],
  ]);
  checkValve(p, [254, Y0 - 11.4], { rot: -90, scale: 0.55 });
  const air = p.line([254, Y0 - 22], [254, Y0 - 15.5], { w: W.thin, color: INK_2 });
  air.setAttribute('marker-end', 'url(#arrow)');
  // delivery check valve CV-01 and air chamber AC-01
  pipe(p, [
    [272, Y0 - 3.2],
    [272, Y0 - 8],
  ]);
  checkValve(p, [272, Y0 - 11.4], { rot: 90 });
  pipe(p, [
    [272, Y0 - 14.8],
    [272, Y0 - 19],
  ]);
  airChamber(p, [272, Y0 - 19], { w: 15, h: 32, air: 0.5 });
  // gauge PI-01 on the chamber
  p.line([279.5, Y0 - 44], [285, Y0 - 44], { w: W.medium });
  instrument(p, [288.6, Y0 - 44], 'PI', '01');
  // delivery: outlet valve V3 and union, then the delivery pipe out of the pit
  pipe(p, [
    [279.5, Y0 - 28],
    [324, Y0 - 28],
  ]);
  ballValve(p, [292, Y0 - 28], { scale: 0.85 });
  for (const x of [302, 304.4]) p.line([x, Y0 - 31], [x, Y0 - 25], { w: 1.1 });
  // drain valve V2 on the end flange, normally closed
  pipe(p, [
    [bx1, Y0],
    [297, Y0],
    [297, Y0 + 7.5],
  ]);
  ballValve(p, [297, Y0 + 11.8], { rot: 90, closed: true, scale: 0.85 });
  pipe(p, [
    [297, Y0 + 15.5],
    [297, Y0 + 19],
  ]);
  flowArrow(p, [297, Y0 + 20.4], -90);
  // anchor block under the feet
  p.rect([225, Y0 + 12], [290, Y0 + 15.5], { w: W.medium, fill: COLORS.paper, hatch: 'earth' });
  // floor of the pit and its drain to the waste drain
  p.line([200, 176], [312, 176], { w: W.medium });
  p.rect([200, 176], [312, 178.4], { w: 0, fill: COLORS.paper, hatch: 'earth' });
}

function wasteDrain(p: View): void {
  // floor drain of the pit, buried pipe, then the ditch and the soakaway (symbols)
  pipe(p, [
    [236, 177],
    [236, 190],
    [334, 190],
  ]);
  flowArrow(p, [285, 190]);
  // inspection chamber and soakaway
  p.circle([262, 190], 1.9, { w: W.thin, fill: COLORS.paper });
  p.circle([342, 190], 7, { w: W.medium, fill: COLORS.paper });
  p.circle([342, 190], 4.2, { w: W.thin, dash: [0.6, 0.6] });
  for (const [x, y] of [
    [339.5, 188.5],
    [343, 192],
    [344.2, 188],
    [340, 192.4],
  ] as const)
    p.circle([x, y], 0.5, { w: W.thin });
}

function delivery(p: View): void {
  const x = 324;
  // delivery pipe: out of the pit, up the hillside (break), over the tower inlet
  pipe(p, [
    [324, Y0 - 28],
    [x, YT - 5],
    [350, YT - 5],
  ]);
  p.polyline(
    [
      [350, YT - 5],
      [368, YT - 5],
      [368, YT - 1.8],
    ],
    { w: 0.7 },
  );
  flowArrow(p, [313, Y0 - 28], 0);
  flowArrow(p, [x, 136], 90);
  flowArrow(p, [x, 70], 90);
  breakMark(p, [x, 108], 90);
  // tower tank on its stand, the pipe pours into the trough under its end
  p.rect([352, YT], [384, YT + 14], { w: W.thick, fill: COLORS.paper });
  p.rect([352.4, YT + 7], [383.6, YT + 13.6], { w: 0, fill: COLORS.waterFill });
  p.line([352.4, YT + 7], [383.6, YT + 7], { w: W.thin, color: BLUE });
  p.line([351, YT - 0.7], [385, YT - 0.7], { w: 1.1 });
  for (const lx of [354, 382]) p.line([lx, YT + 14], [lx, YT + 26], { w: W.medium });
  p.line([354, YT + 14], [382, YT + 26], { w: W.thin, color: INK_2 });
  p.line([382, YT + 14], [354, YT + 26], { w: W.thin, color: INK_2 });
  p.line([344, YT + 26], [404, YT + 26], { w: W.medium });
  // outlet of the tower to the house (gravity), tap at the end
  pipe(p, [
    [384, YT + 11],
    [392, YT + 11],
    [392, 69],
  ]);
  flowArrow(p, [392, 58], -90);
  ballValve(p, [392, 73], { rot: 90, scale: 0.6, lever: false });
  p.line([384, 82], [406, 82], { w: W.medium });
  houseSymbol(p, [396, 82], 18, 8);
}

function levels(p: View): void {
  // datum line of the ram axis, then the head H between it and the tower inlet
  const x = 334;
  p.line([300, Y0], [344, Y0], { w: W.thin, color: INK_2, dash: 'center' });
  p.line([328, YT], [346, YT], { w: W.thin, color: INK_2, dash: 'center' });
  arrowLine(p, [x, Y0], [x, YT], INK, W.thin, true);
  rotVal(p, [x - 1.5, 99], 90, 'R', cat('H = ', nf(SITE.deliveryHead, 0), ' m'));
  levelMark(p, [x + 3, Y0], l('±0 axe du bélier', '±0 ram axis'), { size: 1.9 });
  val(p, x + 3, 132, 'D', cat('H/h = ', nf(SITE.deliveryHead / SITE.fall, 1)), { size: 1.9, bold: true });
}

function labels(p: View): void {
  const m = valve1().means;
  const s = SITE.sourceFlowLpm;
  const Q = m.driveFlow;
  const q = m.deliveredFlow;
  // spring and spring box
  tag(p, [15, 96], 'SP-01', [partName('spring')], { anchor: 'start' });
  tag(p, [46, 71], 'SB-01', [partName('spring-box')], { anchor: 'start' });
  p.text([31.5, 78.4], l('filtre à gravier', 'gravel filter'), { size: 1.5, color: INK_2 });
  tag(p, [66, 84.6], 'FP-01', [partName('feed-pipe')], { anchor: 'start', size: 1.5 });
  flow(p, 15, 111, 'R', cat('S = ', nf(s, 1), ' L/min'));
  // tank
  tag(p, [80, 75.6], 'TK-01', [partName('buffer-tank')], { anchor: 'start' });
  val(p, 80, 82.3, 'D', cat(nf(TANK.volumeL, 0), ' L'), { size: 1.6 });
  p.text([110.5, 83.6], l('évent', 'vent'), { size: 1.5, color: INK_2 });
  p.text([127, 99.6], 'OF-01', { size: 1.8, weight: 'bold' });
  p.text([127, 103], partName('overflow-pipe'), { size: 1.5, color: INK_2 });
  flow(p, 127, 108, 'D', cat('S − Q = ', nf(Math.max(0, s - Q), 1), ' L/min'), 1.9);
  p.text([110, 113.2], 'IS-01', { size: 1.6, weight: 'bold', anchor: 'middle', halo: true });
  p.text([124, 127.6], 'VG-01', { size: 1.7, weight: 'bold', anchor: 'middle' });
  p.text([98.5, 129.8], 'VD-01', { size: 1.7, weight: 'bold' });
  p.text([98.5, 133.2], partName('tank-drain'), { size: 1.5, color: INK_2 });
  p.text([98.5, 136.6], l('fermée', 'closed'), { size: 1.5, color: INK_2 });
  // drive pipe: the flow Q and the line tag with its size
  flow(p, 150, 168, 'M', cat('Q = ', nf(Q, 1), ' L/min'));
  p.text([150, 172.4], 'L-01', { size: 1.8, weight: 'bold' });
  p.text([159, 172.4], partName('drive-pipe'), { size: 1.5, color: INK_2 });
  val(p, 150, 175.8, 'E', cat(l('acier Ø int. ', 'steel ID '), nf(SITE.driveBore * 1000, 0), ' mm (1″)'), {
    size: 1.5,
    color: INK_2,
  });
  p.line([166, 165.6], [172, 142.6], { w: W.thin });
  p.circle([172, 142.6], 0.5, { w: 0, fill: INK });
  flowArrow(p, [168, 131.8], -34.5);
  // ram
  p.text([213, Y0 + 7.6], 'ST-01', { size: 1.6, weight: 'bold', anchor: 'middle' });
  p.text([223, Y0 - 5.6], 'V1', { size: 1.7, weight: 'bold', anchor: 'middle' });
  p.text([240, Y0 + 9.2], tr(partName('ram')), { size: 1.5, color: INK_2, anchor: 'middle' });
  p.text([236, Y0 - 29], 'WV-01', { size: 1.8, weight: 'bold', anchor: 'end', halo: true });
  p.text([236, Y0 - 25.6], l('clapet de choc', 'waste valve'), { size: 1.5, color: INK_2, anchor: 'end' });
  p.text([254, Y0 - 25], 'SN-01', { size: 1.7, weight: 'bold', anchor: 'middle' });
  p.text([275.5, Y0 - 9.6], 'CV-01', { size: 1.7, weight: 'bold' });
  p.text([263.6, Y0 - 35], 'AC-01', { size: 1.7, weight: 'bold', anchor: 'end' });
  p.text([292, Y0 - 34], 'V3', { size: 1.7, weight: 'bold', anchor: 'middle' });
  p.text([303.6, Y0 - 34], 'UN-01', { size: 1.5, weight: 'bold', anchor: 'middle' });
  p.text([288.6, Y0 - 50], 'PI-01', { size: 1.7, weight: 'bold', anchor: 'middle' });
  p.text([302, Y0 + 11], 'V2', { size: 1.7, weight: 'bold' });
  p.text([302, Y0 + 14.4], l('fermée', 'closed'), { size: 1.5, color: INK_2 });
  p.text([250, Y0 + 20], 'FD-01', { size: 1.6, weight: 'bold' });
  p.text([259, Y0 + 20], partName('foundation'), { size: 1.5, color: INK_2 });
  // pressures at the gauge
  val(p, 258, Y0 - 62, 'D', cat('ρgH = ', nf(bar(SITE.deliveryHead), 1), l(' bar (statique)', ' bar (static)')), {
    size: 1.6,
  });
  val(p, 258, Y0 - 58, 'M', cat(l('pic dans le corps ', 'peak in the body '), nf(m.peakPressure, 1), ' bar'), {
    size: 1.6,
  });
  // waste drain
  flow(p, 240, 186.4, 'M', cat('W = Q − q = ', nf(Q - q, 1), ' L/min'));
  p.text([236, 194.6], 'L-03', { size: 1.7, weight: 'bold' });
  val(p, 245, 194.6, 'E', cat(partName('waste-drain'), ' · Ø ', nf(PIT.drainDiameter * 1000, 0), ' mm'), {
    size: 1.5,
    color: INK_2,
  });
  p.text([342, 202], l('puisard', 'soakaway'), { size: 1.5, color: INK_2, anchor: 'middle' });
  // delivery pipe: line tag (read upwards along the pipe) and the flow q
  const t = (dx: number, str: L | string, o: { bold?: boolean; color?: string; size?: number } = {}) =>
    p.text([322.4 - dx, 78], str, {
      size: o.size ?? 1.5,
      weight: o.bold ? 'bold' : 'normal',
      color: o.color ?? INK_2,
      anchor: 'middle',
      rotate: 90,
    });
  t(0, 'L-02', { bold: true, size: 1.8, color: INK });
  t(3.2, partName('delivery-pipe'));
  t(
    6.4,
    cat(
      'PE Ø',
      nf(SITE.deliveryOuterDiameter * 1000, 0),
      ' · ',
      l('Øi ', 'ID '),
      nf(SITE.deliveryBore * 1000, 1),
      ' mm (E) · ',
      nf(SITE.deliveryLength, 0),
      ' m (R)',
    ),
  );
  flow(p, 327, 143.4, 'M', cat('q = ', nf(q, 2), ' L/min'));
  p.text([331.6, 147.6], cat('≈ ', nf(q * 1440, 0), l(' L/jour', ' L/day')), { size: 1.9, color: BLUE });
  // tower and house
  p.text([352, YT - 11], 'WT-01', { size: 1.8, weight: 'bold' });
  p.text([352, YT - 7.8], partName('water-tower'), { size: 1.5, color: INK_2 });
  p.text([396, 88], 'HO-01', { size: 1.8, weight: 'bold', anchor: 'middle' });
  p.text([396, 91.4], partName('house'), { size: 1.5, color: INK_2, anchor: 'middle' });
}

function balance(p: View): void {
  const m = valve1().means;
  const x = 142;
  const y = 22;
  p.rect([x - 5, y - 5.5], [x + 150, y + 56], { w: W.medium, fill: COLORS.paper });
  p.text(
    [x, y],
    l(
      'BILAN DES DÉBITS — clapet n°1 de la vidéo, site de la vidéo',
      'WATER BALANCE — the video’s n°1 valve, the video’s site',
    ),
    { size: 2.2, weight: 'bold' },
  );
  p.line([x, y + 1.6], [x + 141, y + 1.6], { w: W.thin, color: INK_2 });
  const rows: [string, L, L, Kind][] = [
    ['S', l('débit de la source', 'spring flow'), cat(nf(SITE.sourceFlowLpm, 1), ' L/min'), 'R'],
    [
      'Q',
      l('eau prise dans la réserve (conduite motrice)', 'water taken from the tank (drive pipe)'),
      cat(nf(m.driveFlow, 1), ' L/min'),
      'M',
    ],
    [
      'W',
      l('dont eau rejetée par le clapet de choc', 'of which thrown out by the waste valve'),
      cat(nf(m.driveFlow - m.deliveredFlow, 1), ' L/min'),
      'M',
    ],
    [
      'q',
      l('dont eau refoulée vers le château d’eau', 'of which delivered to the water tower'),
      cat(nf(m.deliveredFlow, 2), ' L/min = ', nf(m.deliveredFlow * 1440, 0), l(' L/jour', ' L/day')),
      'M',
    ],
    [
      'S − Q',
      l('surplus qui part au trop-plein', 'surplus going to the overflow'),
      cat(nf(Math.max(0, SITE.sourceFlowLpm - m.driveFlow), 1), ' L/min'),
      'D',
    ],
    ['n', l('coups de clapet par minute', 'valve strokes per minute'), cat(nf(m.strokesPerMin, 0), ' /min'), 'M'],
    ['η', l('rendement de d’Aubuisson q·H/(Q·h)', 'D’Aubuisson efficiency q·H/(Q·h)'), nf(m.etaD, 2), 'M'],
    [
      'ρgH',
      l('pression statique côté refoulement', 'static pressure on the delivery side'),
      cat(nf(bar(SITE.deliveryHead), 1), ' bar'),
      'D',
    ],
    [
      'p',
      l('pic de pression dans le corps du bélier', 'peak pressure in the ram body'),
      cat(nf(m.peakPressure, 1), ' bar'),
      'M',
    ],
  ];
  rows.forEach(([sym, name, value, kind], i) => {
    const ry = y + 6.4 + i * 5.3;
    p.text([x, ry], sym, {
      size: 2.1,
      weight: 'bold',
      baseline: 'middle',
      mono: true,
      color: kind === 'M' ? BLUE : INK,
    });
    p.text([x + 14, ry], name, { size: 1.8, baseline: 'middle' });
    val(p, x + 98, ry, kind, value, { size: 1.9, bold: true });
  });
}

const LEGEND: { id: string; name: L; draw: (p: View, at: Pt) => void }[] = [
  {
    id: 'VG-01',
    name: partName('drive-gate-valve'),
    draw: (p, a) => gateValve(p, [a[0], a[1] + 1.5], { scale: 0.75 }),
  },
  {
    id: 'V1 · V3',
    name: l('vanne d’arrivée · vanne de sortie (boisseau)', 'inlet valve · outlet valve (ball)'),
    draw: (p, a) => ballValve(p, a, { scale: 0.8, lever: false }),
  },
  {
    id: 'VD-01 · V2',
    name: l('vanne de vidange, normalement fermée', 'drain valve, normally closed'),
    draw: (p, a) => ballValve(p, a, { scale: 0.8, closed: true, lever: false }),
  },
  {
    id: 'CV-01 · SN-01',
    name: l('clapet anti-retour · reniflard', 'check valve · snifter'),
    draw: (p, a) => checkValve(p, a, { scale: 0.85 }),
  },
  {
    id: 'IS-01 · ST-01',
    name: l('crépine de départ · crépine du bélier', 'intake screen · ram strainer'),
    draw: (p, a) => strainer(p, a, { scale: 0.85 }),
  },
  {
    id: 'WV-01',
    name: partName('waste-valve'),
    draw: (p, a) => wasteValve(p, [a[0], a[1] + 5.5], { open: true, scale: 0.5, jets: false }),
  },
  {
    id: 'AC-01',
    name: partName('air-chamber'),
    draw: (p, a) => airChamber(p, [a[0], a[1] + 4.5], { w: 8, h: 10, scale: 0.9 }),
  },
  { id: 'PI-01', name: partName('gauge'), draw: (p, a) => instrument(p, a, 'PI', '', INK, 2.8) },
];

function legend(p: View, x: number, y: number): void {
  p.text(
    [x, y],
    l('SYMBOLES ET REPÈRES (noms du catalogue des pièces)', 'SYMBOLS AND TAGS (names of the parts catalogue)'),
    { size: 2.3, weight: 'bold' },
  );
  LEGEND.forEach((e, i) => {
    const cx = x + (i % 2) * 96;
    const cy = y + 8.5 + Math.floor(i / 2) * 8.6;
    e.draw(p, [cx + 5, cy]);
    p.text([cx + 12, cy - 1.5], e.id, { size: 1.8, weight: 'bold', baseline: 'middle' });
    p.text([cx + 12, cy + 1.8], e.name, { size: 1.6, color: INK_2, baseline: 'middle' });
  });
  const ly = y + 8.5 + 4 * 8.6 + 0.5;
  p.line([x + 1, ly], [x + 9, ly], { w: 0.7 });
  p.text([x + 12, ly], l('conduite (acier, PE, PVC)', 'pipe (steel, PE, PVC)'), { size: 1.6, baseline: 'middle' });
  flowArrow(p, [x + 5 + 96, ly]);
  p.text([x + 12 + 96, ly], l('sens d’écoulement', 'flow direction'), { size: 1.6, baseline: 'middle' });
  p.line([x + 1, ly + 4.6], [x + 9, ly + 4.6], { w: W.thin, color: INK_2, dash: 'center' });
  p.text([x + 12, ly + 4.6], l('niveau de référence', 'reference level'), { size: 1.6, baseline: 'middle' });
  p.rect([x + 97, ly + 2.8], [x + 105, ly + 6.4], { w: W.thin, dash: 'phantom', color: INK_2 });
  p.text([x + 108, ly + 4.6], l('limite du regard', 'pit boundary'), { size: 1.6, baseline: 'middle' });
}

export const principleDiagram: DrawingSheet = {
  id: 'principle-diagram',
  number: 'RP-D07',
  group: 'hydraulic',
  title: l('Schéma hydraulique de l’installation', 'Hydraulic diagram of the installation'),
  description: l(
    'Schéma de principe, sans échelle : l’eau de la source passe par le regard de captage, la réserve tampon et la conduite motrice jusqu’au bélier, dont le clapet de choc rejette presque tout, tandis qu’une petite part, refoulée à travers le clapet anti-retour et la cloche à air, monte au château d’eau. Les trois débits Q, W et q sont des résultats du modèle pour le clapet n°1 de la vidéo ; la chute h et la hauteur H sont celles de la vidéo. Les pastilles R, D, M, C, E disent l’origine de chaque valeur.',
    'Principle diagram, not to scale: the spring water goes through the spring box, the buffer tank and the drive pipe to the ram, whose waste valve throws out almost all of it, while a small part, pushed through the check valve and the air chamber, rises to the water tower. The three flows Q, W and q are model results for the video’s n°1 valve; the fall h and the head H are the video’s. The discs R, D, M, C, E tell where each value comes from.',
  ),
  scene: 'site',
  parts: ['spring', 'buffer-tank', 'drive-pipe', 'ram-pit', 'waste-drain', 'delivery-pipe', 'water-tower', 'house'],
  render(): Drawing {
    const d = new Drawing();
    d.frame({
      title: l('Schéma hydraulique de l’installation', 'Hydraulic diagram of the installation'),
      subtitle: l(
        'Source → réserve → conduite motrice → bélier → refoulement → château d’eau → maison',
        'Spring → tank → drive pipe → ram → delivery pipe → water tower → house',
      ),
      number: 'RP-D07',
      scale: tr(l('sans échelle', 'not to scale')),
    });
    const p = d.paper();
    catchment(p);
    driveDims(p);
    ram(p);
    wasteDrain(p);
    delivery(p);
    levels(p);
    labels(p);
    balance(p);
    legend(p, 14, 203);
    kindKey(p, 14, 268);
    notes(
      p,
      206,
      203,
      200,
      l('NOTES', 'NOTES'),
      [
        l(
          'Les débits sont des moyennes sur un cycle, pour le clapet n°1 réglé comme dans la vidéo (course et poids calibrés sur ses chiffres) : Q = W + q, et seule la petite part q monte au château d’eau.',
          'The flows are averages over one cycle, for the n°1 valve set as in the video (stroke and weight calibrated on its figures): Q = W + q, and only the small part q goes up to the water tower.',
        ),
        l(
          'Le bélier est un modèle générique de 1″, pas le Walton n°3 de la vidéo. Les diamètres des conduites, la réserve, le regard, le château d’eau et la maison sont des estimations du laboratoire (disque E) : la vidéo n’en donne aucun.',
          'The ram is a generic 1″ model, not the video’s Walton n°3. The pipe sizes, the tank, the pit, the water tower and the house are the lab’s estimates (disc E): the video gives none of them.',
        ),
        l(
          'Sécurité : conduite motrice rigide, bélier ancré (pics de plusieurs bars), jamais un doigt dans le clapet de choc en marche. L’eau de source n’est pas garantie potable ; le prélèvement est réglementé (en France : DDT, OFB).',
          'Safety: rigid drive pipe, anchored ram (peaks of several bar), never a finger in the running waste valve. Spring water is not guaranteed potable; taking it is regulated (in France: DDT, OFB).',
        ),
        l(
          'Les hauteurs ne sont pas à l’échelle (h et H sont écrites) ; le profil à l’échelle est la feuille RP-D12, les courbes du modèle la feuille RP-D09.',
          'The heights are not to scale (h and H are written); the profile to scale is sheet RP-D12, the model curves are sheet RP-D09.',
        ),
      ],
      1.8,
    );
    return d;
  },
};
