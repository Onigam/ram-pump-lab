import * as THREE from 'three';
import { MAT, group, mesh } from '@onigam/lab-kit/three';
import { INLET, RAM, SITE } from '../dims';
import { lathe } from '../common';
import { ballValve, flangeBolts, flangeX } from './fit';
import { v3, type RamCtx } from './ctx';

// Upstream of the body: the inlet valve V1 (flanged brass ball valve), the cast Y-strainer and a short stub of the
// drive pipe that stands for the 20 m of pipe coming from the tank. Bolts have their heads on the upstream flange.

const FLANGE_R = INLET.flangeDiameter / 2;
const FT = INLET.flangeThickness;
/** Bolt circle radius of the DN25 flanges. */
const BC = 0.0425;
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
  v1.add(flangeBolts(-FT, BC, 4, 0.004, 0.032, 0.013, 0.007, dark));
  ctx.anchor('inlet-valve', v1, V1_X0 + INLET.valveLength / 2, 0.075, 0);
  ctx.add('inlet-valve', v1, v3(-0.14, 0, 0));

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
  st.add(flangeBolts(S_X0 + INLET.strainerLength - FT, BC, 4, 0.004, 0.032, 0.013, 0.007, dark));
  // stub of the drive pipe: flange, galvanised steel pipe, open end
  const stubFlangeX = S_X0 - FT;
  st.add(flangeX(stubFlangeX, FT, FLANGE_R, SITE.driveOuterDiameter / 2, zinc));
  st.add(flangeBolts(stubFlangeX, BC, 4, 0.004, 0.032, 0.013, 0.007, dark));
  const pr = SITE.driveOuterDiameter / 2;
  const pipe = mesh(
    lathe(
      [
        [
          [pr, 0],
          [pr, RAM.driveStubLength + FT],
        ],
        [
          [pr, RAM.driveStubLength + FT],
          [SITE.driveBore / 2, RAM.driveStubLength + FT],
        ],
        [
          [SITE.driveBore / 2, RAM.driveStubLength + FT],
          [SITE.driveBore / 2, 0],
        ],
      ],
      32,
    ),
    zinc,
  );
  pipe.rotation.z = -Math.PI / 2;
  pipe.position.x = STUB_X0;
  st.add(pipe);
  ctx.anchor('strainer', st, cx, 0.05, 0.03);
  ctx.add('strainer', st, v3(-0.3, 0, 0));
}
