// Drawing helpers shared by the six mechanical sheets: text wrapping, notes, tables, balloons, silhouettes of revolved
// parts, hexagonal nuts, thread symbols, the legend of the dimension marks. Everything draws through the kit's View.
import { COLORS, INK_2, W, type Drawing, type Pt, type Stroke, type Text, type View } from '@onigam/lab-kit/drawings';
import { l, tr, type L } from '@onigam/lab-kit/i18n';
import { PARTS } from '../../data/parts';
import { partIds } from '../../part-ids';
import { corner } from './geom';

export const PAPER = COLORS.paper;
export const HEAD_FILL = '#efe6d3';
export const WATER = COLORS.water;
export const WATER_FILL = COLORS.waterFill;
/** Open pose of the waste valve and anything that moves. */
export const MOVING = COLORS.copper;

export const thin = (fill: string = PAPER): Stroke => ({ w: W.thin, fill });
export const med = (fill: string = PAPER): Stroke => ({ w: W.medium, fill });
export const thick = (fill: string = PAPER): Stroke => ({ w: W.thick, fill });
export const hatched = (hatch: NonNullable<Stroke['hatch']>, w: number = W.medium): Stroke => ({
  w,
  hatch,
  fill: PAPER,
});

// ------------------------------------------------------------------------------------------------ items and the catalogue

/** Item numbers of the bill of materials (D06): the 13 parts of the `ram` world, then the 14 of the `valve` world. */
export const ITEM: Record<string, number> = {};
[...partIds('ram'), ...partIds('valve')].forEach((id, i) => {
  ITEM[id] = i + 1;
});

export const partOf = (id: string) => {
  const p = PARTS.find((x) => x.id === id);
  if (!p) throw new Error(`unknown part ${id}`);
  return p;
};

// ------------------------------------------------------------------------------------------------ text

/** Width estimate of a text of the given cap height, in paper mm (a little pessimistic: sheets must not overflow). */
export function estW(s: string, size: number, mono = false, bold = false): number {
  return s.length * size * (mono ? 0.86 : bold ? 0.82 : 0.74);
}

/** Greedy word wrap into lines no wider than `maxW`; no break after a number, before a unit or before French punctuation. */
export function wrap(s: string, maxW: number, size: number, mono = false, bold = false): string[] {
  const glued = s
    .replace(/(\d) (?=[A-Za-zΩ°%µ€×]|\d{3}\b)/g, '$1 ')
    .replace(/([±≈≤≥<>=×→]) (?=[\dA-Za-z])/g, '$1 ')
    .replace(/ ([:;!?»])/g, ' $1')
    .replace(/« /g, '« ');
  const out: string[] = [];
  for (const par of glued.split('\n')) {
    let line = '';
    for (const word of par.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (line && estW(next, size, mono, bold) > maxW) {
        out.push(line);
        line = word;
      } else line = next;
    }
    out.push(line);
  }
  return out;
}

/** Shorten with an ellipsis to fit on one line. */
export function fit(s: string, maxW: number, size: number, mono = false): string {
  if (estW(s, size, mono) <= maxW) return s;
  let out = s;
  while (out.length > 1 && estW(`${out}…`, size, mono) > maxW) out = out.slice(0, -1);
  return `${out.trimEnd()}…`;
}

export interface ParaOpts {
  size?: number;
  lineH?: number;
  color?: string;
  bold?: boolean;
  mono?: boolean;
  italic?: boolean;
  bullet?: string;
  anchor?: 'start' | 'middle' | 'end';
}

/** Wrapped paragraph in paper space. Returns the y below it. */
export function note(d: Drawing, x: number, y: number, w: number, text: Text, o: ParaOpts = {}): number {
  const size = o.size ?? 1.9;
  const lh = o.lineH ?? size * 1.62;
  const indent = o.bullet ? size * 2.2 : 0;
  const lines = wrap(tr(text), w - indent, size, o.mono, o.bold);
  const p = d.paper();
  if (o.bullet) p.text([x, y], o.bullet, { size, baseline: 'top', weight: 'bold', color: o.color });
  lines.forEach((ln, i) =>
    p.text([x + indent, y + i * lh], ln, {
      size,
      baseline: 'top',
      color: o.color,
      weight: o.bold ? 'bold' : 'normal',
      mono: o.mono,
      italic: o.italic,
    }),
  );
  return y + lines.length * lh + size * 0.55;
}

/** A small bold heading in paper space (a view or a block title). Returns the y below it. */
export function heading(
  d: Drawing,
  x: number,
  y: number,
  text: Text,
  o: { size?: number; color?: string } = {},
): number {
  const size = o.size ?? 2.3;
  d.paper().text([x, y], text, { size, weight: 'bold', baseline: 'top', color: o.color });
  return y + size * 1.9;
}

// ------------------------------------------------------------------------------------------------ tables

export interface Cell {
  t: Text;
  bold?: boolean;
  mono?: boolean;
  color?: string;
}
export interface Col {
  label: Text;
  w: number;
  align?: 'start' | 'middle' | 'end';
  mono?: boolean;
}

/** Table with word-wrapped cells. Returns its height. */
export function grid(
  d: Drawing,
  x: number,
  y: number,
  cols: Col[],
  rows: (Cell | Text)[][],
  o: { size?: number; pad?: number; lineH?: number; fills?: (string | undefined)[] } = {},
): number {
  const p = d.paper();
  const size = o.size ?? 1.9;
  const lh = o.lineH ?? size * 1.55;
  const pad = o.pad ?? 0.9;
  const total = cols.reduce((a, c) => a + c.w, 0);
  const cell = (c: Cell | Text): Cell =>
    typeof c === 'string' || 'fr' in (c as object) ? { t: c as Text } : (c as Cell);
  const lay = (t: Text, c: Col, ce: Cell, sz: number) => wrap(tr(t), c.w - 2.8, sz, ce.mono ?? c.mono, ce.bold);
  const headLines = cols.map((c) => lay(c.label, c, { t: c.label, bold: true }, size));
  const headH = Math.max(...headLines.map((x) => x.length)) * lh + pad * 2;
  const body = rows.map((r) => r.map((c, i) => ({ ce: cell(c), lines: lay(cell(c).t, cols[i]!, cell(c), size) })));
  const heights = body.map((r) => Math.max(...r.map((c) => c.lines.length)) * lh + pad * 2);
  const h = headH + heights.reduce((a, b) => a + b, 0);
  p.rect([x, y], [x + total, y + h], { w: W.medium, fill: PAPER });
  p.rect([x, y], [x + total, y + headH], { w: W.thin, fill: HEAD_FILL });
  const put = (lines: string[], cx: number, cy: number, c: Col, ce: Cell) => {
    const align = c.align ?? 'start';
    const tx = align === 'start' ? cx + 1.3 : align === 'end' ? cx + c.w - 1.3 : cx + c.w / 2;
    lines.forEach((ln, i) =>
      p.text([tx, cy + pad + i * lh + lh * 0.1], ln, {
        size,
        anchor: align,
        baseline: 'top',
        mono: ce.mono ?? c.mono,
        weight: ce.bold ? 'bold' : 'normal',
        color: ce.color,
      }),
    );
  };
  let cx = x;
  cols.forEach((c, i) => {
    if (i) p.line([cx, y], [cx, y + h], { w: W.thin });
    put(headLines[i]!, cx, y, c, { t: c.label, bold: true });
    cx += c.w;
  });
  let ry = y + headH;
  body.forEach((r, ri) => {
    const fill = o.fills?.[ri];
    if (fill) p.rect([x + 0.2, ry], [x + total - 0.2, ry + heights[ri]!], { w: 0, color: fill, fill, opacity: 0.6 });
    p.line([x, ry], [x + total, ry], { w: W.thin });
    let rx = x;
    r.forEach((c, ci) => {
      put(c.lines, rx, ry, cols[ci]!, c.ce);
      rx += cols[ci]!.w;
    });
    ry += heights[ri]!;
  });
  return h;
}

// ------------------------------------------------------------------------------------------------ balloons and legends

/** Balloon (item number) at paper position (bx, by), leader to the model point `at` of view `v`. */
export function balloon(v: View, at: Pt, bx: number, by: number, n: number | string): void {
  const [qx, qy] = v.map(at);
  v.leader(at, bx - qx, by - qy, String(n), { balloon: true });
}

/** Item balloons of a list of [model point, paper x, paper y, item]. */
export function balloons(v: View, list: [Pt, number, number, number | string][]): void {
  for (const [at, bx, by, n] of list) balloon(v, at, bx, by, n);
}

/** One extra row of a legend: a symbol drawn in paper space at (x, y) and its text. */
export interface LegendRow {
  sym: (p: View, x: number, y: number) => void;
  text: Text;
}

/** The legend of the marks that follow the dimensions (reported, derived, estimate), plus extra rows. Returns the y below it. */
export function marksLegend(d: Drawing, x: number, y: number, w: number, extra: LegendRow[] = []): number {
  const p = d.paper();
  const mark =
    (m: string): LegendRow['sym'] =>
    (q, sx, sy) =>
      q.text([sx, sy], m, { size: 1.8, baseline: 'middle', mono: true, weight: 'bold' });
  const rows: LegendRow[] = [
    { sym: mark('123'), text: l('donnée par une source (la vidéo)', 'given by a source (the video)') },
    {
      sym: mark('123†'),
      text: l('dérivée de chiffres de la source seulement', 'derived from the source’s figures only'),
    },
    {
      sym: mark('123*'),
      text: l('estimée, calibrée ou dérivée d’une estimation', 'estimated, calibrated or derived from an estimate'),
    },
    ...extra,
  ];
  const lh = 3.4;
  const tx = x + 13;
  const lines = rows.map((r) => wrap(tr(r.text), w - 15, 1.75));
  const h = 7 + lines.reduce((a, ln) => a + ln.length * lh, 0);
  p.rect([x, y], [x + w, y + h], { w: W.thin, fill: PAPER });
  p.text([x + 2, y + 2.1], l('COTES ET TRAITS', 'DIMENSIONS AND LINES'), {
    size: 1.9,
    weight: 'bold',
    baseline: 'top',
  });
  let yy = y + 7.6;
  rows.forEach((r, i) => {
    r.sym(p, x + 2, yy);
    lines[i]!.forEach((ln, j) => p.text([tx, yy + j * lh], ln, { size: 1.75, baseline: 'middle' }));
    yy += lines[i]!.length * lh;
  });
  return y + h + 1.5;
}

/** The "generic ram, not the Walton n°3" notice shared by the sheets that draw the ram. */
export const GENERIC_NOTE: L = l(
  'Bélier générique de 1″ : ce n’est pas le Walton n°3 de la vidéo (aucune fiche du constructeur n’a été trouvée). Seul le clapet de choc s’inspire de la vidéo, en version simplifiée ; toutes les autres cotes sont des estimations.',
  'Generic 1″ ram: this is not the video’s Walton No. 3 (no maker data sheet was found). Only the waste valve is based on the video, in a simplified version; every other dimension is an estimate.',
);

/** A framed note box with a bold title; returns the y below it. */
export function box(
  d: Drawing,
  x: number,
  y: number,
  w: number,
  title: Text,
  lines: (Text | { t: Text; bullet: string })[],
  o: { size?: number; border?: string } = {},
): number {
  const size = o.size ?? 1.85;
  const p = d.paper();
  const inner = w - 4;
  let yy = y + 2.2;
  p.text([x + 2, yy], title, { size: size + 0.1, weight: 'bold', baseline: 'top' });
  yy += (size + 0.1) * 1.9;
  for (const ln of lines) {
    if (typeof ln === 'object' && 't' in ln && 'bullet' in ln)
      yy = note(d, x + 2, yy, inner, ln.t, { size, bullet: ln.bullet });
    else yy = note(d, x + 2, yy, inner, ln as Text, { size });
  }
  p.rect([x, y], [x + w, yy + 0.4], { w: W.thin, color: o.border ?? INK_2 });
  return yy + 0.4;
}

// ------------------------------------------------------------------------------------------------ silhouettes and symbols

/** Polygon of a body of revolution about a vertical axis at x = cx, from its right-hand profile [radius, y] (bottom to top). */
export function silV(profile: Pt[], cx = 0): Pt[] {
  return [...profile.map(([r, y]): Pt => [cx + r, y]), ...[...profile].reverse().map(([r, y]): Pt => [cx - r, y])];
}

/** Polygon of a body of revolution about a horizontal axis at y = cy, from its upper profile [x, radius] (left to right). */
export function silH(profile: Pt[], cy = 0): Pt[] {
  return [...profile.map(([x, r]): Pt => [x, cy + r]), ...[...profile].reverse().map(([x, r]): Pt => [x, cy - r])];
}

/** Closed polygon helper. */
export function poly(v: View, pts: Pt[], s: Stroke): SVGElement {
  return v.polyline(pts, { closed: true, ...s });
}

/** Hexagonal nut seen from the side, `half` = half the width it shows (flats or corners): rectangle plus its two edges. */
export function nutSide(v: View, cx: number, y0: number, half: number, t: number, s: Stroke = med(), bore = 0): void {
  v.rect([cx - half, y0], [cx + half, y0 + t], s);
  v.line([cx - half / 2, y0], [cx - half / 2, y0 + t], { w: W.thin, color: s.color });
  v.line([cx + half / 2, y0], [cx + half / 2, y0 + t], { w: W.thin, color: s.color });
  if (bore) {
    v.line([cx - bore, y0], [cx - bore, y0 + t], { w: W.thin, dash: 'hidden', color: INK_2 });
    v.line([cx + bore, y0], [cx + bore, y0 + t], { w: W.thin, dash: 'hidden', color: INK_2 });
  }
}

/** Regular hexagon with a corner on +X, as a closed outline. */
export function hexagon(v: View, c: Pt, af: number, s: Stroke = med()): void {
  const R = corner(af);
  const pts: Pt[] = [];
  for (let i = 0; i < 6; i++)
    pts.push([c[0] + R * Math.cos((i * Math.PI) / 3), c[1] + R * Math.sin((i * Math.PI) / 3)]);
  poly(v, pts, s);
}

/** Thread symbol on a vertical rod: thin minor-diameter lines inside the major-diameter outline. */
export function threadV(v: View, cx: number, r: number, y0: number, y1: number, half = false): void {
  for (const sx of half ? [1] : [-1, 1]) v.line([cx + sx * r * 0.82, y0], [cx + sx * r * 0.82, y1], { w: W.thin });
}

/** An arrow (water or air) from a to b in paper-friendly model units, ending in the kit's arrow marker. */
export function flow(v: View, a: Pt, b: Pt, color: string = WATER, w: number = W.medium, dashed = false): void {
  const e = v.line(a, b, { w, color });
  e.setAttribute('marker-end', 'url(#arrow)');
  if (dashed) e.setAttribute('stroke-dasharray', '1.6 1');
}

// ------------------------------------------------------------------------------------------------ dimensions

/** Vertical dimension whose dimension line stands at model x = `xLine` (left or right of both points). */
export function dimV(v: View, a: Pt, b: Pt, xLine: number, label: Text, size = 2.2): void {
  const lo = Math.min(a[0], b[0]);
  const hi = Math.max(a[0], b[0]);
  const off = xLine < lo ? (xLine - lo) * v.scale : (xLine - hi) * v.scale;
  v.dim(a, b, off, { dir: 'v', label, size });
}

/** Horizontal dimension whose dimension line stands at model y = `yLine` (below or above both points). */
export function dimH(v: View, a: Pt, b: Pt, yLine: number, label: Text, size = 2.2): void {
  const lo = Math.min(a[1], b[1]);
  const hi = Math.max(a[1], b[1]);
  const off = yLine < lo ? (lo - yLine) * v.scale : (hi - yLine) * v.scale;
  v.dim(a, b, off, { dir: 'h', label, size });
}

// ------------------------------------------------------------------------------------------------ clipping (detail windows)

export interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** Sutherland–Hodgman clip of a closed polygon against an axis-aligned box. */
export function clipPoly(pts: Pt[], b: Box): Pt[] {
  const edges: [(p: Pt) => boolean, (p: Pt, q: Pt) => Pt][] = [
    [(p) => p[0] >= b.x0, (p, q) => [b.x0, p[1] + ((q[1] - p[1]) * (b.x0 - p[0])) / (q[0] - p[0])]],
    [(p) => p[0] <= b.x1, (p, q) => [b.x1, p[1] + ((q[1] - p[1]) * (b.x1 - p[0])) / (q[0] - p[0])]],
    [(p) => p[1] >= b.y0, (p, q) => [p[0] + ((q[0] - p[0]) * (b.y0 - p[1])) / (q[1] - p[1]), b.y0]],
    [(p) => p[1] <= b.y1, (p, q) => [p[0] + ((q[0] - p[0]) * (b.y1 - p[1])) / (q[1] - p[1]), b.y1]],
  ];
  let out = pts;
  for (const [inside, cut] of edges) {
    const src = out;
    out = [];
    src.forEach((p, i) => {
      const q = src[(i + 1) % src.length]!;
      if (inside(p)) {
        out.push(p);
        if (!inside(q)) out.push(cut(p, q));
      } else if (inside(q)) out.push(cut(p, q));
    });
    if (!out.length) break;
  }
  return out;
}

/** A closed polygon drawn only inside a box (nothing when it falls outside). */
export function polyIn(v: View, pts: Pt[], s: Stroke, b: Box): void {
  const c = clipPoly(pts, b);
  if (c.length > 2) poly(v, c, s);
}

/** A rectangle drawn only inside a box. */
export function rectIn(v: View, a: Pt, c: Pt, s: Stroke, b: Box): void {
  polyIn(v, [a, [c[0], a[1]], c, [a[0], c[1]]], s, b);
}

/** A short zigzag along a vertical cut edge at x, from y0 to y1 (the sign of a section cut short in a detail). */
export function cutEdge(v: View, x: number, y0: number, y1: number, amp: number): void {
  const pts: Pt[] = [];
  const n = 8;
  for (let i = 0; i <= n; i++)
    pts.push([x + (i % 2 ? amp : -amp) * (i === 0 || i === n ? 0 : 1), y0 + ((y1 - y0) * i) / n]);
  v.polyline(pts, { w: W.thin });
}
