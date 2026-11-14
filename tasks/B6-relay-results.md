# B6: Relay results and team score

**Track:** B · Coach and drill · **Branch:** `track-b` · **Time budget:** 40 min · **Priority:** Must-have
**Needs on main:** B5

## Goal

```
Complete tasks/B6-relay-results.md. Done means every item under "Done when" is verified with evidence, and npm test and npm run build both pass in the final output.
```

Read `CLAUDE.md` first, especially "The relay drill" and Contract 2. Work on branch `track-b` and touch only Track B files.

## What to build

The screen the judges remember. It shows how well the team kept compressions going, how fast they switched, and when each compressor started to slip.

- **`summariseRelay(drill, config)` in `src/lib/score.js`.** Takes B5's `getDrill()` record and returns exactly the relay stats of Contract 2, field for field like `tests/fixtures/relayStats.js`.
  - **Each turn.** `summarise(turn.events, turnSeconds, config)`, plus `compressor`, `slippedAtSec` and `signs`.
  - **Hands-off time and compression fraction.** Use the definitions in "The relay drill" in `CLAUDE.md`, computed from the page-clock `at` times.
  - `avgSwitchSec`: the mean of the gaps that span a switch, from the last compression of one turn to the first of the next. `longestPauseSec`: the longest hands-off piece. Round both to one decimal.
  - **Team score.**
    - `ccfScore`: 0 at or below `CCF_MIN`, 100 at or above `CCF_TARGET`, linear in between.
    - Take 20 points off `ccfScore` for every pause longer than `PAUSE_MAX_SEC`, never going below 0.
    - Score: the weighted mean of the turn scores (weighted by compressions) and `ccfScore`, using `RELAY_WEIGHTS`. Grade from the existing grade bands.
  - With zero compressions it returns valid stats with a score of 0, and never `NaN` or `null` where the contract wants a number.
- **`src/ui/relayResults.js`.** `renderRelayResults(container, stats, { onSave, onRetry })`:
  - **Team score and grade**, very large.
  - **Compression fraction** as a big percentage with a bar marked at the 80% target. Green at or above `CCF_TARGET`, amber at or above `CCF_MIN`, red below.
  - **Switches.** Each switch pause in seconds: green up to `PAUSE_WARN_SEC`, amber up to `PAUSE_MAX_SEC`, red above, tagged "early switch" when the app called it.
  - **One column per turn.** "Compressor 1" with compressions, average rate and score. Then either "Started slipping at 0:24: smaller pushes, slower" in amber, or "Held form for the whole turn" in green.
  - The debrief card: `renderDebriefCard(container, relayStats)`. Until Track C's relay debrief ships, the card may show its neutral sentence for relay stats, which is fine.
  - A team name field with Save, the leaderboard, and Try again (Space too).
- **Leaderboard.** Entries gain `mode: 'relay' | 'solo'`, and old entries with no mode count as solo. Relay entries show a "Relay" tag and the compression fraction. Keep the same storage key, and keep using `textContent` for names.
- **`src/main.js`.** The drill ends with `summariseRelay`, then `renderRelayResults`.

## Done when

- [ ] `npm run check` passes, including new tests:
  - `summariseRelay` on a synthetic drill built from `makeEvents` turns: the keys match `goodRelay` and `goodRelay.turns[0]` exactly.
  - Two 40-second turns, a 1-second start and a 5-second switch give the compression fraction you calculate by hand.
  - A 12-second switch pause takes 20 points off the hands-off part of the score.
  - An early switch is counted, and `slippedAtSec` and `signs` are carried through.
  - Zero compressions gives valid stats.
  - `renderRelayResults` renders each of `goodRelay`, `slowSwitchRelay` and `fadingRelay` without throwing. `slowSwitchRelay` shows a red pause and an amber compression fraction. `fadingRelay` shows "early switch" and a slipping time for compressor 1.
  - A team name `<b>x</b>` shows as literal text.
  - The whole drill on `?sim=1&turnSeconds=20` with fake timers ends on the relay results screen.
- [ ] The relay results fit on one screen at 1366×768 with no scrolling.
- [ ] No file outside Track B's list was changed.
- [ ] `progress/track-b.md` updated.

## Human check

- Run a drill in the simulator: the numbers on the results screen match what happened. Then run `?sim=1&fatigue=1` once A5 is on `main`: compressor 1 shows a slipping time and an early switch.
- Run a drill with two people at the camera, with one deliberate slow switch: the pause shows red and the compression fraction drops.
- Save a team name and reload: it is still on the leaderboard with a Relay tag.
- Then say "ship it".

## Out of scope

The debrief text, which is Track C's. Any change to the engine.
