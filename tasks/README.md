# PulseCoach task files

One shared scaffold, then three tracks that run at the same time. Each task is written so Claude can finish it and prove it is finished.

How to work on a task is in `TEAM.md`. The short version: copy the block under **Goal** into goal mode, do the **Human check**, then tell Claude "ship it".

**The relay pivot.** The product is now a two-person relay drill. The camera notices when a compressor starts to slip, the app calls the switch, and it times every pause. Everything already built stays. The relay tasks are marked **new** below, and the old depth task is gone: we compare each person with their own start instead of claiming centimetres.

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

## Track B · Coach and drill

| Task | File | Minutes | Priority | You end up with |
|---|---|---|---|---|
| B1 | `B1-practice-screen.md` | 45 | Must | Rate gauge, counter, form indicators and metronome (done) |
| B2 | `B2-voice-coaching.md` | 25 | Must | Spoken corrections (done) |
| B3 | `B3-session-score-leaderboard.md` | 45 | Must | The solo loop: start, 30 seconds, score, leaderboard (done) |
| B4 | `B4-polish-and-shortcuts.md` | 35 | Should | Big-screen layout, setup checklist, error screen, shortcuts (done) |
| B5 | `B5-relay-drill.md` | 50 | Must | **New.** Turns, rhythm checks, early switches and the pause timer |
| B6 | `B6-relay-results.md` | 40 | Must | **New.** Team score, compression fraction, switch times, slipping times |

## Track C · Debrief and launch

| Task | File | Minutes | Priority | You end up with |
|---|---|---|---|---|
| C1 | `C1-quick-tips-and-debrief-card.md` | 30 | Must | A debrief card with rule-based tips (done) |
| C2 | `C2-ai-debrief.md` | 40 | Should | Personal coaching text written by Claude (done) |
| C3 | `C3-deploy-and-offline.md` | 20 | Should | A public link and an offline copy |
| C4 | `C4-relay-debrief.md` | 35 | Must | **New.** A team debrief with a line for each compressor |
| C5 | `C5-pitch-kit-and-user-test.md` | 40 | Must | The relay pitch, the demo script and a user test of the slipping signal |

## Order from here

- **Track A:** ship A1 to A3, then A4, then A5, then A6.
- **Track B:** B5 now (it does not wait for Track A), then B6.
- **Track C:** ship C2, then C3, then C4, then C5. C4 builds against `tests/fixtures/relayStats.js`, so it does not wait for Track B.

## If you fall behind

- The relay is ready to demo once A5, B5 and B6 are on `main`. Without A5, the drill still switches on the clock, and `?sim=1` still runs it.
- Cut A6 first, then C3. Keep the backup video if there is any time for it.
- C5 is not optional. A good demo with no story loses to an average demo with a clear one.
- Stop adding features at 4:00, whatever state things are in.
