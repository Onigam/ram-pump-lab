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
