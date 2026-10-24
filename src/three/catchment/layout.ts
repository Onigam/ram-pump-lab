import { CATCHMENT as C, SITE, SPRING, TANK } from '../dims';
import { smoothstep } from '../common';

// Derived coordinates of the catchment world, all from dims.ts. Frames: the TANK frame has its origin on the axis of the tank at
// the level of its inner floor (X east and downhill, Y up, Z south); the SPRING frame is the same shifted west by
// `SPRING.distanceToTank` (its origin is the centre of the spring box). The site uses the same two frames for the same
// groups, so the catchment of the site is the catchment of this world.

// ------------------------------------------------------------------------------------------------ tank
/** Inner radius, outer radius of the shell. */
export const R = TANK.diameter / 2;
export const R_OUT = R + TANK.wall;
/** Water height at the overflow (the 100 % level), top of the shell, top of the lid. */
export const H_FULL = TANK.height;
export const H_SHELL = TANK.height + TANK.freeboard;
export const H_LID = H_SHELL + TANK.lidThickness;
/** The floor plate under the inner floor, the slab under it. */
export const SLAB_TOP = -TANK.wall;
export const SLAB_BOTTOM = SLAB_TOP - TANK.slabThickness;
export const SLAB_R = R_OUT + TANK.slabOverhang;
/** The bench the tank stands on. */
export const BENCH_Y = -C.benchDepth;
/** Axis of the drive pipe at the outlet, and the end of the outlet assembly where the drive pipe starts. */
export const OUT_Y = TANK.outletAboveFloor;
export const OUT_X = R + TANK.outletLength;
/** Where the drive pipe leaves its level run on the bench and goes down the slope. */
export const BEND_X = OUT_X + SITE.driveStartRun;

// ------------------------------------------------------------------------------------------------ spring side (SPRING frame)
/** Half sizes of the box inside, wall, outer half sizes. */
export const BOX_HL = SPRING.basinLength / 2;
export const BOX_HW = SPRING.basinWidth / 2;
export const BOX_T = SPRING.basinWall;
export const BOX_OHL = BOX_HL + BOX_T;
export const BOX_OHW = BOX_HW + BOX_T;
/** Ground at the box (the shelf), floor and rim of the box (heights above the tank floor). */
export const SHELF_Y = C.shelfHeight;
export const BOX_FLOOR_Y = SHELF_Y - (SPRING.basinDepth - SPRING.boxRim);
export const BOX_RIM_Y = BOX_FLOOR_Y + SPRING.basinDepth;
export const BOX_SLAB_BOTTOM = BOX_FLOOR_Y - SPRING.boxFloor;
/** Water surface in the box. */
export const BOX_WATER_Y = BOX_FLOOR_Y + C.boxWaterLevel;
/** The gravel bed: x from `BED_X0` (rock side) to `BED_X1` (against the west wall of the box), in the SPRING frame. */
export const BED_X1 = -BOX_OHL;
export const BED_X0 = BED_X1 - C.filterLength;
export const BED_FLOOR_Y = BOX_FLOOR_Y;
export const BED_TOP_Y = SHELF_Y + C.filterTop;
/** The feed pipe leaves the box at ground level; it falls at `feedFall` all the way to the tank. */
export const FEED_X0 = BOX_HL - 0.15 - C.boxStrainerLength; // far end of the strainer, inside the box (SPRING frame)
export const FEED_Y0 = SHELF_Y;
/** Distance between the axis of the tank and the box (the SPRING frame origin lies this far west). */
export const SPRING_X = -SPRING.distanceToTank;

/** Height of the axis of the feed pipe at x of the SPRING frame (straight line from the strainer to the lid inlet). */
export const feedY = (xs: number): number => FEED_Y0 - C.feedFall * (xs - FEED_X0);

// ------------------------------------------------------------------------------------------------ ground

/** Half length of the round-off of the corner where the drive pipe leaves its level run for the slope (the pipe is bent over it). */
export const CORNER = 0.45;

/**
 * Round-off of the corner between the level bench and the slope: 0 before the corner, `t` (the line of the slope) after it, and
 * a parabola tangent to both lines over `±CORNER` (so the ground follows the pipe's slope exactly, with no lag).
 */
export const softRamp = (t: number): number => (t <= -CORNER ? 0 : t >= CORNER ? t : (t + CORNER) ** 2 / (4 * CORNER));

/** Rise of the ground on the north (back) side of the upland, so that the block is not a flat slab. */
const upland = (z: number): number => 0.35 * smoothstep(1.0, 4.6, -z);

/**
 * Height of the ground along the slope, in the TANK frame: the upland shelf (2 % grade towards the east, like the feed pipe), the
 * scarp (a rock step), the bench of the tank, and east of the corner the slope of the drive pipe, which lies 0.22 m above it.
 * `z` only matters on the upland (the back rises a little).
 */
export function groundY(x: number, z = 0, slope = C.driveSlope): number {
  const lip = -C.scarpLip;
  const foot = -C.scarpFoot;
  const grade = (xx: number) => SHELF_Y - 0.02 * (xx - SPRING_X);
  if (x <= lip) return grade(x) + upland(z);
  if (x < foot) {
    const t = smoothstep(lip, foot, x);
    return (grade(lip) + upland(z)) * (1 - t) + BENCH_Y * t;
  }
  return BENCH_Y - slope * softRamp(x - BEND_X);
}

/** x-intervals of the section where something occupies the ground: [x0, x1, y of the bottom of the excavation]. */
export const NOTCHES: readonly (readonly [number, number, number])[] = [
  [SPRING_X - BOX_OHL, SPRING_X + BOX_OHL, BOX_SLAB_BOTTOM], // spring box
  [SPRING_X + BED_X0 - C.filterKerb, SPRING_X + BED_X1, BED_FLOOR_Y], // gravel bed with the stone end against the rock
  [-SLAB_R, SLAB_R, SLAB_BOTTOM], // slab of the tank
];
