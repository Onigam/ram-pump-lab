import { l, tr, type L } from '@onigam/lab-kit/i18n';
import { COLORS, Drawing, INK, INK_2, W, type View } from '@onigam/lab-kit/drawings';
import type { DrawingSheet } from '@onigam/lab-kit/drawings';
import { SITE } from '../../three/dims';
import {
  GPD_TO_M3_DAY,
  GPM_TO_LPM,
  HEAD_RATIO_MAX,
  LENGTH_RATIO_S4,
  LENGTH_RATIO_USUAL,
  LITRES_PER_GALLON,
  PIPE_SIZES,
  TYPICAL_ETA,
  sizeRam,
  type SizingInput,
  type SizingResult,
  type SizingWarning,
} from '../../sim/sizing';
import { REPORTED, valve1, valveRuns, workingLimits } from './model';
import { gauge } from './gauge';
import { cat, chip, gridTable, kindKey, nf, notes, para, val, type Kind } from './util';

const valveRunQ = (valve: 1 | 2 | 3): number => valveRuns().find((r) => r.valve === valve)?.means.driveFlow ?? 0;

// RP-D10 — Sizing: the table of NC State Extension (S4, table 2) with its units converted and written out, the lab's own ram
// and spring placed on it (the spring gives 7.5 L/min, the 1″ ram asks for 22.7), the rules of length and head (drive pipe
// ≥ 5 × h, H/h ≤ ~12) as gauges, and two worked examples computed by the functions of the calculator (src/sim/sizing.ts,
// the same ones as the panel's "Size it" section). Nothing here is a design: the sources' orders of magnitude.

const BLUE = COLORS.water;
const COPPER = COLORS.copper;

/** The video's site and the pipe of the lab's ram (research K1–K6, K20). */
const VIDEO_SITE: SizingInput = {
  fall: SITE.fall,
  deliveryHead: SITE.deliveryHead,
  sourceFlow: SITE.sourceFlowLpm,
  pipe: '1',
  driveLength: SITE.driveLength,
};
/** A second, invented site where the spring is enough (an illustration of the rules, not a design). */
const OTHER_SITE: SizingInput = { fall: 5, deliveryHead: 40, sourceFlow: 25, pipe: '1', driveLength: 25 };

const fracInch = (v: number): string => ({ 0.5: '½″', 0.75: '¾″', 1: '1″', 1.5: '1½″', 2: '2″' })[v] ?? `${v}″`;

function table(p: View): void {
  p.text(
    [14, 21.5],
    l(
      '1 · LE TABLEAU DE NC STATE EXTENSION (S4, tableau 2), UNITÉS CONVERTIES',
      '1 · THE NC STATE EXTENSION TABLE (S4, table 2), UNITS CONVERTED',
    ),
    { size: 2.5, weight: 'bold' },
  );
  p.line([14, 23.2], [210, 23.2], { w: W.thin, color: INK_2 });
  const cols = [
    { label: l('Conduite motrice', 'Drive pipe'), w: 26 },
    { label: l('Øi supposé', 'Assumed ID'), w: 22, align: 'end' as const, mono: true },
    { label: l('Refoulement', 'Delivery'), w: 22, align: 'end' as const, mono: true },
    { label: l('Source minimale', 'Minimum source'), w: 61, align: 'end' as const, mono: true },
    { label: l('Pompage maximal', 'Maximum pumping'), w: 61, align: 'end' as const, mono: true },
  ];
  const rows = PIPE_SIZES.map((s) => {
    const gpm = Math.round(s.minSourceLpm / GPM_TO_LPM);
    const gpd = Math.round(s.maxDeliveryLpd / LITRES_PER_GALLON);
    return [
      fracInch(s.inch),
      cat(nf(s.innerMm, 0), ' mm'),
      fracInch(s.deliveryInch),
      cat(nf(gpm, 0), ' gpm × ', nf(GPM_TO_LPM, 3), ' = ', nf(s.minSourceLpm, 1), ' L/min'),
      cat(nf(gpd, 0), ' gpd × ', nf(GPD_TO_M3_DAY, 3), ' = ', nf(s.maxDeliveryLpd / 1000, 1), l(' m³/j', ' m³/day')),
    ];
  });
  const y0 = 28;
  const rowH = 8;
  gridTable(p, 14, y0, cols, rows, { rowH, size: 2, tint: 1, tintFill: '#ecd5bf' });
  // origin of the columns: S4 reports the sizes, the flows and the pumping; the inner diameter is the lab's assumption
  chip(p, [14 + 26 + 3.4, y0 + rowH * 0.5], 'E', 0.85);
  p.text([14 + 192 + 1.5, y0 + rowH * 2.5], l('◄ labo', '◄ lab'), {
    size: 1.6,
    color: COPPER,
    weight: 'bold',
    baseline: 'middle',
  });
  const yEnd = y0 + rowH * 5;
  p.text(
    [14, yEnd + 5],
    cat(
      '1 US gallon = ',
      nf(LITRES_PER_GALLON, 3),
      l(
        ' L : le tableau est en gallons US par minute (gpm) et par jour (gpd) (R, S4) ; les litres sont dérivés (D).',
        ' L: the table is in US gallons per minute (gpm) and per day (gpd) (R, S4); the litres are derived (D).',
      ),
    ),
    { size: 1.7, color: INK_2 },
  );
  p.text(
    [14, yEnd + 8.8],
    l(
      'Øi : acier série 40, arrondi — hypothèse du modèle, absente de S4 (E).',
      'ID: schedule 40 steel, rounded: a model assumption, not in S4 (E).',
    ),
    { size: 1.7, color: INK_2 },
  );
  para(
    p,
    14,
    yEnd + 15,
    192,
    l(
      'Le tableau ne donne ni chute, ni hauteur, ni rendement : il dit seulement quel débit de source une taille de conduite motrice demande au minimum, et ce que son bélier peut pomper au plus.',
      'The table gives no fall, no head and no efficiency: it only says what source flow a drive pipe size needs at least, and the most its ram can pump.',
    ),
    1.8,
  );
}

function placed(p: View): void {
  const x0 = 252;
  const w = 140;
  const y0 = 30;
  p.text(
    [218, 21.5],
    l('2 · LE BÉLIER ET LA SOURCE DU LABO SUR LE TABLEAU', '2 · THE LAB’S RAM AND SPRING ON THE TABLE'),
    { size: 2.5, weight: 'bold' },
  );
  p.line([218, 23.2], [406, 23.2], { w: W.thin, color: INK_2 });
  const MAX = 110;
  const X = (v: number) => x0 + (v / MAX) * w;
  const rowH = 10;
  for (const v of [0, 20, 40, 60, 80, 100]) {
    p.line([X(v), y0], [X(v), y0 + rowH * 4], { w: 0.08, color: '#cfc8b8' });
    p.text([X(v), y0 + rowH * 4 + 3.6], tr(nf(v, 0)), { size: 1.6, anchor: 'middle', mono: true });
  }
  p.rect([x0, y0], [x0 + w, y0 + rowH * 4], { w: W.medium });
  p.text(
    [x0 + w / 2, y0 + rowH * 4 + 8],
    l('débit de source minimal demandé par la taille (L/min)', 'minimum source flow the size asks for (L/min)'),
    { size: 1.7, anchor: 'middle', color: INK_2 },
  );
  PIPE_SIZES.forEach((s, i) => {
    const yc = y0 + rowH * (i + 0.5);
    p.text([x0 - 2, yc], fracInch(s.inch), { size: 2.2, weight: 'bold', anchor: 'end', baseline: 'middle' });
    p.rect([X(0), yc - 2.8], [X(s.minSourceLpm), yc + 2.8], {
      w: W.medium,
      color: s.id === '1' ? COPPER : INK,
      fill: s.id === '1' ? '#e8c9ae' : '#e2dccb',
    });
    p.text([X(s.minSourceLpm) + 1.4, yc], nf(s.minSourceLpm, 1), {
      size: 1.8,
      baseline: 'middle',
      mono: true,
      weight: 'bold',
    });
  });
  const run = valve1();
  const lines: [number, L, string, number][] = [
    [REPORTED.springNow, l('source 7,5', 'spring 7.5'), COPPER, 0],
    [REPORTED.consumptionValve3, l('clapet n°3 : 17', 'n°3 valve: 17'), BLUE, 1],
  ];
  for (const [v, label, color, k] of lines) {
    p.line([X(v), y0 - 2], [X(v), y0 + rowH * 4], { w: 0.5, color, dash: k === 0 ? [2.4, 1.2] : [1, 1] });
    p.text([X(v) + (k === 0 ? -0.8 : 0.8), y0 - 3], label, {
      size: 1.5,
      color,
      anchor: k === 0 ? 'end' : 'start',
      weight: 'bold',
    });
  }
  const r = sizeRam(VIDEO_SITE);
  const ly = y0 + rowH * 4 + 14;
  val(p, 218, ly, 'R', cat(l('source du labo : ', 'the lab’s spring: '), nf(SITE.sourceFlowLpm, 1), ' L/min'), {
    size: 1.8,
    bold: true,
    color: COPPER,
  });
  val(
    p,
    218,
    ly + 4.6,
    'R',
    cat(l('le 1″ demande au minimum ', 'the 1″ asks for at least '), nf(r.minSource, 1), ' L/min'),
    { size: 1.8, bold: true },
  );
  val(
    p,
    218,
    ly + 9.2,
    'D',
    cat(
      l('la source en donne ', 'the spring gives '),
      nf(100 * r.sourceRatio, 0),
      l(' % : insuffisant', ' %: not enough'),
    ),
    { size: 1.8, bold: true, color: COLORS.red },
  );
  val(p, 312, ly, 'M', cat(l('clapet n°3 du modèle : ', 'model n°3 valve: '), nf(valveRunQ(3), 1), ' L/min'), {
    size: 1.8,
    bold: true,
    color: BLUE,
  });
  val(
    p,
    312,
    ly + 4.6,
    'M',
    cat(l('clapet n°1 du modèle : ', 'model n°1 valve: '), nf(run.means.driveFlow, 1), ' L/min'),
    { size: 1.8, bold: true, color: BLUE },
  );
  p.text(
    [312, ly + 9.2],
    l('= la vidéo : retoucher le clapet, pas la source', '= the video: retune the valve, not the spring'),
    { size: 1.6, color: INK_2, baseline: 'middle' },
  );
}

function rules(p: View): void {
  const r = sizeRam(VIDEO_SITE);
  p.text(
    [14, 110.5],
    l(
      '3 · LES RÈGLES : LONGUEUR DE LA CONDUITE MOTRICE ET HAUTEUR DE REFOULEMENT',
      '3 · THE RULES: DRIVE PIPE LENGTH AND DELIVERY HEAD',
    ),
    { size: 2.5, weight: 'bold' },
  );
  p.line([14, 112.2], [406, 112.2], { w: W.thin, color: INK_2 });
  const lim = workingLimits();
  gauge(p, 24, 132, 170, {
    title: l('Longueur de la conduite motrice, en fois la chute : L/h', 'Drive pipe length, in times the fall: L/h'),
    max: 8,
    ticks: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    band: [LENGTH_RATIO_USUAL[0], LENGTH_RATIO_USUAL[1]],
    bandLabel: l('usuel : 3 à 7 × h (S6)', 'usual: 3 to 7 × h (S6)'),
    marks: [
      { v: LENGTH_RATIO_S4, label: l('S4 : au moins 5 × h', 'S4: at least 5 × h'), kind: 'R', left: false, row: 1 },
    ],
    lab: {
      v: r.lengthRatio ?? 0,
      label: cat('L/h = ', nf(r.lengthRatio ?? 0, 1), ' (', nf(SITE.driveLength, 0), ' m)'),
      kind: 'D',
    },
  });
  gauge(p, 232, 132, 160, {
    title: l('Hauteur de refoulement, en fois la chute : H/h', 'Delivery head, in times the fall: H/h'),
    max: 14,
    ticks: [0, 2, 4, 6, 8, 10, 12, 14],
    over: HEAD_RATIO_MAX,
    marks: [
      { v: 10, label: l('vidéo : ≈ 10 (K4)', 'video: ≈ 10 (K4)'), kind: 'R', left: true, row: 1 },
      { v: HEAD_RATIO_MAX, label: l('règle : ≤ ~12', 'rule: ≤ ~12'), kind: 'E', left: false, row: 0 },
    ],
    lab: { v: r.liftRatio, label: cat('H/h = ', nf(r.liftRatio, 1), ' (', nf(SITE.deliveryHead, 0), ' m)'), kind: 'D' },
  });
  val(
    p,
    232,
    152.4,
    'M',
    cat(
      l('le modèle ne refoule plus au-dessus de H = ', 'the model stops delivering above H = '),
      nf(lim.headCeiling, 0),
      ' m (H/h = ',
      nf(lim.headCeiling / SITE.fall, 1),
      ')',
    ),
    { size: 1.6, color: INK_2 },
  );
  // the verdicts of the calculator, in words
  const verdict = r.warnings.map((w) => tr(WARNINGS[w]));
  val(p, 24, 152.4, 'D', cat(l('le calculateur dit : ', 'the calculator says: '), verdict.join(' · ')), {
    size: 1.6,
    color: INK_2,
  });
  para(
    p,
    24,
    160,
    380,
    l(
      'Règles des sources : conduite motrice d’au moins 5 fois la chute (S4), usuellement 3 à 7 fois (S6), 3 à 5 fois (S7) ; longueur sur diamètre de 150 à 1 000 (S5). Hauteur de refoulement : la vidéo dit qu’un mètre de chute en lève environ dix (K4) ; au-delà de ≈ 12 fois la chute, on en demande trop au bélier (règle du modèle, hypothèse).',
      'Rules from the sources: a drive pipe at least 5 times the fall (S4), usually 3 to 7 times (S6), 3 to 5 times (S7); length over diameter from 150 to 1,000 (S5). Delivery head: the video says one metre of fall lifts about ten (K4); beyond ≈ 12 times the fall the ram is asked too much (a rule of the model, an assumption).',
    ),
    1.7,
  );
}

const WARNINGS: Record<SizingWarning, L> = {
  headHigh: l('H/h trop grand : plus de 12 fois la chute', 'H/h too high: more than 12 times the fall'),
  headLow: l('H/h trop petit : moins de 1,5', 'H/h too low: under 1.5'),
  lengthShort: l('conduite trop courte : moins de 3 × h', 'pipe too short: under 3 × h'),
  lengthBelowS4: l('conduite sous le minimum de S4 (5 × h)', 'pipe under the S4 minimum (5 × h)'),
  sourceShort: l('source insuffisante pour cette taille', 'spring not enough for this size'),
};

/** One worked example: the steps, computed by `sizeRam`, with the formula and the result of each. */
function example(
  p: View,
  x: number,
  y: number,
  w: number,
  title: L,
  input: SizingInput,
  r: SizingResult,
  o: { model?: boolean },
): void {
  p.text([x, y], title, { size: 2.2, weight: 'bold' });
  p.line([x, y + 1.6], [x + w, y + 1.6], { w: W.thin, color: INK_2 });
  const pipe = r.pipe;
  const line = (i: number, label: L, formula: L, result: L, kind: Kind, ok?: boolean) => {
    const ry = y + 8 + i * 7.6;
    p.text([x, ry], String(i + 1), { size: 1.9, weight: 'bold', baseline: 'middle' });
    p.text([x + 4, ry - 1.7], label, { size: 1.6, baseline: 'middle', color: INK_2 });
    p.text([x + 4, ry + 1.9], formula, { size: 1.8, baseline: 'middle', mono: true });
    val(p, x + w - 49, ry + 0.2, kind, result, { size: 1.8, bold: true, color: ok === false ? COLORS.red : undefined });
  };
  const e = r.delivery;
  line(
    0,
    l('Hauteur de refoulement', 'Delivery head'),
    cat('H/h = ', nf(input.deliveryHead, 0), ' / ', nf(input.fall, 1)),
    cat(
      nf(r.liftRatio, 1),
      r.warnings.includes('headHigh') ? l(' trop haut', ' too high') : l(' ≤ 12 : ok', ' ≤ 12: ok'),
    ),
    'D',
    !r.warnings.includes('headHigh'),
  );
  line(
    1,
    l('Longueur de la conduite motrice', 'Drive pipe length'),
    cat('L/h = ', nf(input.driveLength ?? 0, 0), ' / ', nf(input.fall, 1), cat(' ; S4 ≥ ', nf(r.minLength, 1), ' m')),
    cat(
      nf(r.lengthRatio ?? 0, 1),
      r.warnings.includes('lengthShort')
        ? l(' trop court', ' too short')
        : r.warnings.includes('lengthBelowS4')
          ? l(' < 5', ' < 5')
          : l(' ≥ 5 : ok', ' ≥ 5: ok'),
    ),
    'D',
    !r.warnings.includes('lengthShort') && !r.warnings.includes('lengthBelowS4'),
  );
  line(
    2,
    cat(l('Source pour un ', 'Spring for a '), fracInch(pipe.inch), l(' (tableau S4)', ' (table S4)')),
    cat(nf(input.sourceFlow, 1), ' / ', nf(r.minSource, 1), ' L/min'),
    cat(
      nf(100 * r.sourceRatio, 0),
      ' %',
      r.sourceEnough ? l(' suffisante', ' enough') : l(' insuffisante', ' not enough'),
    ),
    'D',
    r.sourceEnough,
  );
  line(
    3,
    l('Livraison attendue (S4/S6, η = 0,6)', 'Expected delivery (S4/S6, η = 0.6)'),
    cat(
      'q = ',
      nf(TYPICAL_ETA, 1),
      ' × ',
      nf(input.sourceFlow, 1),
      ' × ',
      nf(input.fall, 1),
      ' / ',
      nf(input.deliveryHead, 0),
      ' = ',
      nf(e.lpm, 2),
    ),
    cat(nf(e.lpd, 0), l(' L/jour', ' L/day')),
    'D',
  );
  line(
    4,
    l('Plafond du tableau pour cette taille', 'Table ceiling for this size'),
    cat(nf(pipe.maxDeliveryLpd / 1000, 1), ' m³/', tr(l('jour', 'day'))),
    cat(nf(r.tableCeilingLpd, 0), l(' L/jour', ' L/day')),
    'R',
  );
  if (o.model) {
    const run = valve1();
    p.line([x, y + 8 + 5 * 7.6 - 3.8], [x + w, y + 8 + 5 * 7.6 - 3.8], { w: W.thin, color: '#cfc8b8' });
    const ry = y + 8 + 5 * 7.6 + 0.4;
    p.text(
      [x + 4, ry - 1.5],
      l('Ce que la vidéo mesure et ce que le modèle calcule', 'What the video reports and what the model computes'),
      { size: 1.6, baseline: 'middle', color: INK_2 },
    );
    val(
      p,
      x + 4,
      ry + 2.4,
      'R',
      cat(
        String(REPORTED.deliveryValve1),
        l(' L/jour, soit η = q·H/(Q·h) = ', ' L/day, i.e. η = q·H/(Q·h) = '),
        nf(((REPORTED.deliveryValve1 / 1440) * input.deliveryHead) / (input.sourceFlow * input.fall), 2),
      ),
      { size: 1.7, bold: true },
    );
    val(
      p,
      x + w - 49,
      ry + 2.4,
      'M',
      cat(
        'Q = ',
        nf(run.means.driveFlow, 1),
        ' · ',
        nf(run.perDay, 0),
        l(' L/jour · η = ', ' L/day · η = '),
        nf(run.means.etaD, 2),
      ),
      { size: 1.7, bold: true },
    );
  }
}

function examples(p: View): void {
  p.text(
    [14, 176.5],
    l(
      '4 · EXEMPLES DE CALCUL, avec les fonctions du calculateur de la simulation',
      '4 · WORKED EXAMPLES, with the functions of the simulation’s calculator',
    ),
    { size: 2.5, weight: 'bold' },
  );
  p.line([14, 178.2], [406, 178.2], { w: W.thin, color: INK_2 });
  const a = sizeRam(VIDEO_SITE);
  const b = sizeRam(OTHER_SITE);
  example(
    p,
    14,
    187,
    192,
    cat(
      l('A · le site de la vidéo : h = ', 'A · the video’s site: h = '),
      nf(VIDEO_SITE.fall, 1),
      ' m, H = ',
      nf(VIDEO_SITE.deliveryHead, 0),
      ' m, ',
      nf(VIDEO_SITE.sourceFlow, 1),
      ' L/min',
    ),
    VIDEO_SITE,
    a,
    { model: true },
  );
  example(
    p,
    214,
    187,
    192,
    cat(
      l('B · un autre site (illustration) : h = ', 'B · another site (illustration): h = '),
      nf(OTHER_SITE.fall, 0),
      ' m, H = ',
      nf(OTHER_SITE.deliveryHead, 0),
      ' m, ',
      nf(OTHER_SITE.sourceFlow, 0),
      ' L/min',
    ),
    OTHER_SITE,
    b,
    {},
  );
}

export const sizingTable: DrawingSheet = {
  id: 'sizing-table',
  number: 'RP-D10',
  group: 'hydraulic',
  title: l('Dimensionnement : tableau, règles, exemple', 'Sizing: table, rules, worked example'),
  description: l(
    'Le tableau de NC State Extension relie la taille de la conduite motrice au débit minimal de la source et au pompage maximal ; les unités américaines y sont converties et écrites. Le bélier de 1″ du labo y est placé avec sa source de 7,5 L/min, qui n’en donne qu’un tiers du minimum. Les règles de longueur (au moins 5 × h) et de hauteur (H/h au plus ≈ 12) sont tracées en jauges, puis deux exemples sont calculés avec les fonctions du calculateur de la simulation : le site de la vidéo et un site où la source suffit.',
    'The NC State Extension table links the drive pipe size to the minimum spring flow and the maximum pumping; its US units are converted and written out. The lab’s 1″ ram is placed on it with its 7.5 L/min spring, which gives only a third of the minimum. The rules of length (at least 5 × h) and head (H/h at most ≈ 12) are drawn as gauges, then two examples are computed with the functions of the simulation’s calculator: the video’s site and a site where the spring is enough.',
  ),
  scene: 'ram',
  parts: ['ram', 'inlet-flange', 'inlet-valve'],
  render(): Drawing {
    const d = new Drawing();
    d.frame({
      title: l('Dimensionnement : tableau, règles, exemple', 'Sizing: table, rules, worked example'),
      subtitle: l(
        'Tableau S4, bélier et source du labo, règles de longueur et de hauteur, exemples calculés',
        'S4 table, the lab’s ram and spring, rules of length and head, computed examples',
      ),
      number: 'RP-D10',
      scale: tr(l('sans échelle', 'not to scale')),
    });
    const p = d.paper();
    table(p);
    placed(p);
    rules(p);
    examples(p);
    kindKey(p, 14, 262);
    notes(
      p,
      14,
      250,
      205,
      null,
      [
        l(
          'Ordres de grandeur des sources, pas un plan de réalisation : le tableau ne donne ni chute ni hauteur, et le 1″ du labo n’est pas le Walton n°3 de la vidéo.',
          'Orders of magnitude from the sources, not a build plan: the table gives no fall and no head, and the lab’s 1″ is not the video’s Walton n°3.',
        ),
      ],
      1.6,
    );
    return d;
  },
};
