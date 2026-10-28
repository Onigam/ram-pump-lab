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
  /** Delivery pipe inner diameter. derived (physics.md: 0.6 × 27 mm = 16.2 mm), which is a model assumption, not a source value: S4 gives half the drive pipe (13.5 mm); the sheets print it as an estimate. */
  deliveryBore: 0.0162,
  /** Delivery pipe outer diameter. estimate: blue PE100 pipe 25 × 4.4 mm, whose bore is the derived 16.2 mm. */
  deliveryOuterDiameter: 0.025,
  /** Length of the last horizontal run of the drive pipe through the pit wall, before the elbow. estimate. */
  driveLevelRun: 1.4,
  /** Length of the first horizontal run of the drive pipe, on the bench of the tank (gate valve, saddles), before it goes down the
   *  slope. estimate. */
  driveStartRun: 1.8,
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
  /** Air space between the overflow level (`height`) and the underside of the lid: it holds the vent and the free fall of
   *  the feed pipe. estimate. */
  freeboard: 0.16,
  /** Lid thickness. estimate: a rotomoulded polyethylene lid. */
  lidThickness: 0.05,
  /** How far the lid overhangs the wall. estimate: 3 cm, to shed the rain off the wall. */
  lidOverhang: 0.03,
  /** Thickness of the concrete slab the tank stands on. estimate: 5.7 t of water on a levelled bench. */
  slabThickness: 0.18,
  /** How far the slab goes beyond the shell. estimate: 28 cm of apron to walk on and drain the base. */
  slabOverhang: 0.28,
  /** Distance from the inner face of the wall to the start of the drive pipe (wall socket, gate valve, nipples). estimate. */
  outletLength: 0.3,
  /** Heights of the three galvanised steel hoops that hold the shell, above the floor. estimate: one low, where the pressure is highest, then every 0.65 m. */
  hoopHeights: [0.35, 1.0, 1.65],
  /** Width of a hoop. estimate: 5 cm of galvanised strip. */
  hoopWidth: 0.05,
} as const;

/** Spring catchment (captage): a stone-lined basin fed by a seep, pipe to the tank. */
export const SPRING = {
  /** Inner length of the basin. estimate: a small stone box that collects the seep. */
  basinLength: 1.3,
  /** Inner width of the basin. estimate: see basinLength. */
  basinWidth: 0.9,
  /** Inner depth of the basin. estimate: see basinLength. */
  basinDepth: 0.55,
  /** Wall thickness of the stone basin. estimate: 18 cm, a masonry or poured wall that holds the earth. */
  basinWall: 0.18,
  /** Distance from the basin to the tank axis, along the slope. estimate: far enough for the rock scarp between the shelf and the bench. */
  distanceToTank: 4.2,
  /** Pipe from the basin to the tank, outer diameter. estimate: 32 mm PE feed. */
  feedPipeDiameter: 0.032,
  /** Height of the rim of the box above the ground around it (keeps the surface water out). estimate: 10 cm, so run-off cannot enter. */
  boxRim: 0.1,
  /** Thickness of the floor slab of the box. estimate: poured concrete. */
  boxFloor: 0.12,
} as const;

// ------------------------------------------------------------------------------------------------ the catchment

/**
 * The `catchment` world (and the spring and tank of the site, which use the same model): the spring box, the gravel bed, the
 * feed pipe, the buffer tank and the start of the drive pipe. Nothing here is in the video (S1 only says that there is a
 * buffer tank that empties, K8): every value is an estimate, sized from usual practice for a small spring supply, and the
 * part sheets and drawings must flag it. Sizes that come from `TANK` and `SPRING` are not repeated.
 *
 * Frame. Origin on the axis of the tank at the level of its inner floor (Y = 0), X east and downhill (towards the drive pipe),
 * Y up, Z south (towards the viewer of the home view). The spring side lies at negative X: the distances below are
 * magnitudes towards the west (`SPRING.distanceToTank` is the distance from the box to the axis of the tank).
 *
 * Hydraulics the model draws (the checks of `catchment.test.ts`): the spring seeps out of a rock fissure into a gravel bed, crosses
 * it (coarse stones, then medium, then fine) and enters the box through the ports of its west wall; the box outlet is the
 * highest point of the feed pipe, which then falls all the way (2 %) to a free end above the overflow level of the tank,
 * so the box never feels the tank; the drive pipe leaves low (0.18 m) behind a strainer with an anti-vortex plate, away from
 * the silt; the overflow leaves at the overflow level, the vent is open, the drain is at the lowest point.
 *
 * Where the model departs from Oxfam TB5 (S9), which it follows for the box: the washout of the box is a rubber plug on a chain
 * (S9: an end cap that screws on), and the gravel bed is drawn bare so that its three zones can be seen (S9 covers it with
 * sheeting and soil).
 */
export const CATCHMENT = {
  // ---- ground (the diorama is a cut-out block of the hillside: bench, scarp, upland shelf, then the slope of the drive pipe)
  /** Depth of the bench the tank stands on below its inner floor. estimate: the slab sits 0.14 m in the ground. */
  benchDepth: 0.05,
  /** Height of the upland shelf (ground at the spring box) above the inner floor of the tank. derived: the box floor is
   *  `basinDepth − boxRim` below the ground, and the outlet of the box (at ground level) must stay above the lid of the tank
   *  (2.21 m) for the feed pipe to fall all the way: 2.45 m. */
  shelfHeight: 2.45,
  /** Distance of the foot of the scarp (the rock step between the bench and the shelf) from the tank axis. estimate: 0.3 m of access between the slab (1.23 m) and the rock. */
  scarpFoot: 1.55,
  /** Distance of the lip of the scarp from the tank axis. estimate: a 2.5 m high rock step over 0.75 m. */
  scarpLip: 2.3,
  /** Slope of the drive pipe (tangent of its angle), which is also the slope of the ground east of the bench. derived: the
   *  fall over the horizontal run √((L − level runs)² − h²) = 15.0 m of the pipe of the site (h = 7.5 m, L = 20 m, runs of 1.4 m and
   *  1.8 m at the two ends). */
  driveSlope: SITE.fall / Math.sqrt((SITE.driveLength - SITE.driveLevelRun - SITE.driveStartRun) ** 2 - SITE.fall ** 2),
  /** Height of the axis of the drive pipe above the ground on its concrete saddles. derived: the outlet is 0.18 m above the
   *  inner floor of the tank, which stands 0.05 m above the bench (`benchDepth`). */
  driveAboveGround: 0.23,
  /** Extent of the diorama block west of the tank axis. estimate: the whole rock outcrop behind the gravel bed. */
  blockWest: 9.0,
  /** Extent of the block east of the tank axis. estimate: 4 m of the drive pipe going down the slope. */
  blockEast: 5.2,
  /** Half width of the block (along Z). estimate: 3.6 m either side of the pipe line, enough to hold the ditch and the outcrop. */
  blockHalfWidth: 4.6,
  /** Depth of the base of the block below the inner floor of the tank. estimate: leaves 1.1 m of ground under the east end. */
  blockBase: 2.0,

  // ---- spring box (inner size and wall: `SPRING.basin*`, rim and floor: `SPRING.box*`)
  /** Diameter of the ports through the west wall that let the filtered water into the box. estimate: 50 mm, large enough not to clog, many enough to spread the flow. */
  boxPortDiameter: 0.05,
  /** Number of ports. estimate: three over the 0.9 m width. */
  boxPortCount: 3,
  /** Distance between two ports (along Z). estimate: 0.3 m, a third of the width of the wall. */
  boxPortSpacing: 0.3,
  /** Height of the axis of the ports above the floor of the box. estimate: low, so they are always under water. */
  boxPortHeight: 0.28,
  /** Height of the axis of the outlet of the box above its floor. derived: `SPRING.basinDepth − SPRING.boxRim` = 0.45 m, the
   *  pipe leaves at ground level and the 0.45 m below it hold the silt. */
  boxOutletHeight: 0.45,
  /** Depth of the water in the box in normal running. derived: crown of the feed pipe (0.45 + 0.013 m) plus 12 mm of head. */
  boxWaterLevel: 0.475,
  /** Depth of the layer of silt on the floor of the box. estimate: a few weeks of deposit, small against the 0.45 m of sump. */
  boxSediment: 0.03,
  /** Height of the axis of the overflow stub of the box above its floor: its invert (0.479 m) is just above the working level, and
   *  its axis under the top of the gravel bed (0.50 m), so nothing can back up into the gravel (Oxfam TB5: the overflow lower
   *  than the catchment works, to avoid back-pressure). */
  boxOverflowHeight: 0.495,
  /** Outer diameter of the overflow stub (a flap valve keeps animals and insects out). estimate: PVC 32, the size of the feed pipe. */
  boxOverflowDiameter: 0.032,
  /** Diameter of the washout plug in the floor of the box (a rubber plug on a chain to empty the silt; Oxfam TB5 closes its washout with a screwed end cap). estimate: 60 mm, a size a hand removes. */
  boxWashoutDiameter: 0.06,
  /** Diameter of the strainer at the start of the feed pipe, inside the box. estimate: twice the 32 mm pipe, so its open area exceeds the pipe's. */
  boxStrainerDiameter: 0.07,
  /** Length of that strainer. estimate: 0.10 m, short enough to stay under water at the working level. */
  boxStrainerLength: 0.1,
  /** Thickness of the galvanised steel lid of the box. estimate: 4 mm checker plate, light enough to lift by hand. */
  boxLidThickness: 0.004,
  /** How far the lid overhangs the rim. estimate: 5 cm, to shed the rain over the walls. */
  boxLidMargin: 0.05,
  /** Angle the lid is propped open at, degrees from closed. estimate: laid back behind the box on its stay, clear of the work. */
  boxLidOpenDeg: 135,
  /** Outer diameter of the vent pipe of the box. estimate: PVC 40, enough for the little air the level moves. */
  boxVentDiameter: 0.04,
  /** Height of the vent above the rim. estimate: 0.25 m, above the snow and the splash. */
  boxVentRise: 0.25,

  // ---- gravel bed
  /** Length of the bed (along X, between the rock and the box). estimate: 1.1 m, three zones of 0.35 m. */
  filterLength: 1.1,
  /** Width of the bed (along Z). estimate: wider than the box, to catch the whole seep. */
  filterWidth: 1.5,
  /** Thickness of the stone kerb on each side of the bed. estimate: one brick-sized stone, as in Oxfam TB5's dry-stone wall. */
  filterKerb: 0.15,
  /** Height of the gravel above the ground. estimate: 5 cm, a heaped surface that sheds water. */
  filterTop: 0.05,
  /** Size of the stones of the fine zone, next to the rock where the spring comes out. estimate: 5–15 mm. Oxfam TB5 (spring
   *  protection): the stones behind the catchment wall are smaller near the eye of the spring and larger near the wall. */
  grainFine: 0.01,
  /** Size of the stones of the medium zone. estimate: 15–30 mm. */
  grainMedium: 0.025,
  /** Size of the stones of the coarse zone, against the west wall of the box, which lets the water through with little silt.
   *  estimate: drainage gravel 40–60 mm. */
  grainCoarse: 0.05,
  /** Share of the length of each zone, from the rock to the box (fine, medium, coarse). estimate: three zones of about a third each. */
  filterZones: [0.3, 0.34, 0.36],
  /** Height of the fissure where the spring comes out of the rock, above the shelf. estimate: a seep a little above the ground, so that the trickle can be seen. */
  seepHeight: 0.45,
  /** Height of the rock outcrop above the shelf. estimate: 1.9 m, a rock face a person cannot reach over. */
  outcropHeight: 1.9,

  // ---- feed pipe (outer diameter: `SPRING.feedPipeDiameter`)
  /** Wall of the PE feed pipe. estimate: PE100 SDR11, 32 × 3.0. */
  feedPipeWall: 0.003,
  /** Slope of the feed pipe from the box to the tank, m per m. estimate: 2 %, so it falls all the way. */
  feedFall: 0.02,
  /** Distance from the tank axis to the point where the feed pipe goes down through the lid. estimate: far from the outlet. */
  feedInlet: 0.75,
  /** Height of the free end of the feed pipe inside the tank above its floor. derived: 0.04 m over the overflow level
   *  (`TANK.height`), so the pipe never dips in the water. */
  feedEnd: 2.04,

  // ---- tank fittings (shell: `TANK`)
  /** Layer of silt on the floor of the tank. estimate: 2 cm, under the 11 cm of clearance of the basket. */
  sludgeDepth: 0.02,
  /** Outer diameter of the flange of a bulkhead fitting through the wall. estimate: 70 mm for a 1″ fitting. */
  bulkheadDiameter: 0.07,
  /** Diameter of the manhole of the lid. estimate: enough for a person's arm and a bucket. */
  manholeDiameter: 0.45,
  /** Position of the manhole on the lid (x). estimate: near the middle, away from the feed inlet and the vent. */
  manholeX: 0.12,
  /** Position of the manhole along Z. estimate: 0.3 m to the front, where it can be reached. */
  manholeZ: 0.3,
  /** Outer diameter of the vent pipe of the lid. estimate: PVC 50, enough for the air a 17 L/min draw moves. */
  ventDiameter: 0.05,
  /** Rise of the vent above the lid, before its goose-neck bend. estimate: 0.18 m, above the splash and the snow. */
  ventRise: 0.18,
  /** Position of the vent on the lid (x). estimate: on the east side, away from the feed inlet. */
  ventX: 0.55,
  /** Position of the vent along Z. estimate: near the back edge of the lid, out of the way of the manhole. */
  ventZ: 0.62,

  // ---- overflow
  /** Outer diameter of the overflow pipe. estimate: PVC 63, far more than the 7.5 L/min of the spring. */
  overflowDiameter: 0.063,
  /** Azimuth of the overflow, degrees from +X towards +Z. estimate: south-east, towards the ditch, clear of the outlet and the feed. */
  overflowAzimuthDeg: 50,
  /** Distance from the tank axis to where the overflow pours out, over the ditch. estimate: past the slab (1.23 m), over the head of the ditch. */
  overflowDischargeRadius: 1.9,
  /** Height of the mouth of the overflow above the inner floor level. estimate: 0.3 m above the bench, an air gap over the ditch. */
  overflowDischargeHeight: 0.3,
  /** Position of the ditch (concrete gutter) along Z. estimate: in front of the tank, then down the slope. */
  gutterZ: 1.55,
  /** X of the head of the gutter (open, the overflow and the drain pour into it). estimate: past the slab, on the bench. */
  gutterStart: 1.95,
  /** Outer width of the gutter. estimate: 26 cm, a common half-round of concrete. */
  gutterWidth: 0.26,
  /** Outer height of the gutter. estimate: 10 cm. */
  gutterDepth: 0.1,
  /** Wall of the gutter. estimate: 35 mm of cast concrete. */
  gutterWall: 0.035,

  // ---- intake screen (the strainer at the start of the drive pipe, inside the tank)
  /** Outer diameter of the perforated basket. estimate: three times the 33.7 mm pipe, so its open area is ≥ the pipe's. */
  screenDiameter: 0.14,
  /** Length of the basket. estimate: 0.22 m, so its open area is several times the pipe's. */
  screenLength: 0.22,
  /** Length of the pipe stub between the basket and the wall. estimate: 0.22 m, to hold the basket clear of the wall. */
  screenStub: 0.22,
  /** Diameter of the perforations. estimate: 4 mm, to keep out leaves, silt lumps and grit. */
  screenHole: 0.004,
  /** Diameter of the anti-vortex plate above the basket, which stops the air a whirlpool would draw in. estimate: 0.30 m, about twice the basket diameter. */
  vortexDiameter: 0.3,
  /** Gap between the top of the basket and the plate. estimate: 7 cm, about half the basket diameter. */
  vortexGap: 0.07,

  // ---- drive gate valve (outside the tank, on the outlet)
  /** Length of the body of the DN25 bronze gate valve. estimate: usual for a threaded 1″ gate valve. */
  gateBodyLength: 0.09,
  /** Diameter of its body. estimate: 50 mm, the swell of a 1″ valve body. */
  gateBodyDiameter: 0.05,
  /** Height of its bonnet above the axis. estimate: 70 mm, bonnet and packing nut. */
  gateBonnetHeight: 0.07,
  /** Rise of the stem above the bonnet when the valve is open. estimate: 60 mm, the travel of the gate. */
  gateStemRise: 0.06,
  /** Diameter of the hand wheel. estimate: 80 mm, a hand's width. */
  gateWheelDiameter: 0.08,

  // ---- tank drain
  /** Outer diameter of the drain pipe. estimate: PVC 50. */
  drainDiameter: 0.05,
  /** Height of the axis of the drain above the floor: its invert is flush with the floor, the lowest point. It leaves on the
   *  same side as the drive outlet, 0.15 m below it. estimate: the pipe bottom 5 mm above the floor. */
  drainAxisHeight: 0.03,
  /** Length of the PVC ball valve of the drain. estimate: 90 mm, a DN50 compact valve (drawn DN50 like its pipe; the simulation's assumed drain flow of 150 L/min is a separate model constant). */
  drainValveLength: 0.09,
  /** X where the drain pipe, which leaves east under the drive pipe, turns south towards the ditch. estimate: past the slab edge, short of the head of the ditch. */
  drainTurnX: 1.55,
} as const;

/** Ram pit (fosse): a concrete chamber with a lid and a drain. */
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

/**
 * Waste-water drain of the site: the water the waste valve throws out (≈ 6.3 of the 6.7 L/min of drive flow with the n°1 valve)
 * leaves the pit by its drain (`PIT.drainDiameter`), runs in a buried pipe with inspection chambers to the point where the ground
 * has fallen below it, comes out of a headwall into an open concrete ditch that follows the steepest slope and ends in a soakaway
 * (a stone ring over a gravel pit), where it falls and sinks into the ground. Nothing of this is in the video: estimates.
 */
export const WASTE_DRAIN = {
  /** Fall of the buried pipe, m per m. estimate: 2 %, usual for a 100 mm drain. */
  fall: 0.02,
  /** Outer diameter of the cast ring of an inspection chamber. estimate. */
  manholeDiameter: 0.64,
  /** Height of the chamber above the ground. estimate. */
  manholeRise: 0.07,
  /** Diameter of the cast-iron cover. estimate. */
  manholeCoverDiameter: 0.56,
  /** Width, height and depth (along the pipe) of the concrete headwall the pipe comes out of. estimate. */
  headwallWidth: 0.9,
  headwallHeight: 0.5,
  headwallDepth: 0.35,
  /** Length of the open ditch from the headwall to the soakaway. estimate: enough for the drop to sink in the ground. */
  ditchLength: 15,
  /** Outer width of the ditch. estimate. */
  ditchWidth: 0.36,
  /** Outer height of the ditch. estimate. */
  ditchDepth: 0.12,
  /** Wall of the ditch. estimate. */
  ditchWall: 0.04,
  /** Outer diameter of the stone ring of the soakaway. estimate: 6.3 L/min sinks into a gravel pit of this size. */
  soakawayDiameter: 1.7,
  /** Height of the stone ring above the ground. estimate. */
  soakawayRise: 0.28,
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

/** House (maison). */
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
  /** Top of the anchor block (`FOUNDATION`) under the feet, which stand on it. estimate: feet 0.107 m tall under the 0.038 m body radius. */
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

/**
 * Anchor block (massif d'ancrage) under the two cast feet: the hammer pressures reach several bar (research §7), so the ram
 * is bolted down. Its top face is `RAM.floorY` (the feet stand on it); the part is drawn as a pad of poured concrete with the
 * anchor studs cast in it. All values are estimates: the video gives no foundation.
 */
export const FOUNDATION = {
  /** Thickness of the exposed pad. estimate: 60 mm, which is also the gap to the pit floor (PIT.floorY). */
  thickness: 0.06,
  /** Length along X. derived: the body length (0.56 m) plus the overhang at both ends. */
  length: RAM.bodyLength + 2 * 0.04,
  /** Overhang of the pad upstream of the inlet face of the body (x = 0); the same on the downstream side. estimate: centres it on the body. */
  overhang: 0.04,
  /** Width along Z. estimate: the 0.13 m wide feet plus 85 mm each side. */
  width: 0.3,
  /** Distance of an anchor stud from the axis, along Z. estimate: the bolt holes of the feet, ±52 mm. */
  studOffsetZ: 0.052,
  /** Radius of an anchor stud. estimate: M10. */
  studRadius: 0.005,
  /** Height of the stud above the pad. estimate: through the 12 mm foot lug, its washer and nut (22.5 mm), with about 10 mm to spare. */
  studHeight: 0.044,
  /** Depth of the stud in the concrete. estimate: 10 × diameter anchorage. */
  studEmbed: 0.05,
  /** Nut across flats and thickness (M10). estimate. */
  nutAcrossFlats: 0.017,
  /** Thickness of an M10 nut. estimate. */
  nutThickness: 0.008,
  /** Outer diameter and thickness of the washers. estimate: M10 large washer. */
  washerDiameter: 0.024,
  /** Thickness of the washers. estimate. */
  washerThickness: 0.0025,
  /** Chamfer of the pad's top edge. estimate. */
  chamfer: 0.006,
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
  /** Radius of the bolt circle of the DN25 flanges (4 bolts). estimate: PN16 DN25 (Ø 85 mm circle). */
  boltCircleRadius: 0.0425,
  /** Radius of the shank of the flange bolts. estimate: M10. */
  boltRadius: 0.005,
  /** Length of the flange bolts under the head. estimate: through one flange, the gasket and 14 mm into the next. */
  boltLength: 0.034,
  /** Hex head of the flange bolts: across flats. estimate: M10 (17 mm). */
  boltHeadAcrossFlats: 0.017,
  /** Hex head of the flange bolts: thickness. estimate: M10. */
  boltHeadThickness: 0.007,
  /** Gasket between the drive pipe flange and the strainer flange. estimate: 2 mm fibre gasket. */
  gasketThickness: 0.002,
  /** Height of the weld collar that joins the drive pipe to its flange. estimate. */
  weldCollarHeight: 0.014,
} as const;

/**
 * The waste (impulse) valve of the video, valve n°1 shown (research §3, S1 06:20–15:40). Heights are measured upwards
 * from the top face of the base plate (the stack stands on the body's waste flange, whose top is RAM.wasteFlangeTop).
 * Exact lengths are not given in the video: every length is an estimate sized from the fitting names.
 */
export const VALVE = {
  /** Valve shown: n°1, the new valve that delivers ≈ 500 L/day (K10). */
  size: 1,
  /** Seat bore of the valves n°1 / n°2 / n°3. derived from the designation of the fittings (nominal 15×21, 20×27, 26×34: S1 03:54, K7), not a measured bore. */
  seatBore: { 1: 0.015, 2: 0.02, 3: 0.026 },
  /** Thread major diameter of the 15×21 fittings (the "21"). reported (S1 03:54: nominal 15×21). */
  threadDiameter: 0.021,
  /** Base plate square side (4 bolts). estimate: cut like the Walton's original base plate (S1 06:36). */
  basePlateSide: 0.1,
  /** Base plate thickness. estimate. */
  basePlateThickness: 0.008,
  /** Outer diameter of the welded 26×34 steel socket on the plate. estimate: a 1" socket. This is the lab's simplified version: the video welds a 20×27 fitting on the plate (S1 06:49), then adds two 26×34 fittings and a reduction; the single 26×34 is what the author says he should have used (S1 06:58). */
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
  /** Thickness of the seat ring, machined at the stem's cone angle (S1 18:54). estimate. */
  seatThickness: 0.0035,
  /** Outer diameter of the fins filed under the head: the Walton valve has small fins (S1 12:02), the author plans his own (S1 12:35), effect not shown. estimate. */
  finsDiameter: 0.0175,
  /** Height of the fins nut. estimate. */
  finsHeight: 0.009,
  /** Number of fins. estimate: small fins, as the author plans to file them (S1 12:35). */
  finsCount: 4,
  /**
   * Stack on the rod above the guide, from the guide's end face upwards: the STROKE NUT, which rests on the guide and whose
   * height on the rod sets the stroke; the COUNTERWEIGHT, which rests on the stroke nut; the LOCK NUT, on top of the weight,
   * which locks the stack (S1 12:55–13:51, 17:40–18:07). In the video's final valve the machined weight is itself the main
   * nut and there is no separate stroke nut: the lab keeps the two roles as separate parts so that each can be seen.
   * Across flats of an M6 nut. estimate.
   */
  nutAcrossFlats: 0.01,
  /** Thickness of an M6 nut. estimate. */
  nutThickness: 0.005,
  /** estimate (as `guideTop`): height of the bottom face of the stroke nut above the plate; it rests on the guide. */
  strokeNutBottom: 0.162,
  /** estimate (`guideTop` + `nutThickness`): height of the bottom face of the counterweight, which rests on the stroke nut. */
  counterweightBottom: 0.167,
  /** estimate (`counterweightBottom` + `counterweightLength`): height of the bottom face of the lock nut, on top of the weight. */
  lockNutBottom: 0.227,
  /** estimate (`lockNutBottom` + `nutThickness`): height of the top face of the lock nut, the top of the stack (the rod sticks out `rodTailProud` above it). */
  stackTop: 0.232,
  /** Counterweight machined from 30–32 mm rebar (S1 15:59): diameter reported, length derived from the mass. */
  counterweightDiameter: 0.031,
  /** derived: 360 g (physics preset valve n°1) of steel (7 850 kg/m³) in a Ø 31 mm bar = 60 mm. */
  counterweightLength: 0.06,
  /** The 3D draws the real stroke (RamState.stroke, mm) multiplied by this factor, so a 2.2 mm stroke stays visible. */
  strokeVisualScale: 4,
  /** Diameter of the through hole of the base plate (the water inlet). derived: the "26" of the 26×34 fittings (K7). */
  basePlateBore: 0.026,
  /** Diameter of the four fixing holes of the plate. estimate: M8 studs (S1 06:36: same holes as the Walton plate). */
  basePlateHoleDiameter: 0.009,
  /** Spacing of the fixing holes (square pattern, centre to centre). estimate: 70 mm on the 100 mm plate. */
  basePlateHoleSpacing: 0.07,
  /** Radius of the weld bead between the plate and the socket (S1 06:48). estimate. */
  weldBeadRadius: 0.0016,
  /** Bore (female thread) of the welded socket, equal to the male end of the reducer. derived: 1" BSP, 33.2 mm, the "34" of the 26×34 (K7). */
  socketBoreDiameter: 0.0335,
  /** Core diameter of the 15×21 female thread at the top of the reducer, where the nipple screws in. estimate: ½" BSP, 20.5 mm. */
  reducerBoreDiameter: 0.0205,
  /** Outer diameter of the top of the reducer, where the nipple's lock nut bears. estimate: below the 27 mm across flats of the nut. */
  reducerTopDiameter: 0.0316,
  /** Height where the taper of the reducer starts above the plate. estimate. */
  reducerTaperStart: 0.046,
  /** Pitch of the ½" BSP thread (14 threads per inch). derived: 25.4 mm / 14. */
  threadPitch: 0.00181,
  /** Pitch of the M6 rod. derived: ISO coarse thread. */
  rodPitch: 0.001,
  /** Hub (nut) diameter of the fins nut. estimate: a long M6 nut, 10.5 mm. */
  finsHubDiameter: 0.0105,
  /** Height of the lower machined sleeve above the plate (closed pose). estimate: centred in the thermowell tube and neck. */
  stemSleeveBottom: 0.12,
  /** Distance between the two machined sleeves, bottom to bottom. estimate: 4 mm between them. */
  stemSleeveSpacing: 0.016,
  /** Length by which the rod sticks out above the lock nut. estimate. */
  rodTailProud: 0.008,
  /** Height of the transverse ribs of the rebar. estimate: 1.1 mm on a Ø 32 mm bar. */
  rebarRibHeight: 0.0011,
} as const;

/** The bench of the `valve` world (workshop scale). All values are estimates: only the staging is invented. */
export const BENCH = {
  /** Height of the two steel parallels under the base plate. estimate: tall enough for the head and fins to leave downwards when exploded. */
  parallelHeight: 0.045,
  /** Width of a parallel. estimate. */
  parallelWidth: 0.008,
  /** Distance of the parallels from the axis, along X. estimate: under the outer edges of the plate, outside the fixing holes (Ø 9 mm at ±35 mm). */
  parallelOffsetX: 0.044,
  /** Thickness of the plinth slab. estimate. */
  plinthThickness: 0.05,
  /** Length and depth of the plinth. estimate: room for the spray. */
  plinthLength: 0.5,
  /** Depth of the plinth along Z. estimate. */
  plinthDepth: 0.36,
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
  /** Length of the outlet pipe stub drawn after the outlet valve (from the valve end to the pipe end, union included). estimate. */
  outletStubLength: 0.12,
  /** Length of the delivery union (3-piece brass union with a compression end), valve end to pipe entry. estimate: drawn as a DN15 union (½" thread) on the PE 25 pipe; a compression end for PE 25 usually has a ¾" thread, so a real one would be DN20 (not checked). */
  unionLength: 0.064,
  /** Union nut across flats. estimate: DN15 union, 36 mm. */
  unionNutAcrossFlats: 0.036,
  /** Union nut length. estimate. */
  unionNutLength: 0.018,
  /** Hex of the two tails across flats. estimate. */
  unionTailAcrossFlats: 0.03,
} as const;
