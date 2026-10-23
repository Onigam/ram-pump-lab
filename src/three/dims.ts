// The single source of dimensions of the lab, in metres (BRIEF §5). The 3D worlds, the part sheets and the drawings all
// read these constants; nothing is retyped elsewhere.
//
// Provenance of every value, in its comment:
//   reported (S1 mm:ss)   stated in the main video (research.md §2 key figures K1…K21, §3 waste valve)
//   derived (…)           computed from reported figures, the computation is given
//   estimate: …           the sources are silent: sized from the fitting names or from usual practice, with the reasoning.
//                         Part sheets and drawings must flag these.
//
// Frames. SITE: X east, Y up, Z south, origin on the axis of the ram's drive inlet, Y = 0 is that axis (the datum from
// which the fall h and the delivery head H are measured). RAM: X along the body from the inlet flange (x = 0) to the
// drain end, Y up (y = 0 on the body axis), Z towards the viewer; the front-back symmetry plane is z = 0.

// ------------------------------------------------------------------------------------------------ the site

export const SITE = {
  /** Fall h: tank outlet above the ram inlet axis. reported (S1 01:55, K1). */
  fall: 7.5,
  /** Drive pipe length L along the pipe. reported (S1 01:55, K2). */
  driveLength: 20,
  /** Delivery pipe length along its path. reported (S1 01:15, 02:01, K3). */
  deliveryLength: 300,
  /** Delivery head H: inlet of the water tower above the ram inlet axis. reported (S1 01:15, 02:01, K3). */
  deliveryHead: 65,
  /** Flow of the spring, L/min. reported (S1 02:30, K6: 7.5–7.8 L/min now). */
  sourceFlowLpm: 7.5,
  /** Ground level at the ram pit above the datum (the pit rim). estimate: the pit holds the 0.70 m tall ram plus 0.15 m. */
  groundAtRam: 0.85,
  /** Drive pipe inner diameter. estimate: 1" (DN25) steel tube, the default of the simulation (physics.md §2). */
  driveBore: 0.027,
  /** Drive pipe outer diameter. derived (ISO 1" tube 33.7 mm: bore 27 mm + 2 × 3.35 mm wall). */
  driveOuterDiameter: 0.0337,
  /** Delivery pipe inner diameter. derived (S4: delivery ≈ half the drive pipe; physics.md: 0.6 × 27 mm = 16 mm). */
  deliveryBore: 0.0162,
  /** Delivery pipe outer diameter. estimate: blue PE100 pipe 25 × 4.4 mm, whose bore is the derived 16.2 mm. */
  deliveryOuterDiameter: 0.025,
  /** Length of the last horizontal run of the drive pipe through the pit wall, before the elbow. estimate. */
  driveLevelRun: 1.4,
  /** Smallest width of a pipe on screen in the site world, pixels (visual only: from afar a real pipe is invisible, near it is true size). */
  pipeMinPixels: 2.6,
} as const;

/** Buffer tank (the 5 700 L tank that empties in ≈ 10 h, K8). */
export const TANK = {
  /** Volume, litres. derived (physics.md §3: (17 − 7.5) L/min × 600 min = 5 700 L; not in the video). */
  volumeL: 5700,
  /** Inner diameter. estimate: a translucent polyethylene tank, 5.7 m³ needs π·0.95²·2.0 = 5.67 m³. */
  diameter: 1.9,
  /** Inner height up to the overflow. estimate: see diameter. */
  height: 2.0,
  /** Wall thickness of the shell. estimate. */
  wall: 0.012,
  /** Height of the drive pipe outlet above the tank floor. estimate: a low outlet, above the silt. */
  outletAboveFloor: 0.18,
} as const;

/** Spring catchment (captage): a stone-lined basin fed by a seep, pipe to the tank. */
export const SPRING = {
  /** Inner length of the basin. estimate: a small stone box that collects the seep. */
  basinLength: 1.3,
  /** Inner width of the basin. estimate: see basinLength. */
  basinWidth: 0.9,
  /** Inner depth of the basin. estimate: see basinLength. */
  basinDepth: 0.55,
  /** Wall thickness of the stone basin. estimate. */
  basinWall: 0.18,
  /** Distance from the basin to the tank axis, along the slope. estimate. */
  distanceToTank: 4.2,
  /** Pipe from the basin to the tank, outer diameter. estimate: 32 mm PE feed. */
  feedPipeDiameter: 0.032,
} as const;

/** Ram pit (regard): a concrete chamber with a lid and a drain. */
export const PIT = {
  /** Inner length (along X) of the pit. estimate: the 1.4 m long ram plus room to work. */
  innerLength: 2.3,
  /** Inner width (along Z) of the pit. estimate: room to work on both sides of the ram. */
  innerWidth: 1.3,
  /** Floor slab top below the datum. estimate: ram feet 0.145 m below the axis plus a 0.06 m slab. */
  floorY: -0.205,
  /** Wall thickness. estimate: poured concrete. */
  wall: 0.14,
  /** Height of the curb above the ground. estimate. */
  curb: 0.12,
  /** Lid thickness. estimate: a steel-framed concrete slab on a hinge. */
  lidThickness: 0.07,
  /** X of the pit centre relative to the ram inlet flange (x = 0 of the RAM frame). estimate: centres the 1.4 m ram. */
  centreX: 0.05,
  /** Outer diameter of the drain pipe through the wall at the floor (waste water leaves downhill). estimate: 100 mm PVC. */
  drainDiameter: 0.1,
} as const;

/** Water tower (château d'eau): a tank on a stand. The video gives no volume: none is invented here. */
export const TOWER = {
  /** Stand height under the tank. estimate: three metres of masonry posts. */
  standHeight: 3.0,
  /** Tank outer diameter. estimate: a farm-size round tank (visual only, its volume is unknown). */
  tankDiameter: 3.0,
  /** Tank height. estimate: a farm-size round tank (visual only, its volume is unknown). */
  tankHeight: 2.0,
  /** Tank inlet (top of the delivery pipe) above the ram datum = SITE.deliveryHead; the ground under it is lower by
   *  standHeight + tankHeight. derived (K3, H measured to the tank top). */
  groundBelowInlet: 5.0,
  /** Plan position of the tower (x east, z south), metres from the ram. estimate: design of the hillside. */
  planX: 36,
  /** Plan position of the tower along Z (negative = north, uphill). estimate: design of the hillside. */
  planZ: -168,
  /** Foot of the riser the delivery pipe climbs, relative to the tower axis (x east, z south). estimate. */
  riserX: 2.4,
  /** Foot of the riser along Z, relative to the tower axis. estimate. */
  riserZ: 0.9,
  /** Receiving trough on the tank lid, relative to the tower axis. The pipe ends above it. estimate. */
  troughX: 0.5,
  /** Trough position along Z, relative to the tower axis. estimate. */
  troughZ: -0.55,
  /** Height of the pipe end above the lid (the water falls from there into the trough). estimate. */
  pipeEndAboveLid: 0.75,
} as const;

/** Farmhouse (habitation). */
export const HOUSE = {
  /** House length (along X). estimate: a stone farmhouse. */
  length: 10,
  /** House width (along Z). estimate: a stone farmhouse. */
  width: 6.4,
  /** Wall height up to the eaves. estimate. */
  wallHeight: 3.2,
  /** Height of the ridge above the eaves. estimate. */
  ridgeRise: 2.1,
  /** Plan position of the house along X. estimate: on the terrace west of the tower. */
  planX: 6,
  /** Plan position of the house along Z. estimate: on the terrace west of the tower. */
  planZ: -150,
  /** Elevation of the terrace under the house above the datum, as a fraction of H. estimate: 82 % of the head. */
  terraceFraction: 0.82,
} as const;

/**
 * Plan of the delivery route, from the ram outlet to the foot of the tower's riser (x east, z south, metres). estimate: an
 * S-shaped route in four legs over the hillside, drawn so that the pipe (route on the ground, riser, goose-neck) is the
 * reported 300 m long at H = 65 m (K3), checked by `three.test.ts`. The elevations follow the ground.
 */
export const DELIVERY_ROUTE: readonly (readonly [number, number])[] = [
  [18, -1],
  [43, -10],
  [65, -30],
  [64, -52],
  [38, -66],
  [13, -82],
  [15, -104],
  [39, -120],
  [64, -136],
  [57, -154],
  [TOWER.planX + TOWER.riserX, TOWER.planZ + TOWER.riserZ],
];

// ------------------------------------------------------------------------------------------------ the ram

/** Cast-iron body and its foundation (generic 1" ram: S4, drive pipe sizes the ram). */
export const RAM = {
  /** Drive inlet axis height: the datum. */
  axisY: 0,
  /** Floor under the feet. estimate: feet 0.107 m tall under the 0.038 m body radius. */
  floorY: -0.145,
  /** Body (horizontal cast tube) from the inlet flange face to the drain end flange face. estimate: ~0.56 m for a 1" ram. */
  bodyLength: 0.56,
  /** Body outer radius. estimate: DN50 cast body. */
  bodyOuterRadius: 0.038,
  /** Body inner radius. estimate: a bore larger than the 27 mm drive pipe. */
  bodyInnerRadius: 0.029,
  /** Diameter of the body's end flanges (4 bolts). estimate. */
  flangeDiameter: 0.11,
  /** Thickness of the body's end flanges. estimate. */
  flangeThickness: 0.018,
  /** X of the waste valve stack axis. estimate: layout, near the inlet. */
  xWaste: 0.13,
  /** X of the snifter axis. estimate: layout between the two stacks. */
  xSnifter: 0.265,
  /** X of the delivery valve and air chamber axis. estimate: layout. */
  xDelivery: 0.42,
  /** Width of a cast foot under the body (their height is the distance from the body axis down to the floor). estimate. */
  footWidth: 0.06,
  /** Distance between the two cast feet. estimate. */
  footSpacing: 0.36,
  /** Side of the square top flange of the waste branch (the base plate sits on it). estimate. */
  wasteFlangeSide: 0.1,
  /** Height of the top face of the waste branch flange above the body axis. estimate. */
  wasteFlangeTop: 0.075,
  /** Length of the stub of drive pipe on the strainer side, which stands for the 20 m pipe coming from the tank. estimate. */
  driveStubLength: 0.16,
} as const;

/** Inlet valve V1 (flanged brass ball valve) and strainer (cast Y-strainer), both DN25, upstream of the body. */
export const INLET = {
  /** Ball valve face-to-face length. estimate: DN25 flanged ball valve. */
  valveLength: 0.13,
  /** Y-strainer face-to-face length. estimate: DN25 cast Y-strainer. */
  strainerLength: 0.16,
  /** Flange diameter of the inlet valve and the strainer. estimate: PN16 DN25. */
  flangeDiameter: 0.115,
  /** Flange thickness of the inlet valve and the strainer. estimate: PN16 DN25. */
  flangeThickness: 0.018,
} as const;

/**
 * The waste (impulse) valve of the video, valve n°1 shown (research §3, S1 06:20–15:40). Heights are measured upwards
 * from the top face of the base plate (the stack stands on the body's waste flange, whose top is RAM.wasteFlangeTop).
 * Exact lengths are not given in the video: every length is an estimate sized from the fitting names.
 */
export const VALVE = {
  /** Valve shown: n°1, the new valve that delivers ≈ 500 L/day (K10). */
  size: 1,
  /** Seat bore of the valves n°1 / n°2 / n°3. reported (S1 03:54, K7: 15×21, 20×27, 26×34). */
  seatBore: { 1: 0.015, 2: 0.02, 3: 0.026 },
  /** Thread major diameter of the 15×21 fittings (the "21"). reported (S1 03:54: nominal 15×21). */
  threadDiameter: 0.021,
  /** Base plate square side (4 bolts). estimate: cut like the Walton's original base plate (S1 06:36). */
  basePlateSide: 0.1,
  /** Base plate thickness. estimate. */
  basePlateThickness: 0.008,
  /** Outer diameter of the welded 26×34 steel socket on the plate. estimate: 1" socket (S1 06:49). */
  weldedFittingDiameter: 0.044,
  /** Height of the welded 26×34 socket above the plate. estimate: a 1" socket. */
  weldedFittingHeight: 0.036,
  /** Body diameter of the reduction 26×34 → 15×21. estimate: 1" to ½" reducer (S1 07:45). */
  reductionDiameter: 0.04,
  /** Height of the top face of the reduction above the plate. estimate. */
  reductionTop: 0.064,
  /** Length of the threaded nipple 15×21 that carries the exhaust ports: "7 or 8 cm" (S1 07:53), 7.5 cm taken. reported (S1 07:53). */
  nippleLength: 0.075,
  /** Height of the bottom face of the 15×21 nipple above the plate (the seat ring is its lowest part). estimate. */
  nippleBottom: 0.052,
  /** Width of an exhaust port ("lumière") cut in the nipple. estimate. */
  portWidth: 0.006,
  /** Height of the bottom of the exhaust ports above the plate. estimate. */
  portBottom: 0.083,
  /** Height of an exhaust port. estimate. */
  portHeight: 0.022,
  /** Number of ports. estimate. */
  portCount: 4,
  /** Across flats of the lock nut on the nipple that fixes its height (S1 08:03). estimate: 15×21 hex nut. */
  nippleLockNutAcrossFlats: 0.027,
  /** Thickness of the lock nut on the nipple. estimate. */
  nippleLockNutThickness: 0.007,
  /** Outer diameter of the female-female sleeve ("manchon") 15×21 (S1 08:09). estimate. */
  sleeveDiameter: 0.026,
  /** Length of the female-female sleeve. estimate. */
  sleeveLength: 0.032,
  /** Height of the bottom of the sleeve above the plate (the top of the nipple is inside it). estimate. */
  sleeveBottom: 0.115,
  /** Outer diameter of the stainless thermowell tube (S1 08:18). estimate: a 12 × 10 mm solar-probe thermowell. */
  guideTubeOuterDiameter: 0.012,
  /** Thermowell inner diameter (the guide bore). estimate: sleeves fit it "within 0.1 mm" (S1 08:56), so well over the 6 mm rod. */
  guideTubeInnerDiameter: 0.01,
  /** Height of the lower end of the thermowell tube above the plate (cut to length, S1 08:27). estimate. */
  guideTubeBottom: 0.09,
  /** Diameter of the thermowell collar, whose end face is the stop of the weight. estimate. */
  guideCollarDiameter: 0.024,
  /** Height of the end face of the guide above the plate. derived: sleeve top 0.147 m + collar 0.015 m. */
  guideTop: 0.162,
  /** Diameter of the stem: a threaded rod M6. reported (S1 08:38). */
  rodDiameter: 0.006,
  /** Inner (threaded) diameter of the machined sleeves: the 6 mm rod. reported (S1 08:38, 08:53). */
  sleeveRodDiameter: 0.006,
  /** Outer diameter of the machined sleeves on the rod. derived: the guide bore minus 0.1 mm (S1 08:53, "within 0.1 mm"). */
  stemSleeveDiameter: 0.0099,
  /** Length of a machined sleeve on the rod. estimate. */
  stemSleeveLength: 0.012,
  /** Large diameter of the stem head: a stainless countersunk screw cut short (S1 09:47). estimate: M10 countersunk head. */
  headDiameter: 0.0186,
  /** Half angle of the head cone and of the seat. estimate: a 90° countersunk head; the seat is milled to the same angle (S1 18:54). */
  headConeHalfAngleDeg: 45,
  /** Height of the head cone. derived: (head radius - rod radius) at 45°. */
  headHeight: 0.0063,
  /** Height of the head's flat face when the valve is closed on its seat (cone on the seat chamfer). derived (geometry:
   *  the 45° cone of radius 9.3 mm meets the 7.5 mm seat bore 1.8 mm above the flat face, which is the seat's lower face). */
  headClosedY: 0.052,
  /** Thickness of the seat ring, machined at the stem's cone angle (S1 09:37). estimate. */
  seatThickness: 0.0035,
  /** Outer diameter of the fins filed under the head (S1 12:02–12:45). estimate. */
  finsDiameter: 0.0175,
  /** Height of the fins nut. estimate. */
  finsHeight: 0.009,
  /** Number of fins. estimate: small fins filed by the author (S1 12:38). */
  finsCount: 4,
  /**
   * Stack on the rod above the guide, from the guide's end face upwards: the counterweight, whose flat face lands on the
   * guide and which is the "main nut" of the final valve (S1 14:14–18:07), then the stroke nut and the lock nut that locks
   * them (S1 12:55–13:51). The video's final valve shows only the weight and the lock nut; the catalogue keeps the stroke
   * nut as a separate ordinary nut, drawn between the two. Across flats, thickness. estimate.
   */
  nutAcrossFlats: 0.01,
  /** Thickness of an M6 nut. estimate. */
  nutThickness: 0.005,
  /** Counterweight machined from 30–32 mm rebar (S1 15:59): diameter reported, length derived from the mass. */
  counterweightDiameter: 0.031,
  /** derived: 360 g (physics preset valve n°1) of steel (7 850 kg/m³) in a Ø 31 mm bar = 60 mm. */
  counterweightLength: 0.06,
  /** The 3D draws the real stroke (RamState.stroke, mm) multiplied by this factor, so a 2.2 mm stroke stays visible. */
  strokeVisualScale: 4,
} as const;

/** Delivery check valve (brass spring check valve on the body) and snifter. */
export const CHECK_VALVE = {
  /** Hex across flats of the check valve body. estimate: a DN25 vertical lift check valve. */
  acrossFlats: 0.05,
  /** Body height of the check valve. estimate. */
  height: 0.08,
  /** Seat bore. estimate (no source): the simulation assumes a flow area of half the drive pipe section
   *  (physics.ts DELIVERY_VALVE_AREA_RATIO = 0.5), that is Ø 27 mm × √0.5 = 19.1 mm. */
  seatBore: 0.0191,
  /** Disc lift at full opening. estimate: about a third of the seat bore. */
  lift: 0.006,
} as const;

/** Air chamber (cloche à air): welded steel vessel above the delivery valve. */
export const CHAMBER = {
  /** Inner volume, litres. estimate: the simulation default (physics.md §2: 4 L, assumed; not in the video). */
  volumeL: 4,
  /** Outer diameter. estimate: DN100 tube. */
  diameter: 0.114,
  /** Straight shell height. derived: with two 0.03 m domes, π·0.054²·0.36 + 2 × 0.2 L ≈ 4.1 L. */
  shellHeight: 0.36,
  /** Dome height of each pressed head. estimate. */
  domeHeight: 0.03,
  /** Wall. estimate: 3 mm steel. */
  wall: 0.003,
  /** Height of the bottom of the straight shell above the body axis. derived: delivery valve top 0.062 + 0.08, plus the
   *  0.0485 m neck and bottom dome of the vessel. */
  shellBottom: 0.1905,
  /** Height of the outlet port above the body axis, where the delivery pipe leaves the chamber. estimate. */
  outletHeight: 0.22,
  /** Outer diameter of the outlet pipe at the chamber: ½" (21.3 mm). estimate: delivery pipe ≈ half the drive pipe (S4). */
  outletPipeDiameter: 0.0213,
} as const;

/** Small fittings. */
export const FITTINGS = {
  /** Pressure gauge case diameter. estimate: a standard 63 mm gauge, dial of 270°. */
  gaugeDiameter: 0.063,
  /** Full scale of the gauge, bar. estimate: 0–10 bar, above the 6.5 bar peak of the model. */
  gaugeFullScaleBar: 10,
  /** Snifter valve body diameter. estimate: ¼" brass snifter. */
  snifterDiameter: 0.016,
  /** Height of the snifter above the body surface. estimate. */
  snifterHeight: 0.045,
  /** Length of the outlet valve V3 and of the drain valve V2 (DN15 brass ball valves). estimate. */
  smallBallValveLength: 0.075,
  /** Length of the outlet pipe stub drawn after the outlet valve. estimate. */
  outletStubLength: 0.12,
} as const;
