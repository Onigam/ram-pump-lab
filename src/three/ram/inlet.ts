import * as THREE from 'three';
import { MAT, group, mesh } from '@onigam/lab-kit/three';
import { INLET, RAM, SITE } from '../dims';
import { lathe, type Profile } from '../common';
import { ballValve, flangeBolts } from './fit';
import type { RamCtx } from './ctx';
import { EXPLODE } from './explode';

// Upstream of the body: the inlet valve V1 (flanged brass ball valve), the cast Y-strainer and, bolted to the strainer, the
// inlet flange where the drive pipe arrives (a short stub of pipe that stands for the 20 m coming from the tank, its flange,
// the gasket and the four bolts). Bolts have their heads on the upstream face of each flange.

const FLANGE_R = INLET.flangeDiameter / 2;
const FT = INLET.flangeThickness;
/** Bolt circle radius of the DN25 flanges, and the bolts. */
const BC = INLET.boltCircleRadius;
const BOLT = [INLET.boltRadius, INLET.boltLength, INLET.boltHeadAcrossFlats, INLET.boltHeadThickness] as const;
/** x of the faces: V1 occupies [V1_X0, 0], the strainer [S_X0, V1_X0], the stub flange touches the strainer. */
export const V1_X0 = -INLET.valveLength;
export const S_X0 = V1_X0 - INLET.strainerLength;
export const STUB_X0 = S_X0 - FT - RAM.driveStubLength;

export function buildInlet(ctx: RamCtx): void {
  const brass = MAT.brass();
  const steel = MAT.steel();
  const dark = MAT.steelBlack();
  const zinc = MAT.zinc();

  // ---- inlet valve V1
  const v1 = group('inlet-valve');
  const valve = ballValve({
    length: INLET.valveLength,
    endR: 0.03,
    bulgeR: 0.041,
    bulgeLen: 0.052,
    flangeR: FLANGE_R,
    flangeT: FT,
    body: brass,
    steel,
    grip: MAT.pvcRed(),
  });
  valve.position.x = V1_X0;
  v1.add(valve);
  // bolts joining V1 to the body flange: heads on the V1 flange face, shanks into the tapped body flange
  v1.add(flangeBolts(-FT, BC, 4, ...BOLT, dark));
  ctx.anchor('inlet-valve', v1, V1_X0 + INLET.valveLength / 2, 0.075, 0);
  ctx.add('inlet-valve', v1, EXPLODE['inlet-valve']);

  // ---- strainer and the stub of the drive pipe
  const st = group('strainer');
  const cast = MAT.steel();
  const run = mesh(
    lathe(
      [
        [
          [0.0255, 0],
          [FLANGE_R, 0],
        ],
        [
          [FLANGE_R, 0],
          [FLANGE_R, FT],
        ],
        [
          [FLANGE_R, FT],
          [0.0335, FT],
          [0.036, FT + 0.03],
          [0.036, INLET.strainerLength - FT - 0.03],
          [0.0335, INLET.strainerLength - FT],
          [FLANGE_R, INLET.strainerLength - FT],
        ],
        [
          [FLANGE_R, INLET.strainerLength - FT],
          [FLANGE_R, INLET.strainerLength],
        ],
        [
          [FLANGE_R, INLET.strainerLength],
          [0.0255, INLET.strainerLength],
        ],
        [
          [0.0255, INLET.strainerLength],
          [0.0255, 0],
        ],
      ],
      48,
    ),
    cast,
  );
  run.rotation.z = -Math.PI / 2;
  run.position.x = S_X0;
  st.add(run);
  // the screen holder at 45° downstream and its cap
  const cx = S_X0 + INLET.strainerLength / 2;
  const arm = group('arm');
  arm.position.set(cx, 0, 0);
  arm.rotation.z = (-135 * Math.PI) / 180;
  arm.add(mesh(new THREE.CylinderGeometry(0.026, 0.028, 0.07, 32), cast, [0, 0.035, 0]));
  arm.add(mesh(new THREE.CylinderGeometry(0.0305, 0.0305, 0.012, 6), brass, [0, 0.076, 0]));
  arm.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.012, 24), brass, [0, 0.088, 0]));
  st.add(arm);
  // flange bolts (strainer to V1, stub to strainer)
  st.add(flangeBolts(S_X0 + INLET.strainerLength - FT, BC, 4, ...BOLT, dark));
  ctx.anchor('strainer', st, cx, 0.05, 0.03);
  ctx.add('strainer', st, EXPLODE.strainer);

  // ---- inlet flange: pipe flange welded on the stub, fibre gasket, four bolts into the strainer's flange
  const fl = group('inlet-flange');
  const gasket = INLET.gasketThickness;
  const flangeX0 = S_X0 - FT; // upstream face of the pipe flange
  const flangeT = FT - gasket;
  const pr = SITE.driveOuterDiameter / 2;
  const pipeLength = RAM.driveStubLength + FT - gasket;
  // flange disc with its weld-neck hub (the cone that carries the pipe into the flange), all galvanised steel
  const flangeRuns: Profile[] = [
    [
      [pr, 0],
      [FLANGE_R, 0],
    ],
    [
      [FLANGE_R, 0],
      [FLANGE_R, flangeT],
    ],
    [
      [FLANGE_R, flangeT],
      [pr, flangeT],
    ],
    // hub: a cone from the pipe to the flange face, upstream of the flange (negative x in the pipe frame)
    [
      [pr, -INLET.weldCollarHeight],
      [pr + 0.008, 0],
    ],
  ];
  const flange = mesh(lathe(flangeRuns, 56), zinc);
  flange.rotation.z = -Math.PI / 2;
  flange.position.x = flangeX0;
  fl.add(flange);
  const pipe = mesh(
    lathe(
      [
        [
          [pr, 0],
          [pr, pipeLength],
        ],
        [
          [pr, pipeLength],
          [SITE.driveBore / 2, pipeLength],
        ],
        [
          [SITE.driveBore / 2, pipeLength],
          [SITE.driveBore / 2, 0],
        ],
        // the cut end of the stub (the pipe goes on for 20 m): its wall has a thickness
        [
          [SITE.driveBore / 2, 0],
          [pr, 0],
        ],
      ],
      32,
    ),
    zinc,
  );
  pipe.rotation.z = -Math.PI / 2;
  pipe.position.x = STUB_X0;
  fl.add(pipe);
  fl.add(gasketRing(S_X0 - gasket, gasket, FLANGE_R));
  fl.add(flangeBolts(flangeX0, BC, 4, ...BOLT, dark));
  // low on the rim: the strainer and V1 labels are above, so that the three never overlap
  ctx.anchor('inlet-flange', fl, flangeX0 + flangeT / 2, -FLANGE_R * 0.9, 0.012);
  ctx.add('inlet-flange', fl, EXPLODE['inlet-flange']);
}

/** Full-face fibre gasket (axis X) with the bore of the pipe and the four bolt holes, from x0 to x0 + t. */
function gasketRing(x0: number, t: number, outerR: number): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerR, 0, Math.PI * 2, false);
  const bore = new THREE.Path();
  bore.absarc(0, 0, SITE.driveBore / 2, 0, Math.PI * 2, true);
  shape.holes.push(bore);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    // the shape plane (sx, sy) becomes (z = -sx, y = sy) once the extrusion axis is turned to X
    const h = new THREE.Path();
    h.absarc(-BC * Math.sin(a), BC * Math.cos(a), INLET.boltRadius + 0.0007, 0, Math.PI * 2, true);
    shape.holes.push(h);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 40 });
  geo.rotateY(Math.PI / 2);
  const m = mesh(geo, MAT.printCream());
  m.position.x = x0;
  return m;
}
