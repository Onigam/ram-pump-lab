# Pedagogy review, wave 4 (read-only)

Reviewer: the pedagogy agent. Date: 2026-10-24. Question asked: does this lab teach a curious non-specialist (a teenager or an
adult with no hydraulics), and what exactly should change? Nothing in the repository was edited except this file.

**What I read.** `docs/wave3-rules.md`, `BRIEF.md` §1–2, `docs/research.md` §0 and §11, `src/lab.ts` (commit b9e0f66, which
changed the landing text after the screenshots were taken: I judged the committed text, not the screenshot), `src/data/lessons.ts`
and its test, `src/data/assembly.ts`, `src/data/install.ts`, the 44 sheets (measured by script), `src/panels/sim.ts`,
`src/i18n/ui.ts`, `src/part-actions.ts`, `src/sim/actions.ts`, the titles and descriptions of the 13 drawings, the kit's panel code
(`node_modules/@onigam/lab-kit`, v0.1.6: what a lesson, a guide step, a part sheet and the plans panel really show and in what
order), Pelton Lab's lessons and overview texts (read-only), and the desktop and phone screenshots of
`/tmp/vrnode/out-w3/` and `/tmp/vrnode/out-w3-m/`.

**How to read.** Section 1: verdict. 2: measures. 3: the first 30 seconds. 4: the learning outcomes map. 5: findings F1–F36, most
important first (each: where, problem for the learner, change, who, cost). 6: five small additions. 7: the phone. 8: what I could
not check. FR and EN texts are ready to paste. `{name}` placeholders are those of `FIG` / `LESSON_FIG` (existing names only);
guide texts keep the `${…}` expressions of their file. French typography follows the repository (plain spaces around « » and
before « : », typographic apostrophe).

---

## 1. Verdict

The content is accurate, honest about what is estimated, and unusually complete: 44 sheets that all open with a one-line
"what is it", a failure note on every part, 8 scenarios, a step-by-step cycle, a sizing calculator, 13 plans, 6 lessons with
balanced quizzes. As a **reference** it is excellent. As a **learning path** it is weaker than Pelton Lab in four ways:

1. **Nothing says where to start and the "aha" is buried.** The mechanism (a flow stopped dead, repeated) is not on the landing; the
   cycle, which is the aha, sits under 15 readouts in the Simulation panel; on a phone the first button is below the fold.
2. **Lessons are 1.6 times denser than Pelton's** (mean 357 words against 217; lessons 3, 5, 6 at 442, 398, 408 against a Pelton maximum of
   283), largely because a unit test forces 2–3 sentence paragraphs, which produces sentences of 35–50 words.
3. **The quizzes teach well but can be gamed, and they skip the highest-stakes content.** The right answer is the longest choice in 6
   of the 8 text questions; the four beats, the recoil, the law, potability, anchoring and "never a finger in the valve" are never asked.
4. **Interactive aids are not explained where they are used** (scenario chips, 15 readouts, part-test buttons: tooltips only, so nothing
   on a phone), and the lessons cannot open the view they describe.

Everything above is fixable with text, small UI in the lab, and a few kit requests (K1–K5 at the end of section 5, on top of #3, #7, #8
and #11 already written). The five changes that help a visitor most are F1, F2, F3 with F6, F4 with F5, and F7 of section 5.

---

## 2. Measures (French words, counted by script on the built data)

| Surface | This lab | Pelton Lab | Remark |
| --- | --- | --- | --- |
| Lesson body | 292 / 304 / **442** / 296 / **398** / **408** (mean 357) | 14 lessons, mean 217, 173–283 | 5 paragraphs against 4 |
| Words per sentence in lessons | ≈ 26 (lesson 3: 30–40, longest 53; lesson 6 paragraph 3: 68) | ≈ 23 (same crude count) | target for this audience: ≤ 20–22 |
| Quiz | 12 questions, answers at positions 0/1/2 = 4/4/4; explanations 47–71 words | 28 questions, **23 answers at position 1** | the ram lab is better balanced |
| Right answer is the strictly longest choice | **6 of 8 text questions** (FR); 6 of 8 (EN) | not measured | the test allows 6 of 12 and counts the 4 numeric ones |
| Assembly card (text + tip + warning + tools) | median 167, 92–269; 16 of 23 over 150 | — | about 120 words fit in the desktop panel, 45–70 on a 390 px phone |
| Installation card | median 203, 170–**402**; 11 of 11 over 150 | — | survey 306, first start 382 |
| Sheet, Overview tab (description + tip) | 101–234, median 153 | — | description alone 75–197 |
| Sheet, Maintenance tab | 85–144, median 104, **one block**, no blank line in any of the 44 | — | the kit does split on blank lines (see F13) |
| Sheet, Design tab | 24–72, median 36 | — | fine |
| Sheet, Specs tab | 5–12 rows (median 7), 40–166 words | — | `ram` 12 rows, `waste-valve` 11 |
| Sheet, "short" line | 9–27 words, median 16 | — | **the best text of the lab** |
| All French learner-facing text | ≈ 26 400 words (lessons 2 140, quizzes 1 220, sheets 16 960, assembly 3 660, installation 2 400) | — | lessons and quizzes together are 13 % of it |

Strength to keep: every sheet opens with a one-line `short` that answers "what is it for" on its own
(*« Vanne qui isole la conduite de refoulement du bélier. »*), and each Maintenance tab is organised as
failure / how to check / upkeep with bold run-in labels. That is better than most teaching material of this kind.

---

## 3. The first 30 seconds

What a newcomer meets on a laptop: the title « LABO DU BÉLIER HYDRAULIQUE » with « Pomper l’eau sans électricité ni carburant »,
a hillside with labels, and in the panel the question « Un bélier hydraulique, à quoi ça sert ? ».

- **0–5 s.** Title and tagline work on a desktop (the purpose is in the tagline). **On a tablet or phone they do not exist**: the kit
  hides `.brand > div` below 1 100 px, so the logo and the language switch are all there is. The panel's H2 then carries the identity,
  which is why it is good that it is a question.
- **5–15 s.** The first paragraph says what the device is for and that it needs no motor. A curious reader immediately objects: *how
  can water lift itself above its own source?* Nothing answers that on the landing (the answer, "only a small part rises, the rest
  falls away", is in lesson 1, paragraph 3).
- **15–30 s.** The second paragraph lists ten things the page contains. It is accurate (it now counts the plans, lessons and parts) but
  it is an inventory, in no order, and it never says where to click first. The reader meets « la vidéo » only in second-level texts
  (the catchment and valve overviews, the lessons, the sheets), without ever being told the lab is built on a video.
- **Which button?** « Voir le bélier » is primary: good. The ram overview then says « Lancez la simulation pour voir le cycle », which
  means: find the fourth icon of the rail, then scroll the panel past 15 readouts to « Le cycle, pas à pas » and press a phase chip. The
  first aha costs three clicks and a long scroll, and the visitor must guess both. The lessons, which explain, are the sixth icon.
- **Modes' order and names.** Explorer, Montage, Installation, Simulation, Plans, Leçons, Pièces, Sources is locked by the kit and is a
  builder's order: a newcomer meets "Montage" and "Installation" (a 23-step valve workshop and a site works plan) before "Simulation" and
  "Leçons". The lab cannot reorder, so the **landing text must be the signpost** (F2). « Montage » for "build the valve, then the ram"
  and « Plans » for A3 sheets are clear enough once explained.
- **Is "title + tagline + landing" enough** to say what it is for and what the page offers? For *what it is for*: yes on a desktop, and
  the H2 does it on a phone. For *what the page offers*: partly, and only as a list. Pelton Lab puts the offer in the tagline
  (« Explorer · Comprendre · Construire »); here an offer-type tagline would not fit beside the scene switch (the English one stops at
  about 41 characters, which is what the current one uses). The current tagline is the better hook; keep it and fix the landing.

---

## 4. Learning outcomes and where each is taught and tested

After the whole lab a visitor should be able to:

| # | Outcome | Taught | Tested | Gaps and redundancies |
| --- | --- | --- | --- | --- |
| 1 | **Say what a ram is for and why it needs no motor**: much water falling a little lifts a little water much higher (here 0.35 L of 6.7 L taken) | landing (partly), lesson 1, sheets `spring`, `drive-pipe`, `delivery-pipe`, `water-tower`, plan D07 | L1 Q1 (the ceiling q = Q·h/H), L1 Q2 | the "only a small share rises" idea is missing from the landing; L1 Q2 uses words lesson 1 has not taught (F5) |
| 2 | **Name the four beats in order and say what drives each**; know that a moving column stopped dead gives the water hammer and that the recoil reopens the valve | lesson 2, Simulation « Le cycle, pas à pas » (4 cards + 2 curves), plan D08, sheets `waste-valve`, `delivery-valve` | L2 Q1 (cause of the surge), L2 Q2 (proportionality only) | order and recoil never asked (F6); the cycle section is buried (F1); lesson 2 has no button to it (F8) |
| 3 | **Say what the check valve, the air chamber and the snifter each do**, and recognise a water-logged chamber | lesson 4, sheets, assembly steps 17–18, part tests (drown, block), 2 scenarios | L4 Q1 (which valve does what), L4 Q2 (symptom → cause) | good coverage; Q1 is vocabulary-level and its answer is the longest |
| 4 | **Explain how the waste valve is tuned** (size, stroke nut, counterweight), what turning the nut in does, and why the aim is to take less water than the spring gives | lesson 3, valve world, assembly 12–13, nut buttons ±0.1 mm, 2 sweep charts, plan D04 | L3 Q1, L3 Q2, L6 Q1 | the n°3 → n°1 replay is not one click (F1, F8); the story is told in 18 places (F25) |
| 5 | **Size a ram roughly**: the spring must give more than the ram takes, drive pipe ≥ 5 × fall, H/h not above ≈ 12, delivery ≈ η·Q·h/H; read an efficiency | lesson 5, calculator (collapsed by default), install step 1, plan D10 | L5 Q1 (5 ×), L5 Q2 (η), L6 Q1 (deficit → days) | nothing on H/h or on choosing a size from a flow; the calculator cannot be opened from the lesson; two efficiencies for one need (F15) |
| 6 | **Choose and protect a site safely and legally**: flow at low water, buffer tank, rigid pipe, anchored ram, never a finger in the waste valve, DDT/OFB, spring water not potable | lesson 6 (paragraphs 3–5), install warnings (11 steps), assembly warnings, Sources callouts, sheets | L6 Q2 (PVC) and Q1 (deficit) only | **law, potability, anchoring and the finger rule are never asked** (F6): the highest-stakes content has no check |
| 7 | **Diagnose a ram that stops or delivers less** from the symptom and the alarm (tank empty, gate closed, air in the pipe, chamber water-logged, wrong stroke, blocked drain, soft pipe) | 13 alarms, 8 scenarios, 5 part tests and the two nut buttons, install 11 tip, 44 "Panne à prévoir / À vérifier" notes | L4 Q2 only | **no lesson and no quiz**: the richest material of the lab has no learning path (F6, A5) |

Redundancies worth keeping: the cycle (lesson 2, phase cards, plan D08: three depths), the finger warning (five places, deliberate).
Redundancies to cut: the valve n°3 story and its caveats (« 17 L/min, estimation de l’auteur », « 5 700 L déduits ») appear in 18 items, 39 text
fields (F25). Lessons 1 and 5 both introduce an efficiency, with different numbers (F15).

---

## 5. Findings, most important first

Cost key: **text** = strings only; **UI** = a small change in the lab's own code; **kit** = a request to `@onigam/lab-kit`
(`docs/kit-requests.md`). Who: **lead** (`src/lab.ts`), **data** (sheets and guides), **lessons** (`lessons.ts` and its test),
**sim** (`src/panels`, `src/i18n/ui.ts`, `src/sim`, `part-actions.ts`), **drawings**, **3D**.

### F1. The Simulation panel buries the cycle under 15 readouts, opens on the happy ending, and the "n°3 → n°1" story does nothing at ×1

- **Where**: `src/panels/sim.ts` `render()`; `applyPreset` in `src/sim/engine.ts`.
- **Problem for the learner.** The first screen of the mode is a drop-down, 8 scenario chips, a time hint, a status line, a restart
  button and 12 of 15 cells (« η Aubuisson », « η Rankine », « V. requise », « Choc ρ·a·v », « P. du corps »…), none explained. « Le
  cycle, pas à pas », which holds the aha, starts below them (about 300 px of scroll on a laptop, about 900 px on a phone: my estimates from the screenshots and the code). No sentence says
  what the panel is for. The video's thread (valve n°3 empties the tank, n°1 saves it) lives only in a drop-down that opens on the last
  chapter, « Clapet n°1 : 500 L par jour »; picking the n°3 at ×1 changes nothing for ten real hours, because `applyPreset` keeps the
  time scale (only scenarios raise it, through `SCENARIO_PACE`).
- **Change.** (a) New order: intro → preset and its hint → status → « Le cycle, pas à pas » → scenarios → six key readouts (strokes/min,
  drive flow, lost, delivered, per day, efficiency) → the other nine in a collapsed « Plus de chiffres » → site sliders → ram sliders →
  calculator → charts. (b) The two strings below. (c) `applyPreset('valve-3' | 'valve-2')` raises `timeScale` to at least ×600, as
  scenarios do, so the story plays. (d) F7 for the readouts.
- **Who / cost**: sim; UI + text.

```
simIntro    FR  Le bélier tourne depuis 8 h. Changez le clapet, jouez une panne ou réglez le site : les chiffres de la barre du bas suivent. Pour voir ce qui se passe à chaque coup, ouvrez « Le cycle, pas à pas » juste en dessous.
            EN  The ram has been running since 8 a.m. Change the valve, play a fault or set up the site: the figures in the bottom bar follow. To see what happens at each beat, open “The cycle, step by step” just below.
presetHint  FR  L’histoire de la vidéo : le clapet n°3 prend plus d’eau que la source n’en donne, la réserve se vide en 10 h et le bélier s’arrête ; le n°1 en prend moins et refoule 500 L par jour. Après un changement de clapet, le temps accélère tout seul pour que vous voyiez la réserve baisser.
            EN  The video’s story: the n°3 valve takes more water than the spring gives, the tank empties in 10 h and the ram stops; the n°1 takes less and delivers 500 L a day. After a change of valve, time speeds up by itself so that you can watch the tank fall.
```

### F2. The landing does not say how a small flow can rise above its source, which mode to open first, or that it rebuilds a video

- **Where**: `src/lab.ts`, `site` overview (and the identity on a phone).
- **Problem.** See section 3. The mechanism and the answer to the paradox are missing; the offer is a ten-item list with no start;
  « la vidéo » is used (catchment and valve overviews, lessons) before it has been introduced; the title and tagline are invisible below
  1 100 px (kit), and the two buttons sit below the fold on a phone (the 390 px sheet shows about 70 words).
- **Change.** Replace the text by the version below (about 110 words, the length of today's): paragraph 1 = what, for what, how in one
  sentence, and the paradox; paragraph 2 = the source (credit) and an ordered path. Keep the H2 and « Voir le bélier » as primary. The
  counts of plans, lessons and parts are dropped on purpose (the rail shows them).
- **Who / cost**: lead; text. On a phone the buttons stay below the fold: kit request K1 (end of section 5).

```
site overview text
FR  Un **bélier hydraulique** est une pompe à eau **sans moteur, sans électricité, sans carburant**. L’eau d’une source tombe de quelques mètres ; un clapet la stoppe net une centaine de fois par minute, et chaque coup pousse un peu d’eau **bien plus haut**. Seule une petite part monte, le reste ressort au pied de la machine.\n\nCe labo reconstitue la ferme de la vidéo de L’énergie partout (7,5 m de chute, 65 m de montée, environ 500 L par jour). **Pour commencer** : « Voir le bélier », puis **Simulation** pour le voir battre au ralenti. **Pour comprendre** : les **Leçons**. **Pour voir comment c’est fait** : **Montage** et **Installation**. Reconstitution pédagogique, pas un plan à suivre.
EN  A **hydraulic ram** is a water pump with **no motor, no electricity and no fuel**. Spring water falls a few metres; a valve stops it dead about a hundred times a minute, and each blow pushes a little water **much higher**. Only a small share rises; the rest leaves at the foot of the machine.\n\nThis lab rebuilds the farm of the L’énergie partout video (7.5 m of fall, 65 m of lift, about 500 L a day). **To start**: “See the ram”, then **Simulation** to watch it beat in slow motion. **To understand**: the **Lessons**. **To see how it is made**: **Assembly** and **Installation**. An educational reconstruction, not a plan to follow.
```

### F3. In the quizzes the right answer is the longest choice in 6 of 8 text questions, and the test that should catch it lets it pass

- **Where**: `lessons.ts` (principle Q2, waste-valve Q2, air-chamber Q1 and Q2, siting Q1 and Q2); `lessons.test.ts` « does not make the right answer the longest one every time » (lines 288–299).
- **Problem.** A learner who picks the longest choice scores 6/8 = 75 % on the text questions, against 33 % by chance (FR strictly
  longest: those six; EN: the same except air-chamber Q2, plus cycle Q1). The test accepts up to 6 of 12 because it also counts the four
  numeric questions, whose choices are 1–4 characters. The right choice also tends to carry the cause (« parce que… ») and the lesson's
  vocabulary, while wrong ones carry absolutes (« ne se ferme plus du tout ») or contradict the stem (siting Q2: « le clapet se ferme plus
  lentement » when the stem says it closes as fast). The kit has no penalty and lets the learner click until green, so a quiz that can be
  guessed checks nothing.
- **Change.** Balance the three choices to ±10 % in characters, make every wrong choice a real misconception that the explanation names,
  no absolutes. Test: count text questions only and allow at most 3 of 8 (or compare the right length with the mean of the three). Four
  rewrites below (choices only; stems, explanations and answer positions unchanged, so the positions stay 4/4/4); apply the same rule to
  air-chamber Q2 and siting Q1.
- **Who / cost**: lessons; text + test.

| Question | Choices FR ([right] = right choice) | Choices EN |
| --- | --- | --- |
| principle Q2 (right: index 0; stem in F5) | [right] Monter haut coûte cher en énergie : beaucoup d’eau doit tomber / Le tuyau de refoulement est trop étroit pour laisser passer plus / Une partie de l’eau s’infiltre dans le sol avant le bélier | [right] Lifting high costs energy: a lot of water has to fall / The delivery pipe is too narrow to let more through / Part of the water soaks into the ground before the ram |
| waste-valve Q2 (right: index 2) | Le rendement baisse, donc il refoule forcément moins d’eau / Le clapet ne se ferme plus du tout avec un poids pareil / [right] Le bélier prend le double de la source et vide la réserve | Its efficiency falls, so it must deliver less water in total / The valve would no longer close at all with such a weight / [right] The ram takes twice the spring’s flow and drains the tank |
| air-chamber Q1 (right: index 1) | Laisser entrer l’air dans la cloche à chaque recul / [right] Garder l’eau déjà montée, sans qu’elle redescende / Claquer pour stopper l’eau et créer le coup de bélier | To let air into the chamber at every single recoil / [right] To keep the water already lifted from running back / To slam shut, stop the water and create the hammer |
| siting Q2 (right: index 2) | Parce que l’eau va plus lentement dans le PVC et n’a plus d’élan / Parce que l’eau prend trop de vitesse dans un tuyau aussi lisse / [right] Parce que ρ·a·v chute et n’ouvre plus le clapet anti-retour | Because the water runs more slowly in PVC and loses its momentum / Because the water gathers too much speed in such a smooth pipe / [right] Because ρ·a·v drops and no longer opens the check valve |

### F4. Lessons 3, 5 and 6 are 1.4 to 1.6 times Pelton's densest lesson, and the test that forces "2–3 sentences per paragraph" is the cause

- **Where**: lesson 3 paragraphs 1 and 3 (the author flagged paragraph 3), lesson 5 paragraphs 1, 3, 4; `lessons.test.ts` lines 133–143 (« 3–5 short paragraphs of 2–3 sentences »).
- **Problem.** To stay within three sentences the authors put 80–100 words in two or three sentences: lesson 3 paragraph 1 is 80 words in 2
  sentences with 16 numbers (20 per 100 words); paragraph 3 is 99 words, 3 sentences, 12 numbers; lesson 5 paragraph 3 has 11 numbers and a
  49-word sentence. A teenager loses the thread at the third number. Pelton's lessons are four paragraphs of about 50 words with a worked
  example in one of them.
- **Change.** Change the test to « 3–5 paragraphs of 2–4 sentences, at most 60 words per paragraph, no sentence over 28 words », and leave the
  numbers to the chips, which already carry them. Full rewrites below for lesson 3 paragraphs 1–3 and lesson 5 paragraphs 3–4 (they keep every
  scenario and section name that `lessons.test.ts` quotes, and « estimation » / « estimate »). Lesson 5 keeps one clause on Rankine because the
  test and source S5 use it; its definition should be checked by the facts reviewer: the one-line « ne compte que l’eau jetée » omits the
  (H − h) term.
- **Who / cost**: lessons; text + test.

```
waste-valve, paragraph 1
FR  Dans la vidéo, le clapet d’origine (un **n°3**) prenait ≈ {drawN3} L/min, une estimation de l’auteur, alors que la source ne donnait plus que {source} L/min : la réserve se vidait en ≈ {hoursN3} h et le bélier s’arrêtait. Un **n°2** marchait mal. Un **n°1**, fait de raccords de plomberie, a fait passer la cadence de 70–80 à 100–110 coups/min et monte ≈ {perDay} L par jour.
EN  In the video, the ram’s original valve (a **n°3**) took ≈ {drawN3} L/min, the author’s estimate, while the spring now gave only {source} L/min: the tank emptied in ≈ {hoursN3} h and the ram stopped. A **n°2** worked badly. A **n°1**, built from plumbing fittings, took the rate from 70–80 to 100–110 strokes/min and lifts ≈ {perDay} L a day.

waste-valve, paragraph 2
FR  Trois choses règlent le rythme et la consommation : la **taille** du clapet, la **course** et le **poids**. La course est l’écart entre la tête du clapet et son siège quand il est ouvert, fixé par l’**écrou de course** : plus elle est longue, plus d’eau s’échappe à chaque coup. Le scénario « Écrou de course vissé » la réduit de 0,1 mm toutes les 10 minutes simulées, et le temps accélère de lui-même.
EN  Three things set the rhythm and the consumption: the **size** of the valve, the **stroke** and the **weight**. The stroke is the gap between the valve head and its seat when it is open, set by the **stroke nut**: the longer it is, the more water escapes at every beat. The “Stroke nut turned in” scenario shortens it by 0.1 mm every 10 simulated minutes, and time speeds up by itself.

waste-valve, paragraph 3 (the one flagged as dense: 7 numbers instead of 12)
FR  Dans le modèle (clapet n°1), une course de {s3} mm prend {q3} L/min, plus que la source n’en donne. Le réglage de la vidéo, {s22} mm, prend {drive1} L/min pour {perDay} L par jour. Sous {s15} mm, le bélier ne refoule plus rien (la vidéo note aussi qu’en dessous d’une certaine course il ne marche plus) : c’est la **course minimale**, et la plage utile ne fait que {turns} tour d’écrou.
EN  In the model (n°1 valve), a {s3} mm stroke takes {q3} L/min, more than the spring gives. The video’s setting, {s22} mm, takes {drive1} L/min for {perDay} L a day. Below {s15} mm the ram delivers nothing (the video also notes that below a certain stroke it will not run): that is the **minimum stroke**, and the useful range is only {turns} of a turn of the nut.

sizing, paragraph 3
FR  La hauteur compte autant. Ici l’eau monte {liftRatio} fois plus haut qu’elle n’est tombée (le **rapport H/h**), et plus ce rapport grandit, moins le bélier refoule : dans le modèle, le clapet n°1 refoule {perDay} L par jour à {lift} m et plus rien à {zeroHead} m, soit H/h = {zeroRatio}. Le scénario « Refoulement trop haut » monte à 100 m, et le calculateur prévient au-delà de {zeroRatio} fois la chute.
EN  The height matters as much. Here the water rises {liftRatio} times higher than it fell (the **H/h ratio**), and the bigger that ratio gets, the less the ram delivers: in the model, the n°1 valve delivers {perDay} L a day at {lift} m and nothing at {zeroHead} m, that is H/h = {zeroRatio}. The “Delivery head too high” scenario goes to 100 m, and the calculator warns beyond {zeroRatio} times the fall.

sizing, paragraph 4 (efficiency defined in plain words first; the video's implied 0.3–0.6 is dropped, it stays in the research note)
FR  Le **rendement** dit quelle part de l’énergie de la chute se retrouve dans l’eau montée. Celui de **D’Aubuisson**, η = q·H/(Q·h), compare l’énergie montée à celle de toute l’eau prise à la source : {etaD} pour le clapet n°1 du modèle, contre {etaTypical} comme valeur courante dans les sources (jusqu’à {etaMax}). Celui de **Rankine**, plus rare, ne compte que l’eau jetée par le clapet de choc : {etaR} ici.
EN  The **efficiency** tells how much of the energy of the fall ends up in the water lifted. The **D’Aubuisson** one, η = q·H/(Q·h), compares the energy lifted with that of all the water taken from the spring: {etaD} for the model’s n°1 valve, against {etaTypical} as a usual value in the sources (up to {etaMax}). The rarer **Rankine** one counts only the water thrown out by the waste valve: {etaR} here.
```

Side effects in `lessons.test.ts`: `d75`, `etaLow`, `etaHigh` become unused figures (drop them from `LESSON_FIG`, or keep them for chips).

### F5. Lesson 1 uses words and units it has not yet taught, and its second question is solved by text matching

- **Where**: lesson 1 paragraphs 2–5 and quiz Q2.
- **Problem.** The very first lesson uses « clapet de choc », « la réserve » and « rendement » (all defined later) and the unit **bar** in
  paragraph 5 (« 0,74 bar… 6,4 bar ») with no word on what a bar is: the "1 bar ≈ 10 m of water" rule that makes those two numbers
  mean something is taught nowhere in the lessons (Pelton has a lesson for it). « Le modèle » is used from paragraph 3 without saying that
  it is the lab's own simulation. Q2 asks « Où passe le reste ? » and the right choice is the only one repeating a phrase of paragraph 3
  (« clapet de choc »): it is answered by matching words, not by understanding, and it is also the longest choice (F3).
- **Change.** Paragraphs 2–5 below (paragraph 1 unchanged; paragraph 5 gets the bar rule) and a new Q2 whose stem tests the energy idea
  rather than the vocabulary (answer stays at position 0).
- **Who / cost**: lessons; text.

```
principle, paragraph 2
FR  Rien n’est créé : c’est un **échange**, comme avec un levier. Beaucoup d’eau qui descend un peu (un débit Q sur la hauteur h) en fait monter un peu bien plus haut (un débit q jusqu’à la hauteur H), tant que q·H ne dépasse pas Q·h. Pour monter 1 L à {lift} m, il faut donc faire tomber au moins {liftRatio} L de {fall} m.
EN  Nothing is created: it is a **swap**, as with a lever. A lot of water coming down a little (flow Q through height h) lifts a little water much higher (flow q to height H), as long as q·H does not exceed Q·h. To lift 1 L to {lift} m you must therefore let at least {liftRatio} L fall {fall} m.

principle, paragraph 3
FR  Avec le clapet n°1 de la vidéo, le bélier monte environ **{perDay} L par jour**. Dans la simulation du labo (le « modèle »), il prend {drive1} L/min de l’eau de la source pour en monter {delivered1} : ≈ {takenPerL} L pris pour 1 L monté. Le reste ressort au pied du bélier : c’est cette eau jetée qui paie la montée.
EN  With the video’s n°1 valve the ram lifts about **{perDay} L a day**. In the lab’s simulation (the “model”) it takes {drive1} L/min of the spring’s water and lifts {delivered1} L/min of it: ≈ {takenPerL} L taken for every 1 L lifted. The rest leaves at the foot of the ram: that thrown-away water pays for the lift.

principle, paragraph 4
FR  La vidéo donne une règle du pouce : **1 m de chute remonte l’eau d’environ 10 m**, quelle que soit la longueur de la conduite. D’où un plafond : avec les {source} L/min de la source, le bélier ne pourrait jamais monter plus de q = Q·h/H, soit {ceilingLpm} L/min ou ≈ {ceilingDay} L par jour. Les {perDay} L de la vidéo en font {ceilingPct} % : un **rendement** d’environ {eta04} (leçon 5).
EN  The video gives a rule of thumb: **1 m of fall lifts water about 10 m**, whatever the length of the pipe. Hence a ceiling: with the spring’s {source} L/min the ram could never lift more than q = Q·h/H, that is {ceilingLpm} L/min or ≈ {ceilingDay} L a day. The video’s {perDay} L is {ceilingPct}% of that: an **efficiency** of about {eta04} (lesson 5).

principle, paragraph 5 (adds the bar rule)
FR  Une question reste : comment {fall} m de chute, qui ne poussent qu’avec {staticBarDrive} bar, envoient-ils de l’eau là où la pression atteint {staticBarDelivery} bar (1 bar ≈ 10 m d’eau) ? Par un **coup de bélier** répété, c’est l’objet de la leçon suivante.
EN  One question remains: how can {fall} m of fall, which pushes with only {staticBarDrive} bar, send water to where the pressure reaches {staticBarDelivery} bar (1 bar ≈ 10 m of water)? By a repeated **water hammer**, the subject of the next lesson.

principle, quiz Q2 (answer index 0, choices from the table of F3)
q   FR  Le bélier prend {drive1} L/min de l’eau de la source et n’en monte que {delivered1} L/min. Pourquoi n’en monte-t-il pas davantage ?
    EN  The ram takes {drive1} L/min of spring water and lifts only {delivered1} L/min of it. Why does it not lift more of it?
explain
    FR  Le bélier ne crée pas d’énergie : pour monter 1 L à {lift} m il faut en faire tomber au moins {liftRatio} de {fall} m, en pratique ≈ {takenPerL} L. Le reste ressort par le clapet de choc : c’est cette eau jetée qui paie la montée. Un tuyau plus large n’y changerait rien.
    EN  The ram creates no energy: to lift 1 L to {lift} m at least {liftRatio} L must fall {fall} m, in practice ≈ {takenPerL} L. The rest leaves through the waste valve: that thrown-away water pays for the lift. A wider pipe would change nothing.
```

### F6. The quizzes never ask the four beats, the recoil, the law, potability, anchoring or the finger rule, and nothing teaches diagnosis

- **Where**: `lessons.ts` quizzes; outcomes 2, 6 and 7 of section 4.
- **Problem.** Lesson 2 Q2 (« deux fois plus vite, quelle surpression ? ») is a plug-in into a formula shown in the chip: it checks reading,
  not understanding. Lesson 5 Q1 and Q2 are recall and calculation (a good pair, but the only two for "sizing"). The most consequential
  content (law, potability, rigid pipe, anchoring, finger) is asked in none of the 12 questions, and diagnosis (outcome 7) in one.
- **Change.** (1) Replace lesson 2 Q2 by the order-of-the-beats question (answer index 1 kept). The order tests cause and effect: the
  delivery cannot come before the closing, because the closing creates the surge. It replaces the test line « right('cycle', 1) = twice as
  big ». (2) Add a third question to lesson 6 on the law and potability (answer index 1, so lesson 6 reads 0, 2, 1; position totals 4 / 5 /
  4, inside the test's 3–5) and let the test accept 2–3 questions for that lesson only. The finger rule is warned in five steps; asking it as a fourth question is not
  worth the length on a phone.
- **Who / cost**: lessons; text + test.

```
cycle, quiz Q2 (replaces the x2 question; answer index 1)
q   FR  Dans quel ordre s’enchaînent les quatre temps d’un coup de bélier ?
    EN  In what order do the four beats of a stroke follow one another?
choices
    FR  Accélération, refoulement, fermeture, recul / [right] Accélération, fermeture, refoulement, recul / Fermeture, accélération, recul, refoulement
    EN  Acceleration, delivery, closing, recoil / [right] Acceleration, closing, delivery, recoil / Closing, acceleration, recoil, delivery
explain
    FR  L’eau accélère d’abord, jusqu’à plaquer le clapet de choc : c’est la fermeture. Le choc qui en résulte ouvre alors le clapet anti-retour : c’est le refoulement, qui ne peut donc pas venir avant. Enfin l’eau rebondit, c’est le recul, qui rouvre le clapet de choc et relance l’accélération.
    EN  The water speeds up first, until it presses the waste valve shut: that is the closing. The shock this causes then opens the check valve: that is the delivery, which therefore cannot come before. Finally the water bounces back, the recoil, which reopens the waste valve and restarts the acceleration.

siting, quiz Q3 (new; answer index 1)
q   FR  Vous avez repéré une source sur votre terrain, en France. Que faut-il vérifier avant de la capter pour un bélier ?
    EN  You have found a spring on your land, in France. What must you check before tapping it for a ram?
choices
    FR  Que la source donne au moins 100 L/min, sinon le bélier ne démarre pas / [right] Les règles de prélèvement (DDT, OFB), et la qualité de l’eau avant de la boire / Que la conduite motrice est en plastique souple, pour amortir les coups
    EN  That the spring gives at least 100 L/min, or the ram will not start / [right] The water-taking rules (DDT, OFB), and the quality of the water before drinking it / That the drive pipe is soft plastic, to cushion the strokes
explain
    FR  Prélever l’eau d’une source est réglementé (droit d’eau, continuité écologique) : la DDT et l’OFB renseignent avant tout projet. Et la source n’est pas garantie potable : un captage retient la terre, pas les microbes. Quant au débit, la vidéo fait tourner un bélier sur {source} L/min seulement, et un tuyau souple affaiblit le coup : il faut un tuyau rigide.
    EN  Taking spring water is regulated (water rights, ecological continuity): the DDT and the OFB advise before any project. And spring water is not guaranteed potable: a catchment holds back soil, not germs. As for flow, the video runs a ram on only {source} L/min, and a soft pipe weakens the hammer: the pipe must be rigid.
```

### F7. Scenario chips, the 15 readouts and the part-test buttons are not explained where they are used, and the only explanation of the buttons is a tooltip

- **Where**: `src/panels/sim.ts` (chips, `readoutCell`), `src/part-actions.ts` (`btn.title`), `src/i18n/ui.ts`.
- **Problem.** The 8 scenario chips carry only their name; nothing says what to look at (the status line speaks after the fact). The
  readouts have no definition: « η Aubuisson », « V. requise », « Vit. de l’onde » mean nothing to a newcomer, and the strip's « Rendement
  45 % » is « η Aubuisson » in the panel (two names for one number). The part-test buttons (« Noyer la cloche », « Boucher le reniflard
  ×3600 »…) explain themselves in `title` attributes only: invisible on touch, undiscoverable on desktop until hover, and each acts after the
  camera has moved, so the visitor does not know where to look.
- **Change.** (a) Under the chips, one caption that follows the last scenario clicked (8 strings below). (b) A collapsed « Lire les chiffres »
  under the readouts (string below). (c) Under the buttons of a sheet, one `<p class="hint">` saying what to look at (`partActions` returns
  elements, so the lab can append it; 6 strings below). Each is a string plus a line of UI.
- **Who / cost**: sim; text + small UI.

```
Scenario captions (one line under the chips, replaced at each click)
source-drop       FR  La source passe de 10 à 7,5 L/min au bout d’une heure, avec le clapet n°3. Regardez la courbe « Niveau de la réserve » : elle tombe à zéro et le bélier s’arrête.
                  EN  The spring falls from 10 to 7.5 L/min after an hour, with the n°3 valve. Watch the “Buffer tank level” curve: it falls to zero and the ram stops.
stroke-nut        FR  Le clapet n°1, dont l’écrou est vissé de 0,1 mm toutes les 10 minutes simulées. Regardez la consommation baisser, puis le refoulé tomber à zéro sous la course minimale.
                  EN  The n°1 valve, its nut turned in 0.1 mm every 10 simulated minutes. Watch the consumption fall, then the delivery drop to zero below the minimum stroke.
water-logged      FR  La cloche n’a plus d’air. Regardez la pointe de pression et le refoulé : les coups sont plus durs et on refoule environ 40 % de moins.
                  EN  The chamber has no air left. Watch the pressure peak and the delivery: harder strokes and about 40% less delivered.
short-pipe        FR  Une conduite motrice de 8 m seulement pour 7,5 m de chute. Regardez la cadence (plus rapide) et l’alerte « Conduite motrice courte ».
                  EN  A drive pipe of only 8 m for a 7.5 m fall. Watch the rate (faster) and the “Drive pipe short” alarm.
high-lift         FR  On veut monter à 100 m avec la même chute (H/h = 13). Regardez l’alerte « Refoulement trop haut » : le bélier ne refoule plus.
                  EN  The water must go up 100 m with the same fall (H/h = 13). Watch the “Delivery head too high” alarm: the ram no longer delivers.
snifter-blocked   FR  Le reniflard ne laisse plus entrer d’air. Le temps passe à ×3600 : regardez « Air cloche » baisser pendant des heures, puis le refoulé chuter.
                  EN  The snifter no longer lets air in. Time runs at ×3600: watch “Chamber air” fall over hours, then the delivery drop.
plastic-pipe      FR  Conduite en PVC au lieu d’acier. Le clapet se ferme aussi vite mais le choc est plus faible : lisez le message en rouge, le bélier frappe sans rien refouler.
                  EN  A PVC drive pipe instead of steel. The valve closes just as fast but the shock is weaker: read the red message, the ram strikes without delivering.
heavy-weight      FR  Un contrepoids deux fois plus lourd (720 g). Regardez la consommation dépasser la source, puis la réserve se vider.
                  EN  A counterweight twice as heavy (720 g). Watch the consumption exceed the spring, then the tank empty.

« Lire les chiffres » (collapsed section under the readouts; key readoutsHelp)
FR  **Eau prise** : ce qui descend de la réserve. **Eau perdue** : la part qui ressort par le clapet de choc et fait le travail. **Refoulé** : ce qui monte au château d’eau. **Rendement** : énergie de l’eau montée divisée par celle de l’eau prise. **Choc ρ·a·v** : la surpression du coup de bélier si l’eau ne pouvait pas s’échapper. 1 bar ≈ 10 m de hauteur d’eau.
EN  **Drive flow**: what comes down from the tank. **Lost at valve**: the share that leaves through the waste valve and does the work. **Delivered**: what rises to the water tower. **Efficiency**: energy of the water lifted divided by that of the water taken. **Surge ρ·a·v**: the water-hammer overpressure if the water could not escape. 1 bar ≈ 10 m of water height.

Part-test captions (a hint under the button of the sheet)
air-chamber       FR  Regardez la pointe de pression (≈ 7,2 bar) et le refoulé (environ 40 % de moins) dans la barre du bas.
                  EN  Watch the pressure peak (≈ 7.2 bar) and the delivery (about 40% less) in the bottom bar.
snifter           FR  Regardez « Air cloche » baisser pendant des heures simulées, puis le refoulé chuter.
                  EN  Watch “Chamber air” fall over simulated hours, then the delivery drop.
waste-valve       FR  Regardez les coups s’arrêter et l’alerte « Clapet tenu fermé ». Simulation seulement : jamais un doigt dans le clapet.
                  EN  Watch the strokes stop and the “Valve held shut” alarm. A simulation only: never a finger in the valve.
drive-gate-valve  FR  Regardez la réserve se remplir pendant que le bélier s’arrête.
                  EN  Watch the tank fill while the ram stops.
tank-drain        FR  Regardez la réserve baisser : avec le clapet n°3 le bélier s’arrête faute d’eau, le n°1 continue.
                  EN  Watch the tank level fall: with the n°3 valve the ram stops for lack of water, the n°1 carries on.
stroke-nut        FR  Regardez la consommation baisser et la cadence monter ; sous la course minimale, le refoulé tombe à zéro.
                  EN  Watch the consumption fall and the rate rise; below the minimum stroke the delivery drops to zero.
```

### F8. Lessons cannot open the view they describe, and they never tell the visitor what to look at

- **Where**: the kit's `openLesson` (focus = scene, part, preset, scenario only), `renderLessonsPanel` (the button « Lancer le scénario » exists only if
  `focus.scenario` is set), the six `focus` of `lessons.ts`; kit request #11.
- **Problem.** Lesson 2 (the aha) has no scenario and no part, so its panel offers only the video link; the text says « passez en mode
  Simulation » and the learner must find the mode, scroll to the section and press a chip by hand. The button of lesson 3 plays « Écrou de course
  vissé », not the n°3 → n°1 story that the lesson's own summary promises. Lesson 5 talks about the calculator, which is collapsed and in
  another mode. None of the six lessons says what to look at in the 3D view or which toolbar tool to switch on, and the button « Lancer le
  scénario » does not say which scenario. The chips and the formula appear **before** the body in the kit's panel, so on a phone the
  reading starts about 200 px lower (my estimate from the kit's code).
- **Change.** (1) Kit: request #11 plus `Lesson.look?: L` (a "À regarder" line above the buttons) and a list of named actions instead of
  one hidden scenario (K2, end of section 5). (2) Until then, the six lines below can go as a last short paragraph; this needs the
  paragraph test to allow it (see F4). (3) Chips: keep three at most per lesson (the test says 2–4; four on a phone is two rows).
- **Who / cost**: lessons + kit; text now, kit later. Statements about what the 3D view shows (L2, L4) are mine from the code and the sheets:
  the 3D role should confirm them.

```
À regarder (last line of each lesson)
principle  FR  À regarder : sur le site, suivez le tuyau bleu depuis le regard du bélier, en bas, jusqu’au château d’eau, en haut : c’est la montée de {lift} m.
           EN  To look at: on the site, follow the blue pipe from the ram pit at the bottom to the water tower at the top: that is the {lift} m of lift.
cycle      FR  À regarder : activez Flux et Ralenti (×1/20) dans la barre d’outils : le clapet de choc claque, puis le clapet anti-retour, sous la cloche, s’ouvre un instant.
           EN  To look at: switch on Flows and Slow-mo (×1/20) in the toolbar: the waste valve slams, then the check valve, under the chamber, opens for an instant.
waste-valve FR À regarder : en haut de la tige, l’écrou de course et son contre-écrou ; l’écart entre la tête du clapet et sa portée est la course.
           EN  To look at: at the top of the rod, the stroke nut and its lock nut; the gap between the valve head and its seat is the stroke.
air-chamber FR À regarder : la cloche, au-dessus du corps, et dans la barre du bas le refoulé, qui baisse quand l’air disparaît.
           EN  To look at: the chamber, above the body, and in the bottom bar the delivery, which falls as the air disappears.
sizing     FR  À regarder : les alertes de la barre du bas (« Conduite motrice courte ») et, dans Simulation, la section « Dimensionner un bélier ».
           EN  To look at: the alarms in the bottom bar (“Drive pipe short”) and, in Simulation, the “Size a ram” section.
siting     FR  À regarder : le niveau de la réserve, dans la barre du bas : il baisse jusqu’à zéro, puis le bélier s’arrête.
           EN  To look at: the tank level in the bottom bar: it falls to zero, then the ram stops.
```

### F9. Guide cards are 90–400 words with the next/previous buttons below the text, the first step lists all 14 parts, and provenance remarks eat the room

- **Where**: `assembly.ts` and `install.ts`; the kit's guide card (text → part chips → tools and duration → warning → tip, then the transport bar and the timeline).
- **Problem.** The card is 167 words at the median in the assembly and 203 in the installation (survey 306, first start 382); 14 of 23
  assembly texts and 9 of 11 installation texts are over 100 words. About 120 words fit in the desktop panel, so the **« Suivant » button is
  below the fold on most steps** (16 of 23 assembly cards and all 11 installation cards are over 150 words; the screenshot of step 1 shows the text filling the panel); on a phone 45–70 words show. Step 1 spends half
  its text listing the 14 parts, which the timeline already shows. Sixteen of 23 assembly texts and all 11 installation texts mention the
  video, often to say what it does **not** show (« La vidéo ne montre ni l’un ni l’autre… », steps 2–5, 7, 8): honest, but 15–25 words
  of provenance in the way of the instruction.
- **Change.** Rule: text ≤ 80 words, tip ≤ 30, warning ≤ 30; the anecdote of the video goes to the tip or the sheet; provenance becomes a
  three-word tag at the start (« Pratique courante : », « Dans la vidéo : »). Rewrites below: assembly step 1, installation step 1, and the
  split of installation step 11 (12 steps, within the test's 9–13); split assembly step 23 (251 words, 23 → 24 steps, the test's maximum) at
  « Comptez les coups au chronomètre, puis réglez la course ».
- **Who / cost**: data; text. (Kit: the transport bar above the text, or sticky, would solve the root cause for every lab: K3.)

```
assembly, step 1 « base-plate » (text; tip and tools unchanged; 90 words instead of 129)
FR  Le clapet de choc se construit de bas en haut, et tout repose sur la **platine de base** : une plaque d’acier de la taille de celle du clapet d’origine, percée aux mêmes endroits pour se boulonner à sa place sur le corps du bélier. Le labo en dessine une de ${mmBox(VALVE.basePlateSide, VALVE.basePlateSide, VALVE.basePlateThickness).fr} mm (estimation), avec quatre trous de fixation et un trou central de ${mm(VALVE.basePlateBore).fr} mm par où l’eau montera dans le clapet.\n\nPlan du guide : on construit d’abord le clapet (étapes 1 à 13, monde « Le clapet »), puis on monte le bélier et on y boulonne le clapet (étapes 14 à 23).
EN  The waste valve is built from the bottom up, and everything rests on the **base plate**: a steel plate the size of the original valve’s, drilled in the same places so that it bolts onto the ram body in its place. The lab draws one of ${mmBox(VALVE.basePlateSide, VALVE.basePlateSide, VALVE.basePlateThickness).en} mm (estimate), with four fixing holes and a ${mm(VALVE.basePlateBore).en} mm central hole through which the water will rise into the valve.\n\nPlan of the guide: first we build the valve (steps 1 to 13, the “valve” world), then we assemble the ram and bolt the valve onto it (steps 14 to 23).

installation, step 1 « survey » (text; 110 words instead of 213; the formula q = η·Q·h/H moves to lesson 5 and the calculator)
FR  Trois mesures décident de tout. La **chute** : le dénivelé vertical entre le niveau de l’eau de la réserve et le bélier ({fall} m sur le site de la vidéo). La **hauteur de refoulement** : le dénivelé entre le bélier et l’arrivée ({lift} m, par une conduite d’environ {deliveryLen} m). Le **débit de la source**, mesuré à l’étiage au seau et au chronomètre.\n\nLeur rapport donne le verdict : {lift} m pour {fall} m de chute font 8,7 fois la chute, dans la règle de la vidéo (environ 10 fois). Mais c’est le débit qui choisit le bélier : NC State Extension demande au moins {minFlow1in} L/min pour un bélier de 1″, et la source de la vidéo n’en donne que {source}. Le calcul complet est dans la leçon 5 et dans la section « Dimensionner un bélier » de la Simulation.
EN  Three measurements decide everything. The **fall**: the vertical height difference between the water level in the tank and the ram ({fall} m on the video’s site). The **lift**: the height difference between the ram and the arrival point ({lift} m, through a pipe of about {deliveryLen} m). The **spring flow**, measured at low water with a bucket and a stopwatch.\n\nTheir ratio gives the verdict: {lift} m for {fall} m of fall is 8.7 times the fall, within the video’s rule (about 10 times). But the flow chooses the ram: the NC State Extension table asks for at least {minFlow1in} L/min for a 1″ ram, and the video’s spring gives only {source}. The full calculation is in lesson 5 and in the “Size a ram” section of the Simulation.

installation, step 11 split into two (the tip's checklist becomes a step, so that it is read when the ram stalls)
« first-start », title FR « Premier démarrage » / EN « First start » (about 130 words; keeps the tools and the warning, the finger rule; the old tip is deleted because its content moves to the next step)
FR  Ouvrez la vanne de départ et laissez la conduite motrice se remplir en chassant l’air par le bélier, puis ouvrez progressivement la vanne d’arrivée. Si les coups ne s’enchaînent pas, enfoncez le poids du **clapet de choc** à la main, par le dessus, puis relâchez-le (pratique courante : la vidéo dit seulement qu’il fallait remettre le bélier en marche). Avec le clapet n°1, la vidéo compte 100 à 110 coups par minute, presque deux par seconde.\n\nNe cherchez pas de jet : 500 L par jour, c’est ≈ 0,35 L/min, environ 3 mL par coup, et la conduite de refoulement doit d’abord se remplir (≈ {fillLitres} L, soit ≈ {fillHours} h). Le manomètre lit la hauteur déjà montée (1 bar ≈ 10 m) et doit atteindre ≈ {staticBarDelivery} bar quand les {lift} m sont pleins.
EN  Open the gate valve and let the drive pipe fill, driving the air out through the ram, then open the inlet valve gradually. If the strokes do not follow one another, press the weight of the **waste valve** down by hand, from above, then let go (common practice: the video only says that the ram had to be restarted). With the n°1 valve the video counts 100 to 110 strokes a minute, almost two a second.\n\nDo not look for a jet: 500 L a day is ≈ 0.35 L/min, about 3 mL a stroke, and the delivery pipe must fill first (≈ {fillLitres} L, that is ≈ {fillHours} h). The gauge reads the height already lifted (1 bar ≈ 10 m) and must reach ≈ {staticBarDelivery} bar when the {lift} m are full.
« troubleshoot », title FR « S’il cale : que vérifier ? » / EN « If it stalls: what to check » (about 140 words; no part, no tools, no tip; the old tip is its second paragraph)
FR  Surveillez d’abord le niveau de la cuve : tant que l’eau n’est montée que de 30 m, le modèle fait prendre au bélier ≈ {drive30} L/min, plus que la source ({source} L/min) ; la cuve baisse un peu puis remonte. Si elle continue de baisser une fois la conduite pleine, c’est le cas de la vidéo.\n\nS’il cale, vérifiez dans cet ordre : la cuve (vide : le cas de la vidéo ; pleine avec un trop-plein qui coule : soupçonnez la crépine ou la vanne de départ) ; l’air dans la conduite motrice ; la cloche à air (noyée, ou reniflard bouché) ; la course du clapet (trop longue, il boit la cuve ; trop courte, il frappe sans rien refouler) ; l’évacuation des eaux de rejet, qui noie le clapet si elle est bouchée ; enfin un clapet qui coince ou ne porte pas bien sur sa portée.
EN  Watch the tank level first: while the water has only risen 30 m, the model has the ram take ≈ {drive30} L/min, more than the spring ({source} L/min); the tank falls a little, then recovers. If it keeps falling once the pipe is full, that is the video’s case.\n\nIf it stalls, check in this order: the tank (empty: the video’s case; full with the overflow running: suspect the strainer or the gate valve); air in the drive pipe; the air chamber (water-logged, or snifter blocked); the valve stroke (too long, it drinks the tank; too short, it strikes and delivers nothing); the waste-water drain, which drowns the valve if it is blocked; lastly a valve that jams or does not seat properly.
```

### F10. The moves between worlds are done by the kit but never explained

- **Where**: `assembly.ts` steps 13 → 14 (valve → ram); `install.ts` steps 1 → 2 (site → catchment) and 5 → 6 (catchment → site).
- **Problem.** The camera jumps to another world and the eyebrow names it (« Étape 14 · Le bélier »), but nothing in the text says that the
  valve is finished and set aside, that the next steps are about a different object, or that we are zooming into the catchment and coming back.
  Step 13 ends on a paint mark on a nut; step 14 begins « Le massif d’ancrage est le bloc de béton… ».
- **Change.** One orienting sentence at each junction (add to the end of step 13 / the start of steps 14, 2 and 6). Step 8 of the installation
  and step 14 of the assembly also point at each other (the installation says « Le bélier lui-même se monte avec le guide de montage »; the
  assembly never says where the ram goes): add a mode name in both.
- **Who / cost**: data; text.

```
assembly step 13, last sentence      FR  Le clapet est terminé : posez-le de côté, il ira sur le bélier à l’étape 22. On passe maintenant au bélier lui-même.
                                     EN  The valve is finished: set it aside, it will go onto the ram at step 22. Now on to the ram itself.
assembly step 14, first sentence     FR  Le décor change : on quitte l’atelier du clapet pour la fosse où le bélier sera installé (voir l’étape 8 du guide Installation).
                                     EN  The scene changes: we leave the valve workshop for the pit where the ram will stand (see step 8 of the Installation guide).
installation step 2, first sentence  FR  On zoome sur le captage, en amont du site.
                                     EN  We zoom in on the catchment, upstream of the site.
installation step 6, first sentence  FR  Retour sur le site, en aval de la réserve.
                                     EN  Back on the site, downstream of the tank.
installation step 8, last sentence   FR  Le bélier lui-même se monte avec le guide Montage (étapes 14 à 23).
                                     EN  The ram itself is assembled with the Assembly guide (steps 14 to 23).
```

### F11. Lesson 2, the aha, buries its best fact and explains the recoil with a sentence a newcomer cannot parse

- **Where**: `lessons.ts`, cycle paragraphs 2, 4, 5.
- **Problem.** Paragraph 2 gives the water hammer as a formula with three Greek or Latin letters defined in a sub-clause, and it never says the
  surprising thing: water moving slower than a walker produces 7.8 bar, because the stop travels as a wave at 900 m/s. Paragraph 4
  says « la pression tombe sous celle de l’air libre » (below atmospheric pressure: meaningless here) and then « un peu d’air entre » without
  linking the two. The name **Joukowsky** appears only on plan D08, so a curious adult cannot search for the formula. The slow-motion tool, which
  is the way to see the beats in 3D, is never mentioned.
- **Change.** Rewrite 2, 4 and 5 (the test needs the numbered heads, the formula chip, and « Simulation », « Le cycle, pas à pas »,
  « Phase suivante » in paragraph 5: kept).
- **Who / cost**: lessons; text.

```
cycle, paragraph 2
FR  **2. Fermeture.** Poussé par l’eau, le clapet claque en {slamMs} ms environ et stoppe net la colonne d’eau de la conduite (≈ {driveLitres} L) : c’est le **coup de bélier**. Elle ne roulait qu’à {vc} m/s, moins vite qu’un marcheur, et pourtant la pression bondit de Δp = ρ·a·v (formule de Joukowsky). Ici ρ est la masse volumique de l’eau, v sa vitesse et a celle de l’onde d’arrêt dans le tuyau, ≈ {waveSteel} m/s dans l’acier : d’où ≈ {surge} bar, de quoi vaincre les {staticBarDelivery} bar de la colonne de {lift} m.
EN  **2. Closing.** Pushed by the water, the valve slams shut in about {slamMs} ms and stops the column of water in the pipe dead (≈ {driveLitres} L): that is the **water hammer**. It was moving at only {vc} m/s, slower than a walker, and yet the pressure jumps by Δp = ρ·a·v (the Joukowsky formula). Here ρ is the density of water, v its speed and a the speed of the stopping wave in the pipe, ≈ {waveSteel} m/s in steel: hence ≈ {surge} bar, enough to beat the {staticBarDelivery} bar of the {lift} m column.

cycle, paragraph 4
FR  **4. Recul.** Arrêtée net, l’eau rebondit : un instant elle repart en arrière et la pression tombe sous celle de l’air extérieur, ce qui aspire un peu d’air par le **reniflard**. Le poids rouvre alors le clapet de choc et tout recommence, ≈ {strokes} fois par minute dans le modèle (100–110 dans la vidéo).
EN  **4. Recoil.** Brought to a halt, the water bounces back: for an instant it flows backwards and the pressure drops below that of the outside air, which draws a little air in through the **snifter**. The weight then reopens the waste valve and it all starts again, ≈ {strokes} times a minute in the model (100–110 in the video).

cycle, paragraph 5
FR  Un coup entier dure environ une demi-seconde. Pour voir chaque temps, activez **Ralenti** dans la barre d’outils (jusqu’à ×1/20), ou passez en mode **Simulation** : dans la section « Le cycle, pas à pas », une pastille par phase fige le bélier en 3D avec ses valves, ses débits et ses courbes, et le bouton « Phase suivante » avance d’un temps.
EN  A whole stroke lasts about half a second. To see each beat, switch on **Slow-mo** in the toolbar (down to ×1/20), or go to the **Simulation** mode: in the “The cycle, step by step” section, one chip per phase freezes the ram in 3D with its valves, flows and curves, and the “Next phase” button moves on one beat.
```

### F12. The live readout « P. du corps » is an instantaneous sawtooth refreshed five times a second: it shows any value between 0 and 7 bar

- **Where**: `renderReadouts()` uses `s.bodyPressure`, which `engine.ts` documents as « sawtooth with the water hammer peak »; the screenshot shows « P. du corps 0,0 bar » next to « P. cloche 6,4 bar » while the ram runs.
- **Problem.** At 109 strokes a minute a 5 Hz sample lands at a random point of the stroke, so the cell jumps between 0 and the peak. A learner reads « 0,0 bar in the body » on a ram that is hammering and concludes the display is broken, or that the body is not pressurised.
- **Change.** Show `peakPressure` (« Pointe de pression », « Pressure peak ») in the six key readouts and keep the instantaneous value only inside the frozen-phase card, where it is stable and meant. The hint « Choc ρ·a·v 7,8 bar » next to a peak of 6,5 bar then needs the one line the phase card already has (« jusqu’à celle du refoulement ; si elle ne pouvait pas s’échapper, le choc serait de 7,8 bar »): add it to « Lire les chiffres ».
- **Who / cost**: sim; small UI + one string.

### F13. Part sheets: the Maintenance tab is one 100-word block although the kit would split it, the waste-valve description crams five ideas, and two « vannes » read as the same

- **Where**: `src/data/parts/*.ts`; the kit's part panel (`paragraphs()` for Overview, Maintenance and guide steps; `rich()` for tip, warning, design).
- **Problem.** The 44 Maintenance tabs are written as « **Panne à prévoir.** … **À vérifier.** … **Entretien.** … » in one paragraph (no
  `\n\n` in any of the 44), although the installed kit (0.1.6) already turns a blank line into a paragraph for the description, the maintenance and the
  guide steps: kit request #10 is only still open for `tip`, `warning` and `design`. The `waste-valve` description packs the mechanism, the
  model's numbers, the video story and a pointer to another world in 156 words. And « Vanne d’arrivée (V1) » (« coupe l’eau motrice… ») and
  « Vanne de départ de la conduite motrice » (« isole la conduite motrice de la cuve… ») have nearly the same one-liner: a newcomer asks why there are two.
- **Change.** (1) One blank line before each bold label of the 44 Maintenance texts (mechanical; example below). (2) Split the two long
  descriptions the same way (waste-valve below; do likewise for `counterweight` 180 words, `spring-box` 197, `tank-shell` 144 + 61 of tip).
  (3) Add the position to both valve one-liners: V1 « à l’autre bout de la conduite, côté bélier », gate valve « côté cuve ».
- **Who / cost**: data; text. Mark kit request #10 as partly obsolete.

```
waste-valve, description (2 paragraphs, same figures: keep the MODEL placeholders of ram.ts)
FR  Le clapet de choc est le cœur du bélier, et le seul organe que la vidéo détaille. Ouvert au repos, il laisse l’eau de la conduite motrice s’échapper en accélérant ; quand le courant atteint environ 0,87 m/s (résultat du modèle), il plaque sa tête sur sa portée en 18 ms environ. La colonne stoppée fait monter la pression et pousse une petite part de l’eau vers la cloche ; le recul rouvre le clapet, et le cycle recommence 109 fois par minute.\n\nDans la vidéo, l’auteur remplace le clapet du Walton n°3 par un n°1 fait de raccords de plomberie, presque sans usinage : la cadence passe de 70–80 à 100–110 coups/min, le bélier ne s’arrête plus et refoule environ 500 L par jour. Ses 14 pièces s’ouvrent dans le monde « Le clapet » (bouton en bas de cette fiche).
EN  The waste valve is the heart of the ram, and the only part the video details. Open at rest, it lets the water in the drive pipe escape while it speeds up; when the flow reaches about 0.87 m/s (model result), it presses its head onto its seat in about 18 ms. The stopped column raises the pressure and pushes a small share of the water toward the chamber; the recoil reopens the valve, and the cycle starts again 109 times a minute.\n\nIn the video, the author replaces the Walton n°3 valve with a n°1 made of plumbing fittings, with almost no machining: the rate goes from 70–80 to 100–110 strokes/min, the ram no longer stops and delivers about 500 L a day. Its 14 parts open in the “The valve” world (button at the bottom of this sheet).

waste-valve, maintenance (pattern for the 44: a blank line before each bold label)
FR  **Panne à prévoir.** Trois pannes classiques. Le clapet ne démarre pas ou s’arrête (tige qui frotte dans le guide, poids de travers) ; il fuit à la fermeture (gravillon, portée marquée), et la portée du clapet de la vidéo suinte déjà un peu ; la course dérive (écrou desserré) et la consommation avec elle.\n\n**À vérifier.** Écoutez un battement net et régulier de 100 à 110 coups/min, comptez-les au chronomètre et regardez le jet sortir des lumières, jamais avec les doigts. À l’arrêt (V1 fermée), soulevez le poids à la main et lâchez-le : la tige doit retomber d’un trait sur le guide.\n\n**Entretien.** À chaque visite, contrôlez les traits de peinture des écrous, rincez les lumières et la portée, regardez l’usure de la tête.
```

### F14. In English « stroke » means three things, sometimes in one sentence

- **Where**: all EN strings: the readouts (« Strokes / min »), the stroke nut and slider (« Stroke (stroke nut) »), the lessons.
- **Problem.** The English reader meets *stroke* for the **cycle** (« 109 strokes/min »), for the **valve travel** (« a 2.2 mm stroke », « stroke nut »,
  « minimum stroke ») and *beat* for the **four phases** (« the four-beat cycle »). Lesson 3 paragraph 2 says « The stroke is the gap between the
  valve head and its seat… the more water escapes at every stroke »: the same word, two meanings, one sentence. French separates them
  cleanly (« coup » / « course » / « temps »). There are 135 « stroke » and 53 « strokes » in the English lessons, guides and sheets.
- **Change.** For the language reviewer to decide, with the whole vocabulary at once: *beat* for one cycle (« 109 beats/min », « at each beat »),
  *stage* for the four phases (title of lesson 2: « The water hammer and the four-stage cycle »), *stroke* only for the valve travel. My
  rewrites already use « beat » in the one sentence that mixes the two senses (lesson 3 paragraph 2) and otherwise keep « strokes/min » so that they paste
  today.
- **Who / cost**: language reviewer, then sim and lessons; text, about 60 strings.

### F15. Four efficiency figures for one idea, under three names, before the word is defined

- **Where**: lesson 1 (« environ 0,4 »), lesson 5 (« 0,45 », « 0,42 », « 0,3 à 0,6 », « 0,6 courant », « 0,8 »), the strip (« Rendement 45 % »),
  the panel (« η Aubuisson », « η Rankine »).
- **Problem.** The strip says « Rendement 45 % », the panel « η Aubuisson 45 % » and « η Rankine 42 % », lesson 1 says 0.4 (« si le bélier prenait toute la source »),
  the sources 0.6–0.8, the video's implied 0.3–0.6. A newcomer cannot tell which is « the » efficiency, and why a ram that wastes 94 % of its water has a
  45 % efficiency (it is an energy ratio, not a water ratio: nothing says so before lesson 5).
- **Change.** One name, « Rendement », for D'Aubuisson everywhere in the panel (readouts and sizing); Rankine only in the collapsed « Plus de
  chiffres ». Lesson 1 says ≈ 0.4 once, with a pointer to lesson 5 (F5); lesson 5 defines the word in plain terms first (F4); the « Lire les
  chiffres » string of F7 says it is an energy ratio. The puzzle « why does a ram that throws away 94 % of its water have 45 % efficiency? »
  deserves one accurate sentence in lesson 5 (the energy of the water thrown away is the price of the lift; the ratio compares energies, not
  litres): the facts reviewer should word it.
- **Who / cost**: sim + lessons; text.

### F16. Plans: the first sheet shown is the general arrangement, and the two sheets that teach (principle, cycle) are 7th and 8th

- **Where**: `src/drawings/index.ts` (`[...MECHANICAL_SHEETS, ...HYDRAULIC_SHEETS]`), `src/lab.ts` `plans.groups` (ram, valve, hydraulic, site); the kit shows `SHEETS[0]` first and the groups in the given order.
- **Problem.** The visitor who opens « Plans » meets RP-D01 (the 13-part general arrangement), then the valve sheets and the bill of materials; the
  schematic of where each litre goes (D07) and the four-beat diagram (D08) are in the third group. The descriptions are written for a
  draughtsperson (« coupe par l’axe », « pose fermée », « repères 14 à 27 renvoient à la nomenclature »).
- **Change.** Put the hydraulic group first (and D07 first in `SHEETS`), then the site, then the ram, then the valve; start each description with
  one plain line (table below).
- **Who / cost**: lead (order) + drawings (lines); text.

| Sheet | FR | EN |
| --- | --- | --- |
| D07 | À voir en premier : où va chaque litre, de la source au château d’eau. | Start here: where every litre goes, from the spring to the water tower. |
| D08 | Les quatre temps d’un coup, avec la pression et la vitesse de l’eau. | The four beats of a stroke, with the water’s pressure and speed. |
| D09 | Ce que le modèle calcule pour les trois clapets de la vidéo. | What the model computes for the video’s three valves. |
| D10 | Comment choisir un bélier pour un site : règles, tableau, deux exemples. | How to choose a ram for a site: rules, table, two examples. |
| D11 | Le site vu du dessus : où passent les tuyaux. | The site seen from above: where the pipes run. |
| D12 | Les mêmes tuyaux en coupe : la chute et la montée à l’échelle. | The same pipes in section: the fall and the climb to scale. |
| D13 | Le captage et la cuve en coupe : pratique courante, rien n’est dans la vidéo. | The spring box and tank in section: common practice, none of it is in the video. |
| D01 | Le bélier vu de trois côtés, pièce par pièce, avec les repères de la nomenclature. | The ram from three sides, part by part, with the bill-of-materials marks. |
| D02 | Le clapet coupé en deux, fermé puis ouvert : on y voit la course. | The valve cut in half, shut then open: the stroke is visible. |
| D03 | Chaque pièce fabriquée du clapet, avec ses ajustements. | Each made part of the valve, with its fits. |
| D04 | Zoom sur la portée conique et la course, le réglage qui compte. | A close-up of the conical seat and the stroke, the setting that matters. |
| D05 | Où sont l’eau et l’air dans la cloche, et ce que font le clapet anti-retour et le reniflard. | Where the water and the air are in the chamber, and what the check valve and the snifter do. |
| D06 | La liste des 27 pièces, avec ce que la vidéo donne et ce qui est estimé. | The list of the 27 parts, with what the video gives and what is estimated. |

### F17. The ram, catchment and valve overviews do not say which toolbar tool to use, and use « doigt de gant » unexplained

- **Where**: `src/lab.ts`, the three overviews. Pelton Lab's intake overview ends « Activez **Flux** pour suivre l’eau et **Coupe** pour voir l’intérieur du bac »: the ram lab never names a tool.
- **Problem.** The visitor does not know that **Ralenti** (down to ×1/20) is what turns a half-second cycle into something visible, nor that Flux and
  Coupe exist. « Le clapet de la vidéo » and « le bélier de la vidéo » appear before the video has been named (fixed in F2). « Doigt de gant » is a
  plumber's word.
- **Change.** The three texts below (the ram one keeps the three parts named by the old text).
- **Who / cost**: lead; text. The statements about Flux and Slow-mo showing the cycle in the ram world are mine from the code: the 3D role should confirm them.

```
ram overview
FR  Deux clapets et une cloche font tout le travail : le **clapet de choc** claque et stoppe l’eau ; le **clapet anti-retour** laisse passer un peu d’eau vers la **cloche à air** à chaque coup ; la cloche lisse ces à-coups en un débit continu. **À essayer** : activez **Flux** et **Ralenti** (jusqu’à ×1/20) dans la barre d’outils, puis ouvrez **Simulation** et sa section « Le cycle, pas à pas ».
EN  Two valves and an air chamber do all the work: the **waste valve** slams and stops the water; the **delivery check valve** lets a little water through to the **air chamber** at each beat; the chamber smooths those jolts into a steady flow. **Try it**: switch on **Flows** and **Slow-mo** (down to ×1/20) in the toolbar, then open **Simulation** and its “The cycle, step by step” section.
catchment overview
FR  La **source** arrive dans un **regard de captage**, puis dans la **réserve tampon** qui alimente la **conduite motrice**. Quand le bélier prend plus d’eau que la source n’en donne, cette réserve se vide et le bélier s’arrête : c’était le problème du bélier de la vidéo. **À essayer** : dans Simulation, choisissez « Clapet n°3 » et regardez la réserve se vider.
EN  The **spring** flows into a **spring box**, then into the **buffer tank** that feeds the **drive pipe**. When the ram takes more water than the spring gives, this tank empties and the ram stops: that was the problem of the video’s ram. **Try it**: in Simulation, choose “Valve n°3” and watch the tank empty.
valve overview
FR  Le clapet de la vidéo, fabriqué avec des **raccords de plomberie**, un **doigt de gant** (un tube inox fait pour loger une sonde de température), une **tige** et un **poids** taillé dans une barre d’armature. Tout le réglage du bélier se joue ici : la **course** et le **poids** décident du rythme et de la consommation. **À essayer** : cliquez l’écrou de course et ses boutons de test, ou suivez le **Montage**.
EN  The video’s valve, made from **plumbing fittings**, a stainless **thermowell** (a tube made to hold a temperature probe), a **stem** and a **weight** cut from a rebar bar. All the tuning of the ram happens here: the **stroke** and the **weight** set the rhythm and the consumption. **Try it**: click the stroke nut and its test buttons, or follow the **Assembly**.
```

### F18. The hint under the scenarios and three lessons tell the visitor to set the time speed, which the scenario already does (and lesson 6 says the wrong speed)

- **Where**: `scenarioHint` in `ui.ts`; lesson 3 paragraph 2 (« réglez le temps sur ×600 »), lesson 4 paragraph 4 (« ×3600 »), lesson 6 paragraph 2 (« ×3600 »); `applyScenario` and `SCENARIO_PACE` (source-drop = ×600).
- **Problem.** `applyScenario` sets `timeScale = max(current, SCENARIO_PACE)`, so the instruction is redundant; in lesson 6 it is also wrong (the
  code uses ×600 for « La source baisse », the text says ×3600). The visitor who follows it may pick a pace that makes the effect vanish in two
  seconds. The hint also leaves out what the visitor most needs: the pace does not return to ×1 by itself, and the strokes can only be seen at ×1 or in slow motion.
- **Change.** Replace the hint, delete the three parentheses.
- **Who / cost**: sim (hint) + lessons (parentheses); text.

```
scenarioHint
FR  Les scénarios accélèrent le temps tout seuls pour qu’on voie les heures passer. Pour revoir les coups, revenez à ×1 en bas de l’écran et activez Ralenti.
EN  Scenarios speed time up by themselves so that you can watch the hours go by. To see the strokes again, go back to ×1 at the bottom of the screen and switch on Slow-mo.
```

### F19. There is no glossary, and half of the specialist words appear before they are defined

- **Where**: all surfaces. First appearance in the learner's path of: *étiage* (install step 1 and lesson 6), *bar* (lesson 1), *rendement* (lesson 1, strip), *ρ·a·v* (readout, phase cards), *H/h* and *L/h* (alarm chips, lesson 5), *NC State* (lesson 5, install, readouts), *constante de temps* (lesson 4), *exposant polytropique* (air-chamber specs), *charge de la conduite motrice* (the phase 2 card), *DN15*. « Joukowsky » is on plan D08 only.
- **Problem.** A newcomer who meets a word cannot look it up anywhere. The kit has no glossary; the Sources panel is built by `about()` in `src/lab.ts`, so the lead can add one.
- **Change.** A « Mots utiles / Useful words » list at the end of the Sources panel (9 entries, below), and plain-word fixes: « étiage » → « étiage (niveau le plus bas, en fin d’été) » at first use; « NC State » → « l’université NC State (États-Unis) » at first use.
- **Who / cost**: lead; text + one list.

| Word | FR | EN |
| --- | --- | --- |
| Chute (h) | Dénivelé vertical entre le niveau de l’eau de la réserve et le bélier : 7,5 m ici. | Vertical drop between the tank water level and the ram: 7.5 m here. |
| Hauteur de refoulement (H) | Dénivelé entre le bélier et l’arrivée de l’eau : 65 m ici. | Height between the ram and the arrival of the water: 65 m here. |
| Débit (Q, q) | Litres d’eau par minute. Q : pris à la source par le bélier ; q : monté au château d’eau. | Litres of water per minute. Q: taken from the spring by the ram; q: lifted to the water tower. |
| Coup | Un cycle complet du bélier : le clapet claque, un peu d’eau monte, le clapet se rouvre. ≈ 109 par minute. | One whole cycle of the ram: the valve slams, a little water rises, the valve reopens. ≈ 109 a minute. |
| Course | L’écart que le clapet de choc ouvre, environ 2 mm : elle règle la consommation. | The gap the waste valve opens, about 2 mm: it sets the consumption. |
| Bar | Unité de pression : 1 bar ≈ 10 m de hauteur d’eau. | A unit of pressure: 1 bar ≈ 10 m of water height. |
| Rendement (η) | Énergie de l’eau montée divisée par l’énergie de l’eau prise à la source. | Energy of the water lifted divided by the energy of the water taken from the spring. |
| Coup de bélier | Surpression quand une colonne d’eau en mouvement est stoppée net : Δp = ρ·a·v (formule de Joukowsky). | The pressure jump when a moving column of water is stopped dead: Δp = ρ·a·v (the Joukowsky formula). |
| Étiage | Le niveau le plus bas d’une source ou d’un cours d’eau, en fin d’été. | The lowest level of a spring or a stream, at the end of summer. |

### F20. Lesson 4 starts with the check valve although its title and its quiz are about the chamber, and uses « constante de temps »

- **Where**: lesson 4 paragraphs 1–3.
- **Problem.** The order is check valve → chamber → snifter → water-logged. The most visible and most important part, the chamber, is second; the
  check valve is introduced with « D’après la vidéo, ce petit clapet se trouve dans la cloche » before the reader knows what the chamber is. « Une
  constante de temps de 20 min » is jargon for a reader who only needs « le reniflard recharge la cloche en quelques dizaines de minutes ».
- **Change.** Swap paragraphs 1 and 2 (chamber first, then the check valve that keeps what the chamber is fed), and write the snifter's rate in plain
  words with the figure in the chip. No test pins the order of these paragraphs.
- **Who / cost**: lessons; text, no new strings.

### F21. Lesson 6 packs five topics in 408 words, and one sentence has 68 words

- **Where**: lesson 6 paragraphs 2–5; the longest sentence is paragraph 3 (the PVC pipe).
- **Problem.** Buffer tank and deficit, the rigid pipe, anchoring and the finger, the law, potability: five subjects, the most serious ones at the end, in
  sentences of 36–68 words. This is the lesson a visitor must not misread (it ends the learning path and carries the safety wording the tests pin).
- **Change.** Keep the five topics and every pinned word (rigide, ancré, jamais un doigt dans le clapet de choc, DDT, OFB, pas garantie potable, pays);
  cut paragraph 3 to two sentences (below), drop the press-article sentence (it adds a source the visitor cannot check), and add the closing
  « Et maintenant ? » of A5 as the last line.
- **Who / cost**: lessons; text.

```
siting, paragraph 3
FR  La conduite motrice doit être **rigide**, en acier ou en fonte : la surpression ρ·a·v croît avec la vitesse a de l’onde, plus faible dans un tuyau souple. Dans le scénario « Conduite en PVC » (résultat du modèle pour une vitesse supposée de {pvcA} m/s, non une mesure), elle tombe à ≈ {pvcSurge} bar alors qu’il en faut ≈ {need} bar pour ouvrir le clapet de refoulement : le bélier frappe sans rien refouler.
EN  The drive pipe must be **rigid**, steel or cast iron: the surge ρ·a·v grows with the wave speed a, which is lower in a soft pipe. In the “PVC drive pipe” scenario (a model result for an assumed speed of {pvcA} m/s, not a measurement) it falls to ≈ {pvcSurge} bar while ≈ {need} bar are needed to open the delivery check valve: the ram strikes and delivers nothing.
```

### F22. Optional: swap lessons 3 and 4 so that the chamber follows the cycle and the dense tuning lesson comes later

- **Where**: `LESSONS` order; `lessons.test.ts` `IDS` (« the six frozen ids, in order »); `docs/research.md` §11.
- **Problem.** The densest lesson of the first four (442 words, valve n°3 → n°2 → n°1, nut, weight, charts) arrives third, before the simplest concrete part (the chamber, 296 words)
  that completes the cycle's third beat. Density by position: 292, 304, **442**, 296, 398, 408.
- **Change.** Order principle, cycle, air-chamber, waste-valve, sizing, siting: 292, 304, 296, 442 (or about 330 after F4), 398, 408. It costs an edit of a frozen order (test and §11) for the lead, so it is optional; F4 alone brings lesson 3 down to about 330 words.
- **Who / cost**: lead + lessons; test and text order.

### F23. Part sheets: three « short » lines run past 20 words, the Specs tab has no order, and the first sentence of a long description is often not the function

- **Where**: `src/data/parts/*.ts`.
- **Problem.** The `short` lines are the best text of the lab (median 16 words), but `valve-socket` (22), `inlet-flange` (23), `delivery-union` (26) and `waste-valve` (27) carry two ideas. The Specs tab is a list in the order the author thought of it:
  for `waste-valve` it goes sizes → part list (a 40-word value) → rate → stroke and weight → mass → speeds → consumption → delivered → usual rates → force → height, so the identity, the
  settings and the results are interleaved; `ram` has 12 rows, `waste-valve` and `spring-box` 11. On a phone the Overview tab (101–234 words) shows its tip only after two or three screens.
- **Change.** Caps: `short` ≤ 20 words, `description` ≤ 110, `tip` ≤ 30, Specs ≤ 8 rows in this order: identity (size, material) → settings → results (model) → comparisons (sources) → 3D estimates. Move rows
  that only serve the drawings (« Virole (3D) », « Fonds bombés (3D) », « Hauteur au-dessus de la platine ») after a blank « Dimensions du modèle » group, or drop them to the plans.
- **Who / cost**: data; text, mechanical.

### F24. The lessons' intro promises « courtes » and gives no order or time

- **Where**: `lessonsIntro` in `ui.ts`.
- **Problem.** The lessons are 300–440 words (2–3 minutes with the quiz), and the intro says nothing of the order, which matters (1 and 2 explain the machine, 3–4 the parts, 5–6 the site) nor of the quiz.
- **Change.** Replace the string.
- **Who / cost**: sim (ui.ts owner); text.

```
lessonsIntro
FR  Six leçons, à lire dans l’ordre (environ 3 minutes chacune) : chacune ouvre la 3D ou la simulation sur ce dont elle parle, puis un quiz de deux questions. Les deux premières expliquent le principe, les quatre autres les réglages, le dimensionnement et le choix du site.
EN  Six lessons, to read in order (about 3 minutes each): each opens the 3D view or the simulation on what it talks about, then a two-question quiz. The first two explain the principle, the other four the tuning, the sizing and the choice of site.
```

### F25. The valve n°3 story and its caveats are told in 18 places

- **Where**: 3 lessons, 10 sheets (`spring`, `buffer-tank`, `ram`, `waste-valve`, `waste-drain`, `tank-shell`, `tank-lid`, `valve-reducer`, `valve-seat`, `valve-socket`), 3 assembly steps, 2 installation steps; 39 text fields mention « 17 L/min », « dix heures » or « n°3 ».
- **Problem.** The video's thread is the lab's best asset, but a learner who reads a sheet, a lesson and a step meets the same 17 L/min, « estimation de l’auteur », « ≈ 5 700 L déduits » and the three valve sizes
  again and again, with a caveat each time (the tests require them in the lessons). Repetition without a new angle reads as filler, and it uses the words that a phone cannot spare.
- **Change.** The full story with its caveats in two places only: lesson 3 paragraph 1 and the `spring` sheet. Elsewhere, one clause with the figure (« le n°3, qui vidait la réserve en 10 h ») and no caveat, except where a test requires it (lessons 3 and 6).
- **Who / cost**: data + lessons; text.

### F26. The strip shows five numbers without a definition, and one of them has two names

- **Where**: `strip.values` in `src/lab.ts` (« Cadence », « Refoulé », « Rendement », « Réserve », « Consomme »); kit request #3 (tooltip on strip values).
- **Problem.** « Consomme 6,7 L/min » does not say *what* (the water the ram takes from the tank); « Rendement 45 % » is « η Aubuisson » in the panel; on a phone only « Cadence » and « Refoulé » remain. These are the figures that stay on screen in every mode, so they are the first vocabulary a visitor acquires.
- **Change.** Rename « Consomme » → « Eau prise » (EN « Uses » → « Water taken »), and ask the kit for request #3 (a `title` on each value). Suggested
  `title` strings: Cadence « Combien de coups le bélier donne par minute. » / « How many beats the ram gives a minute. »; Refoulé « L’eau qui monte au château d’eau, par jour. » / « The water that rises to the water tower, per day. »; Rendement « Énergie de l’eau montée / énergie de l’eau prise. » / « Energy of the water lifted / energy of the water taken. »; Réserve « Ce qu’il reste d’eau dans la cuve tampon. » / « The water left in the buffer tank. »; Eau prise « Ce que le bélier prend à la cuve, par minute. » / « What the ram takes from the tank, per minute. »
- **Who / cost**: lead (labels) + kit (#3); text.

### F27. Two different « ×1 » on screen: the time speed pills and the slow-motion button

- **Where**: the kit's strip (« ×1 ×60 ×600 ×3600 ») and toolbar (« Ralenti ×1 »).
- **Problem.** The first speeds up simulated time (hours), the second slows the animation (down to ×1/20). Both read « ×1 » at load, both are named by a multiplier, and the lessons say « réglez le temps sur ×600 »: a visitor will press the wrong one and see nothing.
- **Change.** Kit: label the pills « Temps ×1 / ×60 / ×600 / ×3600 » (EN « Time ») and the slow-motion « Ralenti ×1/20 » once active; lab: always say « le temps » or « le ralenti » (the rewrites above do).
- **Who / cost**: kit; text.

### F28. The path ends on a quiz: nothing says what to do next

- **Where**: the kit's last lesson (« Suivant » absent after lesson 6); the lab has no closing text.
- **Problem.** A visitor who answers the last question gets « Correct », and the counter « Leçons 6/6 ». No hint that the Simulation, the sizing calculator or the Installation guide are the natural next step, nor that the sheets
  hold the details.
- **Change.** Add as the last line of lesson 6 (see F21; the test needs the paragraph rule relaxed), text below.
- **Who / cost**: lessons; text.

```
« Et maintenant ? » (A5)
FR  Et maintenant ? Rejouez l’histoire de la vidéo dans **Simulation** (clapet n°3, puis n°1), essayez votre propre site dans « Dimensionner un bélier », ou suivez le guide d’**Installation** du captage à la maison.
EN  What next? Replay the video’s story in **Simulation** (valve n°3, then n°1), try your own site in “Size a ram”, or follow the **Installation** guide from the catchment to the house.
```

### F29. Quiz explanations are 47–71 words and the same text answers a right and a wrong click

- **Where**: all 12 `explain` fields; the kit prints one explanation, preceded by « Correct » or « Faux ».
- **Problem.** Fifty-word explanations are the right size on a desktop but they appear under the question in a bottom sheet, below the choices. They are accurate and teach the distractors, which is rare and good; the test (> 80 characters) can only ask for more length, never less.
- **Change.** Leave as is. When rewriting, open with the verdict in four words (« Oui : … », « Non : … ») and cap at 60 words; the new explanations above are 45–60. Kit: lock the question once answered right, and disable a wrong choice after it is clicked (so that guessing costs a visible attempt).
- **Who / cost**: lessons; text. Kit: K5.

### F30. The lesson's primary button is « Lancer le scénario » whichever scenario it plays, and a lesson is « done » by clicking until green

- **Where**: the kit's `renderLessonsPanel` (the button label is a common string; `markLessonDone` counts a right click even after wrong ones).
- **Problem.** The button does not say what it will do (« Écrou de course vissé » is named only in the paragraph above), and the progress counter measures persistence, not understanding.
- **Change.** Kit K2: a label per lesson (`Lesson.focus.label`) and a count of tries. Meanwhile, name the scenario in the first sentence of the paragraph that opens it (done in F4 and F11).
- **Who / cost**: kit.

### F31. The parts catalogue offers an « Électrique » filter that returns nothing

- **Where**: the kit's parts catalogue (request #8).
- **Problem.** An empty category invites a click and an empty list; the visitor suspects a bug.
- **Change.** Kit request #8 (show only the categories that have parts).
- **Who / cost**: kit.

### F32. The Sources panel opens on 240 words of callouts before the link to the video

- **Where**: `about()` in `src/lab.ts`: disclaimer, generic ram, safety, law, then « Source principale ».
- **Problem.** The order is defensible (safety first) but the one thing a visitor looks for here, the link to the video that the whole lab rebuilds, is the fifth item, below a 70-word legal callout. A visitor who wants to see the real farm scrolls past warnings that are also in lesson 6 and in the installation guide.
- **Change.** Put the main source first (one line), then the four callouts, then the chapters and the links, then the glossary of F19. No text change.
- **Who / cost**: lead; trivial.

### F33. Installation tips repeat themselves and the survey tip returns in step 6

- **Where**: `install.ts`: step 1 tip « Mesurez la chute à la verticale, pas le long du tuyau » and step 6 tip « La chute se mesure à la verticale… ».
- **Problem.** The same advice twice, and step 6 (drive pipe) has 222 words with its tip and warning.
- **Change.** Delete the tip of step 6 (the text of the same step already asks for a continuous slope and the measure is vertical in step 1).
- **Who / cost**: data; text.

### F34. Source names sit in the middle of instructions

- **Where**: install steps 2–4, 6, 7, 9 (« fiche Oxfam », « Practical Action », « NC State Extension », « selon NC State »), lesson 5.
- **Problem.** A newcomer reads « Practical Action pour la crépine, Oxfam pour la vanne » as if they were tools or brands. Credit matters (the brief requires it) but a source name interrupts a step.
- **Change.** In the text keep « (S8) » style references only, and let the Sources panel carry the names and links (it already lists S8, S9, NC State). First mention of each: add the nature (« l’université NC State, États-Unis », « l’ONG Oxfam »).
- **Who / cost**: data; text.

### F35. The Specs tab uses words nobody introduced

- **Where**: `air-chamber` (« Exposant polytropique : 1,2 »), `buffer-tank`, `drive-pipe`, `outlet-valve` (« Tenue en pression », « DN15 »), `waste-valve` (« Masse mobile totale »).
- **Problem.** The Specs tab is for specialists, which is fine, but the first jargon row of a sheet is read as if it were required knowledge.
- **Change.** Where a row's value is only an assumption of the model (polytropic exponent, time constant), put it last and tag it « hypothèse du modèle » (it already is); say once in the Sources glossary what a polytropic exponent is (« comment l’air se comprime : 1 = à température constante »). No other change.
- **Who / cost**: data; text.

### F36. The title and tagline do not exist below 1 100 px, and the title's job (to say what the lab is) is then done by one H2

- **Where**: the kit's CSS (`.brand > div { display: none }` below 1 100 px); `<title>` and meta description in `index.html`.
- **Problem.** The owner's concern was that the title was too vague; on a tablet or phone there is no title at all, only the logo. The H2 « Un bélier hydraulique, à quoi ça sert ? » compensates, and it is the reason to keep it a question. The browser tab and a shared link do carry the full name and the purpose (`<title>`, meta description): good.
- **Change.** Kit K4: one truncated line of the title next to the logo on a phone. Until then F2 makes the first paragraph self-sufficient.
- **Who / cost**: kit.

### Kit requests that follow from this review (to add to `docs/kit-requests.md`, appended)

- **K1. Overview actions that go to a mode, placed above the text on a phone.** `SceneDef.overview.actions[].mode` (« Voir la simulation », « Ouvrir les leçons ») and, when the sheet is a bottom sheet, the action row before the paragraphs. Why: the first button is below the fold on a 390 px screen. (F2, F17.)
- **K2. Lessons with named actions and a « look at » line.** `Lesson.look?: L` and `Lesson.actions?: { label: L; mode?; scene?; preset?; scenario?; hold?: string }[]`, a generalisation of request #11 (several buttons per lesson: « Voir le clapet n°3 », « Voir le n°1 », « Ouvrir le calculateur »). (F8, F30.)
- **K3. Guide transport bar above the card, or sticky.** « Suivant » is below the fold on most steps. (F9.)
- **K4. Brand title on tablet and phone**, one truncated line. (F36.)
- **K5. Quiz: lock after a right answer, disable a wrong choice after it is clicked, count tries.** (F29, F30.)
- Already written and still needed: #3 (strip tooltips), #7 (frame the subject above the bottom sheet), #8 (hide empty categories), #11 (lessons that open the simulation). #10 is half obsolete: `paragraphs()` already splits on blank lines for descriptions, maintenance and step text; only `tip`, `warning` and `design` do not.

---

## 6. Five small additions that would help most

| # | Addition | What the visitor gets | Cost |
| --- | --- | --- | --- |
| A1 | **« Rejouer l’histoire de la vidéo »**: three chips at the top of the Simulation panel (1 · Clapet n°3 : la réserve se vide / 2 · n°2 : marche mal / 3 · n°1 : 500 L par jour). Each applies the preset, sets ×3600, and puts the status sentence and the tank curve in view | the video's thread, visible from the first screen of the mode, in three clicks | small UI (uses `applyPreset` and `timeScale`), 3 strings |
| A2 | **« Voir un coup »**: a button above the intro that goes to the ram, freezes phase 1 and lights « Phase suivante »; each phase card opens on a bold plain headline (below) | the aha in one click | small UI (`showRam`, `holdPhase` exist), 4 strings |
| A3 | **« Devinez la panne »**: a button that plays one of the 8 scenarios without naming it; the visitor picks the cause among four chips, then the caption of F7 is revealed | outcome 7 (diagnosis) has a first exercise; reuses the existing scenarios and captions | small UI, 1 string (the captions exist after F7) |
| A4 | **A « À regarder » line and an « Ouvrir la Simulation » button on lessons 2, 3, 5** | the lesson and the view it talks about meet | text now (F8); kit K2 for the button |
| A5 | **« Et maintenant ? »** at the end of lesson 6 and a one-line « Suite » at the foot of each overview | the path has an end and a next step | text (F28) |

```
Plain headline of each phase card (A2; bold first line, then the existing card)
1 Accélération  FR  L’eau dévale et s’échappe par le clapet resté ouvert.                         EN  The water rushes down and escapes through the open valve.
2 Fermeture     FR  Le clapet claque : l’eau est stoppée net et la pression bondit.               EN  The valve slams: the water is stopped dead and the pressure jumps.
3 Refoulement   FR  Le choc ouvre le clapet anti-retour : un peu d’eau entre dans la cloche.       EN  The shock opens the check valve: a little water goes into the chamber.
4 Recul         FR  L’eau rebondit en arrière, le clapet de choc se rouvre : tout recommence.      EN  The water bounces back and the waste valve reopens: it all starts again.
```

---

## 7. Mobile reading (390 px)

What the screenshots and the kit's panel show: the bottom sheet takes about 52 % of the height (≈ 440 px); the ram of the ram world is mostly behind it (only the gauge shows, kit request #7);
the brand title, the lesson counter and all but two strip values are gone; the guide's « Étape / Pièces montées » counters take about 90 px before the text; a lesson's chips and formula come before its body (about 200 px, my estimate from the kit's code).

| Surface | Visible without scrolling | What must be cut or split |
| --- | --- | --- |
| Landing | H2 + about 70 words; **both buttons below the fold** | keep the two paragraphs at about 55 words each (F2); K1 puts the buttons first |
| Guide step | the two counters + 45 words | text ≤ 80 words, tip ≤ 30, warning ≤ 30; split steps over 150 words (assembly 23, installation 1 and 11); no anecdote of the video in the text (F9) |
| Lesson | about 200 px of chips and formula, then 3–4 lines | ≤ 3 chips; paragraphs ≤ 60 words, sentences ≤ 28; the « À regarder » line last (F4, F8) |
| Quiz | question + choices of 60–80 characters (two lines each) + a 50-word explanation below | equal-length choices (F3), explanations ≤ 50 words (F29) |
| Part sheet | `short` + 3 tabs + 60 words of the Overview | description ≤ 110 words with the function in sentence 1; tip ≤ 30; Maintenance in three paragraphs (F13, F23) |
| Simulation | preset, hint, 6 scenario rows | intro first, cycle before the readouts, nine readouts collapsed (F1) |

---

## 8. What I could not check

- **Behaviour, not text.** I did not run the app (no browser, no server, as instructed): hover, scroll lengths, the animation of the cycle under Flux and Slow-mo, whether Coupe shows the water level in the chamber, and the real height of the sheet are inferred from the kit's code and the screenshots. Statements about what the 3D view shows (F8, F17) are marked for the 3D role to confirm.
- **An open lesson on a phone, the English mobile view, and the alarm chips on a phone**: no screenshot of them existed.
- **The screenshots predate the landing text of commit b9e0f66**: I read the text in the source.
- **No user test.** Every claim about difficulty (density, jargon, guessability) is a judgment from the texts and counts, not a measurement on learners. The 6/8 longest-answer count is exact; what a learner does with it is not.
- **Facts.** I did not re-check figures against the model (the facts reviewer does); I flagged one definition (Rankine, F4) and one explanation to be worded by them (F15). My rewrites use only existing `FIG` / `LESSON_FIG` names and numbers already printed in the lab; tests that pin wording or counts (`lessons.test.ts` lines 133–143, 260–300, 600–650; `data.test.ts` step counts) will need the changes named in F3, F4, F6, F9.
- **Gates.** I ran none (`npm test` and the others): the data were read by bundling the modules into a throwaway script outside the repository.
- **Pelton Lab** was compared on lesson length, quiz balance and overview texts only.
