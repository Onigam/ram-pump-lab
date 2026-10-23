# Research notes — <lab name>

> Written by the research role **before** any modelling (see BRIEF.md). Copy this file to `docs/research.md`.
> Everything the other roles rely on is here, with its source. Never invent a figure: if the source is silent, write
> "unknown" and say how it will be estimated.

## 1. Sources

| Source                      | Link | What it gives                               |
| --------------------------- | ---- | ------------------------------------------- |
| Main video (title, channel) |      | the device, the key figures, the timestamps |
| Maker / official data       |      | official dimensions, ratings, drawings      |
| Other                       |      |                                             |

Transcript: `docs/transcript.md` (use the `youtube-transcriber` skill).

## 2. Key figures to reproduce

The simulation must retrieve these (one unit test each). `video` = timestamp in the source.

| Quantity | Value | Unit | Conditions | Source / timestamp |
| -------- | ----- | ---- | ---------- | ------------------ |
|          |       |      |            |                    |

## 3. Official dimensions and data

Dimensions in `src/three/dims.ts` (metres, one source of truth for the 3D model, the drawings and the simulation).
List the official ones here first; estimates are marked as such.

| Dimension | Value | Official or estimated | Source |
| --------- | ----- | --------------------- | ------ |
|           |       |                       |        |

## 4. Parts list (draft)

20–35 parts for a Lite lab: id, name FR/EN, category, what it does.

## 5. Physics

Equations, assumptions, parameters and their ranges, scenarios (what breaks, what the lesson shows).

## 6. Versions

Default: **one version**. Write here, in three lines, why more than one is really necessary (two really different
machines to compare, or a change of scale that teaches something a single version cannot). The kit does not yet have a
version switch: raise it with the lead before building anything.

## 7. Safety, legal and credits

Hazards of the device (fire, CO, gas, pressure, mains), the warning to show, the regulation that applies, credits for
the video and the maker. The lab is an _independent educational reconstruction_, not an official drawing or product.
