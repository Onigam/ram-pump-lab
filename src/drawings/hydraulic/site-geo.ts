import * as THREE from 'three';
import { DELIVERY_ROUTE, HOUSE, PIT, SITE, TOWER } from '../../three/dims';
import { DEFAULT_PARAMS, PIT_X, createGround, driveGeometry, tankAxisX } from '../../three/site/layout';
import { deliveryPolyline, wasteStream } from '../../three/site/routes';
import type { Terrain } from '../../three/site/terrain';

// The geometry of the site as the 3D `site` world has it, for the plan (D11) and the profile (D12): the ground height
// function, the drive pipe, the delivery pipe with its bends, and the waste-water drain. Everything comes from
// src/three/site (layout, routes) and dims.ts, so the sheets and the 3D agree by construction. The terrain is the lab's
// reconstruction of a hillside, not a survey.

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Bend {
  /** 1 … n, in the order of the pipe from the ram. */
  n: number;
  x: number;
  z: number;
  /** Elevation of the pipe axis, m above the ram datum. */
  y: number;
  /** Length of pipe from the ram outlet to the bend, m. */
  s: number;
  /** Change of direction in plan, degrees (positive = to the right looking along the pipe). */
  turn: number;
}

export interface SiteGeo {
  height(x: number, z: number): number;
  /** Axis of the buffer tank (site frame, x), and the drive pipe. */
  tankX: number;
  drive: ReturnType<typeof driveGeometry>;
  /** Delivery pipe axis, from the ram outlet stub to the end over the trough of the tower, with the length along it. */
  pipe: (Vec3 & { s: number })[];
  /** Length of the delivery pipe as the 3D draws it (the same Catmull-Rom length), m. */
  pipeLength: number;
  /** Where the delivery pipe starts climbing the riser of the tower: index in `pipe`. */
  riserIndex: number;
  bends: Bend[];
  waste: { start: Vec3; outfall: Vec3; stream: Vec3[]; soakaway: { x: number; z: number } };
}

let cache: SiteGeo | undefined;

export function siteGeo(): SiteGeo {
  if (cache) return cache;
  const ground = createGround();
  const params = DEFAULT_PARAMS;
  const height = (x: number, z: number): number => ground.height(x, z, params);
  const terrain = { ground, surfaceY: height } as unknown as Terrain;
  const drive = driveGeometry(params);
  // delivery pipe: the very polyline of the 3D world, resampled by the same Catmull-Rom curve for its length
  const pts = deliveryPolyline(terrain, params);
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const pipeLength = curve.getLength();
  const n = Math.max(200, Math.round(pipeLength / 1.5));
  const sampled = curve.getSpacedPoints(n);
  const pipe = sampled.map((q, i) => ({ x: q.x, y: q.y, z: q.z, s: (pipeLength * i) / n }));
  // the bends: the waypoints of DELIVERY_ROUTE, found on the pipe by their plan position
  const wp: [number, number][] = [...DELIVERY_ROUTE.map(([x, z]) => [x, z] as [number, number])];
  const riserIndex = pipe.findIndex(
    (q, i) =>
      i > 0 && Math.abs(q.x - (TOWER.planX + TOWER.riserX)) < 0.6 && Math.abs(q.z - (TOWER.planZ + TOWER.riserZ)) < 0.6,
  );
  const bends: Bend[] = [];
  wp.slice(0, -1).forEach(([x, z], k) => {
    let best = 0;
    let bd = Infinity;
    pipe.forEach((q, i) => {
      const d = Math.hypot(q.x - x, q.z - z);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    const a = (wp[k - 1] ?? [PIT_X + 0.7, 0]) as [number, number];
    const b = wp[k + 1] as [number, number];
    const a1 = Math.atan2(z - a[1], x - a[0]);
    const a2 = Math.atan2(b[1] - z, b[0] - x);
    let turn = ((a2 - a1) * 180) / Math.PI;
    while (turn > 180) turn -= 360;
    while (turn < -180) turn += 360;
    const q = pipe[best] as Vec3 & { s: number };
    bends.push({ n: k + 1, x, z, y: q.y, s: q.s, turn });
  });
  // waste-water drain: from the pit's drain pipe, buried, then daylighting into a ditch that follows the steepest slope
  const start = new THREE.Vector3(PIT_X + 0.9, PIT.floorY + 0.07, PIT.innerWidth / 2 + PIT.wall + 0.35);
  const count = 15;
  const ws = wasteStream(terrain, start, count);
  const stream = ws.points.map((q) => ({ x: q.x, y: q.y, z: q.z }));
  const last = stream[stream.length - 1] as Vec3;
  const prev = stream[stream.length - 2] as Vec3;
  const dl = Math.hypot(last.x - prev.x, last.z - prev.z) || 1;
  const r = 0.85 - 0.15;
  const soakaway = { x: last.x + ((last.x - prev.x) / dl) * r, z: last.z + ((last.z - prev.z) / dl) * r };
  cache = {
    height,
    tankX: tankAxisX(drive),
    drive,
    pipe,
    pipeLength,
    riserIndex: riserIndex < 0 ? pipe.length - 1 : riserIndex,
    bends,
    waste: {
      start: { x: start.x, y: start.y, z: start.z },
      outfall: { x: ws.outfall.x, y: ws.outfall.y, z: ws.outfall.z },
      stream,
      soakaway,
    },
  };
  return cache;
}

/** Ground level of the house terrace and of the tower (derived in layout.ts). */
export const TERRACE = HOUSE.terraceFraction * SITE.deliveryHead;
export const TOWER_GROUND = SITE.deliveryHead - TOWER.groundBelowInlet;
