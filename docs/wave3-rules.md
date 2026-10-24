# Rules for the wave 3 team (read with BRIEF.md and docs/research.md §11)

Several specialised agents work in this repository at the same time, each on its own files. The lead (the main session)
integrates, commits and pushes; **nobody else runs git commands that change state** (no commit, push, stash, reset,
checkout, rebase): the working tree is shared.

## Contract and ownership

- `src/part-ids.ts` is the frozen list of the 44 part ids of the four worlds (`site`, `catchment`, `ram`, `valve`). Do not
  edit it, rename an id or add one; if one is missing or wrong, say so in your report.
- docs/research.md §11 says who owns which file. Edit only your files. Read everything else. If you need a change in
  someone else's file (the lead's `src/lab.ts` included), put it in your final report; the lead or the owner makes it.
- The tests are the specification. `src/lab.test.ts`, `src/data/data.test.ts`, `src/three/*.test.ts` already describe the
  frozen worlds and are **red until the roles deliver**: a failure that belongs to another role's work is expected, re-run
  later. Never weaken or delete a test of someone else; add your own tests in your own test files.
- `src/three/dims.ts` is shared but sectioned: re-read the file right before each edit, change only the sections you own,
  only add names (never rename or retype a value another role uses), and give every constant a JSDoc with its provenance
  (`reported (S1 mm:ss)`, `derived (…)`, `estimate: <reasoning>`).
- Kit changes are the lead's: write a numbered entry in `docs/kit-requests.md` (append only: what, why, which labs).

## Content rules (BRIEF.md §5–7 still apply)

- Every text is bilingual `l(fr, en)` with the same level of detail; French typography (’, « », narrow spaces where the
  existing files use them); no placeholders; no emojis; no filler.
- Nothing is inferred: a numeric claim comes from `docs/research.md`, `docs/physics.md`, the model (`src/sim`) or `dims.ts`,
  and is tagged the same way as in `src/data/part-helpers.ts` (reported / derived / model result / calibrated / assumption /
  estimate). The generic 1" ram is not the Walton n°3; only the waste valve follows the video.
- The private transcript `docs/transcript.md` (git-ignored) may be read to check facts and find timestamps; never copy or
  closely paraphrase it, never quote it, never commit anything derived from its wording.
- Safety and law: rigid drive pipe, anchored ram, never a finger in the waste valve while it runs, spring water is not
  guaranteed potable, taking water is regulated (France: DDT, OFB). No "build it for real" dimensions beyond the source.

## Tools and tips

- Gates: `npm run typecheck && npm run format:check && npm test && npm run build`. Run `npx prettier --write <your files>`
  only on your own files. A failure in someone else's file is not yours.
- The dev server runs at http://localhost:5600/ (Vite, hot reload; `window.__lab` exposes `stage`, `store`, `engine`).
  Headless Chrome with puppeteer-core is the reliable way to look at the app (the built-in browser pane is not): the
  scripts in `/tmp/vrnode/` (`run-ram.mjs` every world × mode, `close.mjs` camera poses, `overview.mjs`) are examples; copy
  them to your scratchpad before changing them. Use `waitUntil: 'domcontentloaded'` and a fixed sleep of 8–10 s (the `load`
  event can stall on the Google Fonts request and `waitForFunction` can time out), expect a slow software renderer (a script
  may take 2–3 minutes: run it in the background and wait for its output rather than polling), wait for `stage.fly` to be
  falsy before a screenshot, and kill the browser at the end. To show a state: `store.set({ scene, mode, selected, explode,
cutaway, schematic, xray, isolate, step, panelOpen })`, `stage.frameParts(ids)`, `engine.applyPreset('valve-1')`.
- Check the result at 1280×800, 768×1024 and 390×844 when your work is visible, in French and in English (the language
  buttons are in the top bar).

## Final report (≤ 400 words, to the lead)

What you delivered (files, counts, tests), what you could not verify, every estimate or unknown that matters, every change
you need from someone else, kit requests added, what looks weakest, and anything the next roles (lessons, drawings,
reviewers) should reuse or avoid.
