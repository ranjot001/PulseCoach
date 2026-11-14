# PulseCoach task files

One shared scaffold, then three tracks that run at the same time. Each task is written so Claude can finish it and prove it is finished.

How to work on a task is in `TEAM.md`. The short version: copy the block under **Goal** into goal mode, do the **Human check**, then tell Claude "ship it".

**The relay pivot.** The product is now a two-person relay drill. The camera notices when a compressor starts to slip, the app calls the switch, and it times every pause. Everything already built stays. The relay tasks are marked **new** below, and the old depth task is gone: we compare each person with their own start instead of claiming centimetres.

**The look.** Every screen is built to one design: open `tasks/design/relay-mock.png`. The tasks marked **extra** add the features in that picture.

## Shared

| Task | File | Minutes | You end up with |
|---|---|---|---|
| 00 | `00-scaffold.md` | 20 | A running project on `main` with stand-ins for all three tracks (done) |

## Track A · Motion engine

| Task | File | Minutes | Priority | You end up with |
|---|---|---|---|---|
| A1 | `A1-camera-and-skeleton.md` | 30 | Must | Webcam on screen with a skeleton over it (done) |
| A2 | `A2-motion-signal-and-simulator.md` | 30 | Must | A live wave of each push, and a no-camera simulator (done) |
| A3 | `A3-compression-detection-and-rate.md` | 35 | Must | Real compression counts and rate from the camera (done) |
| A4 | `A4-form-checks.md` | 30 | Must | Elbows, position and recoil warnings |
| A5 | `A5-fatigue-and-turns.md` | 35 | Must | **New.** The slipping signal, `markTurn()`, and a simulator that tires |
| A6 | `A6-setup-check-and-video-source.md` | 25 | Should | A position check, and a recorded-video backup |
| A7 | `A7-push-size-bars.md` | 25 | Should | **Extra.** Live bars on the camera picture showing each push against your start |

## Track B · Coach and drill

| Task | File | Minutes | Priority | You end up with |
|---|---|---|---|---|
| B1 | `B1-practice-screen.md` | 45 | Must | Rate gauge, counter, form indicators and metronome (done) |
| B2 | `B2-voice-coaching.md` | 25 | Must | Spoken corrections (done) |
| B3 | `B3-session-score-leaderboard.md` | 45 | Must | The solo loop: start, 30 seconds, score, leaderboard (done) |
| B4 | `B4-polish-and-shortcuts.md` | 35 | Should | Big-screen layout, setup checklist, error screen, shortcuts (done) |
| B5 | `B5-relay-drill.md` | 50 | Must | **New.** Turns, rhythm checks, early switches and the pause timer |
| B6 | `B6-relay-results.md` | 40 | Must | **New.** Team score, compression fraction, switch times, slipping times |
| B7 | `B7-design-pass.md` | 45 | Must | **Extra.** Every screen restyled to the design reference |
| B8 | `B8-drill-timeline-and-history.md` | 35 | Should | **Extra.** The chart of the whole relay, and saved drill history |
| B9 | `B9-flow-meter.md` | 30 | Should | **Extra.** A flow meter that drains during pauses, and live "On the chest" |

## Track C · Debrief and launch

| Task | File | Minutes | Priority | You end up with |
|---|---|---|---|---|
| C1 | `C1-quick-tips-and-debrief-card.md` | 30 | Must | A debrief card with rule-based tips (done) |
| C2 | `C2-ai-debrief.md` | 40 | Should | Personal coaching text written by Claude (done) |
| C3 | `C3-deploy-and-offline.md` | 20 | Should | A public link and an offline copy |
| C4 | `C4-relay-debrief.md` | 35 | Must | **New.** A team debrief with a line for each compressor |
| C5 | `C5-pitch-kit-and-user-test.md` | 40 | Must | The relay pitch, the demo script and a user test of the slipping signal |
| C6 | `C6-educator-view.md` | 40 | Should | **Extra.** A page of every saved drill for the nurse educator, with CSV and print |

## Order from here

- **Track A:** A4, then ship A1 to A4 together (shipping A1 to A3 alone breaks one of Track B's tests), then A5, A6, A7.
- **Track B:** B5 now (it does not wait for Track A), then B6, B7, B8, B9.
- **Track C:** ship C2, then C3, C4, C5, C6. C4 and C6 build against the samples in `tests/fixtures/`, so they do not wait for Track B.

## If you fall behind

- The relay is ready to demo once A5, B5 and B6 are on `main`. Without A5, the drill still switches on the clock, and `?sim=1` still runs it.
- Cut the extras in this order: B9, C6, A7, B8. Keep B7: the look is what judges see first.
- Then cut A6, then C3. Keep the backup video if there is any time for it.
- C5 is not optional. A good demo with no story loses to an average demo with a clear one.
- Stop adding features at 4:00, whatever state things are in.
