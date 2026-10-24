import { l, tr, type L } from '@onigam/lab-kit/i18n';
import { COLORS, Drawing, INK, INK_2, W, type Pt, type View } from '@onigam/lab-kit/drawings';
import type { DrawingSheet } from '@onigam/lab-kit/drawings';
import { SITE } from '../../three/dims';
import { G, RHO, WAVE_SPEED } from '../../sim/physics';
import type { StrokeTrace } from '../../sim/types';
import { Chart } from './chart';
import { ram, REPORTED, stroke1, surgeBar, valve1 } from './model';
import { airChamber, wasteValve } from './symbols';
import { arrowLine, balloon, cat, flowArrow, kindKey, nf, para, val, type Kind } from './util';

// RP-D08 — The four-beat cycle of the ram (acceleration, closing, delivery, recoil): four small schematics with the position
// of the waste valve and of the check valve, and under them the pressure and velocity of ONE stroke computed from
// RamSim.strokeTrace() (the n°1 valve of the video at its site), the phases marked on the time axis. Joukowsky's surge
// Δp = ρ·a·v is written with the model's numbers. Everything on the traces is a model result.

const BLUE = COLORS.water;

/** Tint of each phase (bands on the traces, squares in the schematics). */
const PHASE_FILL = ['#dcebf5', '#f4dcd8', '#e3ecd2', '#f2e4d4'] as const;
const PHASE_INK = [BLUE, COLORS.red, COLORS.pe, COLORS.copper] as const;

const PHASES: { fr: string; en: string; text: L }[] = [
  {
    fr: 'Accélération',
    en: 'Acceleration',
    text: l(
      'La chute fait accélérer l’eau de la conduite motrice. Le clapet de choc est ouvert : presque toute l’eau s’échappe par lui.',
      'The fall makes the water of the drive pipe accelerate. The waste valve is open: almost all the water escapes through it.',
    ),
  },
  {
    fr: 'Fermeture',
    en: 'Closing',
    text: l(
      'Le courant, devenu assez rapide, entraîne le clapet qui claque sur son siège : la colonne d’eau est stoppée net et la pression monte (coup de bélier).',
      'The flow, now fast enough, drags the valve onto its seat with a slam: the water column is stopped dead and the pressure surges (water hammer).',
    ),
  },
  {
    fr: 'Refoulement',
    en: 'Delivery',
    text: l(
      'La surpression soulève le clapet anti-retour : un peu d’eau entre dans la cloche à air, qui la pousse dans la conduite de refoulement.',
      'The surge lifts the check valve: a little water enters the air chamber, which pushes it into the delivery pipe.',
    ),
  },
  {
    fr: 'Recul',
    en: 'Recoil',
    text: l(
      'La colonne rebondit : le courant s’inverse, la pression tombe à zéro, le clapet de choc retombe et s’ouvre, de l’air entre par le reniflard.',
      'The column rebounds: the flow reverses, the pressure drops to zero, the waste valve falls open and air comes in through the snifter.',
    ),
  },
];

interface Instant {
  /** Sample index of the trace. */
  i: number;
  t: number;
  p: number;
  v: number;
  z: number;
}

/** The instant drawn for each phase: the same choices as RamSim's frozen phases (docs/physics.md §8). */
function instants(tr: StrokeTrace): Instant[] {
  const at = (i: number): Instant => ({
    i,
    t: tr.t[i] as number,
    p: tr.pressure[i] as number,
    v: tr.velocity[i] as number,
    z: tr.valve[i] as number,
  });
  const inPhase = (k: number) => tr.phase.map((q, i) => (q === k ? i : -1)).filter((i) => i >= 0);
  const a = inPhase(0);
  const c = inPhase(1);
  const d = inPhase(2);
  const r = inPhase(3);
  const accel = a.reduce(
    (best, i) => ((tr.t[i] as number) <= tr.start[0] + 0.95 * tr.length[0] ? i : best),
    a[0] as number,
  );
  const close = c.reduce(
    (best, i) => ((tr.pressure[i] as number) > (tr.pressure[best] as number) ? i : best),
    c[0] as number,
  );
  const deliver = d.length ? (d[Math.floor(d.length / 2)] as number) : close;
  const recoil = r.find((i) => (tr.valve[i] as number) >= 0.5) ?? (r[Math.floor(r.length / 2)] as number);
  return [at(accel), at(close), at(deliver), at(recoil)];
}

interface Beat {
  /** Waste valve lift 0 (shut) … 1 (open). */
  valve: number;
  /** The check valve is open. */
  check: boolean;
  /** Direction of the flow in the drive pipe. */
  flow: 'forward' | 'back' | 'stopping' | 'slow';
  jets: boolean | 'air';
  /** Air through the snifter. */
  air: boolean;
  shock: boolean;
}

/** One ram in section-like symbols: the body, the waste valve, the snifter, the check valve and the air chamber. */
function ramSchematic(p: View, ox: number, oy: number, b: Beat): void {
  const bx1 = 62;
  // drive pipe and body, full of water
  p.rect([-14 + ox, oy - 3], [ox, oy + 3], { w: W.thick, fill: COLORS.waterFill });
  p.rect([ox, oy - 3.4], [ox + bx1, oy + 3.4], { w: W.thick, fill: COLORS.waterFill });
  for (const x of [0, bx1]) p.line([ox + x, oy - 5.2], [ox + x, oy + 5.2], { w: 1.2 });
  // waste valve on the body
  wasteValve(p, [ox + 14, oy - 3.4], { lift: b.valve, jets: b.jets, scale: 1 });
  // snifter: a small tube with its non-return disc, air arrow when it passes
  p.line([ox + 31, oy - 3.4], [ox + 31, oy - 12], { w: 0.7 });
  p.polyline(
    [
      [ox + 29.4, oy - 11],
      [ox + 32.6, oy - 11],
      [ox + 31, oy - 8.6],
    ],
    { closed: true, w: W.thin, fill: INK },
  );
  if (b.air) {
    const e = p.line([ox + 31, oy - 21], [ox + 31, oy - 13.4], { w: W.thin, color: INK_2, dash: [0.8, 0.5] });
    e.setAttribute('marker-end', 'url(#arrow)');
  }
  p.text([ox + 33.4, oy - 10.2], l('reniflard', 'snifter'), { size: 1.5, color: INK_2 });
  // check valve: seat, disc (lifted when open), stub to the chamber
  const cx = ox + 47;
  p.line([cx - 2.4, oy - 3.4], [cx - 2.4, oy - 12], { w: 0.7 });
  p.line([cx + 2.4, oy - 3.4], [cx + 2.4, oy - 12], { w: 0.7 });
  p.line([cx - 2.4, oy - 7.4], [cx - 1.2, oy - 7.4], { w: W.thick });
  p.line([cx + 2.4, oy - 7.4], [cx + 1.2, oy - 7.4], { w: W.thick });
  const dz = b.check ? 3 : 0;
  p.polyline(
    [
      [cx - 2.1, oy - 6.2 - dz],
      [cx + 2.1, oy - 6.2 - dz],
      [cx + 1, oy - 7.4 - dz],
      [cx - 1, oy - 7.4 - dz],
    ],
    { closed: true, w: W.medium, fill: INK },
  );
  if (b.check) {
    p.rect([cx - 2.2, oy - 11.8], [cx + 2.2, oy - 7.6], { w: 0, fill: COLORS.waterFill });
    flowArrow(p, [cx, oy - 5], 90, BLUE, 1.2);
    flowArrow(p, [cx, oy - 13.6], 90, BLUE, 1.2);
  }
  airChamber(p, [cx, oy - 12], { w: 14, h: 30, air: 0.55 });
  p.text([cx + 8.6, oy - 38.4], l('cloche à air', 'air chamber'), { size: 1.5, color: INK_2 });
  // outlet to the delivery pipe: continuous, the chamber smooths the flow
  p.line([cx + 7, oy - 22], [ox + bx1 + 16, oy - 22], { w: 0.7 });
  flowArrow(p, [ox + bx1 + 10, oy - 22], 0, BLUE, 1);
  p.text([ox + bx1 + 16, oy - 24], l('→ château d’eau', '→ water tower'), { size: 1.5, color: INK_2, anchor: 'end' });
  // water hammer: pressure arcs at the check valve and the closed waste valve
  if (b.shock) {
    for (const r of [4.5, 7.5, 10.5]) p.arc([ox + 14, oy - 5], r, 25, 155, { w: W.thin, color: COLORS.red });
    p.arc([ox + 14, oy], 5, 205, 335, { w: 0, color: COLORS.red });
  }
  // flow in the drive pipe
  const fy = oy;
  if (b.flow === 'forward') {
    for (const x of [-10, -3]) flowArrow(p, [ox + x, fy], 0, BLUE, 1.7);
    for (const x of [3.5, 24]) flowArrow(p, [ox + x, fy], 0, BLUE, 1.7);
  } else if (b.flow === 'stopping') {
    flowArrow(p, [ox - 8, fy], 0, BLUE, 1.7);
    flowArrow(p, [ox - 1.5, fy], 0, BLUE, 1.1);
  } else if (b.flow === 'slow') {
    flowArrow(p, [ox - 8, fy], 0, BLUE, 1.2);
    flowArrow(p, [ox + 4, fy], 0, BLUE, 1.2);
  } else {
    for (const x of [-10, -3, 10]) flowArrow(p, [ox + x, fy], 180, BLUE, 1.7);
  }
}

const BEATS: Beat[] = [
  { valve: 1, check: false, flow: 'forward', jets: true, air: false, shock: false },
  { valve: 0, check: false, flow: 'stopping', jets: false, air: false, shock: true },
  { valve: 0, check: true, flow: 'slow', jets: false, air: false, shock: false },
  { valve: 0.5, check: false, flow: 'back', jets: 'air', air: true, shock: false },
];

const num = (n: number, d = 0) => nf(n, d);

function panels(p: View, tr_: StrokeTrace, ins: Instant[]): void {
  const w = 98;
  PHASES.forEach((ph, k) => {
    const px = 14 + w * k;
    const inst = ins[k] as Instant;
    // heading: balloon, name, share of the cycle
    balloon(p, [px + 4, 25.5], String(k + 1), 3, PHASE_INK[k]);
    p.text([px + 9.5, 25.5], l(ph.fr, ph.en), { size: 2.7, weight: 'bold', baseline: 'middle' });
    p.rect([px + 1, 31], [px + w - 3, 32.2], { w: 0, fill: PHASE_FILL[k] });
    ramSchematic(p, px + 16, 78, BEATS[k] as Beat);
    p.text(
      [px + 1.5, 88.5],
      cat(
        l('durée ', 'lasts '),
        nf(tr_.length[k] as number, 0),
        ' ms · ',
        nf((100 * (tr_.length[k] as number)) / tr_.period, 0),
        l(' % du cycle', ' % of the cycle'),
      ),
      { size: 1.7, color: BLUE, weight: 'bold' },
    );
    para(p, px + 1.5, 93, w - 7, ph.text, 1.7);
    // the model's numbers at the instant drawn in the traces
    val(p, px + 1.5, 109, 'M', cat('p = ', num(inst.p, 1), ' bar'), { size: 1.7, bold: true });
    val(p, px + 30, 109, 'M', cat('v = ', num(inst.v, 2), ' m/s'), { size: 1.7, bold: true });
    val(p, px + 62, 109, 'M', cat(l('clapet ', 'valve '), num(100 * inst.z, 0), ' %'), { size: 1.7, bold: true });
  });
  for (let k = 1; k < 4; k++) p.line([14 + w * k - 1.5, 21], [14 + w * k - 1.5, 113], { w: W.thin, color: '#cfc8b8' });
}

function traces(p: View, tr_: StrokeTrace, ins: Instant[]): void {
  const st = ram().state;
  const x0 = 38;
  const w = 256;
  const T = tr_.period;
  const ticks = [0, 100, 200, 300, 400, 500];
  const P = new Chart(
    p,
    { x: x0, y: 128, w, h: 48 },
    { min: 0, max: T, ticks },
    { min: -1, max: 10, ticks: [0, 2, 4, 6, 8], label: l('pression du corps (bar)', 'body pressure (bar)') },
    { xLabels: false },
  );
  const V = new Chart(
    p,
    { x: x0, y: 182, w, h: 34 },
    { min: 0, max: T, ticks },
    {
      min: -1,
      max: 1.2,
      ticks: [-0.5, 0, 0.5, 1],
      label: l('vitesse (m/s)', 'velocity (m/s)'),
      fmt: (v) => tr(nf(v, 1)),
    },
    { xLabels: false },
  );
  const Z = new Chart(
    p,
    { x: x0, y: 221, w, h: 12 },
    {
      min: 0,
      max: T,
      ticks,
      label: l('temps depuis le début de l’accélération (ms)', 'time since the start of the acceleration (ms)'),
    },
    {
      min: 0,
      max: 1,
      ticks: [0, 1],
      label: l('clapet', 'valve'),
      fmt: (v) => tr(v === 1 ? l('ouv.', 'open') : l('fermé', 'shut')),
    },
  );
  // phase bands behind the three plots
  for (const c of [P, V, Z]) {
    c.view.rect([c.box.x, c.box.y], [c.box.x + c.box.w, c.box.y + c.box.h], { w: 0, fill: COLORS.paper });
    for (let k = 0; k < 4; k++) {
      if ((tr_.length[k] as number) <= 0) continue;
      c.band(tr_.start[k] as number, (tr_.start[k] as number) + (tr_.length[k] as number), { fill: PHASE_FILL[k] });
    }
  }
  P.frame();
  V.frame();
  Z.frame();
  // phase names at the top of the pressure plot (the narrow delivery band is named to the right of its start)
  const labelAt = [T * 0.4, T * 0.597, T * 0.64, T * 0.86];
  for (let k = 0; k < 4; k++) {
    const t0 = tr_.start[k] as number;
    const t1 = t0 + (tr_.length[k] as number);
    const name = l((PHASES[k] as { fr: string }).fr, (PHASES[k] as { en: string }).en);
    const lx = P.X(k === 2 ? t1 : labelAt[k]) + (k === 2 ? 4.5 : 0);
    const ly = P.Y(9.35);
    if (k === 2) p.line([P.X((t0 + t1) / 2), P.Y(9.35)], [lx - 3, ly], { w: W.thin, color: PHASE_INK[k] });
    balloon(p, [lx - (k === 2 ? 0 : 9), ly], String(k + 1), 2.2, PHASE_INK[k]);
    p.text([lx + (k === 2 ? 3.2 : -5.6), ly], name, {
      size: 1.8,
      weight: 'bold',
      baseline: 'middle',
      color: PHASE_INK[k],
    });
  }
  // reference lines of the pressure plot
  const staticDeliveryBar = st.deliveryStaticBar;
  P.hline(staticDeliveryBar, { dash: [2.4, 1.2], color: INK });
  P.text(
    T * 0.012,
    staticDeliveryBar,
    cat(
      'ρ·g·H = ',
      num(staticDeliveryBar, 1),
      l(' bar : pression statique de la conduite de refoulement', ' bar: static pressure of the delivery pipe'),
    ),
    { dy: 3.4, size: 1.6, color: INK },
  );
  P.hline(st.surgeBar, { dash: [0.5, 1], color: COLORS.red });
  P.text(
    T * 0.012,
    st.surgeBar,
    cat(
      'ρ·a·v = ',
      num(st.surgeBar, 1),
      l(' bar : la montée si rien ne s’échappait (Joukowsky)', ' bar: the rise if nothing could escape (Joukowsky)'),
    ),
    { dy: -1.2, size: 1.6, color: COLORS.red },
  );
  P.text(
    T * 0.012,
    0,
    l('0 bar : à l’air libre par le clapet de choc ouvert', '0 bar: open to the air through the open waste valve'),
    { dy: -2.6, size: 1.6, color: INK_2 },
  );
  P.line(
    tr_.t.map((t, i): Pt => [t, tr_.pressure[i] as number]),
    { w: 0.55, color: BLUE },
  );
  // velocity: zero line, the minimum closing velocity of K15 as a band, the trace
  V.hline(0, { color: INK, w: W.thin });
  V.band(0, T, { fill: '#e2dccb', opacity: 0.9 }, 0.5, 0.65);
  V.hline(st.minClosingVelocity, { dash: [1.2, 0.8], color: INK });
  V.line(
    tr_.t.map((t, i): Pt => [t, tr_.velocity[i] as number]),
    { w: 0.55, color: BLUE },
  );
  V.text(T * 0.012, -0.55, cat(l('vitesse à la fermeture ', 'closing velocity '), num(st.closingVelocity, 2), ' m/s'), {
    size: 1.6,
    color: BLUE,
    dy: 0,
  });
  V.text(
    T * 0.63,
    1.0,
    l(
      'K15 : vitesse minimale de fermeture 0,5–0,65 m/s (dérivé)',
      'K15: minimum closing velocity 0.5–0.65 m/s (derived)',
    ),
    { size: 1.5, color: INK_2, dy: 0 },
  );
  V.text(
    T * 0.63,
    0.84,
    cat(
      l('modèle : ', 'model: '),
      num(st.minClosingVelocity, 2),
      ' m/s (trait tireté)'.replace('(trait tireté)', tr(l('(tireté)', '(dashed)'))),
    ),
    { size: 1.5, color: INK_2, dy: 0 },
  );
  V.text(
    T * 0.74,
    -0.86,
    l('négative : l’eau reflue vers la source', 'negative: the water flows back towards the spring'),
    { size: 1.6, color: INK_2, anchor: 'middle' },
  );
  // valve opening
  Z.line(
    tr_.t.map((t, i): Pt => [t, tr_.valve[i] as number]),
    { w: 0.55, color: INK },
  );
  // the four frozen instants, as numbered dots on the three traces
  ins.forEach((q, k) => {
    for (const [c, y] of [
      [P, q.p],
      [V, q.v],
      [Z, q.z],
    ] as const) {
      c.marker(q.t, y, 'circle', { r: 1.25, color: PHASE_INK[k], fill: PHASE_INK[k] });
    }
    p.text([P.X(q.t) + (k === 2 ? 2.6 : 0), P.Y(q.p) - 2.8], String(k + 1), {
      size: 1.6,
      weight: 'bold',
      color: PHASE_INK[k],
      anchor: 'middle',
      halo: true,
    });
  });
  // the stroke period
  arrowLine(p, [P.X(0), 122.5], [P.X(T), 122.5], INK_2, W.thin, true);
  p.text(
    [P.X(T / 2) - 36, 121.1],
    cat(
      l('un coup complet : ', 'one whole stroke: '),
      num(T, 0),
      ' ms = ',
      num(60000 / T, 0),
      l(' coups/min', ' strokes/min'),
    ),
    { size: 1.7, anchor: 'middle', halo: true },
  );
  val(p, P.X(T / 2) + 4, 121.1, 'M', l('modèle', 'model'), { size: 1.6, color: INK_2 });
  val(
    p,
    P.X(T / 2) + 30,
    121.1,
    'R',
    cat(l('vidéo : ', 'video: '), String(REPORTED.strokesNew[0]), '–', String(REPORTED.strokesNew[1]), ' /min'),
    { size: 1.6, color: INK },
  );
}

function hammer(p: View): void {
  const m = valve1().means;
  const st = ram().state;
  const x = 312;
  const y = 134;
  const w = 94;
  p.rect([x - 3, y - 12], [x + w, y + 108], { w: W.medium, fill: COLORS.paper });
  p.text([x, y - 6.5], l('COUP DE BÉLIER — Joukowsky', 'WATER HAMMER — Joukowsky'), { size: 2.2, weight: 'bold' });
  p.line([x, y - 5], [x + w - 6, y - 5], { w: W.thin, color: INK_2 });
  p.text([x, y + 3], 'Δp = ρ · a · v', { size: 2.8, weight: 'bold', mono: true });
  const rows: [string, L, L, Kind | null][] = [
    ['ρ', l('masse volumique de l’eau', 'density of water'), cat(nf(RHO, 0), ' kg/m³'), null],
    [
      'a',
      l('vitesse du son du tuyau d’acier', 'wave speed of the steel pipe'),
      cat(nf(WAVE_SPEED.steel, 0), ' m/s'),
      'C',
    ],
    [
      'v',
      l('vitesse de l’eau à la fermeture', 'water velocity at closing'),
      cat(nf(m.closingVelocity, 2), ' m/s'),
      'M',
    ],
  ];
  rows.forEach(([sym, name, value, kind], i) => {
    const ry = y + 10 + i * 5;
    p.text([x, ry], sym, { size: 2, weight: 'bold', mono: true, baseline: 'middle' });
    p.text([x + 5, ry], name, { size: 1.6, baseline: 'middle' });
    if (kind) val(p, x + 62, ry, kind, value, { size: 1.7, bold: true });
    else p.text([x + 62 + 4.4, ry], value, { size: 1.7, baseline: 'middle', weight: 'bold' });
  });
  p.text(
    [x, y + 28],
    cat('Δp = ', nf(RHO, 0), ' × ', nf(WAVE_SPEED.steel, 0), ' × ', nf(m.closingVelocity, 2), ' = '),
    { size: 1.9, mono: true, baseline: 'middle' },
  );
  val(p, x + 50, y + 28, 'M', cat(nf(st.surgeBar, 1), ' bar'), { size: 2.2, bold: true });
  // what it must reach to open the check valve
  p.line([x, y + 33], [x + w - 6, y + 33], { w: W.thin, color: '#cfc8b8' });
  const g = (G * RHO) / 1e5;
  p.text(
    [x, y + 38.5],
    l(
      'Pour ouvrir le clapet anti-retour, il faut atteindre la pression de refoulement :',
      'To open the check valve it must reach the delivery pressure:',
    ),
    { size: 1.6, baseline: 'middle' },
  );
  p.text(
    [x, y + 44],
    cat('ρ·g·(H − h) = ', nf(g, 3), ' × (', nf(SITE.deliveryHead, 0), ' − ', nf(SITE.fall, 1), ') = '),
    { size: 1.7, mono: true, baseline: 'middle' },
  );
  val(p, x + 62, y + 44, 'D', cat(nf(st.surgeNeededBar, 1), ' bar'), { size: 1.9, bold: true });
  p.text(
    [x, y + 50],
    cat(
      nf(st.surgeBar, 1),
      ' > ',
      nf(st.surgeNeededBar, 1),
      l(
        ' bar : il s’ouvre ; la pression du corps est alors tenue à ',
        ' bar: it opens; the body pressure is then held at ',
      ),
    ),
    { size: 1.6, baseline: 'middle' },
  );
  val(
    p,
    x,
    y + 54.6,
    'M',
    cat(nf(m.peakPressure, 1), l(' bar au pic, mesuré sur la trace', ' bar at the peak, read on the trace')),
    { size: 1.6, bold: true },
  );
  p.line([x, y + 59.4], [x + w - 6, y + 59.4], { w: W.thin, color: '#cfc8b8' });
  p.text(
    [x, y + 64.4],
    l('Vitesse minimale qui suffit : v = g·(H − h)/a', 'Smallest velocity that is enough: v = g·(H − h)/a'),
    { size: 1.6, baseline: 'middle' },
  );
  val(p, x, y + 69.2, 'D', cat(nf(st.minClosingVelocity, 2), ' m/s'), { size: 1.9, bold: true });
  p.text(
    [x + 24, y + 69.2],
    cat(
      l('(vidéo K15 : 0,5–0,65 m/s) ; le modèle ferme à ', '(video K15: 0.5–0.65 m/s); the model closes at '),
      nf(st.closingVelocity, 2),
    ),
    { size: 1.5, color: INK_2, baseline: 'middle' },
  );
  p.line([x, y + 73.8], [x + w - 6, y + 73.8], { w: W.thin, color: '#cfc8b8' });
  const a2 = WAVE_SPEED.pvc;
  p.text([x, y + 78.6], l('Même vitesse, conduite motrice en PVC :', 'Same velocity, PVC drive pipe:'), {
    size: 1.6,
    baseline: 'middle',
  });
  p.text(
    [x, y + 83.4],
    cat(
      'a = ',
      nf(a2, 0),
      ' m/s → Δp = ',
      nf(surgeBar(m.closingVelocity, a2), 1),
      ' < ',
      nf(st.surgeNeededBar, 1),
      ' bar',
    ),
    { size: 1.7, mono: true, baseline: 'middle' },
  );
  chipLine(
    p,
    x,
    y + 88.2,
    l(
      'rien n’est refoulé : voir le scénario « tuyau plastique »',
      'nothing is delivered: see the “plastic pipe” scenario',
    ),
  );
  p.line([x, y + 92.6], [x + w - 6, y + 92.6], { w: W.thin, color: '#cfc8b8' });
  p.text([x, y + 97.2], l('Règle : chaque m/s d’eau stoppé ajoute', 'Rule: every m/s of water stopped adds'), {
    size: 1.6,
    baseline: 'middle',
  });
  val(
    p,
    x,
    y + 102,
    'D',
    cat(
      'ρ·a = ',
      nf((RHO * WAVE_SPEED.steel) / 1e5, 1),
      l(' bar par m/s (a = ', ' bar per m/s (a = '),
      nf(WAVE_SPEED.steel, 0),
      ' m/s)',
    ),
    { size: 1.8, bold: true },
  );
}

function chipLine(p: View, x: number, y: number, text: L): void {
  val(p, x, y, 'E', cat(tr(l('a = 500 m/s : hypothèse ; ', 'a = 500 m/s: assumption; ')), tr(text)), {
    size: 1.5,
    color: INK_2,
  });
}

export const cycleDiagram: DrawingSheet = {
  id: 'cycle-diagram',
  number: 'RP-D08',
  group: 'hydraulic',
  title: l('Le cycle du bélier en quatre temps', 'The four-beat cycle of the ram'),
  description: l(
    'Un coup de bélier dure environ une demi-seconde : accélération, fermeture, refoulement, recul. En haut, la position du clapet de choc et du clapet anti-retour à chaque temps ; en dessous, la pression et la vitesse d’un coup complet, calculées par le modèle pour le clapet n°1 de la vidéo, avec les quatre temps marqués sur l’axe du temps et les instants choisis repérés par des points numérotés. À droite, la formule de Joukowsky Δp = ρ·a·v écrite avec les valeurs du modèle.',
    'A ram stroke lasts about half a second: acceleration, closing, delivery, recoil. At the top, the position of the waste valve and of the check valve in each beat; below, the pressure and the velocity of one whole stroke, computed by the model for the video’s n°1 valve, with the four beats marked on the time axis and the chosen instants shown by numbered dots. On the right, Joukowsky’s formula Δp = ρ·a·v written with the model’s values.',
  ),
  scene: 'ram',
  parts: ['waste-valve', 'delivery-valve', 'air-chamber', 'snifter', 'ram'],
  render(): Drawing {
    const d = new Drawing();
    d.frame({
      title: l('Le cycle du bélier en quatre temps', 'The four-beat cycle of the ram'),
      subtitle: l(
        'Pression et vitesse d’un coup complet — clapet n°1, site de la vidéo',
        'Pressure and velocity of one whole stroke — n°1 valve, the video’s site',
      ),
      number: 'RP-D08',
      scale: tr(l('sans échelle', 'not to scale')),
    });
    const p = d.paper();
    const t = stroke1();
    const ins = instants(t);
    panels(p, t, ins);
    traces(p, t, ins);
    hammer(p);
    kindKey(p, 14, 266);
    para(
      p,
      14,
      249,
      200,
      l(
        'Les points numérotés sont les instants figés par la simulation (écran « cycle pas à pas ») ; p, v et le clapet sont lus sur la trace à ces instants.',
        'The numbered dots are the instants the simulation freezes (the “cycle step by step” panel); p, v and the valve are read on the trace at those instants.',
      ),
      1.7,
      INK_2,
    );
    return d;
  },
};
