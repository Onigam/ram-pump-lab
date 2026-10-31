# QA review: kit 0.5.0, the warm picture, and the second pass on the spring

Independent review against `lab-kit/docs/lab-quality.md`, written by a reviewer who did not build these changes.

- **Date**: 2026-11-01.
- **Commit**: `c227dca`, five local commits on top of `04c7db8`, not pushed:
  - `fc1e832`, `4e9ebc0`, `c69220a`: the previous review's D1, D3, D4 and D5, the z-fight beside the box, and D6 sent to the kit;
  - `f1ad669`: kit v0.5.0 (MSAA, a look per world, device quality) and the lab's near detail;
  - `c227dca`: the catchment's grass tufts melt into the ground from afar.
- **Kit**: `@onigam/lab-kit` 0.5.0, from the `dist/` already in `node_modules` (`~/Dev/lab-kit` `main` b7b2e7d, tag `v0.5.0`, not
  pushed). I did not run `npm install`.
- **Setup**:
  - Dev server on port 5863.
  - For before/after comparisons, the previous commit (`04c7db8`) was served on port 5864 from a scratch copy, with kit 0.4.0
    extracted from the kit's `v0.4.0` tag. Every "before" figure below comes from that copy.
  - Headless Chrome 155. The kit walks use SwiftShader; everything else uses Metal (Apple M3 Pro).
  - Another agent was rendering a film on the same machine during the review. This slowed the SwiftShader walks; it does not
    change any figure.
- **Walked**:
  - 1280 px in French and English with every part: 189 + 189 shots.
  - 768 and 390 px in French and English, worlds and modes: 4 × 57 shots.
  - The kit's `flicker.mjs` on both builds in all four worlds, plus the same moves with a still camera and with the simulation
    paused.
  - My 10 slow moves of the previous review, again: 2,440 frames.
  - Close-ups:
    - the spring in both worlds at 3 slider settings;
    - the 32 stones at 3 distances;
    - the pipes at 4 settings;
    - the section of the spring box at 4 distances.
  - The spoken guide (intro and site segment) in both languages.
  - A 2 GB phone and a CPU-throttled phone.
  - In all, about 4,300 image files.
- **Folder**: `~/.cache/lab-review/ram-pump-lab/2026-11-01-c227dca/`. Each walk has its own `index.md`. The scripts are in
  `~/.cache/lab-review/ram-pump-lab/scripts/`.
- **Console**: 0 errors and 0 failed requests in the six walks, the two guide runs and every script.

## Gates

| Gate                   | Result                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`    | pass                                                                                                                  |
| `npm run format:check` | pass                                                                                                                  |
| `npm test`             | pass: 818 tests in 32 files (8.6 s); 801 in 31 at `7460d22`                                                           |
| `npm run build`        | pass: JS 1,594.6 kB (482.2 kB gzip), 62.6 kB more than at `7460d22`; CSS 37.2 kB. The size warning was already there. |

**The standard's shortfalls**: none printed. This lab has no `src/standard.ts`, so `npm test` has nothing to report. Counted by
hand, it still meets the bar:

- 4 worlds;
- 44 part sheets;
- assembly guide 24 steps, installation guide 12;
- 6 lessons, 12 quiz questions;
- 13 drawings;
- spoken guide of 49 segments in French and in English;
- README in English first, then French.

`public/lab.json` still has no `"status"` (D10).

## The previous review's defects

| Previous                             | Now                                                                                                                                                                                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 runnel read as running water      | **Fixed.** Dark wet earth with moss, matte (`catchclose/cmp-catch-runnel-close.png`).                                                                                                                                                             |
| D2 warm and full picture             | **Addressed** by kit 0.5.0 and the near detail. Remarks on the look: D2 to D4 below.                                                                                                                                                              |
| D3 lid and box at long drive lengths | **Fixed.** At 16 settings (fall 2 to 24 m × drive length 20 to 60 m), the box rim stands 0.07 to 0.12 m above the site ground; the lid touches the ground; its far corner is within 35 mm of it, its handle within 26 mm (`close/sheet-lid.png`). |
| D4 trickle like a white rod          | **Fixed.** Close up it wavers, has streaks and drops, and a foam ring where it lands (`catchclose/cmp-catch-trickle-1m5.png`).                                                                                                                    |
| D5 sheet did not describe the lid    | **Fixed** in both languages: the lid shown thrown back, its make-up, and the runnel with its size (`cmp-springbox-sheet.png`).                                                                                                                    |
| D6 pivot on the tank shell           | **Fixed** by kit 0.5.0. With the intake screen selected, after the same drag it stays centred (0.06, −0.04) at 2.1 m (before: 3.1, −2.7, out of view).                                                                                            |
| D7 label overlaps                    | Open; now D8.                                                                                                                                                                                                                                     |
| D8 banding on the far hills          | **Mostly fixed.** One faint band is left (`cmp-far-slopes.png`, top: before, bottom: after).                                                                                                                                                      |
| D9 `lab.json` status                 | Open; now D10.                                                                                                                                                                                                                                    |
| Z-fight beside the box (film S17)    | **Fixed.** The earth sliver that flickered in the bed's caps is gone (`cmp-zfight-heat.png`, left: before, right: after). Another one remains at the box floor: D1.                                                                               |

## Rule by rule (`lab-quality.md`)

**§1 Mechanics you can believe**

- Moving parts attached: ✓ (lid hinges, pipe collars, valve stack).
- Nothing floats, nothing sinks: ✓.
  - The lid and the box at 16 settings (table above).
  - The stones at 7 settings: every foot is under the ground (the highest 0.097 m under it), and every top stands out by at least
    0.36 × its size.
- Direction and speed: ✓. Unchanged; the flow dots now fade in and out at the ends of their paths instead of popping.
- A part sits where it acts: ✓.
- Dimensions from `dims.ts`: ✓.

**§2 One machine, the same everywhere**

- Same machine in both worlds: ✓. The lid now rests on each world's own ground.
- Every system has a place: ✓ (4 worlds).
- No useless tool: ✓.

**§3 Scenery and water**

- Every prop reads as what it is: ✓, except D2 (the anchor block) and D3 (the valve plinth).
  - The stones read as stones at 2 m and 8 m, and as small grey stones from 30 m (`stones/sheet-*.png`).
- Polish pass: ✓.
  - Near detail on the site (grass patches, crown shading, stones) and contact shadows under the studio devices.
  - The far slopes have mostly lost their stripes.
- Water follows the physics: ✓. The runnel is damp; the trickle falls free.
- Device found in its setting: ✓ at 1280 and 390 px; D9 at 768 px. Both pipes reach the pit at 4 settings
  (`pipes/sheet-flows-pit-30m.png`).
- A warm, full, stable picture:
  - Warm and full: **✓, with D2 to D4**.
  - Stable: **D1** (a flicker in the section of the spring box) and D5 (the ram); otherwise ✓, see the measurements.

**§4 Camera, layout, way in**

- The camera turns around what you look at: ✓ (the previous D6 is fixed).
- Nothing crushed: ✓ at 1280, 768 and 390 px in both languages. Labels: D8. The phone layout is the same as before these commits.
- The spoken guide is the way in: ✓.

**§5 Depth and clarity**: ✓ (no change).

**§6 Honest numbers**: ✓ (no change to the simulation or the texts, apart from the spring-box sheet).

**§7 The spoken guide**: ✓ in both languages, for the intro and the site segment.

- Same cue timings as before.
- «Voix de synthèse» / «Synthetic voice» shown.
- Subtitles present.
- No failed request.
- Whisper was not re-run: no audio changed.

**§8 The review**: this report.

## Defects

**0 blockers, 1 major, 9 minor.** D1, D8, D9 and D10 were there before these commits; D2 to D7 came with them or with kit 0.5.0.

### Major

**D1 · In the section, the floor of the spring box flickers under its water.** _Pre-existing; not touched by these commits._

- **Where**: `catchment` world, «Coupe» on, the spring box seen from 3 to 8 m, as in the film's catchment shots.
- **What is wrong**: the floor of the box under the water shows grey and blue stripes that change at every frame.
- **Measured**: an orbit of 0.1° a frame, 60 frames. Pixels that flicker in more than a quarter of the frames:

| Distance | Pixels |
| -------: | -----: |
|    3.2 m | 16,661 |
|      6 m |  4,803 |
|      8 m |  2,631 |

The same stripes are in the build before (`zfight-old-heat.png`).

- **Likely cause**: two coplanar faces. The top of the silt (`spring.ts`, the `silt` box, at `BOX_FLOOR_Y + boxSediment`) is in the
  plane of the bottom of the water body (`model.ts` lines 571 and 572: `boxBody` starts at `BOX_FLOOR_Y + C.boxSediment`).
- **Rule**: §3, "coplanar faces".
- **Shots**:
  - `zfight-new-waterbottom.png` (three consecutive frames);
  - `zf-sheet.png` (frame and flicker map at 3, 6 and 8 m);
  - `cmp-zfight-heat.png`.

### Minor

**D2 · The ram's concrete anchor block now reads as pale wood or paper.** _New with the paper studio (`f1ad669`)._

- The block was a light concrete grey (#dcd9d3). Under Neutral tone mapping at 1.2 it is cream (#f7e9d2), almost the colour of the
  paper floor it stands on (#fdf0db).
- It reads like a light wooden board under the machine.
- **Shots**: `look-ram.png` (left: before, right: after), `1280-fr/082-ram-foundation-close.png`.
- **Likely file**: `src/three/ram/foundation.ts` (`MAT.concrete()` × 0.8).

**D3 · The valve's "pale beech" plinth reads as a peach slab.** _New (`f1ad669`); the owner judges._

- The new colour `#cdb594` is drawn as #fbddba, more orange than before (#eedcbc).
- It sits on a cream floor with little contrast, and shows no grain at 1 to 2 m.
- **Shot**: `look-valve.png`. **File**: `src/three/valve/bench.ts`.

**D4 · The catchment's grass has turned lime.** _New with the paper studio; the owner judges._

- Close-up grass: #c3d088 before, #d5f076 now. The mean saturation of the world's overview went from 0.15 to 0.27.
- The earth layers and the copper section caps turn a strong orange.
- The same hillside in the site is a dark olive (#2f4011): the two worlds no longer look like the same meadow.
- **Shots**: `cmp-041-catchment-spring-box-close.png`, `look-catchment.png`, `catchclose/cmp-catch-cut-front-low.png`.

**D5 · The ram world shimmers a little more than before.** _New (`f1ad669`)._

- The kit's measure:

| Move  |  Before |   After |
| ----- | ------: | ------: |
| Orbit | 0.070 % | 0.089 % |
| Dolly | 0.478 % | 0.521 % |

- My slow orbit, simulation paused:
  - shimmer 0.127 % before, 0.195 % after;
  - pixels flickering in more than a quarter of the frames: 3 before, 324 after.
- The flicker sits along the foot of the anchor block on the floor and on the feet of the two pedestals (probably the new contact
  shadow or the wear pattern).
- It is small in absolute terms, but the ram is the only world whose picture got less stable.
- **Shots**: `cmp-ramheat.png`, `ramheat-zoom.png`.

**D6 · Kit: a device slower than 4 frames a second never lowers its pixel ratio.**

- **Measured**: a 390 px phone with 2 GB of memory (emulated, `navigator.webdriver` hidden), SwiftShader, CPU throttled 4×.
  - Frames took 200 to 717 ms.
  - The ratio stayed at 1.5 for the 24 s measured.
- **Cause**: `FrameGovernor.push` (`look-policy.js`) ignores every interval over 250 ms, so the slowest devices are never judged.
- **The rest works**:
  - The 2 GB phone gets FXAA at a pixel ratio of 1.5.
  - An 8 GB device with the CPU throttled 6× (Metal) stepped from 2 to 1.75 and then held 60 frames a second.
  - Unthrottled, it stayed at 2.
  - The FXAA picture is clean (`weak/sheet-weak.png`).

**D7 · Kit tool: `flicker.mjs` reports the valve as a "pop" because the valve moves.**

- Spike 10.6 (orbit) and 4.7 (dolly), against 3.9 and 3.3 with kit 0.4.0.
- With the camera still, the same measure gives a spike of 31 in both builds: the valve's head and weight move during the measure.
- It is the valve beating, not a defect of the picture. MSAA lowers the median frame difference, which raises the ratio.
- The tool should hold the simulation. Its shimmer figure for the valve is unchanged (0.137 %).

**D8 · Label overlaps.** _Pre-existing (the previous D7, wave 4 Q-05)._

- Site: «Captage de la source» over «Fosse du bélier» (`1280-fr/002-site-spring-setting.png`).
- Catchment, exploded: «Filtre à gravier» over «Regard de captage» (`1280-fr/067-catchment-exploded.png`).
- With every label: the catchment's and the valve's labels stack (`768-fr/019-catchment-labels.png`, `768-fr/047-valve-labels.png`).

**D9 · At 768 px the site and the catchment are seen through heavy fog.** _Pre-existing._

- For a 3D view 380 px wide, the camera stands far back and the haze covers most of the picture.
- The catchment block is also cut by the left edge of the view.
- The site's new haze is a little flatter.
- **Shots**: `cmp-768-site.png`, `cmp-768-catchment.png` (left: before, right: after).

**D10 · `public/lab.json` has no `"status"`, and there is no `src/standard.ts` test.** _Pre-existing; process._

## Measurements

### Picture stability: the kit's `flicker.mjs`

1280 × 720, 150 frames a move, clocks pinned, Metal. "Before" is `04c7db8` with kit 0.4.0; "after" is `c227dca` with kit 0.5.0.

| World     | Move  | Shimmer before | Shimmer after | Spike before | Spike after |
| --------- | ----- | -------------: | ------------: | -----------: | ----------: |
| site      | orbit |         1.69 % |       0.755 % |         1.37 |        1.36 |
| site      | dolly |        3.847 % |       2.543 % |         1.30 |        1.27 |
| catchment | orbit |        0.672 % |       0.669 % |         1.42 |        1.41 |
| catchment | dolly |        2.525 % |       2.362 % |         1.37 |        1.40 |
| ram       | orbit |        0.070 % |       0.089 % |         1.78 |        2.00 |
| ram       | dolly |        0.478 % |       0.521 % |         1.55 |        1.58 |
| valve     | orbit |        0.137 % |       0.137 % |    3.88 (D7) |  10.59 (D7) |
| valve     | dolly |        0.397 % |       0.328 % |    3.28 (D7) |   4.71 (D7) |

- These match the builder's figures for the site and the catchment.
- The site is the clear gain: its shimmer is halved in an orbit and down by a third in a dolly.
- The catchment is level with kit 0.4.0, thanks to `c227dca`.
- The ram is a little worse (D5).

### My slow moves, against the previous review

The worst frame against the median of its 16 neighbours, Metal, 1280 × 800.

| Move                        |    31/10 | 01/11 |
| --------------------------- | -------: | ----: |
| site, ram orbit at 14 m     |     1.06 |  1.05 |
| site, dolly from 6 to 119 m |     1.25 |  1.31 |
| site, tank orbit            |     1.01 |  1.05 |
| site, overview orbit        | 1.93 (a) |  1.05 |
| site, tilt up to the sky    |     1.17 |  1.14 |
| site, slow dolly            |     1.29 |  1.06 |
| site, slow tilt             | 1.57 (a) |  1.01 |
| catchment, orbit            |     1.13 |  1.13 |
| catchment, dolly            |     1.03 |  1.03 |
| catchment, tilt             |     1.02 |  1.02 |

(a) A capture-timing artefact on 31/10, not the picture.

- No shadow jump and no pop: the shadow box steps by at most 2.1 % a frame, as before.
- One catchment orbit gave 2.62 once; the labels jumped in the same frame, so the capture caught the camera between two poses. A
  rerun gave 1.13.

### The look (§3, warm and full)

**What reads well**

- The studio floor is warm paper (#fdf0db; it was a grey #f2f0ed), the colour of the interface around it.
- Brass, the red handles and the blue air chamber read warmer.
- Soft contact shadows sit under the devices.
- In the site:
  - the sky is deeper and the haze warmer;
  - the trees have shaded crowns;
  - the far slopes are almost free of stripes (`cmp-far-slopes.png`).
- The site's mean saturation went from 0.48 to 0.57; its brightness is about the same, and its shadows are less black.

**What reads wrong**: the concrete block (D2), the valve plinth (D3), the catchment's lime grass and orange section (D4).

### The stones

- **Count**: 32 stones in 9 groups, laid the same at every load.
- **In the ground**: at 7 slider settings (from fall 2 m / drive length 5 m up to fall 30 m / drive length 60 m), every foot is under
  the ground and every top above it.
- **Smallest clearance from each part over the 7 settings**:

| Part          | Clearance |
| ------------- | --------: |
| delivery pipe |    1.95 m |
| spring        |    2.19 m |
| waste drain   |     3.1 m |
| buffer tank   |     6.1 m |
| drive pipe    |    7.26 m |
| pit           |    8.25 m |
| house         |    9.45 m |
| water tower   |   10.05 m |

- **Shots**: each group at 2, 8 and 30 m (`stones/sheet-2m.png`, `stones/sheet-8m.png`, `stones/sheet-30m.png`).

### Weak devices (390 px)

- **2 GB phone**: FXAA, pixel ratio 1.5, adaptive. No error; the site, the catchment and the ram are clean (`weak/`). D6 covers very
  slow devices.
- **Automated browsers and `?quality=full`**: they always get the fixed full picture (MSAA 4, pixel ratio 2). This is why every walk
  here shows the best case.
- **Pipe line on the phone**: the delivery line in the overview is as visible as before (`phone/cmp-zoom.png`).

### The spring, the drawings and the sheets

- **Spring**: see the table of the previous defects.
- **Drawings**: D11, D12 and D13 are byte for byte the SVGs of the previous review, in both languages.
- **Sheets**: the spring-box sheet adds the lid shown thrown back, the lid's make-up and the runnel, in both languages. No other
  sheet changed.

### The spoken guide

- **Durations**: intro 113.7 s (French) and 116.2 s (English); site segment 33.8 s and 39.0 s, as before.
- **Cues**: the changes of world and mode come at the same positions as on 31/10.
- **Site segment**: the framings match the previous review's at the same positions (`narration/cmp-cues.png`). The spring cue shows
  the new lid lying flat.

## The owner's past finds, as a test set

| Past find                                   | In this lab                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------- |
| A spring in the void                        | ✓ The lid is on its hinges and on the ground, in both worlds, at every setting. |
| A wheel turning backwards                   | ✓ No motion changed.                                                            |
| Specs crushed under a long text             | ✓                                                                               |
| An untranslated title                       | ✓                                                                               |
| A fixed camera pivot                        | ✓ Fixed by kit 0.5.0 (the previous D6).                                         |
| A missing equipment room                    | ✓                                                                               |
| A chain not attached                        | ✓                                                                               |
| The jellyfish tree (an unrecognisable prop) | ✓ for the stones, the runnel and the trickle; D2 and D3 for two colours.        |
| The sunk generator (floating or sunk)       | ✓ The lid, the box and the stones were measured.                                |
| A lab called finished with two worlds       | ✓ 4 worlds; D10 for the status field.                                           |

## Not checked

- Real phones (the adaptive quality on a real weak GPU), Safari and Firefox.
- The voice itself.
- The film re-rendered through `onigam-video` with the new look and supersampling.
- Every part at three distances in exploded, x-ray and isolated views for `ram` and `valve`. These worlds were walked at the kit's
  framings only.
- GPU frame times. The builder gives +0.2 to +1.4 ms a frame on an M3 Pro; I did not re-measure them.
