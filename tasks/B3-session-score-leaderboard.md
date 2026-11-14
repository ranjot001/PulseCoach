# B3: Session, score and leaderboard

**Track:** B · Coach and session · **Branch:** `track-b` · **Time budget:** 45 min · **Priority:** Must-have
**Needs on main:** B2

## Goal

```
Complete tasks/B3-session-score-leaderboard.md. Done means every item under "Done when" is verified with evidence, and npm test and npm run build both pass in the final output.
```

Read `CLAUDE.md` first. Work on branch `track-b` and touch only Track B files.

## What to build

The full practice loop: start, countdown, a timed 30-second session, a score with a breakdown, a leaderboard, and try again. When this task and Track A's form checks are both on `main`, the app is ready to demo.

- **Screens.** A small state machine: `home`, `countdown`, `practice`, `results`. Moving between screens never needs a page reload.
- **Home, in `src/ui/home.js`.** The name, the line "Practice for adult hands-only CPR", a one-line instruction, a simple diagram of the position (kneeling side-on, whole upper body in view), the leaderboard, and a Start button. Space also starts.
- **Countdown.** 3, 2, 1, shown large and spoken. When it ends, call `engine.reset()` and `engine.markRest()`.
- **Practice.** The screen from B1, plus a visible timer counting down `SESSION_SECONDS`. The metronome starts by itself and voice coaching is on. Collect every event from `onCompression`.
- **`src/lib/score.js`.** `summarise(events, durationSec, config)` returns the stats object from Contract 2 in `CLAUDE.md`:
  - `compressions`, `avgRate`, and the four percentages.
  - `avgDepthCm`: the average of `depthCm` over events that have one, or `null` when none do.
  - `rateTrend`: `'steady'`, `'slowing'` or `'speeding'`, from comparing the first and last third of the session.
  - `score` from 0 to 100: the weighted average of the percentage for each component, using `SCORE_WEIGHTS`. Leave out any component with no data and rescale the rest. The depth component is the percentage of compressions between `DEPTH_MIN_CM − DEPTH_TOLERANCE_CM` and `DEPTH_MAX_CM + DEPTH_TOLERANCE_CM`.
  - An activity factor so that barely moving cannot score well: multiply the score by `min(1, compressions / (half the compressions expected at RATE_MIN))`.
  - `grade`: 90 and above "Lifesaver", 75 and above "Strong", 50 and above "Getting there", otherwise "Keep practising".
- **Results, in `src/ui/results.js`.** A large score and grade, a bar for each component with the measured number beside it, a container filled by `renderDebriefCard(container, stats)` from Track C, a name field for the leaderboard, and a Try again button. Space also restarts. If depth is shown, label it "Estimated depth".
- **`src/ui/leaderboard.js`.** The top 10 by score, stored in `localStorage` under `pulsecoach.leaderboard.v1` as `{ name, score, avgRate, date }`. Names are at most 12 characters and are rendered with `textContent`. A Reset button asks for confirmation first.

## Done when

- [ ] `npm run check` passes, including new tests that use `makeEvents` from `tests/fixtures/events.js`:
  - A perfect synthetic session scores 95 or more.
  - A session at 85 per minute has a rate component of 0 and a clearly lower score.
  - `rateTrend` detects a session that slows by 15 per minute.
  - Five compressions in 30 seconds scores far below a full session with the same percentages.
  - With no depth data, `avgDepthCm` is `null` and the score uses the other weights rescaled. With depth data, the depth weight is used.
  - Each grade boundary gives the right label.
  - The output has exactly the fields of Contract 2.
  - The leaderboard sorts by score, keeps only 10, and survives a reload, tested with a fake storage object.
- [ ] With `?sim=1`, the whole loop runs from Start to results and back through Try again without a reload. Verify in a browser if you have one available; otherwise say so.
- [ ] A name containing `<b>` appears as literal text in the leaderboard.
- [ ] The results screen shows the debrief card, whatever Track C's card currently renders.
- [ ] No file outside Track B's list was changed.
- [ ] `progress/track-b.md` updated.

## Human check

- Run one full session in the simulator, then one at the camera once Track A's detection is on `main`. The score and breakdown match what happened.
- Run `?sim=1&cpm=85&bend=30`. The score drops and the breakdown shows why.
- Enter a name, reload the page: the entry is still on the leaderboard.
- Then say "ship it".

## Out of scope

The debrief text itself, the setup checklist, visual polish, the error screen.
