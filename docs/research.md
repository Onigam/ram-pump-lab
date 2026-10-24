# Research notes — Ram Pump Lab

Cadrage (wave 1, research role) of the hydraulic ram pump lab, 2026-10-23. Everything the other roles rely on is here,
with its source. "Derived" means computed by us from reported figures, with the assumptions stated. "Unknown" means the
sources are silent: it must be estimated and flagged, never invented.

## 0. Summary and decisions to validate

- **The device**: a hydraulic ram ("bélier hydraulique", "pompe bélier"): water falling a few metres through a drive
  pipe, stopped abruptly by a self-acting waste valve, lifts a small part of itself much higher, with no electricity or
  fuel. Two moving parts (waste valve and delivery check valve), an air chamber, a snifter valve.
- **Proposed main source**: L'énergie partout, _Création clapet de choc pour que notre bélier hydraulique ne s'arrête
  plus_ (19:57). It has the figures (fall, lift, flows, valve sizes, strokes per minute, daily volume), a real
  autonomy installation (a farm water supply) and a build story (an over-consuming ram fixed with a new waste valve made
  of plumbing parts). The roadmap named the two videos below first; they stay as secondary sources. **This replaces the
  roadmap's implicit main video (confirmed by the owner, §8).**
- **One version**, no V1/V2. The "before / after the new valve" story becomes simulation **presets** (valve n°3 / n°2 /
  n°1), not two versions (§6).
- **Level**: Lite (2 worlds: the site and the ram; ≈ 25 parts; 3 drawings; 5 lessons).
- **No manufacturer data was found** for the Walton ram of the main video (§3): the 3D model is a generic ram sized by
  its drive pipe, with the video's custom waste valve as the detailed centrepiece.

## 1. Sources

| #   | Source                                                                                                              | Link                                                                                   | What it gives                                                                                                      | Access                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| S1  | L'énergie partout, _Création clapet de choc pour que notre bélier hydraulique ne s'arrête plus_ (2024-05-19, 19:57) | https://www.youtube.com/watch?v=mc0gq5rObcM                                            | **main source**: installation figures, valve sizes, build, stroke rates                                            | French auto captions (many recognition errors); transcript kept privately in `docs/transcript.md` (ignored) |
| S2  | Bernard Le Poder, _Un bélier hydraulique pour arroser le potager - fabrication low-tech_ (2021, 5:32)               | https://www.youtube.com/watch?v=_6331LAYAA0                                            | a second, smaller installation: 5 m³/day at 15 m lift, "low pressure" type up to 20 m; three builds with 1" valves | no captions: only the description and the chapters                                                          |
| S3  | Média24, _Ce moteur à eau français de 228 ans fonctionne sans électricité_ (2024, 1:27)                             | https://www.youtube.com/watch?v=WMldjNyxNWk                                            | principle, parts list, invention in 1796 (a short summary, no figures)                                             | French auto captions                                                                                        |
| S4  | NC State Extension, _Hydraulic Ram Pumps_                                                                           | https://content.ces.ncsu.edu/hydraulic-ram-pumps                                       | delivery formula, drive pipe ≥ 5 × fall, sizing table, 20–100 cycles/min                                           | web page; the most credible engineering source found                                                        |
| S5  | NITK virtual labs, _Performance Characteristics of Hydraulic Ram_                                                   | https://fmc-nitk.vlabs.ac.in/exp/hydraulic-ram/theory.html                             | D'Aubuisson and Rankine efficiency definitions, 40–120 cycles/min, L/D 150–1000                                    | web page                                                                                                    |
| S6  | Wikipedia (EN, FR) _Hydraulic ram_ / _Bélier hydraulique_                                                           | https://en.wikipedia.org/wiki/Hydraulic_ram                                            | history, typical efficiency 60 % (up to 80 %), drive pipe 3–7 × fall                                               | encyclopedia, secondary                                                                                     |
| S7  | Réussir, _Un bélier hydraulique pour remplir les abreuvoirs_                                                        | https://www.reussir.fr/bovins-viande/un-belier-hydraulique-pour-remplir-les-abreuvoirs | a farm installation (12 m fall, 65 m lift, 380 m path); **its figures are physically inconsistent** (§2)           | press article                                                                                               |

Credits for the lab: video authors (S1: L'énergie partout, who thanks Didier Nebreda for his advice on rams; S2: Bernard
Le Poder), the extension and teaching pages above. The lab is an independent educational reconstruction; no footage or
images are reused.

## 2. Key figures to reproduce

`reported` = stated in a source; `derived` = ours. Timestamps are those of S1 unless noted. Each row becomes a unit test of
the simulation (or a scenario check).

| #   | Quantity                                                          | Value                                                                                                            | Kind                                  | Conditions / source                                                    |
| --- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------- |
| K1  | Fall (drive pipe, source to ram)                                  | **7.5 m**                                                                                                        | reported                              | S1 01:55                                                               |
| K2  | Drive pipe length                                                 | ≈ **20 m** (L/h = 2.7)                                                                                           | reported                              | S1 01:55                                                               |
| K3  | Delivery pipe                                                     | ≈ **300 m** long, lifts water to **65 m** above the ram (H/h = 8.7)                                              | reported                              | S1 01:15, 02:01                                                        |
| K4  | Rule "1 m of fall lifts water 10 m", length-independent           | lift ratio ≈ 10                                                                                                  | reported                              | S1 01:00                                                               |
| K5  | Ram                                                               | Walton n°3 (Bordeaux), 1" class                                                                                  | reported                              | S1 01:44                                                               |
| K6  | Source flow                                                       | 10 L/min two years earlier, **7.5–7.8 L/min** now                                                                | reported                              | S1 02:30                                                               |
| K7  | Waste valve sizes                                                 | n°1 = 15×21 (DN15, ½"), n°2 = 20×27 (¾"), n°3 = 26×34 (1")                                                       | reported                              | S1 03:54                                                               |
| K8  | Consumption with the n°3 valve                                    | ≈ **17 L/min** (estimate, not measured) > source flow → buffer tank empties, ram stops after ≈ **10 h**          | reported                              | S1 00:00, 02:07                                                        |
| K9  | n°2 valve                                                         | works badly and still consumes too much                                                                          | reported                              | S1 04:25                                                               |
| K10 | **n°1 valve: delivery**                                           | ≈ **500 L/day** (0.347 L/min), enough for the household                                                          | reported                              | S1 00:13, 04:43                                                        |
| K11 | Strokes per minute                                                | 70–80 (old valve) → **100–110** (new valve)                                                                      | reported                              | S1 13:40                                                               |
| K12 | Delivered volume per stroke                                       | 3.2–3.5 mL at 100–110 strokes/min                                                                                | derived                               | K10 / K11                                                              |
| K13 | Implied D'Aubuisson efficiency η = q·H / (Q·h)                    | **0.30 / 0.40 / 0.60** for a drive flow Q of 10 / 7.5 / 5 L/min                                                  | derived                               | K1, K3, K10; Q after the modification was not measured                 |
| K14 | Upper bound of the delivery (η = 1)                               | 0.87 L/min = 1 250 L/day at Q = 7.5 L/min                                                                        | derived                               | q ≤ Q·h/H                                                              |
| K15 | Minimum closing velocity of the waste valve to push water to 65 m | **0.5–0.65 m/s** (Joukowsky, Δp = ρ·a·v with a = 1 000–1 200 m/s in a rigid steel pipe, Δp ≈ 6.4 bar)            | derived                               | physics, to be checked by the model                                    |
| K16 | Second installation                                               | 5 m³/day at 15 m lift, drive/fall unknown                                                                        | reported                              | S2 description                                                         |
| K17 | Typical energy efficiency                                         | 0.6, up to 0.8                                                                                                   | reported                              | S6, S4 (E = 0.6)                                                       |
| K18 | Delivery estimate (SI form of S4)                                 | q = η·Q·h/H; with η = 0.6, Q = 7.5 L/min: ≈ 750 L/day                                                            | derived                               | S4; the video's 500 L/day corresponds to η ≈ 0.4                       |
| K19 | Cycle rates in the literature                                     | 20–100 /min (S4), 40–120 /min (S5)                                                                               | reported                              |                                                                        |
| K20 | Drive pipe length rules                                           | ≥ 5 × fall (S4), 3–7 × (S6), 3–5 × (S7), L/D 150–1000 (S5)                                                       | reported                              | S1's 20 m for 7.5 m (2.7 ×) is short: a good "pipe too short" scenario |
| K21 | Sizing table (drive pipe → min source flow → max delivery)        | ¾" → 7.6 L/min → 3.8 m³/day; 1" → 22.7 L/min → 7.6 m³/day; 1½" → 53 L/min → 15 m³/day; 2" → 95 L/min → 26 m³/day | reported (converted from gpm and gpd) | S4 table 2                                                             |

**Sanity checks done.** (1) S7's figures (16 L/min supplied, 3.5 L/min delivered, 12 m fall, 65 m lift) give η = 3.5·65 /
(16·12) = **1.18**: impossible (more energy out than in). We do **not** use S7 as a validation source. (2) K8 and K21
agree: a 1" ram needs about 17–23 L/min, the farm only has 7.5, which explains why it kept stopping.

## 3. Official dimensions and data

- **Walton n°3**: manufacturer sheet **not found** (searches of the Walton name, "Bordeaux", "n°3"); the video shows the
  capacity table on screen only. To estimate: a 1" ram (S4 table 2), delivery pipe about half the drive pipe, body in
  cast iron. Ask the owner whether he has the data or wants the lab to say "generic ram".
- **Waste valve (S1)**: built from plumbing parts: base plate with a welded fitting (26×34 or 20×27), reduction to 15×21,
  threaded body about 7–8 cm with the exhaust ports, lock nut, female-female sleeve, a stainless-steel **thermowell**
  ("doigt de gant" for solar-heater probes) as guide, a **6 mm threaded rod** turned into a stem with machined sleeves
  (fit within 0.1 mm), a stainless screw cut short with a **conical seat** (the seat is milled to the same cone angle),
  **two nuts** on top (the first sets the stroke and so the consumption, the second locks it), a counterweight machined
  from a **30–32 mm rebar bar**, small **fins** under the valve that make it turn a little at every stroke (so the seat
  wears evenly). Exact lengths are not given: they are estimated from the fitting sizes (to be flagged).
- **Generic ram body (S4)**: drive pipe diameter sets the ram: ¾", 1", 1½", 2"…; delivery pipe = half the drive pipe.
- **Dimensions file**: `src/three/dims.ts` is the single source (metres). Everything not in K7/S1 above is an estimate and
  is marked as such in the part sheets and the drawings.

## 4. Worlds and parts (draft, shared ids)

**Worlds** (Lite = two): `site` (hillside of the video: spring catchment with buffer tank, 20 m drive pipe falling 7.5 m,
the ram in its pit with a drain, the 300 m delivery pipe climbing 65 m to the water tower, the house) and `ram` (the
device, with the waste valve as the detailed assembly; section / x-ray show the cycle).

The data role and the 3D role share these ids (kebab-case). Part sheets and `registry.add` must match.

| World | Id               | Name FR / EN                                             | Category   | Note                                 |
| ----- | ---------------- | -------------------------------------------------------- | ---------- | ------------------------------------ |
| site  | `spring`         | Captage de la source / Spring catchment                  | site       |                                      |
| site  | `buffer-tank`    | Réserve tampon / Buffer tank                             | hydraulic  | the tank that empties in ≈ 10 h (K8) |
| site  | `drive-pipe`     | Conduite motrice / Drive pipe                            | hydraulic  | 20 m, 7.5 m fall, rigid              |
| site  | `ram-pit`        | Regard du bélier / Ram pit                               | structure  |                                      |
| site  | `delivery-pipe`  | Conduite de refoulement / Delivery pipe                  | hydraulic  | 300 m, up 65 m                       |
| site  | `water-tower`    | Château d'eau / Water tower                              | structure  |                                      |
| site  | `house`          | Habitation / House                                       | site       |                                      |
| ram   | `ram`            | Bélier (Walton n°3) / Ram body                           | hydraulic  | cast body, inlet, drain              |
| ram   | `inlet-valve`    | Vanne d'arrivée (V1) / Inlet valve                       | hydraulic  |                                      |
| ram   | `waste-valve`    | Clapet de choc / Waste (impulse) valve                   | hydraulic  | assembly of the parts below          |
| ram   | `valve-seat`     | Portée conique / Conical seat                            | mechanical | milled at the stem's cone angle      |
| ram   | `valve-stem`     | Tige du clapet / Valve stem                              | mechanical | stainless screw + sleeves            |
| ram   | `valve-guide`    | Doigt de gant (guide) / Thermowell guide                 | mechanical |                                      |
| ram   | `stroke-nut`     | Écrou de réglage de course / Stroke nut                  | mechanical | sets the consumption                 |
| ram   | `lock-nut`       | Contre-écrou / Lock nut                                  | mechanical |                                      |
| ram   | `counterweight`  | Poids (barre d'armature) / Counterweight                 | mechanical | 30–32 mm rebar                       |
| ram   | `valve-fins`     | Ailettes / Fins                                          | mechanical | rotate the valve at each stroke      |
| ram   | `base-plate`     | Platine de base / Base plate                             | structure  |                                      |
| ram   | `delivery-valve` | Clapet anti-retour de refoulement / Delivery check valve | hydraulic  |                                      |
| ram   | `air-chamber`    | Cloche à air / Air chamber                               | hydraulic  |                                      |
| ram   | `snifter`        | Reniflard / Snifter valve                                | hydraulic  |                                      |
| ram   | `gauge`          | Manomètre / Pressure gauge                               | hydraulic  |                                      |
| ram   | `outlet-valve`   | Vanne de sortie (V3) / Outlet valve                      | hydraulic  |                                      |
| ram   | `drain-valve`    | Vanne de vidange (V2) / Drain valve                      | hydraulic  |                                      |
| ram   | `strainer`       | Crépine / Strainer                                       | hydraulic  |                                      |

Guides: **assembly** of the ram and the waste valve (≈ 12 steps); **installation** on the site (≈ 6 steps: catchment and
buffer tank, drive pipe, ram pit, delivery pipe, tank, first start). The video's own "troubles" (a flat valve with a
glued seal that died in 24 h, an off-axis weld that leaked, a threaded rod used as an axle) become _Tip_ / _Warning_
callouts.

## 5. Physics (for the physics role)

Rigid-column model of the drive pipe (reuse `@onigam/lab-kit/sim/hydraulic`: friction, Joukowsky, wave speed) with an
event-driven cycle:

1. **Acceleration**: waste valve open, `L·dv/dt = ρg·h − (K_waste + f·L/D)·ρv²/2` (per unit area), valve drag grows with v².
2. **Closure** when the drag exceeds the valve weight + spring: v → 0 over a short closing time; surge
   `Δp = ρ·a·v_c` (K15).
3. **Delivery**: if body pressure > static head `ρgH` the delivery valve opens; the air chamber charges and pushes
   `q_stroke` into the delivery pipe until the pressure falls back to ρgH (energy balance: `½ρAL·v_c²·η_h = ρgH·q_stroke`).
4. **Recoil**: the pressure wave reverses, the valve reopens (weight + suction), the snifter admits a little air.

Outputs: strokes/min, drive flow Q (= waste + delivered), delivered flow q, D'Aubuisson `η_D = q·H/(Q·h)` and Rankine
`η_R = q·(H−h)/((Q−q)·h)` (S5), delivery per day, pressure peaks.
Parameters (all editable live): fall h, drive pipe length L and diameter D, delivery head H and length, source flow,
waste valve size (n°1/n°2/n°3), stroke (the stroke nut), counterweight, air chamber volume (and "water-logged"),
buffer tank volume.

**Presets** (the "versions"): `valve-3` (K8: consumes 17 L/min, tank empty after ≈ 10 h, ram stops), `valve-2` (K9),
`valve-1` (K10–K11: ≈ 500 L/day at 100–110 strokes/min). **Scenarios**: source drops from 10 to 7.5 L/min; stroke nut
turned (consumption and delivery change, below a minimum stroke the ram stops: S1 13:13); air chamber water-logged
(no air: harsh hammer, no delivery smoothing); drive pipe too short (L/h < 3); delivery head too high for the fall
(H/h > ~12); snifter blocked.

**Tests** (`src/sim/*.test.ts`): K10 (≈ 500 L/day within 20 % for valve n°1, Q = 7.5 L/min), K11 (strokes/min in
70–120 range, rising when the valve is smaller/lighter), K8 (valve n°3: consumption ≈ 17 L/min, tank empties in 8–12 h),
K14 (q never above Q·h/H), K15 (no delivery below the minimum closing velocity), D'Aubuisson/Rankine consistency.
**Open modelling question**: the closure velocity of a real valve depends on its geometry, weight and stroke, none of
which is documented: the model calibrates one valve coefficient per size on K8/K10/K11 and says so in the "design" note.

## 6. Versions

**One version.** Reason: the lab shows one installation (the farm ram). The interesting change (the new valve) is a
parameter, not a different machine. No second version is needed; the kit has no version switch (BRIEF §3).

## 7. Safety, legal, credits

- **Hazards**: low. Water hammer pressures (several bar): the drive pipe must be rigid (steel or cast iron; plastic
  pipes are discouraged in S7) and the ram anchored; never put a finger in the waste valve while running; a pressure
  gauge on the delivery side.
- **Legal (France)**: taking water from a source or stream is regulated (water rights, ecological continuity);
  the water of a spring is **not guaranteed potable**: say so. Check with the DDT / OFB. Other countries differ.
- **Notice**: independent educational reconstruction, not an official drawing or a product; credit and link S1–S6; no
  images or footage from the videos.

## 8. Decisions of the owner (2026-10-23)

1. **Main source: S1** (L'énergie partout, _Création clapet de choc…_). Confirmed. S2 and S3 stay secondary.
2. **Walton n°3 data**: none found; the lab presents a **generic 1" ram** and says so. Confirmed (keep the proposal).
3. **Scope**: two worlds, `site` and `ram` (§4). Confirmed.
4. **Story**: presets and scenarios of §5, from valve n°3 to valve n°1, as the lab's thread. Confirmed.
5. **Second smaller ram (S2)**: **skipped for the Lite lab** (the owner kept the proposals; no extra preset). It can be added
   later as an enrichment (5 m³/day at 15 m lift), only if its fall and pipe figures can be sourced.

## 9. Next steps (not started)

Wave 1 physics (tests first, from §2) → wave 2 3D ‖ data (ids of §4) → wave 3 drawings ‖ lessons → wave 4 QA →
checkpoint with the owner. The lead asks the owner's approval before launching a team (token cost).

## 10. Owner feedback after wave 2 (2026-10-24) and the enrichment plan

**Feedback**: (1) the title "Labo du bélier" is too vague: it must say "hydraulique" and the page must say what the device is for
and what it offers (done: title, tagline, landing text, `lab.json`); (2) more detail per device, like Pelton Lab; (3) more
specialised agents; (4) more ways to look at and understand the device, like Pelton; (5) a learning part.

**Gap with Pelton Lab (measured on the repos)**

|                          | Pelton Lab                                                                     | Ram lab now         |
| ------------------------ | ------------------------------------------------------------------------------ | ------------------- |
| Worlds                   | 4 (site, intake, turbine, power room), the detailed ones reached from the site | 2 (site, ram)       |
| Parts                    | 67                                                                             | 25                  |
| Assembly / install steps | 19 / 10                                                                        | 13 / 7              |
| Lessons / quiz questions | 14 / 28                                                                        | 0 / 0 (mode hidden) |
| Drawing sheets           | 10+ A3 sheets                                                                  | 0 (mode hidden)     |
| Lab-specific interaction | magnifier on the intake screen, a "test the trip" button on a part, scenarios  | scenarios only      |

**Proposal (Pelton level), by specialised role, all against ids frozen first in a cadrage v2 (lead)**

1. 3D, valve world: the video's waste valve at workshop scale (its ≈ 10 parts re-homed from the ram world, reached from the
   `waste-valve` part), exploded build, section of the conical seat, fits and dimensions overlaid.
2. 3D, catchment world: spring box, buffer tank (the one that empties in 10 h), strainer, overflow, drive-pipe inlet.
3. Data: sheets and guides for the new worlds; every part gets "what goes wrong / how to check".
4. Simulation and learning tools: the cycle step by step (the four phases, frozen on demand, with the pressure and velocity
   traces), a sizing calculator (drive pipe, flow, head), more scenarios, "test" buttons on parts (slam the valve, drown the chamber).
5. Lessons: **6 lessons** (the owner found 12 to 14 too many for a simpler device) with 2 quiz questions each, linked to a
   scenario or a part (see §11).
6. Drawings, mechanical: general arrangement, waste valve exploded and sectioned, cone seat detail with fits, bill of materials.
7. Drawings, hydraulic: site layout and profile (7.5 m fall, 65 m lift), principle diagram, cycle diagram with traces, sizing chart.
8. Reviewers (read-only, report only): facts (every figure in the texts against research and the model), language (FR/EN),
   pedagogy (level, order, quiz), then QA (visual regression at 3 widths, performance on a phone, floating parts).

## 11. Wave 3 contract: four worlds, frozen ids, roles (2026-10-24, validated by the owner: "niveau Pelton", 6 lessons)

`src/part-ids.ts` is the code form of this section and the contract between the roles: the catalogue, the 3D registries,
the guides, the lessons and the drawings use exactly these ids (44, up from 25). Only the lead edits it. The tests are the
executable specification: `src/lab.test.ts`, `src/data/data.test.ts`, `src/three/*.test.ts` are red until the roles deliver.

**Worlds** (top bar order): `site` (default) → `catchment` → `ram` → `valve`.

| World                    | Ids (frozen)                                                                                                                                                                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `site` (8)               | `spring`, `buffer-tank`, `drive-pipe`, `ram-pit`, `waste-drain` (new), `delivery-pipe`, `water-tower`, `house`                                                                                                                            |
| `catchment` (9, all new) | `spring-box`, `gravel-filter`, `feed-pipe`, `tank-shell`, `tank-lid`, `overflow-pipe`, `intake-screen`, `drive-gate-valve`, `tank-drain`                                                                                                  |
| `ram` (13)               | `ram`, `inlet-flange` (new), `inlet-valve`, `strainer`, `waste-valve` (the whole valve, one part), `delivery-valve`, `air-chamber`, `snifter`, `gauge`, `delivery-union` (new), `outlet-valve`, `drain-valve`, `foundation` (new)         |
| `valve` (14)             | re-homed from `ram`: `base-plate`, `valve-seat`, `valve-stem`, `valve-guide`, `valve-fins`, `counterweight`, `stroke-nut`, `lock-nut`; new: `valve-socket`, `valve-reducer`, `valve-nipple`, `valve-sleeve`, `valve-head`, `stem-sleeves` |

Names of the new ids (FR / EN) and what they are:

- `waste-drain` Évacuation des eaux de rejet / Waste-water drain: the pipe or ditch that carries the water thrown out by the
  waste valve away from the pit (it is most of the drive flow: 6.3 of 6.7 L/min for valve n°1).
- `spring-box` Regard de captage / Spring box; `gravel-filter` Filtre à gravier / Gravel filter; `feed-pipe` Conduite
  d'alimentation / Feed pipe (spring box to tank); `tank-shell` Cuve de la réserve tampon / Buffer tank shell (5 700 L,
  derived, Ø 1.9 × 2.0 m in dims.ts); `tank-lid` Couvercle et aération / Lid and vent; `overflow-pipe` Trop-plein / Overflow;
  `intake-screen` Crépine de départ / Intake screen (keeps debris and air out of the drive pipe); `drive-gate-valve` Vanne de
  départ de la conduite motrice / Drive-pipe gate valve; `tank-drain` Vidange de la réserve / Tank drain.
- `inlet-flange` Bride d'arrivée / Inlet flange; `delivery-union` Raccord union de refoulement / Delivery union;
  `foundation` Massif d'ancrage / Anchor block (the ram must be anchored: hammer pressures of several bar).
- `valve-socket` Manchon soudé 26×34 / Welded 26×34 socket (on the base plate); `valve-reducer` Réduction 26×34 → 15×21 /
  Reducer; `valve-nipple` Mamelon fileté à lumières / Ported nipple (threaded 7–8 cm, the exhaust ports are machined in it);
  `valve-sleeve` Manchon femelle-femelle / Female-female sleeve (takes the guide); `valve-head` Tête du clapet (vis inox à
  portée conique) / Valve head (stainless screw with a conical face); `stem-sleeves` Manchons de la tige / Stem sleeves
  (machined, fit within 0.1 mm, S1 09:02).

**Guides cross worlds** (kit v0.1.4, `GuideStep.scene`): the **assembly** builds the waste valve in the `valve` world
(≈ 9–11 steps, default world of the guide) then fits it on the ram in the `ram` world (≈ 8–10 steps; the last ram steps
install `waste-valve`, then the first start). The **installation** starts on the `site` (survey step, no part), details the
`catchment` (≈ 4 steps, `scene: 'catchment'`), then goes back to the `site` (drive pipe, pit and drain, delivery pipe, tower and
house, first start): ≈ 11 steps. `spring`, `buffer-tank` and `house` may stay out of the installation (the farm has them).

**Scenarios and part actions** (sim role): existing `source-drop`, `stroke-nut`, `water-logged`, `short-pipe`, `high-lift`,
`snifter-blocked`; **new, frozen ids** `plastic-pipe` (a plastic drive pipe: low wave speed, the surge no longer opens the check
valve) and `heavy-weight` (a heavier counterweight: slower, harder strokes). Cycle step by step: the four phases (`accel`,
`close`, `deliver`, `recoil`) can be frozen and stepped, with the pressure and velocity traces. A sizing calculator (drive pipe,
source flow, head → minimum pipe length, expected delivery, warnings). "Test" buttons on part sheets (`src/part-actions.ts`).

**Lessons (6, 2 quiz questions each, short)** — ids frozen: `principle` (a small flow lifted high by a large flow falling),
`cycle` (water hammer and the four phases), `waste-valve` (tuning: stroke, weight, valve n°3 to n°1), `air-chamber` (chamber,
check valve, snifter), `sizing` (drive pipe, source flow, D'Aubuisson and Rankine efficiencies), `siting` (catchment, the
tank that empties, rigid pipe, law and potability).

**Drawings** (A3, numbers `RP-Dnn`, groups `ram`, `valve`, `hydraulic`, `site`; each sheet has `scene` and `parts` with frozen
ids): mechanical role: `general-arrangement` (ram, D01), `waste-valve-assembly` (valve, D02), `waste-valve-parts` (valve, D03),
`seat-cone-detail` (valve, D04), `chamber-section` (ram, D05), `bom` (ram, D06); hydraulic role: `principle-diagram` (hydraulic,
D07), `cycle-diagram` (hydraulic, D08), `performance-chart` (hydraulic, D09), `sizing-table` (hydraulic, D10), `site-plan`
(site, D11), `site-profile` (site, D12), `catchment-layout` (site, D13).

**Ownership** (a role edits only its files; shared files are listed with their single owner)

| Role                                             | Files                                                                                                                                                                                                                                                       |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3D-A (valve and ram)                             | `src/three/valve/**`, `src/three/ram/**`, `src/three/common.ts`, `src/three/cut.ts`, `src/three/ram.test.ts`, `src/three/valve.test.ts`, the `VALVE`/`RAM`/`CHAMBER`/… sections of `dims.ts`, `docs/3d.md`                                                  |
| 3D-B (catchment and site)                        | `src/three/catchment/**`, `src/three/site/**`, `src/three/site.test.ts`, `src/three/catchment.test.ts`, the `SITE`/`CATCHMENT`/`TANK`/… sections of `dims.ts`                                                                                               |
| Data-A (ram and valve sheets, assembly)          | `src/data/parts/ram.ts`, `src/data/parts/valve.ts`, `src/data/assembly.ts`, `src/data/parts-ram.test.ts`                                                                                                                                                    |
| Data-B (site and catchment sheets, installation) | `src/data/parts/site.ts`, `src/data/parts/catchment.ts`, `src/data/install.ts`, `src/data/parts-site.test.ts`                                                                                                                                               |
| Sim (engine, panel, strings, part actions)       | `src/sim/**`, `src/panels/**`, `src/i18n/ui.ts` (the only role that edits it), `src/part-actions.ts`, `docs/physics.md`                                                                                                                                     |
| Lessons (wave 3b)                                | `src/data/lessons.ts`, `src/data/lessons.test.ts`                                                                                                                                                                                                           |
| Drawings-M and Drawings-H (wave 3b)              | `src/drawings/mechanical/**` and `src/drawings/hydraulic/**`                                                                                                                                                                                                |
| Lead                                             | `src/part-ids.ts`, `src/lab.ts`, `src/lab.test.ts`, `src/data/data.test.ts`, `src/data/part-helpers.ts`, `src/data/units.ts`, `src/data/parts.ts`, `src/three/index.ts`, `src/three/test-utils.ts`, `src/drawings/index.ts`, `README.md`, `public/lab.json` |

`dims.ts` has one owner per section: re-read before each edit, change only your sections, add names, never rename.
Waves: 3a = 3D-A, 3D-B, Data-A, Data-B, Sim; 3b = Lessons, Drawings-M, Drawings-H (they need the final dims, sheets and
scenarios); then the read-only reviewers (facts, language, pedagogy) and QA; then the checkpoint.
