# B5: Relay drill

**Track:** B · Coach and drill · **Branch:** `track-b` · **Time budget:** 50 min · **Priority:** Must-have
**Needs on main:** B4 (A5 makes early switches work, but this task does not wait for it)

## Goal

```
Complete tasks/B5-relay-drill.md. Done means every item under "Done when" is verified with evidence, and npm test and npm run build both pass in the final output.
```

Read `CLAUDE.md` first, especially "The relay drill" and Contract 1. Work on branch `track-b` and touch only Track B files.

## What to build

Turn the 30-second session into a two-person relay. Compressors take turns. The app calls a rhythm check and a switch at the end of each turn, or early when the compressor's compressions are slipping, and it times every hands-off pause. The solo 30-second session stays as a second option.

- **`src/lib/relay.js`.** `createRelay(config, { turns, turnSeconds })`: a pure state machine, with time passed in as `now` in ms. Use the page's clock for every time it stores, never the event's `tBottom` or `tTop`, which are in the engine's own clock.
  - `start(now)`, `onCompression(event, now)` and `tick(state, now)`. `tick` returns the prompts to give now: `'rhythmCheck'`, `'resume'`, `'switchEarly'`, `'backOn'` or `'finished'`.
  - **Phases.** `'compressing'`, then `'rhythmCheck'` for `RHYTHM_CHECK_MS`, then `'resume'` until the next compression, then `'compressing'` for the next turn. After the last turn the phase is `'done'`, with no rhythm check.
  - **Turn clock.** A turn's time starts at its first compression and ends after `turnSeconds`. Compressors alternate 1, 2, 1, 2.
  - **Early switch.** When `state.fatigue.slipping` has held for `EARLY_SWITCH_MS` and at least `MIN_TURN_SECONDS` have passed, return `'switchEarly'` and start the rhythm check. On the last turn there is no one to switch to, so the slip is recorded but the turn runs to the end. Treat a missing `fatigue` as not slipping.
  - **Slip record.** For every turn, record `slippedAt` and `signs`. `slippedAt` is when a slip that lasted at least `EARLY_SWITCH_MS` began, in seconds into the turn, or `null`. `signs` is every sign seen during that slip. Record this even when the slip comes too late for an early switch.
  - **`'backOn'`.** Return it once when a switch pause passes `PAUSE_WARN_SEC`.
  - `getView(now)` returns `{ phase, compressor, turn, turns, turnSecondsLeft, pauseSec }` for the screen.
  - `getDrill()` returns the raw record for B6: `{ startedAt, endedAt, turns: [{ compressor, startAt, endAt, early, slippedAt, signs, events: [{ ...event, at }] }] }`. Compressions during a rhythm check belong to no turn.
- **`src/main.js`.**
  - Home has two starts: **Start relay drill** (the main button, and Space) and **Solo practice · 30 s**.
  - The drill runs countdown, then turns, then results. At every rhythm check, call `engine.markTurn?.()` once. Reset the coach at each new turn. Keep coaching cues quiet during a switch.
  - Drill prompts are spoken at once, cancelling any cue in progress, and respect mute.
  - `?turns=` and `?turnSeconds=` in the address override `DRILL_TURNS` and `DRILL_TURN_SECONDS` for that page load, for rehearsals and the user test.
  - Until B6 ships, the drill ends on the existing results screen, using `summarise` over all of the drill's compressions.
- **Screen (`src/ui/hud.js`, `index.html`, `src/styles.css`).**
  - In the top bar, "Compressor 1 · Turn 1 of 2" and a turn countdown, both large.
  - A "Slipping" chip next to the form chips, amber, naming the signs in plain words: smaller pushes, slower, elbows bending.
  - **Switch screen.** During a switch, a full-width overlay with a huge pause timer in seconds with one decimal. It is green, then amber after `PAUSE_WARN_SEC`, then red after `PAUSE_MAX_SEC`. Under it, "Rhythm check: hands off", then "Switch! Compressor 2, start now".
- **`src/copy.js`.** The prompts:
  - `rhythmCheck`: "Stop compressions. Rhythm check."
  - `resume`: "Switch compressors. Resume now."
  - `switchEarly`: "Your compressions are dropping off. Switch now."
  - `backOn`: "Back on the chest!"
  - Plus the new screen labels.
- **Config.** Add the Track B relay keys from `CLAUDE.md` to your section of `src/config.js`.

## Done when

- [ ] `npm run check` passes, including new tests:
  - `relay.js` with synthetic states and times: a turn ends on the clock. A turn ends early only after `MIN_TURN_SECONDS` and `EARLY_SWITCH_MS` of continuous slipping. A two-second slip does not switch. The last turn has no rhythm check and no early switch, and `turns: 1` runs one full turn. With `turns: 4`, compressors run 1, 2, 1, 2. The pause runs from the rhythm-check prompt to the first compression after `'resume'`. `slippedAt` is recorded for a late slip that did not switch.
  - A whole drill in `main.js` on `?sim=1&turnSeconds=20` with fake timers: two turns, one rhythm check, `markTurn` called once when the engine has it, no error when it does not, and the results screen at the end.
  - An injected fake engine that reports `fatigue.slipping` 20 seconds into turn 1 produces `'switchEarly'` and the spoken prompt.
  - Solo practice still works as before. The existing tests still pass.
- [ ] The switch screen is readable from 3 metres: the pause timer is at least 160 px tall at 1366×768. Check this with a stylesheet test.
- [ ] No file outside Track B's list was changed, apart from your own keys in `src/config.js`.
- [ ] `progress/track-b.md` updated.

## Human check

- Two people, `?sim=1&turnSeconds=20`: the drill runs end to end. The prompts are clear over the metronome, and the switch screen is readable from across the room.
- Once Track A's A5 is on `main`, open `?sim=1&fatigue=1`. The app calls "Your compressions are dropping off. Switch now." partway through turn 1.
- With the camera: two people swap on the pillow. The pause timer stops the moment the second person starts.
- Then say "ship it".

## Out of scope

The relay results screen and the team score, which are B6. The fatigue detection itself, which is Track A's.
