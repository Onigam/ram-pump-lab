import { l, tr, type L } from '@onigam/lab-kit/i18n';
import { COLORS, Drawing, INK, INK_2, W, type Pt, type View } from '@onigam/lab-kit/drawings';
import type { DrawingSheet } from '@onigam/lab-kit/drawings';
import { SITE, TANK } from '../../three/dims';
import { expectedDelivery } from '../../sim/sizing';
import { VALVE_SETTINGS } from '../../sim/presets';
import { HEAVY_WEIGHT } from '../../sim/presets';
import { Chart } from './chart';
import { REPORTED, sweepHead, sweepStroke, sweepWeight, valveRuns, workingLimits, type SweepPoint } from './model';
import { cat, chip, kindKey, nf, notes, val } from './util';

// RP-D09 — Performance charts, computed from the model at render time (RamSim.sweep): the video's story (valve n°3, n°2,
// n°1: what each one takes, delivers, how fast it strikes, how long the tank lasts), then the delivery against the delivery
// head and the tuning of the valve (counterweight, stroke). Model curves are blue lines and bars; the figures the video
// reports are copper diamonds (R) and bands, never mixed with the curves; closed-form references are dashed (D).

const BLUE = COLORS.water;
const COPPER = COLORS.copper;
const BAR_FILL = '#a9cde6';

/** Three bars (valve n°3, n°2, n°1) with the values on top: returns the chart for the reference marks. */
function bars(
  p: View,
  x: number,
  title: L,
  sub: L,
  yAxis: { max: number; ticks: number[]; label?: L; fmt?: (v: number) => string },
  values: (number | null)[],
  fmt: (v: number) => string,
): Chart {
  const runs = valveRuns();
  const c = new Chart(
    p,
    { x: x + 18, y: 34, w: 70, h: 52 },
    { min: 0, max: 3, ticks: [] },
    { min: 0, max: yAxis.max, ticks: yAxis.ticks, label: yAxis.label, fmt: yAxis.fmt },
  );
  c.frame();
  c.title(title, sub);
  values.forEach((v, i) => {
    const xm = i + 0.5;
    if (v !== null) {
      c.band(xm - 0.27, xm + 0.27, { fill: BAR_FILL, color: BLUE, w: W.medium }, 0, Math.min(v, yAxis.max));
      c.view.rect([c.X(xm - 0.27), c.Y(Math.min(v, yAxis.max))], [c.X(xm + 0.27), c.Y(0)], {
        w: W.medium,
        color: BLUE,
      });
      p.text([c.X(xm), c.Y(0) - 2.6], fmt(v), { size: 1.9, weight: 'bold', anchor: 'middle', color: '#14527e' });
    }
    const r = runs[i];
    if (r) {
      p.text([c.X(xm), c.box.y + c.box.h + 4], cat('n°', String(r.valve)), {
        size: 1.8,
        weight: 'bold',
        anchor: 'middle',
      });
      p.text([c.X(xm), c.box.y + c.box.h + 7.4], r.valve === 3 ? '26×34' : r.valve === 2 ? '20×27' : '15×21', {
        size: 1.5,
        anchor: 'middle',
        color: INK_2,
        mono: true,
      });
    }
  });
  return c;
}

function story(p: View): void {
  const runs = valveRuns();
  p.text(
    [14, 21.5],
    cat(
      l(
        '1 · L’HISTOIRE DE LA VIDÉO : TROIS CLAPETS DE CHOC SUR LE MÊME SITE (modèle, h = ',
        '1 · THE VIDEO’S STORY: THREE WASTE VALVES ON THE SAME SITE (model, h = ',
      ),
      nf(SITE.fall, 1),
      ' m, H = ',
      nf(SITE.deliveryHead, 0),
      ' m)',
    ),
    { size: 2.5, weight: 'bold' },
  );
  p.line([14, 23.2], [406, 23.2], { w: W.thin, color: INK_2 });
  // consumption
  const a1 = bars(
    p,
    14,
    l('Eau prise Q (L/min)', 'Water taken, Q (L/min)'),
    l('', ''),
    { max: 20, ticks: [0, 5, 10, 15, 20] },
    runs.map((r) => r.means.driveFlow),
    (v) => tr(nf(v, 1)),
  );
  a1.hline(REPORTED.springNow, { dash: [2.4, 1.2], color: COPPER, w: W.medium });
  p.text([a1.X(3) + 1, a1.Y(REPORTED.springNow)], l('source', 'spring'), {
    size: 1.5,
    color: COPPER,
    baseline: 'middle',
  });
  a1.hline(REPORTED.springBefore, { dash: [0.6, 1], color: COPPER });
  p.text([a1.X(3) + 1, a1.Y(REPORTED.springBefore)], l('10 (avant)', '10 (before)'), {
    size: 1.4,
    color: COPPER,
    baseline: 'middle',
  });
  a1.marker(0.5 + 0.43, REPORTED.consumptionValve3, 'diamond', { color: COPPER, fill: COPPER, r: 1.1 });
  val(
    p,
    14 + 18,
    98,
    'R',
    cat(l('source ', 'spring '), nf(REPORTED.springNow, 1), l(' L/min (10 avant)', ' L/min (10 before)')),
    { size: 1.5, color: COPPER },
  );
  val(
    p,
    14 + 18,
    101.6,
    'R',
    cat(
      '◆ ',
      nf(REPORTED.consumptionValve3, 0),
      l(' L/min : estimation de l’auteur, n°3', ' L/min: the author’s estimate, n°3'),
    ),
    { size: 1.5, color: COPPER },
  );
  // delivery
  const a2 = bars(
    p,
    112,
    l('Eau refoulée (L/jour)', 'Water delivered (L/day)'),
    l('', ''),
    { max: 1800, ticks: [0, 600, 1200, 1800], fmt: (v) => tr(nf(v, 0)) },
    runs.map((r) => r.perDay),
    (v) => tr(nf(v, 0)),
  );
  a2.marker(2.5 + 0.43, REPORTED.deliveryValve1, 'diamond', { color: COPPER, fill: COPPER, r: 1.1 });
  val(
    p,
    112 + 18,
    98,
    'R',
    cat('◆ ', nf(REPORTED.deliveryValve1, 0), l(' L/jour : n°1, vidéo', ' L/day: n°1, video')),
    { size: 1.5, color: COPPER },
  );
  p.text(
    [112 + 18, 101.6],
    l('tant que le bélier tourne : le n°3 s’arrête au bout de 10 h', 'while the ram runs: the n°3 stops after 10 h'),
    { size: 1.5, color: INK_2 },
  );
  // strokes
  const a3 = bars(
    p,
    210,
    l('Coups par minute', 'Strokes per minute'),
    l('', ''),
    { max: 140, ticks: [0, 35, 70, 105, 140] },
    runs.map((r) => r.means.strokesPerMin),
    (v) => tr(nf(v, 0)),
  );
  a3.band(0.5 + 0.3, 0.5 + 0.46, { fill: COPPER, opacity: 0.8 }, REPORTED.strokesOld[0], REPORTED.strokesOld[1]);
  a3.band(2.5 + 0.3, 2.5 + 0.46, { fill: COPPER, opacity: 0.8 }, REPORTED.strokesNew[0], REPORTED.strokesNew[1]);
  a3.text(0.5 + 0.3, REPORTED.strokesOld[0], cat(String(REPORTED.strokesOld[0]), '–', String(REPORTED.strokesOld[1])), {
    size: 1.4,
    color: COPPER,
    dy: 4.6,
  });
  a3.text(3, REPORTED.strokesNew[1], cat(String(REPORTED.strokesNew[0]), '–', String(REPORTED.strokesNew[1])), {
    size: 1.4,
    color: COPPER,
    anchor: 'end',
    dy: -1.4,
  });
  val(
    p,
    210 + 18,
    98,
    'R',
    cat(
      '▮ ',
      String(REPORTED.strokesOld[0]),
      '–',
      String(REPORTED.strokesOld[1]),
      l(' /min ancien clapet · ', ' /min old valve · '),
      String(REPORTED.strokesNew[0]),
      '–',
      String(REPORTED.strokesNew[1]),
      l(' nouveau', ' new'),
    ),
    { size: 1.5, color: COPPER },
  );
  // tank
  const hours = runs.map((r) => (Number.isFinite(r.hoursToEmpty) ? r.hoursToEmpty : null));
  const a4 = bars(
    p,
    308,
    l('Réserve vide après (h)', 'Tank empty after (h)'),
    l('', ''),
    { max: 48, ticks: [0, 12, 24, 36, 48] },
    hours,
    (v) => tr(nf(v, 0)),
  );
  const never = runs.findIndex((r) => !Number.isFinite(r.hoursToEmpty));
  if (never >= 0) {
    a4.band(
      never + 0.5 - 0.27,
      never + 0.5 + 0.27,
      { fill: COLORS.paper, color: BLUE, hatch: 'water', w: W.medium },
      0,
      48,
    );
    a4.view.rect([a4.X(never + 0.5 - 0.27), a4.Y(48)], [a4.X(never + 0.5 + 0.27), a4.Y(0)], {
      w: W.medium,
      color: BLUE,
      dash: [1.2, 0.8],
    });
    p.text([a4.X(never + 0.5), a4.Y(48) - 1.6], l('jamais', 'never'), {
      size: 1.7,
      weight: 'bold',
      anchor: 'middle',
      color: BLUE,
    });
  }
  a4.marker(0.5 + 0.43, REPORTED.tankHoursValve3, 'diamond', { color: COPPER, fill: COPPER, r: 1.1 });
  val(
    p,
    308 + 18,
    98,
    'R',
    cat('◆ ≈ ', nf(REPORTED.tankHoursValve3, 0), l(' h : n°3, vidéo (S1 02:07)', ' h: n°3, video (S1 02:07)')),
    { size: 1.5, color: COPPER },
  );
  p.text(
    [308 + 18, 101.6],
    cat(
      l('réserve de ', 'tank of '),
      nf(TANK.volumeL, 0),
      l(' L, dérivée de ce chiffre (D)', ' L, derived from this figure (D)'),
    ),
    { size: 1.5, color: INK_2 },
  );
}

/** A series from sweep points. */
const pts = (s: SweepPoint[], f: (q: SweepPoint) => number): Pt[] => s.map((q) => [q.x, f(q)]);

function head(p: View, x: number): void {
  const s = sweepHead();
  const lim = workingLimits();
  const up = new Chart(
    p,
    { x, y: 130, w: 108, h: 44 },
    { min: 15, max: 100, ticks: [20, 40, 60, 80, 100], label: undefined },
    {
      min: 0,
      max: 4000,
      ticks: [0, 1000, 2000, 3000, 4000],
      label: l('refoulé (L/jour)', 'delivered (L/day)'),
      fmt: (v) => tr(nf(v, 0)),
    },
    { xLabels: false },
  );
  const lo = new Chart(
    p,
    { x, y: 182, w: 108, h: 28 },
    {
      min: 15,
      max: 100,
      ticks: [20, 40, 60, 80, 100],
      label: l('hauteur de refoulement H (m)', 'delivery head H (m)'),
    },
    { min: 0, max: 14, ticks: [0, 5, 10, 14], label: l('Q (L/min)', 'Q (L/min)') },
  );
  up.frame();
  lo.frame();
  up.title(l('Refoulement selon la hauteur H', 'Delivery against the head H'), l('clapet n°1', 'n°1 valve'));
  // H/h scale along the top
  for (const r of [2, 4, 6, 8, 10, 12]) {
    const H = r * SITE.fall;
    if (H < 15 || H > 100) continue;
    p.line([up.X(H), up.box.y], [up.X(H), up.box.y - 1.2], { w: W.thin });
    p.text([up.X(H), up.box.y - 2.4], String(r), { size: 1.4, anchor: 'middle', mono: true, color: INK_2 });
  }
  p.text([up.box.x + up.box.w + 1.5, up.box.y - 2.4], 'H/h', { size: 1.4, color: INK_2 });
  // zone where the rule H/h ≤ ~12 is exceeded
  for (const c of [up, lo]) c.band(lim.headCeiling, 100, { fill: '#f1d9d4', opacity: 0.7 });
  p.text(
    [up.X((lim.headCeiling + 100) / 2) + 0.6, up.Y(2000)],
    cat('H > ', nf(lim.headCeiling, 0), l(' m : rien n’est refoulé', ' m: nothing is delivered')),
    { size: 1.5, color: COLORS.red, rotate: 90, anchor: 'middle' },
  );
  // curves: model, the η = 1 bound with the same drive flow, the closed form of S4
  up.line(
    pts(s, (q) => q.bound),
    { w: W.medium, color: INK_2, dash: [0.5, 1] },
  );
  const s4 = s.map((q): Pt => [q.x, expectedDelivery(SITE.sourceFlowLpm, SITE.fall, q.x, 0.6).lpd]);
  up.line(s4, { w: W.medium, color: COPPER, dash: [2.4, 1.2] });
  up.line(
    pts(s, (q) => q.perDay),
    { w: 0.6, color: BLUE },
  );
  up.vline(SITE.deliveryHead, { color: INK, dash: [1, 1] });
  up.marker(SITE.deliveryHead, REPORTED.deliveryValve1, 'diamond', { color: COPPER, fill: COPPER, r: 1.2 });
  up.marker(SITE.deliveryHead, expectedDelivery(SITE.sourceFlowLpm, SITE.fall, SITE.deliveryHead, 0.6).lpd, 'cross', {
    color: COPPER,
    r: 1,
  });
  // lower plot: the water taken by the ram, with the flow of the spring
  lo.hline(REPORTED.springNow, { dash: [2.4, 1.2], color: COPPER, w: W.medium });
  lo.text(101, REPORTED.springNow, l('source', 'spring'), { size: 1.4, color: COPPER, baseline: 'middle', dx: 0.5 });
  lo.line(
    pts(s, (q) => q.means.driveFlow),
    { w: 0.6, color: BLUE },
  );
  lo.vline(SITE.deliveryHead, { color: INK, dash: [1, 1] });
  p.text([lo.X(SITE.deliveryHead) + 1.2, lo.Y(13)], cat(l('site : ', 'site: '), nf(SITE.deliveryHead, 0), ' m'), {
    size: 1.5,
    color: INK,
  });
  // legend of this chart
  const ly = 222;
  p.line([x, ly], [x + 8, ly], { w: 0.6, color: BLUE });
  p.text([x + 10, ly], l('modèle', 'model'), { size: 1.5, baseline: 'middle' });
  p.line([x + 28, ly], [x + 36, ly], { w: W.medium, color: INK_2, dash: [0.5, 1] });
  p.text([x + 38, ly], l('borne η = 1 (K14)', 'bound η = 1 (K14)'), { size: 1.5, baseline: 'middle' });
  p.line([x, ly + 3.6], [x + 8, ly + 3.6], { w: W.medium, color: COPPER, dash: [2.4, 1.2] });
  p.text(
    [x + 10, ly + 3.6],
    cat(
      l('formule S4, η = 0,6, Q = 7,5 L/min (D) · ', 'S4 formula, η = 0.6, Q = 7.5 L/min (D) · '),
      '✕ ',
      nf(expectedDelivery(SITE.sourceFlowLpm, SITE.fall, SITE.deliveryHead, 0.6).lpd, 0),
    ),
    { size: 1.5, baseline: 'middle' },
  );
  chip(p, [x + 1.6, ly + 7.4], 'R');
  p.text(
    [x + 5, ly + 7.4],
    cat('◆ ', nf(REPORTED.deliveryValve1, 0), l(' L/jour à 65 m (vidéo)', ' L/day at 65 m (video)')),
    { size: 1.5, baseline: 'middle', color: COPPER },
  );
}

function tuning(
  p: View,
  x: number,
  o: {
    title: L;
    sub: L;
    xs: SweepPoint[];
    x0: number;
    x1: number;
    ticks: number[];
    xLabel: L;
    qMax: number;
    QMax: number;
    Qticks: number[];
    marks: { x: number; label: L; kind: 'C' | 'M'; dy: number }[];
    floor: number;
    ceiling?: number;
    floorLabel: L;
    ceilLabel?: L;
  },
): void {
  const up = new Chart(
    p,
    { x, y: 130, w: 100, h: 44 },
    { min: o.x0, max: o.x1, ticks: o.ticks },
    {
      min: 0,
      max: o.qMax,
      step: o.qMax / 4,
      label: l('refoulé (L/jour)', 'delivered (L/day)'),
      fmt: (v) => tr(nf(v, 0)),
    },
    { xLabels: false },
  );
  const lo = new Chart(
    p,
    { x, y: 182, w: 100, h: 28 },
    { min: o.x0, max: o.x1, ticks: o.ticks, label: o.xLabel },
    { min: 0, max: o.QMax, ticks: o.Qticks, label: l('Q (L/min)', 'Q (L/min)') },
  );
  up.frame();
  lo.frame();
  up.title(o.title, o.sub);
  for (const c of [up, lo]) {
    c.band(o.x0, o.floor, { fill: '#efe6d2', opacity: 0.85 });
    if (o.ceiling !== undefined) c.band(o.ceiling, o.x1, { fill: '#f1d9d4', opacity: 0.7 });
  }
  up.text(o.x0, o.qMax * 0.93, o.floorLabel, { size: 1.4, color: INK_2, dx: 0.8 });
  if (o.ceiling !== undefined && o.ceilLabel)
    p.text([up.X((o.ceiling + o.x1) / 2) + 0.6, up.Y(o.qMax * 0.5)], o.ceilLabel, {
      size: 1.4,
      color: COLORS.red,
      rotate: 90,
      anchor: 'middle',
    });
  up.line(
    pts(o.xs, (q) => q.perDay),
    { w: 0.6, color: BLUE },
  );
  lo.hline(REPORTED.springNow, { dash: [2.4, 1.2], color: COPPER, w: W.medium });
  lo.line(
    pts(o.xs, (q) => q.means.driveFlow),
    { w: 0.6, color: BLUE },
  );
  lo.text(o.x1, REPORTED.springNow, l('source', 'spring'), {
    size: 1.4,
    color: COPPER,
    baseline: 'middle',
    anchor: 'end',
    dy: -1.6,
    dx: -0.5,
  });
  for (const m of o.marks) {
    for (const c of [up, lo]) c.vline(m.x, { color: m.kind === 'C' ? COPPER : INK, dash: [1, 1] });
    p.text([up.X(m.x) + 1, up.box.y + up.box.h - 2.2 - m.dy], m.label, {
      size: 1.5,
      color: m.kind === 'C' ? COPPER : INK,
    });
  }
}

function tuningPanels(p: View): void {
  const lim = workingLimits();
  const w = sweepWeight();
  const st = sweepStroke();
  const v1 = VALVE_SETTINGS[1];
  tuning(p, 168, {
    title: l('Réglage : poids du contrepoids', 'Tuning: counterweight'),
    sub: l('clapet n°1', 'n°1 valve'),
    xs: w,
    x0: 0,
    x1: 1000,
    ticks: [0, 200, 400, 600, 800, 1000],
    xLabel: l('contrepoids (g)', 'counterweight (g)'),
    qMax: 1000,
    QMax: 30,
    Qticks: [0, 10, 20, 30],
    marks: [
      { x: v1.counterweight, label: cat(String(v1.counterweight), ' g'), kind: 'C', dy: 0 },
      { x: HEAVY_WEIGHT, label: cat(String(HEAVY_WEIGHT), ' g'), kind: 'M', dy: 0 },
    ],
    floor: lim.weightFloor,
    ceiling: lim.weightCeiling,
    floorLabel: cat('< ', nf(lim.weightFloor, 0), ' g'),
    ceilLabel: cat('> ', nf(lim.weightCeiling, 0), l(' g : ne ferme plus', ' g: never closes')),
  });
  tuning(p, 296, {
    title: l('Réglage : course (écrou de réglage)', 'Tuning: stroke (stroke nut)'),
    sub: l('clapet n°1', 'n°1 valve'),
    xs: st,
    x0: 0.5,
    x1: 6,
    ticks: [1, 2, 3, 4, 5, 6],
    xLabel: l('course (mm)', 'stroke (mm)'),
    qMax: 1600,
    QMax: 24,
    Qticks: [0, 8, 16, 24],
    marks: [{ x: v1.stroke, label: cat(nf(v1.stroke, 1), ' mm'), kind: 'C', dy: 0 }],
    floor: lim.strokeFloor,
    floorLabel: cat('< ', nf(lim.strokeFloor, 1), ' mm'),
  });
}

function legend(p: View, x: number, y: number): void {
  p.text([x, y], l('LÉGENDE DES COURBES', 'KEY TO THE CURVES'), { size: 2.1, weight: 'bold' });
  const rows: [() => void, L][] = [
    [
      () => p.rect([x, y + 3.2], [x + 8, y + 6.2], { w: W.medium, color: BLUE, fill: BAR_FILL }),
      l('barre ou courbe bleue : résultat du modèle (M)', 'blue bar or curve: model result (M)'),
    ],
    [
      () =>
        p.polyline(
          [
            [x + 4, y + 9.7],
            [x + 5.4, y + 7.7],
            [x + 6.8, y + 9.7],
            [x + 5.4, y + 11.7],
          ].map((q) => q as Pt),
          { closed: true, w: 0, fill: COPPER },
        ),
      l(
        'losange ou bande cuivre : chiffre rapporté par la vidéo (R)',
        'copper diamond or band: figure reported by the video (R)',
      ),
    ],
    [
      () => p.line([x, y + 14.7], [x + 8, y + 14.7], { w: W.medium, color: COPPER, dash: [2.4, 1.2] }),
      l(
        'tireté cuivre : débit de la source (R) ou formule de S4 (D)',
        'dashed copper: spring flow (R) or S4 formula (D)',
      ),
    ],
    [
      () => p.line([x, y + 19.7], [x + 8, y + 19.7], { w: W.thin, color: INK, dash: [1, 1] }),
      l(
        'pointillé vertical : réglage ou site de la vidéo (calibré C)',
        'dotted vertical: the video’s setting or site (calibrated C)',
      ),
    ],
  ];
  rows.forEach(([draw, text], i) => {
    draw();
    p.text([x + 11, y + 4.7 + i * 5], text, { size: 1.6, baseline: 'middle' });
  });
}

export const performanceChart: DrawingSheet = {
  id: 'performance-chart',
  number: 'RP-D09',
  group: 'hydraulic',
  title: l('Courbes de performance', 'Performance charts'),
  description: l(
    'Ce que le modèle calcule pour le site de la vidéo. En haut : les trois clapets (n°3, n°2, n°1), l’eau qu’ils prennent, l’eau qu’ils refoulent, leur cadence et le temps que tient la réserve ; les chiffres rapportés par la vidéo sont les losanges et bandes cuivre, à côté des barres du modèle. En bas : le refoulement selon la hauteur, puis le réglage du clapet n°1 (contrepoids et course), avec la consommation en dessous pour la comparer au débit de la source.',
    'What the model computes for the video’s site. Top: the three valves (n°3, n°2, n°1), the water they take, the water they deliver, their rate and how long the tank lasts; the figures the video reports are the copper diamonds and bands beside the model’s bars. Bottom: the delivery against the head, then the tuning of the n°1 valve (counterweight and stroke), with the consumption underneath to compare it with the spring flow.',
  ),
  scene: 'ram',
  parts: ['waste-valve', 'air-chamber', 'delivery-valve'],
  render(): Drawing {
    const d = new Drawing();
    d.frame({
      title: l('Courbes de performance', 'Performance charts'),
      subtitle: l(
        'Clapets n°3, n°2, n°1 — refoulement selon H — réglage du poids et de la course',
        'Valves n°3, n°2, n°1 — delivery against H — tuning of weight and stroke',
      ),
      number: 'RP-D09',
      scale: tr(l('courbes', 'curves')),
    });
    const p = d.paper();
    story(p);
    p.text(
      [14, 116],
      l(
        '2 · REFOULEMENT ET RÉGLAGE : COURBES DU MODÈLE (le clapet n°1 de la vidéo, tout le reste inchangé)',
        '2 · DELIVERY AND TUNING: MODEL CURVES (the video’s n°1 valve, everything else unchanged)',
      ),
      { size: 2.5, weight: 'bold' },
    );
    p.line([14, 117.8], [406, 117.8], { w: W.thin, color: INK_2 });
    head(p, 32);
    tuningPanels(p);
    legend(p, 14, 238);
    kindKey(p, 14, 266);
    const w = sweepWeight();
    const best = w.reduce((m, q) => (q.perDay > m.perDay ? q : m), w[0] as SweepPoint);
    const lim = workingLimits();
    notes(
      p,
      168,
      228,
      238,
      null,
      [
        l(
          'Les barres du haut sont calibrées sur la vidéo (course et poids choisis pour retrouver 17 L/min, 500 L/jour et 100–110 coups/min) : elles coïncident avec les losanges par construction. Les courbes du bas sont des prédictions du modèle, pas des mesures.',
          'The top bars are calibrated on the video (stroke and weight chosen to retrieve 17 L/min, 500 L/day and 100–110 strokes/min): they agree with the diamonds by construction. The bottom curves are predictions of the model, not measurements.',
        ),
        cat(
          l(
            'Plus de poids ou plus de course refoule plus, jusqu’à un maximum (≈ ',
            'More weight or more stroke delivers more, up to a maximum (≈ ',
          ),
          nf(best.perDay, 0),
          l(' L/jour vers ', ' L/day near '),
          nf(best.x, 0),
          l(
            ' g), mais en prenant plus que la source : la réserve se vide, c’est l’histoire du clapet n°3. Au-delà de ',
            ' g), but by taking more than the spring gives: the tank empties, the n°3 valve’s story. Beyond ',
          ),
          nf(lim.weightCeiling, 0),
          l(' g le clapet ne ferme plus.', ' g the valve no longer closes.'),
        ),
      ],
      1.6,
    );
    return d;
  },
};
