# A7: Push-size bars and stage polish

**Track:** A · Motion engine · **Branch:** `track-a` · **Time budget:** 25 min · **Priority:** Should-have
**Needs on main:** A5

## Goal

```
Complete tasks/A7-push-size-bars.md. Done means every item under "Done when" is verified with evidence, and npm test and npm run build both pass in the final output.
```

Read `CLAUDE.md` first. Open `tasks/design/relay-mock.png` and look at screen 2: the bars along the bottom of the camera picture are this task. Work on branch `track-a` and touch only Track A files.

## What to build

Make the fatigue signal visible. A row of bars along the bottom of the stage shows the size of every push against the compressor's own start, so the judges can watch the pushes shrink before the app calls the switch.

- **`src/ui/pushBars.js`.**
  - `barView(travelRatio, config)`: pure. Returns `{ heightPct, tone }`.
    - `tone` is `'base'` while `travelRatio` is `null`, `'low'` when it is at or below `1 − FATIGUE_TRAVEL_DROP`, and `'ok'` otherwise.
    - `heightPct` puts a ratio of 1 at 70% of the plot height, and is capped at 100%.
  - `createPushBars(container, config)` with `push(event)`, `clear()` and `setLabel(text, tone)`.
    - It keeps the last `PUSH_BARS` compressions, newest on the right.
    - A dashed line marks a ratio of 1, labelled "your start".
    - Bars are `--muted` for `'base'`, `--good` for `'ok'` and `--warn` for `'low'`. Read the colours from the CSS variables.
    - While the baseline is being set, each bar's height comes from its raw `travel` against the largest so far.
- **`src/ui/stage.js` and `stage.css`.**
  - The strip sits inside the stage, over the bottom of the picture, on a dark fade so the bars read against any background. It is always visible, with or without debug.
  - Heading on the left: "Push size vs your start". On the right: "Setting your baseline" in `--muted`, then nothing, then the slipping signs in `--warn`, in plain words: "Smaller pushes", "Slower", "Elbows bending".
  - **Stage polish.** Match the mock: rounded corners, the hairline border, a small "LIVE" badge (or "SIMULATED" for `?sim=1`), and the skeleton in `--accent` with light joints. Keep the arm in `--bad` while the elbows check is failing, as A4 built it.
  - Use the design tokens from `CLAUDE.md` with the fallback values given there, so the stage looks right before Track B's design pass ships.
- **`src/engine.js`.** Push every compression into the strip. Clear it on `markTurn()` and `reset()`. Update the label from the fatigue state.

## Done when

- [ ] `npm run check` passes, including new tests:
  - `barView`: `null` gives `'base'`; 1 gives `'ok'` at 70%; 0.79 gives `'low'` with the default threshold; 2 is capped at 100%.
  - `createPushBars` in jsdom: 50 pushes keep only `PUSH_BARS` bars; `clear()` empties it.
  - Engine with `?sim=1&fatigue=1`: the strip holds `'low'` bars and a warn label by 40 simulated seconds, and is empty right after `markTurn()`.
  - Engine with `?sim=1`: after the baseline, every bar is `'ok'`.
  - The strip is present when debug is off.
- [ ] The engine interface is unchanged.
- [ ] `progress/track-a.md` updated.

## Human check

- Open the app with the camera and start a drill. The bars appear grey for 10 seconds, then green. Make your pushes smaller: the bars turn amber and shrink below the dashed line.
- Stand 3 metres away: you can tell green bars from amber ones, and see them shrinking.
- Then say "ship it".

## Out of scope

Anything outside the stage. The slipping chip and the results timeline are Track B's.
