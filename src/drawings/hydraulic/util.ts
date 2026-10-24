import { l, tr, type L } from '@onigam/lab-kit/i18n';
import { COLORS, INK, INK_2, W, type Pt, type Text, type View } from '@onigam/lab-kit/drawings';

// Helpers shared by the seven hydraulic and site sheets (RP-D07 … RP-D13): bilingual numbers and text, wrapped notes,
// the provenance chips that tell a reported figure from a model result, and the small annotations the kit lacks
// (arrow lines, level marks, break marks). Everything is drawn in paper space (millimetres on the A3 sheet).

// ------------------------------------------------------------------------------------------------ text

/** Join strings and bilingual values into one bilingual value. */
export function cat(...parts: (string | L)[]): L {
  const pick = (k: 'fr' | 'en') => parts.map((p) => (typeof p === 'string' ? p : p[k])).join('');
  return { fr: pick('fr'), en: pick('en') };
}

/** A number with `dec` decimals: decimal comma and narrow no-break space between thousands in French. */
export function nf(v: number, dec = 1): L {
  const [i = '0', f] = Math.abs(v).toFixed(dec).split('.');
  const sign = v < 0 && Number(v.toFixed(dec)) !== 0 ? '−' : '';
  const group = (sep: string) => i.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return { fr: sign + group(' ') + (f ? ',' + f : ''), en: sign + group(',') + (f ? '.' + f : '') };
}

/** Same as `nf` but a plain string in the language being drawn (for labels built by hand). */
export const ns = (v: number, dec = 1): string => tr(nf(v, dec));

/** Rough width of a text (paper mm) for a cap height: the kit cannot measure detached SVG text. Deliberately generous. */
export const textW = (s: string, size: number): number => s.length * size * 0.76;

/** Break a string into lines of at most `maxChars` characters (words are never cut). */
export function wrap(s: string, maxChars: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of s.split(' ')) {
    if (line && (line + ' ' + word).length > maxChars) {
      out.push(line);
      line = word;
    } else line = line ? line + ' ' + word : word;
  }
  if (line) out.push(line);
  return out;
}

/** Wrapped paragraph. Returns the y after the last line. */
export function para(
  p: View,
  x: number,
  y: number,
  width: number,
  text: Text,
  size = 1.9,
  color: string = INK,
  o: { weight?: 'normal' | 'bold'; italic?: boolean } = {},
): number {
  const lines = wrap(tr(text), Math.max(8, Math.floor(width / (size * 0.76))));
  lines.forEach((ln, k) => p.text([x, y + k * size * 1.5], ln, { size, color, weight: o.weight, italic: o.italic }));
  return y + lines.length * size * 1.5;
}

/** Numbered notes wrapped to a width. Returns the y after the last line. */
export function notes(
  p: View,
  x: number,
  y: number,
  width: number,
  title: Text | null,
  items: Text[],
  size = 1.9,
  start = 1,
): number {
  if (title) p.text([x, y], title, { size: 2.3, weight: 'bold' });
  let cy = title ? y + size * 2.4 : y;
  const lh = size * 1.5;
  const maxChars = Math.floor((width - 4.5) / (size * 0.76));
  items.forEach((it, i) => {
    const lines = wrap(tr(it), maxChars);
    p.text([x, cy], `${i + start}.`, { size, weight: 'bold' });
    lines.forEach((ln, k) => p.text([x + 4.5, cy + k * lh], ln, { size }));
    cy += lines.length * lh + size * 0.5;
  });
  return cy;
}

// ------------------------------------------------------------------------------------------------ provenance chips

/**
 * Where a number comes from. The same five tags as the part sheets (src/data/part-helpers.ts), as a letter in a small disc:
 * R reported (video S1 or a source table), D derived (computed from reported figures), M model result (RamSim, sizing.ts),
 * C calibrated (a model setting chosen to retrieve the video), E estimate or assumption (dims.ts, physics.md).
 */
export type Kind = 'R' | 'D' | 'M' | 'C' | 'E';

export const KIND_NAME: Record<Kind, L> = {
  R: l('rapporté (vidéo S1, tableau S4)', 'reported (video S1, table S4)'),
  D: l('dérivé (calcul)', 'derived (computed)'),
  M: l('résultat du modèle', 'model result'),
  C: l('calibré sur la vidéo', 'calibrated on the video'),
  E: l('estimation ou hypothèse', 'estimate or assumption'),
};

/** Colour of the figures of each kind (text colour); reported figures stay in ink. */
export const KIND_COLOR: Record<Kind, string> = {
  R: INK,
  D: INK_2,
  M: COLORS.water,
  C: COLORS.copper,
  E: COLORS.signal,
};

const CHIP_R = 1.55;

/** A provenance chip centred at `at`. */
export function chip(p: View, at: Pt, kind: Kind, scale = 1): void {
  const r = CHIP_R * scale;
  const filled = kind === 'M' || kind === 'C';
  const c = KIND_COLOR[kind];
  p.circle(at, r, {
    w: kind === 'R' ? W.medium : W.thin,
    color: c,
    fill: filled ? c : COLORS.paper,
    dash: kind === 'E' ? [0.5, 0.35] : undefined,
  });
  p.text(at, kind, {
    size: 1.5 * scale,
    weight: 'bold',
    anchor: 'middle',
    baseline: 'middle',
    color: filled ? '#ffffff' : c,
  });
}

/** A value with its chip in front of it, left aligned at x: `[M] 6,7 L/min`. Returns the x after the text (estimated). */
export function val(
  p: View,
  x: number,
  y: number,
  kind: Kind,
  text: Text,
  o: { size?: number; bold?: boolean; color?: string } = {},
): number {
  const size = o.size ?? 1.9;
  chip(p, [x + CHIP_R, y], kind);
  p.text([x + 2 * CHIP_R + 1.1, y], text, {
    size,
    baseline: 'middle',
    weight: o.bold ? 'bold' : 'normal',
    color: o.color ?? KIND_COLOR[kind],
  });
  return x + 2 * CHIP_R + 1.1 + textW(tr(text), size);
}

/**
 * A value with its chip drawn along a line at `angle` (degrees, counter-clockwise), centred on `at`: the chip, then the text.
 * Used for the dimensions of slanted or vertical pipes.
 */
export function rotVal(
  p: View,
  at: Pt,
  angle: number,
  kind: Kind,
  text: Text,
  o: { size?: number; bold?: boolean; color?: string; dy?: number } = {},
): void {
  const size = o.size ?? 2.1;
  const w = 2 * CHIP_R + 1.1 + textW(tr(text), size) * 0.92;
  const g = p.group(at, angle);
  chip(g, [-w / 2 + CHIP_R, o.dy ?? -2.4], kind);
  g.text([-w / 2 + 2 * CHIP_R + 1.1, o.dy ?? -2.4], text, {
    size,
    baseline: 'middle',
    weight: o.bold === false ? 'normal' : 'bold',
    color: o.color ?? KIND_COLOR[kind],
    halo: true,
  });
}

/** A table in paper space with its own text size (the kit's `Drawing.table` is fixed at 2 mm): header row, ruled rows, one row tinted. */
export function gridTable(
  p: View,
  x: number,
  y: number,
  cols: { label: Text; w: number; align?: 'start' | 'middle' | 'end'; mono?: boolean }[],
  rows: Text[][],
  o: { rowH?: number; size?: number; headSize?: number; tint?: number; tintFill?: string } = {},
): number {
  const rowH = o.rowH ?? 7;
  const size = o.size ?? 2;
  const total = cols.reduce((a, c) => a + c.w, 0);
  const h = rowH * (rows.length + 1);
  if (o.tint !== undefined)
    p.rect([x, y + rowH * (o.tint + 1)], [x + total, y + rowH * (o.tint + 2)], { w: 0, fill: o.tintFill ?? '#efe6d3' });
  p.rect([x, y], [x + total, y + rowH], { w: 0, fill: '#efe6d3' });
  p.rect([x, y], [x + total, y + h], { w: W.medium });
  let cx = x;
  cols.forEach((c, i) => {
    if (i) p.line([cx, y], [cx, y + h], { w: W.thin });
    const align = c.align ?? 'start';
    const tx = align === 'start' ? cx + 2 : align === 'end' ? cx + c.w - 2 : cx + c.w / 2;
    if (tr(c.label) !== '')
      p.text([tx, y + rowH / 2], c.label, {
        size: o.headSize ?? size * 0.92,
        weight: 'bold',
        baseline: 'middle',
        anchor: align,
      });
    cx += c.w;
  });
  rows.forEach((r, ri) => {
    const ry = y + rowH * (ri + 1);
    p.line([x, ry], [x + total, ry], { w: W.thin });
    let rx = x;
    r.forEach((v, ci) => {
      const c = cols[ci] as { w: number; align?: 'start' | 'middle' | 'end'; mono?: boolean };
      const align = c.align ?? 'start';
      const tx = align === 'start' ? rx + 2 : align === 'end' ? rx + c.w - 2 : rx + c.w / 2;
      if (tr(v) !== '') p.text([tx, ry + rowH / 2], v, { size, baseline: 'middle', anchor: align, mono: c.mono });
      rx += c.w;
    });
  });
  return h;
}

/** The key to the chips: one row (or column) of `R D M C E` with their meaning. Returns the y after it. */
export function kindKey(
  p: View,
  x: number,
  y: number,
  o: { column?: boolean; kinds?: Kind[]; width?: number } = {},
): number {
  const kinds = o.kinds ?? (['R', 'D', 'M', 'C', 'E'] as Kind[]);
  p.text([x, y], l('ORIGINE DES VALEURS', 'ORIGIN OF THE VALUES'), { size: 2.1, weight: 'bold' });
  if (o.column) {
    kinds.forEach((k, i) => {
      const cy = y + 5.2 + i * 4.4;
      chip(p, [x + 1.7, cy], k);
      p.text([x + 5, cy], KIND_NAME[k], { size: 1.8, baseline: 'middle' });
    });
    return y + 5.2 + kinds.length * 4.4;
  }
  let cx = x;
  kinds.forEach((k) => {
    chip(p, [cx + 1.7, y + 5], k);
    const t = KIND_NAME[k];
    p.text([cx + 5, y + 5], t, { size: 1.8, baseline: 'middle' });
    cx += 7 + Math.max(textW(t.fr, 1.8), textW(t.en, 1.8));
  });
  return y + 8;
}

// ------------------------------------------------------------------------------------------------ annotations

/** Line with an arrowhead at the end (and at the start when `both`). */
export function arrowLine(v: View, a: Pt, b: Pt, color: string = INK, w: number = W.thin, both = false): SVGElement {
  const e = v.line(a, b, { w, color });
  e.setAttribute('marker-end', 'url(#arrow)');
  if (both) e.setAttribute('marker-start', 'url(#arrow)');
  return e;
}

/** Filled flow arrow on a line, pointing along `angle` (degrees, counter-clockwise, 0 = right). */
export function flowArrow(p: View, at: Pt, angle = 0, color: string = COLORS.water, s = 1): void {
  p.group(at, angle, s).polyline(
    [
      [2, 0],
      [-1.4, -1.4],
      [-1.4, 1.4],
    ],
    { closed: true, w: 0, fill: color },
  );
}

/** Level mark (triangle on a small line) with its label; `water` adds the free-surface ticks. */
export function levelMark(
  p: View,
  at: Pt,
  label: Text,
  o: { water?: boolean; color?: string; left?: boolean; size?: number; bold?: boolean } = {},
): void {
  const [x, y] = at;
  const c = o.color ?? INK;
  p.polyline(
    [
      [x - 1.5, y - 2.4],
      [x + 1.5, y - 2.4],
      [x, y],
    ],
    { closed: true, w: W.thin, color: c, fill: COLORS.paper },
  );
  if (o.water) {
    p.line([x - 2.2, y + 0.9], [x + 2.2, y + 0.9], { w: W.thin, color: COLORS.water });
    p.line([x - 1.2, y + 1.8], [x + 1.2, y + 1.8], { w: W.thin, color: COLORS.water });
  }
  if (tr(label) !== '')
    p.text([x + (o.left ? -2.4 : 2.4), y - 1.4], label, {
      size: o.size ?? 2,
      anchor: o.left ? 'end' : 'start',
      color: c,
      halo: true,
      weight: o.bold ? 'bold' : 'normal',
    });
}

/** Break mark across a line drawn at `angle` (degrees, counter-clockwise): masks the line and draws two slashes. */
export function breakMark(p: View, at: Pt, angle = 0, color: string = INK): void {
  const g = p.group(at, angle);
  g.rect([-1.6, -3.2], [1.6, 3.2], { w: 0, fill: COLORS.paper });
  g.line([-2.2, 3], [-0.6, -3], { w: W.medium, color });
  g.line([0.6, 3], [2.2, -3], { w: W.medium, color });
}

/** Bold tag over up to two description lines, anchored at `at`. */
export function tag(
  p: View,
  at: Pt,
  id: string,
  lines: Text[],
  o: { color?: string; anchor?: 'start' | 'middle' | 'end'; size?: number } = {},
): void {
  const anchor = o.anchor ?? 'middle';
  const s = o.size ?? 1.75;
  p.text(at, id, { size: s + 0.35, weight: 'bold', anchor, color: o.color, halo: true });
  lines.forEach((t, i) =>
    p.text([at[0], at[1] + 3.1 * (i + 1)], t, { size: s, anchor, color: o.color ?? INK_2, halo: true }),
  );
}

/** Numbered balloon (circle with a number or letter) at `at`. */
export function balloon(p: View, at: Pt, label: string, r = 2.7, color: string = INK): void {
  p.circle(at, r, { w: W.thin, color, fill: COLORS.paper });
  p.text(at, label, { size: r > 2.5 ? 2.2 : 1.8, weight: 'bold', anchor: 'middle', baseline: 'middle', color });
}
