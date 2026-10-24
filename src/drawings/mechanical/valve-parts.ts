import { Drawing, INK_2, W, type Pt } from '@onigam/lab-kit/drawings';
import type { DrawingSheet } from '@onigam/lab-kit/drawings';
import { l } from '@onigam/lab-kit/i18n';
import { WEIGHT } from '../../data/part-helpers';
import { VALVE_DERIVED } from '../../data/parts/valve';
import { nEn, nFr } from '../../data/units';
import { VALVES } from '../../sim/physics';
import { VALVE } from '../../three/dims';
import {
  PAPER,
  dimH,
  dimV,
  grid,
  hatched,
  heading,
  marksLegend,
  med,
  note,
  poly,
  rectIn,
  thin,
  threadV,
  type Box,
} from './draw';
import {
  CONE_DEG,
  CONE_TOP,
  FINS_BOTTOM,
  NECK_BOTTOM,
  ROD_BOTTOM,
  V,
  cat,
  corner,
  k,
  dim,
  lab,
  labN,
  labOf,
  stack,
  type Status,
} from './geom';
import type { L } from '@onigam/lab-kit/i18n';

type Cell3 = L;
import { HEAD, SEAT } from './valve-draw';

const NUMBER = 'RP-D03';
const TITLE = l('Clapet de choc — pièces', 'Waste valve — parts');
const PARTS_SHOWN = ['valve-stem', 'stem-sleeves', 'valve-head', 'counterweight', 'valve-guide', 'valve-nipple'];

/** Both sides of a right-hand profile, as closed polygons. */
function sides(profile: Pt[], dy = 0): Pt[][] {
  return [1, -1].map((sx) => profile.map(([r, y]): Pt => [sx * r, y + dy]));
}

/** Angles (radians) of the wall bars of the nipple between its four ports, for a ring radius `r` and a port half-width `h`. */
function barAngles(r: number, h: number): [number, number] {
  const a = Math.asin(h / r);
  return [a, Math.PI / 2 - a];
}

function render(): Drawing {
  const d = new Drawing();
  d.frame({
    title: TITLE,
    subtitle: l(
      'Tige et manchons, tête, poids, guide, mamelon à lumières · ajustements et tailles de plomberie',
      'Stem and sleeves, head, weight, guide, ported nipple · fits and plumbing sizes',
    ),
    number: NUMBER,
    scale: '1:1 · 2:1',
  });
  const p = d.paper();
  const st = stack(2.2);
  const rodLen = st.rodTop - ROD_BOTTOM;
  const dy0 = -ROD_BOTTOM;

  // ------------------------------------------------------------------ 1. stem with its sleeves, 1:1
  {
    const v = d.view(46, 246, 1);
    const R = V.rodR;
    v.rect([-R, 0], [R, rodLen], { w: W.medium, fill: PAPER });
    threadV(v, 0, R, 0, rodLen);
    for (const s of sides(HEAD, dy0)) poly(v, s, hatched('alu'));
    for (const sx of [1, -1]) {
      v.rect([sx * R, FINS_BOTTOM + dy0], [sx * V.finsHub, V.headBase + dy0], med());
      v.rect([sx * V.finsHub, FINS_BOTTOM + dy0 + 0.5], [sx * V.finsR, V.headBase + dy0 - 0.5], thin());
    }
    for (let i = 0; i < 2; i++) {
      const y0 = V.sleeveOnRodBottom + i * V.sleeveOnRodSpacing + dy0;
      for (const sx of [1, -1]) v.rect([sx * R, y0], [sx * V.sleeveOnRodR, y0 + V.sleeveOnRodL], hatched('copper'));
    }
    v.center([0, -4], [0, rodLen + 4]);
    // chain of heights from the bottom end of the rod
    const s1 = V.sleeveOnRodBottom + dy0;
    const chain: [number, number, Status][] = [
      [0, V.headBase + dy0, 'E'],
      [V.headBase + dy0, s1, 'E'],
      [s1, s1 + V.sleeveOnRodL, 'E'],
      [s1 + V.sleeveOnRodL, s1 + V.sleeveOnRodSpacing, 'E'],
      [s1 + V.sleeveOnRodSpacing, s1 + V.sleeveOnRodSpacing + V.sleeveOnRodL, 'E'],
    ];
    for (const [a, b, status] of chain)
      dimV(v, [-V.sleeveOnRodR, a], [-V.sleeveOnRodR, b], -13, lab(b - a, status), 1.9);
    dimV(v, [R, 0], [R, rodLen], 13, lab(rodLen, 'E'), 2.2);
    v.leader([R, rodLen - 6], 9, -1, l('tige M6 (Ø6)', 'M6 rod (Ø6)'), { size: 1.8 });
    v.leader(
      [V.sleeveOnRodR, s1 + 6],
      12,
      7,
      l(`manchons Ø${nFr(V.sleeveOnRodR * 2, 1)}† ×2`, `sleeves Ø${nEn(V.sleeveOnRodR * 2, 1)}† ×2`),
      { size: 1.8 },
    );
    v.leader([V.headR - 1.5, V.headBase + dy0 + 1.4], 12, -8, l('tête (voir ci-dessous)', 'head (see below)'), {
      size: 1.8,
    });
    v.leader([V.finsR, 4.5], 10, 5, l('écrou à ailettes', 'fins nut'), { size: 1.8 });
    v.caption([0, rodLen + 14], l('TIGE ET MANCHONS', 'STEM AND SLEEVES'), '1:1');
  }

  // ------------------------------------------------------------------ 2. valve head, 5:1
  {
    const k5 = 5;
    const v = d.view(152, 212, k5);
    const prof: Pt[] = HEAD.map(([r, y]): Pt => [r, y - V.headBase]);
    for (const s of sides(prof)) poly(v, s, hatched('alu'));
    v.rect([-V.rodR, -0.2], [V.rodR, V.headR - V.rodR + 0.2], { w: 0, fill: 'none' });
    v.center([0, -3], [0, 9]);
    dimH(v, [-V.headR, 0], [V.headR, 0], -1.7, labOf(dim('VALVE', 'headDiameter'), 'Ø'), 2.2);
    dimV(v, [-V.headR, 0], [-V.headR, CONE_TOP - V.headBase], -V.headR - 4.5, labOf(dim('VALVE', 'headHeight')), 2.2);
    v.leader([0, CONE_TOP - V.headBase - 0.2], 14, -3, l('alésage Ø6 : la tige', 'Ø6 bore: the rod'), { size: 1.7 });
    v.leader([5.5, 1.9], 14, -6, l(`demi-angle du cône ${CONE_DEG}°*`, `cone half angle ${CONE_DEG}°*`), { size: 1.8 });
    v.caption([0, -3.6], l('TÊTE · vis inox raccourcie', 'HEAD · shortened stainless screw'), '5:1');
  }

  // ------------------------------------------------------------------ 3. guide (thermowell), 2:1, the tube cut short
  {
    const k2 = 2;
    const v = d.view(140, 124, k2);
    const len = V.guideTop - V.tubeBottom;
    const neck0 = NECK_BOTTOM - V.tubeBottom;
    const col0 = V.sleeveTop - V.tubeBottom;
    // the 45 mm of plain tube under the neck are drawn 18 mm shorter (break)
    const cut = 27;
    const c = (y: number): number => (y <= 7 ? y : y - cut);
    const lower: Pt[] = [
      [V.tubeBoreR, 0],
      [V.tubeR, 0],
      [V.tubeR, 7],
      [V.tubeBoreR, 7],
    ];
    const upper: Pt[] = [
      [V.tubeBoreR, 10],
      [V.tubeR, 10],
      [V.tubeR, c(neck0)],
      [V.threadR, c(neck0)],
      [V.threadR, c(col0)],
      [V.collarR, c(col0)],
      [V.collarR, c(len) - 0.8],
      [V.collarR - 0.8, c(len)],
      [V.tubeBoreR, c(len)],
    ];
    for (const sx of [1, -1]) {
      poly(
        v,
        lower.map(([r, y]): Pt => [sx * r, y]),
        hatched('alu'),
      );
      poly(
        v,
        upper.map(([r, y]): Pt => [sx * r, y]),
        hatched('alu'),
      );
      v.line([sx * (V.tubeR + 0.6), 6.4], [sx * (V.tubeBoreR - 0.6), 7.6], { w: W.thin });
      v.line([sx * (V.tubeR + 0.6), 9.4], [sx * (V.tubeBoreR - 0.6), 10.6], { w: W.thin });
    }
    v.center([0, -4], [0, c(len) + 4]);
    const neck = c(neck0);
    const col = c(col0);
    const top = c(len);
    for (const sx of [1, -1]) v.line([sx * V.threadR, neck], [sx * V.threadR, col], { w: W.thin });
    dimV(v, [V.collarR, 0], [V.collarR, neck], 17, lab(neck0, 'E'), 2);
    dimV(v, [V.collarR, neck], [V.collarR, col], 17, lab(V.sleeveTop - NECK_BOTTOM, 'E'), 2);
    dimV(v, [V.collarR, col], [V.collarR, top], 17, lab(V.guideTop - V.sleeveTop, 'D'), 2);
    dimV(v, [-V.collarR, 0], [-V.collarR, top], -17, lab(len, 'E'), 2);
    dimH(v, [-V.collarR, top], [V.collarR, top], top + 6, labOf(dim('VALVE', 'guideCollarDiameter'), 'Ø'), 2.1);
    dimH(v, [-V.tubeR, 0], [V.tubeR, 0], -5, labOf(dim('VALVE', 'guideTubeOuterDiameter'), 'Ø'), 2.1);
    v.leader(
      [V.tubeBoreR - 0.4, 3.5],
      22,
      8,
      l(`alésage Ø${nFr(V.tubeBoreR * 2)}*`, `bore Ø${nEn(V.tubeBoreR * 2)}*`),
      { size: 1.8 },
    );
    v.leader([V.threadR, (neck + col) / 2], 14, -10, l('filetage 15×21', '15×21 thread'), { size: 1.8 });
    v.leader([V.collarR, top - 0.4], 8, -7, l('butée du poids', 'weight stop'), { size: 1.8 });
    v.caption([0, -13.5], l('GUIDE · doigt de gant inox', 'GUIDE · stainless thermowell'), '2:1');
  }

  // ------------------------------------------------------------------ 4. nipple with its ports, 2:1, and section B–B
  {
    const k2 = 2;
    const v = d.view(262, 192, k2);
    const y0 = V.nippleBottom;
    const top = V.nippleTop - y0;
    const seat = SEAT.map(([r, y]): Pt => [r, y - y0]);
    const wall = (sx: number, a: number, b: number): Pt[] => [
      [sx * V.seatBoreR, a],
      [sx * V.threadR, a],
      [sx * V.threadR, b],
      [sx * V.seatBoreR, b],
    ];
    for (const sx of [1, -1]) {
      poly(
        v,
        seat.map(([r, y]): Pt => [sx * r, y]),
        hatched('steel'),
      );
      poly(v, wall(sx, V.seatTop - y0, V.portBottom - y0), hatched('steel'));
      poly(v, wall(sx, V.portTop - y0, top), hatched('steel'));
      v.line([sx * V.seatBoreR, V.seatTop - y0], [sx * V.threadR, V.seatTop - y0], { w: W.thin });
    }
    // lock nut against the reducer (12 mm above the foot), cut through its corners
    const nut0 = V.redTop - y0;
    for (const sx of [1, -1]) v.rect([sx * V.threadR, nut0], [sx * corner(V.lockAF), nut0 + V.lockT], hatched('steel'));
    // the opening of the far port, seen through the bore
    const pb = V.portBottom - y0;
    const pt = V.portTop - y0;
    v.rect([-V.portW / 2, pb], [V.portW / 2, pt], { w: W.thin, color: INK_2 });
    for (const sx of [1, -1]) v.line([sx * V.seatBoreR, pb], [sx * V.seatBoreR, pt], { w: W.thin, color: INK_2 });
    v.center([0, -4], [0, top + 4]);
    const pm = (V.portBottom + V.portTop) / 2 - y0;
    v.sectionMark([-15, pm], [15, pm], 'B', 1);
    dimV(v, [V.threadR, 0], [V.threadR, top], 22, lab(top, 'R'), 2.2);
    dimV(v, [-V.threadR, V.portBottom - y0], [-V.threadR, V.portTop - y0], -22, lab(V.portTop - V.portBottom, 'E'), 2);
    dimV(v, [-V.threadR, 0], [-V.threadR, V.portBottom - y0], -22, lab(V.portBottom - y0, 'E'), 2);
    dimV(v, [-V.threadR, V.portTop - y0], [-V.threadR, top], -22, lab(V.nippleTop - V.portTop, 'E'), 2);
    dimH(v, [-V.threadR, top], [V.threadR, top], top + 7, labOf(dim('VALVE', 'threadDiameter'), 'Ø'), 2.1);
    dimH(v, [-V.seatBoreR, 0], [V.seatBoreR, 0], -6, lab(V.seatBoreR * 2, 'R', 'Ø'), 2.1);
    v.leader([corner(V.lockAF), nut0 + 3.5], 8, 0, l(`contre-écrou ${nFr(V.lockAF)}*`, `lock nut ${nEn(V.lockAF)}*`), {
      size: 1.7,
    });
    v.leader([V.threadR, top - 8], 12, -2, l('filetage 15×21', '15×21 thread'), { size: 1.7 });
    v.leader([V.seatBoreR + 0.8, 2.2], 12, 7, l('portée conique (RP-D04)', 'conical seat (RP-D04)'), { size: 1.7 });
    v.caption([0, 88.2], l('MAMELON 15×21 À LUMIÈRES', '15×21 PORTED NIPPLE'), '2:1');

    // section B–B through the middle of the ports, at 2:1
    const b = d.view(372, 50, k2);
    const rOut = V.threadR;
    const rIn = V.seatBoreR;
    const half = V.portW / 2;
    for (let q = 0; q < 4; q++) {
      const [ao, bo] = barAngles(rOut, half);
      const [ai, bi] = barAngles(rIn, half);
      const pts: Pt[] = [];
      const n = 10;
      for (let i = 0; i <= n; i++)
        pts.push([rOut * Math.cos(ao + ((bo - ao) * i) / n), rOut * Math.sin(ao + ((bo - ao) * i) / n)]);
      for (let i = n; i >= 0; i--)
        pts.push([rIn * Math.cos(ai + ((bi - ai) * i) / n), rIn * Math.sin(ai + ((bi - ai) * i) / n)]);
      const rot = (pt: Pt): Pt => {
        const a = (q * Math.PI) / 2;
        return [pt[0] * Math.cos(a) - pt[1] * Math.sin(a), pt[0] * Math.sin(a) + pt[1] * Math.cos(a)];
      };
      poly(b, pts.map(rot), hatched('steel'));
    }
    b.center([-14, 0], [14, 0]);
    b.center([0, -14], [0, 14]);
    dimH(b, [-half, rOut], [half, rOut], rOut + 6, lab(V.portW, 'E'), 1.9);
    b.leader([-rOut * 0.74, rOut * 0.74], -8, -6, l('4 lumières à 90°', '4 ports at 90°'), { size: 1.7 });
    b.caption([0, -15.5], l('COUPE B–B', 'SECTION B–B'), '2:1');
  }

  // ------------------------------------------------------------------ 5. counterweight, 1:1
  {
    const v = d.view(366, 158, 1);
    const R = V.weightR;
    const bore = V.rodR + 0.4;
    const rib = k(VALVE.rebarRibHeight);
    const n = 20;
    const ribbed: Pt[] = [];
    for (let i = 0; i <= n; i++) ribbed.push([R - (i % 2 === 0 ? rib : 0), (V.weightL * i) / n]);
    const prof: Pt[] = [[bore, 0], [R - rib, 0], ...ribbed, [R - rib, V.weightL], [bore, V.weightL]];
    for (const s of sides(prof)) poly(v, s, hatched('plastic'));
    v.center([0, -4], [0, V.weightL + 4]);
    for (const sx of [1, -1])
      v.line([sx * V.rodR, 0], [sx * V.rodR, V.weightL], { w: W.thin, dash: 'hidden', color: INK_2 });
    dimV(v, [R, 0], [R, V.weightL], R + 6, labOf(dim('VALVE', 'counterweightLength')), 2.2);
    dimH(v, [-R, V.weightL], [R, V.weightL], V.weightL + 7, labOf(dim('VALVE', 'counterweightDiameter'), 'Ø'), 2.2);
    v.leader([bore, 44], -9, 4, l('M6 taraudé', 'tapped M6'), { size: 1.7 });
    v.leader([-R + 0.6, 22], -4, 6, l('nervures', 'ribs'), { size: 1.7 });
    v.leader([-R + 4, 0.2], -3, 6, l('face plane', 'flat face'), { size: 1.7 });
    v.caption([0, -12.5], l(`CONTREPOIDS · ${WEIGHT} g (calibré)`, `COUNTERWEIGHT · ${WEIGHT} g (calibrated)`), '1:1');
  }

  // ------------------------------------------------------------------ 6. fit of a sleeve in the guide, 20:1
  {
    const k20 = 20;
    const WF: Box = { x0: V.rodR, x1: 6.5, y0: 0, y1: 2.6 };
    const v = d.view(270, 248, k20);
    const gap = (V.tubeBoreR - V.sleeveOnRodR) * 2;
    rectIn(v, [V.rodR, 0], [V.sleeveOnRodR, 2.6], hatched('copper'), WF);
    rectIn(v, [V.tubeBoreR, 0], [V.tubeR, 2.6], hatched('alu'), WF);
    v.line([V.rodR, 0], [V.rodR, 2.6], { w: W.thick });
    v.line([V.tubeR, 0], [V.tubeR, 2.6], { w: W.thin });
    v.leader(
      [(V.sleeveOnRodR + V.tubeBoreR) / 2, 1.3],
      -6,
      -26,
      l(`jeu ${nFr(gap / 2, 2)} mm par côté`, `${nEn(gap / 2, 2)} mm clearance per side`),
      { size: 1.8 },
    );
    p.text(v.map([V.rodR + 0.25, 1.0]), l('tige Ø6', 'rod Ø6'), {
      size: 1.7,
      anchor: 'start',
      color: INK_2,
      halo: true,
    });
    p.text(v.map([(V.rodR + V.sleeveOnRodR) / 2, 2.1]), l('manchon', 'sleeve'), {
      size: 1.7,
      anchor: 'middle',
      color: INK_2,
      halo: true,
    });
    p.text(v.map([(V.tubeBoreR + V.tubeR) / 2, 2.1]), l('guide', 'guide'), {
      size: 1.7,
      anchor: 'middle',
      color: INK_2,
      halo: true,
    });
    v.caption([4.75, 3.3], l('AJUSTEMENT MANCHON / GUIDE', 'SLEEVE / GUIDE FIT'), '20:1');
  }

  // ------------------------------------------------------------------ tables, legend, notes
  const mmV = (m: number): number => k(m);
  const trade = ['15×21', '20×27', '26×34'];
  const inch = ['½″', '¾″', '1″'];
  const remark = [
    l('celui du nouveau clapet', 'the new valve’s'),
    l('essai : consomme trop', 'trial: uses too much'),
    l('d’origine : 17 L/min', 'original: 17 L/min'),
  ];
  heading(d, 104, 240, l('TAILLES DE PLOMBERIE (S1 03:54)', 'PLUMBING SIZES (S1 03:54)'), { size: 1.9 });
  grid(
    d,
    104,
    244.4,
    [
      { label: l('Clapet', 'Valve'), w: 15 },
      { label: l('Raccord', 'Fitting'), w: 40, mono: true },
      { label: l('Siège', 'Seat'), w: 14, mono: true },
      { label: l('Remarque', 'Remark'), w: 55 },
    ],
    ([1, 2, 3] as const).map((n) => [
      { t: `n°${n}` },
      { t: `${trade[n - 1]} (DN${VALVES[n].dn}, ${inch[n - 1]})` },
      { t: lab(mmV(VALVE.seatBore[n]), 'R', 'Ø') },
      { t: remark[n - 1]! },
    ]),
    { size: 1.65, pad: 0.55, lineH: 2.5 },
  );
  marksLegend(d, 14, 252, 84);
  note(
    d,
    14,
    274,
    214,
    l(
      'Aucune tolérance de fabrication ni couple de serrage : la source n’en donne pas, la feuille ne remplace pas un plan d’atelier. Les raccords 15×21 sont filetés ½″ gaz (14 filets par pouce).',
      'No machining tolerance and no tightening torque: the source gives none, and this sheet is not a workshop drawing. The 15×21 fittings are ½″ BSP threaded (14 threads per inch).',
    ),
    { size: 1.65, color: INK_2 },
  );
  heading(d, 205, 213, l('AJUSTEMENTS ET JEUX', 'FITS AND CLEARANCES'), { size: 1.9 });
  const fitRows: [Cell3, Cell3, Cell3][] = [
    [
      l('Manchons dans le guide', 'Sleeves in the guide'),
      cat(lab(V.sleeveOnRodR * 2, 'D', 'Ø'), l(' sur ', ' in '), lab(V.tubeBoreR * 2, 'E', 'Ø')),
      l('0,1 mm au diamètre (S1 09:02)', '0.1 mm on the diameter (S1 09:02)'),
    ],
    [
      l('Tête sur portée', 'Head on seat'),
      cat(l('cône ', 'cone '), `2 × ${CONE_DEG}°*`),
      l('portée fraisée au même angle (S1 09:37)', 'seat milled at the same angle (S1 09:37)'),
    ],
    [
      l('Tête : décalage latéral max.', 'Head: largest sideways shift'),
      labN(k(VALVE_DERIVED.headShift), 2, 'D', '≤ ', ' mm'),
      l('conséquence du jeu des manchons', 'follows from the sleeve clearance'),
    ],
    [
      l('Course (réglage du poids)', 'Stroke (weight setting)'),
      cat(`${nFr(V.pitchRod)} mm† `, l('/ tour', '/ turn')),
      l('pas de la tige M6', 'M6 rod pitch'),
    ],
  ];
  grid(
    d,
    205,
    217.4,
    [
      { label: l('Ajustement', 'Fit'), w: 38 },
      { label: l('Valeur', 'Value'), w: 28, mono: true },
      { label: l('Origine', 'Basis'), w: 44 },
    ],
    fitRows.map(([a, b, c]) => [{ t: a }, { t: b }, { t: c }]),
    { size: 1.65, pad: 0.5, lineH: 2.45 },
  );
  return d;
}

export const wasteValveParts: DrawingSheet = {
  id: 'waste-valve-parts',
  number: NUMBER,
  group: 'valve',
  title: TITLE,
  description: l(
    'Les pièces usinées ou fabriquées du clapet, une à une : tige M6 avec ses deux manchons, tête (vis inox raccourcie), contrepoids taillé dans une barre d’armature, doigt de gant qui sert de guide, mamelon 15×21 avec ses quatre lumières (coupe B–B). L’ajustement des manchons dans le guide, à 0,1 mm près (S1 09:02), est détaillé à 20:1 ; deux tableaux donnent les tailles de plomberie des trois clapets et les jeux. La source ne donne ni tolérance de fabrication ni couple de serrage : aucun n’est indiqué.',
    'The valve’s machined or made parts, one by one: the M6 stem with its two sleeves, the head (shortened stainless screw), the counterweight cut from a rebar bar, the thermowell that serves as the guide, the 15×21 nipple with its four ports (section B–B). The fit of the sleeves in the guide, to within 0.1 mm (S1 09:02), is detailed at 20:1; two tables give the plumbing sizes of the three valves and the clearances. The source gives neither a machining tolerance nor a tightening torque: none is shown.',
  ),
  scene: 'valve',
  parts: PARTS_SHOWN,
  render,
};
