# 3D site and catchment worlds (3D-B)

`src/three/site/` (8 parts) and `src/three/catchment/` (9 parts), from `src/three/dims.ts` (`SITE`, `TANK`, `SPRING`, `CATCHMENT`,
`WASTE_DRAIN`; every value says `reported`, `derived` or `estimate`). Tests: `site.test.ts`, `catchment.test.ts`.

## One model, two worlds

`catchment/model.ts` builds the nine parts with their water, flows and section caps. The `catchment` world registers them one by
one (`detail: 'full'`, cut-out block of the hillside on a plinth, paper floor, like the Pelton intake). The `site` registers its two
frames as the single parts `spring` and `buffer-tank` (`detail: 'site'`: fewer facets), so both worlds show the same thing at the same
place and size (the two frames of the site are then merged into a few meshes, see "Draw calls" below). Frames: TANK (origin on the tank axis at the level of its inner floor, X east and downhill, Z south) and SPRING (the
same, `SPRING.distanceToTank` = 4.2 m west). `layout.ts` derives every coordinate from dims; `ground.ts` is the block; `tank.ts` and
`spring.ts` the parts; `splash.ts` the drops; `vegetation.ts`.

## The hydraulics drawn (checked by `catchment.test.ts`)

- The seep leaves a rock fissure, falls on the gravel bed, crosses it **fine stones at the rock, coarse next to the box** (Oxfam TB5:
  smaller nearer the eye of the spring, larger nearer the wall), enters the box by three ports of its west wall.
- The box outlet (ground level, 0.45 m above its floor, a sump under it) is the high point of the feed pipe, which falls 2 % all the way
  and ends 0.04 m above the overflow level of the tank: the box never feels the tank. Overflow stub of the box just above the working
  level and under the top of the gravel; washout plug on a chain (Oxfam TB5 closes its washout with a screwed end cap, and covers the
  bed with sheeting and soil: the lab draws it bare so that its three zones can be seen).
- Tank: Ø 1.9 × 2.0 m to the overflow (π·0.95²·2.0 = 5.67 m³ ≈ 5 700 L), 0.16 m of freeboard, lid, open vent, slab on a bench; outlet at
  0.18 m behind a perforated basket with an anti-vortex plate, away from the silt; gate valve outside; overflow bulkhead with its
  invert at the overflow level, down pipe, concrete ditch; drain on the same side as the outlet, 0.15 m under it, invert flush.
- The shelf (ground at the box) is 2.45 m above the tank floor so that the feed pipe can fall to the lid; a rock scarp joins it to the bench.

## What `update(state, dt, view)` reads

| State                                      | Effect                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `tankLevel`                                | water height = level × 2.0 m; the basket is out of the water under 0.25 m, the plate under 0.32 m             |
| `sourceFlow`, `driveFlow`, `tankDrainFlow` | trickle, stream into the tank, wet gravel; overflow = `max(0, source − drive − drain)` at level ≥ 99.5 % only |
| `gateOpen`, `valveHeldShut`                | gate valve stem and wheel (closed = down); no dot moves in the drive pipe                                     |
| `tankDrainOpen`, `tankDrainFlow`           | lever across / along the pipe; tongue of water and splash, water in the ditch (the sim gives 150 L/min)       |
| `driveVelocity`, `view.schematic`          | "Flux" dots (signed, like the site's); the other paths have a symbolic speed                                  |
| `waveSpeed`                                | drive pipe steel / PVC / polyethylene (900 / 500 / 350): the state has no pipe material                       |
| `wasteFlow`                                | site: wet pit floor, ditch water, dots, splash at the soakaway                                                |
| `view.cutaway`                             | section on z = 0: ground, box, bed (3 grain zones), tank, water, intake screen, drain                         |

Nothing flows while a part is exploded, hidden or a wire (`Hold`): the water of a hidden container goes, not the others'.

## The spring box, the trickle, the runnel (fixes after the film, 31/10/2026)

The film saw the catchment from 30 m (O02): no water, and a thin dark lid propped half open that stood up like a laptop. Same
build in both worlds (`catchment/spring.ts`):

- **The lid** (galvanised checker plate on a frame of 30 mm flats, `boxLidFrameDepth`, light grey with a procedural tread) is
  thrown back over its two hinges (`boxLidHingeDiameter`, a leaf on the rim and one on the lid) and lies upside down on the ground
  behind the box. Its angle is derived from the ground (`layout.ts` `boxLidOpenAngle`: a little more than half a turn, until a
  far corner or the handle touches); the prop rod is gone.
- **The water**: the surface of the box is a clearer, glossier blue. In the site the ground is no longer drawn over the box and
  the gravel bed (`terrain.ts` `setOpenings`: two rectangles in plan, cut in the fragment shader, that follow the sliders): the
  grass covered the gravel and came within 2.5 cm of the water.
- **The trickle** ("un filet d'eau, rien de plus") is drawn at least 4 px wide (`site/pipes.ts` `minWidthStream`: the shader
  widens the stream with the distance, like the pipes), clear and bright. The dark core of the outcrop is set back 0.25 m and the
  boulder south of the fissure 0.15 m, the lip stone stops short of the stream: it falls free in front of the rock and shows from
  the south (it went through the core rock, and the boulder hid it from O02). The slit and the streak, a black stick in front of
  the rock, are gone; the core is a wet, glossy dark rock.
- **The runnel** under the overflow stub of the box: a damp strip between two rows of stones, 1.6 x 0.2 m (`boxRunnelLength`,
  `boxRunnelWidth`), part of the ground decoration (it stays when the box is exploded). **Decoration**: the model's box never
  overflows (its working level is under the overflow invert), so the runnel is damp and glossy, not running.
- **The grass of the catchment world** grows only on the grass of the top (off the gravel apron of the tank, `TANK_APRON`), and the
  section clips the tufts and the trees like the ground they stand on (tufts of the front half stood on the paper floor and in
  front of the cut faces).
- Tests (`catchment.test.ts`): the lid rests on the ground (nothing in it, touching it within 5 mm), the trickle meets no rock
  (five vertical rays), the runnel lies on the ground, the tufts are inside the block and on grass, the section clips the plants.
  (`site.test.ts`): the openings of the ground follow the box and the bed for three settings of the sliders.

## Second pass after the independent review (`docs/qa.md`, 31/10/2026)

- **D1, the runnel read as running water.** Its bed is now dark wet earth with moss along its edges and in patches (vertex colours,
  roughness 0.62, little reflection), its stones damp and darker. No blue surface: the model's box never overflows.
- **D3, the box stood up to 1.2 m out of the ground at long drive pipes, its lid in the air.** The fine part of the site's grid
  (0.8 m cells) stopped 36 m west of the ram; at 52 to 60 m of drive pipe the catchment lay in cells of up to 3.7 m, which smeared the
  shelf, the scarp and the bench into one slope. The fine part now reaches the far side of the catchment for the longest drive pipe
  the sliders allow (`CATCHMENT_WEST` in `terrain.ts`). The lid is its own small mesh on a hinge flagged dynamic, and the site rests it
  on its own ground at every layout (`CatchmentModel.restLid`). Test: rim 0.1 m over the ground and lid touching it at eight settings.
- **D4, close up the trickle was a white rod.** From under 3 m to 10 m away it turns clear and blue-grey, its thickness wavers, streaks
  run down it and its lower third breaks into drops (`minWidthStream(…, water)`, driven by the view's clock); from afar it stays the
  same bright line of at least 4 px. Where it lands: more drops thrown up (`Splash`) and a faint ring of white water (decoration).
- **The z-fight beside the spring box (S17).** The earth's section cap drew a sliver of earth over the caps of the gravel bed, in their
  plane: where the bed and the box share an edge, the cap took a sample at ground height. The cap now steps from the bottom of one
  excavation to the next, leaves the excavations to the caps of the parts (the bed's notch goes down to the underside of its slab,
  `BED_SLAB_BOTTOM`), and holds every layer above the base (a layer ending under it made a twisted quad over the plinth's cap). The
  linings of the excavations stand 4 mm outside the box and the bed. Chosen over a polygon offset: no two caps overlap at all.
  Measured over 41 frames of the S17 dolly: brown pixels in the crop in 25 frames before, 0 after; pixels that jump in 4 or more frames
  of the move 1,644 before, 898 after (what remains are edges in motion). Test: no triangle of the earth's cap over an excavation
  above its bottom, none under the base.
- **D5**: the sheet of `spring-box` says the lid is shown thrown back and names the runnel, with its size, in both languages.
- **D6** (the grab pivots on the tank shell in front of a selected part) needs the kit: request 15 in `kit-requests.md`.
- Budgets at the home view (Metal, 1280 x 800): site 266 -> 279 draw calls, 247,694 -> 268,846 triangles (mostly the finer grid of the
  ground over the catchment's range; the lid on its own; the foam and drops); catchment 189 -> 196, 68,057 -> 69,289.

## The pipes reach the pit (fixes after the film, 31/10/2026)

- **Drive pipe.** The pad of the pit was graded over the corridor of the pipe: the pipe hung up to 1.6 m over the ground on the
  last 10 m, saddles in the air, then dived into the pad 4 m before the wall. The corridor is now applied after the pads: the
  ground stays 0.23 m under the pipe all the way down (`driveBedY`), the slope comes down to the pad, and from there the pipe goes on
  down to its elbow in a trench (`TRENCH`: 0.5 m floor, banks of 2:1, three forced grid lines along z = 0) to the west wall of the
  pit, which it enters through a mortar collar. Saddles every 3 m down to the trench, now tilted with the slope (they were tilted
  the other way, a corner 18 cm in the ground). The flow dots run on the curve of the tube itself (a spline through the four
  corners strayed 0.1 to 0.3 m off it, and on into the grass).
- **Delivery pipe.** It was buried over its first 9 m: from afar its blue line stopped 50 to 60 px short of the pit. It now runs
  from the stub of the ram along the pit to the east wall, up the wall, out through the curb just above the ground (a collar),
  and lies on the ground all the way (its axis a pipe radius over it, for every diameter). The tube is three tubes in one mesh
  (the pit with short runs and tight bends, the route sampled every 0.6 m, the riser and gooseneck sampled every 0.1 m), and the
  dot path follows the same three curves, its points close where it bends. The foot of the riser is a short round bend (the spline
  through a square corner dipped 5 cm under the ground and swung 8 cm past the riser).
- The drawings read the same polyline: D12's table moves by at most 0.2 m, the length now reads 300 m (it read 299).
- Tests (`site.test.ts`, three settings of the sliders): the drive pipe is never under the ground and never more than its saddle
  over it from the bench to the wall, ends past the wall on the axis, the trench floor is at the wall; every saddle rests on the
  ground; the delivery pipe starts at the stub, leaves above the ground and under the top of the curb, lies on the ground for 40 m;
  every flow dot is within 1 cm of the surface of its tube.

## Site changes

Waste-water drain (`waste-drain`, `site/waste.ts`): pit drain Ø 100 → buried pipe (2 % fall, two inspection chambers) → headwall where the
ground has fallen below it → open concrete ditch along the steepest slope (15 m) → soakaway (stone ring over gravel) with a splash.
The drive pipe now starts at the gate valve, runs 1.8 m level on the bench (saddle), then down the slope on saddles 0.23 m above the ground
(the wave 2 ground buried it by 0.22 m). The terrain follows the catchment profile (shelf, scarp, bench) around the tank, wherever `fall`
and `driveLength` put it. `tankVolume` is not in `RamState`: the tank stays 5 700 L (exposing it would let the tank scale).

## Frames and budget

Site: X east, Y up (0 = ram inlet axis), Z south; fall and head at true height.

What the site draws at its home view (1280 x 800, shadow pass included; see `docs/3d.md` for the method and the other worlds):
**831 draw calls and 485,539 triangles before the fix wave, 260 and 245,266 after**. Where it went:

- **Forest** (`vegetation.ts`, 1,213 trees, 112,000 triangles drawn twice): cut into tiles of 150 m (trunks, conifers and broadleaves each
  an instanced mesh, culled by tile); trunks without top and bottom, blobs without their buried faces. The sun's shadow comes from coarse
  meshes with the matrices of the crowns (a cone, an ellipsoid; 16 and 20 triangles) that only the shadow pass draws: the renderer asks each
  mesh `intersectsFrustum(frustum)` in both passes, and a caster answers false to the frustum of a perspective camera. The crowns and
  trunks cast nothing. On screenshots of the default view the forest and its shadows differ from the old ones only along the edges of the
  shadows (`vegetation.test.ts` checks the casters and the tiles).
- **Ground** (`terrain.ts`): the same grid of 217 x 209 vertices, 90,000 triangles, drawn as tiles of 40 x 40 cells that share the attributes
  and each own an index; their bounding spheres are refreshed from the heights at every change of the sliders (`terrain.test.ts`), so that
  the renderer culls what is behind the camera.
- **The ram in its pit** (194 meshes, 63,000 triangles, again in the shadow pass): a `THREE.LOD`, the animated model within 9 m, a coarse
  frozen copy beyond (`lod.ts`).
- **Tank, spring, house, tower, pit, waste drain**: static meshes merged by material (colours in the vertices), a quarter of the draw calls.
- Left as they are: the drive and delivery pipes (one tube each, reshaped when the sliders move), the sky, the water.

The sun's shadow map is still 2,048 x 2,048 (a smaller one is a lever with a visible cost); a pixel ratio cap on small screens belongs to the kit.

After the fixes of 31/10/2026 (same method, Metal): site 261 -> 266 draw calls, 245,266 -> 247,694 triangles (the two collars, the
runnel and its stones, the finer delivery tube at the tower); catchment 188 -> 189, 66,969 -> 68,057. The shadow fit costs about
0.04 ms a call on an M3 Pro (75 rays of about 100 steps on the grid of the ground; one call per draw and one per update).

## The sun's shadow box (fix after the film, 31/10/2026)

The film found the shadows of a whole hillside changing sharpness from one frame to the next in slow camera moves (O01 at 0:16.40,
S04 at 1:00.13, S25 at 3:11.63): the box took sizes by steps of 30 % (and 112 m whenever the view axis met no ground), at a
distance found by a march in steps of 7 %. `shadow-fit.ts` makes the box a continuous function of the camera, and of the camera
alone:

- the distance to what the camera looks at is the harmonic mean of 15 rays over the middle of the picture (rows at 0, ±4, ±8
  degrees, columns at 0, ±10), each a thin vertical fan of five rays (±1 degree); each ray is followed in steps of 6 % and lets
  through the share of a step that lies above the ground (linear between its ends), so that a crest the view comes down over is
  passed gradually, not in one frame; a ray that meets nothing counts for 600 m;
- the half size is 0.55 times that distance, 10 to 320 m, continuous (no steps); the focus is snapped to the texels of the map,
  so that a pan or an orbit at a constant size does not shimmer;
- the box is aimed in `scene.onBeforeRender`, with the camera of the draw that is starting (it used the camera of the previous
  draw): the first frame after a cut has its own shadows. The catchment world aims its box the same way, at the plane of the work
  (y = 1, or 0.5 m under a lower camera), continuously, between 2.2 and 10.6 m (its old smallest and largest steps).

Measured by rendering the film's moves frame by frame (headless Chrome, Metal, 960 x 540, the frame-to-frame mean change of the
pixels, 0 to 255): O01, the worst frame was 2.84 times the median of its 16 neighbours before (frame 492: 1.94 against 0.68), 1.06
after; S04 11.2 before (frame 138: 2.03 against 0.18), 1.12 after; S25 10.7 before, 1.15 after. Near the ram the box is 10 m (the
old smallest step was 10.6 m). `shadow.test.ts` follows the film's moves, an orbit and a tilt step by step (at most 3 % of size per
frame, against steps of 30 %), checks that the same camera gives the same box whatever came before, and that the draw aims the
box before the shadow pass.

## The picture of the site (kit 0.5.0, 31/10/2026)

- **Tone**: the site asks for its own (`scene.userData.look = { toneMapping: 'neutral', exposure: 1.32, saturation: 0.86 }`).
  - The Neutral curve keeps the colours of the light and of the materials.
  - The extra exposure and the lower saturation keep the greens and the sky close to where ACES had them.
- **Haze and light** (`sky.ts`): the haze of a summer valley instead of a cold blue-grey (`cfd5d2`, was `c4d3e2`), a slightly warmer
  sun (`ffeed8`) and sky light (`c6d4e2`), and a warmer bounce from the grass (`5c5434`, was `4a4a32`).
- **Far slopes without stripes** (`layout.ts`, `terrain.ts`).
  - The ground's grid is a tensor product: at 1 km to the north its cells are a few metres wide along x (the columns of the site)
    and 45 m along z. The 20 m octave of the relief was sampled through them and drew gullies down the mountains (film review m-a).
  - Each octave is now faded by the size of the cell that carries it (`staticPart(x, z, cell)`), and so is the colour noise.
  - Cells under 3 m keep everything, so nothing changes near the site. `detail.test.ts` checks both.
- **Pipes and trickle at their width** (`pipes.ts`, `trackViewHeight`).
  - Their minimum width (2.6 CSS px) comes from the projection and the real height of the view. It was a constant for an 800 px
    view: 1.9 px in a 1080 px film, 1.2 px on a phone, where a line breaks up and crawls.
- **Grass** (`detail.ts`, `grassDetail`): drier and greener patches tens of metres across, tufts a metre across and their bump. Each
  layer fades out before it gets under about two pixels, so it adds detail close up and no shimmer from afar.
- **Trees** (`crownShading`): a crown is darker at its bottom and inside, as the sky does not reach there.
- **Stones** (`layStones`, `buildStones`).
  - Nine groups: a large stone with smaller ones around it, on the edges of the clearings, by the house and the tower, and a few lone
    boulders in the meadow. 32 stones, 0.1 to 1 m.
  - They avoid the pit, the waste drain, the drive pipe and its tank, the delivery route and the buildings.
  - Each sits a fifth of its height into the ground (its foot under the surface, its top above, checked) and follows the ground when
    the sliders move it.
  - Faceted, three shapes, five tones, moss where the faces look up. Not a scatter of pebbles: the owner found the study's pebbles too
    many and too even.

## To wire in `src/lab.ts` (lead)

- `catchment`: `xrayShell: (id) => ['tank-shell', 'tank-lid', 'spring-box'].includes(id)`, `stepFrame: { padding: 1.5, minRadius: 0.3 }`,
  `partPadding: 2.2`. The hotspot `drive-gate-valve` links to `site`; `partLinks` of `spring` and `buffer-tank` already point here.
- Site `stepFrame` `{ padding: 1.5, minRadius: 4 }` also suits `waste-drain` (a 27 m long part).
