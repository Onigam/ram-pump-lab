import { COLORS, Drawing, INK_2, W, type Pt } from '@onigam/lab-kit/drawings';
import type { DrawingSheet } from '@onigam/lab-kit/drawings';
import { l } from '@onigam/lab-kit/i18n';
import { STROKE, WEIGHT } from '../../data/part-helpers';
import { MODEL } from '../../data/parts/ram';
import { nEn, nFr } from '../../data/units';
import {
  ITEM,
  MOVING,
  partOf,
  PAPER,
  WATER,
  balloons,
  box,
  cutEdge,
  dimH,
  dimV,
  flow,
  grid,
  hatched,
  heading,
  hexagon,
  marksLegend,
  med,
  polyIn,
  rectIn,
  thin,
  threadV,
  type Box,
} from './draw';
import { CONE_TOP, FINS_BOTTOM, V, cat, dim, lab, labOf, stack } from './geom';
import { GUIDE, HEAD, SEAT, drawValveSection, movingParts } from './valve-draw';

const NUMBER = 'RP-D02';
const TITLE = l('Clapet de choc — coupe d’ensemble', 'Waste valve — assembly section');
const S = STROKE;

export const VALVE_PART_IDS = [
  'base-plate',
  'valve-socket',
  'valve-reducer',
  'valve-nipple',
  'valve-sleeve',
  'valve-seat',
  'valve-head',
  'valve-stem',
  'stem-sleeves',
  'valve-guide',
  'valve-fins',
  'counterweight',
  'stroke-nut',
  'lock-nut',
];

function render(): Drawing {
  const d = new Drawing();
  d.frame({
    title: TITLE,
    subtitle: l(
      `Pose fermée · course ${nFr(S, 1)} mm · poids ${WEIGHT} g · clapet n°1`,
      `Closed pose · ${nEn(S, 1)} mm stroke · ${WEIGHT} g weight · n°1 valve`,
    ),
    number: NUMBER,
    scale: '1:1 · 5:1',
  });
  const p = d.paper();
  const st = stack(S);

  // ------------------------------------------------------------------ main section 1:1
  const OX = 104;
  const OY = 258;
  const v = d.view(OX, OY, 1);
  drawValveSection(v, S);
  movingParts(v, S, -S, { phantom: true });
  v.center([0, -V.plateT - 14], [0, st.rodTop + 5]);
  // where the plate stands: the waste flange of the ram body, and the drive water that comes up through it
  v.rect([-50, -20], [50, -V.plateT], { w: W.thin, dash: 'hidden', color: INK_2 });
  v.text([16, -16.5], l('bride du corps du bélier', 'ram body flange'), { size: 1.6, color: INK_2 });
  flow(v, [0, -V.plateT - 12], [0, -V.plateT + 10], WATER, W.medium);
  p.text(v.map([-3, -V.plateT - 9]), l('eau motrice', 'drive water'), { size: 1.8, color: WATER, anchor: 'end' });
  // the exhaust through the ports when the valve is open
  const yPort = (V.portBottom + V.portTop) / 2;
  for (const sx of [1, -1]) flow(v, [sx * 9, yPort], [sx * 26, yPort], WATER, W.thin, true);
  p.text(v.map([-28, yPort + 1]), l('lumières ×4', '4 ports'), {
    size: 1.8,
    color: WATER,
    anchor: 'end',
    baseline: 'bottom',
  });
  p.text(v.map([-28, yPort - 1.2]), l('(clapet ouvert)', '(valve open)'), {
    size: 1.6,
    color: WATER,
    anchor: 'end',
    baseline: 'top',
  });

  // height chain from the datum (top face of the plate)
  dimV(v, [-50, 0], [-V.redTopR, V.redTop], -58, lab(V.redTop, 'E'));
  dimV(v, [-50, 0], [-V.collarR, V.guideTop], -68, labOf(dim('VALVE', 'guideTop')));
  dimV(v, [-50, 0], [-V.rodR, st.rodTop], -78, lab(st.rodTop, 'E'));
  p.text(v.map([-80, -25]), l('cotes depuis la face sup. de la platine', 'heights from the top face of the plate'), {
    size: 1.6,
    color: INK_2,
  });

  // detail marks
  for (const [c, r, letter, x1] of [
    [[0, 52], 13, 'D', -25],
    [[0, 163.5], 17, 'C', -29],
  ] as [Pt, number, string, number][]) {
    v.circle(c, r, { w: W.thin, dash: 'center', color: INK_2 });
    v.line([-r, c[1]], [x1 + 3, c[1]], { w: W.thin, dash: 'center', color: INK_2 });
    p.text(v.map([x1, c[1]]), letter, {
      size: 2.6,
      weight: 'bold',
      anchor: 'middle',
      baseline: 'middle',
      color: INK_2,
      halo: true,
    });
  }

  // balloons (items 14 to 27 of RP-D06), leaders towards a column on the right
  const bx = OX + 62;
  const y = (m: number): number => OY - m;
  balloons(v, [
    [[40, -4], bx, y(-4), ITEM['base-plate']!],
    [[19.5, 18], bx, y(14), ITEM['valve-socket']!],
    [[18.2, 44], bx, y(30), ITEM['valve-reducer']!],
    [[8.2, 47], bx, y(44), ITEM['valve-fins']!],
    [[9.3, 53], bx, y(56), ITEM['valve-seat']!],
    [[4.5, 55.5], bx, y(68), ITEM['valve-head']!],
    [[0, 70], bx, y(80), ITEM['valve-stem']!],
    [[9, 113], bx, y(100), ITEM['valve-nipple']!],
    [[4, 126], bx, y(118), ITEM['stem-sleeves']!],
    [[11.8, 133], bx, y(134), ITEM['valve-sleeve']!],
    [[8.6, 150], bx, y(150), ITEM['valve-guide']!],
    [[13, 195], bx, y(190), ITEM['counterweight']!],
    [[4, st.weight1 + 2.5], bx, y(213), ITEM['stroke-nut']!],
    [[4, st.stroke1 + 2.5], bx, y(232), ITEM['lock-nut']!],
  ]);
  v.caption([82, -12], l('COUPE A–A', 'SECTION A–A'), '1:1');

  // ------------------------------------------------------------------ top view 1:2
  const pv = d.view(232, 52, 0.5);
  pv.rect([-50, -50], [50, 50], med());
  for (const sx of [1, -1]) for (const sz of [1, -1]) pv.circle([sx * V.holeQ, sz * V.holeQ], V.holeR, { w: W.thin });
  pv.circle([0, 0], V.socketR, med());
  pv.circle([0, 0], V.redR, thin());
  pv.circle([0, 0], V.weightR, med());
  hexagon(pv, [0, 0], V.nutAF, med());
  pv.circle([0, 0], V.collarR, { w: W.thin, dash: 'hidden', color: INK_2 });
  pv.center([-60, 0], [60, 0]);
  pv.center([0, -56], [0, 56]);
  pv.sectionMark([-64, 0], [64, 0], 'A', 1);
  dimH(pv, [-50, 50], [50, 50], 64, lab(V.plateHalf * 2, 'E'), 2);
  pv.caption([0, -66], l('VUE DE DESSUS', 'TOP VIEW'), '1:2');

  // ------------------------------------------------------------------ detail D (head and seat) 5:1, right half
  const k5 = 5;
  const WD: Box = { x0: 0, x1: 12, y0: 44, y1: 62 };
  const dv = d.view(214, 156 + k5 * WD.y1, k5);
  polyIn(
    dv,
    [
      [0, 44],
      [V.redBoreR, 44],
      [V.redBoreR, V.headBase],
      [0, V.headBase],
    ],
    { w: 0, fill: COLORS.waterFill },
    WD,
  );
  polyIn(
    dv,
    [
      [V.redBoreR, 44],
      [V.redR, 44],
      [V.redR, 62],
      [V.redBoreR, 62],
    ],
    hatched('plastic'),
    WD,
  );
  polyIn(dv, SEAT, hatched('steel'), WD);
  rectIn(dv, [V.seatBoreR, V.seatTop], [V.threadR, 62], hatched('steel'), WD);
  polyIn(dv, HEAD, hatched('alu'), WD);
  rectIn(dv, [V.rodR, FINS_BOTTOM], [V.finsHub, V.headBase], med(), WD);
  rectIn(dv, [0, 44], [V.rodR, 62], { w: W.medium, fill: PAPER }, WD);
  threadV(dv, 0, V.rodR, 44, 62, true);
  const open: Parameters<typeof polyIn>[2] = { w: W.medium, dash: 'phantom', color: MOVING, fill: 'none' };
  polyIn(
    dv,
    HEAD.map(([r, h]): Pt => [r, h - S]),
    open,
    WD,
  );
  rectIn(dv, [V.rodR, FINS_BOTTOM - S], [V.finsHub, V.headBase - S], open, WD);
  dv.center([0, 43], [0, 63]);
  cutEdge(dv, 12, 44, 62, 0.3);
  dimV(dv, [V.headR, V.headBase - S], [V.headR, V.headBase], 14.2, lab(S, 'E'), 2.1);
  dv.leader([8.4, 53], 12, -22, l('contact conique', 'conical contact'), { size: 1.7 });
  dv.leader([2, 46], -2, 14, l('ailettes', 'fins'), { size: 1.7 });
  dv.caption([6, 63.8], l('DÉTAIL D · TÊTE ET PORTÉE', 'DETAIL D · HEAD AND SEAT'), '5:1');

  // ------------------------------------------------------------------ detail C (stroke at the guide) 5:1, right half
  const WC: Box = { x0: 0, x1: 16, y0: 156, y1: 172 };
  const cv = d.view(300, 156 + k5 * WC.y1, k5);
  polyIn(cv, GUIDE, hatched('alu'), WC);
  rectIn(cv, [V.rodR + 0.4, st.weight0], [V.weightR, 172], hatched('plastic'), WC);
  rectIn(cv, [V.rodR + 0.4, V.guideTop], [V.weightR, 172], open, WC);
  rectIn(cv, [0, 156], [V.rodR, 172], { w: W.medium, fill: PAPER }, WC);
  threadV(cv, 0, V.rodR, 156, 172, true);
  cv.center([0, 155], [0, 173]);
  cutEdge(cv, 16, 156, 172, 0.3);
  dimV(cv, [V.collarR, V.guideTop], [V.weightR, st.weight0], 18.5, lab(S, 'E'), 2.1);
  cv.leader([V.rodR, 160], 14, 16, l('tige M6', 'M6 rod'), { size: 1.7 });
  cv.leader([8.5, 159], 22, 14, l('guide', 'guide'), { size: 1.7 });
  cv.leader([10, 168], 8, 10, l('poids', 'weight'), { size: 1.7 });
  cv.caption([8, 173.8], l('DÉTAIL C · COURSE AU GUIDE', 'DETAIL C · STROKE AT THE GUIDE'), '5:1');

  // ------------------------------------------------------------------ main dimensions
  heading(d, 272, 14, l('PRINCIPALES COTES (mm)', 'MAIN DIMENSIONS (mm)'));
  const L = (m: number, status: 'R' | 'D' | 'E', prefix = '') => lab(m, status, prefix);
  const dimRows: [string, import('@onigam/lab-kit/i18n').L][] = [
    [
      'base-plate',
      cat(
        L(V.plateHalf * 2, 'E'),
        ' × ',
        L(V.plateHalf * 2, 'E'),
        ' × ',
        L(V.plateT, 'E'),
        ' · 4 × ',
        L(V.holeR * 2, 'E', 'Ø'),
        l(' sur ', ' on '),
        L(V.holeQ * 2, 'E'),
      ),
    ],
    ['valve-socket', cat(L(V.socketR * 2, 'E', 'Ø'), ' · h ', L(V.socketH, 'E'))],
    ['valve-reducer', cat(L(V.redR * 2, 'E', 'Ø'), ' · h ', L(V.redTop, 'E'))],
    [
      'valve-nipple',
      cat(
        L(V.threadR * 2 + 0.1, 'R', 'Ø'),
        ' · L ',
        L(V.nippleTop - V.nippleBottom, 'R'),
        ' · 4 × ',
        L(V.portW, 'E'),
        '×',
        L(V.portTop - V.portBottom, 'E'),
      ),
    ],
    ['valve-sleeve', cat(L(V.sleeveR * 2, 'E', 'Ø'), ' × ', L(V.sleeveTop - V.sleeveBottom, 'E'))],
    ['valve-seat', cat(L(V.seatTop - V.nippleBottom, 'E'), ' · ', l('cône ', 'cone '), '90°*')],
    ['valve-head', cat(L(V.headR * 2, 'E', 'Ø'), ' · h ', L(CONE_TOP - V.headBase, 'D'))],
    ['valve-stem', cat('M6 · ', l('pas ', 'pitch '), L(V.pitchRod, 'D'))],
    ['stem-sleeves', cat(L(V.sleeveOnRodR * 2, 'D', 'Ø'), ' × ', L(V.sleeveOnRodL, 'E'))],
    [
      'valve-guide',
      cat(L(V.tubeR * 2, 'E', 'Ø'), '/', L(V.tubeBoreR * 2, 'E'), ' · L ', L(V.guideTop - V.tubeBottom, 'E')),
    ],
    ['valve-fins', cat(L(V.finsR * 2, 'E', 'Ø'), ' · h ', L(V.finsH, 'E'))],
    ['counterweight', cat(L(V.weightR * 2, 'R', 'Ø'), ' × ', L(V.weightL, 'D'))],
    ['stroke-nut', cat('M6 · ', L(V.nutAF, 'E'), ' ', l('s/plats', 'a/f'), ' × ', L(V.nutT, 'E'))],
    ['lock-nut', cat('M6 · ', L(V.nutAF, 'E'), ' ', l('s/plats', 'a/f'), ' × ', L(V.nutT, 'E'))],
  ];
  grid(
    d,
    272,
    20,
    [
      { label: l('Rep.', 'Item'), w: 9, align: 'middle' },
      { label: l('Pièce', 'Part'), w: 46 },
      { label: l('Cotes', 'Dimensions'), w: 81, mono: true },
    ],
    dimRows.map(([id, t]) => [{ t: String(ITEM[id]) }, { t: partOf(id).name }, { t }]),
    { size: 1.75, pad: 0.7, lineH: 2.7 },
  );

  // ------------------------------------------------------------------ reading notes and legends
  marksLegend(d, 272, 85, 136, [
    {
      sym: (q, sx, sy) => q.line([sx, sy], [sx + 10, sy], { w: W.medium, dash: 'phantom', color: MOVING }),
      text: l(
        'pose ouverte : parties mobiles descendues de la course',
        'open pose: moving parts lowered by the stroke',
      ),
    },
    {
      sym: (q, sx, sy) => q.rect([sx, sy - 1.2], [sx + 10, sy + 1.2], hatched('steel', W.thin)),
      text: l(
        'hachures : sens et trame distinguent les pièces voisines, pas la matière',
        'hatching: direction and pattern tell neighbours apart, not the material',
      ),
    },
  ]);
  const ny = 114;
  box(
    d,
    207,
    ny,
    138,
    l('À LIRE', 'HOW TO READ'),
    [
      {
        bullet: '1',
        t: l(
          `Pose fermée : la tête repose sur sa portée et le poids est à la course s = ${nFr(S, 1)} mm au-dessus du guide. En pose ouverte (cuivre), la tige descend de s et le poids se pose sur le guide : c’est la butée.`,
          `Closed pose: the head rests on its seat and the weight stands the stroke s = ${nEn(S, 1)} mm above the guide. In the open pose (copper) the stem drops by s and the weight lands on the guide: that is the stop.`,
        ),
      },
      {
        bullet: '2',
        t: l(
          `La vidéo ne donne ni la course ni le poids : ${nFr(S, 1)} mm et ${WEIGHT} g sont calibrés par le modèle sur ses chiffres (résultat du modèle). La vue 3D exagère la course × 4.`,
          `The video gives neither the stroke nor the weight: ${nEn(S, 1)} mm and ${WEIGHT} g are calibrated by the model on its figures (model result). The 3D view exaggerates the stroke × 4.`,
        ),
      },
      {
        bullet: '3',
        t: l(
          'Seuls la tige M6, le filetage 15×21, le mamelon de 7–8 cm et la barre de 30–32 mm viennent de la vidéo ; les autres longueurs sont estimées d’après les noms des raccords.',
          'Only the M6 rod, the 15×21 thread, the 7–8 cm nipple and the 30–32 mm bar come from the video; the other lengths are estimated from the fittings’ names.',
        ),
      },
    ],
    { size: 1.75 },
  );
  box(
    d,
    349,
    ny,
    59,
    l('SÉCURITÉ', 'SAFETY'),
    [
      l(
        `Jamais un doigt dans le clapet pendant la marche : il claque 100 à 110 fois par minute (S1 13:40) et le corps encaisse ${nFr(MODEL.peakBar, 1)} bar à chaque coup (modèle).`,
        `Never a finger in the valve while it runs: it slams 100 to 110 times a minute (S1 13:40) and the body takes ${nEn(MODEL.peakBar, 1)} bar at each stroke (model).`,
      ),
    ],
    { size: 1.75, border: COLORS.red },
  );
  return d;
}

export const wasteValveAssembly: DrawingSheet = {
  id: 'waste-valve-assembly',
  number: NUMBER,
  group: 'valve',
  title: TITLE,
  description: l(
    'Coupe par l’axe des quatorze pièces du clapet de choc de la vidéo, en pose fermée : la tête repose sur sa portée conique et le poids attend, à la course s au-dessus du guide. Le second tracé, en cuivre et en traits mixtes, est la pose ouverte : tige, tête, ailettes, manchons, poids et écrous descendent de s jusqu’à ce que le poids se pose sur le guide. L’eau motrice monte par la platine ; clapet ouvert, elle passe sous la tête et s’échappe par les quatre lumières du mamelon. Les repères 14 à 27 renvoient à la nomenclature RP-D06 ; les détails D et C à 5:1 montrent la course.',
    'Section through the axis of the fourteen parts of the video’s waste valve, closed pose: the head rests on its conical seat and the weight waits, the stroke s above the guide. The second outline, in copper chain lines, is the open pose: stem, head, fins, sleeves, weight and nuts drop by s until the weight lands on the guide. The drive water rises through the plate; with the valve open it passes under the head and escapes through the nipple’s four ports. Items 14 to 27 refer to the bill of materials RP-D06; details D and C at 5:1 show the stroke.',
  ),
  scene: 'valve',
  parts: VALVE_PART_IDS,
  render,
};
