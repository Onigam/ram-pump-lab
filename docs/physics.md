# Physics of the ram pump lab

The simulation in `src/sim` (pure TypeScript, no DOM, no three.js, runs in Node under vitest). It reproduces the figures
of the main source video (S1, research §2, K1–K21) with a model of the stroke cycle that is _integrated in time_, not
drawn: the stroke rate, the water used, the water delivered, the efficiencies and the pressure peaks are **outcomes** of
a hydraulic circuit and of the geometry of the waste valve.

Words used for the status of a number: **reported** (stated in a source, K-number), **derived** (computed from reported
figures), **calibrated** (the sources are silent, the value was chosen so that the model retrieves reported figures),
**assumed** (the sources are silent and no figure depends on it strongly). Nothing is hidden in an equation: each
calibrated or assumed constant is a named constant with a comment in `physics.ts` or `presets.ts`.

Files: `types.ts` (parameters and state, with units), `physics.ts` (constants and pure formulas), `cycle.ts` (the stroke
model and its steady-state solver), `presets.ts` (ranges, presets, scenarios), `engine.ts` (`RamSim implements LabSim`),
tests next to the code.

## 1. The model

### 1.1 Three nodes joined by orifices (cycle.ts)

A lumped-parameter version of the rigid-column theory (research §5), in SI units.

```text
 spring ─ buffer tank ─┐ fall h
                       │   drive pipe: rigid column, inertance ρL/A, Darcy friction, minor losses
                       ▼
                 ┌── ram body ──┐ compliance C_b = A·L/(ρ·a²)  (elasticity of pipe + water)
   waste valve ◄─┤              ├─► delivery check valve ─► air chamber ─► delivery pipe ─► tower (head H)
   (poppet, z)   └──── snifter ─┘      (ideal one-way orifice)   C_a(φ)       R = Z + friction
```

1. **Drive pipe.** A rigid water column of velocity `v`:
   `ρL·dv/dt = ρ·g·h − p − ρ·(λL/D + K)·v|v|/2`, with `p` the pressure of the body, `λ` the Darcy factor of the kit
   (`frictionFactor`, roughness 0.1 mm for aged galvanised steel) and `K = 3` for the entrance, strainer, valve V1 and
   bends.
2. **Ram body.** A node of compliance `C_b = A·L/(ρ·a²)` (the volume of the pipe over the bulk modulus ρa²):
   `C_b·dp/dt = A·v − Q_w − Q_d − Q_s`. With the column this forms an LC circuit of characteristic impedance `ρ·a/A`: a
   column of velocity `v` stopped suddenly produces exactly the **Joukowsky surge `Δp = ρ·a·v`** (K15); the circuit then
   rings and swings below the static pressure, which is the **recoil** that reopens the waste valve.
3. **Waste valve** (the "clapet de choc"). A poppet of mass `m` (bare valve + counterweight) hanging on its stroke nut,
   closed by the body pressure acting on its seat area `A_s`: `m·z̈ = m·g − p·A_s`, `z` = lift in `[0, stroke]` (hard,
   inelastic stops). The water leaves through the curtain area under the lifted valve, `A_gap = min(π·d_s·z, π·d_s²/4)`,
   `Q_w = C_d·A_gap·√(2p/ρ)`. The pressure drop across the gap is the drag on the valve: it **closes by itself when the
   flow is fast enough** (`p·A_s > m·g`), at a closing velocity that depends on stroke, weight and seat. When `p < 0` the
   open valve passes air (ρ_air), which holds the pressure near zero.
4. **Delivery.** The check valve is an ideal one-way orifice `Q_d = C_d·A_d·√(2(p − p_a)/ρ)` for `p > p_a`. The air chamber
   has compliance `C_a = V_air/(n·p_abs)` (polytropic `n = 1.2`, `V_air = φ·V_ch` at the working pressure, `φ` = air
   share) and drains into the delivery pipe through `R = Z + R_f`: `C_a·dp_a/dt = Q_d − (p_a − ρ·g·H)/R`. `Z = ρ·a/A_d` is the
   wave impedance of the (HDPE, 350 m/s) delivery pipe, what a stroke pulse meets during the first round trip of the
   pipe; `R_f` is its Darcy friction. With a big chamber the line sees the smoothed flow and the pressure stays within
   a few hundredths of a bar of `ρgH`; with **no air** the pulse meets `Z` directly: higher peaks, less delivery.
5. **Snifter.** A 1.5 mm orifice that lets air in when `p < −1 kPa`. A vapour clamp at −0.9 bar opens a cavity (column
   separation) if the recoil goes lower.

The cycle is **not coded as phases**: it emerges. Accelerate with the valve hanging open → the drag reaches the weight →
the valve snaps shut (about 18 ms) → the column's momentum raises the pressure (Joukowsky) until the check valve opens →
delivery while the column decelerates against `ρgH` → the column stops, the check valve closes, the LC circuit rebounds:
the column flows **backwards** (−0.5 m/s), the pressure dips below the weight/area threshold, the valve falls open,
the snifter admits air → the column slows, reverses, accelerates again. The label `phase` (`accel`, `close`,
`deliver`, `recoil`) is derived from these events.

### 1.2 Numerics

Backward Euler with one scalar monotone equation per step in the body pressure (bracketed secant, so the orifices
cannot make it unstable); the chamber is eliminated analytically (`p_a' = α + β·Q_d`, closed-form check valve flow). Step
= `min(0.2 ms, T_ring/300)` with `T_ring = 2πL/a`. First-order accuracy: halving the step moves the stroke rate by
< 0.2 % and the delivered flow by ≈ 2 % (the values below were calibrated at the step in use). A solve of the cycle
averages (7 strokes) takes 8–15 ms.

### 1.3 Cycle averages: `solveSteady`

`solveSteady(config, airFraction, H)` integrates the circuit from rest for `3 + 4` strokes (the chamber pressure is set at
every closure to its equilibrium `ρgH + R·q` from the last stroke's delivery, so the slow charging of the chamber, a
time constant `Z·C_a` of several seconds, does not have to be integrated) and returns the averages: strokes/min, `Q`
(net water taken from the drive pipe), `q` (through the check valve), `Q − q` (waste), per-stroke volume, the two
efficiencies, closing velocity, pressure peak and minimum, valve impact speed, share of each phase. It also detects a
valve that **never closes** (terminal velocity reached: the water runs out) and a valve that **closes and never
reopens** (recoil too weak: `H` barely above `h`).

### 1.4 Two time regimes (engine.ts)

- **Stroke cycle**: the same circuit, integrated in real time and sub-stepped for the animation, at `dt × slowMo` (so
  the slow-motion tool slows the cycle itself). Its state is what the 3D role animates.
- **Slow quantities** integrate the _averages_ × `dt × timeScale`: buffer tank
  (`dV/dt = S − Q`, clamped to `[0, V_tank]`, a full tank overflows), delivered volume, the clock, the air share of the
  chamber, the scripted events of the scenarios. At ×3600 a day passes in 24 real seconds without simulating 150 000
  strokes; the day is cut at midnight so that `deliveredToday` restarts exactly.
- The averages are re-solved when a parameter changes (at most ~8 times a second while a slider moves) and when the
  chamber air share has changed by more than 20 % (log scale).
- **Status.** `running` → `stalled` when the tank is empty while the ram draws more than the spring gives
  (`stallReason: 'tank'`, K8) or when the valve stays shut (`'stuck'`). A stalled ram does not restart by itself, even if the tank
  refills: `restart()` is the manual restart of the video (refused if the tank is empty). A ram that cycles but
  delivers nothing stays `running` (alarm `noDelivery`).
- **Chamber air.** `dφ/dt = (φ_target − φ)/τ`: with the snifter working the chamber is topped up (`φ = 0.6`, τ = 20 min); with
  the snifter blocked the air dissolves into the water (`φ → 0`, τ = 6 h, assumed); the water-logged fault sets `φ` to
  0.4 % at once.

## 2. Parameters (all editable live, `RamSim.set`)

| Parameter (`RamParams`)          | Unit  | Range          | Default (video)           | Status                                 |
| -------------------------------- | ----- | -------------- | ------------------------- | -------------------------------------- |
| `fall` h                         | m     | 2–30           | 7.5                       | reported K1                            |
| `driveLength` L                  | m     | 5–60           | 20 (never shorter than h) | reported K2                            |
| `driveDiameter` D                | mm    | 15–54          | 27 (1", DN25 inner bore)  | assumed (K5: a 1" ram)                 |
| `pipeMaterial`                   | –     | steel, PVC, PE | steel                     | wave speed 900 / 500 / 350 m/s, see §3 |
| `deliveryHead` H                 | m     | 5–150          | 65                        | reported K3                            |
| `deliveryLength`                 | m     | 20–1000        | 300                       | reported K3                            |
| `sourceFlow`                     | L/min | 1–40           | 7.5                       | reported K6 (10 two years earlier)     |
| `tankVolume`                     | L     | 200–20000      | 5 700                     | **derived** from K8                    |
| `valve`                          | –     | n°1, 2, 3      | per preset                | reported K7 (seat bore 15, 20, 26 mm)  |
| `stroke`                         | mm    | 0.5–8          | 2.2 / 2.0 / 2.7           | **calibrated** (K8, K10, K11)          |
| `counterweight`                  | g     | 0–1000         | 360 / 720 / 640           | **calibrated** (K8, K10, K11)          |
| `chamberVolume`                  | L     | 0.5–20         | 4                         | assumed                                |
| `waterLogged`                    | –     | on/off         | off                       | fault                                  |
| `snifterBlocked`                 | –     | on/off         | off                       | fault                                  |
| `slowMo`, `timeScale`, `running` | –     | kit            | 1, 1, true                | kit time controls                      |

Every value set is clamped to its range. Editing anything but the time controls makes the preset `custom`; scripted
events of a scenario are cancelled when the user edits the quantity they change.

## 3. Calibrated constants and how they were chosen

The video does not give the weight, stroke or geometry of any valve. Three things were chosen, in this order, and all
three are named constants.

1. **Wave speed of the lumped circuit, steel: 900 m/s** (`WAVE_SPEED.steel`). The research quotes 1 000–1 200 m/s for a
   rigid steel pipe (K15); a bare 27 × 3 mm tube is ≈ 1 400. The lumped LC circuit rings 1.57 times slower than the real
   pipe of the same wave speed (`2πL/a` against `4L/a`) and one constant serves both the amplitude of the surge and the
   timing of the recoil. Re-calibrating the n°1 valve for exactly K10 (500 L/day) at each wave speed gives:

   | a (m/s)                         | 700  | 800  | **900**  | 1 000 | 1 100 | 1 200 |
   | ------------------------------- | ---- | ---- | -------- | ----- | ----- | ----- |
   | strokes/min at 500 L/day        | 90   | 102  | **109**  | 123   | 133   | 141   |
   | min. closing velocity (K15) m/s | 0.81 | 0.71 | **0.63** | 0.56  | 0.51  | 0.47  |

   K11 (100–110 strokes/min, ±10 % so ≤ 121) requires `a ≲ 970`; K15 (≤ 0.65 m/s) requires `a ≳ 870`. 900 is in the
   window. The plastic values are Korteweg estimates (PVC) and the kit constant (HDPE).

2. **Valve settings (stroke, counterweight)** per valve (`VALVE_SETTINGS`). The family of (stroke, weight) pairs that gives
   the same consumption and stroke rate is a curve; one point per valve was picked on it, with a round stroke and a
   plausible mass (the video's weight is a piece of 30–32 mm rebar, ≈ 5.5 kg/m, so a few hundred grams):

   | Valve (seat) | stroke | counterweight (+ bare mass) | calibrated on                                          | result                                                     |
   | ------------ | ------ | --------------------------- | ------------------------------------------------------ | ---------------------------------------------------------- |
   | n°1 (DN15)   | 2.2 mm | 360 g (+ 60 g)              | K10 500 L/day, K11 100–110 /min, K12 3.2–3.5 mL, K13 η | 109 /min, Q = 6.7 L/min, q = 500 L/day, 3.2 mL, η_D = 0.45 |
   | n°3 (DN25)   | 2.7 mm | 640 g (+ 130 g)             | K8 17 L/min, K11 70–80 /min, K8 tank empty in 10 h     | 78 /min, Q = 17.0 L/min, 10.0 h                            |
   | n°2 (DN20)   | 2.0 mm | 720 g (+ 90 g)              | K9 only (consumes more than 7.5 L/min)                 | 93 /min, Q = 11.0 L/min, tank empty in 27 h                |

   The bare masses (60, 90, 130 g), the discharge coefficient of the gap (0.65), of the check valve (0.6) and of the
   snifter (0.6) are assumptions that the calibration absorbs: the weight and stroke found are valid _with_ them.

3. **Buffer tank volume: 5 700 L**, derived from K8: it lasted ≈ 10 h at the deficit (17 − 7.5) L/min →
   9.5 × 600 = 5 700 L. Not in the video.

Other **assumed** constants (see `physics.ts`): drive pipe inner Ø 27 mm, roughness 0.1 mm, minor losses K = 3,
delivery check valve area = ½ drive pipe section, delivery pipe Ø 0.6 × drive Ø (≈ ½" for the 1" ram, S4), air chamber 4 L
with 60 % air at working pressure, polytropic exponent 1.2, snifter Ø 1.5 mm cracking at 1 kPa, air time constants
(6 h loss, 20 min refill), alarms at L/h < 2.5 (K20) and H/h > 12 (research §5).

## 4. What the 3D role reads (`RamState`, every field is documented with units in `types.ts`)

All values are already slowed by `slowMo`: do not slow them again with `view.slowMo`.

| Field                                                                                                             | Meaning                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `phase`                                                                                                           | `accel`, `close`, `deliver`, `recoil`, `stalled`                                                                                                 |
| `wasteValve` 0..1                                                                                                 | lift / stroke: 0 on the seat, 1 on the stroke nut. Closing takes ≈ 18 ms and opening ≈ 13 ms at ×1 (a frame or two): use `slowMo` or interpolate |
| `deliveryValve` 0..1                                                                                              | check valve opening, lags the flow by 6–12 ms                                                                                                    |
| `driveVelocity` m/s, `driveFlowNow` L/min                                                                         | in the drive pipe; negative during the recoil                                                                                                    |
| `wasteJetFlow` L/min                                                                                              | jet out of the waste valve (≥ 0)                                                                                                                 |
| `deliveredFlowNow`, `outletFlowNow` L/min                                                                         | through the check valve into the chamber; from the chamber into the delivery pipe (smooth)                                                       |
| `snifterFlow` L/min                                                                                               | air drawn in during the recoil                                                                                                                   |
| `bodyPressure`, `peakPressure` bar                                                                                | body pressure now, highest of the last stroke                                                                                                    |
| `chamberPressure` bar, `airLevel` 0..1                                                                            | chamber pressure; fraction of the chamber height filled by air (top part)                                                                        |
| `strokeCount`, `cycleProgress` 0..1                                                                               | counter of valve closures; progress through the stroke (0 at a closure)                                                                          |
| `strokesPerMin`, `driveFlow`, `wasteFlow`, `deliveredFlow`, `deliveredPerDay`, `etaD`, `etaR`                     | cycle averages (0 when stalled)                                                                                                                  |
| `closingVelocity`, `minClosingVelocity`, `surgeBar`, `waveSpeed`                                                  | K15: velocity at which the valve closes, the minimum that opens the check valve, ρ·a·v, a                                                        |
| `status`, `stallReason`, `alarms`                                                                                 | `running`/`stalled`; `tank`/`stuck`/`none`; the alarm keys                                                                                       |
| `tankLitres`, `tankLevel` 0..1, `hoursToEmpty`                                                                    | buffer tank (level for the 3D tank)                                                                                                              |
| `airFraction`                                                                                                     | air share of the chamber (drops with a blocked snifter)                                                                                          |
| `simTime`, `day`, `hour`                                                                                          | simulated clock (the run starts at 08:00)                                                                                                        |
| `fall`, `driveLength`, `driveDiameter`, `deliveryHead`, `stroke`, `valve`, `liftRatio` (H/h), `lengthRatio` (L/h) | copies of the site                                                                                                                               |

The surge `ρ·a·v` is what the pressure _would_ reach if it could not escape: the body pressure is clipped at the chamber
pressure once the check valve opens; it only shows its peak when the check valve cannot open (water-logged chamber,
head too high, plastic pipe: 8–10 bar).

`sim.scope` (last 1.6 s: time, pressure, velocity, valve) and `sim.history` (tank level, delivery, 48 simulated hours)
feed the panel's charts; `sim.sweep(patch)` solves the averages for other parameters without touching the live run.

## 5. Presets and scenarios

| id                | What                                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `valve-3`         | the ram as installed: Q = 17 L/min, tank empty after 10 h, ram stops (K8)                                                   |
| `valve-2`         | the intermediate test: Q = 11 L/min, still too much, tank empty after 27 h (K9)                                             |
| `valve-1`         | the new valve: 109 strokes/min, Q = 6.7 L/min (below the 7.5 of the spring, so it never stops), 500 L/day (K10, K11)        |
| `source-drop`     | valve n°3, spring 10 L/min, falls to 7.5 L/min after 1 h (K6)                                                               |
| `stroke-nut`      | valve n°1, the nut is turned in by 0.1 mm every 10 simulated minutes: consumption falls, delivery stops near 1.5 mm (13:13) |
| `water-logged`    | valve n°1, no air in the chamber: peaks 7.2 bar instead of 6.5, delivery −40 %                                              |
| `short-pipe`      | valve n°1, L = 8 m (L/h = 1.1): 259 strokes/min, η_D 0.42 instead of 0.45, uses more than the spring                        |
| `high-lift`       | valve n°1, H = 100 m (H/h = 13): the surge cannot open the check valve, nothing is delivered                                |
| `snifter-blocked` | valve n°1: the air share falls with τ = 6 h; after ≈ 15 simulated hours the chamber is water-logged                         |

## 6. Key figures → tests → results

Tolerances are those of the brief. "Model" is the value of the preset after the calibration of §3.

| K            | Figure (source)                                               | Target                          | Model                                               | Tolerance         | Test (`src/sim/…`)                                                             |
| ------------ | ------------------------------------------------------------- | ------------------------------- | --------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------ |
| K1–3, K5, K6 | fall 7.5 m, L 20 m, H 65 m, 300 m, 7.5 L/min, 1" ram          | as reported                     | presets use them                                    | exact             | `engine.test.ts` › the site of the video › K1, K2, K3, K5, K6                  |
| K4           | 1 m of fall lifts 10 m, any length (S1 01:00)                 | lifts at H/h = 10 for L 12–40 m | delivers, closing velocity ±10 %                    | ±10 %             | › K4: the ram lifts to H/h = 10 whatever the length                            |
| K7           | valves 15×21, 20×27, 26×34                                    | seat bores 15, 20, 26 mm        | `VALVES`                                            | exact             | `physics.test.ts` › K7                                                         |
| K8           | n°3 valve: ≈ 17 L/min, tank empty after ≈ 10 h, ram stops     | 17 L/min; 10 h                  | 17.0 L/min; 10.0 h; stalled, restart OK             | Q ±20 %, 8–12 h   | › K8 (four tests: Q, hours, run at ×3600, K21 cross-check) and › state machine |
| K9           | n°2 valve works badly, still consumes too much                | Q > 7.5 L/min                   | 11.0 L/min, empty after 27 h                        | qualitative       | › K9                                                                           |
| K10          | n°1 valve: ≈ 500 L/day                                        | 500 L/day                       | 500 L/day                                           | ±25 %             | › K10                                                                          |
| K11          | 100–110 strokes/min (n°1); 70–80 (old)                        | 100–110; 70–80                  | 109; 78                                             | ±10 %             | › K11 (n°1) and › K8 / K21 › K11 (n°3)                                         |
| K12          | 3.2–3.5 mL per stroke (derived)                               | 3.2–3.5 mL                      | 3.2 mL                                              | ±25 %             | › K12                                                                          |
| K13          | η_D = 0.30 / 0.40 / 0.60 for Q = 10 / 7.5 / 5 L/min (derived) | 0.3–0.6                         | 0.45 (Q = 6.7)                                      | range             | › K13; arithmetic in `physics.test.ts` › K13                                   |
| K14          | q ≤ Q·h/H (η ≤ 1); 1 250 L/day at 7.5 L/min                   | bound                           | η_D < 1 in every case (0.54 at most in the presets) | strict            | › K14 / energy (9 cases + 16-site sweep); `physics.test.ts` › K14              |
| K15          | min. closing velocity 0.5–0.65 m/s (Joukowsky)                | 0.5–0.65 m/s                    | 0.63 m/s (a = 900); no delivery below               | ±15 % on the edge | › K15 (five tests); `physics.test.ts` › K15                                    |
| K16          | second installation (S2)                                      | –                               | not modelled (owner decision, research §8.5)        | –                 | –                                                                              |
| K17, K18     | efficiency 0.6, up to 0.8; q = η·Q·h/H (S4, S6)               | 0.6–0.85 reached                | best tuned n°3: 0.71                                | range             | › K17, K18; `physics.test.ts` › K18                                            |
| K19          | 20–100 /min (S4), 40–120 /min (S5)                            | 40–120                          | 78–109 /min (presets)                               | range             | › K19                                                                          |
| K20          | drive pipe ≥ 3–5 × the fall                                   | short pipe: lower efficiency    | L = 8 m: η_D 0.42 vs 0.45 at 20 m                   | ≥ 3 % lower       | › monotone behaviours › K20                                                    |
| K21          | S4 sizing table, 1": 22.7 L/min → 7.6 m³/day                  | n°3 consumption 17–23 L/min     | 17.0 L/min, 1.5 m³/day                              | range             | › K8 and K21 agree                                                             |

Other behaviours tested in `engine.test.ts`: status transitions running → stalled → restart (and refusal without water,
and the "stuck" stall); a simulated day at ×3600 equals the mean rate × 1 day within 2 % (and equals an independent solve
and the stroke-by-stroke live run within 10 %); independence from the frame size; `slowMo` slows the cycle only; pause;
midnight rollover; monotone behaviours (bigger H/h → less delivery; smaller stroke → less consumption until the ram
stops pumping; water-logged → harsher peaks and less delivery); every scenario and its alarms; clamping of `set`; no
non-finite value under random live edits. `physics.test.ts` checks the arithmetic of the derived figures by hand.

## 7. Known limits of the model

- **Single-mode lumped circuit**, not a full wave solution of the drive pipe. It gives the Joukowsky amplitude, the
  recoil and a plausible waveform, but the ring period is 1.57× that of a real pipe, hence the calibrated wave speed.
  Pressure waves in the delivery pipe are reduced to one resistor (`Z + friction`); no resonance of the line.
- **Ideal check valve** (no leak back, no closing delay) and an **ideal seat** (the video says the new valve leaks a
  little): the model delivers slightly more than a real ram would for the same strokes.
- **No valve bounce**, no added mass or damping of the valve in its guide, no wear.
- **No mechanical lower stop on the stroke, and the valve size matters less than its tuning.** Turning the nut in cuts
  the consumption of _any_ valve down to ≈ 2–3 L/min before the delivery stops. In the video the stock n°3 valve could
  not be tamed that way (K8, 13:13: "each ram size has a minimum consumption"). In this model a n°3 valve with a long
  stroke (4.2 mm) and no counterweight uses 7 L/min and delivers 830 L/day at η_D = 0.71, better than the n°1 preset: the
  story n°3 → n°1 is told by the presets (the stock Walton valve is heavy), the physics alone would let a well-tuned n°3
  work on the 7.5 L/min spring. The mechanical limits of the real valves are unknown; the lesson "tuning matters as much
  as sizing" is true to the model.
- **K9 (n°2 "works badly")** is modelled only by its consumption: build quality (flat seal, loose fit) is not.
- A ram below its **minimum stroke** keeps striking (high rate, ≈ 2 L/min) but delivers nothing; it does not "stop" as a
  mechanism. It is flagged by the alarm `noDelivery` and the status stays `running`.
- **Region H < 1.5 h**: the recoil is too weak to reopen the valve; reported as `stalled`, reason `stuck`. Not a real
  operating point of a ram (the delivery is lower than the fall's equivalent).
- The drive pipe is never shorter than 1.05 × the fall. Constant water density and temperature.
- The calibration rests on a handful of figures (K8, K10, K11) and on guessed valve masses: it is a faithful _reproduction
  of the video_, not a design tool. Dimensions are estimates until a maker sheet is found (research §3).
- The alarm "drive pipe short" lights below L/h = 2.5, so the video's own site (L/h = 2.7, shorter than the 3–5 × of the
  rules of thumb, research K20) does not carry a permanent warning; the `short-pipe` scenario (L/h = 1.1) does. The threshold
  is one constant (`LENGTH_RATIO_ALARM` in `engine.ts`).
