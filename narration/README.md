# Narration script (French)

`fr.json` follows `lab-kit/docs/narration.md`: 49 segments (`intro`, 4 worlds, 44 parts: site 8, catchment 9, ram 13, valve 14), no lesson segments.
Check cost without spending anything: `node <lab-kit>/tools/narration/generate.mjs --src narration/fr.json --out /tmp/ram-audio --dry-run`.

## Budget

- **17 097 spoken characters** in total (cap 18 000; 30 000 is the owner's ceiling in `src/narration.test.ts`, so about 12 100 remain for retakes).
- intro 1 911, worlds 2 088 (site 578, catchment 591, ram 425, valve 494), parts 13 098 (site 2 155, catchment 2 311, ram 4 257, valve 4 375).
- Biggest parts (the nine "heroes", 327 to 450): waste-valve 450, delivery-valve 432, counterweight 425, snifter 395, valve-head 389,
  air-chamber 383, valve-stem 379, valve-seat 357, ram 327.
- Smallest: spring 197, spring-box 207, drive-gate-valve 231, overflow-pipe 237, house 249. Ordinary parts average 275.
- The suggested 230 to 300 per ordinary part held; the first draft (22 000) was cut by dropping repeated facts, not safety lines.

## Register

No person, channel, company, brand or institution is named in the script or its titles (credits live in the Sources panel): "la vidéo" for the
source video, "l'auteur" for who builds the valve, "le modèle" for the simulation. No name at all, not even the historical inventor of the
principle (the owner had him removed): `part-ram` says "Son principe date de la fin du dix-huitième siècle" and gives no year (the sources disagree).
A warm storyteller who addresses the listener ("vous", "on", "nous"; never "tu"): short sentences (one above 120 characters, so subtitles cut
cleanly), one image or one wonder per part, a question now and then, rare exclamations. The wonder is water that lifts water with no motor,
no electricity, no fuel, by stopping itself a hundred times a minute.
Most parts close on one concrete detail from the lab's own fields (`tip`, `maintenance`, `design`, specs).
Spoken text only: numbers and units in words (the repo test refuses digits and symbols), no codes (V1/V2/V3 are "la vanne d'arrivée / de vidange /
de sortie", sizes are "un pouce", "un demi-pouce"), no markdown.
Honesty:
- disclaimers are said ONCE (owner: "y'en a trop"): only the intro says it is an educational reconstruction, not an official plan, not a maker's
  product, that the ram is a generic one-inch ram, and that the figures come from the simulation except when the video is quoted; the drinkability
  warning is only in `part-house`; "dans le modèle" is kept once (`part-counterweight`, video against model). `src/narration.test.ts` enforces it;
- figures flagged "estimation", "hypothèse", "résultat du modèle", "calibré" are left out or said "environ" (the intro's sentence covers the rest);
- "la vidéo" is used only where the sheet says so (spring flow, tank emptying in ten hours, 500 litres a day, waste valve story, the head, stem, seat,
  guide and fins stories, "a metre of fall lifts water about ten metres");
- pieces the sheets say are not in the video (flanges, inlet valve, strainer, snifter, gauge, union, V2, V3, anchor block, catchment parts) are never
  said to be.
Safety and law lines (one short sentence each): spring water is not guaranteed drinkable (spring, house, site world, spring-box); fingers away from the
waste valve while it runs (waste-valve, valve-nipple); stop the ram and loosen the delivery union very slowly, a cloth around it, because the pipe empties through it (delivery-union); never throttle with the inlet
valve or the drive-pipe gate valve (inlet-valve, drive-gate-valve); a pit that cannot drain can drown the valve (waste-drain); never take off the
gauge under pressure. Water rights are not in the lab data, so none are mentioned.

## Cues (83 in total, all validated by `src/narration.test.ts` and a throwaway checker)

- Intro (23): `home`, `frame` on spring, drive-pipe, waste-valve, delivery-valve, air-chamber, delivery-pipe, water-tower, house; `scene` hops
  catchment, site, ram, valve, site; then `mode:sim`, `lessons`, `assembly`, `install`, `plans`, back to `mode:explore`, `scene:site`, `select:none`.
- Worlds (12, 13, 10, 9): `home`, one `frame` per element named, `flows` (site, catchment, ram), `cutaway` (catchment only), `explode` (valve only).
- Parts (8 only, 16 cues): `cutaway` on tank-shell, ram, air-chamber; `flows` on waste-valve, delivery-valve, snifter; `xray` on valve-seat;
  `explode` on valve-stem. Each is switched back off before the end.
- Totals by kind: home 10, frame 34, scene 6, mode 6, select 1, flows 12, cutaway 8, explode 4, xray 2.
- Spacing: camera cues (`scene`, `home`, `frame`, `select`) are at least 35 spoken characters apart (the smallest gap is 38); other cues may coincide.
- Only `frame` ids of the current world are used; `cutaway` never in the site world (`cutaway: false` in `lab.ts`); `xray` never in the site world.
- No `lab:` cue: `lab.ts` defines no `narration.onCue` hook.

## Checked

- Audio generated 2026-10-28 (`public/audio/fr`, 7.6 MB): 49 segments, 978.4 s (16 min 18 s), 83 cues. Credits spent: 17 899, 388 to redo `part-ram`
  without the inventor's name, then 8 347 to redo 20 segments after the disclaimers were cut. About 26 600 in all.
- Played in Chrome (dev server, headless): the intro's world hops, mode hops and closing state follow the voice; `cutaway` (air-chamber), `xray`
  (valve-seat), `explode` (valve-stem, scene valve) switch on at the start. **Known kit defect**: a cue placed at the very end of a segment is not
  applied when the audio ends, so the effect stays on (see `docs/kit-requests.md` 14); it needs a kit fix, not a new audio.
- Dry run: 49 segments, 17 097 characters, no segment rejected. `npx vitest run src/narration.test.ts`: 12 tests pass (ids, cues, camera spacing, disclaimers once, budget, no copy of the private transcript, manifest and audio files).
- Not checked in the browser: the visual result of `xray` on valve-seat, `explode` on valve-stem and `cutaway` on tank-shell, ram, air-chamber
  (they depend on the scene modules; no audio exists yet).

## Tone check against Pelton Lab (the reference, see ROADMAP.md principle D)

- Measured with `lab-kit/tools/narration/tone-stats.mjs` against Pelton's French script: average sentence 70 characters (Pelton 79), one sentence
  above 120 (Pelton 35), exclamations 0.73 per 1 000 characters (0.8), questions 0.34 (0.29), no "tu", no digit or symbol. The drop is followed
  through the intro, one image per part, a closing concrete detail, anonymous, honest.
- Second pass by the lead: twelve segments that read like a data sheet (flange, inlet valve, gauge, drain valve, outlet valve, gate valve, waste
  drain, base plate, sleeve, union, waste valve, world "ram") got a hook (a question, an image, an onomatopoeia) with the same facts; seven
  wonder beats ("!") were added where something is genuinely clever; the long sentences were split for the subtitles. The delivery-union
  lines no longer contradict each other. The first draft is not kept.

## Left out for budget

- Figures: the 18 ms closing time and the closing speed's tolerance, efficiencies (0.45 in the model, 0.6 in the manuals), the 22.7 L/min a
  one-inch ram needs, the drive pipe rule (at least five times the fall in the manuals against 2.7 in the video), the delivery pipe diameter, the
  cone half-angle, the 0.8-turn stroke window, the 1.5 mm stroke below which nothing is delivered, the tap pressure at the house, the tower volume.
- Maintenance notes (paint marks on nuts, bucket tests other than the waste drain's, frost draining of the cast body, grease on the gate valve).
- Details of the guides, lessons and drawings (the intro only says what each mode is for).

## Words the voice may stumble on

bélier (as in "coup de bélier"), reniflard, doigt de gant, taraudé, fraisé, mamelon, lumières (the slots), portée (the seat), inox,
filtre en Y, mandrin, foret, étau, d'équerre, colmate, quiz, "dix-huitième".

# English script

`en.json` has the same 49 segments as `fr.json` (identical `id`, `scope`, `scene`, order; the same cues with the same arguments at the matching point of
the sentence); `src/narration.test.ts` checks it. Titles are the lab's English names. Dry run:
`node <lab-kit>/tools/narration/generate.mjs --src narration/en.json --out /tmp/ram-audio-en --dry-run`.

- **16 482 spoken characters** (French 17 097): intro 1 794, worlds 2 080 (site 576, catchment 572, ram 430, valve 502), parts 12 608 (biggest waste-valve 478, delivery-valve 418, counterweight 416;
  smallest tank-lid 203, spring 206, drive-gate-valve 208). Measured with `tone-stats.mjs` against Pelton's English script:
  average sentence 67 characters (Pelton 69), one sentence above 120 (2), exclamations 0.79 per 1 000 characters (0.83), questions 0.36 (0.35).
- Register: an adaptation, not a translation. Same warm storyteller ("you", "let's"), short sentences, one image per part. British spelling and units
  (metres, litres, tonnes, spanner, "per cent"). Numbers in words, no symbol.
- Disclaimers are said once, as in French: the reconstruction notice, the generic one-inch ram and "unless I quote the video, the figures come from the
  simulation" only in the intro; the drinkability warning only in `part-house`; "in the model" only in `part-counterweight`. The test enforces it for both.
- The builder of the valve is "the builder" (French "l'auteur"); no name, no brand. The principle's history is "the late eighteenth century".
- Words the voice may stumble on: thermowell, snifter, rebar, spanner, tonnes, countersunk, "re-centres", "water hammer".
