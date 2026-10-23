# Requests to the lab kit

Things the ram pump lab would like from `@onigam/lab-kit` (BRIEF.md §2: a missing building block becomes a change of the
kit for all labs, never a local workaround). Written by the physics role, wave 1.

## 1. `CurveChart` with its own units

`CurveChart` draws "power vs speed" with `W` and `tr/min` written in the canvas code. The ram lab has the same kind of
curve (delivered water against the delivery head, consumption against the stroke, each with the present operating point
and an optimum) but in other units. The simulation panel uses `LineChart` with `markers` instead, which works, but loses
the "optimum" annotation and the operating-point style.

- **What**: take `xFmt` / `yFmt` (and optionally `labels`) like `LineChart`, or expose a generic `XYChart`.
- **Why**: any lab with a performance curve (Pelton power curve, ram delivery curve, heat output against load).
- **Needed by**: ram pump lab (nice to have).

## 2. A clickable alarm in the bottom strip

`StripAlarm` is `{ key, label, severe? }`. When the ram stops (buffer tank empty) the story of the video is that somebody
has to walk to the ram and restart it by hand; the lab has `RamSim.restart()` and a button in the simulation panel, but
the visitor looking at the 3D view only sees "Stopped: tank empty" in the strip.

- **What**: optional `action?: { label: string; run(): void }` on `StripAlarm`, rendered as a small button in the chip.
- **Why**: lets the strip offer the fix (restart the ram, reset a breaker, clear a clogged screen) from any mode.
- **Needed by**: ram pump lab; Pelton lab has the same pattern (trip, deflector reset).

## 3. Tooltip on the strip values

`StripValue` has no `title`. Values such as "Rate: 109 strokes/min" or "Efficiency 45 %" would benefit from a one-line
definition on hover (η D'Aubuisson = q·H/(Q·h)). Optional `title?: string` on `StripValue`.
