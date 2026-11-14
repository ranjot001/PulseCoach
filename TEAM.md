# PulseCoach team guide

Three people, three tracks, six hours. Each track owns its own files, so nobody waits on anybody and merges stay clean.

**What we are building:** a two-person CPR relay drill. The camera notices when a compressor starts to slip, the app calls the switch, times every pause, and debriefs the team. The pitch line is "CPR is a relay, not a sprint."

## Tracks

| Track | Lead | You build | Your first visible result |
|---|---|---|---|
| A · Motion engine | | Camera, body tracking, compression detection, form checks, the slipping signal | "slipping" appearing when your pushes fade |
| B · Coach and drill | | Practice screen, relay drill, metronome, voice coaching, team score, leaderboard | Two people swapping while a pause timer runs |
| C · Debrief and launch | | Team debrief after each drill, the public link, the pitch and the user test | A team debrief with a line for each compressor |

Write each lead's name in the table once the team has agreed.

In the pitch, each lead presents their own part: A explains how the camera spots slipping, B runs the live relay demo with A as the second compressor, and C presents the team debrief and the user-test results.

## How the tracks fit together

- Track A's engine turns the camera into numbers: a compression count, a rate, form warnings, and whether the compressor is slipping.
- Track B's drill runs the turns, calls rhythm checks and switches, times the pauses, and scores the team.
- Track C's debrief card takes the team's score sheet and turns it into coaching text.

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

The first two hours went to the solo coach, which is built. From about 1:45 the work is the relay.

| Clock | Track A | Track B | Track C |
|---|---|---|---|
| 0:00 to 1:45 | `00`, `A1` to `A3` (done) | `B1` to `B4` (done) | `C1`, `C2` (done) |
| 1:45 to 2:00 | Pull the new plan. Start `A4` | Pull the new plan. Start `B5` | Pull the new plan. Ship `C2` |
| **2:00** | **Sync 1.** Everyone ships. First full run with the real camera. | | |
| 2:00 to 3:15 | `A4` (ship `A1` to `A4` together), then `A5` | `B5`, then `B6` | `C3`, then `C4`, then `C5` |
| **3:15** | **Sync 2.** The relay drill is ready to demo. | | |
| 3:15 to 4:00 | `A6`, `A7`, tune the `FATIGUE_*` values on different people | `B7`, then `B8`, `B9` | User test with five people, results into the pitch, then `C6` |
| **4:00** | **Feature freeze.** Only fixes after this. | | |
| 4:00 to 5:15 | Backup relay video, offline run-through | Big-screen check, demo run-throughs | Check the public link, final pitch |
| 5:15 to 6:00 | Rehearse the pitch three times together, then submit | | |

## Rules

- **`main` always runs.** Ship only after the checks pass.
- **Stay in your own files.** The list is in `CLAUDE.md`. If you need something changed in another track, ask that track's lead.
- **Say it out loud.** If a task is taking twice its time budget, tell the team. Someone may be able to unblock you in a minute.
- **Sync points are for everyone.** At 2:00 and 2:30, stop, ship, pull, and run the app together on one laptop.
- **Nothing new after 4:00.** A feature that is not finished by then is left out of the demo.
- **One look.** Every screen follows `tasks/design/relay-mock.png`. Open it before you build anything a judge will see.

## Setting up your laptop

1. Install Node.js 20 or newer, Git, the GitHub CLI, and Claude Code.
2. Run `gh auth login` once and sign in with your GitHub account, so pushes work from Claude sessions.
3. Accept the GitHub invitation to the repository, then clone it.
4. After the scaffold is on `main`, run `npm install`, then `npm run dev`, and open the address it prints with `?sim=1` on the end.
5. Create your branch from `main`.

## Things only a person can do

- Allow the camera and do the human checks.
- Connect the repository to Vercel and add the API key there. The repository owner does this once.
- Record the backup relay video, with two people.
- Run the user test and write down the real results. Never put a number in the pitch that was not measured.
