// Contour lines of a height function by marching squares, chained into polylines. Pure (no DOM), used by the site plan.

export type P2 = [number, number];

/**
 * Contour lines of `f(x, z)` at `level` over the box [x0, x1] × [z0, z1] sampled every `step`. The crossings are keyed by
 * the grid edge they lie on, so the segments of neighbouring cells join exactly and the lines come out as long polylines.
 * A line that leaves the box ends on its border. Points are in the units of x and z.
 */
export function contourLines(
  grid: { values: Float64Array; nx: number; nz: number; x0: number; z0: number; step: number },
  level: number,
): P2[][] {
  const { values, nx, nz, x0, z0, step } = grid;
  const at = (i: number, j: number): number => values[j * nx + i] as number;
  const pos = new Map<string, P2>();
  const links = new Map<string, string[]>();
  const edgePoint = (id: string, i0: number, j0: number, i1: number, j1: number): string => {
    if (!pos.has(id)) {
      const a = at(i0, j0);
      const b = at(i1, j1);
      const t = b === a ? 0.5 : (level - a) / (b - a);
      pos.set(id, [x0 + (i0 + (i1 - i0) * t) * step, z0 + (j0 + (j1 - j0) * t) * step]);
    }
    return id;
  };
  const link = (a: string, b: string): void => {
    (links.get(a) ?? links.set(a, []).get(a)!).push(b);
    (links.get(b) ?? links.set(b, []).get(b)!).push(a);
  };
  for (let j = 0; j < nz - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = at(i, j);
      const b = at(i + 1, j);
      const c = at(i + 1, j + 1);
      const d = at(i, j + 1);
      const ha = a >= level;
      const hb = b >= level;
      const hc = c >= level;
      const hd = d >= level;
      // crossings in order: top (a-b), right (b-c), bottom (d-c), left (a-d)
      const cross: { id: string; edge: 'top' | 'right' | 'bottom' | 'left' }[] = [];
      if (ha !== hb) cross.push({ id: edgePoint(`h${i},${j}`, i, j, i + 1, j), edge: 'top' });
      if (hb !== hc) cross.push({ id: edgePoint(`v${i + 1},${j}`, i + 1, j, i + 1, j + 1), edge: 'right' });
      if (hd !== hc) cross.push({ id: edgePoint(`h${i},${j + 1}`, i, j + 1, i + 1, j + 1), edge: 'bottom' });
      if (ha !== hd) cross.push({ id: edgePoint(`v${i},${j}`, i, j, i, j + 1), edge: 'left' });
      if (cross.length === 2) link((cross[0] as { id: string }).id, (cross[1] as { id: string }).id);
      else if (cross.length === 4) {
        const centre = (a + b + c + d) / 4 >= level;
        const id = (e: string) => (cross.find((q) => q.edge === e) as { id: string }).id;
        // the diagonal that the centre value joins stays connected; the other two corners are cut off
        const joinsAC = centre === ha;
        if (joinsAC) {
          link(id('top'), id('right'));
          link(id('bottom'), id('left'));
        } else {
          link(id('top'), id('left'));
          link(id('right'), id('bottom'));
        }
      }
    }
  }
  // chain the links into polylines
  const seen = new Set<string>();
  const out: P2[][] = [];
  const walk = (start: string): P2[] => {
    const line: P2[] = [];
    let prev = '';
    let cur = start;
    for (;;) {
      seen.add(cur);
      line.push(pos.get(cur) as P2);
      const next = (links.get(cur) ?? []).find((n) => n !== prev && !seen.has(n));
      if (!next) break;
      prev = cur;
      cur = next;
    }
    return line;
  };
  // open lines first (nodes with one link), then the closed loops
  for (const [id, ls] of links) if (ls.length === 1 && !seen.has(id)) out.push(walk(id));
  for (const id of links.keys()) if (!seen.has(id)) out.push(walk(id));
  return out.filter((l) => l.length > 1);
}

/** Sample a height function on a regular grid. */
export function sampleGrid(
  f: (x: number, z: number) => number,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  step: number,
) {
  const nx = Math.floor((x1 - x0) / step) + 1;
  const nz = Math.floor((z1 - z0) / step) + 1;
  const values = new Float64Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) values[j * nx + i] = f(x0 + i * step, z0 + j * step);
  return { values, nx, nz, x0, z0, step };
}

/** Douglas–Peucker simplification of a polyline with a tolerance in the units of its points. */
export function simplify(pts: P2[], tol: number): P2[] {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop() as [number, number];
    const pa = pts[a] as P2;
    const pb = pts[b] as P2;
    const dx = pb[0] - pa[0];
    const dz = pb[1] - pa[1];
    const len = Math.hypot(dx, dz) || 1;
    let worst = -1;
    let dmax = tol;
    for (let i = a + 1; i < b; i++) {
      const p = pts[i] as P2;
      const d = Math.abs((p[0] - pa[0]) * dz - (p[1] - pa[1]) * dx) / len;
      if (d > dmax) {
        dmax = d;
        worst = i;
      }
    }
    if (worst >= 0) {
      keep[worst] = 1;
      stack.push([a, worst], [worst, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}
