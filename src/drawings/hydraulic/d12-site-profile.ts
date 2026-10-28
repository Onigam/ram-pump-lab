import { l, tr, type L } from '@onigam/lab-kit/i18n';
import { COLORS, Drawing, INK, INK_2, W, type Pt, type View } from '@onigam/lab-kit/drawings';
import type { DrawingSheet } from '@onigam/lab-kit/drawings';
import { SITE, TANK, TOWER } from '../../three/dims';
import { G, RHO, area } from '../../sim/physics';
import { LENGTH_RATIO_S4, LENGTH_RATIO_USUAL, sizeRam } from '../../sim/sizing';
import { gauge } from './gauge';
import { valve1, workingLimits } from './model';
import { partName } from './names';
import { siteGeo, type Vec3 } from './site-geo';
import { arrowLine, balloon, cat, chip, flowArrow, kindKey, levelMark, nf, notes, para, rotVal, val } from './util';

// D12 — Elevation profile along the pipes: the drive pipe (20 m, 7.5 m of fall) then the delivery pipe (300 m, 65 m of
// rise), at one horizontal scale (1:1000, length of pipe from the ram) and a vertical scale 1.5 times larger (1:667). The
// pipe is the very polyline of the 3D world (src/three/site), so the sheet and the 3D agree by construction. A detail
// of the drive pipe at true scale (1:250), the ratios L/h and H/h against the rules, and a table under the profile.

const BLUE = COLORS.water;

// ---- main profile: 1 mm per metre of pipe, 2 mm per metre of level
const XS0 = 62;
const YB = 206;
const KY = 1.5;
const X = (s: number): number => XS0 + s;
const Y = (z: number): number => YB - z * KY;
const bar = (m: number): number => (RHO * G * m) / 1e5;

/** The numbers of the profile that the checks of the test read: the levels drawn and the length of the pipe. */
export function profileNumbers(): {
  fall: number;
  head: number;
  pipeLength: number;
  riserTop: number;
  towerInlet: number;
} {
  const g = siteGeo();
  return {
    fall: g.drive.start.y,
    head: SITE.deliveryHead,
    pipeLength: g.pipeLength,
    riserTop: (g.pipe[g.pipe.length - 1] as Vec3).y,
    towerInlet: SITE.deliveryHead,
  };
}

/** Distance along the pipe, level and slope of the stations of the table (every 50 m, then the end of the pipe). */
function stations(): { s: number; y: number; slope: number | null }[] {
  const g = siteGeo();
  const at = (sd: number): number => {
    const k = g.pipe.findIndex((q) => q.s >= sd);
    if (k <= 0) return (g.pipe[0] as Vec3).y;
    const a = g.pipe[k - 1] as Vec3 & { s: number };
    const b = g.pipe[k] as Vec3 & { s: number };
    return a.y + ((b.y - a.y) * (sd - a.s)) / (b.s - a.s || 1);
  };
  const ss = [0, 50, 100, 150, 200, 250, g.pipeLength];
  return ss.map((sd, i) => {
    const y = at(sd);
    const prev = ss[i - 1];
    return { s: sd, y, slope: prev === undefined ? null : ((y - at(prev)) / (sd - prev)) * 100 };
  });
}

function profile(p: View): void {
  const g = siteGeo();
  const route = g.pipe;
  const top = Y(70);
  const endS = g.pipeLength;
  // elevation grid and axis
  for (let z = 0; z <= 70; z += 10) {
    p.line([28, Y(z)], [372, Y(z)], { w: 0.08, color: '#d9cfba' });
    p.line([26.8, Y(z)], [28, Y(z)], { w: W.thin });
    p.text([26, Y(z)], tr(nf(z, 0)), { size: 1.6, anchor: 'end', baseline: 'middle', mono: true });
  }
  p.line([28, top], [28, Y(0)], { w: W.thin });
  p.text([17.5, (top + Y(0)) / 2], l('altitude au-dessus de l’axe du bélier (m)', 'level above the ram axis (m)'), {
    size: 1.8,
    rotate: 90,
    anchor: 'middle',
    color: INK_2,
  });
  // ground band under the pipe (the pipe lies on the ground), then the pipe
  const line: Pt[] = route.map((q) => [X(q.s), Y(q.y)]);
  p.polyline([...line, ...[...line].reverse().map(([x, y]): Pt => [x, y + 5.5])], {
    closed: true,
    w: 0,
    hatch: 'earth',
  });
  p.polyline(line, { w: 0.9, color: BLUE });
  // the drive pipe on the left: developed length, from the tank outlet down to the ram inlet
  const d = g.drive;
  const slopeLen = Math.hypot(d.elbow.x - d.outlet.x, d.outlet.y - d.elbow.y);
  const level1 = d.outlet.x - d.start.x;
  const level2 = d.end.x - d.elbow.x;
  const x0 = XS0 - (level1 + slopeLen + level2);
  const drive: Pt[] = [
    [x0, Y(d.start.y)],
    [x0 + level1, Y(d.outlet.y)],
    [x0 + level1 + slopeLen, Y(d.elbow.y)],
    [XS0, Y(d.end.y)],
  ];
  p.polyline([...drive, [XS0, Y(0) + 5.5], [x0, Y(0) + 5.5 + (Y(d.start.y) - Y(0))]], {
    closed: true,
    w: 0,
    hatch: 'earth',
    opacity: 0.0001,
  });
  p.polyline(drive, { w: 1.1, color: INK });
  // buffer tank at the start of the drive pipe
  const tankFloor = d.start.y - TANK.outletAboveFloor;
  p.rect([x0 - 13, Y(tankFloor)], [x0 - 0.6, Y(tankFloor + TANK.height)], { w: W.thick, fill: COLORS.waterFill });
  p.line(
    [x0 - 14.4, Y(tankFloor + TANK.height + TANK.freeboard)],
    [x0 + 0.8, Y(tankFloor + TANK.height + TANK.freeboard)],
    { w: 1.1 },
  );
  p.line([x0 - 0.6, Y(d.start.y)], [x0, Y(d.start.y)], { w: 1.1, color: INK });
  // the ram in its pit, at s = 0
  p.rect([XS0 - 3.2, Y(-0.2)], [XS0 + 3.2, Y(0.85) - 0.3], { w: W.medium, fill: COLORS.paper });
  p.rect([XS0 - 2, Y(0.07)], [XS0 + 2, Y(-0.07)], { w: W.medium, fill: COLORS.waterFill });
  // levels: the tank outlet, the ram axis and the tower inlet, with the water pressure line of the delivery pipe
  p.line([28, Y(d.start.y)], [x0 + 2, Y(d.start.y)], { w: W.thin, color: INK_2, dash: 'center' });
  p.line([XS0 - 14, Y(0)], [XS0 + 6, Y(0)], { w: W.thin, color: INK_2, dash: 'center' });
  levelMark(p, [x0 + 3.5, Y(d.start.y)], cat('+', nf(SITE.fall, 1), ' m = h'), { size: 1.8, bold: true });
  levelMark(p, [X(24), Y(SITE.deliveryHead)], cat('+', nf(SITE.deliveryHead, 0), ' m = H'), { size: 1.8, bold: true });
  levelMark(p, [XS0 - 18, Y(0)], '±0', { size: 1.8, bold: true, left: true });
  // the water tower on its stand, the pipe end over the trough
  const tx0 = X(endS) + 1.5;
  p.rect([tx0, Y(SITE.deliveryHead)], [tx0 + 16, Y(SITE.deliveryHead - TOWER.tankHeight)], {
    w: W.thick,
    fill: COLORS.paper,
  });
  p.rect([tx0 + 0.4, Y(SITE.deliveryHead - 1)], [tx0 + 15.6, Y(SITE.deliveryHead - TOWER.tankHeight) - 0.4], {
    w: 0,
    fill: COLORS.waterFill,
  });
  for (const lx of [tx0 + 1.5, tx0 + 14.5])
    p.line(
      [lx, Y(SITE.deliveryHead - TOWER.tankHeight)],
      [lx, Y(SITE.deliveryHead - TOWER.tankHeight - TOWER.standHeight)],
      { w: W.medium },
    );
  p.line([tx0 - 3, Y(TOWER_GROUND)], [tx0 + 20, Y(TOWER_GROUND)], { w: W.medium });
  p.line([X(0), Y(SITE.deliveryHead)], [tx0 + 20, Y(SITE.deliveryHead)], {
    w: W.medium,
    color: BLUE,
    dash: [2.4, 1.2],
  });
  const end = route[route.length - 1] as Vec3;
  p.polyline(
    [
      [X(endS), Y(end.y)],
      [tx0 + 8, Y(end.y)],
      [tx0 + 8, Y(SITE.deliveryHead) - 0.8],
    ],
    { w: 0.9, color: BLUE },
  );
  flowArrow(p, [tx0 + 8, Y(SITE.deliveryHead) - 0.4], -90, BLUE, 0.8);
  // pressure of the delivery pipe at the stations: the gap between the water level of the tower and the pipe
  for (const st of stations().slice(0, -1)) {
    const x = X(st.s) + (st.s === 0 ? 3 : 0);
    arrowLine(p, [x, Y(SITE.deliveryHead) + 0.4], [x, Y(st.y) - 1.4], BLUE, W.thin, true);
    p.text([x - 1.2, (Y(SITE.deliveryHead) + Y(st.y)) / 2], cat(nf(bar(SITE.deliveryHead - st.y), 1), ' bar'), {
      size: 1.6,
      rotate: 90,
      anchor: 'middle',
      color: BLUE,
      halo: true,
    });
  }
  // slopes of the reaches, written above the line
  const st = stations();
  for (let i = 1; i < st.length; i++) {
    const a = st[i - 1] as (typeof st)[0];
    const b = st[i] as (typeof st)[0];
    const pa: Pt = [X(a.s), Y(a.y)];
    const pb: Pt = [X(b.s), Y(b.y)];
    const ang = (Math.atan2(-(pb[1] - pa[1]), pb[0] - pa[0]) * 180) / Math.PI;
    const r = (ang * Math.PI) / 180;
    const m: Pt = [(pa[0] + pb[0]) / 2 - Math.sin(r) * 4.2, (pa[1] + pb[1]) / 2 - Math.cos(r) * 4.2];
    p.text(m, cat('i = ', nf(b.slope ?? 0, 0), ' %'), {
      size: 1.7,
      rotate: ang,
      anchor: 'middle',
      color: INK_2,
      halo: true,
    });
  }
  // the bends of D11, numbered under the line
  for (const bnd of g.bends) {
    const c: Pt = [X(bnd.s), Y(bnd.y)];
    p.circle(c, 0.55, { w: 0, fill: INK });
    balloon(p, [c[0] + 1.2, c[1] + 6.4], String(bnd.n), 1.7, INK);
  }
  // names
  p.text([XS0 + 9, Y(0) + 5.6], partName('ram-pit'), { size: 1.6, weight: 'bold', anchor: 'end' });
  p.text([x0 - 6.4, Y(tankFloor) + 4], partName('buffer-tank'), { size: 1.6, anchor: 'middle', weight: 'bold' });
  p.text([tx0 + 8, Y(SITE.deliveryHead) - 3.4], partName('water-tower'), {
    size: 1.6,
    anchor: 'middle',
    weight: 'bold',
  });
  p.text([X(150) - 6, Y(15) + 1], partName('delivery-pipe'), { size: 1.7, weight: 'bold', anchor: 'end', halo: true });
  p.text(
    [X(150) - 6, Y(15) + 4.4],
    cat(nf(g.pipeLength, 0), l(' m de tuyau sur ce profil', ' m of pipe on this profile')),
    { size: 1.5, anchor: 'end', color: INK_2, halo: true },
  );
  p.text([XS0 - 9, Y(5.6)], partName('drive-pipe'), { size: 1.6, weight: 'bold' });
}

const TOWER_GROUND = SITE.deliveryHead - TOWER.groundBelowInlet;

function guitar(p: View, y: number): void {
  const st = stations();
  const rh = 6;
  const x0 = 14;
  const x1 = X(g().pipeLength) + 22;
  const rows: [L, (q: (typeof st)[0]) => L][] = [
    [l('Longueur de tuyau depuis le bélier (m)', 'Pipe length from the ram (m)'), (q) => nf(q.s, 0)],
    [l('Altitude du tuyau (m)', 'Pipe level (m)'), (q) => nf(q.y, 1)],
    [
      l('Pente du tronçon (m pour 100 m de tuyau)', 'Slope of the section (m per 100 m of pipe)'),
      (q) => (q.slope === null ? l('—', '—') : nf(q.slope, 0)),
    ],
    [
      l('Pression statique ρ·g·(H − z) (bar)', 'Static pressure ρ·g·(H − z) (bar)'),
      (q) => nf(Math.max(0, bar(SITE.deliveryHead - q.y)), 1),
    ],
  ];
  p.rect([x0, y], [x1, y + rh * rows.length], { w: W.medium });
  p.line([XS0 - 6, y], [XS0 - 6, y + rh * rows.length], { w: W.thin });
  rows.forEach(([label, f], i) => {
    const ry = y + rh * i;
    if (i) p.line([x0, ry], [x1, ry], { w: W.thin });
    p.text([x0 + 1.5, ry + rh / 2], label, { size: 1.45, baseline: 'middle', weight: i === 0 ? 'bold' : 'normal' });
    st.forEach((q, k) => {
      const last = k === st.length - 1;
      p.text([X(q.s) + (q.s === 0 ? 1 : last ? -1 : 0), ry + rh / 2], f(q), {
        size: 1.7,
        baseline: 'middle',
        anchor: q.s === 0 ? 'start' : last ? 'end' : 'middle',
        mono: true,
        weight: i === 0 ? 'bold' : 'normal',
      });
    });
  });
  for (const q of st) p.line([X(q.s), y - 2], [X(q.s), y], { w: W.thin, color: INK_2 });
}

const g = siteGeo;

/** Detail of the drive pipe at true scale: 1:250, 4 mm per metre. */
function driveDetail(p: View): void {
  const s = siteGeo();
  const K = 4;
  const gx0 = 26;
  const xmin = -23.2;
  const gy0 = 84;
  const dx = (x: number): number => gx0 + (x - xmin) * K;
  const dy = (z: number): number => gy0 - z * K;
  const d = s.drive;
  p.text(
    [20, 26],
    l(
      'DÉTAIL — CONDUITE MOTRICE À L’ÉCHELLE RÉELLE (1:250, SANS EXAGÉRATION)',
      'DETAIL — DRIVE PIPE AT TRUE SCALE (1:250, NO EXAGGERATION)',
    ),
    { size: 2.4, weight: 'bold' },
  );
  p.line([20, 27.8], [150, 27.8], { w: W.thin, color: INK_2 });
  // ground along the pipe (z = 0 of the site) and the earth under it
  const xs: number[] = [];
  for (let x = xmin; x <= 3.2; x += 0.2) xs.push(x);
  const ground: Pt[] = xs.map((x) => [dx(x), dy(s.height(x, 0))]);
  p.polyline([...ground, [dx(3.2), dy(-1.4)], [dx(xmin), dy(-1.4)]], { closed: true, w: 0, hatch: 'earth' });
  p.polyline(ground, { w: W.medium });
  // tank (a section, shell and water), pit and ram
  const tx = s.tankX;
  const floor = d.start.y - TANK.outletAboveFloor;
  p.rect([dx(tx - 0.95), dy(floor + TANK.height)], [dx(tx + 0.95), dy(floor)], { w: W.thick, fill: COLORS.waterFill });
  p.line(
    [dx(tx - 1.1), dy(floor + TANK.height + TANK.freeboard)],
    [dx(tx + 1.1), dy(floor + TANK.height + TANK.freeboard)],
    { w: 1.1 },
  );
  p.line([dx(tx - 0.95), dy(floor + TANK.height)], [dx(tx + 0.95), dy(floor + TANK.height)], {
    w: W.thin,
    color: BLUE,
  });
  p.rect([dx(-1.43), dy(0.97)], [dx(1.55), dy(-0.9)], { w: W.thick, fill: COLORS.paper });
  p.rect([dx(0), dy(0.038)], [dx(0.56), dy(-0.038)], { w: W.medium, fill: COLORS.waterFill });
  // the pipe
  p.polyline(
    [
      [dx(d.start.x), dy(d.start.y)],
      [dx(d.outlet.x), dy(d.outlet.y)],
      [dx(d.elbow.x), dy(d.elbow.y)],
      [dx(d.end.x), dy(d.end.y)],
    ],
    { w: 1.1, color: INK },
  );
  p.line([dx(tx + 0.95), dy(d.start.y)], [dx(d.start.x), dy(d.start.y)], { w: 1.1, color: INK });
  // dimensions: fall, the three lengths, the run and the angle
  p.line([dx(d.start.x), dy(d.start.y)], [dx(3.5), dy(d.start.y)], { w: W.thin, color: INK_2, dash: 'center' });
  p.line([dx(d.elbow.x), dy(0)], [dx(3.5), dy(0)], { w: W.thin, color: INK_2, dash: 'center' });
  arrowLine(p, [dx(3.1), dy(d.start.y)], [dx(3.1), dy(0)], INK, W.thin, true);
  rotVal(p, [dx(3.1) - 1.4, (dy(d.start.y) + dy(0)) / 2], 90, 'R', cat('h = ', nf(SITE.fall, 1), ' m'), { size: 2 });
  const slopeLen = Math.hypot(d.elbow.x - d.outlet.x, d.outlet.y - d.elbow.y);
  const run = d.elbow.x - d.outlet.x;
  arrowLine(p, [dx(d.outlet.x), dy(0) + 6], [dx(d.elbow.x), dy(0) + 6], INK, W.thin, true);
  p.text(
    [(dx(d.outlet.x) + dx(d.elbow.x)) / 2, dy(0) + 9.4],
    cat(l('course horizontale ', 'horizontal run '), nf(run, 1), ' m'),
    { size: 1.7, anchor: 'middle' },
  );
  chip(p, [(dx(d.outlet.x) + dx(d.elbow.x)) / 2 + 22, dy(0) + 8.8], 'E');
  const ang = (Math.atan2(d.outlet.y - d.elbow.y, run) * 180) / Math.PI;
  p.arc([dx(d.elbow.x), dy(0)], 7, 180 - ang, 180, { w: W.thin });
  p.text([dx(d.elbow.x) - 10.5, dy(0) - 1.7], cat(nf(ang, 1), '°'), { size: 1.7, anchor: 'middle', mono: true });
  // the three stretches of pipe, and the total
  const a1: Pt = [dx(d.start.x), dy(d.start.y) - 7];
  const a2: Pt = [dx(d.outlet.x), dy(d.outlet.y) - 7];
  arrowLine(p, a1, a2, INK, W.thin, true);
  p.text([(a1[0] + a2[0]) / 2, a1[1] - 1.6], cat(nf(SITE.driveStartRun, 1), ' m'), {
    size: 1.5,
    anchor: 'middle',
    mono: true,
  });
  const slopeA: Pt = [dx(d.outlet.x), dy(d.outlet.y)];
  const slopeB: Pt = [dx(d.elbow.x), dy(d.elbow.y)];
  const sang = (Math.atan2(-(slopeB[1] - slopeA[1]), slopeB[0] - slopeA[0]) * 180) / Math.PI;
  const nn: Pt = [Math.sin((sang * Math.PI) / 180), Math.cos((sang * Math.PI) / 180)];
  const o = -7;
  arrowLine(
    p,
    [slopeA[0] + nn[0] * o, slopeA[1] + nn[1] * o],
    [slopeB[0] + nn[0] * o, slopeB[1] + nn[1] * o],
    INK,
    W.thin,
    true,
  );
  p.text(
    [(slopeA[0] + slopeB[0]) / 2 + nn[0] * (o - 1.8), (slopeA[1] + slopeB[1]) / 2 + nn[1] * (o - 1.8)],
    cat(nf(slopeLen, 1), ' m'),
    { size: 1.6, anchor: 'middle', rotate: sang, mono: true, halo: true },
  );
  const b1: Pt = [dx(d.elbow.x), dy(0) - 6];
  const b2: Pt = [dx(d.end.x), dy(0) - 6];
  p.text([(b1[0] + b2[0]) / 2 + 3, b1[1] - 4.6], cat(nf(SITE.driveLevelRun, 1), ' m'), {
    size: 1.5,
    anchor: 'middle',
    mono: true,
  });
  p.line(b1, b2, { w: W.thin });
  val(
    p,
    dx(-17),
    dy(d.start.y) - 14.5,
    'R',
    cat(
      'L = ',
      nf(SITE.driveLength, 0),
      l(' m de tuyau = ', ' m of pipe = '),
      nf(SITE.driveStartRun, 1),
      ' + ',
      nf(slopeLen, 1),
      ' + ',
      nf(SITE.driveLevelRun, 1),
    ),
    { size: 1.8, bold: true },
  );
  p.text([dx(d.start.x) - 1, dy(d.start.y) + 4.4], partName('buffer-tank'), {
    size: 1.5,
    anchor: 'end',
    weight: 'bold',
  });
  p.text([dx(0.1), dy(-0.9) + 4], partName('ram-pit'), { size: 1.5, anchor: 'middle', weight: 'bold' });
  levelMark(p, [dx(0.9), dy(SITE.groundAtRam + 0.12)], cat('+', nf(SITE.groundAtRam, 2), ' m'), { size: 1.5 });
}

function rules(p: View): void {
  const r = sizeRam({
    fall: SITE.fall,
    deliveryHead: SITE.deliveryHead,
    sourceFlow: SITE.sourceFlowLpm,
    pipe: '1',
    driveLength: SITE.driveLength,
  });
  const lim = workingLimits();
  // the model's own limit for the n°1 valve set as in the video, not a rule of the sources
  const modelRatio = lim.headCeiling / SITE.fall;
  p.text([160, 26], l('LES RAPPORTS L/h ET H/h FACE AUX RÈGLES', 'THE RATIOS L/h AND H/h COMPARED WITH THE RULES'), {
    size: 2.4,
    weight: 'bold',
  });
  p.line([160, 27.8], [406, 27.8], { w: W.thin, color: INK_2 });
  gauge(p, 164, 46, 126, {
    title: l('Conduite motrice : L/h', 'Drive pipe: L/h'),
    max: 8,
    ticks: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    band: [LENGTH_RATIO_USUAL[0], LENGTH_RATIO_USUAL[1]],
    bandLabel: l('usuel 3 à 7 (Wikipédia)', 'usual 3 to 7 (Wikipedia)'),
    marks: [{ v: LENGTH_RATIO_S4, label: l('NC State : ≥ 5', 'NC State: ≥ 5'), kind: 'R', row: 1 }],
    lab: {
      v: r.lengthRatio ?? 0,
      label: cat('L/h = ', nf(SITE.driveLength, 0), ' / ', nf(SITE.fall, 1), ' = ', nf(r.lengthRatio ?? 0, 1)),
      kind: 'D',
    },
  });
  gauge(p, 164, 84, 126, {
    title: l('Hauteur de refoulement : H/h', 'Delivery head: H/h'),
    max: 14,
    ticks: [0, 2, 4, 6, 8, 10, 12, 14],
    over: modelRatio,
    marks: [
      { v: 10, label: l('vidéo ≈ 10', 'video ≈ 10'), kind: 'R', left: true, row: 1 },
      {
        v: modelRatio,
        label: cat(l('limite du modèle ≈ ', 'model limit ≈ '), nf(modelRatio, 1)),
        kind: 'M',
        row: 0,
      },
    ],
    lab: {
      v: r.liftRatio,
      label: cat('H/h = ', nf(SITE.deliveryHead, 0), ' / ', nf(SITE.fall, 1), ' = ', nf(r.liftRatio, 1)),
      kind: 'D',
    },
  });
  const rise = (g().pipe[g().riserIndex] as Vec3).y;
  const mono = g()
    .pipe.slice(0, g().riserIndex + 1)
    .every((q, i, a) => i === 0 || q.y >= (a[i - 1] as Vec3).y - 0.02);
  const vel = valve1().means.deliveredFlow / 60000 / area(SITE.deliveryBore);
  const lines: [Kind2, L][] = [
    [
      'D',
      cat(
        l('Conduite motrice trop courte : ', 'Drive pipe too short: '),
        nf(SITE.driveLength, 0),
        ' m = ',
        nf(r.lengthRatio ?? 0, 1),
        l(' × h, sous les ', ' × h, under the '),
        nf(r.minLength, 1),
        l(' m de NC State (5 × h) et les ', ' m of NC State (5 × h) and the '),
        nf(r.usualLength[0], 1),
        '–',
        nf(r.usualLength[1], 1),
        l(
          ' m usuels (3 à 7 × h) ; la vidéo la fait marcher quand même.',
          ' m usual (3 to 7 × h); the video makes it work anyway.',
        ),
      ),
    ],
    [
      'M',
      cat(
        l('Hauteur de refoulement : H/h = ', 'Delivery head: H/h = '),
        nf(r.liftRatio, 1),
        l(
          ', sous le ≈ 10 que cite la vidéo ; le modèle ne refoule plus au-delà de ≈ ',
          ', under the ≈ 10 the video quotes; the model stops delivering beyond ≈ ',
        ),
        nf(lim.headCeiling, 0),
        ' m (H/h = ',
        nf(modelRatio, 1),
        l(
          '), limite du clapet n°1 tel que réglé : des béliers du commerce vont plus haut (Practical Action : jusqu’à H/h = 20).',
          '), the limit of valve No. 1 as set: commercial rams go higher (Practical Action: up to H/h = 20).',
        ),
      ),
    ],
    [
      'E',
      mono
        ? cat(
            l(
              'Le tuyau monte sans point haut intermédiaire (de +',
              'The pipe climbs with no high point on the way (from +',
            ),
            nf((g().pipe[0] as Vec3).y, 1),
            l(' à +', ' to +'),
            nf(rise, 1),
            l(
              ' m) : aucune poche d’air ne peut s’y loger, l’air sort au château d’eau.',
              ' m): no air pocket can stay in it, the air leaves at the water tower.',
            ),
          )
        : l('Points hauts : poser une ventouse.', 'High points: fit an air valve.'),
    ],
    [
      'M',
      cat(
        l('Débit refoulé q = ', 'Delivered flow q = '),
        nf(valve1().means.deliveredFlow, 2),
        l(' L/min dans un tuyau de Ø int. ', ' L/min in a pipe of ID '),
        nf(SITE.deliveryBore * 1000, 1),
        l(' mm : ', ' mm: '),
        nf(vel, 2),
        l(
          ' m/s, les frottements sont négligeables ; la pression est la pression statique du tableau.',
          ' m/s, friction is negligible; the pressure is the static pressure of the table.',
        ),
      ),
    ],
  ];
  let ty = 35;
  lines.forEach(([k, t]) => {
    chip(p, [302 + 1.6, ty - 0.6], k as 'D', 1);
    ty = para(p, 306.5, ty, 98, t, 1.5, INK) + 3.2;
  });
}

type Kind2 = 'R' | 'D' | 'M' | 'C' | 'E';

export const siteProfile: DrawingSheet = {
  id: 'site-profile',
  number: 'D12',
  group: 'site',
  title: l('Profil en long des conduites', 'Long profile of the pipes'),
  description: l(
    'Coupe en long le long des tuyaux, d’abord la conduite motrice (20 m de tuyau, 7,5 m de chute), puis la conduite de refoulement (300 m, 65 m de montée), à la même échelle horizontale (1:1000) et à une échelle verticale 1,5 fois plus grande (1:667). Le tuyau suit le sol et ne repasse jamais plus bas ; les pastilles numérotées sont les coudes du plan D11. Le tableau donne l’altitude, la pente et la pression statique tous les 50 m ; en haut, la conduite motrice à l’échelle vraie et les rapports L/h et H/h face aux règles.',
    'Long section along the pipes, first the drive pipe (20 m of pipe, 7.5 m of fall), then the delivery pipe (300 m, 65 m of rise), at one horizontal scale (1:1000) and a vertical scale 1.5 times larger (1:667). The pipe follows the ground and never goes lower again; the numbered discs are the bends of plan D11. The table gives the level, the slope and the static pressure every 50 m; at the top, the drive pipe at true scale and the ratios L/h and H/h against the rules.',
  ),
  scene: 'site',
  parts: ['drive-pipe', 'delivery-pipe', 'buffer-tank', 'ram-pit', 'water-tower'],
  render(): Drawing {
    const d = new Drawing();
    d.frame({
      title: l('Profil en long des conduites', 'Long profile of the pipes'),
      subtitle: l(
        'Conduite motrice (chute h) et conduite de refoulement (hauteur H), altitudes et pentes',
        'Drive pipe (fall h) and delivery pipe (head H), levels and slopes',
      ),
      number: 'D12',
      scale: '1:1000 / 1:667',
    });
    const p = d.paper();
    driveDetail(p);
    rules(p);
    p.text(
      [22, 98],
      l(
        'PROFIL EN LONG — horizontal 1:1000 (longueur de tuyau), vertical 1:667 (hauteurs × 1,5)',
        'LONG PROFILE — horizontal 1:1000 (pipe length), vertical 1:667 (heights × 1.5)',
      ),
      { size: 2.4, weight: 'bold' },
    );
    profile(p);
    guitar(p, 214);
    kindKey(p, 14, 266, { kinds: ['R', 'D', 'M', 'E'] });
    notes(
      p,
      14,
      242,
      205,
      null,
      [
        l(
          'Hauteurs et longueurs de la vidéo : h = 7,5 m, 20 m de conduite motrice, H = 65 m, 300 m de refoulement. Le relief, le tracé et le château d’eau sont ceux de la vue 3D : des estimations.',
          'Heights and lengths from the video: h = 7.5 m, 20 m of drive pipe, H = 65 m, 300 m of delivery pipe. The relief, the route and the water tower are those of the 3D view: estimates.',
        ),
      ],
      1.6,
    );
    return d;
  },
};
