import { tr, type L } from '@onigam/lab-kit/i18n';
import { COLORS, INK, W, type View } from '@onigam/lab-kit/drawings';
import { nf, val, type Kind } from './util';

const COPPER = COLORS.copper;

// A horizontal bullet gauge for a ratio (D10 and D12): a scale with ticks, an optional usual band, an optional zone to
// avoid, dashed marks of the rules and a copper marker for the lab's own value.

/** A horizontal gauge from 0 to `max` with a usual band, marks and a marker for the lab. */
export function gauge(
  p: View,
  x: number,
  y: number,
  w: number,
  o: {
    title: L;
    max: number;
    ticks: number[];
    band?: [number, number];
    bandLabel?: L;
    marks: { v: number; label: L; kind: Kind; row?: 0 | 1; left?: boolean }[];
    lab: { v: number; label: L; kind: Kind };
    over?: number;
  },
): void {
  const X = (v: number) => x + (v / o.max) * w;
  p.text([x, y - 6], o.title, { size: 2, weight: 'bold' });
  if (o.over !== undefined) p.rect([X(o.over), y], [X(o.max), y + 7], { w: 0, fill: '#f1d9d4' });
  if (o.band) p.rect([X(o.band[0]), y], [X(o.band[1]), y + 7], { w: 0, fill: '#dbe8c5' });
  p.rect([x, y], [x + w, y + 7], { w: W.medium });
  for (const v of o.ticks) {
    p.line([X(v), y + 7], [X(v), y + 8.4], { w: W.thin });
    p.text([X(v), y + 11.4], tr(nf(v, 0)), { size: 1.5, anchor: 'middle', mono: true });
  }
  if (o.band && o.bandLabel)
    p.text([(X(o.band[0]) + X(o.band[1])) / 2 - 18, y + 3.5], o.bandLabel, {
      size: 1.5,
      anchor: 'middle',
      baseline: 'middle',
      color: '#4d6a1c',
    });
  o.marks.forEach((m) => {
    const up = (m.row ?? 0) * 3.6;
    p.line([X(m.v), y - 1.5 - up], [X(m.v), y + 7], { w: W.medium, color: INK, dash: [1.6, 0.8] });
    p.text([X(m.v) + (m.left ? -1 : 1), y - 2.5 - up], m.label, {
      size: 1.6,
      anchor: m.left ? 'end' : 'start',
      color: INK,
    });
  });
  // the lab: a copper marker above the gauge
  p.polyline(
    [
      [X(o.lab.v), y - 0.2],
      [X(o.lab.v) - 1.8, y - 3.8],
      [X(o.lab.v) + 1.8, y - 3.8],
    ],
    { closed: true, w: 0, fill: COPPER },
  );
  val(p, X(o.lab.v) - 6, y + 16, o.lab.kind, o.lab.label, { size: 1.7, bold: true, color: COPPER });
}
