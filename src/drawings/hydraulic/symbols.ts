import { COLORS, INK, INK_2, W, type Pt, type View } from '@onigam/lab-kit/drawings';

// Hydraulic symbols of the diagrams (RP-D07, RP-D08, RP-D13), in the spirit of ISO 10628 / ISA S5.1 and simplified like
// Pelton Lab's P&ID. Each one is drawn in paper space in a small group (local origin = its connection point or centre,
// y pointing down), so it can be rotated and scaled. Positions are paper millimetres.

export interface SymOpts {
  /** Rotation in degrees, counter-clockwise on the sheet. */
  rot?: number;
  scale?: number;
  color?: string;
}

const PAPER = COLORS.paper;

/** Ball valve: bow-tie with a ball (filled = normally closed) and a quarter-turn lever. */
export function ballValve(p: View, at: Pt, o: SymOpts & { closed?: boolean; lever?: boolean } = {}): void {
  const g = p.group(at, o.rot ?? 0, o.scale ?? 1);
  const c = o.color ?? INK;
  const fill = o.closed ? c : PAPER;
  g.polyline(
    [
      [-3.8, -2.4],
      [0, 0],
      [-3.8, 2.4],
    ],
    { closed: true, w: W.medium, color: c, fill },
  );
  g.polyline(
    [
      [3.8, -2.4],
      [0, 0],
      [3.8, 2.4],
    ],
    { closed: true, w: W.medium, color: c, fill },
  );
  g.circle([0, 0], 1.1, { w: W.thin, color: c, fill: o.closed ? c : PAPER });
  if (o.lever !== false) {
    g.line([0, -1.1], [0, -4.2], { w: W.thin, color: c });
    g.line([0, -4.2], [3.8, -4.2], { w: 0.65, color: c });
  }
}

/** Gate valve: bow-tie with a rising stem and a hand wheel. */
export function gateValve(p: View, at: Pt, o: SymOpts & { closed?: boolean } = {}): void {
  const g = p.group(at, o.rot ?? 0, o.scale ?? 1);
  const c = o.color ?? INK;
  const fill = o.closed ? c : PAPER;
  g.polyline(
    [
      [-3.8, -2.6],
      [0, 0],
      [-3.8, 2.6],
    ],
    { closed: true, w: W.medium, color: c, fill },
  );
  g.polyline(
    [
      [3.8, -2.6],
      [0, 0],
      [3.8, 2.6],
    ],
    { closed: true, w: W.medium, color: c, fill },
  );
  g.line([0, 0], [0, -5.2], { w: W.thin, color: c });
  g.line([-2.8, -5.2], [2.8, -5.2], { w: 0.65, color: c });
  g.line([-2.8, -4.5], [-2.8, -5.9], { w: W.thin, color: c });
  g.line([2.8, -4.5], [2.8, -5.9], { w: W.thin, color: c });
}

/** Non-return (check) valve: triangle against a bar, flow from left to right in local axes. */
export function checkValve(p: View, at: Pt, o: SymOpts & { open?: boolean } = {}): void {
  const g = p.group(at, o.rot ?? 0, o.scale ?? 1);
  const c = o.color ?? INK;
  g.circle([0, 0], 3.3, { w: W.medium, color: c, fill: PAPER });
  g.polyline(
    [
      [-1.8, -1.8],
      [1.4, 0],
      [-1.8, 1.8],
    ],
    { closed: true, w: W.thin, color: c, fill: o.open ? PAPER : c },
  );
  g.line([1.6, -2], [1.6, 2], { w: W.medium, color: c });
}

/** Strainer: box with its screen drawn dashed. */
export function strainer(p: View, at: Pt, o: SymOpts = {}): void {
  const g = p.group(at, o.rot ?? 0, o.scale ?? 1);
  const c = o.color ?? INK;
  g.rect([-3, -2.4], [3, 2.4], { w: W.medium, color: c, fill: PAPER });
  g.line([-3, 2.4], [3, -2.4], { w: W.thin, color: c, dash: [0.8, 0.6] });
}

/** Instrument bubble (field mounted, ISA): function letters over the loop number. */
export function instrument(p: View, at: Pt, letters: string, num: string, color: string = INK, r = 3.6): void {
  p.circle(at, r, { w: W.medium, color, fill: PAPER });
  p.text([at[0], at[1] - (num ? 1 : 0)], letters, {
    size: 1.9,
    weight: 'bold',
    anchor: 'middle',
    baseline: 'middle',
    color,
  });
  if (num) p.text([at[0], at[1] + 1.7], num, { size: 1.5, anchor: 'middle', baseline: 'middle', color, mono: true });
}

/**
 * The self-acting waste valve of the ram (the "clapet de choc"): a flow channel from the body, a seat, a poppet hanging
 * under the seat on a stem that goes up through a guide to a counterweight, exhaust ports in the housing above the seat.
 * `at` is the connection on the body (bottom of the channel). `lift` 0 = poppet on its seat (shut), 1 = lowered on the stroke
 * nut (open); `open` is the same as lift 1. `jets` draws the water leaving by the ports (default when open), or `'air'` the air
 * going in during the recoil.
 */
export function wasteValve(
  p: View,
  at: Pt,
  o: SymOpts & { open?: boolean; lift?: number; jets?: boolean | 'air' } = {},
): void {
  const g = p.group(at, o.rot ?? 0, o.scale ?? 1);
  const c = o.color ?? INK;
  const lift = o.lift ?? (o.open ? 1 : 0);
  const d = 2.2 * lift;
  // channel from the body to the seat, with the water in it
  g.rect([-2.7, 0], [2.7, -7], { w: 0, fill: COLORS.waterFill });
  g.line([-3, 0], [-3, -7], { w: W.medium, color: c });
  g.line([3, 0], [3, -7], { w: W.medium, color: c });
  // housing above the seat with two exhaust ports (gaps in the walls)
  g.polyline(
    [
      [-3, -7],
      [-3, -8.4],
    ],
    { w: W.medium, color: c },
  );
  g.polyline(
    [
      [-3, -10.6],
      [-3, -13],
      [3, -13],
      [3, -10.6],
    ],
    { w: W.medium, color: c },
  );
  g.polyline(
    [
      [3, -7],
      [3, -8.4],
    ],
    { w: W.medium, color: c },
  );
  // seat (two lips) and poppet
  g.line([-3, -7], [-1.1, -7], { w: W.thick, color: c });
  g.line([3, -7], [1.1, -7], { w: W.thick, color: c });
  g.polyline(
    [
      [-2.2, -6.4 + d],
      [2.2, -6.4 + d],
      [1.2, -7.1 + d],
      [-1.2, -7.1 + d],
    ],
    { closed: true, w: W.medium, color: c, fill: c },
  );
  // stem, guide, stroke nut and counterweight
  g.line([0, -6.4 + d], [0, -18], { w: W.medium, color: c });
  g.rect([-1.3, -13], [1.3, -14.4], { w: W.thin, color: c, fill: PAPER });
  g.rect([-2.5, -19.8], [2.5, -15.8], { w: W.medium, color: c, fill: c });
  const jets = o.jets ?? lift > 0.6;
  if (jets) {
    const air = jets === 'air';
    for (const s of [-1, 1]) {
      const a: Pt = air ? [s * 8.4, -9.5 + 0.6] : [s * 3.4, -9.5];
      const b: Pt = air ? [s * 3.4, -9.5] : [s * 8.4, -9.5 + 0.6];
      const e = g.line(a, b, { w: W.thin, color: air ? INK_2 : COLORS.water, dash: air ? [0.8, 0.5] : undefined });
      e.setAttribute('marker-end', 'url(#arrow)');
    }
  }
}

/** Air chamber: a vessel with its air cushion (bubbles) over the water; `at` = connection at the bottom centre. */
export function airChamber(p: View, at: Pt, o: SymOpts & { w?: number; h?: number; air?: number } = {}): void {
  const g = p.group(at, o.rot ?? 0, o.scale ?? 1);
  const c = o.color ?? INK;
  const w = o.w ?? 14;
  const h = o.h ?? 30;
  const air = o.air ?? 0.55;
  const waterTop = -h * (1 - air);
  g.roundRect([-w / 2, -h], [w / 2, 0], 3, { w: 0, fill: PAPER });
  g.rect([-w / 2 + 0.2, waterTop], [w / 2 - 0.2, -0.2], { w: 0, fill: COLORS.waterFill });
  g.roundRect([-w / 2, -h], [w / 2, 0], 3, { w: W.thick, color: c });
  g.line([-w / 2, waterTop], [w / 2, waterTop], { w: W.thin, color: COLORS.water });
  for (const [x, y, r] of [
    [-w * 0.2, -h * 0.82, 0.8],
    [w * 0.18, -h * 0.7, 0.6],
    [-w * 0.05, -h * 0.58, 0.9],
    [w * 0.25, waterTop - 1.6, 0.5],
  ] as const)
    g.circle([x, y], r, { w: W.thin, color: c });
}

/** House: a gable-roofed box with a door and a tap; `at` = middle of the base. */
export function houseSymbol(p: View, at: Pt, w = 22, h = 11): void {
  const g = p.group(at);
  g.polyline(
    [
      [-w / 2, 0],
      [-w / 2, -h],
      [0, -h - 6],
      [w / 2, -h],
      [w / 2, 0],
    ],
    { closed: true, w: W.medium, fill: PAPER },
  );
  g.rect([-2, 0], [2, -6.4], { w: W.thin });
  g.rect([-w / 2 + 2.5, -h + 3], [-w / 2 + 6.5, -h + 7], { w: W.thin });
  g.rect([w / 2 - 6.5, -h + 3], [w / 2 - 2.5, -h + 7], { w: W.thin });
}
