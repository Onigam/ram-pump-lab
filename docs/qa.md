# QA report, wave 4

Read-only audit of the whole lab (four worlds, eight modes, French and English), run by `tools/qa/audit.mjs` on 2026-10-24
against the dev server at commit `b9e0f66` (the product code was identical to that commit for the whole run; the lead edited
`README.md` and `package.json` meanwhile). Headless Chrome 155 on an Apple M3 Pro with a software renderer (SwiftShader),
device pixel ratio 1, Google Fonts loaded. **Nothing in the product was changed.** The tool and how to run it:
[`tools/qa/README.md`](../tools/qa/README.md). Screenshots are in the output directory of the run (`<out>/shots/…`), never in the
repository; the file names below are relative to it.

**What ran**: 741 measured and photographed states (3 viewports × 2 languages × 4 worlds × 8 modes, 11 parts on their four tabs,
the first and last step of each stretch of both guides, 6 lessons with their quiz answered, drawing sheets, the simulation panel
with its sections, 8 scenarios and 3 presets, the 3D tools in each world); the same DOM measures at 23 widths from 320 to 1920 and
on landscape phones; 12 scripted flows (about 900 checks); the quality gates; a production build with source maps; a cost
profile of each world. A full run takes **47 minutes** (2,825 s); `--quick --langs fr` takes about 20 minutes (estimated from the parts run separately).

## Summary

| Severity    | Count | In the kit's frame (CSS or code) | In the lab | Shared |
| ----------- | ----: | -------------------------------: | ---------: | -----: |
| **Blocker** |     0 |                                0 |          0 |      0 |
| **Major**   |    18 |                               13 |          5 |      0 |
| **Minor**   |    10 |                                6 |          1 |      3 |

- **How the tool's count maps to this list.** The last full run reported 0 blockers, 33 major and 31 minor _findings_ (one per cause
  and per measurement, many of them the same defect seen by two probes). They are merged here into 28 defects. The harness false
  positives found on the way (a render loop reported stopped while the page was in Plans mode, an explode state measured while the
  previous explode was still decaying, a sheet slide measured before its late start) were fixed in the tool; the corrected tool states
  are those quoted for Q-11.
- **No blocker.** No page error, no failed request (the Google Fonts request answered), no console warning on any of the pages of the matrix and the sweep; no horizontal scroll of the page at any of the 23 sizes; every world is drawn (mean luminance 69 to 224, none flat or
  dark); the four gates pass (618 tests); no leak after 52 world switches; every flow of the interaction audit passes except the
  defects below.
- **The owner's three worries, measured.** _Floating parts_: none (see "Floating parts" below). _A broken panel on a narrow
  screen_: yes, on a phone the frame itself is the problem (Q-01 to Q-04, Q-08, Q-12); the lab's own content fits at every width
  except 320 px in English. _Hidden or overlapping controls_: the phone is where they are, and almost all of them belong to the
  kit; in the lab, the 3D labels collide (Q-05).
- **The lab's text, data and guides are in good shape**: French/English parity scan clean in every mode (with a drawing, a
  lesson, a guide step and a part open), every guide step shows the right parts (the displays of the parts, the highlight and
  the world checked at each of the 34 steps), the simulation never produces a NaN (presets, 8 scenarios, 14 sliders at their
  extremes, every select, the sizing calculator, every part test button).
- **Most of what needs fixing is in `@onigam/lab-kit`**: 19 of the 28 defects are in the kit alone and 3 more are shared with the
  lab. A kit change reaches every lab; proposed requests are collected at the end of the defect list.

## Defects

Each entry: where (viewport / language / world / mode / element), what was measured, screenshot, origin (**kit** or **lab**; the
request numbers are those of [`kit-requests.md`](kit-requests.md)), and a suggested fix. A cause seen in many places is one
defect with the list of places.

### Blockers

None.

### Major

**Q-01 · Phone, Plans mode: the drawing viewer covers the bottom sheet.** _Kit._
390×844 (and every width up to 760), FR and EN, all four worlds, mode Plans: `.dv` (the viewer, `z-index: 6`) sits above `.panel`
(the sheet, `z-index: 4`) and covers the whole 3D area, including the part under the sheet. The list of sheets, the description of
the current sheet, the "See in 3D" button, the line legend and the grip are hit-tested as hidden (80 hits: `button.sheet-row` 49,
`button.panel__grip` 16); only the prev/next buttons of the viewer's own bar are left. When the sheet is open it hides 25 % or more
of the drawing (14 states).
Shots: `390x844-fr/003-site-site-plans.jpg`, `390x844-fr/017-ram-ram-plans.jpg`.
Fix (kit): at `max-width: 760px`, `body.mode-plans .dv { z-index: 3; bottom: 34px }` so the sheet slides over it, and `fit()` against
the space above the sheet; or put the sheet list in the viewer's bar.

**Q-02 · Phone: the toolbar (explode, X-ray, section, flows, labels, slow motion) is behind the open bottom sheet.** _Kit._
390×844, every world and every mode, 1,344 hits. The toolbar (`z-index: 3`, bottom of the view) is under the sheet (`z-index: 4`,
46 vh): 0 of 9 tools can be reached (flow `panel`, `toolbarWithSheetOpen: 0/9`). The rail button of any mode opens the sheet, so
the toolbar is usable only after the visitor closes the sheet by hand. The sheet is 94 % opaque: the toolbar and the 3D labels show
through it as ghosts on top of the panel text (1,450 label hits).
Shots: `flows/side-panel-bottom-sheet-390x84-toolbar-behind-sheet.jpg`, `390x844-fr/016-ram-ram-sim.jpg`.
Fix (kit): when `sheet-open`, lift the toolbar above the sheet (`bottom: calc(var(--strip-h) + 46vh + 8px)`) or move it into the
sheet's header; make the sheet opaque (`background: var(--card)`).

**Q-03 · Phone: half of the modes and of the tools are off screen with no scrollbar and no hint.** _Kit._
390×844 (357 and 321 hits). The rail is a horizontal scroller with its scrollbar hidden: "Explorer", "Montage", "Installation" and
the start of "Simulation" show; **Plans, Leçons, Pièces and Sources are out of sight** (5 of the 8 buttons are cut or beyond the edge).
The toolbar shows "Vue d'ensemble", the explode slider and the start of "Transparence"; everything after it ("Coupe", "Flux",
"Étiquettes", "Ralenti") is out of sight. Nothing says there is more. At 844×390 the rail is a vertical scroller and shows 4 of 8 modes.
Shots: `390x844-fr/021-ram-ram-explore-sheet-closed.jpg`, `sweep/844x390-fr-ram-explore.jpg`.
Fix (kit): icon-only rail buttons under 480 px (8 × 40 px fit in 358 px; the labels stay as `aria-label`), a fade or arrow at the cut
edge of both scrollers, and a two-row toolbar or a "more" menu.

**Q-04 · Phone: the subject sits behind the open bottom sheet (request 7).** _Kit, already requested._
390×844, FR and EN: the share of the projected subject that lies under the sheet is **79 % (site), 88 % (catchment), 79 % (ram), 84 %
(valve)** in the default view; a selected part ends up behind it in 106 checks and the parts of a guide step in 51 (first and last step of each stretch
of both guides, then all 34 steps in the guide flow). At the first impression of a phone (sheet open after any rail tap) the visitor sees
the top of the pressure gauge and a text panel. With the sheet closed the same subjects fit (ram 45 % of the view, valve 13 %).
Shots: `390x844-fr/015-ram-ram-explore.jpg`, `390x844-fr/029-valve-assembly-step1-first-valve.jpg`,
`390x844-fr/039-site-part-spring-tab1.jpg`.
Fix (kit): `camera.setViewOffset` (or pass the free rectangle to `frameBox`) so that the centre of projection is the centre of the
space above the sheet; re-frame when the sheet opens or closes.

**Q-05 · The 3D labels collide and are cut by the edge of the view.** _Lab (anchors and `minor` flags in `src/three/*`), kit for
collision avoidance._
At 1280×800 the four default views are clean; the ram's labels collide as soon as the camera moves (a part selected: 8 states, the
simulation panel: 20, explode, "all labels"). At 768×1024 and on the phone the default views of the site, the catchment and the ram
have 1, 1 and 2 colliding pairs: ram **Reniflard × Clapet anti-retour** and **Reniflard × Vanne d'arrivée V1** (up to 40 % of the smaller
label; also Vanne d'arrivée V1 × Clapet anti-retour), catchment Trop-plein × Vanne de départ (and Crépine de départ × Vidange), site
Captage de la source × Regard du bélier (80 % overlap on the phone). Cut by the edge of the 3D view (768 and phone): ram «Vanne de sortie
V3» 40 to 79 % inside, «Massif d'ancrage» 62 %, «Clapet anti-retour» 63 %, «Manomètre» 6 %; site «Conduite de refoulement» 66 %; catchment
«Filtre à gravier» 31 %. The labels are in a `CSS2DRenderer` with no collision handling and a fixed side.
Shots: `768x1024-fr/013-ram-ram-explore.jpg`, `390x844-fr/021-ram-ram-explore-sheet-closed.jpg`, `390x844-fr/001-site-site-explore.jpg`.
Fix (lab): mark `snifter` (and `drive-gate-valve`, `tank-drain`) `minor` so they only show with "Étiquettes : Toutes" or when selected;
give each hotspot an anchor on the free side of its part. Fix (kit, new request): hide the lower-priority label of an overlapping pair,
and keep labels inside the view.

**Q-06 · The strip cuts its alarm chips, and on a phone hides the cause.** _Kit._
768×1024 (90 states): with four values shown the alarm area is **62 to 68 px** wide, the chips need 118 to 238 px: «Ne refoule rien»
(123 px), «Cloche noyée» (118), «Conduite motrice courte (L/h = 1,1)» (238) are cut. On a phone (≤ 760 px) the CSS shows **only the first
alarm**: in the scenarios «Refoulement trop haut» and «Conduite en PVC» the strip shows «Ne refoule rien» (the symptom) and hides
«Refoulement trop haut (H/h = 13,3)» and «Conduite trop souple» (the cause). The same rule hides "Rendement", "Réserve" and "Consomme" on a phone
(the tank that empties is the lab's own story).
Shots: `768x1024-fr/101-ram-sim-scenario-2.jpg`, `390x844-fr/105-ram-sim-scenario-2.jpg`.
Fix (kit): let the alarm area wrap or scroll, show «2 alertes» with the worst first, and keep the tank level on the phone strip.

**Q-07 · Text contrast under AA (WCAG 4.5:1) in the kit's tokens.** _Kit._
All viewports, 5,204 hits (text elements over all states): `--ink-3` `#8592a0` on paper is **2.7:1** (strip labels and units at 10 to 11 px, readout labels, hints
at 12.5 px such as «Cliquez une pièce ou une étiquette pour l'étudier» and «Réglez la vitesse du temps…», the explode arrows, small
units in the catalogue, the "Cadence / Refoulé" labels). Less severe: `--water` text 3.7:1 (live values), `--copper` eyebrows 3.64:1,
`--leaf` 3.75:1, white on copper 3.89:1, the "ok" chip 4.31:1.
Shots: `1280x800-fr/001-site-site-explore.jpg`, `1280x800-fr/014-ram-ram-sim.jpg`.
Fix (kit): `--ink-3: #5d6978` (about 5.2:1), a darker `--water-ink` and `--copper-ink` for text, same hues for fills.

**Q-08 · The simulation charts never shrink: the panel scrolls sideways after a resize.** _Kit (`ui/charts.js`)._
Sweep, `ram` world, mode Simulation, every size from 761 to 1920 and 320 (FR and EN): after the panel got narrower (window 1920 → 800,
the panel dragged narrower, a rotation) the oscilloscope charts keep the canvas width of the wider layout: `scrollWidth` **366 px for a
309 px panel** (57 px of horizontal scroll, the chart wrapper `div.chart` is 333 px wide). A page loaded at that width is fine (fresh
loads at 768 and 1280 pass). `LineChart` writes `canvas.style.width = <clientWidth>px` and measures `el.clientWidth` on the next draw,
so a container can grow but never shrink.
Fix (kit): measure the parent with the canvas out of flow (`position: absolute; inset: 0; width: 100%`) or set `style.width = '100%'`
and redraw from a `ResizeObserver`.

**Q-09 · "Vue d'ensemble" while a part is isolated does not show the whole device.** _Kit._
1280×800, worlds catchment, ram and valve (not the site, which uses an authored pose): isolate a part, press "Vue d'ensemble": the
part is shown again but the camera stays on it (ram: 9 of 13 parts outside the view; catchment 8 of 9; valve 8 of 14). The button runs
`store.set({ isolate: false })` and `stage.frameAll()` in the same tick, so `frameAll` measures parts that are still hidden. The
"Isoler" button and the peek card wait one frame; the home button does not. Related (minor, Q-24): "Tout afficher" in the part sheet frames the
part again instead of the device.
Shots: `flows/toolbar-buttons-in-every-world-tool-overview-after-isolate-ram.jpg`.
Fix (kit): `requestAnimationFrame(() => stage.frameAll())` after clearing `isolate`, as the isolate button does.

**Q-10 · Changing the world by hand during a guide shows the new world with the old step.** _Kit._
Assembly step 5 (a `valve` step) then "Le bélier": the guide stays in Assembly, the ram is drawn, the card still reads «Étape 5 · Le
clapet · Visser le manchon femelle-femelle», the parts of the step do not exist in that world and the ram's own parts are shown as wire
frames (the "not yet built" ghost). Installation step 5 (a `catchment` step) then "Le site" does the same with the landscape. The kit
only leaves the guide when the target world is outside the guide's worlds; both worlds here belong to the guide. 1280×800 and
390×844. Going back (Previous) or to the next step restores it.
Shots: `flows/assembly-and-installation-guid-assembly-manual-mismatch-ram.jpg`,
`flows/assembly-and-installation-guid-install-manual-mismatch-site.jpg`.
Fix (kit): in `gotoScene`, when a guide is running and the target is not the world of the current step, jump to the first step of that
world's stretch (or leave to Explore).

**Q-11 · The exploded subject leaves the view (requests 6 and 9).** _Kit, already requested._
The home view is framed for the assembled device. Share of the projected exploded subject outside the 3D view: ram **9 / 37 %**
(explode 0.5 / 1) at 1280×800, 14 / 31 % at 768×1024, 13 / 31 % on the phone; valve **11 / 41 %** at 1280×800, 0 / 14 % on the phone. At
explode 1 the ram's air chamber, gauge and outlet valve are cut by the top edge (labels «Vanne de sortie V3» and «Manomètre» are the first
to go) and the valve's guide, weight and nuts are out of the picture above the reducer; the catchment fits.
Shots: `final-tools` run: `1280x800-fr/017-ram-tool-explode-1.jpg`, `1280x800-fr/025-valve-tool-explode-1.jpg`.
Fix (kit): `frameAll` on the exploded bounds, or a `framePadding` per world (request 6, 9); until then the lab can lower `homePadding`.

**Q-12 · Landscape phones and 320 px wide.** _Kit._

- 844×390 (a phone turned sideways, `min-width: 761` so the desktop layout applies): the 3D view is 456×268 px and the two-row
  toolbar (230 px high) covers it almost completely: **the ram is hidden behind the toolbar**; the rail shows 4 of 8 modes.
  At 667×375 (phone layout) the view is **163 px high**.
- A selected part shows the `peek` card (320 px wide) over the 3D view in every mode but Explore; at 320×568, 667×375 and 844×390 it overlaps
  the toolbar, the grip, the panel toggle and two labels (12 hits).
- 320×568 in English: the scene switch overflows, «The valve» is 51 % off screen (French fits).
  Shots: `sweep/844x390-fr-ram-explore.jpg`, `sweep/320x568-en-ram-explore.jpg`.
  Fix (kit): under 500 px of height, collapse the toolbar to one scrolling row at the top of the view and let the peek dock above the
  strip; shorter English scene labels ("Site", "Catchment", "Ram", "Valve") or a smaller padding below 360 px.

**Q-13 · Without WebGL the page stays blank.** _Kit._
With `getContext('webgl')` returning `null` (old phone, blocked GPU, some privacy modes): `THREE.WebGLRenderer: Error creating WebGL
context` is thrown at mount, the page body is empty (no rail, no canvas, no text). `index.html` has a `<noscript>` message for
JavaScript only.
Fix (kit): wrap `new WebGLRenderer` in `try/catch` and show a bilingual message with the browser requirement.

**Q-14 · Opening RP-D09 and the simulation panel blocks the main thread.** _Lab (`src/panels/sim.ts`, `src/drawings/hydraulic/d09-performance.ts`)._
The first visit to «RP-D09 Courbes de performance» renders synchronously in the click handler: **579 ms, 98 `RamSim.sweep` calls** (about 560 ms
in them), about 2.3 s on a phone at 4× slower CPU; RP-D07 76 ms (3 sweeps). The second visit and a language switch cost 11 ms (cached).
Opening the simulation panel runs 42 sweeps (298 ms) and one slider move 62 (259 ms), one per frame at about 12 ms each: the panel adds
12 ms to every frame for 1 to 2 s (about 48 ms at 4×).
Fix (lab): compute the sweeps in idle chunks with a 4 ms budget or in a Web Worker, show «calcul en cours» on the sheet, and reuse the
sim panel's sweep cache for the sheet.

**Q-15 · A selected part, or a guide step's highlight, multiplies the cost of a frame by 2 to 3.** _Kit (`OutlinePass`), felt by the lab._
Per frame including the shadow map and every pass: site **831 → 1,649 draw calls and 485,534 → 965,572 triangles**; catchment 275 → 570
and 66,969 → 134,988; ram 333 → 666 and 124,457 → 243,915; valve 72 → 149 and 53,510 → 106,651. The composer makes 11 `renderer.render`
passes per frame with an outline active, against 2 without (a hovered part is a second `OutlinePass`, not measured).
Fix (kit): render the outline into a half-resolution target, only when the selection or the camera changes, or replace it by an emissive
tint on phones.

**Q-16 · The site world is heavy for a phone.** _Lab (`src/three/site/**`, `src/three/catchment/**`)._
Home view: **831 draw calls, 485,534 triangles per frame** (296k in the scene), 438 meshes, 186 materials, **380 shadow casters** (the
2,048² shadow map redraws all of them), against 333 / 124k for the ram and 72 / 54k for the valve. A flagship phone copes; a
mid-range phone is likely to be near 20 to 30 fps in the site and 10 to 15 with a part selected (Q-15). Not measurable here (no
GPU): see "Performance verdict".
Fix (lab): merge static props by material, restrict `castShadow` to what the shadow frustum sees (not every tree), a 1,024² shadow map and
`setPixelRatio(Math.min(dpr, 1.5))` under 600 px, 96 shader programs warmed up at idle.

**Q-17 · The simulation allocates most of the garbage.** _Lab (`src/sim/cycle.ts`)._
With the sampling heap profiler (garbage included, 6 s per case): `step` (cycle.ts:188) 12 to 14.5 MB, `solveMonotone` (cycle.ts:331) 7 to
8 MB, `residual` (cycle.ts:216) 3.6 to 4.2 MB, `lineResistance` 0.4 to 0.6 MB: **55 to 65 % of everything allocated**, in every world; three.js
uniform uploads (`getParameters`, `setValueM4`, `getProgramCacheKeyParameters`) are most of the rest. Per frame: 174 kB (valve) to
**496 kB (site)** at 7 to 17 fps here; at 60 fps that is 10 to 30 MB/s of short-lived objects, a steady source of minor GC pauses on a phone.
Fix (lab): reuse the state and scratch arrays of the cycle solver, hoist closures out of `residual`, avoid per-step object literals.

**Q-18 · Everything is in one eager chunk.** _Lab (`src/lab.ts`); the kit's contract needs two small requests._
`dist` is one JS file of **1,461 KB (437 KB gzip, 350 KB brotli)** plus 25 KB of CSS. By source: three.js core 468 KB (36 %), the
44 part sheets 208 KB (16 %), the 13 drawings 195 KB (14.5 %: hydraulic 113, mechanical 82), the guides 78 KB, the lessons 41 KB, the
catchment world 40 KB, the site world 29 KB, the strings 24 KB, the sim 23 KB. Roughly **520 KB of attributed source (40 %) is not needed for the first
frame** of the site in Explore: drawings, lessons, guides and the parts catalogue. All four worlds are also built at start-up
(129 ms of CPU at 1×, 510 ms at 4×, the site 90 / 349 ms).
Fix (lab): `import()` the lessons, the sheets and the guides on first use of their mode (keep `LESSONS.length`, `SHEETS.length` as
constants for the landing text). Kit requests: `SceneDef.module` as a factory so a world is built on first visit, and `DrawingSheet.render`
allowed to return a promise.

### Minor

**Q-19 · Tap targets under 32 px on a phone.** _Kit._ Hotspots 24 px high (2,259 hits), explode arrows `tool__mini` 16×19 and its slider
80×16, simulation sliders 16 px high, timeline ticks 26×22, part chips and filters 26 to 31 px, drawing buttons 23 to 30 px. Fix (kit): 36 px minimum hit areas (padding or `::before`) on touch.

**Q-20 · The toolbar covers the subject and a label at 1280×800.** _Kit and lab._ At 1280 the view is 842 px wide and the toolbar wraps to
two rows (89 px, «Ralenti ×1» alone on the second): it covers 12 % of the ram (the anchor block), 10 % or more of the catchment (32 states) and
hides the label «Massif d'ancrage» completely (137 label hits, also «Doigt de gant» in the valve). Fix: single-row toolbar by dropping the
button labels below 1400 px, or a `bottom` offset in the frame; the lab can move the home pose up by the toolbar's height.

**Q-21 · The valve and the site are small in the 380 px view of a tablet.** _Kit._ 768×1024: the 3D view is 380×902; the valve fills
8 % of it (20 states), the site 13 %. The kit's `homePadding` applies to the sphere; a narrow view needs a different padding.

**Q-22 · Drawing viewer details.** _Lab and kit._ (a) The counter «RP-D13 · 13/13» needs 101 px in a 92 px box (`dv__no`, 4 hits). (b) At
"fit to screen" on a phone the A3 sheet is 358 px wide: its 2 mm text is about 1.5 px high, so it must be zoomed (14 states). (c) Two text
overlaps measured on the real SVG boxes: RP-D12 «Regard du bélier» × the number «1» (53 % of the smaller), RP-D02 in English «80*» × «stainless
disc + seal» (24 %); the smallest text of the 13 sheets is 1.3 mm high on RP-D07 (a single letter).

**Q-23 · A resize or rotation does not re-frame.** _Kit._ Going from 390×844 to a wider window leaves the subject cropped (≥ 25 %) until
"Vue d'ensemble" is pressed (761×900, 2 hits). Fix: re-run `frameAll` on a debounced resize when the camera has not been moved by hand.

**Q-24 · "Tout afficher" in the part sheet frames the part again.** _Kit._ After isolating, the button that restores the other parts calls
`frameParts([id], 1.5)`: 4 of 8 parts (site), 8 of 9 (catchment), 2 of 13 (ram), 8 of 14 (valve) stay outside the view. The peek card's
button frames the whole device. See Q-09.

**Q-25 · The bottom sheet cannot be dragged.** _Kit._ A touch swipe up on the grip does not open it; only a tap on the 34 px grip does.

**Q-26 · The first use of the section tool compiles shaders in the middle of an interaction.** _Lab and kit._ In the catchment the first
«Coupe» adds 17 shader programs (68 → 85); the renderer holds 96 programs after the four worlds are visited, 35 at start-up. In the
software renderer that frame took 514 ms (a GPU compiles faster, but a visible hitch is likely on a phone). Fix: `renderer.compileAsync` for
the section variants at idle.

**Q-27 · Reload does not bring back the mode, the world or the open lesson.** _Kit, by design._ Language, lesson progress and panel
width are kept (and corrupted or blocked storage does not break the boot); the page always starts on the site in Explore, and only
`#world/part` deep links are read. `#ram/does-not-exist` selects an unknown id silently (no error; the panel falls back to the world overview).

**Q-28 · `public/lab.json`: `energyProfile` is `null`.** _Lab, info._ Check that the hub accepts it for a lab with no electricity. Title,
tagline, tags, difficulty (2) and minutes (20) are filled in French and English where bilingual.

### Proposed kit requests (to append to `kit-requests.md`)

14. Plans on a phone: the viewer under the sheet and fitted above it (Q-01). 15. Phone toolbar above the open sheet, opaque sheet,
    affordance on the rail and toolbar scrollers (Q-02, Q-03). 16. Hotspot collision handling and edge clamping (Q-05). 17. `LineChart` that
    can shrink (Q-08). 18. `frameAll` after the display refresh when isolate is cleared, and re-framing on resize (Q-09, Q-23, Q-24). 19. A world
    change by hand inside a guide (Q-10). 20. AA contrast tokens (Q-07). 21. WebGL failure message (Q-13). 22. Strip alarms that wrap and a phone
    strip that keeps the most important value (Q-06). 23. Lazy `SceneDef.module` and async `DrawingSheet.render` (Q-18). 24. A cheaper outline
    (Q-15). 25. Short-landscape layout (Q-12).

## Already requested, confirmed by measurement

Request 6 and 9 (exploded subject out of the view): Q-11. Request 7 (phone subject behind the sheet): Q-04, with the numbers above. Request
8 (the catalogue offers «Électrique» with no part): seen in `390x844-fr/019-ram-ram-parts.jpg`. Requests 1 to 5 and 10 to 13 do not show in
the audit.

## Floating parts and the waste valve

Numerical (`flows/model`): in the assembled pose every visible part's box touches another box (tolerance 1.5 m site, 30 mm catchment, 8 mm ram, 4 mm
valve): 8, 9, 13 and 14 parts, **one connected component in each world**, no isolated part. By eye on contact sheets of about 40 screenshots (explode 0.5 and 1,
X-ray, isolate, section, flows in each world, the first and last step of each stretch of both guides): nothing hovers; in the exploded view
the parts are separated by design, the valve's seat and head drop between the parallels, and the assembly guide's wire frames are the
parts not yet built. The waste valve is one model built twice (`createWasteValveModel`): its box is 0.100 × 0.260 × 0.100 m in the ram world
(with the studs of the waste flange) and 0.100 × 0.248 × 0.100 m in the valve world (the plate alone): they agree. No z-fighting or hole
was seen in the default views; the black rebar weight of the valve shows a ribbed, jagged silhouette at 1× pixel ratio (the helical ribs),
which is the model, not a defect. The guide's camera frames the parts of each step (outside the view 0 % at 1280×800); four small steps
(nuts and stem, assembly steps 8, 12, 13, 18) fill 1 to 2 % of the view, still readable with their outline (`flows/…framing-tiny-12.jpg`).

## Performance and weight

Measured with a software renderer: **counts are real, GPU frame times are not.** The CPU numbers use 1× and 4× throttling.

| World     | Meshes | Draw calls / frame (home) | Triangles / frame (home) | With a part selected (calls / triangles) | Geometries | Materials | Shadow casters |
| --------- | -----: | ------------------------: | -----------------------: | ---------------------------------------: | ---------: | --------: | -------------: |
| site      |    438 |                       831 |                  485,534 |                          1,649 / 965,572 |        436 |       186 |            380 |
| catchment |    160 |                       275 |                   66,969 |                            570 / 134,988 |        158 |       106 |            117 |
| ram       |    178 |                       333 |                  124,457 |                            666 / 243,915 |        178 |        66 |            158 |
| valve     |     44 |                        72 |                   53,510 |                            149 / 106,651 |         44 |        22 |             33 |

Renderer totals after the four worlds: 843 geometries, 64 textures, 96 programs. Explode, X-ray, section and flows change the counts by
less than 15 %. JavaScript on the main thread per frame (1× / 4×): site 2.4 / 10.1 ms, catchment 1.3 / 5.4, ram 1.2 / 4.9, valve 0.6 / 2.2,
simulation panel open 6.2 / 6.5 (longest frame 11 / 12 ms). Layout 2 to 4 per second in the 3D modes, 10 to 12 in the simulation panel (a 5 Hz
re-render of 20 readouts and the strip: 254 DOM nodes created per second).

| Memory after 52 world and mode switches |        Before |         After |
| --------------------------------------- | ------------: | ------------: |
| JS heap (MB, after a forced GC)         |            52 |            52 |
| DOM nodes / listeners                   |   1,847 / 263 |   1,848 / 263 |
| Geometries / textures / programs        | 802 / 39 / 61 | 802 / 39 / 61 |

No leak. Time to build the four worlds: 129 ms at 1× (site 90), 510 ms at 4×. Boot of the production bundle (gzip served locally, software
renderer): `DOMContentLoaded` 1.4 s, first painted frame 6.4 s, of which 6.2 s of script that is mostly synchronous shader compilation in
software; 6.9 to 7.2 s at 4×. Transfer 436 KB (about 2.2 s on a 1.6 Mbit/s "fast 3G" link, 0.3 s at 12 Mbit/s).

| Bundle, one chunk (attributed source bytes)            |  KB |  Share |
| ------------------------------------------------------ | --: | -----: |
| three.js core + examples (controls, composer, outline) | 514 | 39.7 % |
| Part catalogue (44 sheets, FR + EN)                    | 208 |   16 % |
| Drawings (hydraulic 113, mechanical 82)                | 195 |   15 % |
| Guides (assembly, installation)                        |  78 |    6 % |
| Kit (ui, three, i18n, sim, drawings)                   |  66 |  5.1 % |
| Lessons                                                |  41 |  3.2 % |
| Worlds (catchment 40, site 29, ram 21, valve 17)       | 107 |  8.3 % |
| Strings 24, sim 23, panels 17, shared 3D 11, glue 13   |  88 |  6.8 % |

The attributed bytes are about 91 % of the 1,461 KB file (the rest is bundler glue).

**Recommendation.** (1) Lazy-load drawings, lessons, guides and the catalogue behind their modes: first load falls from 437 to roughly 265 KB
gzip (Q-18). (2) Cut the site's shadow casters and merge static meshes before anything else: it is the only world above 400 draw calls
(Q-16). (3) Make the outline cheap (Q-15) and the sweeps incremental (Q-14). (4) Stop the allocations of `cycle.ts` (Q-17). (5) Warm up
shader variants at idle (Q-26).

**Would it run on a mid-range phone?** The ram, the valve and the catchment very likely at 30 fps or more (at most 333 draw calls and 124k
triangles, light JavaScript); the site probably 20 to 30 fps and a part selected there probably 10 to 15, with a visible hitch at the first
section or first selection, and a stutter of about 1 s each time a simulation slider moves. Page weight is fine (437 KB gzip). The
real limiting factor on a phone today is the layout (Q-01 to Q-04), not the 3D.

## Quality gates (BRIEF §6)

| Gate                                              | Result                                                                                                                                                                                                         |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                               | pass (0.4 s)                                                                                                                                                                                                   |
| `npm run format:check`                            | pass (1.7 s; includes `tools/qa/*.mjs`)                                                                                                                                                                        |
| `npm test`                                        | pass: 618 tests in 20 files (6.1 s)                                                                                                                                                                            |
| `npm run build`                                   | pass: JS 1,461.07 kB (440.70 kB gzip), CSS 25.39 kB                                                                                                                                                            |
| Frame respected (no layout CSS in the lab)        | yes: no CSS file in `src`; every layout defect above is in the kit                                                                                                                                             |
| Nothing hidden or overlapping at three widths     | **no on the phone (Q-01 to Q-04, Q-12)**; yes at 1280 and 768 except labels (Q-05) and strip (Q-06)                                                                                                            |
| FR/EN parity                                      | pass (scan of every mode, with a drawing, a lesson, a guide step open: 0 untranslated texts)                                                                                                                   |
| No floating part                                  | pass (numerical and by eye)                                                                                                                                                                                    |
| `public/lab.json`                                 | pass (title, tagline, tags, difficulty, minutes; `energyProfile: null`)                                                                                                                                        |
| README, English first and French at the end       | pass in the working tree (see below)                                                                                                                                                                           |
| "Independent educational reconstruction" notice   | pass in FR and EN (Sources panel, README)                                                                                                                                                                      |
| Credit and link of the source video and its maker | pass: `youtube.com/watch?v=mc0gq5rObcM`, «L'énergie partout», thanks to Didier Nebreda, 20 links with `rel="noopener noreferrer"`                                                                              |
| No footage or images of the video                 | pass: no image, audio or video file in the repository, no thumbnail reference; `docs/transcript.md` is not tracked                                                                                             |
| Warnings where required                           | pass: all 11 installation steps carry a warning (legal: DDT and OFB, potable water, rigid pipe, anchor); the assembly guide mentions the finger in the waste valve; the Sources panel has two warning callouts |

**README.** At the start of the audit `README.md` was still the scaffold: «Scaffold generated from lab-template», «Read `BRIEF.md` first, then
fill `docs/research.md`» (a note to the team), no description of the lab, no notice, no credit, no safety line, and a three-line French
stub. During the audit the lead rewrote it (uncommitted at the time of the run): it now describes the four worlds, the guides, the
simulation, the drawings, the lessons, the notice, the source with its link, the generic ram, the safety and legal notes, and carries a
full French section at the end (3,076 characters). The audit's README checks pass on that version.

## Interaction robustness

| Flow                                                                                                                                                                                                                                                       | Result                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 50 random world / mode / language / panel / tool / label / canvas actions (desktop and phone, seed 1)                                                                                                                                                      | no error; the shell stays consistent; the render loop and the orbit still answer    |
| Side panel: hide, reading mode, drag the edge (clamped to a 320 px view), double click to reset                                                                                                                                                            | pass                                                                                |
| Bottom sheet: grip toggles (the slide starts late on a busy thread); swipe does not                                                                                                                                                                        | Q-25                                                                                |
| Language in every mode, with a part, a guide step, a drawing and a lesson open                                                                                                                                                                             | pass: state kept, texts and drawing re-rendered, `<html lang>` and the title follow |
| Assembly (23 steps: valve 1 to 13, ram 14 to 23) and installation (11: site 1, catchment 2 to 5, site 6 to 11): forward, backward, 8 timeline jumps, leave and re-enter, autoplay across a world boundary                                                  | pass; displays of parts correct at every step; a world changed by hand: Q-10        |
| Simulation: 3 presets, 8 scenarios, the four phases and the release (from the site too), 14 sliders to their extremes, every select, the sizing calculator, every part test button (air chamber, snifter, waste valve, gate valve, tank drain, stroke nut) | pass; no NaN; each button changes the simulation; the 3D answers afterwards         |
| Reload: language, lesson progress, panel width kept; corrupted or blocked storage; deep links `#ram`, `#valve`, `#catchment/spring-box`, `#ram/air-chamber`, `#site/air-chamber`, unknown part, nonsense; fonts blocked                                    | pass (Q-27 for what is not stored); no WebGL: Q-13                                  |
| Toolbar buttons in every world                                                                                                                                                                                                                             | flags, labels and slow motion cycle correctly; Q-09, Q-24                           |

## What I could not verify

A real GPU (all timings of the GPU part, the 30 or 60 fps claims, the memory of textures); a real touch device (hit areas by the emulated
mobile viewport, momentum, the browser bar collapsing, the safe areas of a notch: the sheet uses `46vh` and a fixed bottom offset with
no `env(safe-area-inset-bottom)`); Safari and Firefox; Windows and Linux classic scrollbars (the side panel is 8 to 15 px narrower there);
a screen reader and the keyboard; a slow network. Z-fighting, holes and floating parts were looked for by eye on several dozen screenshots (contact sheets of the tool states, the guide
steps and the part sheets), not by script. The software renderer made every frame slow, so a few waits (the bottom sheet slide, the strip refresh after a language
switch) look late in the audit and are not defects.

## Rerun

```bash
npm run dev
QA_MODULES=<scratch>/node_modules node tools/qa/audit.mjs --url http://localhost:5600/ --out /tmp/qa-run
node tools/qa/audit.mjs --quick --phases matrix,flows --no-gates --viewports 390x844m --langs fr    # a phone check after a change
```
