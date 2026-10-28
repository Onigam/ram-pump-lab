import { COLORS, Drawing, INK_2, W, type Pt } from '@onigam/lab-kit/drawings';
import type { DrawingSheet } from '@onigam/lab-kit/drawings';
import { l } from '@onigam/lab-kit/i18n';
import { DERIVED, MODEL } from '../../data/parts/ram';
import { nEn, nFr } from '../../data/units';
import { SNIFTER_CRACK, SNIFTER_DIAMETER } from '../../sim/physics';
import { CHAMBER, CHECK_VALVE, FITTINGS } from '../../three/dims';
import { SPRING_REST } from '../../three/ram/chamber';
import { dialAngle } from '../../three/ram/dial';
import {
  ITEM,
  PAPER,
  WATER,
  WATER_FILL,
  balloon,
  box,
  dimH,
  dimV,
  flow,
  hatched,
  heading,
  marksLegend,
  med,
  poly,
  rectIn,
  thin,
  type Box,
} from './draw';
import { AIR_FRACTION_NOMINAL, CH_MM, CHECK_BASE, CV, R, cat, chamberSection, k, lab, labN, labOf, dim } from './geom';

const NUMBER = 'D05';
const TITLE = l('Clapet de refoulement, cloche, reniflard', 'Delivery check valve, air chamber, snifter');

const SNIFTER = {
  thread: 4.3,
  boreR: 4.5,
  hexAF: k(FITTINGS.snifterDiameter),
  hexT: 10,
  bodyR: 6.5,
  bodyL: 12,
  domeR: 7.2,
  top: 50,
  orifice: k(SNIFTER_DIAMETER) / 2,
};
/** Boss of the snifter on the body (three/ram/body.ts): outer radius, and the height of its top above the body axis. */
const SN_BOSS = { r: 12, top: 50 };
const SPRING_REST_MM = k(SPRING_REST);

/** Wall of the check valve (three/ram/chamber.ts bodyProfile), right-hand side, [radius, y] in the valve frame. */
const BODY: Pt[] = [
  [CV.seatBoreR, -12],
  [13.5, -12],
  [13.5, 0],
  [CV.rv, 0],
  [CV.rv, 77.5],
  [CV.rv - 2.5, 80],
  [15, 80],
  [15, 88],
  [11.5, 88],
  [11.5, 74],
  [CV.cavR, CV.ceilY],
  [CV.cavR, CV.seatY],
  [CV.seatBoreR, CV.seatY],
];

function render(): Drawing {
  const d = new Drawing();
  d.frame({
    title: TITLE,
    subtitle: l(
      'Coupe par l’axe du bélier au repos : l’eau, l’air, le disque et son ressort, la tige du reniflard',
      'Section through the ram’s axis at rest: the water, the air, the disc and its spring, the snifter pin',
    ),
    number: NUMBER,
    scale: '1:5 · 2:1',
  });
  const p = d.paper();
  const ch = chamberSection();
  const levelLocal = ch.level(AIR_FRACTION_NOMINAL);
  const levelAbs = CH_MM.shellBottom + levelLocal;
  const xD = R.xDelivery;
  const xS = R.xSnifter;

  // ------------------------------------------------------------------ overview 1:5 (ram frame, x from the inlet flange)
  {
    const sc = 0.2;
    const X0 = 214;
    const X1 = 534;
    const v = d.view(26 - X0 * sc, 192, sc);
    // water in the bore, the delivery branch, the check valve and the chamber
    poly(
      v,
      [
        [X0, -R.bodyIR],
        [X1, -R.bodyIR],
        [X1, R.bodyIR],
        [X0, R.bodyIR],
      ],
      { w: 0, fill: WATER_FILL },
    );
    poly(
      v,
      [
        [xD - 11, R.bodyIR],
        [xD + 11, R.bodyIR],
        [xD + 11, 49],
        [xD + 9.55, 49],
        [xD + 9.55, CHECK_BASE + CV.seatY],
        [xD + CV.cavR, CHECK_BASE + CV.seatY],
        [xD + CV.cavR, CHECK_BASE + CV.ceilY],
        [xD + 11.5, CHECK_BASE + 74],
        [xD + 11.5, CH_MM.shellBottom + CH_MM.neckBottom + 6],
        [xD - 11.5, CH_MM.shellBottom + CH_MM.neckBottom + 6],
        [xD - 11.5, CHECK_BASE + 74],
        [xD - CV.cavR, CHECK_BASE + CV.ceilY],
        [xD - CV.cavR, CHECK_BASE + CV.seatY],
        [xD - 9.55, CHECK_BASE + CV.seatY],
        [xD - 9.55, 49],
        [xD - 11, 49],
      ],
      { w: 0, fill: WATER_FILL },
    );
    // body walls, cut at both ends, interrupted by the snifter and delivery bores
    const wall = (xa: number, xb: number, y0: number, y1: number): void => {
      v.rect([xa, y0], [xb, y1], hatched('steel'));
    };
    wall(X0, xS - SNIFTER.boreR, R.bodyIR, R.bodyR);
    wall(xS + SNIFTER.boreR, xD - 11, R.bodyIR, R.bodyR);
    wall(xD + 11, X1, R.bodyIR, R.bodyR);
    wall(X0, X1, -R.bodyR, -R.bodyIR);
    // bosses
    wall(xS - SN_BOSS.r, xS - SNIFTER.boreR, R.bodyR - 0.5, SN_BOSS.top);
    wall(xS + SNIFTER.boreR, xS + SN_BOSS.r, R.bodyR - 0.5, SN_BOSS.top);
    wall(xD - 34, xD - 11, R.bodyR - 0.5, 49);
    wall(xD + 11, xD + 34, R.bodyR - 0.5, 49);
    wall(xD - 34, xD - 13.5, 49, CHECK_BASE);
    wall(xD + 13.5, xD + 34, 49, CHECK_BASE);
    // snifter (outline of the 3D part)
    const sx = [1, -1];
    for (const s of sx) {
      v.rect([xS + s * SNIFTER.thread, SN_BOSS.top - 12], [xS, SN_BOSS.top], thin());
    }
    v.rect([xS - SNIFTER.hexAF / 2, SN_BOSS.top], [xS + SNIFTER.hexAF / 2, SN_BOSS.top + SNIFTER.hexT], med());
    v.rect(
      [xS - SNIFTER.bodyR, SN_BOSS.top + SNIFTER.hexT],
      [xS + SNIFTER.bodyR, SN_BOSS.top + SNIFTER.hexT + SNIFTER.bodyL],
      med(),
    );
    v.arc([xS, SN_BOSS.top + 22], SNIFTER.domeR, 0, 180, { w: W.medium });
    v.line([xS, SN_BOSS.top + 26], [xS, SN_BOSS.top + 36], { w: 0.5 });
    // check valve: body walls, disc on its seat, spring (detail E draws them large)
    for (const s of sx) {
      poly(
        v,
        BODY.map(([r, y]): Pt => [xD + s * r, CHECK_BASE + y]),
        hatched('copper', W.thin),
      );
    }
    v.rect([xD - CV.discR, CHECK_BASE + CV.seatY], [xD + CV.discR, CHECK_BASE + CV.seatY + CV.discT], {
      w: W.medium,
      fill: COLORS.ink,
    });
    v.line(
      [xD - CV.springR, CHECK_BASE + CV.seatY + CV.discT],
      [xD + CV.springR, CHECK_BASE + CV.seatY + CV.discT + SPRING_REST_MM],
      { w: W.thin },
    );
    v.line(
      [xD + CV.springR, CHECK_BASE + CV.seatY + CV.discT],
      [xD - CV.springR, CHECK_BASE + CV.seatY + CV.discT + SPRING_REST_MM],
      { w: W.thin },
    );
    // air chamber: pressed vessel, water below the level, air above
    const sh = CH_MM.shellBottom;
    const place = (pt: [number, number], s: number): Pt => [xD + s * pt[0], sh + pt[1]];
    const inner = ch.innerUp.filter(([, y]) => y <= levelLocal);
    const water: Pt[] = [
      ...inner.map((pt) => place(pt, 1)),
      place([ch.radiusAt(levelLocal), levelLocal], 1),
      place([ch.radiusAt(levelLocal), levelLocal], -1),
      ...[...inner].reverse().map((pt) => place(pt, -1)),
    ];
    poly(v, water, { w: 0, fill: WATER_FILL, hatch: 'water' });
    for (const s of sx)
      poly(
        v,
        ch.wall.map((pt) => place(pt, s)),
        { w: W.thin, fill: COLORS.ink },
      );
    v.line([xD - ch.radiusAt(levelLocal), sh + levelLocal], [xD + ch.radiusAt(levelLocal), sh + levelLocal], {
      w: W.medium,
      color: WATER,
    });
    // outlet port, nipple, start of the outlet valve
    const yo = CH_MM.outletHeight;
    const px0 = xD + CH_MM.R - 3;
    poly(
      v,
      [
        [px0, yo + CH_MM.outletBore],
        [px0 + CH_MM.outletLength + 3, yo + CH_MM.outletBore],
        [px0 + CH_MM.outletLength + 3, yo - CH_MM.outletBore],
        [px0, yo - CH_MM.outletBore],
      ],
      { w: 0, fill: WATER_FILL },
    );
    v.rect([px0, yo + CH_MM.outletBore], [px0 + CH_MM.outletLength + 3, yo + CH_MM.outletR], {
      w: W.medium,
      fill: COLORS.ink,
    });
    v.rect([px0, yo - CH_MM.outletR], [px0 + CH_MM.outletLength + 3, yo - CH_MM.outletBore], {
      w: W.medium,
      fill: COLORS.ink,
    });
    const nx0 = xD + CH_MM.R - 3 + 12;
    v.rect([nx0 + CH_MM.outletLength - 6, yo - 10.65], [xD + CH_MM.R - 3 + 12 + 40, yo + 10.65], {
      w: W.thin,
      fill: WATER_FILL,
    });
    // outlet valve V3 and union (outlines of the 3D parts), then the PE pipe
    const valve0 = xD + CH_MM.R - 3 + 12 + 40;
    const ballProfile: Pt[] = [
      [valve0, 12.5],
      [valve0 + 14, 12.5],
      [valve0 + 26, 21.5],
      [valve0 + 52, 21.5],
      [valve0 + 61, 12.5],
      [valve0 + R.smallValveL, 12.5],
    ];
    const bp: Pt[] = ballProfile.map(([x, r]): Pt => [x, yo + r]);
    const bm: Pt[] = ballProfile.map(([x, r]): Pt => [x, yo - r]);
    poly(v, [...bp, ...[...bm].reverse()], med());
    v.line([valve0 + 26 + 13, yo + 21.5 + 2], [valve0 + 26 + 13, yo + 21.5 + 24], { w: W.medium });
    v.line([valve0 + 9, yo + 21.5 + 24], [valve0 + 79, yo + 21.5 + 24], { w: W.thick });
    const u0 = valve0 + R.smallValveL;
    v.rect([u0, yo - 15], [u0 + 10, yo + 15], med());
    v.rect([u0 + 10, yo - 18], [u0 + 28, yo + 18], med());
    v.rect([u0 + 28, yo - 15], [u0 + 40, yo + 15], med());
    v.rect([u0 + 40, yo - 17], [u0 + R.unionL, yo + 17], med());
    v.rect([u0 + R.unionL, yo - 12.5], [u0 + R.outletStubL, yo + 12.5], { w: W.medium, fill: WATER_FILL });
    // gauge on top of the chamber
    const gy = sh + ch.yTop;
    v.rect([xD - 11, gy], [xD + 11, gy + 12], med());
    v.rect([xD - 7.5, gy + 12], [xD + 7.5, gy + 29], med());
    const gc: Pt = [xD, gy + 27 + R.gaugeD / 2];
    v.circle(gc, R.gaugeD / 2, { w: W.medium, fill: PAPER });
    v.circle(gc, R.gaugeD / 2 - 2.5, { w: W.thin });
    // needle at the static head of the 65 m column (derived), on a 0-10 bar dial over 270 degrees
    const ang = Math.PI / 2 + dialAngle(DERIVED.deliveryBar);
    v.line(gc, [gc[0] + 26 * Math.cos(ang), gc[1] + 26 * Math.sin(ang)], { w: W.medium, color: COLORS.red });
    v.circle(gc, 2, { w: W.thin, fill: PAPER });
    // centre lines
    v.center([xD, -R.bodyR - 6], [xD, gy + 27 + R.gaugeD + 6]);
    v.center([xS, -R.bodyR - 6], [xS, SN_BOSS.top + 42]);
    v.center([X0 - 10, 0], [X1 + 6, 0]);
    // break marks at the cut ends of the body
    for (const x of [X0, X1]) v.line([x, -R.bodyR - 3], [x, R.bodyR + 3], { w: W.thin, dash: 'center', color: INK_2 });
    // level and its dimensions
    p.text(
      v.map([xD - ch.radiusAt(levelLocal) - 5, sh + levelLocal + 9]),
      l('niveau d’eau au repos', 'water level at rest'),
      { size: 1.8, color: WATER, anchor: 'end', baseline: 'middle' },
    );
    p.text(v.map([xD, sh + levelLocal + 110]), l('AIR', 'AIR'), {
      size: 2.6,
      weight: 'bold',
      anchor: 'middle',
      baseline: 'middle',
      color: INK_2,
    });
    p.text(v.map([xD, sh + levelLocal - 60]), l('EAU', 'WATER'), {
      size: 2.6,
      weight: 'bold',
      anchor: 'middle',
      baseline: 'middle',
      color: WATER,
    });
    dimV(v, [xD - CH_MM.R, 0], [xD - CH_MM.R, levelAbs], xD - CH_MM.R - 55, labN(levelAbs, 0, 'E'), 2.1);
    dimH(v, [xD - CH_MM.R, sh + 300], [xD + CH_MM.R, sh + 300], sh + 300, labOf(dim('CHAMBER', 'diameter'), 'Ø'), 2.1);
    dimH(v, [xS, -R.bodyR], [xD, -R.bodyR], -R.bodyR - 14, lab(xD - xS, 'E'), 2.1);
    // balloons
    const B = (at: Pt, bx: number, by: number, n: number): void => balloon(v, at, bx, by, n);
    B([xS - 30, -R.bodyR + 3], 27, 207, ITEM['ram']!);
    B([xD + 25, CHECK_BASE + 52], 86, 176, ITEM['delivery-valve']!);
    B([xD + CH_MM.R - 0.5, sh + 250], 100, 100, ITEM['air-chamber']!);
    B([xS - 5, SN_BOSS.top + 15], 24, 172, ITEM['snifter']!);
    B([xD + 22, gy + 60], 100, 62, ITEM['gauge']!);
    B([u0 + 20, yo - 18], 118, 170, ITEM['delivery-union']!);
    B([valve0 + 30, yo - 21], 102, 170, ITEM['outlet-valve']!);
    v.caption([R.xDelivery + 70, -95], l('COUPE A–A · BÉLIER AU REPOS', 'SECTION A–A · RAM AT REST'), '1:5');
  }

  // ------------------------------------------------------------------ detail E: the check valve, 2:1
  {
    const k2 = 2;
    const W_E: Box = { x0: -34, x1: 34, y0: -14, y1: 90 };
    const v = d.view(196, 208, k2);
    const wd: Pt[] = [
      [-CV.seatBoreR, -14],
      [CV.seatBoreR, -14],
      [CV.seatBoreR, CV.seatY],
      [CV.cavR, CV.seatY],
      [CV.cavR, CV.ceilY],
      [11.5, 74],
      [11.5, 90],
      [-11.5, 90],
      [-11.5, 74],
      [-CV.cavR, CV.ceilY],
      [-CV.cavR, CV.seatY],
      [-CV.seatBoreR, CV.seatY],
    ];
    poly(v, wd, { w: 0, fill: WATER_FILL });
    // delivery boss of the body
    for (const s of [1, -1]) {
      rectIn(v, [s * 13.5, -13], [s * 34, 0], hatched('steel'), W_E);
      rectIn(v, [s * 11, -14], [s * 34, -13], hatched('steel'), W_E);
      poly(
        v,
        BODY.map(([r, y]): Pt => [s * r, y]),
        hatched('copper'),
      );
      v.rect([s * (CV.rv - 0.5), 16], [s * (CV.rv + 4.5), 42], hatched('copper'));
    }
    // disc with its seal and pin, on the seat; the open position in phantom
    v.rect([-CV.discR, CV.seatY], [CV.discR, CV.seatY + CV.discT], hatched('alu'));
    for (const s of [1, -1]) v.circle([s * 12.5, CV.seatY - 0.4], 1.6, { w: W.thin, fill: COLORS.ink });
    v.rect([-4, CV.seatY + CV.discT], [4, CV.seatY + CV.discT + 6], hatched('alu'));
    const lift = CV.lift;
    v.rect([-CV.discR, CV.seatY + lift], [CV.discR, CV.seatY + lift + CV.discT], {
      w: W.medium,
      dash: 'phantom',
      color: COLORS.copper,
      fill: 'none',
    });
    // spring: wire sections at the sides joined by thin diagonals
    const y0 = CV.seatY + CV.discT;
    const turns = 7;
    const pitch = SPRING_REST_MM / turns;
    for (let i = 0; i < turns; i++) {
      const ya = y0 + i * pitch;
      v.line([-CV.springR, ya], [CV.springR, ya + pitch / 2], { w: W.thin });
      v.line([CV.springR, ya + pitch / 2], [-CV.springR, ya + pitch], { w: W.thin });
    }
    for (let i = 0; i <= turns; i++) {
      v.circle([-CV.springR, y0 + i * pitch], 0.8, { w: W.thin, fill: COLORS.ink });
      if (i < turns) v.circle([CV.springR, y0 + i * pitch + pitch / 2], 0.8, { w: W.thin, fill: COLORS.ink });
    }
    v.center([0, -16], [0, 92]);
    // water arrow and dimensions
    flow(v, [0, -12], [0, 28], WATER, W.medium);
    dimV(v, [CV.rv + 4.5, CV.seatY], [CV.rv + 4.5, CV.seatY + lift], 36, lab(lift, 'E'), 2);
    dimH(
      v,
      [-CV.seatBoreR, CV.seatY - 6],
      [CV.seatBoreR, CV.seatY - 6],
      CV.seatY - 6,
      lab(CV.seatBoreR * 2, 'E', 'Ø'),
      2,
    );
    dimH(v, [-CV.rv, 56], [CV.rv, 56], -17, labOf(dim('CHECK_VALVE', 'acrossFlats'), 'Ø'), 2);
    dimV(v, [-CV.rv, 0], [-CV.rv, 80], -CV.rv - 16, labOf(dim('CHECK_VALVE', 'height')), 2);
    dimV(
      v,
      [CV.rv, CV.seatY + CV.discT],
      [CV.rv, CV.seatY + CV.discT + SPRING_REST_MM],
      CV.rv + 14,
      lab(SPRING_REST_MM, 'E'),
      2,
    );
    v.leader([-CV.discR + 2, CV.seatY + 2], -9, -8, l('disque inox + joint', 'stainless disc + seal'), { size: 1.75 });
    v.leader([CV.springR, y0 + 2.5 * pitch], 14, -8, l('ressort', 'spring'), { size: 1.75 });
    v.leader([CV.seatBoreR, CV.seatY - 1], 16, 12, l('siège', 'seat'), { size: 1.75 });
    v.leader([0, CV.seatY + CV.discT + 4], -12, -6, l('tige du disque', 'disc stem'), { size: 1.75 });
    v.leader([11.5, 82], 12, -4, l('sortie vers la cloche', 'outlet to the chamber'), { size: 1.75 });
    v.caption([0, -22.5], l('DÉTAIL E · CLAPET DE REFOULEMENT', 'DETAIL E · DELIVERY CHECK VALVE'), '2:1');
  }

  // ------------------------------------------------------------------ detail F: the snifter, 2:1 (principle)
  {
    const k2 = 2;
    const v = d.view(322, 236, k2);
    const sy = SN_BOSS.top;
    const win: Box = { x0: -20, x1: 20, y0: 26, y1: 90 };
    // the body bore under the boss, then the top wall of the body and the boss, cut at both sides
    rectIn(v, [-SNIFTER.boreR, 26], [SNIFTER.boreR, R.bodyR], { w: 0, fill: WATER_FILL }, win);
    for (const s of [1, -1]) {
      rectIn(v, [s * SNIFTER.boreR, R.bodyIR], [s * 20, R.bodyR], hatched('steel'), win);
      rectIn(v, [s * SNIFTER.boreR, R.bodyR], [s * SN_BOSS.r, sy], hatched('steel'), win);
      v.line([s * 20, R.bodyIR], [s * 20, R.bodyR], { w: W.thin, dash: 'center', color: INK_2 });
    }
    rectIn(v, [-SNIFTER.boreR, R.bodyR], [SNIFTER.boreR, sy], { w: 0, fill: PAPER }, win);
    // body of the snifter (solid brass in the 3D) with the orifice of the model through it
    const body: Pt[] = [
      [0, R.bodyR],
      [SNIFTER.thread, R.bodyR],
      [SNIFTER.thread, sy],
      [SNIFTER.hexAF / 2, sy],
      [SNIFTER.hexAF / 2, sy + SNIFTER.hexT],
      [SNIFTER.bodyR, sy + SNIFTER.hexT],
      [SNIFTER.bodyR, sy + SNIFTER.hexT + SNIFTER.bodyL],
    ];
    const dome: Pt[] = [];
    for (let i = 0; i <= 18; i++) {
      const a = (i / 18) * (Math.PI / 2);
      dome.push([SNIFTER.domeR * Math.cos(a), sy + 22 + SNIFTER.domeR * Math.sin(a)]);
    }
    const half: Pt[] = [...body, ...dome, [SNIFTER.orifice, sy + 22 + SNIFTER.domeR], [SNIFTER.orifice, R.bodyR]];
    poly(v, half, hatched('copper'));
    poly(
      v,
      half.map(([x, y]): Pt => [-x, y]),
      hatched('copper'),
    );
    // pin and ball, closed and lifted (phantom)
    const py = sy + 28;
    v.rect([-1.1, py - 1.5], [1.1, py + 5], { w: W.medium, fill: PAPER });
    v.circle([0, py + 5.2], 2.1, { w: W.medium, fill: PAPER });
    const lifted = 2.2;
    v.rect([-1.1, py - 1.5 + lifted], [1.1, py + 5 + lifted], {
      w: W.medium,
      dash: 'phantom',
      color: COLORS.copper,
      fill: 'none',
    });
    v.circle([0, py + 5.2 + lifted], 2.1, { w: W.medium, dash: 'phantom', color: COLORS.copper, fill: 'none' });
    flow(v, [-11, py + 10], [-3.2, py + 6.4], INK_2, W.medium, true);
    v.center([0, 24], [0, py + 12]);
    v.leader(
      [SNIFTER.orifice, sy + 8],
      16,
      8,
      l(`orifice Ø${nFr(SNIFTER_DIAMETER * 1000, 1)} (modèle)`, `Ø${nEn(SNIFTER_DIAMETER * 1000, 1)} orifice (model)`),
      { size: 1.75 },
    );
    v.leader([1.1, py + 3], 16, -4, l('tige et bille', 'pin and ball'), { size: 1.75 });
    v.leader(
      [SNIFTER.hexAF / 2, sy + 4],
      12,
      6,
      cat(l('hexagone ', 'hex '), lab(SNIFTER.hexAF, 'E'), l(' s/plats', ' a/f')),
      { size: 1.75 },
    );
    v.leader([-9, py + 10], -4, -6, l('air extérieur', 'outside air'), { size: 1.75 });
    v.leader([0, 29], 10, 0, l('eau du corps', 'body water'), { size: 1.75, color: WATER });
    v.caption([0, 22.5], l('DÉTAIL F · RENIFLARD (principe)', 'DETAIL F · SNIFTER (principle)'), '2:1');
  }

  // ------------------------------------------------------------------ what the section shows
  const nx = 268;
  box(
    d,
    nx,
    207,
    408 - nx,
    l('CE QUE MONTRE LA COUPE', 'WHAT THE SECTION SHOWS'),
    [
      {
        bullet: '1',
        t: l(
          `Au repos, la colonne de 65 m est pleine et retenue par le clapet de refoulement : le manomètre lit ${nFr(DERIVED.deliveryBar, 1)} bar (dérivé). L’eau remplit le corps, la branche, le clapet et la cloche jusqu’au niveau ; l’air est au-dessus.`,
          `At rest the 65 m column is full and held by the delivery check valve: the gauge reads ${nEn(DERIVED.deliveryBar, 1)} bar (derived). Water fills the body, the branch, the valve and the chamber up to the level; the air is above.`,
        ),
      },
      {
        bullet: '2',
        t: l(
          `Niveau du modèle : ${Math.round(AIR_FRACTION_NOMINAL * 100)} % d’air (hypothèse du modèle), soit ${nFr(DERIVED.airLitres, 1)} L d’air sur ${CHAMBER.volumeL} L (estimation) ; le niveau dessiné suit la règle de la vue 3D.`,
          `Model level: ${Math.round(AIR_FRACTION_NOMINAL * 100)}% air (model assumption), that is ${nEn(DERIVED.airLitres, 1)} L of air out of ${CHAMBER.volumeL} L (estimate); the level drawn follows the 3D view’s rule.`,
        ),
      },
      {
        bullet: '3',
        t: l(
          `À chaque coup le disque se soulève d’environ ${nFr(CHECK_VALVE.lift * 1000)} mm* et laisse passer ${nFr(MODEL.mlPerStroke, 1)} mL (résultat du modèle) ; au recul, la pression du corps tombe à −${nFr(MODEL.recoilDipBar, 2)} bar : le reniflard s’ouvre sous −${nFr(SNIFTER_CRACK / 1e5, 2)} bar (modèle) et laisse entrer un peu d’air.`,
          `At each stroke the disc lifts about ${nEn(CHECK_VALVE.lift * 1000)} mm* and passes ${nEn(MODEL.mlPerStroke, 1)} mL (model result); on the recoil the body pressure falls to −${nEn(MODEL.recoilDipBar, 2)} bar: the snifter opens under −${nEn(SNIFTER_CRACK / 1e5, 2)} bar (model) and lets a little air in.`,
        ),
      },
      {
        bullet: '4',
        t: l(
          'La vidéo situe le clapet de refoulement dans la cloche sans en montrer l’intérieur et ne montre pas le reniflard : l’intérieur de ces pièces est un schéma de principe, le 3D n’en dessine que l’extérieur.',
          'The video places the delivery check valve in the chamber without showing its inside and does not show the snifter: the inside of these parts is a schematic of the principle, the 3D draws only their outside.',
        ),
      },
    ],
    { size: 1.7 },
  );
  // key
  heading(d, 280, 14, l('LÉGENDE', 'KEY'), { size: 2 });
  p.rect([280, 19], [290, 24], { w: W.thin, fill: WATER_FILL, hatch: 'water' });
  p.text([293, 21.5], l('eau', 'water'), { size: 1.8, baseline: 'middle' });
  p.rect([310, 19], [320, 24], { w: W.thin, fill: PAPER });
  p.text([323, 21.5], l('air (au-dessus du niveau)', 'air (above the level)'), { size: 1.8, baseline: 'middle' });
  p.rect([280, 27], [290, 32], { w: W.thin, fill: COLORS.ink });
  p.text([293, 29.5], l('paroi mince pleine (cloche, 3 mm)', 'thin solid wall (chamber, 3 mm)'), {
    size: 1.8,
    baseline: 'middle',
  });
  p.line([280, 37], [290, 37], { w: W.medium, color: COLORS.red });
  p.text([293, 37], l('aiguille à la pression statique', 'needle at the static pressure'), {
    size: 1.8,
    baseline: 'middle',
  });
  p.line([280, 42], [290, 42], { w: W.medium, dash: 'phantom', color: COLORS.copper });
  p.text([293, 42], l('position ouverte (levée du disque, tige)', 'open position (disc lift, pin)'), {
    size: 1.8,
    baseline: 'middle',
  });
  marksLegend(d, 14, 250, 84);
  p.text(
    [14, 276],
    l(
      'Bélier générique de 1″ : pas le Walton n°3 de la vidéo. Toutes les cotes de cette feuille sont des estimations ou des dérivés.',
      'Generic 1″ ram: not the video’s Walton No. 3. Every dimension on this sheet is an estimate or derived.',
    ),
    { size: 1.7, color: INK_2, baseline: 'middle' },
  );
  return d;
}

export const chamberSectionSheet: DrawingSheet = {
  id: 'chamber-section',
  number: NUMBER,
  group: 'ram',
  title: TITLE,
  description: l(
    'Coupe par l’axe du bélier au repos, à 1:5, avec deux détails à 2:1. On y lit où sont l’eau et l’air (le niveau d’eau du modèle dans la cloche), le clapet de refoulement avec son disque et son ressort, le reniflard et sa tige, le manomètre qui lit la pression statique de la colonne de 65 m et la sortie vers la conduite de refoulement. L’intérieur du clapet de refoulement et du reniflard est un schéma de principe : seul leur extérieur est dessiné en 3D.',
    'Section through the ram’s axis at rest, at 1:5, with two details at 2:1. It shows where the water and the air are (the model’s water level in the chamber), the delivery check valve with its disc and spring, the snifter and its pin, the gauge that reads the static pressure of the 65 m column and the outlet to the delivery pipe. The inside of the delivery check valve and of the snifter is a schematic of the principle: only their outside is drawn in 3D.',
  ),
  scene: 'ram',
  parts: ['delivery-valve', 'air-chamber', 'snifter', 'gauge', 'delivery-union', 'outlet-valve', 'ram'],
  render,
};
