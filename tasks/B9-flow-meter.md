# B9: Flow meter and live "On the chest"

**Track:** B · Coach and drill · **Branch:** `track-b` · **Time budget:** 30 min · **Priority:** Should-have
**Needs on main:** B5 (B7 first if it is ready, so the meter uses the new look)

## Goal

```
Complete tasks/B9-flow-meter.md. Done means every item under "Done when" is verified with evidence, and npm test and npm run build both pass in the final output.
```

Read `CLAUDE.md` first. Look at screens 2 and 3 in `tasks/design/relay-mock.png`. Work on branch `track-b` and touch only Track B files.

## What to build

Show why a pause matters, while it is happening. Blood flow during CPR builds up over several compressions and falls away within seconds when they stop. A meter that fills during good compressions and drains during the switch makes the audience feel every second of hands-off time.

This meter is a teaching picture. It is not a measurement of anyone's blood flow, and the screen must say so.

- **`src/lib/flow.js`.** `createFlowModel(config)`: pure, with time passed in as `now` in ms.
  - `onCompression(event, now)`: the value moves towards 100 by `FLOW_RISE` of the remaining gap. A compression without full recoil, or with an interval outside the target rate, moves it by `FLOW_RISE × FLOW_POOR_FACTOR` instead.
  - `value(now)`: the value from 0 to 100, after decaying with a half-life of `FLOW_HALF_LIFE_MS` since the last compression.
  - `reset()`.
- **Flow meter (`src/ui/hud.js`).**
  - A card with the label "Blood flow" and, beside it in small text, "illustration, not a measurement". This text is always visible.
  - A thick bar: `--good` at or above `FLOW_WARN`, `--warn` below it, `--bad` below `FLOW_BAD`.
  - Update it about 10 times a second so the drain during a pause is smooth.
  - On the switch overlay, show the same bar under the pause timer, so everyone watches it drain.
- **Live "On the chest".** A card next to the compression count showing the compression fraction so far in the drill as a big percentage, with "target 80%" beside it. Colour it with `CCF_TARGET` and `CCF_MIN`, the same as on the results screen. Compute it with the same hands-off rules as `summariseRelay`, so the last live value matches the result.
- **Solo practice.** Show the flow meter there too. Leave out the "On the chest" card.
- **Config.** Add the flow keys from `CLAUDE.md` to your section of `src/config.js`.

## Done when

- [ ] `npm run check` passes, including new tests:
  - `flow.js`: ten good compressions at 110 a minute take the value above 70. With no compressions it halves every `FLOW_HALF_LIFE_MS`. Poor compressions fill it more slowly. `reset()` returns it to 0. It never leaves 0 to 100.
  - The meter's colour follows `FLOW_WARN` and `FLOW_BAD`.
  - The words "illustration, not a measurement" are on the drill screen and on the switch overlay.
  - A drill on `?sim=1&turnSeconds=20` with fake timers: the live "On the chest" value at the end equals `compressionFraction` in the results, to the nearest whole percent.
  - During the switch in that drill, the flow value falls.
- [ ] The drill screen still fits 1366×768 with no scrolling.
- [ ] No file outside Track B's list was changed, apart from your own keys in `src/config.js`.
- [ ] `progress/track-b.md` updated.

## Human check

- Run a drill. The meter fills in the first few seconds and stays high. At the switch it drains while the pause timer counts, and it climbs again when compressor 2 starts.
- Do one slow switch on purpose. The meter reaches red, and "On the chest" drops.
- Then say "ship it".

## Out of scope

Any claim that the meter measures a real person. Any change to scoring.
