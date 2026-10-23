import * as THREE from 'three';
import { MAT, group, mesh } from '@onigam/lab-kit/three';
import { RAM } from '../dims';
import { lathe } from '../common';
import { rect, type Poly } from '../cut';
import { boltY } from './fit';
import { v3, type RamCtx } from './ctx';

// The cast-iron body: a horizontal tube with flanges, three bosses on top (waste valve, snifter, delivery valve), two
// cast feet and a blind cover at the drain end. Hollow, so that the section shows the walls and the water.

export const BODY_TOP = RAM.bodyOuterRadius;
/** Vertical position of the drain on the end cover. */
export const DRAIN_Y = -0.022;
const FOOT_X = [RAM.bodyLength / 2 - RAM.footSpacing / 2, RAM.bodyLength / 2 + RAM.footSpacing / 2];
const COVER_T = 0.014;
/** x of the outer face of the drain boss, where the drain valve starts. */
export const COVER_END = RAM.bodyLength + COVER_T + 0.02 - 0.004;
const WASTE_BORE = 0.013;
const DELIVERY_BORE = 0.011;
const DELIVERY_THREAD = 0.0135;
const SNIFTER_BORE = 0.0045;

/** Square plate with a round hole, standing on Y from y0 to y0 + t, centred on (cx, cz). */
export function squarePlate(side: number, t: number, holeR: number, y0: number): THREE.BufferGeometry {
  const s = side / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-s, -s);
  shape.lineTo(s, -s);
  shape.lineTo(s, s);
  shape.lineTo(-s, s);
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, holeR, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 24 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  return g;
}

/** Hollow boss on Y: outer radius, bore profile (r, y) from top to bottom, from y0 to y1. */
function boss(rOut: number, y0: number, y1: number, bore: [number, number][]): THREE.BufferGeometry {
  return lathe(
    [
      [
        [rOut, y0],
        [rOut, y1],
      ],
      [
        [rOut, y1],
        [bore[0][0], y1],
      ],
      bore,
      [
        [bore[bore.length - 1][0], y0],
        [rOut, y0],
      ],
    ],
    40,
  );
}

export function buildBody(ctx: RamCtx): THREE.Group {
  const g = group('ram');
  const steel = MAT.steel();
  const dark = MAT.steelBlack();
  const R = RAM.bodyOuterRadius;
  const r = RAM.bodyInnerRadius;
  const L = RAM.bodyLength;
  const fR = RAM.flangeDiameter / 2;
  const ft = RAM.flangeThickness;
  const { xWaste, xSnifter, xDelivery } = RAM;

  // main tube, axis X
  const tube = mesh(
    lathe(
      [
        [
          [r, 0],
          [fR, 0],
        ],
        [
          [fR, 0],
          [fR, ft],
        ],
        [
          [fR, ft],
          [R, ft],
        ],
        [
          [R, ft],
          [R, L - ft],
        ],
        [
          [R, L - ft],
          [fR, L - ft],
        ],
        [
          [fR, L - ft],
          [fR, L],
        ],
        [
          [fR, L],
          [r, L],
        ],
        [
          [r, L],
          [r, 0],
        ],
      ],
      64,
    ),
    steel,
  );
  tube.rotation.z = -Math.PI / 2;
  g.add(tube);

  // blind cover at the drain end, with four bolts into the flange, and the drain boss
  const cover = mesh(new THREE.CylinderGeometry(fR, fR, COVER_T, 48), steel, [L + COVER_T / 2, 0, 0]);
  cover.rotation.z = Math.PI / 2;
  g.add(cover);
  const drainBoss = mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.02, 24), steel, [L + COVER_T + 0.01, DRAIN_Y, 0]);
  drainBoss.rotation.z = Math.PI / 2;
  g.add(drainBoss);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const b = boltY(0.004, 0.026, 0.013, 0.007, dark);
    b.rotation.z = Math.PI / 2;
    b.position.set(L + COVER_T, 0.0425 * Math.cos(a), 0.0425 * Math.sin(a));
    g.add(b);
  }

  // waste valve branch: boss and square flange (the base plate sits on it)
  g.add(
    mesh(
      boss(0.031, 0.02, RAM.wasteFlangeTop - 0.012, [
        [WASTE_BORE, RAM.wasteFlangeTop - 0.012],
        [WASTE_BORE, 0.02],
      ]),
      steel,
      [xWaste, 0, 0],
    ),
  );
  g.add(mesh(squarePlate(RAM.wasteFlangeSide, 0.012, WASTE_BORE, RAM.wasteFlangeTop - 0.012), steel, [xWaste, 0, 0]));

  // delivery branch: boss with the thread pocket of the check valve
  g.add(
    mesh(
      boss(0.034, 0.02, 0.062, [
        [DELIVERY_THREAD, 0.062],
        [DELIVERY_THREAD, 0.05],
        [DELIVERY_BORE, 0.049],
        [DELIVERY_BORE, 0.02],
      ]),
      steel,
      [xDelivery, 0, 0],
    ),
  );
  // snifter branch
  g.add(
    mesh(
      boss(0.012, 0.02, 0.05, [
        [SNIFTER_BORE, 0.05],
        [SNIFTER_BORE, 0.02],
      ]),
      steel,
      [xSnifter, 0, 0],
    ),
  );

  // cast feet, each with a lug bolted to the slab
  const floor = RAM.floorY;
  for (const fx of FOOT_X) {
    const h = -R + 0.006 - (floor + 0.012);
    g.add(mesh(new THREE.BoxGeometry(0.06, h, 0.08), steel, [fx, floor + 0.012 + h / 2, 0]));
    g.add(mesh(new THREE.BoxGeometry(0.11, 0.012, 0.13), steel, [fx, floor + 0.006, 0]));
    for (const dz of [-0.052, 0.052]) {
      const b = boltY(0.005, 0.012, 0.016, 0.007, dark);
      b.position.set(fx, floor + 0.012, dz);
      g.add(b);
    }
  }

  // ---- section caps (the plane z = 0)
  const polys: Poly[] = [];
  const gaps: [number, number][] = [
    [xWaste - WASTE_BORE, xWaste + WASTE_BORE],
    [xSnifter - SNIFTER_BORE, xSnifter + SNIFTER_BORE],
    [xDelivery - DELIVERY_BORE, xDelivery + DELIVERY_BORE],
  ];
  // top wall between the flanges, interrupted by the three branch bores
  let x: number = ft;
  for (const [a, b] of gaps) {
    polys.push(rect(x, r, a, R + 0.0005));
    x = b;
  }
  polys.push(rect(x, r, L - ft, R + 0.0005));
  polys.push(rect(ft, -R - 0.0005, L - ft, -r));
  // flanges and the blind cover
  for (const fx0 of [0, L - ft]) {
    polys.push(rect(fx0, r, fx0 + ft, fR), rect(fx0, -fR, fx0 + ft, -r));
  }
  polys.push(rect(L, -fR, L + COVER_T, fR), rect(L + COVER_T, DRAIN_Y - 0.017, L + COVER_T + 0.02, DRAIN_Y + 0.017));
  // bosses
  const wallBoss = (cx: number, rOut: number, rBore: number, y0: number, y1: number) => {
    polys.push(rect(cx - rOut, y0, cx - rBore, y1), rect(cx + rBore, y0, cx + rOut, y1));
  };
  wallBoss(xWaste, 0.031, WASTE_BORE, 0.03, RAM.wasteFlangeTop - 0.012);
  const fl = RAM.wasteFlangeSide / 2;
  polys.push(
    rect(xWaste - fl, RAM.wasteFlangeTop - 0.012, xWaste - WASTE_BORE, RAM.wasteFlangeTop),
    rect(xWaste + WASTE_BORE, RAM.wasteFlangeTop - 0.012, xWaste + fl, RAM.wasteFlangeTop),
  );
  wallBoss(xDelivery, 0.034, DELIVERY_BORE, 0.03, 0.049);
  wallBoss(xDelivery, 0.034, DELIVERY_THREAD, 0.049, 0.062);
  wallBoss(xSnifter, 0.012, SNIFTER_BORE, 0.03, 0.05);
  // feet
  for (const fx of FOOT_X) {
    polys.push(
      rect(fx - 0.03, floor + 0.012, fx + 0.03, -R + 0.004),
      rect(fx - 0.055, floor, fx + 0.055, floor + 0.012),
    );
  }
  ctx.cut.clip(tube); // the material of the cast iron is shared by all its meshes; the bolts have their own
  ctx.cut.cap('ram', g, polys);

  ctx.anchor('ram', g, 0.3, 0.0, 0.05);
  ctx.add('ram', g, v3(0, 0.004, 0));
  return g;
}
