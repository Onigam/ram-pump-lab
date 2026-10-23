import * as THREE from 'three';
import { CHAMBER, FITTINGS, RAM, TOWER } from '../dims';
import { CH } from '../ram/chamber';
import { routeHeights, routePlan, type SiteParams } from './layout';
import type { Terrain } from './terrain';

// Paths of the site that follow the ground: the delivery pipe, from the end of the ram's outlet stub to its end over the
// receiving trough of the tower, and the stream of the waste water below the pit.

/** Where the delivery pipe starts: the end of the PE stub of the ram's outlet (ram frame = site frame). */
export const OUT_X = RAM.xDelivery + CH.R + 0.009 + 0.04 + FITTINGS.smallBallValveLength + FITTINGS.outletStubLength;

/** Points of the delivery pipe: ram stub, the route on the ground, the riser up the tower and the gooseneck over the trough. */
export function deliveryPolyline(terrain: Terrain, p: SiteParams): THREE.Vector3[] {
  const route = routeHeights(routePlan(), terrain.ground, p);
  const pts: THREE.Vector3[] = [new THREE.Vector3(OUT_X, CHAMBER.outletHeight, 0)];
  for (const a of route) pts.push(new THREE.Vector3(a.x, a.y, a.z));
  const tx = TOWER.planX;
  const tz = TOWER.planZ;
  const ty = p.head - TOWER.groundBelowInlet;
  const top = ty + TOWER.groundBelowInlet;
  const rx = tx + TOWER.riserX;
  const rz = tz + TOWER.riserZ;
  const last = pts[pts.length - 1];
  pts.push(
    new THREE.Vector3(rx, last.y + 0.3, rz),
    new THREE.Vector3(rx, top - 0.4, rz),
    new THREE.Vector3(rx, top + 1.1, rz),
    new THREE.Vector3(tx + 1.7, top + 1.3, tz + 0.35),
    new THREE.Vector3(tx + 0.9, top + 1.25, tz - 0.35),
    new THREE.Vector3(tx + TOWER.troughX, top + 1.05, tz + TOWER.troughZ),
    new THREE.Vector3(tx + TOWER.troughX, top + TOWER.pipeEndAboveLid, tz + TOWER.troughZ),
  );
  return pts;
}

/** Evenly spaced points along a smooth curve through `pts` (for the flow dots). */
export function spaced(pts: THREE.Vector3[], step: number): THREE.Vector3[] {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  return curve.getSpacedPoints(Math.max(4, Math.round(curve.getLength() / step)));
}

/**
 * Where the buried drain of the pit daylights (the first place where the ground is lower than the pipe, falling 2 %), and
 * the stream that follows the steepest descent from there.
 */
export function wasteStream(terrain: Terrain, drainStart: THREE.Vector3, count: number) {
  const x0 = drainStart.x;
  let z0 = drainStart.z;
  while (z0 < 40 && terrain.surfaceY(x0, z0) > drainStart.y - 0.02 * (z0 - drainStart.z) + 0.25) z0 += 0.5;
  const outfall = new THREE.Vector3(x0, terrain.surfaceY(x0, z0) + 0.05, z0);
  const points: THREE.Vector3[] = [];
  let sx = x0;
  let sz = z0 + 0.3;
  let dirX = 0;
  let dirZ = 1;
  for (let i = 0; i < count; i++) {
    points.push(new THREE.Vector3(sx, terrain.surfaceY(sx, sz) + 0.04, sz));
    const e = 1.2;
    let nx = -(terrain.surfaceY(sx + e, sz) - terrain.surfaceY(sx - e, sz));
    let nz = -(terrain.surfaceY(sx, sz + e) - terrain.surfaceY(sx, sz - e));
    const len = Math.hypot(nx, nz) || 1;
    nx /= len;
    nz /= len;
    dirX = dirX * 0.7 + nx * 0.3;
    dirZ = dirZ * 0.7 + nz * 0.3;
    const dl = Math.hypot(dirX, dirZ) || 1;
    dirX /= dl;
    dirZ /= dl;
    sx += dirX * 1.1;
    sz += dirZ * 1.1;
  }
  return { outfall, points };
}

/** Write a ribbon (two vertices per point, `width` growing along it) into a position attribute, relative to `origin`. */
export function writeRibbon(attr: THREE.BufferAttribute, points: THREE.Vector3[], origin: THREE.Vector3): void {
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(n - 1, i + 1)];
    const tx = b.x - a.x;
    const tz = b.z - a.z;
    const tl = Math.hypot(tx, tz) || 1;
    const w = 0.09 + 0.2 * (i / n);
    const nx = -tz / tl;
    const nz = tx / tl;
    const p = points[i];
    attr.setXYZ(i * 2, p.x + nx * w - origin.x, p.y - origin.y, p.z + nz * w - origin.z);
    attr.setXYZ(i * 2 + 1, p.x - nx * w - origin.x, p.y - origin.y, p.z - nz * w - origin.z);
  }
  attr.needsUpdate = true;
}
