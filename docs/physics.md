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
`sizing.ts` (the sizing calculator, pure, §10), `actions.ts` (the "test" buttons of the part sheets, without any DOM, §9),
tests next to the code. Wave 3 added §5.1–5.2 (two scenarios), §8 (the cycle step by step), §9 (hand interventions and part
actions) and §10 (the sizing calculator).

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
| `status`, `stallReason`, `alarms`                                                                                 | `running`/`stalled`; `tank`/`stuck`/`gate`/`hand`/`none`; the alarm keys (wave 3: `softPipe`, `gateClosed`, `heldShut`, `drainOpen`)             |
| `tankLitres`, `tankLevel` 0..1, `hoursToEmpty`                                                                    | buffer tank (level for the 3D tank)                                                                                                              |
| `airFraction`                                                                                                     | air share of the chamber (drops with a blocked snifter)                                                                                          |
| `phaseHeld`, `phaseTime`                                                                                          | wave 3: the phase the cycle is frozen at (`null` while it runs), seconds spent in the present phase (§8)                                         |
| `surgeNeededBar`                                                                                                  | wave 3: ρ·g·(H − h), bar: the surge the check valve needs to open (what `surgeBar` has to reach)                                                 |
| `gateOpen`, `valveHeldShut`, `tankDrainOpen`, `tankDrainFlow`                                                     | wave 3: hand interventions (§9): the gate valve of the drive pipe, the waste valve held shut, the tank drain, the flow it loses (L/min)          |
| `simTime`, `day`, `hour`                                                                                          | simulated clock (the run starts at 08:00)                                                                                                        |
| `fall`, `driveLength`, `driveDiameter`, `deliveryHead`, `stroke`, `valve`, `liftRatio` (H/h), `lengthRatio` (L/h) | copies of the site                                                                                                                               |

The surge `ρ·a·v` is what the pressure _would_ reach if it could not escape: the body pressure is clipped at the chamber
pressure once the check valve opens; it only shows its peak when the check valve cannot open (water-logged chamber,
head too high, plastic pipe: 8–10 bar).

`sim.scope` (last 1.6 s: time, pressure, velocity, valve) and `sim.history` (tank level, delivery, 48 simulated hours)
feed the panel's charts; `sim.sweep(patch)` solves the averages for other parameters without touching the live run.

## 5. Presets and scenarios

| id                | What                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `valve-3`         | the ram as installed: Q = 17 L/min, tank empty after 10 h, ram stops (K8)                                                       |
| `valve-2`         | the intermediate test: Q = 11 L/min, still too much, tank empty after 27 h (K9)                                                 |
| `valve-1`         | the new valve: 109 strokes/min, Q = 6.7 L/min (below the 7.5 of the spring, so it never stops), 500 L/day (K10, K11)            |
| `source-drop`     | valve n°3, spring 10 L/min, falls to 7.5 L/min after 1 h (K6)                                                                   |
| `stroke-nut`      | valve n°1, the nut is turned in by 0.1 mm every 10 simulated minutes: consumption falls, delivery stops near 1.5 mm (13:13)     |
| `water-logged`    | valve n°1, no air in the chamber: peaks 7.2 bar instead of 6.5, delivery −40 %                                                  |
| `short-pipe`      | valve n°1, L = 8 m (L/h = 1.1): 259 strokes/min, η_D 0.42 instead of 0.45, uses more than the spring                            |
| `high-lift`       | valve n°1, H = 100 m (H/h = 13): the surge cannot open the check valve, nothing is delivered                                    |
| `snifter-blocked` | valve n°1: the air share falls with τ = 6 h; after ≈ 15 simulated hours the chamber is water-logged                             |
| `plastic-pipe`    | valve n°1, PVC drive pipe (500 m/s): surge 4.4 bar against 5.6 needed, nothing delivered, 3.2 L/min used (§5.1)                 |
| `heavy-weight`    | valve n°1, counterweight 720 g instead of 360: 75 strokes/min, 15.5 L/min, 788 L/day, η_D 0.31, the tank empties in 12 h (§5.2) |

### 5.1 `plastic-pipe`: a drive pipe that is too soft

The n°1 valve with a PVC drive pipe (`WAVE_SPEED.pvc` = 500 m/s instead of 900), nothing else changed. The valve closes just
as fast (closing velocity 0.89 m/s against 0.87: it is a property of the valve, its weight and its stroke), but the surge
**ρ·a·v is 44 % lower: 4.4 bar, where the check valve needs ρ·g·(H − h) = 5.6 bar** (K15: the minimum closing velocity is
now 1.13 m/s instead of 0.63). The body pressure peaks at 5.1 bar, below the 6.4 bar of the delivery head: the check valve
never opens, there is no `deliver` phase, the ram strikes (91 strokes/min) and delivers nothing. It takes 3.2 L/min, about half
of steel's 6.7 (a model result: the rate falls to 91 and each stroke passes less water).

| Drive pipe (valve n°1, h = 7.5 m) | a (m/s) | strokes/min | Q (L/min) | peak (bar) | delivered at H = 65 m | highest head that still delivers |
| --------------------------------- | ------- | ----------- | --------- | ---------- | --------------------- | -------------------------------- |
| steel                             | 900     | 109         | 6.7       | 6.5        | 500 L/day             | ≈ 85 m (H/h = 11.3)              |
| PVC (the scenario)                | 500     | 91          | 3.2       | 5.1        | 0                     | ≈ 50 m (H/h = 6.7)               |
| polyethylene                      | 350     | 82          | 3.0       | 3.8        | 0                     | ≈ 35 m (H/h = 4.7)               |

**The alarms make the cause visible.** `noDelivery` says what happens; the new `softPipe` says why: the closing velocity is
enough for a rigid pipe (≥ the 0.63 m/s that steel needs at this site) but not for this one. The panel then writes the
numbers (wave speed, surge, surge needed, closing velocity) and the cycle card of the frozen `close` phase says that the
check valve will not open. Putting steel back (the material select) restores 500 L/day and clears both alarms, which is the
lesson. With PVC, a lower head works (730 L/day at H = 40 m, η_D 0.46), and a much heavier counterweight partly makes up for
the soft pipe (80 L/day at 920 g, but for 17 L/min, twice the spring: not a recommendation).

**Honesty.** The sources give no figure for plastic: the video and the press article only say that plastic is discouraged
(research §7, S7), and no wave-speed or pressure was found for a plastic drive pipe. Everything above is **a model result for an
assumed wave speed**. 500 m/s is the Korteweg estimate for a PVC-U 32 × 3 mm (K = 2.2 GPa, E = 3 GPa gives ≈ 550 m/s), rounded
down; polyethylene takes the kit's 350 m/s. The lumped circuit's steel value (900) was calibrated _below_ the real steel pipe
(≈ 1 400, §3) so that one constant serves the surge and the recoil timing; the plastic values are not scaled the same way,
so the model's plastic/steel ratio (0.56) is higher than the real one (≈ 0.4): **if anything the model is kind to plastic**.
The mechanism (a low wave speed gives a low ρ·a·v, K15) is physics; the exact head at which a PVC ram gives up is not.

### 5.2 `heavy-weight`: a heavier counterweight

The n°1 valve with **720 g instead of 360 g** (a round change, not tuned: `HEAVY_WEIGHT` = twice the preset). The model
gives:

| Counterweight | strokes/min | closing speed (m/s) | per stroke (mL) | Q (L/min) | delivered (L/day) | η_D  | tank empty in |
| ------------- | ----------- | ------------------- | --------------- | --------- | ----------------- | ---- | ------------- |
| 360 g (video) | 109         | 0.87                | 3.2             | 6.7       | 500               | 0.45 | never         |
| 540 g         | 92          | 1.01                | 5.3             | 10.7      | 708               | 0.40 | 30 h          |
| **720 g**     | **75**      | **1.12**            | **7.3**         | **15.5**  | **788**           | 0.31 | 12 h          |
| 800 g         | 66          | 1.16                | 8.0             | 18.4      | 768               | 0.25 | 9 h           |
| 900 g         | 42          | 1.22                | 9.0             | 26.8      | 549               | 0.12 | 5 h           |
| 1 000 g       | 0           | 1.22                | –               | 41.9      | 0                 | 0    | 3 h           |

Slower rhythm, harder strokes (a faster closing, so more water per stroke), more water used, more delivered **to a point**:
the consumption, the closing velocity and the stroke volume rise with the weight, the rhythm and the efficiency fall, but the
**delivery is not monotonic**: it peaks near 720 g (788 L/day, +58 % against the video's valve; 768 at 800 g) and falls beyond; at 1 000 g the
drag can no longer close the valve and the water just runs out (`valveStaysOpen`). The extra delivery is _borrowed_: at 720 g
the ram takes twice the spring's 7.5 L/min and the 5 700 L tank is empty after 12 h (the video's n°3 story, K8, in
miniature). That is the tuning lesson next to `stroke-nut`: shortening the stroke and lightening the weight both cut the
water, down to a ram that no longer delivers (below ≈ 130 g). Nothing was tuned to make this nicer: the weights of the table
are the model's raw output, and the peak position depends on the calibrated bare mass and discharge coefficients (§3), so
"about 720 g" is a statement about the model, not about a real valve. The panel's "curves against the counterweight"
chart draws the two curves.

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

Wave 3 tests (all in `src/sim`): `scenarios.test.ts` (what each of the two new scenarios must show, with tolerances: the
cause, the numbers of §5.1 and §5.2, the non-monotonic delivery, the alarms), `cycle-steps.test.ts` (each phase is reached
and held, the held state does not move, the order of the phases, the fields the 3D reads in each phase, edits while frozen,
the stroke trace), `actions.test.ts` (each part test and its effect on the state), `sizing.test.ts` (S4 table 2 and its unit
conversions, the length and ratio rules, K18, and the K8 ↔ K21 sanity check against the simulation).

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
- **Plastic pipes (§5.1) are an assumption**, not a reported figure, and the model's recoil of a soft pipe is the same
  single-mode circuit: no resonance, no creep of the pipe wall, no pipe failure. A real plastic pipe may also burst or
  fatigue long before it fails to deliver: the model says nothing about that (the sources only say "discouraged").
- **The frozen instant of a phase is a choice** (a fraction of the phase, or its peak, §8), not a measurement. The phase
  labels come from events of the circuit (`cycle.ts`), so `close` runs from the first movement of the valve to the opening of
  the check valve and holds the 18 ms slam in its last third.
- **Hand interventions are simplified** (§9): the gate valve restarts the ram by itself when it reopens (assumed), the held
  waste valve is a plain stop, the drain flow (150 L/min) is an estimate, and the ram keeps priority over the drain for the
  water of the tank.
- The alarm "drive pipe short" lights below L/h = 2.5, so the video's own site (L/h = 2.7, shorter than the 3–5 × of the
  rules of thumb, research K20) does not carry a permanent warning; the `short-pipe` scenario (L/h = 1.1) does. The threshold
  is one constant (`LENGTH_RATIO_ALARM` in `engine.ts`).

## 8. The cycle step by step (wave 3)

A stroke lasts about half a second at ×1 and its four phases are 265, 61, 19 and 203 ms for the n°1 valve (48, 11, 3.5 and
37 % of the 549 ms period, model results). `RamSim` can **freeze the cycle at a phase** so that the 3D scene and the panel
show one instant with its valves, flows and pressures:

- `holdPhase(phase | null)` advances the cycle at once (faster than real time, a few milliseconds of computation) to the
  instant described below and holds it; `null` releases it. It returns false, and the cycle runs, when the ram is stopped or
  the phase does not occur (`phaseOccurs(phase)`: with a plastic pipe there is no `deliver`).
- `stepPhase()` goes to the next phase (accel → close → deliver → recoil → accel), skipping a phase that does not occur, and
  returns it. From a running cycle the first step goes to the phase after the one it is in.
- `heldPhase` / `state.phaseHeld` tell which phase is held; `state.phaseTime` is the time spent in the phase (s).
- While held, every field of the stroke-cycle block of `RamState` is **exactly constant** (tested), whatever `slowMo` and
  `timeScale` do. The **slow quantities keep running** (tank, clock, volumes), since they integrate the averages. Editing a
  parameter while frozen finds the same phase again with the new settings at the next frame (the freeze is released if the phase
  has disappeared); `reset`, a preset and a scenario release it; a stop and a restart find it again.
- `strokeTrace(patch?)` returns one whole stroke of the periodic regime (`StrokeTrace`: ≈ 300 samples of pressure, velocity,
  valve opening and phase, with the start and length of each phase), computed by a copy of the cycle model, so it never touches
  the live run. The panel draws it with the phase starts and the frozen instant as a dot on the curves.

The instants (`HOLD_AT` in `engine.ts`), with the n°1 valve at the video's settings (model results):

| Phase     | Instant held                                                         | At that instant                                                                                             |
| --------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `accel`   | 95 % of the mean duration of the phase (the end of the acceleration) | valve wide open (100 %), v = 0.78 m/s, jet 26.7 L/min, body pressure 0.2 bar                                |
| `close`   | the highest body pressure of the phase                               | valve shut (0 %), pressure at the head (6.4 bar), column being stopped (0.58 m/s), check valve not yet open |
| `deliver` | 50 % of the phase                                                    | check valve 80 % open, 10.3 L/min into the chamber, v = 0.30 m/s, 6.4 bar                                   |
| `recoil`  | the waste valve half open                                            | v = −0.56 m/s (backwards), pressure 0 bar (air coming in), valve 51 %, check valve shut                     |

If the phase ends before its instant (another valve, another site), the instant is the last one inside the phase. With the
plastic pipe the `close` instant is the surge peak (5.1 bar) and there is no delivery. The snifter passes air only for a few
milliseconds in the middle of the pressure collapse (7 L/min at most for the n°1 valve, while the waste valve is still shut);
the open waste valve then passes air by itself, so **the snifter flow is zero at the frozen `recoil` instant** and the cycle
card says "through the snifter, then through the valve".

## 9. Hand interventions and part actions (wave 3)

The "test" buttons of the part sheets (`src/part-actions.ts`: frame the part, then act, like Pelton's "test the trip") put
the simulation in the state the part is about. The logic is in `src/sim/actions.ts` and `RamSim`, tested without any DOM.
Everything except the stroke nut is a toggle whose label follows the simulation. Four actions are existing faults of the
model, three are new _hand interventions_, which are not site parameters (they do not make the preset `custom` and `reset`
puts them back to normal): `setDriveGate`, `holdValveShut`, `setTankDrain`, readable in `sim.hands` and in `RamState`.

| Part (id)                   | Button                         | What the model does                                                                                                                                                                                                                                                  | Visible in                                                           | Time  |
| --------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----- |
| `stroke-nut`                | turn in / out by 0.1 mm        | `stroke` ∓ 0.1 mm (clamped to 0.5–8): −11 % water used, −15 % delivered per step at the video's setting                                                                                                                                                              | 3D valve travel, strip (rate, delivered, uses)                       | –     |
| `air-chamber`               | drown / refill                 | `waterLogged` (the fault of the scenario): air share 0.4 % at once, peaks 7.2 bar, delivery −40 %                                                                                                                                                                    | 3D water level, alarm `waterLogged`, strip                           | –     |
| `snifter`                   | block / unblock                | `snifterBlocked`: the air dissolves with τ = 6 h (assumed), water-logged after ≈ 15 h                                                                                                                                                                                | alarm `snifterBlocked` then `waterLogged`, 3D level                  | ×3600 |
| `waste-valve`               | hold shut / let go and restart | `holdValveShut`: the column stops, the ram is stalled (reason `hand`), the tank fills at the full spring flow; letting go pushes the valve open once, like `restart()`                                                                                               | alarm `heldShut`, 3D valve shut, no jet, strip at 0                  | –     |
| `drive-gate-valve`          | close / open                   | `setDriveGate`: no water, the ram is stalled (reason `gate`), the tank fills; reopened, the ram restarts by itself (assumed: the pipe drained through the open valve and the snifter, so nothing holds the valve shut); `restart()` refuses while the gate is closed | alarm `gateClosed`, tank level, strip                                | ×600  |
| `tank-drain`, `buffer-tank` | open / close                   | `setTankDrain`: 150 L/min leave the tank while it holds water (assumed); the 5 700 L tank empties in ≈ 38 min; the n°1 valve does not care (it takes less than the spring), the n°3 valve stops for lack of water                                                    | tank level, alarm `drainOpen`, then `stalledTank` with the n°3 valve | ×600  |

A test resumes a paused simulation, and raises the time speed to the figure in the last column when it is slower (the effect
needs minutes or hours); it never slows it. Closing the gate valve in time saves the over-consuming n°3 ram from the dry tank
(tested: closed at 8 h of a 10 h tank, 6 h later the tank is 67 % full); reopened on a tank that cannot sustain it, the ram
stops again for lack of water, reason `tank`.

**Assumed** (the sources are silent on all of these): the 150 L/min of the drain (`TANK_DRAIN_FLOW`: a DN40 valve under about
1 m of water, 200 L/min by the orifice formula, rounded down), the automatic restart after the gate, the priority of the ram
over the drain. The stroke nut step is **derived**: the video's stem is a 6 mm threaded rod (research §3), M6 coarse has a 1 mm
pitch, so 0.1 mm is a tenth of a turn. Holding the waste valve by hand is shown as a _simulation_: never a finger in the valve
of a running ram (the button's tooltip and the status line say so).

## 10. The sizing calculator (wave 3)

`src/sim/sizing.ts` (pure, no DOM, no simulation) gives, from the fall h, the delivery head H, the spring flow, the drive pipe
size and, optionally, the planned length, the checks of the sources (research §2). The panel's "Size it" section draws it with
its own inputs, so trying a site never disturbs the live run (`sizeRam` is a function; the live state is only read to show the
simulation's efficiency).

| Output                                | Rule                                                                                                         | Source                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| minimum drive pipe length             | 5 × h (usual range 3–7 × h)                                                                                  | **reported** S4 (≥ 5 × the fall), S6 (3–7 ×), K20                     |
| minimum spring flow for the pipe size | ¾″ 7.6, 1″ 22.7, 1½″ 53, 2″ 95 L/min                                                                         | **reported** S4 table 2 (2, 6, 14, 25 gpm × 3.785), K21               |
| table's maximum pumping               | ¾″ 3.8, 1″ 7.6, 1½″ 15.1, 2″ 26.5 m³/day (1 000, 2 000, 4 000, 7 000 gpd × 3.785 L)                          | **reported** S4 table 2; the table states no head, fall or efficiency |
| expected delivery                     | q = η·Q·h/H, η = 0.6, Q = the spring flow, in L/day × 1440                                                   | **reported** S4 (Q = 1440·E·S/(L/F)), S6; K17, K18                    |
| verdict                               | spring ≥ minimum of the pipe size ("enough") or not, with the ratio and the largest size the spring can feed | derived from the table                                                |
| warnings                              | H/h > 12 too high; H/h < 1.5 stuck (model); L/h < 3 too short; 3 ≤ L/h < 5 under S4's minimum                | research §5; physics.md §7; S6; S4                                    |

The units are converted explicitly (`GPM_TO_LPM`, `GPD_TO_M3_DAY`; the minimum flows are rounded to 0.1 L/min like K21).
The inner diameters of the four sizes (21, 27, 41, 53 mm, schedule 40 steel, rounded) are an **assumption** (the lab's 27 mm
pipe is the 1″). The panel shows two deliveries: the typical η = 0.6, and the one the live simulation reaches (η_D from the
state, 0.45 for the n°1 valve) when it differs; the closed form is used, not `sim.sweep`, because the stroke model's valves are
calibrated for one 1″ ram and the calculator covers four sizes. "Try it in the simulation" copies h, H, the spring flow and the
length to the live simulation and leaves the pipe size alone (the model is a 1″ ram).

**Sanity check on the video's site (tested):** h = 7.5 m, H = 65 m, 7.5 L/min, a 1″ pipe of 20 m. The 1″ asks for 22.7 L/min:
the spring gives 33 % of it, "not enough", and no size of the table is fed (7.5 is a hair under the ¾″'s 7.6; the 7.5–7.8 of
K6 straddles it). The 20 m of pipe is L/h = 2.7, "too short" (K20). The closed form gives 748 L/day at η = 0.6 (K18, ≈ 750),
and 500 L/day is η = 0.4 (K10). In the model the n°3 valve takes 17 L/min, three quarters of the 22.7 of the table (K8 ↔ K21
agree), and starves the 7.5 L/min spring; **what the video did was not to find more water but to retune the valve** (the n°1
preset) so that the ram takes 6.7 L/min, less than the spring gives: that is the whole point of the "tune it to the water you
have" lesson, and the calculator says so in its tip.
