# QA review: the fixes after the film (shadow box, grass, spring, pipes)

Independent review against `lab-kit/docs/lab-quality.md`, written by a reviewer who did not build these changes.

- **Date**: 2026-10-31.
- **Commit**: `7460d22`. These are five local commits on top of `0f05e30`, not pushed: `ee75dfe` shadow box, `7550756` grass,
  `c6c90e0` spring, `f75ea77` pipes, `7460d22` docs.
- **Setup**: dev server on port 5863. The pre-fix tree (`0f05e30`) was served on 5864 from a scratch copy for before/after comparisons.
  Headless Chrome 155. The kit walks use SwiftShader; the frame-by-frame captures, the close-ups and the spoken guide use Metal
  (Apple M3 Pro).
- **Walked**:
  - 1280 px in French and English with every part: 189 + 189 shots.
  - 768 and 390 px in French and English, worlds and modes: 4 × 57 shots.
  - The intro and the site segment of the spoken guide in both languages: 85 shots.
  - 12 frame-by-frame camera moves on the new build and 5 on the old build: 4,000 frames.
  - About 150 hand-set close-ups: lid, trickle, runnel, collars, trench, saddles and riser at 4 slider settings; D11 to D13 in both
    languages.
  - In all, 5,523 PNG files.
- **Folder**: `~/.cache/lab-review/ram-pump-lab/2026-10-31-7460d22/`. Each walk has its own `index.md`. The scripts are in
  `~/.cache/lab-review/ram-pump-lab/scripts/`.
- **Console**: 0 errors and 0 failed requests in the 6 walks, the 2 guide runs and every script.

## Gates

| Gate                   | Result                                                                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`    | pass (0.7 s)                                                                                                                                    |
| `npm run format:check` | pass                                                                                                                                            |
| `npm test`             | pass: 801 tests in 31 files (8.9 s)                                                                                                             |
| `npm run build`        | pass: JS 1,532.0 kB (465.2 kB gzip), CSS 37.2 kB. The "chunk larger than 1500 kB" warning was already there at `0f05e30` (1,525.6 kB); +6.4 kB. |

**The standard's shortfalls**: none are printed. This lab predates `src/standard.ts` and `src/standard.test.ts`, so `npm test` has
nothing to report. Counted by hand, the lab meets the bar:

- 4 worlds;
- 44 part sheets;
- assembly guide 24 steps, installation guide 12;
- 6 lessons with 12 quiz questions;
- 13 drawings;
- spoken guide of 49 segments in French and in English;
- README in English first, then `## Français`;
- `lab.json` tagline and tags filled.

`public/lab.json` has no `"status"` field (D9).

## Rule by rule (`lab-quality.md`)

**§1 Mechanics you can believe**

- Every moving part attached to what drives it: ✓. The lid has two hinges, each with a leaf on the rim, a leaf on the lid and a
  knuckle (`catchclose/catch-lid-hinge-new.png`). Both pipes enter the pit walls through collars (`pipes/sheet-collars.png`).
- Nothing floats, nothing sinks: **D3**. Otherwise ✓:
  - In the site, at the default settings, the lid rests on a far corner (−4 mm) and on its handle (+22 mm).
  - Saddles, delivery pipe and runnel lie on the ground at 4 slider settings.
  - The catchment lid passes the builder's test.
- Things turn the right way, at a readable speed: ✓. These commits change no motion; the dots run on the tubes.
- A part sits where it acts: ✓.
- The maker's dimensions before the model: ✓. The new dimensions (`boxRunnel*`, `boxLidFrameDepth`, `boxLidHingeDiameter`) are in
  `dims.ts`, tagged estimate.

**§2 One machine, the same everywhere**

- Same machine in two worlds: ✓. The spring box is the same `catchment/spring.ts` build in `site` and `catchment`. The lid angle,
  though, is derived from the catchment world's ground (D3).
- Every system has a place to look at it: ✓ (4 worlds).
- A tool that teaches nothing is left out: ✓.

**§3 Scenery and water**

- Every prop reads as what it is: ✓ for the lid, which now reads as a galvanised lid lying flat (`dist3/cmp-site-spring-12m.png`;
  this fixes the film's M2). **D4** for the trickle seen from close up.
- Polish pass: ✓ (unchanged).
- Water follows the physics: **D1** (the runnel).
- Device found in its setting: ✓. Both pipes reach the pit in sight from 30 m, with their dots on them, at 4 settings
  (`pipes/sheet-flows-pit-30m.png`); this fixes the film's m-b.
- A warm, full, stable picture:
  - Stable: ✓. No shadow jump in 17 slow moves (table below), and no added shimmer (live box against frozen box).
  - Warm and full: **D2**, still open.

**§4 Camera, layout, way in**

- The camera turns around what you look at: ✓ for `water-tower` and `house` in the site and for `spring-box` in the catchment: the
  part stays at the centre and the distance is unchanged after an orbit. **D6** when the part is behind the tank shell.
- Nothing crushed at any width: ✓. Nothing new is clipped at 1280, 768 or 390 px. The phone layout is the same as before these
  commits.
- The spoken guide is the way in: ✓. The first-visit invitation shows (`1280-fr/000-first-visit.png`).

**§5 Depth and clarity**

- As much detail per device as Pelton: ✓.
- Title and description in both languages: ✓ («Labo du bélier hydraulique» / «Hydraulic Ram Lab»).
- README in English first, French at the end: ✓.

**§6 Honest numbers, said once**

- Nothing tuned to the source's figures: ✓ (no change to the simulation).
- Warnings once; no research references: ✓. `(K…)` and `(S…)` appear in code comments only.

**§7 The spoken guide**

- The 3D follows the voice: ✓ in both languages, for the intro and the site segment (details below).
- Subtitles on by default: ✓.
- «Voix de synthèse» / «Synthetic voice» shown: ✓.
- No failed request: ✓.
- Whisper back-check: not re-run; no audio changed.

**§8 The review**: this report.

## Defects

**0 blockers, 2 major, 7 minor.**

- D1, D3, D4 and D5 come from these five commits.
- D2 and D6 to D9 were there before them.

### Major

**D1 · The runnel reads as running water, but the model says the box never overflows.** _New, `c6c90e0`._

- **Where**: catchment world, and the site's spring, close up. It shows in the app's own close framing of `spring-box`, at the lower
  left.
- **What is wrong**: the strip under the overflow stub is a light, sky-blue, glossy ribbon between two rows of stones. It reads as a
  little stream leaving the overflow, yet no water comes out of the stub. `docs/3d-site.md` says the runnel should be "damp and glossy,
  not running", because the box's working level is below the overflow invert.
- **Rule**: §3, "the water follows the physics … overflow in proportion to the model's numbers".
- **Likely fix**: in `buildRunnel` (`src/three/catchment/spring.ts`), the material is `color 0x5d7c8c, roughness 0.06,
envMapIntensity 2.5`. Dark wet earth with less sky reflection would read as damp. Alternatively, list it in a `docs/water.md` and make
  it read as damp.
- **Shots**:
  - `catchclose/cmp-trickle.png` (bottom row: before on the left, after on the right);
  - `catchclose/catch-runnel-close-new.png`;
  - `1280-fr/041-catchment-spring-box-close.png`.

**D2 · The "warm, full" half of §3 is still open.** _Not a regression; open since the film (31/10)._

- **What is wrong**: the owner's words were « la 3D un peu froide … des shaders à rajouter … moins vide ». These commits address
  stability only.
- **What the renderer has**:
  - render passes: `RenderPass`, two outline passes, `OutputPass`;
  - ACES tone mapping and PCF shadows;
  - no ambient occlusion pass;
  - few textures (the new checker plate is the only new one).
- **Scope**: whether the lab gets a warmth pass is for the owner to decide.

### Minor

**D3 · In the site, at long drive lengths, the spring box stands out of the ground and the new lid hangs in the air.**
_The lid is new (`c6c90e0`); the ground under it is older._

- **Where**: `site` world, `spring`, after the Simulation sliders are moved.
- **Measured** (lid corner and box rim height above the ground, in metres):

| Fall | Drive length | Far corner of the lid | Box rim |
| ---: | -----------: | --------------------: | ------: |
|    2 |           52 |                  1.12 |    0.97 |
|   12 |           60 |                  1.16 |    1.04 |
|  7.5 |           56 |                  0.92 |    0.79 |
|   24 |           60 |                  0.85 |    0.81 |

- **Pre-existing part**: the box rim heights are identical at `0f05e30`.
- **New part**: `boxLidOpenAngle()` takes the catchment world's ground by default, so in the site the lid no longer rests on anything.
- **Test gap**: `site.test.ts` checks the ground openings at 3 settings, but not the lid or the box against the site ground.
- **Likely cause**: `createGround` in `src/three/site/layout.ts`, where the catchment blend does not hold at long drive lengths, and
  `hinge.rotation.x = -boxLidOpenAngle()` in `spring.ts`.
- **Shots**: `close/lid-f12-L60-ne-3m.png`, `close/lid-f12-L60-south-6m.png`, `close/sheet-lid.png`. The default setting is fine:
  `close/lid-f7.5-L20-south-6m.png`.

**D4 · From 1 to 4 m, the trickle looks like a white rod.** _Restyled in `c6c90e0`._

- **What is wrong**: it is an opaque-looking, perfectly straight white cylinder of constant width, from the lip stone to the gravel,
  with no visible splash. From 12 m and 30 m it now reads as water and shows from the south, which is the fix the film asked for.
- **Where**: the catchment's close framings (`gravel-filter`, `spring-box`).
- **Likely fix**: `trickleMat = waterMaterial(0.92, 0xd2ecfc)` in `src/three/catchment/model.ts` could be more transparent near the
  camera, or the minimum width could apply only from afar.
- **Shots**: `catchclose/catch-trickle-1m5-new.png`, `catchclose/cmp-trickle.png` (top row).

**D5 · The `spring-box` part sheet does not describe the lid that is now drawn.** _New in the 3D (`c6c90e0`); the sheet is unchanged._

- **What the sheet says**: the box is « une chambre fermée … à l'abri des feuilles et des animaux » and the lid spec is « acier
  galvanisé, 4 mm ».
- **What the 3D shows**: a checker plate on a frame of 30 mm flats, with two gate hinges, thrown open onto the ground.
- **Missing**: no sheet says the lid is shown open so that the water can be seen, and no visitor-facing text mentions the runnel.
- **D13**: draws the lid closed. That is correct for a design drawing.

**D6 · The orbit pivots on the tank shell instead of the selected part.** _Kit behaviour, pre-existing._

- **Where**: `catchment` world, `intake-screen` selected from its label (camera 2.2 m away), then an orbit.
- **What is wrong**: the pivot lands on the translucent tank shell in front of the part. After a 250 px drag the screen is out of view
  (normalised position 3.1, −2.7) and the camera is 1.1 m from it.
- **Shot**: `pivot/sheet-pivot.png`, bottom row.

**D7 · Label overlaps.** _Pre-existing (Q-05 of the wave 4 report); the lead had already noted the catchment one._

- Catchment, exploded: «Filtre à gravier» over «Regard de captage» (`1280-fr/067-catchment-exploded.png`).
- Site:
  - «Captage de la source» over «Fosse du bélier» (`1280-fr/002-site-spring-setting.png`);
  - «Conduite motrice» over «Fosse du bélier» (`1280-fr/009-site-drive-pipe-close.png`).
- 390 px, site with every label: «Captage de la source» over «Évacuation des eaux de rejet» (`390-fr/005-site-labels.png`).

**D8 · Faint vertical banding on the far hills.** _Pre-existing (the film's m-a); not addressed by these commits._

- **Shot**: `framediff/site-tilt-up/0200.png`, the hill faces at the top of the picture.

**D9 · `public/lab.json` has no `"status"` field, and there is no `src/standard.ts` test.** _Process._

- The lead calls the lab released, but neither `npm test` nor the showcase can see that state, as `lab-standard.md` requires.

## Measurements

### Shadows (§3 "stable")

**Method**: the camera is set by hand every frame and stays put while the frame renders; the moves are in
`scripts/framediff*.mjs`. The difference is the mean change of the grey level (0 to 255) of the 3D view (842 × 678) from one frame
to the next. "Worst" is the largest ratio of a frame's difference to the median of its 16 neighbours. The box size is read from the
sun's shadow camera.

| Move (new build)               | Frames | Median difference | Worst frame / median | Box half size (m) | Largest box step per frame |
| ------------------------------ | -----: | ----------------: | -------------------: | ----------------: | -------------------------: |
| site, orbit at the ram 14 m    |    240 |              1.61 |                 1.06 |      10.0 (fixed) |                          0 |
| site, dolly 6 m to 119 m       |    300 |              2.94 |                 1.25 |       10.0 – 62.9 |                     1.09 % |
| site, orbit at the tank        |    240 |              1.65 |                 1.01 |       11.3 – 11.8 |                     0.28 % |
| site, overview orbit           |    240 |              2.13 |             1.93 (a) |     141.7 – 144.7 |                     0.03 % |
| site, tilt up to the sky       |    240 |              4.01 |                 1.17 |       24.0 – 87.2 |                     1.06 % |
| site, slow dolly               |    300 |              1.39 |                 1.29 |       10.3 – 26.0 |                     0.33 % |
| site, slow tilt                |    240 |              2.25 |             1.57 (a) |       24.0 – 37.0 |                     0.24 % |
| catchment, orbit               |    240 |              1.58 |                 1.13 |        10.6 (cap) |                          0 |
| catchment, dolly 2.5 m to 27 m |    240 |              3.40 |                 1.03 |       2.98 – 10.6 |                     0.92 % |
| catchment, tilt up             |    200 |              6.00 |                 1.02 |       2.96 – 10.6 |                     2.11 % |

(a) These two peaks are whole-image motion edges, with the box size continuous across them. The capture caught two camera steps in
one frame (masks: `framediff/site-overview-orbit-69-mask.png`, `framediff-slow-new_site-slow-tilt-170-mask.png`). They are not shadow
changes.

**The old build (`0f05e30`) on the same moves**: the box jumped by 30 % within a frame in every move that crossed a size step.

| Move       | Old: worst / median | New: worst / median | Old: box step at         |
| ---------- | ------------------: | ------------------: | ------------------------ |
| slow dolly |                1.62 |                1.29 | frame 135, 13.8 → 17.9 m |
| slow tilt  |                2.14 |                1.57 | frame 176                |

**Shimmer**: each move ran twice, once with the live box and once with the box frozen at its first frame (60 frames of a 0.2 %
dolly or a 0.1° orbit). The frame-to-frame change is the same both ways:

| Move             | Live box | Frozen box |
| ---------------- | -------: | ---------: |
| site, far dolly  |    1.380 |      1.379 |
| catchment, dolly |    1.397 |      1.393 |
| catchment, orbit |    1.023 |      1.022 |

The continuous box adds no shimmer. Files: `shimmer/`.

**Shadows near the machine and from afar**: shadowed pixels in fixed views (shadows on against off, `shadowmask/`) are the same,
old against new:

| View                |    Old |    New |
| ------------------- | -----: | -----: |
| catchment home      | 11,363 | 12,303 |
| catchment, 25 m     |  3,164 |  3,214 |
| site home           | 57,219 | 57,384 |
| site, ram from 25 m | 36,130 | 30,457 |

The edge shifts at the ram are the sun moving with the lab's clock between the two runs. In the catchment, from 35 m and more,
neither build draws shadows on the block; this is not a regression.

**Cost**: aiming the box costs 0.06 ms a frame with nothing selected and 0.16 ms with a part selected (3 draws, Metal, M3 Pro).

**Not reproduced**: the first frame after a camera cut. Puppeteer's screenshot renders a later frame, so the old build looked clean
too. This rests on the builder's `shadow.test.ts`.

### The pipes at 4 slider settings

The settings are default (7.5 / 20 / 65 / 27), low (3 / 12 / 40 / 20), high (15 / 40 / 100 / 54) and maximum (30 / 60 / 150 / 54).
At each one:

- **Drive pipe** (`pipes/sheet-trench.png`, `pipes/sheet-collars.png`): it comes down the slope on saddles. The saddles are tilted
  with the slope and rest on the ground (`pipes/sheet-saddles-side.png`). Near the pit the pipe runs in a trench to the west wall and
  goes through it in a collar.
- **Delivery pipe** (`pipes/sheet-flows-pit-above.png`, `pipes/sheet-collars.png`): it runs along the pit, up the east wall and out
  under the curb through a collar, then lies on the ground.
- **Riser foot**: a short round bend at the tower (`pipes/sheet-riser.png`).
- **Flow dots**: on both tubes, from 30 m (`pipes/sheet-flows-pit-30m.png`).

### The drawings D11 to D13 (French and English, `drawings/`)

- D11: no regression.
- D12:
  - the table reads 300 m with the pipe at 65.8 m;
  - the pipe level every 50 m is 0.2 / 5.0 / 20.6 / 26.4 / 41.7 / 53.4 / 65.8 m.
- D13: draws the lid closed on the rim. That is the design state; see D5.
- No overlap is new.

### The spoken guide (`narration/`, `--autoplay-policy=no-user-gesture-required`)

- **Durations**: intro 113.7 s (French) and 116.2 s (English); site segment 33.8 s and 39.0 s.
- **The 3D follows the voice**, in both languages: catchment at 19.6 s, site, ram at 29.5 s, valve at 48.8 s, then the modes
  Simulation, Lessons, Assembly, Installation, Drawings, Explore.
- **Site cues**: flows on at 3.3 s, then each `frame:` cue in turn, then flows off at 30.5 s.
  - `frame:spring` shows the outcrop, the box and the lid lying flat (`narration/cues/fr-site-at-5s.png`).
  - `frame:drive-pipe` and `frame:ram-pit` show both pipes with their dots reaching the pit (`narration/cues/fr-site-at-10.5s.png`,
    `narration/cues/fr-site-at-14.5s.png`).
- **Subtitles**: present in every sample taken while the guide played. The one exception is a single English sample at position 0.
  The longest caption is 109 characters.
- **Requests**: none failed.

## The owner's past finds, as a test set

| Past find                                     | In this lab                                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| A spring in the void                          | ✓ The lid is on its hinges; the pipes go into the walls through collars.                                           |
| A wheel turning backwards                     | ✓ No motion changed. Dot direction not re-measured.                                                                |
| Specs crushed under a long text               | ✓ No change; sheets readable at 3 widths.                                                                          |
| An untranslated title                         | ✓                                                                                                                  |
| A fixed camera pivot                          | ✓ with one case: D6.                                                                                               |
| A missing equipment room                      | ✓ Every system has its world.                                                                                      |
| A chain not attached                          | ✓ Lid hinges, pipe collars.                                                                                        |
| The jellyfish tree (a prop nobody recognises) | The lid no longer reads as a laptop. Close up, the trickle reads as a rod (D4); the runnel reads as a stream (D1). |
| The sunk generator (floating or sunk)         | ✓ at the default settings. At long drive lengths the lid floats and the box stands proud (D3).                     |
| A lab called finished with two worlds         | ✓ 4 worlds. `lab.json` does not record the state (D9).                                                             |

## Not checked

- Real phones, Safari and Firefox.
- The voice itself: the owner listens. No Whisper pass either, since no audio changed.
- The film's moves re-rendered through `onigam-video`. The builder measured those (O01, S04, S25); I ran moves of my own.
- The first frame after a camera cut (see above).
- Every part at three distances in exploded, x-ray and isolated views for the `ram` and `valve` worlds. Those worlds are untouched by
  these commits and were only walked at the kit's default framings.
- The direction of the flow dots.
- The site at every combination of the sliders: 16 combinations of fall and drive length were measured for D3.
