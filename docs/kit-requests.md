# Requests to the lab kit

Things the ram pump lab would like from `@onigam/lab-kit` (BRIEF.md §2: a missing building block becomes a change of the
kit for all labs, never a local workaround). Written by the physics role, wave 1.

## 1. `CurveChart` with its own units

`CurveChart` draws "power vs speed" with `W` and `tr/min` written in the canvas code. The ram lab has the same kind of
curve (delivered water against the delivery head, consumption against the stroke, each with the present operating point
and an optimum) but in other units. The simulation panel uses `LineChart` with `markers` instead, which works, but loses
the "optimum" annotation and the operating-point style.

- **What**: take `xFmt` / `yFmt` (and optionally `labels`) like `LineChart`, or expose a generic `XYChart`.
- **Why**: any lab with a performance curve (Pelton power curve, ram delivery curve, heat output against load).
- **Needed by**: ram pump lab (nice to have).

## 2. A clickable alarm in the bottom strip

`StripAlarm` is `{ key, label, severe? }`. When the ram stops (buffer tank empty) the story of the video is that somebody
has to walk to the ram and restart it by hand; the lab has `RamSim.restart()` and a button in the simulation panel, but
the visitor looking at the 3D view only sees "Stopped: tank empty" in the strip.

- **What**: optional `action?: { label: string; run(): void }` on `StripAlarm`, rendered as a small button in the chip.
- **Why**: lets the strip offer the fix (restart the ram, reset a breaker, clear a clogged screen) from any mode.
- **Needed by**: ram pump lab; Pelton lab has the same pattern (trip, deflector reset).

## 3. Tooltip on the strip values

`StripValue` has no `title`. Values such as "Rate: 109 strokes/min" or "Efficiency 45 %" would benefit from a one-line
definition on hover (η D'Aubuisson = q·H/(Q·h)). Optional `title?: string` on `StripValue`.

## 4. Generic landscape helpers (written locally by the 3D role, wave 2)

The ram lab's site world needed a heightfield terrain with a cheap per-parameter rebuild, a value-noise `fbm`, instanced
low-poly trees, pipes that stay a few pixels wide from far away (vertex displacement along the normal by the distance to the
camera), travelling flow dots along a polyline (`FlowDots`, positions only, screen-size or world-size) and a `CutKit` for the
section tool (clipping plane + 2D section caps). Pelton Lab has its own versions of the first three.

- **What**: move `fbm` / `vnoise`, the tensor-grid terrain with linear-in-parameters rebuild, `instancedTrees`, the
  min-pixel-width pipe material, `FlowDots` and `CutKit` into the kit (`@onigam/lab-kit/three`).
- **Why**: every site world of the series (Pelton, ram, Piggott, bioclimatic house, …) rebuilds a landscape and draws pipes
  and flows; the section tool is needed by every device world.
- **Needed by**: Pelton Lab, ram pump lab, and the next labs with a landscape.

## 5. Selecting an assembly should keep its nested parts solid in X-ray / isolate

`PartRegistry.add` supports nesting (children registered before the parent), but `DisplayController` treats every id
separately: with the `waste-valve` assembly selected, "Transparence" ghosts its own children (`valve-stem`, `valve-seat`,
`stroke-nut`, …) and "Isoler" hides them, so the inside of the assembly cannot be seen. Optional `parent?: string` (or a
helper `registry.family(id)`) on the registry entry, and `display.ts` keeping `id === selected || isDescendantOf(selected)` solid.

- **What**: nested parts follow their ancestor's selection in X-ray and isolate (and in the label / outline logic).
- **Why**: assemblies such as the ram's waste valve (8 catalogue ids inside one assembly) are the point of the lab.
- **Needed by**: ram pump lab (the waste valve); any lab with a catalogue assembly.

## 6. Guide framing: `frameAll` for a device world could take a padding hint

`Stage.frameAll` frames the union of the visible parts at padding 0.82 from the home direction. The ram world's union includes
a long drive-pipe stub and the delivery pipe stub, so the machine looks small and off-centre at the home view, and the exploded
view (offsets up to 0.65 m) overflows the frame. A per-world `homePadding` and an explode-aware union (bounds with the explode
factor of the moment) would fix both.

- **What**: optional `framePadding?: number` on `SceneDef`, and `frameAll` using the current (exploded) bounds.
- **Needed by**: ram pump lab (nice to have).

## 7. Mobile: frame the subject above the bottom sheet

On a 390×844 phone the bottom sheet covers the lower half of the 3D view and `Stage.frameAll` / `frameBox` centre the
subject on the whole canvas, so the ram (and the site) sit half behind the sheet. Seen on this lab at the wave 2 checkpoint
and on the template; Pelton Lab has the same behaviour.

- **What**: when the sheet is shown, shift the projection centre up by half the sheet height (`camera.setViewOffset`) or pass
  the visible rectangle to `frameBox`; re-frame when the sheet is expanded or collapsed.
- **Why**: first impression on a phone, for every lab.
- **Needed by**: all labs (lead's finding, wave 2).

## 8. Parts catalogue: hide categories without parts

The "Pièces" filter always shows the five categories, including "Électrique", which this lab has none of. Show only the
categories that have at least one part in the lab.

- **Needed by**: every lab that does not use all five categories (lead's finding, wave 2).

## 9. Guide step with a section, and a tall subject in the overview (3D role, wave 3a)

Two needs of the `valve` world (the waste valve at workshop scale, 0.25 m tall, 100 mm wide):

- **A guide step that asks for the section.** The seat, the head and the fins nut end inside the reducer; the stem sleeves end
  inside the guide. At their step they are only seen through the outline of the step, because the parts placed before hide them.
  The visitor can press "Coupe" by hand, but the guide should do it for these steps: optional `cutaway?: boolean` on
  `GuideStep` (the display controller would apply it for the step and restore the choice of the visitor after).
- **Overview of a tall, narrow subject.** Request 6 asks for a per-world `framePadding`; the valve needs it too. `frameAll`
  frames the bounding sphere at padding 0.82, which for a tall object is about its height: the weight and the plate are cropped
  at the top and the bottom of the home view; a `framePadding` around 1.1 to 1.2 would fit it. The exploded valve is 0.54 m
  high for a 0.25 m valve, so the explode-aware union asked for in request 6 matters here too.

- **Needed by**: ram pump lab (valve world); any lab with a tall, narrow device.
- Request 5 (nested parts in X-ray) is no longer needed: the `waste-valve` of the ram world is one part, its 14 parts are in
  the `valve` world.

## 10. Line breaks in the long texts of a part sheet and of a guide step (data role A, wave 3a)

`rich()` (kit `ui/dom.js`) only handles `**bold**`: a newline in `description`, `maintenance`, `tip`, `design` or a guide step `text`
collapses to a space, so a text of 120 words is one block. The `maintenance` of the 27 sheets of the ram and valve worlds is
written « **Panne :** … **Contrôle :** … **Entretien :** … » (failure, a check a visitor can do, upkeep) and reads better with one
line per label; the first-start step of the assembly guide (what to see, hear and check) is the longest text of the lab.

- **What**: let `rich()` turn a blank line (`\n\n`) into a paragraph break (several `<p>`, or a `<br>`), keeping `**bold**`.
- **Why**: readability of the Maintenance tab and of the long guide steps, for every lab with long texts.
- **Needed by**: ram pump lab (nice to have; the texts stay correct without it, the bold labels carry the structure).

## 11. A lesson that opens the simulation on a frozen phase or on the calculator (sim role, wave 3a)

`Lesson.focus` knows `scene`, `part`, `preset` and `scenario`, and `LabSim` has `applyPreset` and `applyScenario`. The ram lab's
simulation can now freeze its stroke cycle at a phase (`RamSim.holdPhase('close')`, `stepPhase()`) and its panel has a sizing
calculator; the lessons `cycle` (water hammer and the four phases) and `sizing` should open on them, which no focus field can say.

- **What**: either an optional `LabSim.applyFocus?(focus: Record<string, string | number>)` that the shell calls with the new
  keys of `focus` (a free `sim?: Record<string, string | number>` field), or an optional `LabDefinition.onLessonOpen?(ctx, lesson)`
  hook. The lab would then freeze the phase (`holdPhase`) and switch to the simulation mode.
- **Why**: a lesson about the cycle that cannot show the frozen instant it describes is only text; the hook is also what a lesson
  needs to open on a part action ("test" button) outcome.
- **Needed by**: ram pump lab (lessons `cycle`, `waste-valve`, `sizing`). Until then the lesson can only open a scenario
  (`plastic-pipe`, `heavy-weight`, …) and the learner presses the phase chips by hand.

## 12. Drawings: text wrapping, tables, detail windows and a decimal in dimension labels (drawings-M, wave 3b)

The mechanical sheets of the ram lab needed four things the drawing kit lacks, written locally in `src/drawings/mechanical/draw.ts`
(Pelton Lab has its own copies too):

- **Wrapped text and tables.** `Drawing.table` is single-line and mono-spaced, `View.text` does not wrap: a bill of materials, notes
  and legends all need word wrap (with no break between a number and its unit, nor before French punctuation), cells that grow
  with their text and a table that returns its height. Locally: `wrap`, `note`, `grid`, `box`, `marksLegend`.
- **Detail windows.** A detail at 5:1 or 10:1 of a half section needs shapes clipped to a window (a polygon clip and a line clip)
  and a zigzag along the cut edge. Locally: `clipPoly`, `polyIn`, `rectIn`, `cutEdge`.
- **`fmt` drops the decimal from 10 mm up.** `fmt(18.6)` gives "19" (it rounds every value of 10 or more to an integer), so
  `View.dim` prints a wrong dimension for Ø18.6, 33.5 or 9.9 unless the caller passes `label`. Locally every dimension passes an
  explicit bilingual label (decimal comma in French). Wanted: one decimal when the value has one, and the language's decimal sign.
- **Sheets cannot be rendered in Node.** `Drawing` calls `document.createElementNS` and `XMLSerializer`, and the labs have no DOM in
  their test environment (no jsdom or happy-dom in `devDependencies`), so a test that renders a sheet needs a stub. Locally:
  `src/drawings/mechanical/test-dom.ts`, a 100-line fake DOM that also extracts every `<text>` with its box, which lets
  `mechanical.test.ts` check by script that no text overlaps another and that none leaves the frame. Wanted: either a headless
  `Drawing` (a string builder behind the same API) or a test helper exported by the kit.

Smaller: the title-block scale cell holds about 11 characters (`1:1 · 2:1 · 5:1` touches the next cell); there is no concrete hatch
(`earth` is used for the anchor block).

- **Needed by**: every lab with sheets; Pelton Lab already carries copies of `wrap`, `grid` and `note`.

## 13. Drawings: charts, bullet gauges, wider tables and a bilingual scale cell (drawings-H, wave 3b)

The seven hydraulic and site sheets draw curves and bar charts from the simulation, and ratios against rules; the kit has `LineChart`
and `CurveChart` for the live canvas panels, but nothing for an SVG drawing. Written locally in `src/drawings/hydraulic/`
(`chart.ts`, `gauge.ts`, `util.ts`, `contour.ts`); Pelton Lab's single-line and penstock sheets have their own copies of the same needs.

- **A chart helper for `Drawing`.** A box in paper space with axes, ticks and labels, an optional grid, polylines clipped to the box
  (a curve that leaves the plot is cut on its edge, not drawn across the sheet), bands (a reported range, a zone to avoid), reference
  lines, markers (diamond, cross, triangle) and a title. Locally: `Chart` (about 190 lines), used by RP-D08 (pressure, velocity and
  valve opening of one stroke), RP-D09 (three families of curves and four bar charts), RP-D10 (bars).
- **A bullet gauge** for a ratio against its rules (a scale, a usual band, a forbidden zone, dashed marks, a marker for the lab's own
  value): L/h and H/h of RP-D10 and RP-D12. Locally: `gauge`.
- **`Drawing.table` has a fixed 2 mm text and mono-spaced cells.** The sizing table and the levels tables want 2 to 2.2 mm text, a
  tinted row, right-aligned numbers and no empty cell text. Locally: `gridTable` (the same request as `grid` in request 12).
- **The title-block scale is a `string`, not a bilingual value, and about 11 characters wide.** "sans échelle" / "not to scale",
  "1:1000 · 1:200" and "1:1000 / 1:667" are at the limit; the sheets pass `tr(l(…))` at render time, which works because the viewer
  renders again on a change of language, but a cell that takes a `Text` and shrinks its text to fit would be cleaner.
- **No text measurement.** Detached SVG text cannot be measured, so every layout helper estimates the width of a string (0.52 em per
  character) and the test of the sheets checks the estimated boxes; a measurement through a canvas context when there is a DOM, or a
  font table, would make the notes wrap and the overlap checks exact. (Same family as the Node rendering problem of request 12: the
  hydraulic sheets reuse the idea of a fake DOM, `src/drawings/hydraulic/test-dom.ts`, which also applies the `transform` of the
  groups to the texts it extracts.)
- **Hatches**: there is no concrete or rock hatch (`steel` and `alu` stand for them on RP-D13; `earth` is soil only).

- **Needed by**: every lab with charts on its sheets (Pelton Lab draws efficiency and power curves); the ram lab (RP-D08 to RP-D10).

## 14. Narration: the cues placed at the very end of a segment are never applied (found with the French audio, 2026-10-28)

A part or world segment that switches something on at the start and off "at the end" (`[[cutaway:on]] … [[cutaway:off]]`, `[[flows:on]] … [[flows:off]]`,
`[[xray:on]] … [[xray:off]]`, `[[explode:0.6]] … [[explode:0]]`) leaves the effect on when the audio ends. The generator puts a trailing marker
at the end of the aligned text (air-chamber: `cutaway: false` at 22.8 s), but the decoded audio is a hair shorter (22.7 s), so `onEnded` →
`tick()` reads `currentTime` below the cue time and never runs it. Measured in Chrome on `part-air-chamber` (section stays on), `part-valve-seat`
(X-ray stays on) and `part-valve-stem` (explode stays at 0.6); a cue in the middle of the text (`scene-valve`: `explode:0` at 24.7 s) works.
Pelton Lab has the same pattern (`part-in-screen`: `flows:false` at 20.96 s, `part-buckets`: `flows:false` at 24.72 s) and the same symptom.

- **Fix in the kit**: when the audio ends, apply the state at the end of the segment (the last cue of each kind, as `replayCues` does for a seek to
  the end) instead of only the cues up to `currentTime`; or clamp every cue time to the audio duration. No lab or script change, no new audio.
- **Needed by**: every lab with a spoken guide (Pelton Lab in production, this lab).
