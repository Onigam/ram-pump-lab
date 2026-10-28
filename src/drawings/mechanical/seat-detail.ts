import { COLORS, Drawing, INK_2, W, type Pt } from '@onigam/lab-kit/drawings';
import type { DrawingSheet } from '@onigam/lab-kit/drawings';
import { l } from '@onigam/lab-kit/i18n';
import { STROKE, WEIGHT } from '../../data/part-helpers';
import { DERIVED, MODEL } from '../../data/parts/ram';
import { VALVE_DERIVED } from '../../data/parts/valve';
import { nEn, nFr } from '../../data/units';
import {
  ITEM,
  MOVING,
  PAPER,
  WATER,
  WATER_FILL,
  box,
  cutEdge,
  dimH,
  dimV,
  flow,
  hatched,
  heading,
  marksLegend,
  med,
  note,
  poly,
  polyIn,
  rectIn,
  threadV,
  type Box,
} from './draw';
import { CONE_DEG, CONE_TOP, FINS_BOTTOM, V, k, lab, labN, stack } from './geom';
import { HEAD, strokeAtGuide } from './valve-draw';

const NUMBER = 'D04';
const TITLE = l('Portée conique et course', 'Conical seat and stroke');
const S = STROKE;

/** The seat as drawn here: the chamfer coincides with the head cone, so the two touch along the whole contact band. */
const SEAT_EXACT: Pt[] = [
  [V.headR, V.nippleBottom],
  [V.threadR, V.nippleBottom],
  [V.threadR, V.seatTop],
  [V.seatBoreR, V.seatTop],
  [V.seatBoreR, V.nippleBottom + (V.headR - V.seatBoreR)],
];

function render(): Drawing {
  const d = new Drawing();
  d.frame({
    title: TITLE,
    subtitle: l(
      'Portée et tête à 10:1, position fermée et position ouverte · réglage de la course au dixième de tour',
      'Seat and head at 10:1, closed and open position · setting the stroke to a tenth of a turn',
    ),
    number: NUMBER,
    scale: '10:1 · 5:1',
  });
  const p = d.paper();
  const k10 = 10;
  const WIN: Box = { x0: 0, x1: 11.5, y0: 46, y1: 62 };
  const oy = 28 + k10 * WIN.y1;
  const contact = k(VALVE_DERIVED.contactBand);
  const gapN = S * Math.sin((CONE_DEG * Math.PI) / 180);

  /** One panel: the right half of the seat and head, the head lowered by `drop` (0 closed, S open). */
  const panel = (ox: number, drop: number, open: boolean): ReturnType<Drawing['view']> => {
    const v = d.view(ox, oy, k10);
    const dy = -drop;
    // water: under the head and, when open, through the curtain and up the bore
    polyIn(
      v,
      [
        [0, 46],
        [V.redBoreR, 46],
        [V.redBoreR, V.headBase + dy],
        [0, V.headBase + dy],
      ],
      { w: 0, fill: WATER_FILL },
      WIN,
    );
    if (open) {
      polyIn(
        v,
        [
          [V.headR, V.headBase + dy],
          [V.redBoreR, V.headBase + dy],
          [V.redBoreR, V.nippleBottom],
          [V.headR, V.nippleBottom],
        ],
        { w: 0, fill: WATER_FILL },
        WIN,
      );
      polyIn(
        v,
        [
          [V.headR, V.headBase + dy],
          [V.headR, V.headBase],
          [V.seatBoreR, V.nippleBottom + (V.headR - V.seatBoreR)],
          [V.seatBoreR, CONE_TOP + dy],
          [V.rodR, CONE_TOP + dy],
          [V.headR, V.headBase + dy],
        ],
        { w: 0, fill: WATER_FILL },
        WIN,
      );
      polyIn(
        v,
        [
          [V.rodR, CONE_TOP + dy],
          [V.seatBoreR, CONE_TOP + dy],
          [V.seatBoreR, 62],
          [0, 62],
          [0, CONE_TOP + dy],
        ],
        { w: 0, fill: WATER_FILL },
        WIN,
      );
    }
    // reducer wall (the thread of the nipple overlaps its first 0.2 mm), seat ring, nipple wall
    polyIn(
      v,
      [
        [V.redBoreR, 46],
        [11.5, 46],
        [11.5, 62],
        [V.redBoreR, 62],
      ],
      hatched('plastic'),
      WIN,
    );
    polyIn(v, SEAT_EXACT, hatched('steel'), WIN);
    rectIn(v, [V.seatBoreR, V.seatTop], [V.threadR, 62], hatched('steel'), WIN);
    v.line([V.seatBoreR, V.seatTop], [V.threadR, V.seatTop], { w: W.thin });
    // head, fins nut, rod
    const headPts = HEAD.map(([r, y]): Pt => [r, y + dy]);
    polyIn(v, headPts, hatched('alu'), WIN);
    rectIn(v, [V.rodR, FINS_BOTTOM + dy], [V.finsHub, V.headBase + dy], med(), WIN);
    rectIn(v, [0, 46], [V.rodR, 62], { w: W.medium, fill: PAPER }, WIN);
    threadV(v, 0, V.rodR, 46, 62, true);
    v.center([0, 45.2], [0, 62.8]);
    cutEdge(v, 11.5, 46, 62, 0.14);
    return v;
  };

  // ------------------------------------------------------------------ closed pose
  const c = panel(30, 0, false);
  const redLine = { w: 0.9, color: COLORS.red };
  c.line([V.headR, V.headBase], [V.seatBoreR, V.headBase + (V.headR - V.seatBoreR)], redLine);
  c.leader([9.05, 52.25], -4, 15, l(`bande de contact ${nFr(contact, 2)} mm*`, `contact band ${nEn(contact, 2)} mm*`), {
    size: 1.8,
    color: COLORS.red,
  });
  dimH(c, [0, V.seatTop], [V.seatBoreR, V.seatTop], 60.2, lab(V.seatBoreR * 2, 'D', 'Ø'), 2.1);
  dimH(c, [0, V.headBase], [V.headR, V.headBase], 48.4, lab(V.headR * 2, 'E', 'Ø'), 2.1);
  dimV(c, [V.threadR, V.nippleBottom], [V.threadR, V.seatTop], 12.9, lab(V.seatTop - V.nippleBottom, 'E'), 2.1);
  c.arc([V.headR, V.headBase], 2.4, 135, 180, { w: W.thin });
  p.text(c.map([6.6, 52.6]), `${CONE_DEG}°*`, { size: 1.9, anchor: 'end', mono: true, halo: true, baseline: 'middle' });
  c.leader([4.4, 49.2], -3, 12, l('écrou à ailettes', 'finned nut'), { size: 1.8 });
  c.leader(
    [9.9, 54.2],
    6,
    -16,
    l(`bague de portée (repère ${ITEM['valve-seat']})`, `seat ring (item ${ITEM['valve-seat']})`),
    { size: 1.8 },
  );
  c.leader([9.9, 59.5], 6, -6, l(`mamelon (repère ${ITEM['valve-nipple']})`, `nipple (item ${ITEM['valve-nipple']})`), {
    size: 1.8,
  });
  c.leader([V.rodR - 0.4, 60.6], 5, -6, l('tige M6', 'M6 rod'), { size: 1.8 });
  c.leader([10.8, 47.2], 3, 8, l('réduction (filet ½″)', 'reducer (½″ thread)'), { size: 1.8 });
  p.text([30, 15.2], l('POSITION FERMÉE', 'CLOSED POSITION'), { size: 3, weight: 'bold', anchor: 'start' });
  p.text([30, 19.2], l('la tête repose sur sa portée', 'the head rests on its seat'), {
    size: 1.9,
    color: INK_2,
    anchor: 'start',
  });
  p.text([30, 190.5], '10:1', { size: 2.2, color: INK_2, mono: true });

  // ------------------------------------------------------------------ open pose
  const o = panel(170, S, true);
  // the closed head, for reference
  polyIn(o, HEAD, { w: W.thin, dash: 'center', color: INK_2, fill: 'none' }, WIN);
  dimV(o, [V.headR, V.headBase - S], [V.headR, V.headBase], 13.2, lab(S, 'E'), 2.1);
  o.line([V.headR, V.headBase - S], [13.4, V.headBase - S], { w: W.thin });
  // the gap, measured square to the two cones
  const q = Math.SQRT1_2 * gapN;
  o.dim([7.8, 51.3], [7.8 + q, 51.3 + q], 7, { dir: 'aligned', label: labN(gapN, 2, 'E'), size: 1.9 });
  flow(o, [7.6, 46.8], [7.6, 49.1], WATER, W.medium);
  flow(o, [9.1, 51.1], [7.7, 52.5], WATER, W.medium);
  flow(o, [6.2, 54.6], [6.2, 59.8], WATER, W.medium);
  o.leader([9.95, 47.6], 3, 10, l('réduction', 'reducer'), { size: 1.8 });
  p.text([170, 15.2], l('POSITION OUVERTE', 'OPEN POSITION'), { size: 3, weight: 'bold', anchor: 'start' });
  p.text(
    [170, 19.2],
    l(
      `la tête est descendue de s = ${nFr(S, 1)} mm ; l’eau passe par le rideau`,
      `the head has dropped by s = ${nEn(S, 1)} mm; the water passes through the curtain`,
    ),
    { size: 1.9, color: INK_2, anchor: 'start' },
  );
  p.text(
    [170, 23.2],
    l(`jeu normal s · sin ${CONE_DEG}° = ${nFr(gapN, 2)} mm*`, `normal gap s · sin ${CONE_DEG}° = ${nEn(gapN, 2)} mm*`),
    { size: 1.9, color: INK_2, anchor: 'start' },
  );
  p.text([170, 190.5], '10:1', { size: 2.2, color: INK_2, mono: true });

  // ------------------------------------------------------------------ the stroke at the guide, 5:1
  const st = stack(S);
  {
    const k5 = 5;
    const WC: Box = { x0: 0, x1: 16, y0: 156, y1: 172 };
    const cv = d.view(306, 44 + k5 * WC.y1, k5);
    strokeAtGuide(cv, S, WC);
    cutEdge(cv, 16, 156, 172, 0.3);
    dimV(cv, [V.collarR, V.guideTop], [V.nutAF / 2, st.nut0], 18.5, lab(S, 'E'), 2.1);
    cv.leader([V.nutAF / 2 - 0.5, st.nut0 + V.nutT / 2], 10, -4, l('écrou de course', 'stroke nut'), { size: 1.7 });
    cv.leader([10, st.weight0 + 1.2], 8, -6, l('poids', 'weight'), { size: 1.7 });
    cv.leader([8.5, 159], 22, 14, l('guide', 'guide'), { size: 1.7 });
    p.text([306, 31], l('LA COURSE AU GUIDE', 'THE STROKE AT THE GUIDE'), {
      size: 2.4,
      weight: 'bold',
      anchor: 'start',
    });
    p.text(
      [306, 35.4],
      l('écrou de course sur la tige : le tourner change s', 'stroke nut on the rod: turning it changes s'),
      { size: 1.7, color: INK_2, anchor: 'start' },
    );
    p.text([306, 41], '5:1', { size: 2.2, color: INK_2, mono: true });
  }

  // ------------------------------------------------------------------ the turn of the nut
  {
    const dv = d.view(352, 160, 2);
    const AF = V.nutAF;
    const hexPts: Pt[] = [];
    for (let i = 0; i < 6; i++)
      hexPts.push([
        (AF / Math.sqrt(3)) * Math.cos((i * Math.PI) / 3),
        (AF / Math.sqrt(3)) * Math.sin((i * Math.PI) / 3),
      ]);
    poly(dv, hexPts, med());
    dv.circle([0, 0], V.rodR, { w: W.thin });
    dv.circle([0, 0], 8.5, { w: W.thin, dash: 'center', color: INK_2 });
    dv.arc([0, 0], 8.5, 0, 36, { w: 0.9, color: COLORS.red });
    dv.line([0, 0], [8.5, 0], { w: W.thin, color: INK_2 });
    dv.line([0, 0], [8.5 * Math.cos(Math.PI / 5), 8.5 * Math.sin(Math.PI / 5)], { w: W.thin, color: COLORS.red });
    p.text(dv.map([9.8, 2.4]), '36°', { size: 1.9, mono: true, color: COLORS.red, baseline: 'middle' });
    p.text([306, 131], l('LE RÉGLAGE', 'THE SETTING'), { size: 2.4, weight: 'bold', anchor: 'start' });
    p.text(
      [306, 135.4],
      l(
        `tige M6, pas ${nFr(V.pitchRod)} mm† : 1 tour = ${nFr(V.pitchRod)} mm`,
        `M6 rod, ${nEn(V.pitchRod)} mm† pitch: 1 turn = ${nEn(V.pitchRod)} mm`,
      ),
      { size: 1.7, color: INK_2, anchor: 'start' },
    );
    p.text([306, 139.4], l('0,1 mm de course = 36° d’écrou', '0.1 mm of stroke = 36° of nut'), {
      size: 1.7,
      color: COLORS.red,
      anchor: 'start',
    });
  }

  // ------------------------------------------------------------------ the stroke window
  {
    const x0 = 30;
    const px = 70;
    const X = (s: number): number => x0 + s * px;
    const y0 = 217;
    const h = 7;
    heading(
      d,
      14,
      196,
      l(
        'FENÊTRE DE RÉGLAGE DE LA COURSE (résultats du modèle, clapet n°1, source de 7,5 L/min)',
        'STROKE SETTING WINDOW (model results, valve No. 1, 7.5 L/min spring)',
      ),
      { size: 2.2 },
    );
    const band = (a: number, b: number, fill: string): void => {
      p.rect([X(a), y0], [X(b), y0 + h], { w: W.thin, fill, opacity: 0.55 });
    };
    band(0, MODEL.noDeliveryStroke, '#f0c9c4');
    band(MODEL.noDeliveryStroke, MODEL.springLimitStroke, '#d7e9f4');
    band(MODEL.springLimitStroke, 3.5, '#e6e0d2');
    p.rect([X(0), y0], [X(3.5), y0 + h], { w: W.medium });
    for (let i = 0; i <= 7; i++) {
      const s = i * 0.5;
      p.line([X(s), y0 + h], [X(s), y0 + h + (i % 2 === 0 ? 2.2 : 1.2)], { w: W.thin });
      if (i % 2 === 0) p.text([X(s), y0 + h + 5], `${s}`, { size: 1.8, anchor: 'middle', mono: true });
    }
    p.text([X(3.5) + 3, y0 + h + 5], 'mm', { size: 1.8, mono: true, color: INK_2 });
    // calibrated setting
    p.line([X(S), y0 - 3], [X(S), y0 + h], { w: 0.7, color: MOVING });
    // labels above and below
    const above = (
      s: number,
      dy: number,
      text: ReturnType<typeof l>,
      anchor: 'start' | 'end' = 'start',
      color: string = COLORS.ink,
    ): void => {
      p.line([X(s), y0], [X(s), y0 - dy + 1.2], { w: W.thin, color: INK_2 });
      p.text([X(s) + (anchor === 'start' ? 1 : -1), y0 - dy], text, { size: 1.75, anchor, baseline: 'middle', color });
    };
    above(
      MODEL.noDeliveryStroke,
      7,
      l(
        `${nFr(MODEL.noDeliveryStroke, 1)} : le refoulement s’arrête (${nFr(MODEL.minStrokeFlow, 1)} L/min rejetés)`,
        `${nEn(MODEL.noDeliveryStroke, 1)}: delivery stops (${nEn(MODEL.minStrokeFlow, 1)} L/min of waste water)`,
      ),
      'end',
    );
    above(
      S,
      11,
      l(
        `${nFr(S, 1)} : réglage du n°1 — ${MODEL.strokesPerMin} coups/min, ≈ 500 L/jour`,
        `${nEn(S, 1)}: setting of valve No. 1 — ${MODEL.strokesPerMin} strokes/min, ≈ 500 L/day`,
      ),
      'start',
      MOVING,
    );
    above(
      3,
      7,
      l(
        `3,0 : ${nFr(MODEL.longStrokeFlow, 1)} L/min, ${nFr(MODEL.longStrokePerDay)} L/jour`,
        `3.0: ${nEn(MODEL.longStrokeFlow, 1)} L/min, ${nEn(MODEL.longStrokePerDay)} L/day`,
      ),
      'start',
    );
    // below: window in turns, ceiling
    const yb = y0 + h + 9.5;
    p.line([X(MODEL.noDeliveryStroke), yb], [X(MODEL.springLimitStroke), yb], { w: W.thin });
    for (const s of [MODEL.noDeliveryStroke, MODEL.springLimitStroke])
      p.line([X(s), yb - 1.2], [X(s), yb + 1.2], { w: W.thin });
    p.text(
      [X(MODEL.noDeliveryStroke), yb + 3.4],
      l(
        `fenêtre : ${nFr(VALVE_DERIVED.windowTurns, 1)} tour (modèle, pas de 1 mm supposé)`,
        `window: ${nEn(VALVE_DERIVED.windowTurns, 1)} turn (model, 1 mm pitch assumed)`,
      ),
      { size: 1.75, baseline: 'middle', anchor: 'start' },
    );
    p.text(
      [X(MODEL.springLimitStroke) + 2, yb - 1.4],
      l(
        `dès ${nFr(MODEL.springLimitStroke, 1)} : toute la source (7,5 L/min)`,
        `from ${nEn(MODEL.springLimitStroke, 1)}: the whole spring (7.5 L/min)`,
      ),
      { size: 1.75, baseline: 'middle', anchor: 'start' },
    );
    p.text([X(0) + 1.5, y0 + h / 2], l('pas de refoulement', 'no delivery'), {
      size: 1.7,
      baseline: 'middle',
      anchor: 'start',
      color: COLORS.red,
    });
    p.text([X(3.5) - 1.5, y0 + h / 2], l('consomme plus que la source', 'uses more than the spring'), {
      size: 1.7,
      baseline: 'middle',
      anchor: 'end',
      color: INK_2,
    });
    note(
      d,
      14,
      240.6,
      272,
      l(
        'Course s au guide (mm) : la hauteur de l’écrou de course sur la tige la fixe (dans la vidéo, le poids est lui-même l’écrou principal) ; sous ≈ 1,5 mm le coup est trop faible pour ouvrir le clapet de refoulement (la vidéo dit seulement qu’en dessous d’une certaine course le bélier ne marche plus, 13:13 ; 1,5 mm est la valeur du modèle). La fenêtre dépend du couple course–poids retenu pour retrouver la vidéo : de 0,35 à 1,25 tour pour les couples essayés par le labo.',
        'Stroke s at the guide (mm): the height of the stroke nut on the rod sets it (in the video the weight itself is the main nut); below ≈ 1.5 mm the stroke is too weak to open the delivery check valve (the video only says that below a certain stroke the ram stops working, 13:13; 1.5 mm is the model’s value). The window depends on the stroke–weight pair chosen to retrieve the video: 0.35 to 1.25 turn for the pairs the lab tried.',
      ),
      { size: 1.6, color: INK_2 },
    );
  }

  // ------------------------------------------------------------------ notes
  box(
    d,
    295,
    182,
    113,
    l('À LIRE', 'HOW TO READ'),
    [
      {
        bullet: '1',
        t: l(
          `Tête et portée sont fraisées au même angle (${CONE_DEG}° de demi-angle*) : le contact est une bande de ${nFr(contact, 1)} mm† et non une ligne.`,
          `Head and seat are milled at the same angle (${CONE_DEG}° half-angle*): the contact is a ${nEn(contact, 1)} mm† band, not a line.`,
        ),
      },
      {
        bullet: '2',
        t: l(
          `Ouvert, l’eau passe par un rideau qui fixe la consommation. Rideau cylindrique équivalent du modèle : π × 15 × ${nFr(S, 1)} = ${nFr(DERIVED.curtainMm2)} mm² ; la section réelle sous un cône à ${CONE_DEG}° serait ≈ ${nFr(DERIVED.curtainMm2 * Math.sin((CONE_DEG * Math.PI) / 180))} mm², l’écart étant absorbé par le coefficient de débit calibré.`,
          `Open, the water passes through a curtain that sets the consumption. The model’s equivalent cylindrical curtain: π × 15 × ${nEn(S, 1)} = ${nEn(DERIVED.curtainMm2)} mm²; the real area under a ${CONE_DEG}° cone would be ≈ ${nEn(DERIVED.curtainMm2 * Math.sin((CONE_DEG * Math.PI) / 180))} mm², the gap being absorbed by the calibrated discharge coefficient.`,
        ),
      },
      {
        bullet: '3',
        t: l(
          `Course ${nFr(S, 1)} mm et poids ${WEIGHT} g : calibrés par le modèle, pas mesurés. Aucun couple de serrage n’est donné.`,
          `Stroke ${nEn(S, 1)} mm and weight ${WEIGHT} g: calibrated by the model, not measured. No tightening torque is given.`,
        ),
      },
    ],
    { size: 1.75 },
  );
  marksLegend(d, 14, 253, 84);
  return d;
}

export const seatConeDetail: DrawingSheet = {
  id: 'seat-cone-detail',
  number: NUMBER,
  group: 'valve',
  title: TITLE,
  description: l(
    'Détail à 10:1 de la portée conique et de la tête, fermée puis ouverte : tête et portée sont fraisées au même angle, le contact est une bande le long du cône, et le rideau que la tête ouvre fixe la consommation du bélier. En bas, la fenêtre de réglage de la course (résultats du modèle) : sous environ 1,5 mm le bélier ne refoule plus (la vidéo dit qu’il s’arrête sous une certaine course, 13:13), à partir de 2,3 mm le clapet n°1 prend toute la source ; cette fenêtre est de moins d’un tour au pas de 1 mm, et elle dépend du couple course–poids retenu pour retrouver la vidéo. À droite, la course vue au guide et le geste du réglage.',
    'Detail at 10:1 of the conical seat and the head, closed then open: head and seat are milled at the same angle, the contact is a band along the cone, and the curtain the head opens sets the ram’s consumption. Below, the stroke setting window (model results): under about 1.5 mm the ram stops delivering (the video says it stops below a certain stroke, 13:13), from 2.3 mm valve No. 1 takes the whole spring; that window is less than one turn at a 1 mm pitch, and it depends on the stroke–weight pair chosen to retrieve the video. On the right, the stroke seen at the guide and how the setting is made.',
  ),
  scene: 'valve',
  parts: [
    'valve-seat',
    'valve-head',
    'valve-nipple',
    'valve-stem',
    'valve-fins',
    'stroke-nut',
    'lock-nut',
    'counterweight',
  ],
  render,
};
