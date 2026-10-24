# QA audit

A reusable audit of the whole lab, run against the dev server with headless Chrome. It measures what a person would
otherwise have to notice by eye (layout at several widths, the subject of the 3D view, interaction robustness, weight) and
writes a JSON report and screenshots. The findings of a run are written up in [`docs/qa.md`](../../docs/qa.md).

```bash
npm run dev                                   # http://localhost:5600/ (window.__lab is exposed in dev only)
npm i --no-save puppeteer-core                # in a scratch copy of the repo, never committed
QA_MODULES=/path/to/scratch/node_modules node tools/qa/audit.mjs --url http://localhost:5600/ --out /tmp/qa-run
```

Needs Google Chrome (set `CHROME=/path/to/chrome` if it is not in the usual place), Node 20+ and the dev server. A full run takes about 47 minutes on an Apple M3 Pro (741 states, 23 widths, 12 flows, build and gates); `--quick --langs fr` takes about
20 minutes. The audit changes nothing in the repository (the production build it analyses goes to `<out>/dist-qa`). Exit code: `1` when a
**blocker** is found, `0` otherwise.

Serve a stable copy of the repository while the audit runs: a hot reload of the dev server in the middle of a state is
retried once, then reported as `audit-crash`.

## Options

| Option        | Meaning                                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--url`       | the dev server (default `http://localhost:5600/`)                                                                                                 |
| `--out`       | output directory: `report.json`, `summary.txt`, `shots/`, `dist-qa/` (default `./qa-out`)                                                         |
| `--phases`    | `matrix,sweep,flows,static,perf` (default all, in this order)                                                                                     |
| `--viewports` | `1280x800,768x1024,390x844m` (`m` = phone emulation: touch, mobile viewport)                                                                      |
| `--langs`     | `fr,en`                                                                                                                                           |
| `--flows`     | only some flows: `random, random-phone, panel, panel-phone, language, language-phone, guides, guides-phone, sim, sim-phone, reload, tools, model` |
| `--sections`  | only some matrix sections: `base, guides, parts, lessons, sheets, sim, tools`                                                                     |
| `--quick`     | fewer states and flows (about a fifth of the time): for a check after a change                                                                    |
| `--shots`     | `jpeg` (default), `png` or `none`                                                                                                                 |
| `--seed`      | seed of the random switching (a run can be replayed)                                                                                              |
| `--no-gates`  | skip `npm run typecheck / format:check / test / build` in the static phase                                                                        |
| `--boot`      | milliseconds to wait after load (default 6000; the software renderer is slow)                                                                     |

## What it checks

**`matrix`**: every viewport × language × world (4) × mode (8), plus the states that need a part (11 parts, four tabs each),
the first and last step of each stretch of the two guides, each lesson with its quiz answered, the drawing sheets, the simulation
panel (sections closed, open, scrolled to the end, each preset, each scenario with the time running) and, for the first language,
the 3D tools in each world (explode 0.5 and 1, X-ray on a selected part and on the whole, isolate, section, flows, all labels).
Each state is measured twice, by DOM (`measure.mjs: layoutProbe`) and by projecting the parts through the camera (`subjectProbe`),
and photographed:

- horizontal scroll of the page, controls outside the screen, cut by a container with no way to scroll, reachable only by a swipe
  with no scrollbar (the phone rail and toolbar), hit-tested hidden behind another element (five points per control);
- overlaps between the controls and text blocks of the frame (top bar, rail, toolbar, strip, sheet), measured on the text itself;
- truncated texts (`scrollWidth > clientWidth` under `overflow: hidden` or an ellipsis) with their full text, nowrap text that
  spills out, content wider than the side panel, tap targets under 32 px on a phone, text contrast (WCAG AA, composited over the
  real background);
- 3D labels (hotspots): overlapping, cut by the edge of the view, under the toolbar, the panel or the sheet;
- the subject of the 3D view: share cropped by the view, share hidden behind the phone's bottom sheet, size, where the camera puts
  a selected part or the parts of a guide step; whether the world is drawn (the canvas is read back: flat colour, dark);
- drawing sheets: the real boxes of the SVG texts (overlaps, texts leaving the frame, smallest text), how much the phone sheet hides.

**`sweep`**: the same DOM measures at 23 sizes (320 to 1920 wide, tablets, landscape phones) on five states, French and English,
because the breakpoints of the frame (760, 900, 1020, 1100, 1280 px) break between the three standard sizes.

**`flows`**: scripted interaction through the real buttons, each flow on a fresh page, errors counted, the shell checked after each
step (`stateProbe`: the store, the stage, the scene switch and the rail must agree) and the 3D checked at the end (frames advance,
dragging moves the camera): 50 random world/mode/language/panel/tool/label/canvas actions (seeded); the toolbar buttons in every world (including "Overview" while a part is isolated); the side panel (hide, reading
mode, drag the edge, double click) and the phone sheet (grip, swipe, toolbar behind it); the language in every mode with a part,
a guide step, a drawing and a lesson open (and a scan for English in French and the reverse); both guides (every step forward with
the displays of the parts, the highlight and the framing checked, backward, timeline jumps, a world changed by hand, leaving and
re-entering, autoplay across a world boundary); the simulation (presets, scenarios, the cycle frozen and stepped, every slider at its
extremes, every select, the sizing calculator, every part test button, NaN scan); reload with stored values (language, lessons,
panel width, corrupted storage, blocked storage, deep links including an unknown part, no WebGL, blocked fonts); the assembled model
(parts that touch nothing, the waste valve in the ram world against the valve world).

**`static`**: a production build with source maps into `<out>/dist-qa`, bundle weight attributed to the source files (what could
be lazy), the four quality gates of BRIEF §6, `public/lab.json`, the README, the notice, the credits, the warnings of the guides and
of the Sources panel in both languages, no media files and no thumbnails of the video, `docs/transcript.md` untracked.

**`perf`**: draw calls, triangles, geometries, textures and programs per world and per tool (counted over all passes: the shadow
map, the outline passes), main-thread milliseconds per frame split into simulation, scene update, render and UI at 1x and 4x CPU
throttling, heap allocation per second and per frame, layouts and style recalculations per second, DOM churn, the time to build
each world, heap/DOM/GPU-resource growth after about 50 world switches, the number and cost of `RamSim.sweep` calls when the
simulation panel and each drawing sheet open, and the boot of the production bundle (served with gzip) at 1x and 4x.

## Reading the output

`summary.txt` is the list of findings, worst first. `report.json` has:

- `findings[]`: one entry per **cause** (a cause seen at many places is one finding): `sev` (`blocker`, `major`, `minor`, `info`),
  `source` (`lab`, or `kit` when the frame's CSS or code is at fault; `ref` cites a request in `docs/kit-requests.md`), `title`,
  `count`, `places[]` (`viewport/lang/world/mode/state`), `examples[]` (measured numbers), `agg` (the elements involved with their
  sizes), `shots[]` (file names under `shots/`);
- `states[]`: every measured state with its screenshot and a few counters; `flows[]`: each flow with its checks and notes (the
  alarms of each scenario, the framing of every guide step, the part tests); `sweep[]`: the table of the width sweep; `perf`,
  `static`, `model`, `logs[]` (page errors, failed requests, warnings, font requests that were ignored).

Severity: **blocker** = something that stops a visitor (a page error, a failed request, an empty or dark world, a control that
cannot be reached, a page wider than the screen, a gate that fails); **major** = visibly wrong or hard to use; **minor** = polish.
The rules are in `rules.mjs`; adjust them there.

Screenshots are named `NNN-<world>-<state>.jpg` under `shots/<viewport>-<lang>/`. To look at many at once:

```bash
node tools/qa/montage.mjs --dir /tmp/qa-run/shots/390x844-fr --match 'explore|sim' --cols 4 --cell 300 --to /tmp/m.png
```

## Limits

- The renderer is SwiftShader (software): counts (draw calls, triangles, milliseconds of JavaScript) are real, frame times of the
  GPU part are not. The device pixel ratio is 1; a phone renders at up to 2.
- macOS Chrome draws overlay scrollbars, which take no width; Windows and Linux draw classic ones, so the side panel is 8 to
  15 px narrower there (not measured).
- Fonts come from Google Fonts: offline, the layout is measured with the fallback fonts (the `logs` say which fonts loaded; a
  flow also measures with fonts blocked).
- Touch is emulated (a mobile viewport, a touch screen for the swipe test); a real device is not.
- Z-fighting, holes and floating parts are looked for by eye on the screenshots (the model flow only checks that boxes touch).

## Files

`audit.mjs` (entry, report), `matrix.mjs`, `sweep.mjs`, `flows.mjs`, `static.mjs`, `perf.mjs` (the phases), `measure.mjs` (the
in-page probes), `rules.mjs` (what is a defect), `drive.mjs` (Chrome and UI driving), `findings.mjs`, `montage.mjs`.
