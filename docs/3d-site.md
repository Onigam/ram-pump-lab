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

## To wire in `src/lab.ts` (lead)

- `catchment`: `xrayShell: (id) => ['tank-shell', 'tank-lid', 'spring-box'].includes(id)`, `stepFrame: { padding: 1.5, minRadius: 0.3 }`,
  `partPadding: 2.2`. The hotspot `drive-gate-valve` links to `site`; `partLinks` of `spring` and `buffer-tank` already point here.
- Site `stepFrame` `{ padding: 1.5, minRadius: 4 }` also suits `waste-drain` (a 27 m long part).
