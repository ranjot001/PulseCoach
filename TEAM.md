# PulseCoach team guide

Three people, three tracks, six hours. Each track owns its own files, so nobody waits on anybody and merges stay clean.

## Tracks

| Track | Lead | You build | Your first visible result |
|---|---|---|---|
| A · Motion engine | | Camera, body tracking, compression detection, form checks | A skeleton following you on the webcam |
| B · Coach and session | | Practice screen, metronome, voice coaching, score, leaderboard | A live practice screen with a rate gauge |
| C · Debrief and launch | | Coaching text after each session, the public link, the pitch and the user test | A debrief card with personal tips |

Write each lead's name in the table once the team has agreed.

In the pitch, each lead presents their own part: A explains how the camera measures compressions, B runs the live demo, and C presents the AI debrief and the user-test results.

## How the tracks fit together

- Track A's engine turns the camera into numbers: a compression count, a rate, and form warnings.
- Track B's screens show those numbers, speak corrections and score the session.
- Track C's debrief card takes the session's score sheet and turns it into coaching text.

The first task, `00-scaffold`, sets up all three connection points with stand-ins. From then on the app always runs, and each track swaps its stand-in for the real thing.

## Working on a task

1. Pull the latest code and switch to your branch: `track-a`, `track-b` or `track-c`.
2. Open Claude Code in the project folder.
3. Open your next task file in `tasks/` and copy the block under **Goal** into goal mode.
4. When Claude reports that it is finished, do the **Human check** in the task file.
5. If the check fails, tell Claude what you saw.
6. When it passes, tell Claude: "ship it". Claude merges the latest `main` into your branch, runs the checks, and pushes to `main`.
7. Post one line in the team chat saying what you shipped.
8. Start a fresh Claude session for the next task.

## Timeline

| Clock | Track A | Track B | Track C |
|---|---|---|---|
| 0:00 to 0:20 | `00` Scaffold, shipped to `main` | Set up laptop, read `CLAUDE.md` | Set up laptop, read `CLAUDE.md` |
| 0:20 to 1:00 | `A1`, start `A2` | `B1` | `C1`, start `C2` |
| 1:00 to 2:00 | `A2`, `A3` | `B2`, start `B3` | `C2`, `C3`, start `C4` |
| **2:00** | **Sync 1.** Everyone ships. First full run with the real camera. | | |
| 2:00 to 2:30 | `A4` | Finish `B3` | Finish `C4` |
| **2:30** | **Sync 2.** The app is ready to demo. | | |
| 2:30 to 3:30 | `A5`, then `A6` or tuning | `B4`, then fixes | User test with five people |
| 3:30 to 4:00 | Tune thresholds on different people | Fixes from the user test | Results into the pitch |
| **4:00** | **Feature freeze.** Only fixes after this. | | |
| 4:00 to 5:15 | Backup video, offline run-through | Big-screen check, demo run-throughs | Check the public link, final pitch |
| 5:15 to 6:00 | Rehearse the pitch three times together, then submit | | |

## Rules

- **`main` always runs.** Ship only after the checks pass.
- **Stay in your own files.** The list is in `CLAUDE.md`. If you need something changed in another track, ask that track's lead.
- **Say it out loud.** If a task is taking twice its time budget, tell the team. Someone may be able to unblock you in a minute.
- **Sync points are for everyone.** At 2:00 and 2:30, stop, ship, pull, and run the app together on one laptop.
- **Nothing new after 4:00.** A feature that is not finished by then is left out of the demo.

## Setting up your laptop

1. Install Node.js 20 or newer, Git, the GitHub CLI, and Claude Code.
2. Run `gh auth login` once and sign in with your GitHub account, so pushes work from Claude sessions.
3. Accept the GitHub invitation to the repository, then clone it.
4. After the scaffold is on `main`, run `npm install`, then `npm run dev`, and open the address it prints with `?sim=1` on the end.
5. Create your branch from `main`.

## Things only a person can do

- Allow the camera and do the human checks.
- Connect the repository to Vercel and add the API key there. The repository owner does this once.
- Record the backup demo video.
- Run the user test and write down the real results. Never put a number in the pitch that was not measured.
