import {
  COLORS,
  INK,
  INK_2,
  W,
  type Pt,
  type Stroke,
  type Text,
  type TextOpts,
  type View,
} from '@onigam/lab-kit/drawings';
import { tr } from '@onigam/lab-kit/i18n';
import { ns } from './util';

// A small chart helper for the sheets (the kit has `LineChart` for the live canvas panels, but nothing for an SVG drawing: see
// docs/kit-requests.md, request 12). Everything is drawn in paper space inside a box (paper mm): axes with ticks and labels,
// optional grid, polylines clipped to the box, bands, reference lines, markers. Values are in data units; `X` and `Y` map them.

export interface Axis {
  min: number;
  max: number;
  /** Tick values (default: every `step`). */
  ticks?: number[];
  step?: number;
  /** Axis title (with its unit). */
  label?: Text;
  /** Tick label for a value (default: an integer, or one decimal when the step is below 1). */
  fmt?: (v: number) => string;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type MarkerKind = 'circle' | 'diamond' | 'square' | 'triangle' | 'cross';

const ticksOf = (a: Axis): number[] => {
  if (a.ticks) return a.ticks;
  const step = a.step ?? (a.max - a.min) / 5;
  const out: number[] = [];
  for (let v = a.min; v <= a.max + step * 1e-6; v += step) out.push(Math.round(v / step) * step);
  return out;
};

const defaultFmt = (a: Axis) => (v: number) => ns(v, (a.step ?? 1) < 1 && !Number.isInteger(v) ? 1 : 0);

export class Chart {
  readonly view: View;
  constructor(
    p: View,
    readonly box: Box,
    readonly xa: Axis,
    readonly ya: Axis,
    o: { grid?: boolean; xLabels?: boolean; ySide?: 'left' | 'right' } = {},
  ) {
    this.view = p;
    this.opts = { grid: true, xLabels: true, ySide: 'left', ...o };
  }
  private opts: { grid: boolean; xLabels: boolean; ySide: 'left' | 'right' };

  /** Data x to paper x. */
  X = (v: number): number => this.box.x + ((v - this.xa.min) / (this.xa.max - this.xa.min)) * this.box.w;
  /** Data y to paper y. */
  Y = (v: number): number => this.box.y + this.box.h - ((v - this.ya.min) / (this.ya.max - this.ya.min)) * this.box.h;

  /** Axes, ticks, tick labels, titles and the grid. */
  frame(): this {
    const p = this.view;
    const { x, y, w, h } = this.box;
    const xf = this.xa.fmt ?? defaultFmt(this.xa);
    const yf = this.ya.fmt ?? defaultFmt(this.ya);
    if (this.opts.grid) {
      for (const v of ticksOf(this.ya))
        if (v > this.ya.min && v < this.ya.max)
          p.line([x, this.Y(v)], [x + w, this.Y(v)], { w: 0.08, color: '#cfc8b8' });
      for (const v of ticksOf(this.xa))
        if (v > this.xa.min && v < this.xa.max)
          p.line([this.X(v), y], [this.X(v), y + h], { w: 0.08, color: '#cfc8b8' });
    }
    p.rect([x, y], [x + w, y + h], { w: W.medium, color: INK });
    for (const v of ticksOf(this.xa)) {
      p.line([this.X(v), y + h], [this.X(v), y + h + 1.2], { w: W.thin });
      if (this.opts.xLabels) p.text([this.X(v), y + h + 4], xf(v), { size: 1.6, anchor: 'middle', mono: true });
    }
    const right = this.opts.ySide === 'right';
    for (const v of ticksOf(this.ya)) {
      const px = right ? x + w : x;
      p.line([px, this.Y(v)], [px + (right ? 1.2 : -1.2), this.Y(v)], { w: W.thin });
      p.text([px + (right ? 2.2 : -2.2), this.Y(v)], yf(v), {
        size: 1.6,
        anchor: right ? 'start' : 'end',
        baseline: 'middle',
        mono: true,
      });
    }
    if (this.xa.label)
      p.text([x + w / 2, y + h + (this.opts.xLabels ? 8.6 : 4)], this.xa.label, {
        size: 1.8,
        anchor: 'middle',
        color: INK_2,
      });
    if (this.ya.label) {
      const lx = right ? x + w + 12 : x - 13;
      p.text([lx, y + h / 2], this.ya.label, { size: 1.8, anchor: 'middle', rotate: 90, color: INK_2 });
    }
    return this;
  }

  /** Clip a polyline (data points) to the box and return the visible runs in paper coordinates. */
  private runs(pts: Pt[]): Pt[][] {
    const out: Pt[][] = [];
    let cur: Pt[] = [];
    const inside = (q: Pt) =>
      q[1] >= this.ya.min - 1e-9 &&
      q[1] <= this.ya.max + 1e-9 &&
      q[0] >= this.xa.min - 1e-9 &&
      q[0] <= this.xa.max + 1e-9;
    const cross = (a: Pt, b: Pt): Pt => {
      // point of the segment ab on the box boundary (the one that leaves or enters)
      let t = 1;
      for (const [lim, ai, bi] of [
        [this.ya.max, a[1], b[1]],
        [this.ya.min, a[1], b[1]],
      ] as const) {
        if ((ai - lim) * (bi - lim) < 0) t = Math.min(t, (lim - ai) / (bi - ai));
      }
      for (const [lim, ai, bi] of [
        [this.xa.max, a[0], b[0]],
        [this.xa.min, a[0], b[0]],
      ] as const) {
        if ((ai - lim) * (bi - lim) < 0) t = Math.min(t, (lim - ai) / (bi - ai));
      }
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    };
    const px = (q: Pt): Pt => [this.X(q[0]), this.Y(q[1])];
    for (let i = 0; i < pts.length; i++) {
      const q = pts[i] as Pt;
      const prev = pts[i - 1];
      if (inside(q)) {
        if (prev && !inside(prev)) cur.push(px(cross(q, prev)));
        cur.push(px(q));
      } else {
        if (prev && inside(prev)) {
          cur.push(px(cross(prev, q)));
          out.push(cur);
          cur = [];
        } else if (prev && !inside(prev)) {
          // both outside: the segment may still cross the box; ignore (data are monotone in x)
        }
      }
    }
    if (cur.length) out.push(cur);
    return out.filter((r) => r.length > 1);
  }

  line(pts: Pt[], s: Stroke = {}): void {
    for (const r of this.runs(pts)) this.view.polyline(r, { w: W.medium, ...s });
  }

  /** Filled area between the curve and the line y = base. */
  area(pts: Pt[], base: number, s: Stroke = {}): void {
    const clamp = (v: number) => Math.min(this.ya.max, Math.max(this.ya.min, v));
    const top = pts.map((q): Pt => [this.X(q[0]), this.Y(clamp(q[1]))]);
    const bottom = [...pts].reverse().map((q): Pt => [this.X(q[0]), this.Y(clamp(base))]);
    this.view.polyline([...top, ...bottom], { closed: true, w: 0, ...s });
  }

  /** Vertical band between two data x values (full height unless y0, y1 given). */
  band(x0: number, x1: number, s: Stroke, y0 = this.ya.min, y1 = this.ya.max): void {
    this.view.rect([this.X(x0), this.Y(y0)], [this.X(x1), this.Y(y1)], { w: 0, ...s });
  }

  hline(v: number, s: Stroke = {}, x0 = this.xa.min, x1 = this.xa.max): void {
    if (v < this.ya.min || v > this.ya.max) return;
    this.view.line([this.X(x0), this.Y(v)], [this.X(x1), this.Y(v)], { w: W.thin, color: INK_2, ...s });
  }

  vline(v: number, s: Stroke = {}, y0 = this.ya.min, y1 = this.ya.max): void {
    if (v < this.xa.min || v > this.xa.max) return;
    this.view.line([this.X(v), this.Y(y0)], [this.X(v), this.Y(y1)], { w: W.thin, color: INK_2, ...s });
  }

  marker(
    x: number,
    y: number,
    kind: MarkerKind = 'circle',
    o: { r?: number; color?: string; fill?: string; w?: number } = {},
  ): void {
    const p = this.view;
    const c: Pt = [this.X(x), this.Y(y)];
    const r = o.r ?? 1.5;
    const color = o.color ?? INK;
    const st: Stroke = { w: o.w ?? W.medium, color, fill: o.fill ?? COLORS.paper };
    switch (kind) {
      case 'circle':
        p.circle(c, r, st);
        break;
      case 'square':
        p.rect([c[0] - r, c[1] - r], [c[0] + r, c[1] + r], st);
        break;
      case 'diamond':
        p.polyline(
          [
            [c[0], c[1] - r * 1.25],
            [c[0] + r * 1.25, c[1]],
            [c[0], c[1] + r * 1.25],
            [c[0] - r * 1.25, c[1]],
          ],
          { ...st, closed: true },
        );
        break;
      case 'triangle':
        p.polyline(
          [
            [c[0], c[1] - r * 1.2],
            [c[0] + r * 1.2, c[1] + r * 0.9],
            [c[0] - r * 1.2, c[1] + r * 0.9],
          ],
          { ...st, closed: true },
        );
        break;
      case 'cross':
        p.line([c[0] - r, c[1] - r], [c[0] + r, c[1] + r], { w: st.w, color });
        p.line([c[0] - r, c[1] + r], [c[0] + r, c[1] - r], { w: st.w, color });
        break;
    }
  }

  /** Text at a data position (offsets in paper mm). */
  text(x: number, y: number, str: Text, o: TextOpts & { dx?: number; dy?: number } = {}): void {
    this.view.text([this.X(x) + (o.dx ?? 0), this.Y(y) + (o.dy ?? 0)], str, { size: 1.7, ...o });
  }

  /** Chart title above the box, left aligned. */
  title(str: Text, sub?: Text): void {
    this.view.text([this.box.x, this.box.y - 4.2], str, { size: 2.2, weight: 'bold' });
    if (sub && tr(sub) !== '')
      this.view.text([this.box.x + this.box.w, this.box.y - 4.2], sub, { size: 1.6, anchor: 'end', color: INK_2 });
  }
}
