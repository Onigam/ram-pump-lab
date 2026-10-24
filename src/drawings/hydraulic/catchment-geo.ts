// The derived coordinates of the catchment, from the 3D world's layout (src/three/catchment/layout.ts), re-exported with the
// few constants of the tank's fittings that the 3D builds inside its meshes (the gate valve starts 68 mm outside the shell).
export {
  BED_FLOOR_Y,
  BED_TOP_Y,
  BED_X0,
  BED_X1,
  BEND_X,
  BENCH_Y,
  BOX_FLOOR_Y,
  BOX_HL,
  BOX_HW,
  BOX_OHL,
  BOX_OHW,
  BOX_RIM_Y,
  BOX_SLAB_BOTTOM,
  BOX_T,
  BOX_WATER_Y,
  FEED_X0,
  FEED_Y0,
  H_FULL,
  H_LID,
  H_SHELL,
  OUT_X,
  OUT_Y,
  R,
  R_OUT,
  SHELF_Y,
  SLAB_BOTTOM,
  SLAB_R,
  SLAB_TOP,
  SPRING_X,
  feedY,
  groundY,
} from '../../three/catchment/layout';

/** Distance between the outer face of the shell and the start of the body of the drive gate valve, m (tank.ts: `GATE_X0 = R_OUT + 0.068`). */
export const GATE_X_OFFSET = 0.068;
