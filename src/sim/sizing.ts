// The sizing calculator: pure functions (no DOM, no simulation), from the fall, the delivery head, the spring flow and
// the drive pipe size to the minimum drive pipe length, the spring flow the pipe needs, the expected delivery and the
// warnings. Every rule comes from the sources of docs/research.md (§2, K17–K21) and is labelled below:
//   S4 = NC State Extension, Hydraulic Ram Pumps (the rules and table 2);  S6 = Wikipedia (3–7 × the fall, 60 % efficiency);
//   research §5 = H/h above ≈ 12 is too much for a ram.
// Nothing here is a design for building a ram: the numbers are the sources' orders of magnitude.

/** US gallon, L (exact: 231 cubic inches). The sources give US units: conversions are explicit. */
export const LITRES_PER_GALLON = 3.785411784;
/** Gallons per minute → litres per minute. */
export const GPM_TO_LPM = LITRES_PER_GALLON;
/** Gallons per day → cubic metres per day. */
export const GPD_TO_M3_DAY = LITRES_PER_GALLON / 1000;

/** One row of S4 table 2 ("approximate pumping characteristics"), in the units of the table. */
interface TableRow {
  id: PipeSizeId;
  /** Nominal drive pipe size, inches. */
  inch: number;
  /** Delivery pipe of the table, inches. */
  deliveryInch: number;
  /** Minimum source flow the table requires, US gpm. */
  gpm: number;
  /** Maximum pumping of the table, US gpd. */
  gpd: number;
  /** Inner diameter of a standard steel pipe of that size, mm (schedule 40, rounded). ASSUMPTION: not in the sources. */
  innerMm: number;
}

export type PipeSizeId = '3/4' | '1' | '1-1/2' | '2';

/** S4 table 2, the rows the lab uses (research K21). The table states no head, fall or efficiency for its figures. */
const TABLE: readonly TableRow[] = [
  { id: '3/4', inch: 0.75, deliveryInch: 0.5, gpm: 2, gpd: 1000, innerMm: 21 },
  { id: '1', inch: 1, deliveryInch: 0.5, gpm: 6, gpd: 2000, innerMm: 27 },
  { id: '1-1/2', inch: 1.5, deliveryInch: 0.75, gpm: 14, gpd: 4000, innerMm: 41 },
  { id: '2', inch: 2, deliveryInch: 1, gpm: 25, gpd: 7000, innerMm: 53 },
];

/** A drive pipe size of the table, converted to the lab's units. */
export interface PipeSize {
  id: PipeSizeId;
  /** Nominal size, inches. */
  inch: number;
  /** Inner diameter, mm (assumed, schedule 40 steel). */
  innerMm: number;
  /** Minimum source flow, L/min, converted from S4 table 2 (2, 6, 14, 25 gpm) and rounded to 0.1 as in research K21. */
  minSourceLpm: number;
  /** Maximum pumping of the table, L/day (S4 table 2: 1 000, 2 000, 4 000, 7 000 gpd). */
  maxDeliveryLpd: number;
  /** Delivery pipe of the table, inches. */
  deliveryInch: number;
}

export const PIPE_SIZES: readonly PipeSize[] = TABLE.map((r) => ({
  id: r.id,
  inch: r.inch,
  innerMm: r.innerMm,
  minSourceLpm: Math.round(r.gpm * GPM_TO_LPM * 10) / 10,
  maxDeliveryLpd: r.gpd * LITRES_PER_GALLON,
  deliveryInch: r.deliveryInch,
}));

export function pipeSize(id: PipeSizeId): PipeSize {
  return PIPE_SIZES.find((s) => s.id === id) ?? PIPE_SIZES[1];
}

/** The table size whose inner diameter is closest to a diameter in mm (the lab's 27 mm drive pipe is the 1″). */
export function nearestPipeSize(innerMm: number): PipeSize {
  return PIPE_SIZES.reduce((best, s) => (Math.abs(s.innerMm - innerMm) < Math.abs(best.innerMm - innerMm) ? s : best));
}

/** Typical efficiency of a ram installation (research K17: S4's E = 0.6, S6's 60 %). */
export const TYPICAL_ETA = 0.6;
/** Minimum drive pipe length as a multiple of the fall (S4: "at least 5 times the vertical fall"; K20). */
export const LENGTH_RATIO_S4 = 5;
/** Usual range of the drive pipe length as a multiple of the fall (S6, K20: 3 to 7). */
export const LENGTH_RATIO_USUAL: readonly [number, number] = [3, 7];
/** Above this H/h the ram is asked too much (research §5: H/h > ~12). */
export const HEAD_RATIO_MAX = 12;
/** Below this H/h the recoil of the model is too weak to reopen the waste valve: the ram stays shut (physics.md §7). */
export const HEAD_RATIO_MIN = 1.5;

export interface SizingInput {
  /** Fall h of the drive pipe, m. */
  fall: number;
  /** Delivery head H (lift above the ram), m. */
  deliveryHead: number;
  /** Flow of the spring, L/min. */
  sourceFlow: number;
  /** Drive pipe size. */
  pipe: PipeSizeId;
  /** Planned drive pipe length, m (optional: only the length warnings need it). */
  driveLength?: number;
}

export type SizingWarning =
  /** H/h above 12. */
  | 'headHigh'
  /** H/h below 1.5. */
  | 'headLow'
  /** L/h below 3 (S6, K20). */
  | 'lengthShort'
  /** L/h between 3 and 5: usual, but under the 5 × of S4. */
  | 'lengthBelowS4'
  /** The spring gives less than the pipe needs (S4 table 2). */
  | 'sourceShort';

export interface SizingResult {
  pipe: PipeSize;
  /** H/h. */
  liftRatio: number;
  /** L/h, or null when no length was given. */
  lengthRatio: number | null;
  /** Minimum drive pipe length, m (S4: 5 × h). */
  minLength: number;
  /** Usual range of the drive pipe length, m (S6: 3 to 7 × h). */
  usualLength: [number, number];
  /** Minimum spring flow for this pipe size, L/min (S4 table 2). */
  minSource: number;
  /** Spring flow / minimum spring flow. */
  sourceRatio: number;
  /** The spring gives at least what the pipe needs. */
  sourceEnough: boolean;
  /** The biggest table size the spring can feed, null when it cannot feed even the smallest. */
  largestPipe: PipeSize | null;
  /** Expected delivery with the typical efficiency (η = 0.6, S4/S6): q = η·Q·h/H. */
  delivery: Delivery;
  /** Maximum pumping S4 quotes for this size, L/day. */
  tableCeilingLpd: number;
  warnings: SizingWarning[];
}

export interface Delivery {
  /** Delivered flow, L/min. */
  lpm: number;
  /** Delivered volume, L/day. */
  lpd: number;
}

/** Minimum drive pipe length for a fall, m (S4: 5 × h). */
export function minDriveLength(fall: number): number {
  return LENGTH_RATIO_S4 * fall;
}

/** Usual range of the drive pipe length for a fall, m (S6: 3 to 7 × h). */
export function usualDriveLength(fall: number): [number, number] {
  return [LENGTH_RATIO_USUAL[0] * fall, LENGTH_RATIO_USUAL[1] * fall];
}

/** The biggest table size whose minimum spring flow the spring covers, or null when none. */
export function largestPipeFor(sourceFlow: number): PipeSize | null {
  let best: PipeSize | null = null;
  for (const s of PIPE_SIZES) if (sourceFlow >= s.minSourceLpm - 1e-9) best = s;
  return best;
}

/**
 * Delivery of a ram, q = η·Q·h/H (S4: Q = 1440·E·S/(L/F) in gpd; research K18), for a drive flow Q in L/min. With η = 0.6
 * and Q = 7.5 L/min at the video's site this gives ≈ 750 L/day (K18); the video's 500 L/day is η ≈ 0.4. This is the closed
 * form, not the simulation: the stroke model gives the same quantity from the valve's tuning (RamSim.sweep).
 */
export function expectedDelivery(driveFlow: number, fall: number, deliveryHead: number, eta: number): Delivery {
  const lpm = deliveryHead > 0 ? (eta * driveFlow * fall) / deliveryHead : 0;
  return { lpm, lpd: lpm * 1440 };
}

/** Run every check of the calculator. */
export function sizeRam(input: SizingInput, eta: number = TYPICAL_ETA): SizingResult {
  const { fall, deliveryHead, sourceFlow } = input;
  const pipe = pipeSize(input.pipe);
  const liftRatio = fall > 0 ? deliveryHead / fall : Infinity;
  const lengthRatio = input.driveLength !== undefined && fall > 0 ? input.driveLength / fall : null;
  const sourceRatio = sourceFlow / pipe.minSourceLpm;
  const sourceEnough = sourceRatio >= 1 - 1e-9;
  const warnings: SizingWarning[] = [];
  if (liftRatio > HEAD_RATIO_MAX) warnings.push('headHigh');
  if (liftRatio < HEAD_RATIO_MIN) warnings.push('headLow');
  if (lengthRatio !== null) {
    if (lengthRatio < LENGTH_RATIO_USUAL[0]) warnings.push('lengthShort');
    else if (lengthRatio < LENGTH_RATIO_S4) warnings.push('lengthBelowS4');
  }
  if (!sourceEnough) warnings.push('sourceShort');
  return {
    pipe,
    liftRatio,
    lengthRatio,
    minLength: minDriveLength(fall),
    usualLength: usualDriveLength(fall),
    minSource: pipe.minSourceLpm,
    sourceRatio,
    sourceEnough,
    largestPipe: largestPipeFor(sourceFlow),
    delivery: expectedDelivery(sourceFlow, fall, deliveryHead, eta),
    tableCeilingLpd: pipe.maxDeliveryLpd,
    warnings,
  };
}
