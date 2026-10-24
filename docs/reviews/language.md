# Language review (French and English), wave 4, read-only

Reviewer: the language agent. Date: 2026-10-24. Question asked: does the whole lab read as if one careful native author had
written it, in both languages? Nothing in the repository was edited except this file. The private `docs/transcript.md` was not
opened: the video's own words used below are the three the brief gives (« clapet de choc », « doigt de gant », « bélier
Walton ») plus the part names recorded in `docs/research.md` §4.

**What I read.** `BRIEF.md` §5, `docs/wave3-rules.md`, every text file of the lab at commit b9e0f66 (`src/lab.ts`,
`src/i18n/ui.ts`, `src/panels/sim.ts`, `src/part-actions.ts`, `src/data/*.ts` with the 44 sheets, `src/drawings/**` for the 13
sheets, the hotspot labels of `src/three/**`), Pelton Lab's `src/i18n/ui.ts` and `src/lab.ts` for the series standard, the kit's
`i18n/strings.js`, `ui/dom.js` and `styles.css` (v0.1.6) to know how text is rendered. **How I checked.** A script extracted all
4,006 string literals with prose (1,644 French, 1,278 English, the rest short or mixed; about 383,000 characters) and ran
typography scans, term counts per language, FR/EN pair parity (numbers, sentence counts, bold markers, parentheses, length
ratio), sentence-length and paragraph-length measures. Everything flagged was then read in context. Line numbers are those of
the string's first line in the file.

**Reading guide.** §1 glossary (the terms the lab really uses, variants, decision). §2 conventions. §3 findings, most important
first (45 rows; mechanical fixes are grouped with their search pattern). §4 replacement texts that are too long for a table cell.
§5 appendices (A: English word-for-word fixes; B: the "monde / world" lines; C: source codes; D: the "regard" lines; E: the weight lines).
§6 verdict by file group. §7 what I could not check.

---

## 1. Glossary

"Count" is the number of strings (not words) that contain the term. FR and EN counts are separate. **Decision** is what the lab
should say everywhere; "keep" means the current usage is already one term.

| Concept | FR, decision | EN, decision | Variants found (count, where) | Action |
| --- | --- | --- | --- | --- |
| Hydraulic ram | bélier hydraulique, then « le bélier » | hydraulic ram, then "the ram" | none | keep |
| Waste valve | clapet de choc (90) | waste valve (90) | EN part name « Waste (impulse) valve (assembly) » `parts/ram.ts:415` | EN name becomes "Waste valve (assembly)" (F26) |
| Delivery check valve | name: clapet anti-retour de refoulement; prose: clapet de refoulement (33) | name and prose: delivery check valve (36) | FR bare « clapet anti-retour » 11 (lessons 4, d08 3, d07 2, valve 1, lab 1); EN bare "check valve" 13, "delivery valve" 1 (`seat-detail.ts:368`); 3D labels « Clapet anti-retour » / "Check valve" | prose uses the full forms; the bare forms stay only in the narrow labels of drawings and 3D tags (F09) |
| Air chamber | cloche à air (19), then cloche (87) | air chamber (21), then chamber (122) | none; "chamber" is also used for the spring box (`catchment.ts:30`) | keep; write "box" for the spring box |
| Snifter | reniflard | snifter (65); part name "Snifter valve" (3) | none | keep |
| Drive pipe, delivery pipe | conduite motrice (114), conduite de refoulement (33) | drive pipe (118), delivery pipe (37) | none | keep |
| Feed pipe (spring to tank) | conduite d'alimentation (10) | feed pipe (10) | in English ram literature "feed pipe" often means the drive pipe | keep; owner may prefer "spring pipe" (F45) |
| Buffer tank | réserve tampon (the role, 15), cuve (the vessel, 84), réserve (the stored water, 71) | buffer tank (16), then "the tank" (187) | strip and chips: « Réserve » / "Tank" | keep the rule: first mention in full, then the short form |
| Spring box | regard de captage (8), then « le regard » inside catchment context only | spring box (17), "box" (46) | « regard » also names the ram pit (22 lines) | keep (F05) |
| Ram pit | **fosse du bélier** | ram pit (47) | FR « Regard du bélier » (part name) and « le regard » (22 lines); « fosse » only 5 times | change FR (F05, appendix D) |
| Waste-water drain | évacuation des eaux de rejet | waste-water drain | `d11` « regards » = inspection chambers on the buried pipe, a correct third meaning | keep |
| Tank intake screen | crépine de départ (4) | intake screen (6), "screen" (44, several senses) | none | keep |
| Ram inlet strainer | **filtre en Y** (part name today: « Crépine ») | Y-strainer, "strainer" (21) | FR « la crépine » names two different parts (35 strings) | change FR (F21) |
| Valves | vanne d'arrivée (V1), vanne de vidange (V2), vanne de sortie (V3), vanne de départ (the tank's) | inlet valve (V1), drain valve (V2), outlet valve (V3), drive-pipe gate valve | EN bare "gate valve" (32) always means the tank's: say "drive-pipe gate valve" at first mention in each text | keep |
| Water hammer, surge | coup de bélier; surpression ρ·a·v | water hammer; surge | FR « vitesse du son du tuyau » (d08:421) for the wave speed | say « vitesse de l'onde » everywhere (F34) |
| Valve travel and one cycle | course (valve travel) and coup (one cycle) | **stroke** (valve travel) and "cycle" (one cycle) in any sentence that has both | EN "stroke" has both senses in 16 sentences, e.g. `lessons.ts:325` | F10 |
| Phase of the cycle | phase (UI); « en quatre temps » (idiom, titles) | phase; "four-phase cycle" | EN "four-beat cycle", "beat" for a phase (12) | F23 |
| Weight on the stem | **poids** | **weight**; the part name "Weight (rebar)" | FR contrepoids 18 / poids 93; EN counterweight 36 / weight 115 | F06 (supersedes the pairing « Poids / Counterweight » of `research.md` §4) |
| Seat of the waste valve | portée (89) | seat | FR « siège » for the same seat in 3 places (F22); « siège » stays for the check valve's seat | F22 |
| Valve head, stem, sleeves, fins | tête du clapet, tige, manchons de la tige, ailettes (écrou à ailettes) | valve head, stem, stem sleeves, fins (finned nut) | EN "rod" and "stem" both name the part; "fins nut" (3) | "stem" for the part, "threaded rod" for the stock (Appendix A) |
| Thermowell guide | doigt de gant (guide) | thermowell guide, "guide" | none; the video's word | keep |
| Nipple, ports, socket, reducer, sleeve | mamelon, lumières, manchon, réduction, manchon femelle-femelle | ported nipple, ports, socket, reducer, female-female sleeve | none | keep |
| Rebar | barre d'armature | a length of rebar | EN "rebar bar" (5) | Appendix A |
| Drive flow Q | label: **Consommation** Q; verb: prendre; technical: débit moteur | label: **Drive flow** Q; verb: take; prose may say "consumption" | FR: Eau prise (4), Prise du clapet, Prélèvement du clapet, Consomme, Débit moteur (4); EN: Water used (3), Water taken, "Draw of the valve", Uses, Drive flow (5) | F07 |
| Water thrown out by the valve | **eau rejetée** | **waste water**, "waste flow" | FR perdue (4), jetée (13), rejetée (16); EN lost (11), thrown out (7), wasted (6), waste water (12) | F08 |
| Delivered flow q | refoulé, eau refoulée | delivered, delivered water | EN « Daily output » (`ui.ts:127`) | F17 |
| Delivery head H, fall h | hauteur de refoulement H, chute h | delivery head H, fall h; "lift" allowed in plain prose | EN chips and labels « Lift H », « Lift / fall » | F25 |
| Efficiency | rendement d'Aubuisson, de Rankine; η | D'Aubuisson efficiency; Rankine efficiency | FR « rendement de D'Aubuisson » (2) | F12 |
| Low water, water-logged | étiage; cloche noyée | low water; water-logged chamber | none | keep |
| Item numbers on sheets | repère | item (mechanical sheets), tag (hydraulic sheets) | acceptable: the hydraulic sheets are diagrams | keep |
| The 3D scenes | vue (3D) | view | « monde » / "world" in about 15 visitor texts, and raw ids « (monde ram) », « (monde valve) » in `bom.ts:255` | F20 |

Checked against current usage: the French mechanics vocabulary (mamelon, manchon, lumières, portée, doigt de gant, platine,
massif d'ancrage, presse-étoupe, vanne à boisseau sphérique, vanne à opercule) and hydraulics vocabulary (captage, regard de
captage, étiage, exutoire, puisard, col de cygne, trou d'homme, hauteur de refoulement, coup de bélier, cloche à air, reniflard,
rendement d'Aubuisson) are correct and idiomatic. The English matches ram-pump usage (waste valve, drive pipe, delivery pipe,
snifter, air chamber, spring box, washout, delivery head, "stroke" for the valve travel) except where the findings say
otherwise. Unverified against the video: « conduite d'alimentation » for the spring-to-tank pipe (the owner knows the video's
word).

---

## 2. Conventions to adopt

**Language of the interface and of the texts**
- French addresses the reader with **vous**, never « tu » (checked: no « tu / ton / ta » anywhere). Guide titles are infinitives
  (« Souder le manchon… »), guide bodies, tips and warnings are imperatives (« Soudez… »), as they already are. « On » only for a
  general truth (« on use un manchon, pas la tige »).
- English guide titles and bodies are imperatives ("Weld the socket…"); the reader is "you" or understood.
- Lessons and tips keep one tone: friendly, short, no exclamation marks (none found).

**English spelling: British** (metres, litres, centre, galvanised, pressurised, moulded, fibre, kerb, spanner, torch,
"defence"). Fix the exceptions: toward (8) → towards, "Curb", "Adjustable wrench", "Wrenches for…", "Scale" (balance), "drill
press" (British: pillar drill) (F32).

**Quotation marks**: French « … » with non-breaking spaces inside; English “ … ” (already so). Apostrophe: ’ in both (the test
forbids the straight one in French; none found in English).

**French spacing (the lab has none today, see F02)**
- U+00A0 (non-breaking space) before « : », before « » », after « « », between a number and its unit (« 7,5 m », « 500 L/jour »,
  « 40 % », « 6,4 bar », « 20 mm »), between « n° » and the number (« n° 1 »), after « ≈ », « ± », « × » when a digit follows.
- U+202F (narrow non-breaking space) before « ; », « ! », « ? », and as the thousands separator (« 5 700 L »).
- Decimal comma; U+202F as thousands separator from 4 digits up, as the lab already writes it (« 1 000 g », « 5 700 L »).

**English numbers**: decimal point, comma thousands (5,700), U+00A0 between number and unit (7.5 m), "No. 1" for the valve
sizes, never "n°".

**Ranges.** French prose: « de 70 à 80 coups par minute », « 100 à 110 » (50 strings already use « à »); en dash only in chips, specs
and drawing labels (« 100–110 »). English: en dash (36 strings), "from 70 to 80" after "from".

**Units.** L, L/min, L/jour (French) and L/day (English) in labels; « par jour » / "a day" in sentences (57 EN already say
"a day / a minute"). bar after a number is invariable (« 6,4 bar », "6.4 bar"); the word takes a plural (« plusieurs bars »,
"several bars": F33). m³/jour, never « m³/j ». « Coups/min », "strokes/min" without spaces around the slash (`ui.ts:123` has
them). Ø with a space in texts (« Ø 25 mm »), without in drawings (« Ø25 », ISO).

**Capitalisation.** French sentence case for every title and label (already so). English sentence case (already so); drawings'
section headings in capitals with accents kept (already so).

**Abbreviations.** No full stop after unit symbols. « n° » for « numéro » (not « no » or « N° »). Labels short enough for the
readout grid (about 15 characters): spell out rather than abbreviate when it fits (F16).

**Internal vocabulary stays inside.** No « S1 … S9 », « K4 », « monde ram », "world", "model id" in text a visitor reads (F04, F20).

---

## 3. Findings, most important first (45 rows)

Priority: **P1** wrong or visible everywhere, fix before the owner reads; **P2** should be fixed; **P3** polish or owner's
call. "Who" uses the wave roles: *data* (parts, guides, `ui.ts`), *lessons*, *sim* (`src/panels/sim.ts`), *drawings*, *3d*
(`src/three/**`), *lead* (`lab.ts`, kit, docs). Text in « … » is French, in "…" English; `{name}` placeholders are untouched.
A cell that ends with **R-nn** continues in §4. Several fixes touch strings that tests pin (`parts-site.test.ts:419, 475, 596,
721`, `strings.test.ts`: readout labels ≤ 16 characters, alarms ≤ 34, scenarios and phases ≤ 24, no straight apostrophe in
French): none of the replacements below breaks them, but run `npm test` after each group.

| # | Pri | Where | Now, and the problem | Replacement | Who |
| --- | --- | --- | --- | --- | --- |
| F01 | P1 | `drawings/mechanical/general-arrangement.ts:183` (FR), `:184` (EN) | The French sentence says « seules les cotes **marquées** sont données par une source, les autres sont des estimations ». The sheet's own key (`draw.ts:222-226`, `bom.ts:304`) and the English say the opposite: unmarked = from a source, `*` = estimate, `†` = derived. A visitor reads the French sheet backwards. | FR: « Ce n'est pas le Walton n°3 de la vidéo : seules les cotes sans astérisque viennent d'une source, les autres sont des estimations (*) ou des dérivés (†). » EN: "This is not the video's Walton No. 3: only the dimensions without an asterisk come from a source, the others are estimates (*) or derived (†)." (still one sentence: the test wants 2 to 4 sentences per description) | drawings |
| F02 | P1 | every French string; `data/units.ts` `nFr`; `i18n/ui.ts` `num()`; kit `colon()` | **No non-breaking space anywhere** (0 U+00A0 and 0 U+202F in the lab's strings; the kit's strings and Pelton Lab's interface and data strings have none either, only Pelton's drawings code applies the rules, with the same `wrap()`): 689 « :», 212 « ;», 14 « ?», 38 « … » pairs, about 220 French and 200 English number+unit pairs, 150 « n°N ». In the 390 px panel a « ? », « : », « bar » or « m » can land alone at a line start. Two different thousands separators coexist: a plain space (`nFr`) and U+202F (`num()` via `toLocaleString`, `hydraulic/util.ts`). Only `mechanical/draw.ts wrap()` glues, and only for wrapped drawing notes. | One function applied once at the boundary, no source string edited: **R-02** (rules, code, test). Preferred home: a kit change in `tr()`, `tx()` and `colon()` (ready-to-paste kit request in R-02) so Pelton Lab and the next labs benefit. Fallback: `src/i18n/typo.ts` + `typoDeep()` called in `lab.ts` and before `registerStrings(LAB)`. `nFr` separator becomes `\u202f`. | lead (kit request, `lab.ts`), data (`units.ts`, `ui.ts`) |
| F03 | P1 | 148 occurrences in English text, 150 in French text (`n°`) | English uses the French « n° » (« Valve n°3: uses too much water », « the n°1 valve », « Walton n°3 »); French has no space after it. Seven labels use a bare « n°1 » as a noun (« Course du n°1 », "Stroke of the n°1"). | EN: `n°(\d)` → `No.\u00a0$1` ("Valve No. 3: uses too much water", "the No. 1 valve", "Walton No. 3"). FR: `n°(\d)` → `n°\u00a0$1` (« n° 1 »; done by F02 if R-02's rule is kept). Add the noun to the labels: « Course et poids du clapet n° 1 » / "Stroke and weight of valve No. 1" (`parts/ram.ts:454-455`), « Consommation du clapet n° 1 » / "Drive flow of valve No. 1" (`ram.ts:477-478`), « Masse pour le clapet n° 1 » / "Mass for valve No. 1" (`valve.ts:869`), « Course du clapet n° 1 » / "Stroke of valve No. 1" (`valve.ts:957`), `lessons.ts:303` (« Course utile du clapet n° 1 »), `:468` (« Rendement du clapet n° 1 »). 3D labels have none. | data, lessons, drawings, sim (`ui.ts`) |
| F04 | P1 | `i18n/ui.ts:283, 311-320`; about 100 strings in `drawings/**` (`d10-sizing` 33, `bom` 32, `d12-site-profile` 12, `d09` 8, `valve-parts` 8, `d08` 4, `seat-detail` 4, `d11` 2, `draw` 2, `valve-assembly` 2, `util.ts:94`) | The visitor reads « S4 », « S6 », « S1 03:54 », « K15 », « K4 », « K20 », « S9, TB5 »: the numbering of `docs/research.md`. The Sources panel does not number its sources and the legend of the sheets (`util.ts:94`) explains only "video S1, table S4". Pure jargon, and a promise the panel does not keep. | Replace each code by the source's name: appendix C (mapping and regexes), samples in **R-04**. Example: « Tableau S4 pour » → « Tableau NC State pour »; « vidéo S1, tableau S4 » → « vidéo, tableau NC State »; « (S1 03:54) » → « (vidéo 03:54) »; « (K4) » → remove or « (vidéo) ». | sim (`ui.ts`), drawings |
| F05 | P1 | French « regard » for **two** structures (and a third in `d11:450`): 22 pit lines, appendix D | « Regard du bélier » (the pit, `parts/site.ts:341`, `install.ts:178-215`, `ram.ts:920`, `d07`, `d11`, 3D label) and « regard de captage » (the spring box, the whole catchment sheet) share a word, and « le regard » alone means one or the other. The assembly guide already says « la fosse » for the pit (`assembly.ts:297, 306, 443`; `ram.ts:938, 998`). English keeps "ram pit" and "spring box" apart. | Pit: « **fosse du bélier** » everywhere; spring box: « regard de captage » (and « le regard » only inside the catchment sheet). Line list and phrases in appendix D, e.g. « Fosse du bélier » (name), « Installer la fosse et le bélier » (title), « Bâtissez la **fosse** autour du massif d'ancrage », « le fond de la fosse », « le drain de la fosse ». | data, drawings, 3d |
| F06 | P1 | 27 strings, appendix E | The same part is « Poids (barre d'armature) » / "Counterweight (rebar)" in the catalogue, « Poids » / "Weight" on the 3D tag, « Contrepoids » / "Counterweight" in the simulation panel, scenarios and charts, « CONTREPOIDS » on a sheet, and « le poids » / "the weight" in 93 + 115 other strings. « Poids plus lourd » / "Heavier weight" is tautological, which may be why the UI says "counterweight", but then the guide contradicts the UI. | One word: FR **poids**, EN **weight**. The control reads « Poids du clapet » / "Valve weight"; the scenario « Poids doublé » / "Doubled weight" (it is 2 × 360 g). Full line-by-line list in appendix E. Update the pairing in `research.md` §4 (« Poids / Counterweight »). Ids and sim keys stay `counterweight`. | data (`ui.ts`, `valve.ts`), lessons, drawings |
| F07 | P1 | `ui.ts:124, 162, 176, 188`; `d09-performance.ts:89`; `parts/site.ts:176-178, 229-233`; `lessons.ts:457-458` | The water the ram takes is « Eau prise Q », « Consommation Q », « Prise du clapet », « Prélèvement du clapet », « Débit moteur », « Consomme », and in English "Drive flow Q", "Water used Q", "Water taken, Q", "Draw of the valve", "Uses". Five names for one quantity; the same chart axis changes name between the panel and the sheet. | FR label **Consommation** Q, EN label **Drive flow** Q; prose: « prend / consomme », "takes" (consumption allowed). `ui.ts:124` → `['Consommation Q', 'Drive flow Q']`; `:188` → `['Consommation Q', 'Drive flow Q']`; `:162` EN → "Drive flow against the stroke (L/min)"; `:176` → `['Consommation selon le poids (L/min)', 'Drive flow against the weight (L/min)']`; `d09:89` → « Consommation Q (L/min) » / "Drive flow Q (L/min)"; `site.ts:176-178` → « Consommation du clapet n° 1 » / "Drive flow of valve No. 1"; `site.ts:229-233` → « Consommation du clapet n° 3 » / "Drive flow of valve No. 3" (and the n° 1 row below); `lessons.ts:457-458` → « selon une consommation qu'elle ne mesure pas » / "depending on a drive flow that it does not measure". | data, sim (`ui.ts`), drawings, lessons |
| F08 | P1 | `ui.ts:125`; `parts/ram.ts:123-124, 218-219, 481-482`; `valve.ts:971-972, 1019-1020`; `seat-detail.ts:307-308` | The water that leaves by the waste valve is « eau perdue » (4), « jetée » (13), « rejetée » (16); "lost" (11), "thrown out/away" (7), "wasted" (6), "waste water" (12). « Perdue » says loss, but the lesson's point is that this water does the work. | FR **eau rejetée**, EN **waste water** / "waste flow". `ui.ts:125` → `['Eau rejetée', 'Waste flow']`; `ram.ts:123-124` « la sortie de l'eau perdue » / "the exit for the lost water" → « la sortie de l'eau rejetée » / "the exit for the waste water" (same at 218-219); `ram.ts:481-482`, `valve.ts:971-972`, `seat-detail.ts:307-308` « L/min jetés » / "thrown away" → « L/min rejetés » / "L/min of waste water"; `valve.ts:1019-1020` EN "with less water lost" → "with less waste water". Keep « jetée » only in lesson 1's figure of speech (« c'est l'eau jetée en bas qui paie la note »). | data, sim, drawings |
| F09 | P1 | prose lines `lessons.ts:213-214, 393-394, 406-407`; `d07:545-546`; `d08:44-45, 451-452, 560-561`; `seat-detail.ts:368`; 3D labels `ram/scene.ts` | The same part is « clapet anti-retour de refoulement » (name), « clapet de refoulement » (33), « clapet anti-retour » (11) and, in English, "delivery check valve" (36), "check valve" (13), "delivery valve" (1). Bare forms are fine in a title, a legend or a 3D tag (narrow) but not in explanatory prose, where the reader has two valves in mind. The bare « clapet anti-retour » of `chapters.ts:35` and `valve.ts:612` is a different object (the failed trial) and stays. | Prose: FR « clapet de refoulement » (first mention in a text: « clapet anti-retour de refoulement »), EN "delivery check valve". Example `lessons.ts:213-214`: « La surpression soulève le **clapet de refoulement** pendant… » / "The surge lifts the **delivery check valve** for…". `seat-detail.ts:368` EN "delivery valve" → "delivery check valve". 3D tag: « Clapet de refoulement » / "Delivery valve" instead of « Clapet anti-retour » / "Check valve". | lessons, drawings, 3d |
| F10 | P1 | `lessons.ts:285, 325` (EN); every "stroke" | In English "stroke" names both the **travel of the valve** ("stroke nut", "a 2.2 mm stroke") and **one cycle of the ram** ("100 strokes/min", "at every stroke"); 16 sentences use both. `lessons.ts:325`: "A shorter stroke lets less water escape at each stroke" is unreadable. French is unambiguous (course / coup). | Keep "stroke" for the valve travel and keep the established "strokes/min", "stroke rate" labels (304 uses); in any sentence that also speaks of the travel, say "cycle". `:285` → "…the longer it is, the more water escapes in each cycle." `:325` → "A shorter stroke lets less water escape in each cycle, so the ram takes less; you turn by fractions of a turn, since the working range is less than one turn, then tighten the lock nut again. A heavier weight would make it take more ({q155} L/min in the model), and the gate valve stays fully open while running: it does not set the flow." Same care in `valve.ts:864`, `assembly.ts:252`. | lessons, data |
| F11 | P1 | `ui.ts:336` | « **Toute** l'air de la cloche disparaît » ("air" is masculine). The only agreement error found by script and by reading. | « **Tout** l'air de la cloche disparaît : les coups deviennent plus durs et le refoulé baisse. » | data (`ui.ts`) |
| F12 | P1 | `lessons.ts:457, 489` (FR) | « Le rendement de **D'Aubuisson** », « son rendement de D'Aubuisson » : mid-sentence the name takes a lower-case particle (the Sources panel and `d07:448` already write « d'Aubuisson »). | « Le rendement **d'Aubuisson** compare l'énergie montée (q·H) à celle de toute l'eau prise à la source (Q·h) ; celui de **Rankine**… » and « Quel est son rendement d'Aubuisson ? ». | lessons |
| F13 | P1 | `d08-cycle.ts:522-523`, `:589-590` | Two cross-references name something that does not exist: « voir le scénario « tuyau plastique » » / "see the “plastic pipe” scenario" (the scenario is « Conduite en PVC » / "PVC drive pipe", `ui.ts:50`) and « écran « cycle pas à pas » » / "the “cycle step by step” panel" (the section is « Le cycle, pas à pas » / "The cycle, step by step", `ui.ts:212`). | FR « voir le scénario « Conduite en PVC » » / EN "see the “PVC drive pipe” scenario"; FR « (section « Le cycle, pas à pas ») » / EN "(the “The cycle, step by step” section)". | drawings |
| F14 | P1 | `parts/ram.ts:874-875` | Outlet valve sheet: « le manomètre monte au-delà de ses **6,5** bar habituels » / "above its usual **6.5** bar". Every other line says the gauge reads 6.4 bar (65 m, `DERIVED.deliveryBar`); 6.5 is the body peak (`MODEL.peakBar`). Number to confirm with the owner of the figures, then make it a placeholder like its neighbours. | « …au-delà de ses {fr(DERIVED.deliveryBar, 1)} bar habituels… » / "…above its usual {en(DERIVED.deliveryBar, 1)} bar…" | data |
| F15 | P1 | `lab.ts:149-150` (landing, commit b9e0f66) | Better than the first version (it now counts plans, lessons and parts). Three words still mislead: « rayons X » (the toolbar says « Transparence »; English is right); « quatre mondes en 3D » / "four 3D worlds" (jargon, F20); the toolbar order is Éclaté, Transparence, Coupe, Flux. « Sur cette page » describes an application. | **R-15** (both paragraphs, `${…}` kept). | lead |
| F16 | P2 | `i18n/ui.ts:127, 130-131, 133, 136, 138, 236-242` | Readout labels are short enough (all ≤ 16; none truncates at about 15) but abbreviated beyond understanding: « V. fermeture » / "Close speed" (reads like an instruction), « V. requise » / "Min. speed", "Body press." vs "Body P." (same quantity, two forms), « Air cloche », « Clap. choc » / "Waste v.", « Anti-retour » / "Check v.", « Vers cloche » / "Inflow", « Écoulé » / "Elapsed" (elapsed what?), "Rate". | `liveClosing` → `['Vit. fermeture', 'Closing speed']`; `liveClosingMin` → `['Vit. minimale', 'Speed needed']`; `liveBody` → `['P. du corps', 'Body P.']`; `liveAir` → `['Air (cloche)', 'Chamber air']`; `liveRate` → `['Cadence', 'Stroke rate']`; `cardValve` → `['Clapet de choc', 'Waste valve']`; `cardCheck` → `['Clapet refoul.', 'Delivery valve']`; `cardSpeed` → `['Vitesse eau', 'Water speed']`; `cardJet` → `['Jet du clapet', 'Waste jet']`; `cardInto` → `['Vers la cloche', 'Into chamber']`; `cardInPhase` → `['Temps écoulé', 'Elapsed time']`. All ≤ 15 characters. Strip alarm: `alarmLabel` adds the figure, so « Conduite motrice courte (L/h = 2,7) » is 35 characters in a chip that shows alone at 390 px: `alarm_pipeShort` → `['Conduite trop courte', 'Drive pipe too short']` (32 with its figure; the EN change is also in F18). Scenario and phase chips wrap, so their 33-character labels are fine. | data (`ui.ts`) |
| F17 | P2 | `ui.ts:102, 127, 148, 169, 279`; `parts/site.ts:227`, `catchment.ts:291`; `valve.ts:907`; `ram.ts:342-343` | Pairs that do not say the same or say it badly: `chartScope` FR « Dernier coup » vs EN "Last strokes"; `chartTankHint` « Dernières 48 h simulées » (English word order); `liveDeliveredDay` « Refoulé/jour » vs "Daily output" (everything else is "delivered"); « Vidée en » (not French) / "Emptied in"; button `sizeLoad` « Valeurs du site » / "Site values" is a noun between two verb buttons; « Poids moitié moindre » (literary); EN "Drive pipe inner Ø"; EN "Rate to recover". | `chartScope` → « Derniers coups : pression du corps (bar) »; `chartTankHint` → « Les 48 dernières heures simulées. Quand la courbe touche zéro, le bélier s'arrête. »; `liveDeliveredDay` → `['Refoulé/jour', 'Delivered/day']`; `site.ts:227`, `catchment.ts:291` → « Temps pour la vider » / "Time to empty"; `sizeLoad` → `['Reprendre le site simulé', 'Use the simulated site']`; `valve.ts:907` → « Poids divisé par deux (à 2,2 mm de course) »; `ui.ts:102` EN → "Drive pipe inner diameter"; `ram.ts:343` EN → "Target rate (valve No. 1)". | data (`ui.ts`, sheets) |
| F18 | P2 | `ui.ts:76-79, 158-161, 202, 206, 286-293, 298-301, 352-355` (EN) | English UI that reads as translated: "Enough spring:", "Not enough spring:", "No size of the table fits", "A simulation only:", "Drive pipe short", "Pipe too soft" (a pipe is "flexible"), "…with the settings of the video… your present setting". | `sizeVerdictOk` EN → "The spring is enough: {src} L/min against the {min} L/min that a {pipe} drive pipe asks for."; `sizeVerdictShort` EN → "The spring is too small: {src} L/min against the {min} L/min that a {pipe} drive pipe asks for ({pct}%)."; `sizeTipNone` EN → "None of the sizes in the table fits: the spring gives less than the {min} L/min of the smallest. As in the video, the valve has to be tuned to use less than the spring gives (the “Valve No. 1” preset)."; `actHoldTitle` EN → "Simulation only: never put a finger in the valve of a running ram. With the valve held shut the column stops, and the ram with it."; `alarm_pipeShort` EN → "Drive pipe too short"; `alarm_softPipe` EN → "Pipe too flexible" (and "Pipe too flexible:" at the start of `statusSoftPipe` EN); `chartHeadHint` EN → "The three valves with the video's settings, for the site above. The dot is your current setting." | data (`ui.ts`) |
| F19 | P2 | `ui.ts:392`; `lab.ts:60-67, 119` | The panel titled « Chapitres de la vidéo » / "Video chapters" lists the lab's **own** summary (`chapters.ts:1-3` says the video's chapter list could not be read). « Wikipedia » is spelled English in the French panel. The English reader meets a French title in « » with no hint that the video is in French. | `chapters` → `['Sommaire de la vidéo', 'Video outline']`; `lab.ts:119` → `fr ? 'Wikipédia' : 'Wikipedia'`; **R-19** for the main-source line. | lead, data |
| F20 | P2 | 10 pairs, listed in appendix B (`parts/site.ts:156, 160, 213, 217`, `ram.ts:421, 441`, `catchment.ts:449`, `assembly.ts:463`, `lab.ts:149`, `drawings/mechanical/bom.ts:255`) | « monde » / "world" (internal word of the kit), and raw ids in a visible subtitle: « (monde ram) », « (monde valve) ». A visitor sees buttons « Le site / Le captage / Le bélier / Le clapet ». | « vue » / "view", without quoting the button: « Détail dans la vue du captage. » / "Detail in the catchment view."; « ouvrez la vue du captage pour le regard, le filtre à gravier et la conduite d'alimentation » / "open the catchment view for the spring box, the gravel filter and the feed pipe"; « s'ouvrent dans la vue du clapet (bouton en bas de cette fiche) » / "open in the valve view (button at the bottom of this sheet)"; `bom.ts:255-256` → « {total} repères · bélier générique de 1″ et clapet de choc de la vidéo » / "{total} items · generic 1″ ram and the video's waste valve". | data, drawings, lead |
| F21 | P2 | French « crépine » for two parts: `assembly.ts:338, 340, 497`; `parts/ram.ts:228, 232, 315, 334, 364, 370, 375, 576`; `d07:499`; `general-arrangement.ts:183`; 3D label `ram/scene.ts` | « La crépine » is the basket in the tank (« crépine de départ ») and the Y filter at the ram's inlet (« Crépine »); English separates "intake screen" and "strainer". `ram.ts:370` has to say « la deuxième ligne de défense, la première étant la crépine de départ ». | Ram: **filtre en Y** (name « Filtre en Y », EN "Y-strainer"); tank: « crépine de départ ». `assembly.ts:338` (title) « Monter la vanne d'arrivée, le filtre en Y et la bride »; `:340` « …puis le **filtre en Y** sur V1, puis la **bride d'arrivée** de la conduite motrice sur le filtre… » (the English is already "Y-strainer"); `ram.ts:370` « Le filtre en Y est placé sur la conduite motrice… : c'est la deuxième ligne de défense, la première étant la crépine de départ de la réserve. » | data, drawings, 3d |
| F22 | P2 | `lessons.ts:205, 284`; `d08-cycle.ts:36` | « Siège » for the seat of the **waste** valve; everywhere else (89 strings) it is « portée », and « siège » is kept for the delivery check valve. | « …plus elle pousse le clapet vers sa **portée** » (`:205`); « l'écart entre la tête du clapet et sa **portée** quand il est ouvert » (`:284`); « …entraîne le clapet qui claque sur sa **portée** » (`d08:36`). | lessons, drawings |
| F23 | P2 | `lessons.ts:198, 221-222`; `d08-cycle.ts:558-561, 568` | The UI calls the four steps **phases** (« Phase suivante », "Next phase"); French prose says « chaque temps », « avance d'un temps »; English says "four-beat cycle", "each beat". "Beat" also means the regular knock. | English: "four-**phase** cycle" (`lessons.ts:198`, `d08:558, 568`); "To see each **phase**, switch to the **Simulation** mode… the “Next phase” button moves on one **phase**" (`:222`); "…the position of the waste valve and of the check valve in each **phase**… with the four **phases** marked on the time axis" (`d08:561`). French: « Pour voir chaque **phase**, passez en mode… le bouton « Phase suivante » avance d'une **phase** » (`:221`); « à chaque **phase** », « les quatre **phases** » (`d08:560`). The titles « en quatre temps » stay (idiom). | lessons, drawings |
| F24 | P2 | `parts/ram.ts:938-939, 983-994, 1002-1007`; `valve.ts:771-777, 1033-1034, 1055-1057`; `assembly.ts:272-273` | « Chocs par minute / par jour » and "Shocks per minute / a day" count the same thing as « coups » / "strokes" elsewhere (162 + 304); « choc » is the physical shock. | « Coups par minute », « Coups par jour », « Coups du poids par jour » (`valve.ts:771`); "Strokes per minute", "Strokes per day", "Weight impacts per day"; "…{en(DERIVED.strokesPerDay)} strokes a day in the model". | data |
| F25 | P2 | `lessons.ts:153`; `install.ts:29`; `parts/site.ts:454-455`; `d09:277`; `d12:449` | The height H is « Hauteur de refoulement H » / "Delivery head H" in the panel but "Lift H" (chip), "The **lift**" (install), "Lift / fall", "Head: H/h". | Label H the same way: EN "Delivery head H (video)" (chip), "Delivery head / fall", "Delivery head: H/h =" ; FR « Hauteur de refoulement H (vidéo) », « Hauteur de refoulement / chute ». In running prose "lift" stays. `install.ts:29` EN: "The **delivery head** (the lift): the height difference between the ram and the arrival point…". | lessons, data, drawings |
| F26 | P2 | `parts/ram.ts:415`; `site.ts:543`; `three/ram/scene.ts`, `three/site/scene.ts` | Part names written three times (sheet, 3D tag, drawing) differ: EN « Waste (impulse) valve (assembly) » (nowhere else is it "impulse"); « Habitation » (the text always says « la maison »); 3D « Corps en fonte » / "Cast body" vs sheet « Corps du bélier » / "Ram body"; « Regard du bélier » (F05); "Check valve" (F09). Also `site.ts:364` "Curb above the ground" is American (`catchment.ts:44` says "Rim above the ground"). | `ram.ts:415` EN → "Waste valve (assembly)"; `site.ts:543` FR « Maison »; 3D `ram`: « Corps du bélier » / "Ram body"; `site.ts:364` EN → "Rim above the ground". | data, 3d |
| F27 | P2 | `maintenance` of the 44 sheets (`parts/*.ts`) | Every maintenance tab is one paragraph of 290 to 810 characters (mean 570) carrying three sub-headings inline. The kit renders `maintenance` with `paragraphs()`, so a blank line makes a paragraph. English calls the third sub-heading "Upkeep" while the tab is « Entretien » / "Maintenance". | Search FR: ` **À vérifier.**` → `\n\n**À vérifier.**` and ` **Entretien.**` → `\n\n**Entretien.**`; EN: ` **How to check.**` → `\n\n**How to check.**` and ` **Upkeep.**` → `\n\n**Maintenance.**` (inside the single-quoted or template strings, `\n\n` is the two-character escape). 44 sheets × 2 languages; check `parts-*.test.ts` regexes on `maintenance`. | data |
| F28 | P2 | `install.ts:266-267` (step "first-start", 1,307 FR / 1,201 EN characters, one paragraph) | The longest paragraph of the lab: about 45 lines at 390 px. | Three paragraphs, same facts and placeholders: **R-28**. | data |
| F29 | P2 | `install.ts:277-278` (tip of the same step) | One sentence of 98 words (FR) / 79 (EN) holding a six-point checklist. | Numbered bold lead-ins in the same tip (a tip renders `rich()` only, no paragraphs): **R-29**. | data |
| F30 | P2 | `parts/catchment.ts:29-30` (spring box description) | One sentence of 66 words inside a 1,100-character paragraph. | Three paragraphs: **R-30**. | data |
| F31 | P2 | long sentences, 76 over 48 words; worst: `lessons.ts:520-521` (68/63), `assembly.ts:487-488` (59/56), `catchment.ts:263-264` (62/55), `install.ts:28-29` (1,109 chars), `install.ts:58-59` (54), `valve.ts:863-864` (55) | Too long for a 390 px panel. | Cut at the colon or the semicolon; worked example `lessons.ts:520-521` in **R-31**. For `install.ts:28-29` cut before « La vidéo donne une règle approximative » and before « C'est le débit qui choisit le bélier » (three paragraphs; `text` renders `paragraphs()`). | lessons, data |
| F32 | P2 | EN tool lists and spelling | The English is British (metres, litres, centre, galvanised, spanner, torch, vice) with American strays: "toward" (8 vs "towards" 6), "Curb", "Adjustable wrench", "Wrenches for fittings / airtight fittings" (`install.ts:115, 161`), "Scale" for a balance (`assembly.ts:238`, `ram.ts:744` "Scale" is a gauge dial: fine), "drill press" (12; British: "pillar drill"). | "towards"; "Rim"; "Adjustable spanner" (`assembly.ts:101`); "Spanners for fittings, sealing paste or tape" (`install.ts:115`); "Spanners for airtight fittings" (`install.ts:161`); "Scales" (`assembly.ts:238`); keep "Pipe wrench". "Drill press" is understood: owner's call. | data, lessons |
| F33 | P2 | `assembly.ts:478, 502`; `install.ts:156, 170, 282`; `d07:589`; `ui.ts:386` | "several bar" / "a few bar" : the unit after a number is invariable, the word is not (French already writes « plusieurs bars »). | "several bars" (7 strings). | data, drawings |
| F34 | P2 | drawings (FR) | Phrases that sound translated or wrong: « vitesse du son du tuyau d'acier » (`d08:421`) for the wave speed; « à l'échelle vraie » (`d12:265`); « Hauteur de refoulement, en fois la chute » (`d10:246`, `:231`); « règle ≤ ~12 » (`d10:252`, `d12:413`); « le simulateur allume une alerte » (`install.ts:155`); « Plan d'ensemble… vue de dessus » fine. | « vitesse de l'onde dans le tuyau d'acier »; « à l'échelle réelle (sans exagération) »; « Hauteur de refoulement, en multiples de la chute : H/h » and « Longueur de la conduite motrice, en multiples de la chute : L/h »; « règle : H/h ≤ 12 environ » / EN "rule: H/h ≤ 12 or so"; « le simulateur déclenche une alerte ». | drawings, data |
| F35 | P2 | drawings (EN) | Translated phrasing: "Smallest velocity that is enough" (`d08:486`), "AGAINST THE RULES" (`d12:388`), "in copper chain lines" (`valve-assembly.ts:354`; the kit says "dash-dot"), "Slope of the reach" (`d12:223`), "half angle" (`seat-detail.ts:386`, `valve-parts.ts:132`; the sheets say "half-angle"), "Delivery against the head H". | "Minimum velocity needed: v = g·(H − h)/a"; "THE RATIOS L/h AND H/h COMPARED WITH THE RULES"; "in copper dash-dot lines"; "Slope of the section"; "half-angle"; "Delivery against H". | drawings |
| F36 | P2 | `seat-detail.ts:49, 160, 181`; `valve-assembly.ts:60, 286-287, 309-310` | « pose fermée / ouverte » and "closed pose / open pose" are calques (the French word means the act of fitting; the English word means a body posture). | « position fermée / position ouverte », "closed / open position". `seat-detail.ts:49`: « Portée et tête à 10:1, position fermée et position ouverte · réglage de la course au dixième de tour » / "Seat and head at 10:1, closed and open · setting the stroke to a tenth of a turn". `valve-assembly.ts:60`: « Position fermée · course {nFr(S, 1)} mm · poids {WEIGHT} g · clapet n°1 » / "Closed position · {nEn(S, 1)} mm stroke · {WEIGHT} g weight · valve No. 1". | drawings |
| F37 | P2 | about 40 English strings, appendix A | Gallicisms and slips: "emergence" (the spring's eye), "hinder", "gesture", "betrays", "axle" (8), "tired", "stocked", "member", "asked too much", "seal dead", "rebar bar" (5), "absorbent paper" (7), "fins nut", "Oxfam wants", "the pivot of the story", "the real tap on the consumption". | Word-for-word table with file and line: appendix A. | data, lessons, drawings |
| F38 | P2 | FR/EN ranges | French mixes « 100 à 110 » (50 strings) and « 100–110 » (21) in sentences; English mixes "100–110" (36) and "100 to 110" (30, mostly after "from"). | Rule in §2: French prose « à », en dash only in chips, specs, labels; English en dash, "to" after "from". `lessons.ts:217` FR « la vidéo en donne 100–110 » → « la vidéo en donne 100 à 110 ». | lessons, data |
| F39 | P2 | `ui.ts:123`; `d10-sizing.ts:71` | « Coups / min » / "Strokes / min" with spaces round the slash (the unit line says `coups/min`); « m³/j » next to « m³/jour ». | `liveStrokes` → `['Coups/min', 'Strokes/min']`; `d10:71` FR « m³/jour ». | data, drawings |
| F40 | P3 | `ui.ts:7`, `public/lab.json` | « Pomper l'eau sans électricité ni carburant » is accurate; a ram lifts rather than pumps, and the English can say where. Owner's call (hub text). | « Remonter l'eau sans électricité ni carburant » / "Lifting water uphill with no electricity or fuel". Change `lab.json` with it. | lead |
| F41 | P3 | `README.md` | Still the scaffold: « d'abord », « Lire `BRIEF.md` d'abord, puis remplir `docs/research.md` » (straight apostrophes, instructions for the team). Outside the texts I was asked to review. | Rewrite from the landing text before launch. | lead |
| F42 | P3 | `ui.ts:62-83, 247-262` | Comma splices in status lines: « Arrêté : le clapet de choc reste fermé, le recul est trop faible… », « …stoppée net, c'est le coup de bélier » (`descClose`), "Stopped: …, the recoil is too weak…". | Use a colon or a semicolon: « Arrêté : le clapet de choc reste fermé ; le recul est trop faible pour le rouvrir… »; « …est stoppée net : c'est le coup de bélier » / "…is stopped dead: that is the water hammer". | data (`ui.ts`) |
| F43 | P3 | `ui.ts:384-387` (`safety`) | The red callout opens with a list that has no verb: « …: conduite motrice rigide (acier, fonte), bélier ancré, manomètre côté refoulement, et jamais un doigt… ». | « …mais ses coups atteignent plusieurs bars. Prévoyez une conduite motrice rigide (acier, fonte), un bélier ancré et un manomètre côté refoulement, et ne mettez jamais un doigt dans le clapet de choc quand il tourne. » / "…but its strokes reach several bars. Use a rigid drive pipe (steel, cast iron), an anchored ram and a pressure gauge on the delivery side, and never put a finger in the waste valve while it runs." | data (`ui.ts`) |
| F44 | P3 | chart titles | « selon la hauteur / la course » and "against the stroke" are acceptable (British "plotted against"), a little terse. | « en fonction de » / "versus" if the owner wants less terse titles; no change required. | owner |
| F45 | P3 | `catchment.ts` "Feed pipe" / « Conduite d'alimentation » | In ram-pump English "feed pipe" often means the **drive** pipe. | If the video's own word for the spring-to-tank pipe is not « alimentation », use « conduite de captage » / "spring pipe". Owner knows the video. | owner |

---

## 4. Replacement texts too long for a table cell

### R-02. French spacing, one function, applied once (F02)

**Rules** (the same four that `mechanical/draw.ts wrap()` already applies to wrapped drawing notes, plus the thousands
separator, `n°` and the signs): U+00A0 before « : » and « » », after « « », between a number and its unit, after `n°`, after
`≈ ± ≤ ≥ × → =` when a digit or letter follows; U+202F before « ; ! ? » and inside a number from 4 digits (« 5 700 », « 1 000 »).
The number test must also accept `}` as the end of a number, so that templates such as `'{v} m/s'` (filled later by `tf()`) are
covered. English: only number + unit, `No.` + number and the signs.

```ts
// src/i18n/typo.ts (new): the spacing rules, kept out of the 2,900 strings
const NBSP = '\u00a0'; // fixed space
const NNBSP = '\u202f'; // narrow fixed space

export function frTypo(s: string): string {
  return s
    .replace(/(\d) (?=\d{3}(?!\d))/g, `$1${NNBSP}`) // thousands: 5 700
    .replace(/([\d}]) (?=[A-Za-zΩµ°%€×])/g, `$1${NBSP}`) // number and unit: 7,5 m, 40 %, 6,4 bar
    .replace(/\bn° ?(?=[\d{])/g, `n°${NBSP}`) // n° 1
    .replace(/ ([;!?])/g, `${NNBSP}$1`) // before ; ! ?
    .replace(/ ([:»])/g, `${NBSP}$1`) // before : and »
    .replace(/« /g, `«${NBSP}`) // after «
    .replace(/([≈±≤≥×→=<>]) (?=[\dA-Za-z{])/g, `$1${NBSP}`); // after a sign
}

export function enTypo(s: string): string {
  return s
    .replace(/([\d}]) (?=[A-Za-zΩµ°%€×])/g, `$1${NBSP}`)
    .replace(/\bNo\. (?=[\d{])/g, `No.${NBSP}`)
    .replace(/([≈±≤≥×→=<>]) (?=[\dA-Za-z{])/g, `$1${NBSP}`);
}

/** Apply to every {fr, en} pair of a data structure (PARTS, LESSONS, ASSEMBLY, INSTALL, CHAPTERS). */
export function typoDeep<T>(v: T): T {
  if (Array.isArray(v)) return v.map(typoDeep) as unknown as T;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (typeof o.fr === 'string' && typeof o.en === 'string') return { ...o, fr: frTypo(o.fr), en: enTypo(o.en) } as T;
    return Object.fromEntries(Object.entries(o).map(([k, x]) => [k, typoDeep(x)])) as T;
  }
  return v;
}
```

Where: in `src/i18n/ui.ts`, `registerStrings(Object.fromEntries(Object.entries(LAB).map(([k, [fr, en]]) => [k, [frTypo(fr), enTypo(en)]])))`
and a local `colon()` returning `'\u00a0: '` in French; in `lab.ts`, wrap `PARTS`, `ASSEMBLY`, `INSTALL`, `LESSONS`, `CHAPTERS`
with `typoDeep`; in `data/units.ts` make `nFr` group with `\u202f`. `lessons.test.ts` compares text with numbers: run the tests
once with the wrapper on the data (they read the raw exports, so they should not move). Test to add: for every French string
of `UI_STRINGS`, no ` :`, ` ;`, ` ?`, ` !`, no `\d [A-Za-z%°]` with a plain space. Caution: the sheets' `wrap()` already
glues; applying the function twice changes nothing (idempotent).

**Kit request, ready to paste in `docs/kit-requests.md` (append only):**
> ## N. French spacing in `tr()`, `tx()` and `colon()`
> The kit writes « Exact ! », « Pas tout à fait. » and `colon()` = `' : '` with plain spaces, and every lab's French strings
> inherit the problem (the ram lab's strings and Pelton Lab's interface strings have 0 non-breaking spaces; a « ? », « : », « bar » ends up alone at the start
> of a line in the 390 px panel). **What**: when the language is `fr`, `tr()` and `tx()` (and `colon()`) apply the rules of
> `frTypo()`: U+00A0 before « : » and « » », after « « », between a number and its unit; U+202F before « ; ! ? » and as thousands
> separator; same function reused by the SVG `wrap()` of the drawings. **Why**: one fix for all labs, no change in any lab's
> strings. **Needed by**: ram pump lab; Pelton Lab and every future French text.

### R-04. Source codes replaced by names (F04), the visible samples

- `ui.ts:283` `sizeTable` → `['Tableau NC State pour', 'NC State table for']`
- `ui.ts:310-313` `sizeWarnLengthShort`: « L/h = {r} : conduite plus courte que 3 fois la chute (Wikipédia), coups trop rapides et rendement plus faible. Visez au moins {min} m (5 × h, NC State). » / "L/h = {r}: pipe shorter than 3 times the fall (Wikipedia), strokes too fast and a lower efficiency. Aim for at least {min} m (5 × h, NC State)."
- `ui.ts:314-317` `sizeWarnLengthS4`: « L/h = {r} : sous les 5 fois la chute que demande NC State ({min} m), mais dans l'usage courant (3 à 7 fois, Wikipédia). » / "L/h = {r}: under the 5 times the fall that NC State asks for ({min} m), but within common practice (3 to 7 times, Wikipedia)."
- `ui.ts:318-321` `sizeNote`: « Ordres de grandeur de NC State (tableau 2 : les conditions du tableau ne sont pas précisées) et de Wikipédia : ce n'est pas un plan de réalisation. Le refoulé est q = η·Q·h/H. La simulation modélise un bélier de 1″. » / "Orders of magnitude from NC State (table 2: the conditions of the table are not stated) and Wikipedia: this is not a build plan. The delivery is q = η·Q·h/H. The simulation models a 1″ ram."
- `hydraulic/util.ts:94`: « rapporté (vidéo, tableau NC State) » / "reported (video, NC State table)"
- `d08-cycle.ts:340-341`: « vitesse minimale de fermeture 0,5–0,65 m/s (dérivé de la vidéo) » / "minimum closing velocity 0.5–0.65 m/s (derived from the video)"; `:493-494`: « (vidéo : 0,5–0,65 m/s) » / "(video: 0.5–0.65 m/s)"
- `d13-catchment.ts:694-695`: « …d'après la pratique courante de protection d'une source (Oxfam, fiche technique TB5) et d'une petite réserve (Practical Action). » / "…follow the common practice of protecting a spring (Oxfam, technical brief TB5) and of a small tank (Practical Action)."
- the rest by the regexes of appendix C.

### R-15. Landing text (F15), `lab.ts:149-150`, `${…}` expressions kept

FR: `Un **bélier hydraulique** remonte l’eau d’une source jusqu’à une maison ou un potager situés bien plus haut, **sans électricité, sans carburant et sans moteur** : l’énergie vient de la chute de l’eau elle-même. Ici, l’installation d’une ferme : 7,5 m de chute, 65 m de dénivelé à remonter, environ 500 L d’eau par jour.\n\nDans ce labo : quatre vues 3D (le **site**, le **captage**, le **bélier** et son **clapet de choc**, avec éclaté, transparence, coupe et flux), le **montage** et l’**installation** pas à pas, la **simulation** (réglages, scénarios, cycle au ralenti, dimensionnement), ${SHEETS.length} **plans** A3, ${LESSONS.length} **leçons** avec quiz, le **catalogue** de ${PARTS.length} pièces et les **sources**.`

EN: `A **hydraulic ram** lifts spring water to a house or a vegetable garden much higher up, **with no electricity, no fuel and no motor**: the energy comes from the falling water itself. Here, a farm installation: 7.5 m of fall, 65 m of lift, about 500 L of water a day.\n\nIn this lab: four 3D views (the **site**, the **catchment**, the **ram** and its **waste valve**, with explode, X-ray, section and flows), step-by-step **assembly** and **installation**, the **simulation** (settings, scenarios, the cycle in slow motion, sizing), ${SHEETS.length} A3 **drawings**, ${LESSONS.length} **lessons** with a quiz, the **catalogue** of ${PARTS.length} parts and the **sources**.`

What the landing already does well: it says in the first sentence what the device is for (lifting water with no electricity, fuel or
motor) and gives the site's three numbers. Title « LABO DU BÉLIER HYDRAULIQUE » / "HYDRAULIC RAM LAB" and
the tagline say the same thing in both languages. The pedagogy review (F2) discusses what the landing could add on how the
mechanism works; that is not repeated here.

### R-19. Main source line (F19), `lab.ts:60-67`

Link label: `fr ? '« Création clapet de choc pour que notre bélier hydraulique ne s’arrête plus »' : '“Création clapet de choc pour que notre bélier hydraulique ne s’arrête plus”'` (the video's title stays in French in both languages). English tail: `' (video in French) — L’énergie partout (2024), who thanks Didier Nebreda for his advice on rams. No footage from the video is reused.'`

### R-28. First start, three paragraphs (F28), `install.ts:266-267`, `lf()` placeholders kept

FR:
```
Ouvrez la vanne de départ et laissez la conduite motrice se remplir en chassant l’air par le bélier, puis ouvrez progressivement la vanne d’arrivée. Si les coups ne s’enchaînent pas, enfoncez le poids du **clapet de choc** à la main, puis relâchez-le (la vidéo dit seulement qu’il fallait aller remettre le bélier en marche ; le geste est la pratique courante). Écoutez : avec le clapet n°1, la vidéo compte 100 à 110 coups par minute, presque deux par seconde (l’ancien clapet en faisait 70 à 80).

Ne cherchez pas de jet. {perDay} L par jour, c’est ≈ {delivered1} L/min, environ 3 mL par coup, et la conduite de refoulement doit d’abord se remplir : ≈ {fillLitres} L, soit ≈ {fillHours} h au débit final (modèle). Plus bas dans la pente le débit est plus fort (≈ {delivered30} L/min à 30 m), donc la durée réelle est plutôt plus courte. Le manomètre côté refoulement lit la hauteur déjà montée (1 bar ≈ 10 m) et doit atteindre ≈ {staticBarDelivery} bar quand les {lift} m sont pleins.

Surveillez le niveau de la cuve. Tant que l’eau n’est montée que de 30 m, le modèle fait prendre au bélier ≈ {drive30} L/min, plus que la source ({source} L/min) ; à {lift} m, il en prend ≈ {drive1} L/min. La cuve baisse un peu puis remonte. Si elle continue de baisser une fois la conduite pleine, c’est le cas de la vidéo.
```
EN:
```
Open the gate valve and let the drive pipe fill, driving the air out through the ram, then open the inlet valve gradually. If the strokes do not follow one another, press the weight of the **waste valve** down by hand, then let go (the video only says that someone had to go and restart the ram; pressing the weight down is common practice). Listen: with the n°1 valve the video counts 100–110 strokes a minute, almost two a second (the old valve made 70–80).

Do not expect a jet. {perDay} L a day is ≈ {delivered1} L/min, about 3 mL per stroke, and the delivery pipe has to fill first: ≈ {fillLitres} L, that is ≈ {fillHours} h at the final rate (model). Lower down the slope the flow is stronger (≈ {delivered30} L/min at 30 m), so the real time is probably shorter. The gauge on the delivery side reads the height already lifted (1 bar ≈ 10 m) and should reach ≈ {staticBarDelivery} bar once the {lift} m are full.

Watch the tank level. While the water has been lifted only 30 m, the model has the ram take ≈ {drive30} L/min, more than the spring ({source} L/min); at {lift} m it takes ≈ {drive1} L/min. The tank drops a little, then rises again. If it keeps falling once the pipe is full, it is the video’s case.
```
(In the file the blank line is the two-character escape `\n\n` inside the string.)

### R-29. Stall checklist (F29), `install.ts:277-278`, the `tip`

FR: `S’il cale, vérifiez dans cet ordre. **1. La cuve** : vide, c’est le cas de la vidéo ; pleine avec un trop-plein qui coule, soupçonnez la crépine ou la vanne de départ. **2. L’air** dans la conduite motrice. **3. La cloche à air** : noyée, ou reniflard bouché. **4. La course du clapet** : trop longue, le bélier boit la cuve ; trop courte, il frappe sans rien refouler. **5. L’évacuation des eaux de rejet** : bouchée, elle noie le clapet. **6. Le clapet lui-même** : il coince, ou ne porte pas bien sur sa portée.`

EN: `If it stalls, check in this order. **1. The tank**: empty, it is the video’s case; full with the overflow running, suspect the screen or the gate valve. **2. Air** in the drive pipe. **3. The air chamber**: water-logged, or the snifter blocked. **4. The valve stroke**: too long, the ram drinks the tank dry; too short, it strikes and delivers nothing. **5. The waste-water drain**: if blocked, it drowns the valve. **6. The valve itself**: it jams, or does not seat properly.`

### R-30. Spring box description (F30), `parts/catchment.ts:29-30`, `lf()` placeholders kept

FR:
```
Le regard de captage est une chambre fermée posée là où l’eau sort de terre : le filtre à gravier y amène l’eau par des orifices percés dans le mur côté source, un piège à sédiments en occupe le fond, et une seule sortie la conduit vers la réserve, à l’abri du ruissellement, des feuilles et des animaux.

Sa règle d’or est de ne jamais gêner l’eau : une source mise en contre-pression peut se déplacer ou perdre du débit. D’où une sortie au niveau du sol, plus bas que le point où la source sort, et un petit trop-plein juste au-dessus du niveau de service et sous le haut du lit de gravier, pour que rien ne puisse refluer dans le gravier (Oxfam). Un bouchon de vidange sur chaîne, dans le fond, permet de vider les sédiments (Oxfam parle de vidange).

La vidéo ne détaille pas le captage (l’auteur dit seulement que la réserve tampon capte la source) : ce regard et ses dimensions sont dessinés par le laboratoire d’après la pratique courante de protection des sources (fiche Oxfam). Il doit recueillir les {source} à {sourceHigh} L/min de la vidéo sans rien en perdre.
```
EN:
```
The spring box is a closed chamber set where the water comes out of the ground: the gravel filter brings the water in through ports in the wall on the spring side, a sediment trap fills its bottom, and a single outlet leads the water to the tank, sheltered from run-off, leaves and animals.

Its golden rule is never to obstruct the water: a spring put under back-pressure can move or lose flow. Hence an outlet at ground level, lower than the point where the spring comes out, and a small overflow just above the working level and under the top of the gravel bed, so that nothing can back up into the gravel (Oxfam). A washout plug on a chain, in the floor, lets the sediment be emptied (Oxfam speaks of a washout).

The video does not detail the catchment (the author only says that the buffer tank captures the spring): this box and its dimensions are drawn by the lab, after the common practice of spring protection (Oxfam brief). It has to collect the video’s {source}–{sourceHigh} L/min without losing any of it.
```

### R-31. A long lesson sentence cut (F31), `lessons.ts:520-521`

FR: `La conduite motrice doit être **rigide**, en acier ou en fonte. La surpression ρ·a·v croît avec la vitesse a de l’onde, qui est plus faible dans un tuyau souple. Dans le scénario « Conduite en PVC » (un résultat du modèle pour une vitesse supposée de {pvcA} m/s, et non une mesure), elle tombe à ≈ {pvcSurge} bar alors qu’il en faut ≈ {need} bar pour ouvrir le clapet de refoulement : le bélier frappe sans rien refouler. Un article de presse sur un autre bélier de ferme déconseille aussi le plastique.`

EN: `The drive pipe must be **rigid**, steel or cast iron. The surge ρ·a·v grows with the speed a of the wave, which is lower in a flexible pipe. In the “PVC drive pipe” scenario (a model result for an assumed speed of {pvcA} m/s, not a measurement) it falls to ≈ {pvcSurge} bar while ≈ {need} bar are needed to open the delivery check valve: the ram strikes and delivers nothing. A press article about another farm ram also advises against plastic.`

---

## 5. Appendices

### A. English word for word (F37), British spelling

| Where | Now | Replace with |
| --- | --- | --- |
| `install.ts:59`; `catchment.ts:125, 167, 171` | "Uncover the emergence with care"; "near the emergence"; "protects the emergence"; "never leave the emergence bare" | "Uncover the spring eye (where the water comes out of the ground) with care"; "near the spring eye"; "protects the spring eye"; "never leave the spring eye bare" |
| `install.ts:59`; `catchment.ts:30, 107, 175` | "a hindered spring can move"; "never to hinder the water"; "A hindered spring follows the easiest path"; "without hindering the water" | "an obstructed spring can shift"; "never to obstruct the water"; "An obstructed spring follows the easiest path"; "without obstructing the water" |
| `catchment.ts:450` | "the first member of the drive pipe" | "the first component of the drive pipe" |
| `assembly.ts:252`; `valve.ts:943`; `seat-detail.ts:417` | "so that the adjusting gesture can be seen"; "the gesture of the setting" | "so that the act of adjusting can be seen"; "how the setting is made" |
| `ram.ts:294`; `valve.ts:709, 1011` | "betrays loosening"; "betrays worn sleeves"; "betrays a nut that has moved" | "reveals loosening"; "points to worn sleeves"; "means a nut has moved" |
| `assembly.ts:166, 175`; `valve.ts:201, 594, 613, 647, 652, 666` | "hardened steel axle"; "not used as an axle"; "off its axle"; "weld it on the axle"; "does not make a good axle" | "hardened-steel shaft"; "not used as a guide shaft"; "off its axis"; "weld it onto the shaft"; "does not make a good guide shaft" (French « axe » is the shaft or the axis; "axle" is a wheel's) |
| `install.ts:170`; `ram.ts:573`; `valve.ts:709` | "no glued or tired fittings"; "a tired spring"; "a tired sleeve" | "no glued joints, no worn fittings"; "a weakened spring"; "a worn sleeve" |
| `ram.ts:739` | "a chamber stocked with air" | "a chamber well charged with air" |
| `lessons.ts:454`; `d10-sizing.ts:283` | "the ram is asked too much" | "the ram is being asked to do too much"; "the ram is overworked" |
| `assembly.ts:133, 166`; `valve.ts:439, 613` | "the seal was dead within 24 hours"; "seal dead in 24 h"; "whose seal died" | "the seal had failed within 24 hours"; "seal failed in 24 h"; "whose seal failed" |
| `valve.ts:439` | "…wider than a flat ring of the same radial width, which a flat valve with a seal did not give in the video (seal dead in 24 h, poor sealing)" | "…wider than a flat ring of the same radial width, something the video's flat valve with a seal could not achieve (seal failed in 24 h, poor sealing)"; "is the real tap on the consumption" → "is what really controls the consumption" |
| `catchment.ts:260, 264` | "the pivot of the story" | "the key to the story" |
| `catchment.ts:328, 378` | "Oxfam wants the water protected…"; "Oxfam wants an overflow lower…" | "Oxfam requires the water to be protected…"; "Oxfam requires an overflow lower…" |
| `assembly.ts:228`; `chapters.ts:51`; `valve.ts:866`; `valve-parts.ts:419`; `lab.ts:208` | "a rebar bar" | "a length of rebar" |
| `ram.ts:294, 824, 917`; `valve.ts:129, 197`; `assembly.ts:347, 494` | "absorbent paper" | "a paper towel" / "Paper towels for the leak check" |
| `valve.ts:613`; `seat-detail.ts:155`; `valve-parts.ts:117` | "fins nut" | "finned nut" |
| `assembly.ts:175` and `valve.ts:613` | "rod" and "stem" for the same part | "stem" for the part, "threaded rod" for the stock |

### B. "monde" / "world" lines (F20)

| Where | FR now → replacement | EN now → replacement |
| --- | --- | --- |
| `parts/site.ts:156-157, 213-214` | « Détail dans le monde « Le captage ». » → « Détail dans la vue du captage. » | "Detail in the catchment world." → "Detail in the catchment view." |
| `site.ts:160-161` | « ouvrez le monde « Le captage » pour le regard… » → « ouvrez la vue du captage pour le regard… » | "open the catchment world for…" → "open the catchment view for…" |
| `site.ts:217-218` | « …détaillés dans le monde « Le captage ». » → « …détaillés dans la vue du captage. » | "…detailed in the catchment world." → "…detailed in the catchment view." |
| `ram.ts:421-422` | « s'ouvrent dans le monde « Le clapet » (bouton en bas de cette fiche) » → « s'ouvrent dans la vue du clapet (bouton en bas de cette fiche) » | "open in the “The valve” world" → "open in the valve view" |
| `ram.ts:441-442` | « détaillées dans le monde « Le clapet » » → « détaillées dans la vue du clapet » | "detailed in the “The valve” world" → "detailed in the valve view" |
| `catchment.ts:449, 452` | « (monde « Le bélier ») » → « (vue du bélier) » | "(the ram world)" → "(the ram view)" |
| `assembly.ts:463-464` | « assemblées dans le monde du clapet » → « assemblées dans la vue du clapet » | "assembled in the valve world" → "assembled in the valve view" |
| `lab.ts:149-150` | « quatre mondes en 3D » → « quatre vues 3D » (R-15) | "four 3D worlds" → "four 3D views" (R-15) |
| `drawings/mechanical/bom.ts:255-256` | « bélier générique de 1″ (monde ram) et clapet de choc de la vidéo (monde valve) » → « bélier générique de 1″ et clapet de choc de la vidéo » | "(ram world)… (valve world)" → drop both |

### C. Source codes to names (F04)

| Code | What it is (`docs/research.md`) | FR | EN |
| --- | --- | --- | --- |
| S1 | the video | « vidéo » (« S1 03:54 » → « vidéo 03:54 ») | "video" |
| S4 | NC State Extension | « NC State » | "NC State" |
| S5 | NITK virtual labs | « NITK » | "NITK" |
| S6 | Wikipedia | « Wikipédia » | "Wikipedia" |
| S7 | Réussir press article | « un article de presse » | "a press article" |
| S8 | Practical Action | « Practical Action » | "Practical Action" |
| S9 (and "TB5") | Oxfam | « Oxfam » (« fiche technique TB5 » is Oxfam's own number: keep) | "Oxfam" ("technical brief TB5": keep) |
| K3, K4, K20 | figures stated in the video | « vidéo » or remove | "video" or remove |
| K14, K15 | derived figures | « dérivé » or remove | "derived" or remove |

Regexes on the drawing sources (French line then English line): `\bS1 (\d\d:\d\d)` → `vidéo $1` / `video $1`; `\(S1\)` → `(vidéo)` / `(video)`;
`\bS4\b` → `NC State`; `\bS6\b` → `Wikipédia` / `Wikipedia`; `, S8\b` and `, S9\b` → remove; `\s*\(K\d+\)` → remove or `(vidéo)`.
Also the legend `util.ts:94`: « rapporté (vidéo S1, tableau S4) » → « rapporté (vidéo, tableau NC State) ».

### D. « regard » that means the ram pit (F05), French only

`install.ts:82` « loin de la cuve et du regard du bélier » → « …de la fosse du bélier »; `:178` « Avant de poser le regard… du futur regard » → « Avant de poser la fosse… de la future fosse »; `:188` « Le fond du regard doit rester plus haut que la sortie » → « Le fond de la fosse… »; `:192` « dans le regard » → « dans la fosse »; `:199` « Installer le regard et le bélier » → « Installer la fosse et le bélier »; `:201` « Bâtissez le **regard** autour du massif d'ancrage… Le regard protège la machine… les dimensions du regard sont des estimations » → « Bâtissez la **fosse**… La fosse protège la machine… les dimensions de la fosse sont des estimations »; `:215` « Le regard est un endroit où l'on glisse » → « La fosse est un endroit où l'on glisse ».
`parts/ram.ts:920` « le drain du regard » → « le drain de la fosse ».
`parts/site.ts:341` name « Regard du bélier » → « Fosse du bélier »; `:343` « Regard qui abrite le bélier » → « Fosse qui abrite le bélier »; `:347` « Le regard abrite… le regard doit la laisser partir » → « La fosse abrite… la fosse doit la laisser partir »; `:368` « dans le regard » → « dans la fosse »; `:391` « loin du regard, du captage » → « loin de la fosse, du captage », « l'eau monte dans le regard » → « …dans la fosse »; `:423` « l'eau monte dans le regard », « soulevez le couvercle du regard » → « …dans la fosse », « soulevez le couvercle de la fosse ». (`site.ts:160` « le regard, le filtre à gravier » is the spring box: keep.)
`d07-principle.ts:172` « regard : dimensions estimées » → « fosse : dimensions estimées »; `:536` « limite du regard » → « limite de la fosse »; `:584` « le regard, le château d'eau » → « la fosse, le château d'eau ».
`d11-site-plan.ts:478` « Sol au regard du bélier » → « Sol à la fosse du bélier »; `:567` « regard du bélier » → « fosse du bélier »; `:577` « regard, » → « fosse, »; `:589` « REGARD ET ÉVACUATION » → « FOSSE ET ÉVACUATION ». (`d11:450` « tuyau enterré, regards » = inspection chambers: keep.)
`three/site/scene.ts` hotspot `ram-pit`: « Regard du bélier » → « Fosse du bélier ».

### E. Weight (F06): every visible « contrepoids » / "counterweight"

| Where | FR now → replacement | EN now → replacement |
| --- | --- | --- |
| `ui.ts:51` `scenarioHeavyWeight` | « Contrepoids plus lourd » → « Poids doublé » | "Heavier counterweight" → "Doubled weight" |
| `ui.ts:113` `counterweight` | « Contrepoids » → « Poids du clapet » | "Counterweight" → "Valve weight" |
| `ui.ts:118-119` `valveHint` | « course et contrepoids » → « course et poids » | "stroke and counterweight" → "stroke and weight" |
| `ui.ts:175-184` `sweepWeight`, `chartWeight*` | « le contrepoids » → « le poids »; « Consommation selon le poids (L/min) »; « Eau refoulée selon le poids (L/jour) »; « Un poids plus lourd refoule plus d'eau… » | "the weight"; "Drive flow against the weight (L/min)"; "Delivered water against the weight (L/day)"; "A heavier weight delivers more water…" |
| `lessons.ts:317-318` (quiz choice) | « Alourdir le contrepoids pour que le clapet claque plus fort » → « Mettre un poids plus lourd pour que le clapet claque plus fort » | "Make the counterweight heavier so the valve slams harder" → "Fit a heavier weight so the valve slams harder" |
| `lessons.ts:330-331` (quiz) | « un contrepoids doublé » → « un poids doublé » | "a doubled counterweight" → "a doubled weight" |
| `lessons.ts:424` (choice), `:428-429` (explanation) | « Le contrepoids du clapet est devenu trop léger »; « un contrepoids plus léger » → « Le poids du clapet… »; « un poids plus léger » | "The valve's counterweight has become too light"; "a lighter counterweight" → "The valve's weight has become too light"; "a lighter weight" |
| `lessons.ts:292-293`, `parts/valve.ts:923-924` (they quote the scenario by name) | « (scénario « Contrepoids plus lourd ») », « le scénario « Contrepoids plus lourd » du simulateur » → « (scénario « Poids doublé ») », « le scénario « Poids doublé » du simulateur » | "(the “Heavier counterweight” scenario)", "the simulator’s “Heavier counterweight” scenario" → "(the “Doubled weight” scenario)", "the simulator’s “Doubled weight” scenario" |
| `parts/valve.ts:857` (name) | « Poids (barre d'armature) » stays | "Counterweight (rebar)" → "Weight (rebar)" |
| `d09-performance.ts:433, 439, 519-520` | « Réglage : poids du contrepoids » → « Réglage : poids du clapet »; « contrepoids (g) » → « poids (g) »; « (contrepoids et course) » → « (poids et course) » | "Tuning: counterweight" → "Tuning: valve weight"; "counterweight (g)" → "weight (g)"; "(counterweight and stroke)" → "(weight and stroke)" |
| `valve-parts.ts:293, 418-419` | « CONTREPOIDS · {WEIGHT} g (calibré) » → « POIDS · {WEIGHT} g (calibré) »; « contrepoids taillé dans une barre d'armature » → « poids taillé dans une barre d'armature » | "COUNTERWEIGHT · …" → "WEIGHT · …"; "the counterweight cut from a rebar bar" → "the weight cut from a length of rebar" |

The 3D hotspot (`three/valve/index.ts:28`) already says « Poids » / "Weight". Part id and sim keys stay `counterweight`.

---

## 6. Verdict by file group

Grades are mine, on naturalness, correctness and consistency of the language, not of the content (A = a native author would
sign it; B = good with visible stumbles; C = needs a pass).

| File group | French | English | Remarks |
| --- | --- | --- | --- |
| `lab.ts` (landing, Sources) | A- | B+ | Clear, plain, honest. The first overview text says what the device is for in one sentence. « rayons X », « mondes », « Wikipedia » in the French panel. |
| `ui.ts` and `sim.ts` (interface) | B+ | B | Only one real error (« Toute l'air »). Many labels abbreviated or half-translated (F16, F17); English status lines read as translated (F18). Strong idea: every label has a unit and every state has a sentence. |
| `lessons.ts` (6 lessons, 12 questions) | A- | B+ | The best French of the lab: short, concrete, good images (« c'est l'eau jetée en bas qui paie la note »). English follows closely, with the stroke collision (F10) and "four-beat". Paragraphs are long (pedagogy review). |
| `assembly.ts`, `install.ts` (guides) | A- | B | Imperatives are clean in both languages and the tips and warnings are precise. English has most of the calques (axle, gesture, tired, emergence). Two paragraphs are too long for a phone (F28, F29). |
| 44 part sheets | B+ | B | Same strengths; the maintenance tab is a wall of text (F27); terminology drifts between sheets (F05–F08, F21). The « Panne à prévoir / À vérifier / Entretien » trio is a good device. |
| 13 drawings | B | B- | Dense, accurate, and the only place with a factual French/English contradiction (F01). Internal codes (F04), « pose » (F36), "chain lines" (F35). |
| 3D hotspot labels | A- | A- | Short and right; four names differ from the sheets (F26). |
| Typography | C | B | French spacing is absent everywhere (F02). English is clean (curly quotes, en dashes, British spelling nearly everywhere). |
| Parity | A | A | Numbers identical in all pairs checked by script; sentence counts, bold markers and parentheses match; the one mismatch is F01. Tags (« estimation / estimate », « dérivé / derived », « modèle / model ») are identical in meaning. |

Overall: **French about 8/10, English about 7/10.** The two read as written together: the data role used `{name}`
placeholders so the figures cannot drift, the tags are systematic, and no « tu », exclamation mark or emoji slipped in. What
holds the lab back from "one careful native author" is not the sentences but three things: the missing French spacing, the
internal vocabulary showing through (S-codes, "world", ids), and about eight concepts that have two or three names.

Suggested order of work for the lead: (1) F02 and its test; (2) the mechanical groups F03, F04, F06, F20, F27, F33, F39;
(3) terminology F05, F07–F09, F21–F25; (4) the interface strings F11, F16–F18; (5) the rewrites F28–F31; (6) the rest.

---

## 7. What I could not check

- **Rendering.** No server or browser was started (instruction). Line breaks at 390 px, the truncation of a label in the readout
  grid (the kit CSS truncates at about 15 characters with an ellipsis), and the real width of the longest chips are inferred from
  the CSS and from character counts, not seen. All replacement labels are ≤ 15 characters.
- **The video's own vocabulary** beyond the three words in the brief and the part names recorded in `docs/research.md`: I did
  not open the private transcript. « poids », « portée », « conduite d'alimentation » and « eau rejetée » are therefore decisions
  on usage and consistency, not on what the video says.
- **Tests.** I did not run the test suite (no state change allowed). I read the tests that pin wording; the replacements above
  keep them true as far as I can read them, but F27 (maintenance paragraphs) and F03 (`n°`) touch many strings: run `npm test`.
- **Meaning of numbers.** I checked that FR and EN carry the same figures and that figures repeated in several places agree
  (found: F14). I did not re-derive any physics.
- **The kit's own strings** (`strings.js`) are out of scope as asked; the only kit-level proposal is the typography request in R-02.
- **README.md** is still the scaffold (F41) and was only skimmed.
- **Reading level of the English for a non-native visitor** (idioms such as "drinks the tank dry", "walks under its own
  strokes") is a judgement call: they are natural and vivid, and I left them.
