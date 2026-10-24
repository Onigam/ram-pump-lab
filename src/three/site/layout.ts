import { CATCHMENT, CHAMBER, DELIVERY_ROUTE, HOUSE, PIT, SITE, TANK, TOWER } from '../dims';
import { smoothstep } from '../common';
import { BEND_X as CATCH_BEND_X, groundY as catchmentGround, softRamp } from '../catchment/layout';
import { fbm } from './noise';
import { STUB_X0 } from '../ram/inlet';

// Where things stand on the hillside, and the height of the ground under them. Plan coordinates: X east, Z south; the
// hill rises to the north (-Z). Heights are above the ram's datum (the axis of its inlet).
//
// The ground is built from: a broad rise to the tower (proportional to the head H), a shoulder on the west where the
// spring is (rising with the fall h), rolling noise, far mountains, and flat "design" pieces graded into it: the pit pad,
// the drive-pipe corridor with the tank plateau, the tower pad and the house terrace.
//
// Honest proportions: heights are never exaggerated. The delivery route is drawn once in plan (DELIVERY_ROUTE) and
// follows the ground, so its length is 300 m at the video's head (H = 65 m) and changes a little with other heads.

export interface SiteParams {
  /** Fall h, m. */
  fall: number;
  /** Drive pipe length L, m. */
  driveLength: number;
  /** Delivery head H, m. */
  head: number;
}

export const DEFAULT_PARAMS: SiteParams = {
  fall: SITE.fall,
  driveLength: SITE.driveLength,
  head: SITE.deliveryHead,
};

/** Centre of the pit in plan, and the ground level around it. */
export const PIT_X = PIT.centreX + 0.07;
export const GROUND_PIT = SITE.groundAtRam;
const TOWER_UP = TOWER.groundBelowInlet;
const TOWER_T = (-TOWER.planZ + 0.08 * TOWER.planX) as number;

// ------------------------------------------------------------------------------------------------ drive pipe

export interface DriveGeometry {
  /** Start of the drive pipe at the tank: the end of the gate valve (x of the site, y = the fall). */
  start: { x: number; y: number };
  /** Top of the slope: where the level run on the bench of the tank ends and the pipe goes down. */
  outlet: { x: number; y: number };
  /** Elbow where the slope pipe turns horizontal (z = 0). */
  elbow: { x: number; y: number };
  /** Open end of the stub in the ram (x of the ram frame, y = 0). */
  end: { x: number; y: number };
  /** Horizontal distance of the sloping part. */
  run: number;
}

export function driveGeometry(p: SiteParams): DriveGeometry {
  const xEnd = STUB_X0;
  const xElbow = xEnd - SITE.driveLevelRun;
  const slopeLength = Math.max(p.driveLength - SITE.driveLevelRun - SITE.driveStartRun, p.fall * 1.02);
  const run = Math.sqrt(Math.max(0.25, slopeLength * slopeLength - p.fall * p.fall));
  const xTop = xElbow - run;
  return {
    start: { x: xTop - SITE.driveStartRun, y: p.fall },
    outlet: { x: xTop, y: p.fall },
    elbow: { x: xElbow, y: 0 },
    end: { x: xEnd, y: 0 },
    run,
  };
}

/** X of the axis of the buffer tank (the catchment frame: its floor is `fall − outletAboveFloor` high). */
export const tankAxisX = (d: DriveGeometry): number => d.start.x - TANK.diameter / 2 - TANK.outletLength;

/**
 * Ground along the axis of the corridor: the bench of the tank, then the slope with the pipe on its saddles 0.23 m above the
 * surface (the profile of the catchment world), and the ground rises over the pipe near the pit, where it dives under it.
 */
function corridorHeight(x: number, d: DriveGeometry, p: SiteParams): number {
  const bench = p.fall - TANK.outletAboveFloor - CATCHMENT.benchDepth;
  const line = bench - (p.fall / d.run) * softRamp(Math.min(x, d.elbow.x) - d.outlet.x);
  const near = (GROUND_PIT + CATCHMENT.driveAboveGround) * smoothstep(d.elbow.x - 6, d.elbow.x, x);
  return line + near;
}

// ------------------------------------------------------------------------------------------------ pads

interface Pad {
  x: number;
  z: number;
  /** Flat inside r0, graded to the natural ground at r1. */
  r0: number;
  r1: number;
  height(p: SiteParams): number;
}

const PADS: Pad[] = [
  { x: PIT_X, z: 0, r0: 5, r1: 15, height: () => GROUND_PIT },
  { x: TOWER.planX, z: TOWER.planZ, r0: 9, r1: 22, height: (p) => p.head - TOWER_UP },
  { x: HOUSE.planX, z: HOUSE.planZ, r0: 12, r1: 24, height: (p) => HOUSE.terraceFraction * p.head },
];

// ------------------------------------------------------------------------------------------------ ground

/** Broad rise to the north: 0 at the ram, 1 at the tower; gentle fall to the south (the valley the camera looks from). */
function hillShape(x: number, z: number): number {
  const t = (-z + 0.08 * x) / TOWER_T;
  if (t < 0) return 0.38 * t;
  if (t < 1) return 0.75 * t + 0.25 * smoothstep(0, 1, t);
  return 1 + 0.18 * (t - 1);
}

/** Far mountains all around: rise from 260 m away from the site centre, to 280 m high at 1 km. */
function mountains(x: number, z: number): number {
  const r = Math.hypot(x - 40, (z + 90) * 0.9);
  const k = smoothstep(240, 1000, r);
  if (k <= 0) return 0;
  return k * k * (110 + 170 * (0.5 + 0.5 * fbm(x * 0.0021 + 3.1, z * 0.0021 - 1.7, 3)));
}

export interface Ground {
  /** The part of the height that does not depend on the parameters (rolling noise and far mountains). */
  staticPart(x: number, z: number): number;
  /** Height with the pads and the corridor graded in; `stat` is `staticPart(x, z)` when the caller cached it. */
  height(x: number, z: number, p: SiteParams, stat?: number): number;
}

export function createGround(): Ground {
  const driveCache = { key: '', d: driveGeometry(DEFAULT_PARAMS) };
  const drive = (p: SiteParams): DriveGeometry => {
    const key = `${p.fall}|${p.driveLength}`;
    if (key !== driveCache.key) {
      driveCache.key = key;
      driveCache.d = driveGeometry(p);
    }
    return driveCache.d;
  };

  const staticPart = (x: number, z: number): number => {
    // rolling noise, none near the ram, the tank and the pads, plus the mountains of the horizon
    const dRam = Math.hypot(x - PIT_X, z);
    const amp = 4.2 * smoothstep(30, 110, dRam);
    const noise =
      amp * fbm(x * 0.012 + 11, z * 0.012 - 7, 3) + 0.9 * smoothstep(12, 60, dRam) * fbm(x * 0.05, z * 0.05, 2);
    return noise + mountains(x, z);
  };

  const height = (x: number, z: number, p: SiteParams, stat?: number): number => {
    const d = drive(p);
    const rise = (p.head - TOWER_UP) * hillShape(x, z);
    // shoulder on the west where the spring catchment stands: rises with the fall, like the corridor beyond the tank
    const west = (p.fall + 1.5) * smoothstep(d.elbow.x + 2, d.outlet.x - 6, x) * Math.exp(-Math.pow(z / 38, 2));
    // the valley falls away a little to the south whatever the head, so that the waste water of the pit always drains
    const south = -0.06 * Math.max(0, z) * smoothstep(-2, 6, z);
    let y = GROUND_PIT + rise + west + south + (stat ?? staticPart(x, z));
    // drive-pipe corridor (a capsule along the pipe, from the tank to the pit)
    const xa = d.start.x - 3;
    const xb = d.elbow.x + 6;
    const cx = Math.min(Math.max(x, xa), xb);
    const wCor = 1 - smoothstep(2.2, 11, Math.hypot(x - cx, z));
    if (wCor > 0) y += (corridorHeight(x, d, p) - y) * wCor;
    for (const pad of PADS) {
      const w = 1 - smoothstep(pad.r0, pad.r1, Math.hypot(x - pad.x, z - pad.z));
      if (w > 0) y += (pad.height(p) - y) * w;
    }
    // the catchment: upland shelf of the spring, scarp, bench of the tank and the first metres of the slope, as in the catchment world
    const tx = tankAxisX(d);
    const xr = x - tx;
    const bendRel = CATCH_BEND_X;
    const wc =
      (1 - smoothstep(3.5, 9, Math.abs(z))) *
      smoothstep(-11.5, -8, xr) *
      (1 - smoothstep(bendRel + 2, bendRel + 4, xr));
    if (wc > 0) y += (p.fall - TANK.outletAboveFloor + catchmentGround(xr, z, p.fall / d.run) - y) * wc;
    return y;
  };
  return { staticPart, height };
}

// ------------------------------------------------------------------------------------------------ delivery route

export interface RoutePoint {
  x: number;
  y: number;
  z: number;
}

/** Plan points of the delivery route sampled every ~1.5 m: from the ram outlet stub, east through the pit wall, up the hill. */
export function routePlan(): { x: number; z: number }[] {
  const pts: [number, number][] = [[PIT_X + 0.7, 0], ...DELIVERY_ROUTE.map(([x, z]) => [x, z] as [number, number])];
  // Catmull-Rom through the waypoints for rounded switchbacks
  const out: { x: number; z: number }[] = [];
  const n = pts.length;
  const at = (i: number) => pts[Math.min(n - 1, Math.max(0, i))];
  for (let i = 0; i < n - 1; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const seg = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const steps = Math.max(2, Math.round(seg / 1.5));
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0[0], p1[0], p2[0], p3[0]), z: f(p0[1], p1[1], p2[1], p3[1]) });
    }
  }
  out.push({ x: pts[n - 1][0], z: pts[n - 1][1] });
  return out;
}

/** The sampled delivery route in 3D, lying on the ground (the pipe axis a pipe radius above it). */
export function routeHeights(plan: { x: number; z: number }[], ground: Ground, p: SiteParams): RoutePoint[] {
  const r = SITE.deliveryOuterDiameter / 2;
  const out: RoutePoint[] = [];
  let s = 0;
  for (let i = 0; i < plan.length; i++) {
    const a = plan[i];
    if (i > 0) s += Math.hypot(a.x - plan[i - 1].x, a.z - plan[i - 1].z);
    const g = ground.height(a.x, a.z, p);
    // buried near the pit (cover decreasing over the first 9 m), then on the surface
    const cover = Math.max(0, GROUND_PIT - CHAMBER.outletHeight) * (1 - smoothstep(1, 10, s));
    out.push({ x: a.x, z: a.z, y: Math.max(g + r - cover, CHAMBER.outletHeight) });
  }
  return out;
}

export function polylineLength(pts: RoutePoint[]): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) {
    L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y, pts[i].z - pts[i - 1].z);
  }
  return L;
}
