import { VALVE } from '../dims';
import { BENCH_TOP_Y } from './bench';
import * as G from './geo';

// Explode offsets of the fourteen parts of the waste valve (valve frame), all along the axis. Each part slides off or onto
// the valve the way it is assembled, and the exploded view keeps the real order of the parts on the axis, with a gap
// between every two of them:
//
//   from above : the lock nut, the weight and the stroke nut (down the rod onto the guide), the guide (down into the sleeve), the machined sleeves (onto the rod), the sleeve,
//                the nipple and the reducer (over the rod, which stays threaded through them), the socket
//   from below : the seat ring, the head and the fins nut are fitted from under the plate (the head, 18.6 mm, cannot go
//                through the 15 mm bore), which is why the plate stands on two parallels
//
// The valve is held open while exploded, so the bands are the extents of the OPEN pose: the stem group (head, fins, rod,
// sleeves) hangs `DEFAULT_TRAVEL` lower than in the closed pose the geometry is built in.

/** Gap between two neighbours of the exploded stack, metres. */
export const EXPLODE_GAP = 0.012;

interface Band {
  id: string;
  /** Lowest and highest point of the part in the open pose, valve frame. */
  y0: number;
  y1: number;
}

const T = G.DEFAULT_TRAVEL;
const st = (y: number) => y - T; // a part carried by the stem hangs one travel lower when open

/** The parts of the stack, from the bottom of the exploded view to the top. The stem (rod) is placed apart: it skewers them. */
const STACK: Band[] = [
  { id: 'valve-fins', y0: st(G.FINS_BOTTOM), y1: st(G.HEAD_BASE) },
  { id: 'valve-head', y0: st(G.HEAD_BASE), y1: st(G.CONE_TOP) },
  { id: 'valve-seat', y0: G.NIPPLE_BOTTOM, y1: G.SEAT_TOP },
  { id: 'base-plate', y0: -VALVE.basePlateThickness, y1: 0 },
  { id: 'valve-socket', y0: 0, y1: G.SOCKET_H },
  { id: 'valve-reducer', y0: 0, y1: G.RED_TOP },
  { id: 'valve-nipple', y0: G.SEAT_TOP, y1: G.NIPPLE_TOP },
  { id: 'valve-sleeve', y0: G.SLEEVE_BOTTOM, y1: G.SLEEVE_TOP },
  {
    id: 'stem-sleeves',
    y0: st(VALVE.stemSleeveBottom),
    y1: st(VALVE.stemSleeveBottom + VALVE.stemSleeveSpacing + VALVE.stemSleeveLength),
  },
  { id: 'valve-guide', y0: G.TUBE_BOTTOM, y1: G.GUIDE_TOP },
  { id: 'stroke-nut', y0: G.STROKE_NUT_Y, y1: G.STROKE_NUT_Y + VALVE.nutThickness },
  { id: 'counterweight', y0: G.WEIGHT_Y, y1: G.WEIGHT_Y + VALVE.counterweightLength },
  { id: 'lock-nut', y0: G.LOCK_NUT_Y, y1: G.LOCK_NUT_Y + VALVE.nutThickness },
];

function plan(): Record<string, number> {
  const out: Record<string, number> = {};
  // the stack starts one gap above the bench top: that is where the lowest part, the fins nut, ends up
  let bottom = BENCH_TOP_Y + EXPLODE_GAP;
  const placed: Record<string, Band & { e0: number }> = {};
  for (const b of STACK) {
    out[b.id] = bottom - b.y0;
    placed[b.id] = { ...b, e0: bottom };
    bottom += b.y1 - b.y0 + EXPLODE_GAP;
  }
  // the rod: from just under the reducer (it is threaded through the reducer, the nipple and the sleeve) to above the sleeve
  const rodBottom = G.ROD_BOTTOM - T;
  out['valve-stem'] = placed['valve-reducer'].e0 - 0.004 - rodBottom;
  return out;
}

const OFFSETS = plan();

/** Offset (metres, along +Y) of each part at explode 1. */
export const EXPLODE_Y: Record<string, number> = OFFSETS;
