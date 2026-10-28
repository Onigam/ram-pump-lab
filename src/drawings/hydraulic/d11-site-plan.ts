import { l, tr, type L } from '@onigam/lab-kit/i18n';
import { COLORS, Drawing, INK, INK_2, W, type Pt, type View } from '@onigam/lab-kit/drawings';
import type { DrawingSheet } from '@onigam/lab-kit/drawings';
import { CATCHMENT, HOUSE, PIT, SITE, SPRING, TOWER, WASTE_DRAIN } from '../../three/dims';
import { PIT_X } from '../../three/site/layout';
import { BED_X0, BED_X1, BOX_OHL, BOX_OHW, BEND_X, GATE_X_OFFSET, R_OUT, SLAB_R, SPRING_X } from './catchment-geo';
import { contourLines, sampleGrid, simplify, type P2 } from './contour';
import { partName } from './names';
import { siteGeo, TERRACE, TOWER_GROUND } from './site-geo';
import { balloon, cat, chip, flowArrow, gridTable, kindKey, nf, para, val, type Kind } from './util';

// D11 — Plan of the site: the whole hillside at 1:1000 (the 300 m delivery route with its numbered bends and its
// stations every 50 m, the tower, the house, the contour lines of the lab's terrain) and, at 1:200, the zone of the
// catchment, the drive pipe, the pit and the start of the waste-water drain. North up, scale bars, the main levels.
// Geometry: src/three/site and dims.ts (the same functions as the 3D world); the terrain and the route are estimates.

const BLUE = COLORS.water;
const COPPER = COLORS.copper;
const CONTOUR = '#cdbf9f';
const CONTOUR_INDEX = '#a4966f';

// ---- main plan, 1:1000 (1 mm per metre)
const M = { x0: 22, y0: 24, xmin: -30, xmax: 76, zmin: -182, zmax: 36 };
const mx = (x: number): number => M.x0 + (x - M.xmin);
const mz = (z: number): number => M.y0 + (z - M.zmin);
const mp = (x: number, z: number): Pt => [mx(x), mz(z)];

// ---- inset A, 1:200 (5 mm per metre)
const A = { x0: 136, y0: 30, xmin: -30, xmax: 4, zmin: -6.5, zmax: 30, k: 5 };
const ax = (x: number): number => A.x0 + (x - A.xmin) * A.k;
const az = (z: number): number => A.y0 + (z - A.zmin) * A.k;
const ap = (x: number, z: number): Pt => [ax(x), az(z)];

function drawContours(
  p: View,
  f: (x: number, z: number) => number,
  box: { x0: number; x1: number; z0: number; z1: number },
  step: number,
  minor: number,
  index: number,
  map: (x: number, z: number) => Pt,
  tol: number,
  labels: boolean,
): void {
  const grid = sampleGrid(f, box.x0, box.x1, box.z0, box.z1, step);
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of grid.values) {
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  for (let level = Math.ceil(lo / minor) * minor; level <= hi; level += minor) {
    const isIndex = Math.abs(level / index - Math.round(level / index)) < 1e-9;
    const lines = contourLines(grid, level);
    for (const line of lines) {
      const s = simplify(line, tol);
      p.polyline(
        s.map(([x, z]) => map(x, z)),
        { w: isIndex ? 0.2 : 0.1, color: isIndex ? CONTOUR_INDEX : CONTOUR },
      );
      if (isIndex && labels && s.length > 8) {
        // a label on the longest lines, written along the middle segment
        const i = Math.floor(s.length / 2);
        const a = map(...(s[i - 1] as P2));
        const b = map(...(s[i + 1] as P2));
        const ang = (Math.atan2(-(b[1] - a[1]), b[0] - a[0]) * 180) / Math.PI;
        const c = map(...(s[i] as P2));
        const t = p.group(c, ang > 90 ? ang - 180 : ang < -90 ? ang + 180 : ang);
        t.rect([-3.2, -1.1], [3.2, 1.1], { w: 0, fill: COLORS.paper });
        t.text([0, 0], cat(nf(level, 0), ' m'), {
          size: 1.3,
          anchor: 'middle',
          baseline: 'middle',
          color: CONTOUR_INDEX,
          mono: true,
        });
      }
    }
  }
}

function mainPlan(p: View): void {
  const g = siteGeo();
  p.rect([M.x0, M.y0], [mx(M.xmax), mz(M.zmax)], { w: W.medium, fill: COLORS.paper });
  // 50 m grid, labelled in metres east and north of the ram
  for (let x = Math.ceil(M.xmin / 50) * 50; x <= M.xmax; x += 50) {
    p.line([mx(x), M.y0], [mx(x), mz(M.zmax)], { w: 0.06, color: '#d9cfba', dash: [1, 1.4] });
    p.text([mx(x), M.y0 - 1.6], cat(nf(x, 0), ' m'), { size: 1.4, anchor: 'middle', mono: true, color: INK_2 });
  }
  for (let z = Math.ceil(M.zmin / 50) * 50; z <= M.zmax; z += 50) {
    p.line([M.x0, mz(z)], [mx(M.xmax), mz(z)], { w: 0.06, color: '#d9cfba', dash: [1, 1.4] });
    p.text([M.x0 - 1.4, mz(z)], cat(nf(-z, 0), ' m'), {
      size: 1.4,
      anchor: 'end',
      baseline: 'middle',
      mono: true,
      color: INK_2,
    });
  }
  drawContours(p, g.height, { x0: M.xmin, x1: M.xmax, z0: M.zmin, z1: M.zmax }, 2, 5, 20, mp, 0.3, true);
  // waste-water drain: buried pipe to the outfall, the ditch, the soakaway
  const ws = g.waste;
  p.polyline([mp(ws.start.x, ws.start.z), mp(ws.outfall.x, ws.outfall.z)], { w: 0.4, color: INK_2, dash: [1.4, 0.8] });
  p.polyline([mp(ws.outfall.x, ws.outfall.z), ...ws.stream.map((q) => mp(q.x, q.z))], { w: 0.5, color: BLUE });
  p.circle(mp(ws.soakaway.x, ws.soakaway.z), 1.4, { w: W.medium, fill: COLORS.paper });
  // drive pipe from the tank to the ram (it is only 20 m: boxed, see the inset)
  p.line(mp(g.tankX, 0), mp(-0.47, 0), { w: 0.9, color: INK });
  p.rect(
    mp(PIT_X - PIT.innerLength / 2 - PIT.wall, -PIT.innerWidth / 2 - PIT.wall),
    mp(PIT_X + PIT.innerLength / 2 + PIT.wall, PIT.innerWidth / 2 + PIT.wall),
    { w: W.medium, fill: INK },
  );
  p.circle(mp(g.tankX, 0), 1.3, { w: W.medium, fill: COLORS.paper });
  p.rect(mp(g.tankX - 6, -1.8), mp(g.tankX - 4.4, 1.8), { w: W.medium, fill: COLORS.paper });
  // delivery pipe along its route, stations every 50 m (labels on the side away from the bend balloons)
  const route = g.pipe.slice(0, g.riserIndex + 1);
  p.polyline(
    route.map((q) => mp(q.x, q.z)),
    { w: 0.75, color: BLUE },
  );
  for (let sPipe = 50; sPipe <= 250; sPipe += 50) {
    const q = route.reduce(
      (best, r) => (Math.abs(r.s - sPipe) < Math.abs(best.s - sPipe) ? r : best),
      route[0] as (typeof route)[0],
    );
    const i = route.indexOf(q);
    const a = route[Math.max(0, i - 1)] as typeof q;
    const b = route[Math.min(route.length - 1, i + 1)] as typeof q;
    const nl = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const n: Pt = [-(b.z - a.z) / nl, (b.x - a.x) / nl];
    const c = mp(q.x, q.z);
    p.line([c[0] - n[0] * 1.8, c[1] - n[1] * 1.8], [c[0] + n[0] * 1.8, c[1] + n[1] * 1.8], { w: W.medium });
    const near = g.bends.some((bd) => Math.abs(bd.s - sPipe) < 16);
    const side = near ? -1 : 1;
    p.text([c[0] + side * n[0] * 3.6, c[1] + side * n[1] * 3.6], cat(nf(sPipe, 0), ' m'), {
      size: 1.4,
      anchor: n[0] * side >= 0 ? 'start' : 'end',
      baseline: 'middle',
      mono: true,
      halo: true,
    });
  }
  // bends: numbered balloons on the outside of each turn
  g.bends.forEach((b, k) => {
    const c = mp(b.x, b.z);
    const prev = (k === 0 ? [PIT_X + 0.7, 0] : [g.bends[k - 1]?.x ?? 0, g.bends[k - 1]?.z ?? 0]) as [number, number];
    const next = (
      g.bends[k + 1]
        ? [g.bends[k + 1]?.x ?? 0, g.bends[k + 1]?.z ?? 0]
        : [TOWER.planX + TOWER.riserX, TOWER.planZ + TOWER.riserZ]
    ) as [number, number];
    const u1: Pt = [b.x - prev[0], b.z - prev[1]];
    const u2: Pt = [next[0] - b.x, next[1] - b.z];
    const l1 = Math.hypot(u1[0], u1[1]) || 1;
    const l2 = Math.hypot(u2[0], u2[1]) || 1;
    let ox = u1[0] / l1 - u2[0] / l2;
    let oz = u1[1] / l1 - u2[1] / l2;
    const ol = Math.hypot(ox, oz) || 1;
    ox /= ol;
    oz /= ol;
    p.circle(c, 0.55, { w: 0, fill: INK });
    p.line(c, [c[0] + ox * 3.4, c[1] + oz * 3.4], { w: W.thin });
    balloon(p, [c[0] + ox * 6, c[1] + oz * 6], String(b.n), 1.8, INK);
  });
  // the tower and the house (their true footprints are about 3 mm and 10 mm at this scale)
  const tw = mp(TOWER.planX, TOWER.planZ);
  p.circle(tw, TOWER.tankDiameter / 2 + 1, { w: W.thick, fill: COLORS.waterFill });
  p.line([tw[0] - 3.2, tw[1]], [tw[0] + 3.2, tw[1]], { w: W.thin });
  p.line([tw[0], tw[1] - 3.2], [tw[0], tw[1] + 3.2], { w: W.thin });
  p.rect(
    mp(HOUSE.planX - HOUSE.length / 2, HOUSE.planZ - HOUSE.width / 2),
    mp(HOUSE.planX + HOUSE.length / 2, HOUSE.planZ + HOUSE.width / 2),
    { w: W.thick, fill: COLORS.paper, hatch: 'steel' },
  );
  // spot levels
  const spot = (
    x: number,
    z: number,
    text: L,
    o: { dx?: number; dy?: number; anchor?: 'start' | 'end'; kind?: Kind } = {},
  ) => {
    const c = mp(x, z);
    p.polyline([[c[0] - 0.9, c[1] - 1.6], [c[0] + 0.9, c[1] - 1.6], c], {
      closed: true,
      w: W.thin,
      fill: COLORS.paper,
    });
    p.text([c[0] + (o.dx ?? 1.6), c[1] + (o.dy ?? -1)], text, {
      size: 1.5,
      anchor: o.anchor ?? 'start',
      halo: true,
      weight: 'bold',
    });
  };
  spot(TOWER.planX, TOWER.planZ, cat('+', nf(SITE.deliveryHead, 0), ' m'), { dx: 5.2, dy: -4.6 });
  spot(HOUSE.planX, HOUSE.planZ, cat('+', nf(TERRACE, 1), ' m'), { dx: -7.5, dy: 6, anchor: 'end' });
  spot(0, 0, l('±0', '±0'), { dx: -3, dy: -7.2, anchor: 'end' });
  // names
  p.text([tw[0] + 5.6, tw[1] + 0.8], partName('water-tower'), { size: 1.6, weight: 'bold', halo: true });
  p.text([mx(HOUSE.planX) - 8, mz(HOUSE.planZ) + HOUSE.width / 2 + 5.6], partName('house'), {
    size: 1.6,
    weight: 'bold',
    halo: true,
    anchor: 'end',
  });
  // the zone of inset A
  const za = { x0: A.xmin, x1: A.xmax, z0: A.zmin, z1: A.zmax };
  p.rect(mp(za.x0, za.z0), mp(za.x1, za.z1), { w: W.medium, dash: 'phantom', color: COPPER });
  balloon(p, [mx(za.x0) + 2.8, mz(za.z0) - 3.2], 'A', 2.6, COPPER);
  p.text([mx(za.x0) + 6.4, mz(za.z1) + 3.2], l('détail A (1:200)', 'detail A (1:200)'), {
    size: 1.5,
    color: COPPER,
    weight: 'bold',
  });
  p.text([mx(ws.soakaway.x) + 3.6, mz(ws.soakaway.z) + 1], partName('waste-drain'), {
    size: 1.5,
    weight: 'bold',
    halo: true,
  });
  p.text([mx(-27), mz(-98)], partName('delivery-pipe'), { size: 1.7, weight: 'bold', halo: true });
  p.text([mx(-27), mz(-98) + 3.4], cat(nf(g.pipeLength, 0), l(' m tracés sur ce plan', ' m drawn on this plan')), {
    size: 1.5,
    color: INK_2,
    halo: true,
  });
  val(p, mx(-27), mz(-98) + 7, 'R', cat(nf(SITE.deliveryLength, 0), l(' m rapportés (vidéo)', ' m reported (video)')), {
    size: 1.5,
    color: INK,
  });
}

/** North arrow with the grid scale bars. */
function northAndScales(p: View, x: number, y: number): void {
  p.circle([x, y + 12], 11, { w: W.thin, color: INK_2 });
  p.polyline(
    [
      [x, y + 1],
      [x + 3.4, y + 17],
      [x, y + 14],
      [x - 3.4, y + 17],
    ],
    { closed: true, w: W.medium, fill: INK },
  );
  p.text([x, y - 1.8], l('N', 'N'), { size: 3, weight: 'bold', anchor: 'middle' });
  // graphic scales
  const bar = (bx: number, by: number, k: number, lenM: number, ticks: number[], label: string) => {
    p.text([bx, by - 3.6], label, { size: 1.8, weight: 'bold', mono: true });
    p.rect([bx, by - 1.4], [bx + lenM * k, by + 0.4], { w: W.medium });
    for (let i = 0; i < ticks.length - 1; i++) {
      if (i % 2 === 0)
        p.rect([bx + (ticks[i] as number) * k, by - 1.4], [bx + (ticks[i + 1] as number) * k, by + 0.4], {
          w: 0,
          fill: INK,
        });
    }
    for (const t of ticks) p.text([bx + t * k, by + 3.4], tr(nf(t, 0)), { size: 1.4, anchor: 'middle', mono: true });
    p.text([bx + lenM * k + 2.4, by + 3.4], 'm', { size: 1.4, color: INK_2 });
  };
  bar(x - 18, y + 36, 1, 50, [0, 10, 20, 30, 40, 50], '1:1000');
  bar(x - 18, y + 54, 5, 10, [0, 2, 4, 6, 8, 10], '1:200');
}

// ------------------------------------------------------------------------------------------------ inset A, 1:200

function insetA(p: View): void {
  const g = siteGeo();
  const tx = g.tankX;
  const box = { x0: ax(A.xmin), y0: az(A.zmin), x1: ax(A.xmax), y1: az(A.zmax) };
  p.rect([box.x0, box.y0], [box.x1, box.y1], { w: W.medium, fill: COLORS.paper });
  drawContours(p, g.height, { x0: A.xmin, x1: A.xmax, z0: A.zmin, z1: A.zmax }, 0.5, 1, 5, ap, 0.06, true);
  // catchment, in site coordinates (the box and the bed are placed from the tank axis by SPRING_X)
  const bx = tx + SPRING_X;
  // gravel bed with its stone kerbs, rock behind it
  const bed0 = bx + BED_X0;
  const bed1 = bx + BED_X1;
  const hw = CATCHMENT.filterWidth / 2;
  p.polyline(
    [
      ap(bed0 - 0.3, -hw - 1.2),
      ap(bed0 - 1.6, -hw - 0.2),
      ap(bed0 - 2.2, 0.6),
      ap(bed0 - 1.4, hw + 1.0),
      ap(bed0 - 0.3, hw + 1.1),
    ],
    { closed: true, w: W.medium, fill: COLORS.paper, hatch: 'steel' },
  );
  p.rect(ap(bed0 - CATCHMENT.filterKerb, -hw - CATCHMENT.filterKerb), ap(bed1, hw + CATCHMENT.filterKerb), {
    w: W.medium,
    fill: '#e4ddcf',
  });
  p.rect(ap(bed0, -hw), ap(bed1, hw), { w: W.thin, fill: COLORS.paper });
  for (let i = 0; i < 70; i++) {
    const t = (i * 0.618) % 1;
    const u = (i * 0.37 + 0.11) % 1;
    const gx = bed0 + t * (bed1 - bed0);
    const grain =
      t < CATCHMENT.filterZones[0] ? 0.35 : t < CATCHMENT.filterZones[0] + CATCHMENT.filterZones[1] ? 0.55 : 0.8;
    p.circle(ap(gx, -hw + 0.1 + u * (2 * hw - 0.2)), 0.22 * grain * 1.4, { w: W.thin });
  }
  // spring box
  p.rect(ap(bx - BOX_OHL, -BOX_OHW), ap(bx + BOX_OHL, BOX_OHW), { w: W.thick, fill: COLORS.paper, hatch: 'earth' });
  p.rect(
    ap(bx - SPRING.basinLength / 2, -SPRING.basinWidth / 2),
    ap(bx + SPRING.basinLength / 2, SPRING.basinWidth / 2),
    { w: W.medium, fill: COLORS.waterFill },
  );
  // feed pipe from the box to the lid of the tank, then the tank
  p.line(ap(bx + SPRING.basinLength / 2, 0), ap(tx - CATCHMENT.feedInlet, 0), { w: 0.8, color: INK });
  flowArrow(p, ap(bx + 3, 0), 0, BLUE, 0.9);
  p.circle(ap(tx, 0), SLAB_R * A.k, { w: W.thin, fill: '#e4ddcf', dash: [1, 0.8] });
  p.circle(ap(tx, 0), R_OUT * A.k, { w: W.thick, fill: COLORS.waterFill });
  p.circle(ap(tx + CATCHMENT.manholeX, CATCHMENT.manholeZ), (CATCHMENT.manholeDiameter / 2) * A.k, { w: W.thin });
  p.circle(ap(tx + CATCHMENT.ventX, CATCHMENT.ventZ), 0.9, { w: W.thin, fill: INK });
  // overflow to the ditch, the gutter, the drain
  const az50 = (CATCHMENT.overflowAzimuthDeg * Math.PI) / 180;
  const ovfA: Pt = ap(tx + R_OUT * Math.cos(az50), R_OUT * Math.sin(az50));
  const ovfB: Pt = ap(
    tx + CATCHMENT.overflowDischargeRadius * Math.cos(az50),
    CATCHMENT.overflowDischargeRadius * Math.sin(az50),
  );
  p.line(ovfA, ovfB, { w: 0.8, color: INK });
  flowArrow(p, ovfB, -50, BLUE, 0.9);
  const gx0 = tx + CATCHMENT.gutterStart;
  const gx1 = tx + 9.6;
  p.rect(
    ap(gx0, CATCHMENT.gutterZ - CATCHMENT.gutterWidth / 2),
    ap(gx1, CATCHMENT.gutterZ + CATCHMENT.gutterWidth / 2),
    { w: W.medium, fill: '#e4ddcf' },
  );
  p.polyline(
    [
      ap(tx + R_OUT, 0.05),
      ap(tx + CATCHMENT.drainTurnX, 0.05),
      ap(tx + CATCHMENT.drainTurnX, CATCHMENT.gutterZ),
      ap(gx0 + 0.2, CATCHMENT.gutterZ),
    ],
    { w: 0.5, color: INK_2, dash: [1.2, 0.8] },
  );
  // drive pipe: gate valve, then the pipe to the ram
  const gate0 = tx + R_OUT + GATE_X_OFFSET;
  p.line(ap(tx + R_OUT, 0), ap(g.drive.end.x, 0), { w: 0.9, color: INK });
  p.rect(ap(gate0, -0.25), ap(gate0 + CATCHMENT.gateBodyLength, 0.25), { w: W.medium, fill: COLORS.paper });
  p.line(ap(tx + BEND_X, -0.5), ap(tx + BEND_X, 0.5), { w: W.thin, color: INK_2, dash: [0.8, 0.8] });
  // pit with the ram, the drain and the delivery pipe
  const pc = PIT_X;
  p.rect(
    ap(pc - PIT.innerLength / 2 - PIT.wall, -PIT.innerWidth / 2 - PIT.wall),
    ap(pc + PIT.innerLength / 2 + PIT.wall, PIT.innerWidth / 2 + PIT.wall),
    { w: W.thick, fill: '#e4ddcf' },
  );
  p.rect(ap(pc - PIT.innerLength / 2, -PIT.innerWidth / 2), ap(pc + PIT.innerLength / 2, PIT.innerWidth / 2), {
    w: W.thin,
    fill: COLORS.paper,
  });
  p.rect(ap(0, -0.075), ap(0.56, 0.075), { w: W.medium, fill: COLORS.waterFill });
  const ws = g.waste;
  p.line(ap(ws.start.x, PIT.innerWidth / 2), ap(ws.start.x, ws.outfall.z), { w: 1, color: INK_2, dash: [1.6, 0.8] });
  for (let i = 1; i <= 2; i++) {
    const z = ws.start.z + ((ws.outfall.z - ws.start.z) * i) / 3;
    p.circle(ap(ws.start.x, z), (WASTE_DRAIN.manholeDiameter / 2) * A.k, { w: W.medium, fill: COLORS.paper });
  }
  p.rect(
    ap(ws.outfall.x - WASTE_DRAIN.headwallWidth / 2, ws.outfall.z - WASTE_DRAIN.headwallDepth),
    ap(ws.outfall.x + WASTE_DRAIN.headwallWidth / 2, ws.outfall.z),
    { w: W.medium, fill: INK },
  );
  p.polyline([ap(ws.outfall.x, ws.outfall.z), ...ws.stream.map((q) => ap(q.x, q.z))], { w: 1.1, color: BLUE });
  p.circle(ap(ws.soakaway.x, ws.soakaway.z), (WASTE_DRAIN.soakawayDiameter / 2) * A.k, {
    w: W.medium,
    fill: COLORS.paper,
    hatch: 'earth',
  });
  const out = siteGeo().pipe[0] as { x: number; z: number };
  p.line(ap(PIT_X + 0.7, 0), ap(out.x, 0), { w: 0.9, color: BLUE });
  p.line(ap(PIT_X + 0.7, 0), ap(A.xmax, 0), { w: 0.9, color: BLUE });
  p.text([ax(A.xmax) - 1.2, az(0) - 1.6], l('→ conduite de refoulement', '→ delivery pipe'), {
    size: 1.5,
    anchor: 'end',
    color: BLUE,
    halo: true,
  });
  // balloons keyed to the list under the inset
  const ball = (n: string, x: number, z: number, dx: number, dy: number) => {
    const c = ap(x, z);
    p.line(c, [c[0] + dx, c[1] + dy], { w: W.thin });
    balloon(p, [c[0] + dx, c[1] + dy], n, 2.5, INK);
  };
  ball('1', bed0 - 1.4, 0.2, -2, -10);
  ball('2', bx - 1.5, 1, -3, 12);
  ball('3', bx, BOX_OHW, 5, 9);
  ball('4', bx + 2.2, 0, 2, -10);
  ball('5', tx, 0, -3, -14);
  ball('6', tx + 1.4, 1.2, 8, 10);
  ball('7', gate0 + 0.05, 0, 0, -8);
  ball('8', g.drive.end.x - 7, 0, 0, -8);
  ball('9', pc + 0.9, -PIT.innerWidth / 2 - PIT.wall, 4, -9);
  ball('10', ws.start.x, ws.start.z + 3.4, 12, 0);
  ball('11', ws.stream[6]?.x ?? ws.outfall.x, ws.stream[6]?.z ?? ws.outfall.z, 11, 0);
  ball('12', tx + CATCHMENT.drainTurnX, 0.8, 6, 8);
  ball('13', 2.5, 0, 0, 9);
  // spot levels of the ground
  const spot = (x: number, z: number, y: number, dx: number, dy: number, left = false) => {
    const c = ap(x, z);
    p.circle(c, 0.5, { w: 0, fill: INK });
    p.text([c[0] + dx, c[1] + dy], cat(y >= 0 ? '+' : '−', nf(Math.abs(y), 1)), {
      size: 1.5,
      anchor: left ? 'end' : 'start',
      weight: 'bold',
      mono: true,
      halo: true,
    });
  };
  spot(tx, 3, g.height(tx, 3), 1.2, 0);
  spot(bx, 3, g.height(bx, 3), 1.2, 2.4);
  spot(pc, 3, g.height(pc, 3), 1.2, 0);
  spot(ws.outfall.x, ws.outfall.z + 0.6, g.height(ws.outfall.x, ws.outfall.z + 0.6), 1.6, 1.2);
  spot(ws.soakaway.x, ws.soakaway.z + 1.6, g.height(ws.soakaway.x, ws.soakaway.z + 1.6), 1.6, 0.6);
  p.text(
    [box.x0 + 2, box.y1 - 2],
    l(
      'Courbes de niveau tous les 1 m (5 m en gras) : terrain reconstitué du labo, pas un relevé',
      'Contours every 1 m (every 5 m bold): the lab’s reconstructed terrain, not a survey',
    ),
    { size: 1.4, color: INK_2 },
  );
}

const KEY: [string, string, string][] = [
  ['1', 'spring', 'spring'],
  ['2', 'gravel-filter', 'gravel'],
  ['3', 'spring-box', 'box'],
  ['4', 'feed-pipe', 'feed'],
  ['5', 'buffer-tank', 'tank'],
  ['6', 'overflow-pipe', 'ovf'],
  ['7', 'drive-gate-valve', 'gate'],
  ['8', 'drive-pipe', 'drive'],
  ['9', 'ram-pit', 'pit'],
  ['10', 'waste-drain', 'drain'],
  ['11', 'waste-drain', 'ditch'],
  ['12', 'tank-drain', 'tdrain'],
  ['13', 'delivery-pipe', 'delivery'],
];

function insetKey(p: View, x: number, y: number): void {
  p.text([x, y], l('DÉTAIL A — 1:200 : repères (noms du catalogue)', 'DETAIL A — 1:200: tags (catalogue names)'), {
    size: 2.2,
    weight: 'bold',
  });
  const names: Record<string, L> = {
    '10': l('Eaux de rejet : tuyau enterré, regards', 'Waste water: buried pipe, chambers'),
    '11': l('Eaux de rejet : fossé et puisard', 'Waste water: ditch and soakaway'),
  };
  KEY.forEach(([n, id], i) => {
    const col = Math.floor(i / 5);
    const row = i % 5;
    const cx = x + col * 58;
    const cy = y + 6 + row * 5;
    balloon(p, [cx + 2.6, cy], n, 2.1, INK);
    p.text([cx + 6.4, cy], names[n] ?? partName(id), { size: 1.45, baseline: 'middle' });
  });
}

function levels(p: View, x: number, y: number): void {
  const g = siteGeo();
  p.text([x, y], l('NIVEAUX PRINCIPAUX (m / axe du bélier)', 'MAIN LEVELS (m above the ram axis)'), {
    size: 2.2,
    weight: 'bold',
  });
  const rows: { name: L; level: number; kind: Kind }[] = [
    { name: partName('water-tower'), level: SITE.deliveryHead, kind: 'R' },
    { name: l('Sol sous le château d’eau', 'Ground under the water tower'), level: TOWER_GROUND, kind: 'E' },
    { name: l('Terrasse de la maison', 'House terrace'), level: TERRACE, kind: 'E' },
    {
      name: l('Sortie de la réserve (conduite motrice)', 'Tank outlet (drive pipe start)'),
      level: SITE.fall,
      kind: 'R',
    },
    { name: l('Sol à la fosse du bélier', 'Ground at the ram pit'), level: SITE.groundAtRam, kind: 'E' },
    { name: l('Axe d’entrée du bélier (repère)', 'Ram inlet axis (datum)'), level: 0, kind: 'R' },
    {
      name: l('Sortie du fossé (puisard)', 'Ditch end (soakaway)'),
      level: g.height(g.waste.soakaway.x, g.waste.soakaway.z),
      kind: 'E',
    },
  ];
  gridTable(
    p,
    x,
    y + 3,
    [
      { label: l('Repère', 'Point'), w: 60 },
      { label: l('Niveau', 'Level'), w: 22, align: 'end', mono: true },
      { label: '', w: 10, align: 'middle' },
    ],
    rows.map((r) => [r.name, cat(r.level >= 0 ? '+' : '−', nf(Math.abs(r.level), 1), ' m'), '']),
    { rowH: 5.4, size: 1.7 },
  );
  rows.forEach((r, i) => chip(p, [x + 60 + 22 + 5, y + 3 + 5.4 * (i + 1.5)], r.kind, 0.9));
}

function bends(p: View, x: number, y: number): void {
  const g = siteGeo();
  p.text([x, y], l('COUDES DE LA CONDUITE DE REFOULEMENT', 'BENDS OF THE DELIVERY PIPE'), {
    size: 2.2,
    weight: 'bold',
  });
  gridTable(
    p,
    x,
    y + 3,
    [
      { label: l('N°', 'No.'), w: 10, align: 'middle' },
      { label: l('Distance', 'Distance'), w: 24, align: 'end', mono: true },
      { label: l('Altitude', 'Level'), w: 26, align: 'end', mono: true },
      { label: l('Virage', 'Turn'), w: 32, align: 'end', mono: true },
    ],
    g.bends.map((b) => [
      String(b.n),
      cat(nf(b.s, 0), ' m'),
      cat('+', nf(b.y, 1), ' m'),
      cat(nf(Math.abs(b.turn), 0), '° ', b.turn > 0 ? l('droite', 'right') : l('gauche', 'left')),
    ]),
    { rowH: 4.7, size: 1.6 },
  );
}

function legendNotes(p: View, x: number, y: number): void {
  p.text([x, y], l('SYMBOLES ET NOTES', 'SYMBOLS AND NOTES'), { size: 2.2, weight: 'bold' });
  const rows: [() => void, L][] = [
    [
      () => p.line([x, y + 5], [x + 8, y + 5], { w: 0.75, color: BLUE }),
      l('conduite de refoulement ; | repère tous les 50 m', 'delivery pipe; | mark every 50 m'),
    ],
    [
      () => p.line([x, y + 9.4], [x + 8, y + 9.4], { w: 0.5, color: INK_2, dash: [1.4, 0.8] }),
      l('tuyau enterré (évacuation, vidange)', 'buried pipe (drain, washout)'),
    ],
    [
      () => balloon(p, [x + 4, y + 13.8], '1', 1.8, INK),
      l('coude numéroté (liste ci-dessus)', 'numbered bend (list above)'),
    ],
  ];
  rows.forEach(([draw, t], i) => {
    draw();
    p.text([x + 11, y + 5 + i * 4.4], t, { size: 1.5, baseline: 'middle' });
  });
  para(
    p,
    x,
    y + 20,
    94,
    l(
      'Le terrain et le tracé sont ceux de la vue 3D : des estimations, pas un relevé. Hauteurs et longueurs écrites : h, H et les 300 m sont ceux de la vidéo.',
      'The terrain and the route are those of the 3D view: estimates, not a survey. The written heights and lengths: h, H and the 300 m are the video’s.',
    ),
    1.5,
    INK_2,
  );
}

export const sitePlan: DrawingSheet = {
  id: 'site-plan',
  number: 'D11',
  group: 'site',
  title: l('Plan du site', 'Site plan'),
  description: l(
    'Vue du dessus de la colline, nord en haut. À gauche, le plan d’ensemble au 1:1000 : la conduite de refoulement de 300 m avec ses coudes numérotés et ses repères tous les 50 m, le château d’eau, la maison, les courbes de niveau. Au centre, le détail A au 1:200 : captage, réserve, conduite motrice, fosse du bélier et début de l’évacuation des eaux de rejet. À droite, les niveaux principaux et la liste des coudes. Le terrain et le tracé sont ceux de la vue 3D : des estimations, pas un relevé.',
    'View from above, north up. On the left, the overall plan at 1:1000: the 300 m delivery pipe with its numbered bends and its marks every 50 m, the water tower, the house, the contour lines. In the middle, detail A at 1:200: spring box, tank, drive pipe, ram pit and the start of the waste-water drain. On the right, the main levels and the list of bends. The terrain and the route are those of the 3D view: estimates, not a survey.',
  ),
  scene: 'site',
  parts: ['spring', 'buffer-tank', 'drive-pipe', 'ram-pit', 'waste-drain', 'delivery-pipe', 'water-tower', 'house'],
  render(): Drawing {
    const d = new Drawing();
    d.frame({
      title: l('Plan du site', 'Site plan'),
      subtitle: l(
        'Captage, réserve, conduite motrice, fosse, conduite de refoulement, château d’eau, maison',
        'Spring, tank, drive pipe, pit, delivery pipe, water tower, house',
      ),
      number: 'D11',
      scale: '1:1000 · 1:200',
    });
    const p = d.paper();
    p.text([22, 18.4], l('PLAN D’ENSEMBLE — 1:1000', 'OVERALL PLAN — 1:1000'), { size: 2.4, weight: 'bold' });
    mainPlan(p);
    p.text(
      [136, 25.4],
      l(
        'DÉTAIL A — CAPTAGE, CONDUITE MOTRICE, FOSSE ET ÉVACUATION — 1:200',
        'DETAIL A — SPRING BOX, DRIVE PIPE, PIT AND DRAIN — 1:200',
      ),
      { size: 2.4, weight: 'bold' },
    );
    insetA(p);
    insetKey(p, 136, az(A.zmax) + 8);
    northAndScales(p, 334, 36);
    levels(p, 312, 100);
    bends(p, 312, 154);
    kindKey(p, 22, 252, { kinds: ['R', 'E'] });
    legendNotes(p, 312, 216);
    return d;
  },
};
