# Fix wave: binding rules for every role (read with docs/wave3-rules.md)

The four reviews (`docs/reviews/facts.md`, `language.md`, `pedagogy.md`, and `docs/qa.md`) are the work list. Each role applies
the findings that concern **its own files** (the "who" column of each finding, and the file named in it). Several roles work at the
same time on disjoint files, as in wave 3; the ownership table of `docs/research.md` §11 still holds. The lead has already fixed
the four blocking facts (F01 to F04): check them, do not redo them.

## How to work a finding

- Apply it, or **decline it with a reason** (it contradicts a source, the model or a test; or it needs another role's file): the
  reason goes in your final report, one line per declined finding. Do not silently skip.
- Where a review gives ready-to-paste text, use it (you may improve it; never weaken a fact). Where two reviews disagree, **facts win
  over language, language over pedagogy**, and say so in the report.
- Tests that pin the old wording, counts or order are yours to update when the finding requires it (never to hide a failure:
  say what changed and why). Keep the whole suite, typecheck, format and build green at the end.
- Edit only your files; put what you need from others in your report.

## Decisions taken by the lead (binding)

1. **No source codes or research numbers shown to the visitor.** Never write S1…S9 or K4, K15… in a text a visitor reads (part
   sheets, guides, lessons, interface strings, drawings): name the source (« NC State », « Wikipédia », « Practical Action »,
   « Oxfam », « la vidéo (03:54) »). The Sources panel lists the sources. Timestamps of the main video stay (« vidéo 03:54 »).
   Exception: the compact provenance discs of the drawings (reported / derived / model / calibrated / estimate) are defined by a
   legend on each sheet and stay.
2. **No internal vocabulary in visitor text**: not « monde / world » (say « la vue du clapet », « the valve view » or simply name
   the thing), no « (monde ram) », no raw part ids, no « gelé », « figé » for a frozen id, no « modèle 3D » unless the
   visitor needs it.
3. **The glossary of `language.md` is binding** (31 rows): one term per concept in each language. Notably the ram pit is a « fosse »,
   never a « regard » (a « regard de captage » is the spring box); use the glossary's choices for weight, delivery valve, the
   quantity Q, the water thrown out by the waste valve, strainer versus screen, stroke versus cycle in English.
4. **French spacing is applied by the kit** since v0.1.7 (fixed and narrow spaces at text resolution): write plain spaces in the
   sources; never type U+00A0 or U+202F yourself. French « n° 1 » reads « n°1 » in the source (the kit adds the fixed space). English
   uses « No. 1 », never « n° ».
5. French: « vous »; guide step titles in the infinitive, bodies in the imperative. English: British spelling.
6. **Facts rules of the facts review stand**: nothing is attributed to the video that it does not say (fins, the catchment, the
   snifter, the gauge, the strainer, valves V1 to V3, the union, the foundation, the "farm" which comes from another source, motives
   of the author); a « dérivé / derived » tag only when the value is computed from reported figures, an estimate otherwise; the model's
   figures are « résultat du modèle / model result »; the water-logged peak is quoted with one value everywhere (take the engine's,
   rounded as the lessons do: « plus de 7 bar » in prose).
7. **Pedagogy targets**: guide steps ≤ 80 words (a hard cap of 90), one orienting sentence at each change of view (valve → ram,
   site → catchment → site); lesson paragraphs ≤ 60 words and sentences ≤ 28 words; every lesson tells the visitor what to look at
   (a sentence starting « Regardez… » / « Look at… » in its first paragraph); quiz choices balanced to ±10 % in length, right answers
   not always the longest and not always in the same position; the four beats, the law and potability, anchoring and the finger rule
   are asked at least once.
8. The generic 1" ram is not the Walton n°3 (say it where the ram is described); estimates are marked; no torque; no "build it for
   real" values.

## Final report (≤ 500 words)

Findings applied (ids), findings declined with the reason, tests changed and why, what you need from other roles, what you could
not verify, and what still looks weakest.
