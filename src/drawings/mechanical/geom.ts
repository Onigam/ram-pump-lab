// Geometry of the mechanical sheets, in millimetres, read from the single source of dimensions (src/three/dims.ts, metres) and
// from the few 3D constants that dims.ts does not hold but that the 3D builders export. Nothing is retyped: a sheet draws what
// the 3D model draws. Every dimension also carries its status (reported, derived, estimate) so that the sheets can mark it.
import { l, type L } from '@onigam/lab-kit/i18n';
import { mm as mmText, nEn, nFr } from '../../data/units';
import { AIR_FRACTION_NOMINAL as AIR_NOMINAL } from '../../sim/physics';
import { CHAMBER, CHECK_VALVE, FITTINGS, FOUNDATION, INLET, RAM, SITE, VALVE } from '../../three/dims';
import { COVER_END as COVER_END_M, DRAIN_Y as DRAIN_Y_M, FOOT_X as FOOT_X_M } from '../../three/ram/body';
import { CH, CHECK_BASE_Y, OUTLET_Y } from '../../three/ram/chamber';
import { S_X0 as S_X0_M, STUB_X0 as STUB_X0_M, V1_X0 as V1_X0_M } from '../../three/ram/inlet';

// ------------------------------------------------------------------------------------------------ units and status

/** Metres to millimetres, to the tenth (what the sheets print). */
export const mm = (m: number): number => Math.round(m * 1e4) / 10;
/** Metres to millimetres, exact (what the sheets draw). */
export const k = (m: number): number => m * 1000;

/**
 * What a sheet prints after a dimension: reported by a source (no mark), computed from reported figures only (†), or an
 * estimate (*). A value computed from an estimate or from the calibrated mass or stroke is an estimate: no source gives it.
 */
export type Status = 'R' | 'D' | 'E';
export const MARK: Record<Status, string> = { R: '', D: '†', E: '*' };

/** The sections of dims.ts the sheets read. */
const SECTIONS = { RAM, FOUNDATION, INLET, VALVE, CHECK_VALVE, CHAMBER, FITTINGS, SITE } as const;
type Sections = typeof SECTIONS;
type NumKey<T> = { [K in keyof T]: T[K] extends number ? K : never }[keyof T] & string;

/**
 * Dimensions of dims.ts that are NOT estimates: reported (R) or derived (D), as their JSDoc says. Every other constant is an
 * estimate. `mechanical.test.ts` parses the JSDoc of dims.ts and fails when this table and the source disagree.
 */
export const STATUS: Record<string, Status> = {
  'SITE.fall': 'R',
  'SITE.deliveryLength': 'R',
  'SITE.sourceFlowLpm': 'R',
  'SITE.deliveryBore': 'D',
  'SITE.driveLength': 'R',
  'SITE.deliveryHead': 'R',
  'SITE.driveOuterDiameter': 'D',
  'FOUNDATION.length': 'D',
  'VALVE.threadDiameter': 'R',
  'VALVE.nippleLength': 'R',
  'VALVE.guideTop': 'D',
  'VALVE.rodDiameter': 'R',
  'VALVE.sleeveRodDiameter': 'R',
  'VALVE.stemSleeveDiameter': 'D',
  'VALVE.headHeight': 'D',
  'VALVE.headClosedY': 'D',
  'VALVE.counterweightDiameter': 'R',
  'VALVE.counterweightLength': 'D',
  'VALVE.basePlateBore': 'D',
  'VALVE.socketBoreDiameter': 'D',
  'VALVE.threadPitch': 'D',
  'VALVE.rodPitch': 'D',
  'CHAMBER.shellHeight': 'D',
  'CHAMBER.shellBottom': 'D',
};

/**
 * Constants whose JSDoc in dims.ts says "reported" or "derived" but which a sheet must print as estimates (*): derived from
 * other estimated lengths or from the calibrated mass (fact review F16), or a mid-point picked in a range the video gives
 * ("7 or 8 cm", "30–32 mm": F23). `STATUS` above stays the faithful copy of dims.ts that the test checks.
 */
const MARKED_ESTIMATE = new Set([
  'SITE.deliveryBore',
  'SITE.driveOuterDiameter',
  'FOUNDATION.length',
  'VALVE.nippleLength',
  'VALVE.guideTop',
  'VALVE.stemSleeveDiameter',
  'VALVE.headHeight',
  'VALVE.headClosedY',
  'VALVE.counterweightDiameter',
  'VALVE.counterweightLength',
  'CHAMBER.shellHeight',
  'CHAMBER.shellBottom',
]);

/** A length of dims.ts: metres, millimetres to the tenth and status. */
export interface Dim {
  m: number;
  mm: number;
  status: Status;
}

export function dim<S extends keyof Sections>(section: S, key: NumKey<Sections[S]>): Dim {
  const m = (SECTIONS[section] as unknown as Record<string, number>)[key] as number;
  const id = `${section}.${key}`;
  return { m, mm: mm(m), status: MARKED_ESTIMATE.has(id) ? 'E' : (STATUS[id] ?? 'E') };
}

/** Concatenation of bilingual pieces (plain strings stay as they are in both languages). */
export function cat(...parts: (string | L)[]): L {
  return l(
    parts.map((x) => (typeof x === 'string' ? x : x.fr)).join(''),
    parts.map((x) => (typeof x === 'string' ? x : x.en)).join(''),
  );
}

/** Bilingual label of a length in mm with the decimal sign of each language, a prefix (Ø, R, M) and the status mark. */
export function lab(valueMm: number, status: Status, prefix = '', suffix = ''): L {
  const t = mmText(valueMm / 1000);
  return l(`${prefix}${t.fr}${suffix}${MARK[status]}`, `${prefix}${t.en}${suffix}${MARK[status]}`);
}

/** Label of a number with `digits` decimals in each language, a unit suffix and the status mark. */
export function labN(value: number, digits: number, status: Status, prefix = '', suffix = ''): L {
  return l(
    `${prefix}${nFr(value, digits)}${suffix}${MARK[status]}`,
    `${prefix}${nEn(value, digits)}${suffix}${MARK[status]}`,
  );
}

/** Label of a dims.ts length (optionally a diameter from a radius: pass `2`). */
export function labOf(d: Dim, prefix = '', times = 1): L {
  return lab(d.mm * times, d.status, prefix);
}

// ------------------------------------------------------------------------------------------------ the waste valve

/** Heights are above the top face of the base plate; radii from the axis. Same names as three/valve/geo.ts. */
export const V = {
  plateT: k(VALVE.basePlateThickness),
  plateHalf: k(VALVE.basePlateSide) / 2,
  plateBoreR: k(VALVE.basePlateBore) / 2,
  holeR: k(VALVE.basePlateHoleDiameter) / 2,
  holeQ: k(VALVE.basePlateHoleSpacing) / 2,
  socketR: k(VALVE.weldedFittingDiameter) / 2,
  socketH: k(VALVE.weldedFittingHeight),
  maleR: k(VALVE.socketBoreDiameter) / 2,
  redR: k(VALVE.reductionDiameter) / 2,
  redTop: k(VALVE.reductionTop),
  redTopR: k(VALVE.reducerTopDiameter) / 2,
  redBoreR: k(VALVE.reducerBoreDiameter) / 2,
  redTaper: k(VALVE.reducerTaperStart),
  /** Thread (outer) radius of the 15×21 nipple, sleeve neck and guide neck: the model takes 50 µm off the nominal. */
  threadR: k(VALVE.threadDiameter) / 2 - 0.05,
  seatBoreR: k(VALVE.seatBore[1]) / 2,
  nippleBottom: k(VALVE.nippleBottom),
  nippleTop: k(VALVE.nippleBottom + VALVE.nippleLength),
  seatTop: k(VALVE.nippleBottom + VALVE.seatThickness),
  portBottom: k(VALVE.portBottom),
  portTop: k(VALVE.portBottom + VALVE.portHeight),
  portW: k(VALVE.portWidth),
  lockAF: k(VALVE.nippleLockNutAcrossFlats),
  lockT: k(VALVE.nippleLockNutThickness),
  sleeveR: k(VALVE.sleeveDiameter) / 2,
  sleeveBottom: k(VALVE.sleeveBottom),
  sleeveTop: k(VALVE.sleeveBottom + VALVE.sleeveLength),
  tubeR: k(VALVE.guideTubeOuterDiameter) / 2,
  tubeBoreR: k(VALVE.guideTubeInnerDiameter) / 2,
  tubeBottom: k(VALVE.guideTubeBottom),
  collarR: k(VALVE.guideCollarDiameter) / 2,
  guideTop: k(VALVE.guideTop),
  rodR: k(VALVE.rodDiameter) / 2,
  sleeveOnRodR: k(VALVE.stemSleeveDiameter) / 2,
  sleeveOnRodL: k(VALVE.stemSleeveLength),
  sleeveOnRodBottom: k(VALVE.stemSleeveBottom),
  sleeveOnRodSpacing: k(VALVE.stemSleeveSpacing),
  headR: k(VALVE.headDiameter) / 2,
  headBase: k(VALVE.headClosedY),
  finsHub: k(VALVE.finsHubDiameter) / 2,
  finsR: k(VALVE.finsDiameter) / 2,
  finsH: k(VALVE.finsHeight),
  weightR: k(VALVE.counterweightDiameter) / 2,
  weightL: k(VALVE.counterweightLength),
  nutAF: k(VALVE.nutAcrossFlats),
  nutT: k(VALVE.nutThickness),
  tailProud: k(VALVE.rodTailProud),
  pitchRod: k(VALVE.rodPitch),
  pitchThread: k(VALVE.threadPitch),
};

/** Bottom of the guide's threaded neck: 12 mm under the top of the sleeve (three/valve/geo.ts NECK_BOTTOM). */
export const NECK_BOTTOM = V.sleeveTop - 12;
/** Top of the head cone. */
export const CONE_TOP = V.headBase + (V.headR - V.rodR);
export const FINS_BOTTOM = V.headBase - V.finsH;
export const ROD_BOTTOM = FINS_BOTTOM - 1.5;
/** Half angle of the head cone and of the seat, degrees. */
export const CONE_DEG = VALVE.headConeHalfAngleDeg;
/** Radius at the foot of the seat chamfer (the head radius plus the 0.1 mm the model leaves for the contact). */
export const SEAT_FOOT_R = V.headR + 0.1;
/** Top of the seat chamfer, on the bore. */
export const CHAMFER_TOP = V.nippleBottom + (SEAT_FOOT_R - V.seatBoreR);

/** Corner radius of a hexagon of the given across-flats (the section plane passes through the corners). */
export const corner = (af: number): number => af / Math.sqrt(3);

/**
 * The stack on the rod above the guide, closed position, from the guide's end face upwards (fact review F12): the STROKE NUT
 * stands `s` above the guide (its height on the rod sets the stroke: when the valve opens, the rod drops by `s` and the nut lands
 * on the guide), the COUNTERWEIGHT rests on the nut, the LOCK NUT on top of the weight locks the stack. `nut0`/`nut1` are the
 * bottom and top faces of the stroke nut, `weight0`/`weight1` those of the weight, `lock1` the top of the lock nut.
 */
export function stack(s: number): {
  nut0: number;
  nut1: number;
  weight0: number;
  weight1: number;
  lock1: number;
  rodTop: number;
} {
  const nut0 = V.guideTop + s;
  const nut1 = nut0 + V.nutT;
  const weight0 = nut1;
  const weight1 = weight0 + V.weightL;
  const lock1 = weight1 + V.nutT;
  return { nut0, nut1, weight0, weight1, lock1, rodTop: lock1 + V.tailProud };
}

// ------------------------------------------------------------------------------------------------ the ram

/** Heights are above the body axis; x runs from the inlet flange face of the body. */
export const R = {
  bodyR: k(RAM.bodyOuterRadius),
  bodyIR: k(RAM.bodyInnerRadius),
  L: k(RAM.bodyLength),
  flangeR: k(RAM.flangeDiameter) / 2,
  flangeT: k(RAM.flangeThickness),
  xWaste: k(RAM.xWaste),
  xSnifter: k(RAM.xSnifter),
  xDelivery: k(RAM.xDelivery),
  floorY: k(RAM.floorY),
  footW: k(RAM.footWidth),
  footSpacing: k(RAM.footSpacing),
  wasteFlangeSide: k(RAM.wasteFlangeSide),
  wasteFlangeTop: k(RAM.wasteFlangeTop),
  /** Top face of the base plate of the waste valve above the body axis (origin of the valve frame). */
  plateTop: k(RAM.wasteFlangeTop + VALVE.basePlateThickness),
  padT: k(FOUNDATION.thickness),
  padL: k(FOUNDATION.length),
  padW: k(FOUNDATION.width),
  padChamfer: k(FOUNDATION.chamfer),
  studZ: k(FOUNDATION.studOffsetZ),
  studR: k(FOUNDATION.studRadius),
  studH: k(FOUNDATION.studHeight),
  studEmbed: k(FOUNDATION.studEmbed),
  nutAF: k(FOUNDATION.nutAcrossFlats),
  nutT: k(FOUNDATION.nutThickness),
  washerD: k(FOUNDATION.washerDiameter),
  washerT: k(FOUNDATION.washerThickness),
  v1L: k(INLET.valveLength),
  strainerL: k(INLET.strainerLength),
  inletFlangeR: k(INLET.flangeDiameter) / 2,
  inletFlangeT: k(INLET.flangeThickness),
  gasketT: k(INLET.gasketThickness),
  stubL: k(RAM.driveStubLength),
  pipeOR: k(SITE.driveOuterDiameter) / 2,
  pipeIR: k(SITE.driveBore) / 2,
  boltCircleR: k(INLET.boltCircleRadius),
  driveBore: k(SITE.driveBore),
  smallValveL: k(FITTINGS.smallBallValveLength),
  outletStubL: k(FITTINGS.outletStubLength),
  unionL: k(FITTINGS.unionLength),
  snifterD: k(FITTINGS.snifterDiameter),
  snifterH: k(FITTINGS.snifterHeight),
  gaugeD: k(FITTINGS.gaugeDiameter),
};

/** Feet: x of their centres (three/ram/body.ts). */
export const FOOT_X = FOOT_X_M.map(k);
/** Drain on the end cover, and the x of the outer face of its boss (three/ram/body.ts). */
export const DRAIN_Y = k(DRAIN_Y_M);
export const COVER_END = k(COVER_END_M);
export const COVER_T = 14;
/** Faces of the inlet side (three/ram/inlet.ts): V1, strainer, flange of the drive pipe, start of its stub. */
export const V1_X0 = k(V1_X0_M);
export const S_X0 = k(S_X0_M);
export const PIPE_FLANGE_X0 = S_X0 - R.inletFlangeT;
export const STUB_X0 = k(STUB_X0_M);
/** Top of the delivery boss, where the check valve stands (three/ram/chamber.ts). */
export const CHECK_BASE = k(CHECK_BASE_Y);

/** Check valve constants of three/ram/chamber.ts that dims.ts does not hold (that file does not export them). */
export const CV = {
  seatY: 34,
  cavR: 18.5,
  discR: 16,
  discT: 4,
  ceilY: 66,
  springR: 13.5,
  rv: k(CHECK_VALVE.acrossFlats) / 2,
  height: k(CHECK_VALVE.height),
  seatBoreR: k(CHECK_VALVE.seatBore) / 2,
  lift: k(CHECK_VALVE.lift),
};

/** The vessel of the air chamber: dims.ts plus the neck and boss of three/ram/chamber.ts (`CH`, exported). */
export const CH_MM = {
  R: k(CH.R),
  H: k(CH.H),
  dome: k(CH.dome),
  wall: k(CH.wall),
  neckOuter: k(CH.neckOuter),
  neckBore: k(CH.neckBore),
  neckBottom: k(CH.neckBottom),
  bossOuter: k(CH.bossOuter),
  bossBore: k(CH.bossBore),
  bossHeight: k(CH.bossHeight),
  shellBottom: k(CHAMBER.shellBottom),
  outletHeight: k(CHAMBER.outletHeight),
  outletY: k(OUTLET_Y),
  outletR: k(CH.outletR),
  outletBore: k(CH.outletBore),
  outletLength: k(CH.outletLength),
};

/** Share of the chamber that is air at rest: the nominal air share of the model (src/sim/physics.ts, an assumption). */
export const AIR_FRACTION_NOMINAL = AIR_NOMINAL;

// ------------------------------------------------------------------------------------------------ the air chamber vessel

const arcPts = (rx: number, ry: number, a0: number, a1: number, steps: number, cy = 0): [number, number][] => {
  const out: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    out.push([rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return out;
};

/**
 * Right-hand wall of the vessel, in mm, local frame (x from the axis, y from the bottom of the straight shell): the same
 * construction as three/ram/chamber.ts `vesselProfiles` (pressed domes, neck at the bottom, boss on top), which does not
 * export it. `mechanical.test.ts` checks `yBottom` and `height` against the 3D model's own chamber.
 */
export function chamberSection(): {
  wall: [number, number][];
  outer: [number, number][];
  innerUp: [number, number][];
  yTop: number;
  yBottom: number;
  height: number;
  radiusAt(y: number): number;
  level(airLevel: number): number;
} {
  const { R, H, dome, wall, neckOuter, neckBore, neckBottom, bossOuter, bossBore, bossHeight } = CH_MM;
  const Ri = R - wall;
  const di = dome - wall;
  const t0 = Math.acos(neckOuter / R);
  const tb = Math.acos(bossOuter / R);
  const ti = Math.acos(neckBore / Ri);
  const tbi = Math.acos(bossBore / Ri);
  const bottomOuter = arcPts(R, -dome, t0, 0, 24);
  const topOuter = arcPts(R, dome, 0, tb, 24, H);
  const bottomInner = arcPts(Ri, -di, ti, 0, 24);
  const topInner = arcPts(Ri, di, 0, tbi, 24, H);
  const yTop = topOuter[topOuter.length - 1]![1] + bossHeight;
  const innerBody = [...bottomInner, ...topInner];
  const poly: [number, number][] = [
    [neckOuter, neckBottom],
    ...bottomOuter,
    ...topOuter,
    [bossOuter, yTop],
    [bossBore, yTop],
    ...[...innerBody].reverse(),
    [neckBore, neckBottom],
  ];
  const outer: [number, number][] = [[neckOuter, neckBottom], ...bottomOuter, ...topOuter, [bossOuter, yTop]];
  const innerUp: [number, number][] = [[neckBore, neckBottom], ...innerBody, [bossBore, yTop]];
  const yBottom = innerUp[1]![1];
  const height = yTop - yBottom;
  const radiusAt = (y: number): number => {
    for (let i = 1; i < innerUp.length; i++) {
      const [r0, y0] = innerUp[i - 1]!;
      const [r1, y1] = innerUp[i]!;
      if (y >= y0 && y <= y1 && y1 > y0) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
    }
    return innerUp[innerUp.length - 1]![0];
  };
  return { wall: poly, outer, innerUp, yTop, yBottom, height, radiusAt, level: (a) => yBottom + (1 - a) * height };
}
