# B8: Drill timeline and history

**Track:** B · Coach and drill · **Branch:** `track-b` · **Time budget:** 35 min · **Priority:** Should-have
**Needs on main:** B6 (B7 first if it is ready, so the chart uses the new look)

## Goal

```
Complete tasks/B8-drill-timeline-and-history.md. Done means every item under "Done when" is verified with evidence, and npm test and npm run build both pass in the final output.
```

Read `CLAUDE.md` first, especially Contract 4. Look at screen 4 in `tasks/design/relay-mock.png`: the chart in the middle is this task. Work on branch `track-b` and touch only Track B files.

## What to build

The picture that proves the pitch. One chart shows the whole relay: compressor 1's pushes holding and then fading, the moment the app flagged it, the hands-off gap at the switch, and compressor 2 starting fresh. This task also saves each drill so the educator view can show a team's history.

- **`src/lib/timeline.js`.** `buildTimeline(drill, config)`: pure. Takes B5's `getDrill()` record and returns:

  ```js
  {
    durationSec,
    turns: [{ compressor, slippedAtSec, points: [{ tSec, pushPct }] }],   // tSec from the start of the drill
    pauses: [{ startSec, endSec, sec }],                                  // every hands-off gap, as in B6
  }
  ```

  - `pushPct` is the push's `travel` as a percentage of the median `travel` in the first `FATIGUE_BASELINE_MS` of that turn. Smooth it with a rolling median of 5.
  - `slippedAtSec` here is measured from the start of the drill, so it can be drawn on the same axis.
- **`src/ui/timeline.js`.** `renderTimeline(container, timeline)`: an inline SVG, with no library.
  - x is time through the drill. y is push size from 50% to 120%.
  - A dashed line at 100% and a dotted `--warn` line at the slipping threshold, `100 × (1 − FATIGUE_TRAVEL_DROP)`.
  - One line per turn: compressor 1 in `--accent`, compressor 2 in `--good`. After `slippedAtSec` the line is `--warn`, with a vertical marker labelled "slipping from 0:24".
  - Each pause is a shaded band with its seconds on top. The band's label is `--bad` when the pause is over `PAUSE_MAX_SEC`.
  - A legend under the chart, as in the mock.
  - It never throws. With fewer than 6 compressions in a turn, that turn draws nothing.
- **Relay results.** Show the chart in the middle column under the switch cards, with the heading "Push size through the drill, each compressor against their own start".
- **`src/history.js`.** The drill history of Contract 4.
  - `saveDrill(team, stats)`, `loadHistory()` and `clearHistory()`. Newest first, at most `HISTORY_SIZE` entries. It falls back to doing nothing if storage is missing or full.
  - When a team name is saved on the relay results screen, also call `saveDrill`. Solo sessions are not saved here.
- **Educator link.** On the home screen and the relay results screen, add a quiet "Educator view" link to `/educator.html`. Add it only if `educator.html` exists in the repository when you ship. If it does not, leave the link out and say so in the progress file.

## Done when

- [ ] `npm run check` passes, including new tests:
  - `buildTimeline` on a synthetic drill: steady pushes give `pushPct` close to 100; travel falling by 25% gives about 75; the pauses match B6's hands-off gaps; `tSec` is measured from the start of the drill.
  - `renderTimeline` in jsdom: two lines for two turns, one band per pause, a slipping marker when `slippedAtSec` is set and none when it is `null`; empty turns do not throw.
  - `saveDrill` then `loadHistory` returns the entry in the Contract 4 shape. A 51st entry drops the oldest. Missing storage does not throw.
  - The saved entry passes for `tests/fixtures/history.js`-style data: same keys as `sampleHistory[0]`.
  - The whole drill on `?sim=1&turnSeconds=20` ends with the chart on screen.
- [ ] The relay results still fit 1366×768 with no scrolling.
- [ ] No file outside Track B's list was changed.
- [ ] `progress/track-b.md` updated.

## Human check

- Run `?sim=1&fatigue=1` once A5 is on `main`. The chart shows compressor 1's line dropping and turning amber, the pause band, and compressor 2's line flat near 100%.
- Run a drill with two people at the camera, and fade on purpose in turn 1. The chart tells the same story you just watched.
- Save a team name, then open `/educator.html` if it exists. The drill is listed.
- Then say "ship it".

## Out of scope

The educator view itself, which is Track C's. Any change to scoring.
