# PulseCoach task files

Fifteen tasks: one shared scaffold, then three tracks that run at the same time. Each task is written so Claude can finish it and prove it is finished.

How to work on a task is in `TEAM.md`. The short version: copy the block under **Goal** into goal mode, do the **Human check**, then tell Claude "ship it".

## Shared

| Task | File | Minutes | You end up with |
|---|---|---|---|
| 00 | `00-scaffold.md` | 20 | A running project on `main` with stand-ins for all three tracks |

## Track A · Motion engine

| Task | File | Minutes | Priority | You end up with |
|---|---|---|---|---|
| A1 | `A1-camera-and-skeleton.md` | 30 | Must | Webcam on screen with a skeleton over it |
| A2 | `A2-motion-signal-and-simulator.md` | 30 | Must | A live wave of each push, and a no-camera simulator |
| A3 | `A3-compression-detection-and-rate.md` | 35 | Must | Real compression counts and rate from the camera |
| A4 | `A4-form-checks.md` | 30 | Must | Elbows, position and recoil warnings |
| A5 | `A5-setup-check-and-video-source.md` | 25 | Should | A position check, and a recorded-video backup |
| A6 | `A6-depth-estimate.md` | 20 | Stretch | Estimated depth in centimetres |

## Track B · Coach and session

| Task | File | Minutes | Priority | You end up with |
|---|---|---|---|---|
| B1 | `B1-practice-screen.md` | 45 | Must | Rate gauge, counter, form indicators and metronome |
| B2 | `B2-voice-coaching.md` | 25 | Must | Spoken corrections |
| B3 | `B3-session-score-leaderboard.md` | 45 | Must | The full loop: start, 30 seconds, score, leaderboard |
| B4 | `B4-polish-and-shortcuts.md` | 35 | Should | Big-screen layout, setup checklist, error screen, shortcuts |

## Track C · Debrief and launch

| Task | File | Minutes | Priority | You end up with |
|---|---|---|---|---|
| C1 | `C1-quick-tips-and-debrief-card.md` | 30 | Must | A debrief card with rule-based tips |
| C2 | `C2-ai-debrief.md` | 40 | Should | Personal coaching text written by Claude |
| C3 | `C3-deploy-and-offline.md` | 20 | Should | A public link and an offline copy |
| C4 | `C4-pitch-kit-and-user-test.md` | 40 | Must | The pitch script, the demo script and a user-test sheet |

## If you fall behind

- The app is ready to demo once `A4`, `B3` and `C1` are on `main`. Everything else improves it.
- Skip `A6` first. Then trim `B4` to the error screen and the big-screen layout.
- `C4` is not optional. A good demo with no story loses to an average demo with a clear one.
- Stop adding features at 4:00, whatever state things are in.
