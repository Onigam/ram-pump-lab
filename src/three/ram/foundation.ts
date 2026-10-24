import * as THREE from 'three';
import { MAT, group, mesh } from '@onigam/lab-kit/three';
import { FOUNDATION, RAM } from '../dims';
import { hexNut } from '../common';
import type { RamCtx } from './ctx';
import { FOOT_X } from './body';
import { EXPLODE } from './explode';

// The anchor block: a pad of poured concrete under the two cast feet, with the four anchor studs cast in it. Each stud goes
// through a lug of a foot and carries a washer and a nut on it: the ram is bolted down, because the hammer pressures reach
// several bar (research §7). Top face = `RAM.floorY`, where the feet stand.

/** Lowest point of the ram world: the underside of the foundation (the floor of the world). */
export const FOUNDATION_BOTTOM = RAM.floorY - FOUNDATION.thickness;
/** Top of the foot lugs: the washers sit here. */
const LUG_TOP = RAM.floorY + 0.012;

export function buildFoundation(ctx: RamCtx): void {
  const g = group('foundation');
  const concrete = MAT.concrete();
  concrete.color.multiplyScalar(0.8); // poured concrete, a little darker than the paper floor it stands on
  // the pit of the site world also has a plinth with the same top: this pad wins the tie, so nothing flickers
  concrete.polygonOffset = true;
  concrete.polygonOffsetFactor = -1;
  concrete.polygonOffsetUnits = -1;
  const L = FOUNDATION.length;
  const W = FOUNDATION.width;
  const c = FOUNDATION.chamfer;
  // pad: a rectangle extruded up, its top edge chamfered (the bevel also chamfers the bottom, which sits on the floor)
  const shape = new THREE.Shape();
  const hx = L / 2 - c;
  const hz = W / 2 - c;
  shape.moveTo(-hx, -hz);
  shape.lineTo(hx, -hz);
  shape.lineTo(hx, hz);
  shape.lineTo(-hx, hz);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: FOUNDATION.thickness - 2 * c,
    bevelEnabled: true,
    bevelThickness: c,
    bevelSize: c,
    bevelSegments: 1,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(RAM.bodyLength / 2, FOUNDATION_BOTTOM + c, 0);
  const pad = mesh(geo, concrete);
  g.add(pad);

  const steel = MAT.steelBlack();
  const zinc = MAT.zinc();
  for (const fx of FOOT_X) {
    for (const dz of [-FOUNDATION.studOffsetZ, FOUNDATION.studOffsetZ]) {
      const top = RAM.floorY + FOUNDATION.studHeight;
      const bottom = RAM.floorY - FOUNDATION.studEmbed;
      const r = FOUNDATION.studRadius;
      g.add(mesh(new THREE.CylinderGeometry(r, r, top - bottom, 14), steel, [fx, (top + bottom) / 2, dz]));
      const w = mesh(
        new THREE.CylinderGeometry(
          FOUNDATION.washerDiameter / 2,
          FOUNDATION.washerDiameter / 2,
          FOUNDATION.washerThickness,
          24,
        ),
        zinc,
        [fx, LUG_TOP + FOUNDATION.washerThickness / 2, dz],
      );
      g.add(w);
      g.add(
        mesh(hexNut(FOUNDATION.nutAcrossFlats, FOUNDATION.nutThickness, 0), zinc, [
          fx,
          LUG_TOP + FOUNDATION.washerThickness,
          dz,
        ]),
      );
    }
  }
  ctx.anchor('foundation', g, RAM.bodyLength / 2 + L / 2 - 0.06, RAM.floorY - 0.012, W / 2);
  ctx.add('foundation', g, EXPLODE.foundation);
}
