# A5: Fatigue signal and turns

**Track:** A · Motion engine · **Branch:** `track-a` · **Time budget:** 35 min · **Priority:** Must-have
**Needs on main:** A4

## Goal

```
Complete tasks/A5-fatigue-and-turns.md. Done means every item under "Done when" is verified with evidence, and npm test and npm run build both pass in the final output.
```

Read `CLAUDE.md` first, especially "The relay drill" and Contract 1. Work on branch `track-a` and touch only Track A files.

## What to build

This task builds the headline feature: the camera notices when a compressor's compressions are slipping, so the app can call the switch. Each person is compared with their own first seconds, never with a fixed depth. Track B's drill reads `state.fatigue` and calls `engine.markTurn()` at every switch.

- **`src/lib/fatigue.js`.** `createFatigueTracker(config)`, pure logic:
  - `startTurn()`: forget the previous compressor.
  - `push(event)`: takes a finished compression event and returns its `travelRatio`.
  - **Baseline.** The compressions in the first `FATIGUE_BASELINE_MS` of a turn, counted from its first compression, and at least 6 of them. Record their median travel, their median rate (from `intervalMs`), and their share of locked elbows. `travelRatio` is `null` until the baseline is set, then `travel ÷ baseline median travel`.
  - **Signs.** Compare the last `FATIGUE_WINDOW` compressions with the baseline:
    - `'shallower'`: median travel is at least `FATIGUE_TRAVEL_DROP` below baseline.
    - `'slower'`: median rate is at least `FATIGUE_RATE_DROP_CPM` below baseline.
    - `'elbows'`: the share of locked elbows is at least `FATIGUE_ELBOW_DROP` below baseline.
  - `getState()` returns `{ slipping, signs }`. `slipping` is true while any sign holds. `signs` lists them in the order above, or `[]`.
  - Ignore intervals longer than `RATE_STALE_MS`, so the pause at a switch is never read as a slow rate.
- **`src/engine.js`.**
  - Add `markTurn()`. It starts a fresh turn in the fatigue tracker. It also drops anything tied to the previous person's body, such as the resting reference from `markRest()`, so recoil falls back to its rolling reference. It does not zero the compression count.
  - `reset()` also starts a fresh turn.
  - Every event carries `travelRatio`. `state.fatigue` comes from `getState()`.
  - Add `slipping: shallower, slower` to the debug text when slipping.
- **Simulator (`src/pose/simSource.js`).**
  - `fatigue` from the address, from 0 to 1, default 0. At 1, from about 15 seconds into a turn, push size shrinks and the rate drops. By about 35 seconds the compressor is clearly slipping, roughly 25% smaller pushes and 12 a minute slower. Scale the effect with the value.
  - `swap` from the address, default 5. In the simulator, `markTurn()` makes the figure stop compressing for `swap` seconds, then a fresh compressor starts, with the fatigue clock restarted.
- **`dev/stage.html`.** A "Mark turn" button that calls `engine.markTurn()`, and the `fatigue` state in the printed output.

## Done when

- [ ] `npm run check` passes, including new tests:
  - `fatigue.js` on synthetic events: steady pushes never slip; travel falling 25% gives `'shallower'`; a rate falling by 12 a minute gives `'slower'`; locked elbows falling from 100% to 50% gives `'elbows'`.
  - `travelRatio` is `null` during the baseline, and close to 1 for steady pushes after it.
  - A 6-second gap between compressions does not produce `'slower'`.
  - `startTurn()` clears slipping and starts a new baseline.
  - Engine with `?sim=1&fatigue=0` for 60 simulated seconds: `fatigue.slipping` is never true.
  - Engine with `?sim=1&fatigue=1`: slipping is true by 40 simulated seconds into the turn, with `'shallower'` among the signs.
  - Engine with `?sim=1&fatigue=1`: after `markTurn()`, no compressions arrive for about `swap` seconds, then counting resumes and slipping is false.
- [ ] The rest of the engine interface is unchanged, and `issues` still behaves as in A4.
- [ ] `?sim=1` with no new settings behaves exactly as before.
- [ ] `progress/track-a.md` updated, including a note to Track B that `markTurn()` and `fatigue` are ready.

## Human check

- Open `/dev/stage.html` with the camera and debug on. Do 15 seconds of good compressions, then make your pushes clearly smaller and slower. "slipping" appears within about six pushes and lists the right signs.
- Press "Mark turn", then do good compressions again. Slipping clears, and a new baseline is set after 10 seconds.
- Do 40 seconds of steady good compressions. Slipping never appears. If it does, raise the `FATIGUE_*` thresholds in `src/config.js`.
- Then say "ship it", and tell Track B the fatigue signal is on `main`.

## Out of scope

The drill, the voice, the switch screen and scoring, which are Track B's. Absolute depth in centimetres.
