# PulseCoach

A web app that trains CPR as a team relay using only a laptop webcam. Two learners take turns kneeling over a firm pillow, side-on to the camera. The app tracks whoever is compressing. It counts compressions, checks rate and form, notices when compressions start to slip, and calls the switch. A simulated monitor interrupts for rhythm checks, and the app times every hands-off pause. The drill ends with a team score and a debrief for each compressor. A 30-second solo practice mode is kept as well. It covers adult hands-only CPR.

**Why a relay.** After a 911 call, help takes a median of 7 minutes to arrive, and 13 in rural areas. In manikin studies, compression quality starts to drop after about one minute, and rescuers do not notice for about three. Guidelines say to switch compressors every 2 minutes, or sooner if tired, to keep pauses under 10 seconds, and to keep compressions going at least 80% of the time. The pitch line is "CPR is a relay, not a sprint." The users are nurses and code teams, who rotate compressors as standard practice.

This is a 6-hour hackathon build by a team of three. A feature that works reliably in a live demo beats a cleverer one that sometimes fails. When in doubt, choose the simpler option and move on.

## How the work is organised

Three people build at the same time, one track each. Every track owns its own files, and the tracks meet only at the three contracts described below.

| Track | Builds | Branch |
|---|---|---|
| A · Motion engine | Camera, body tracking, compression detection, form checks, the fatigue signal | `track-a` |
| B · Coach and drill | Practice screen, relay drill, metronome, voice, score, leaderboard | `track-b` |
| C · Debrief and launch | Debrief for each compressor and the team, public link, pitch kit | `track-c` |

- Tasks are in `tasks/`. `00-scaffold.md` comes first and is shared. After that, each track runs its own tasks in order: `A1`, `A2`, and so on. `tasks/README.md` lists the order.
- Work on exactly one task per session: the one you are given.
- Each task file has a **Done when** checklist. The task is finished only when every item is verified and your final output shows `npm test` and `npm run build` passing.
- Items under **Human check** need a real webcam and a person. You cannot verify them. Leave them for the person and list them in your final message.
- Stay inside the task and inside your track's files. Do not start the next task.
- When you finish, append a short entry to your track's progress file, `progress/track-a.md`, `progress/track-b.md` or `progress/track-c.md`: what was built, any config values you changed and why, and the human checks still to do.

## Who owns which files

| Track | Files |
|---|---|
| A | `src/engine.js`, `src/pose/`, `src/lib/geometry.js`, `src/lib/signal.js`, `src/lib/compressionDetector.js`, `src/lib/rate.js`, `src/lib/form.js`, `src/lib/fatigue.js`, `src/lib/setupCheck.js`, `src/ui/stage.js`, `src/ui/stage.css`, `src/ui/overlay.js`, `src/ui/chart.js`, `dev/stage.html`, `public/models/` |
| B | `index.html`, `src/main.js`, `src/styles.css`, `src/copy.js`, `src/ui/hud.js`, `src/ui/home.js`, `src/ui/results.js`, `src/ui/relayResults.js`, `src/ui/leaderboard.js`, `src/audio/`, `src/lib/feedback.js`, `src/lib/score.js`, `src/lib/relay.js` |
| C | `api/`, `src/debrief/`, `dev/debrief.html`, `vite.config.js`, `vercel.json`, `.env.example`, `README.md`, `docs/` |
| Shared | `package.json`, `src/config.js`, `tests/fixtures/`, `CLAUDE.md`, `TEAM.md`, `tasks/` |

- Each track also owns the tests for its own files. Name a test after the file it tests, such as `tests/signal.test.js`.
- **Never edit another track's file.** If you need a change there, write the request in your progress file and tell the person, who will ask that track's owner.
- **Shared files** are set up by the scaffold task. In `src/config.js`, change only the values in your own track's section. Do not add dependencies to `package.json`; the scaffold installs everything.

## Branches and shipping

- Work only on your track's branch. Never commit directly on `main`. The scaffold task is the one exception.
- Commit often on your branch, with messages like `A3: compression detector`.
- `main` must always run. Ship to it only when the person says to, and only when the task's Done-when list is complete:
  1. `git fetch origin`, then merge `origin/main` into your track branch.
  2. If a file from another track conflicts, stop and tell the person. Resolve conflicts only in your own track's files.
  3. `npm run check`.
  4. Switch to `main`, pull, merge your track branch, run `npm run check` again, and push `main`.
  5. Switch back to your track branch, merge `main`, and push the branch.
- If a push is rejected, pull and repeat from step 4. Never force-push and never rewrite history.

## Stack

| Need | Choice |
|---|---|
| Build tool | Vite, vanilla JavaScript (ES modules), plain CSS. No UI framework. |
| Pose tracking | `@mediapipe/tasks-vision` `PoseLandmarker`, lite model, video mode, one pose |
| Tests | Vitest. `npm test` runs `vitest run`. `npm run check` runs the tests, then the build. |
| Metronome | Web Audio API |
| Voice | Browser `speechSynthesis` |
| Leaderboard | `localStorage` |
| AI debrief | One serverless function, `api/debrief.js`, calling the Claude API |
| Hosting | Vercel |

Everything in `src/lib/` is pure logic: no DOM, no timers, no browser APIs. That is what makes it testable without a camera.

## The relay drill

How the drill runs, so every track builds the same thing:

1. A countdown, then compressor 1 starts. The camera tracks one person at a time, so the waiting compressor stays out of its view until the switch. The app does not recognise faces or tell people apart; it assigns turns in order.
2. Each turn lasts `DRILL_TURN_SECONDS`. The guideline is 2 minutes; the default is shorter so the demo fits in a pitch.
3. A turn ends early when the compressor's compressions have been slipping for `EARLY_SWITCH_MS`, and at least `MIN_TURN_SECONDS` have passed. The voice says to switch now.
4. At every switch, the voice says "Stop compressions. Rhythm check." The screen shows a pause timer that counts up: green, then amber after `PAUSE_WARN_SEC`, then red after `PAUSE_MAX_SEC`. After `RHYTHM_CHECK_MS`, the voice says "Switch compressors. Resume now." The pause ends at the next compression.
5. After `DRILL_TURNS` turns, the results show the team score, the compression fraction, every pause, and each compressor's turn, followed by the debrief.

**Slipping** means a compressor has dropped clearly below their own level from the start of their turn: smaller pushes, a slower rate, or bending elbows. The app compares each person with themselves, never with a fixed depth in centimetres.

**Hands-off time** is the time before the first compression, every gap between compressions longer than `PAUSE_MIN_MS`, and the time after the last compression until the drill ends. **Compression fraction** is the percentage of the drill that was not hands-off.

## Contract 1: the engine (Track A provides, Track B uses)

```js
import { createEngine } from './engine.js';

const engine = createEngine({
  stage,                    // a container element; the engine puts the video, skeleton and debug chart inside it
  onState(state) {},        // about 10 times a second
  onCompression(event) {},  // once per compression
  onError(error) {},        // { code, message }; codes: 'camera-denied', 'no-camera', 'model-failed'
});

await engine.start();   // source comes from the address: ?sim=1, ?video=<path>, otherwise the camera
engine.stop();
engine.reset();         // zero the counters before a new session; also starts a fresh turn
engine.markRest();      // call when the countdown ends; records the resting shoulder height
engine.markTurn();      // call when a switch begins; the next compressions set the new compressor's own baseline
engine.setDebug(true);  // show or hide the debug chart and frame counter
```

**State**, sent about 10 times a second:

```js
{
  ready,           // model loaded and frames arriving
  personVisible,   // boolean
  compressions,    // count since reset()
  rate,            // compressions per minute, or null
  rateZone,        // 'slow' | 'good' | 'fast' | 'none'
  issues: {
    elbows,        // true while the check is failing
    position,      // true while the check is failing
    recoil,        // true while the check is failing
    depth,         // always null; absolute depth is not measured
  },
  fatigue: {
    slipping,      // true while this compressor is clearly below their own baseline
    signs,         // the reasons, from 'shallower', 'slower', 'elbows'; [] when not slipping
  },
  setup: { ok, checks },   // checks: [{ id, pass, hint }]; { ok: true, checks: [] } until the setup task ships
}
```

**Compression event**, one per compression:

```js
{
  index, tBottom, tTop, travel, intervalMs,
  elbowAngleDeg, armLeanDeg, recoilRatio,
  elbowsLocked, aligned, fullRecoil,
  depthCm,         // always null
  travelRatio      // this push's travel divided by the compressor's own baseline; null while the baseline is being set
}
```

`markTurn()`, `fatigue` and `travelRatio` arrive with task A5. Until that is on `main`, code that uses them must cope with an engine that lacks them: call `engine.markTurn?.()`, treat a missing `fatigue` as `{ slipping: false, signs: [] }`, and a missing `travelRatio` as `null`.

The scaffold shipped this interface backed by a fake engine. Track A replaces the inside task by task, and changes the interface only by adding to it as agreed here.

Simulator settings, read from the address: `cpm` (default 110), `bend` (degrees of elbow bend), `lean` (degrees of arm lean), `recoil` (0 to 1), `travel` (torso units), `fatigue` (0 = never tires, 1 = from about 15 seconds into each turn, pushes shrink and the rate drops until the compressor is clearly slipping by about 35 seconds), and `swap` (seconds the simulated compressor stops after `markTurn()` before a fresh one starts; default 5).

## Contract 2: session stats (Track B provides, Track C uses)

**Solo stats and per-turn stats.** `summarise(events, durationSec, config)` in `src/lib/score.js` returns:

```js
{
  durationSec, compressions, avgRate,
  pctRateInRange, pctElbowsLocked, pctAligned, pctRecoil,   // 0 to 100
  avgDepthCm,      // number or null; null now that depth is not measured
  rateTrend,       // 'steady' | 'slowing' | 'speeding'
  score,           // 0 to 100
  grade            // short label
}
```

**Relay stats.** `summariseRelay(drill, config)` in `src/lib/score.js` returns:

```js
{
  mode: 'relay',
  durationSec,          // the whole drill, pauses included
  compressions,         // all turns together
  compressionFraction,  // 0 to 100
  switches,             // number of compressor changes
  earlySwitches,        // switches called by the slipping check before the turn's time was up
  avgSwitchSec,         // mean hands-off seconds at a switch, or null with no switch
  longestPauseSec,      // longest hands-off gap anywhere in the drill
  score,                // team score, 0 to 100
  grade,                // short label
  turns: [              // one per turn, in order
    {
      compressor,       // 1 or 2
      // ...every field of the solo stats above, for this turn...
      slippedAtSec,     // seconds into the turn when slipping began, or null
      signs,            // subset of 'shallower', 'slower', 'elbows' seen while slipping
    },
  ],
}
```

Solo stats have no `mode` field. Consumers treat a missing `mode` as solo. Samples are in `tests/fixtures/stats.js` (solo) and `tests/fixtures/relayStats.js` (relay).

## Contract 3: the debrief card (Track C provides, Track B uses)

```js
import { renderDebriefCard } from './debrief/card.js';

renderDebriefCard(container, stats);   // solo or relay stats; shows quick tips at once, then swaps in the AI text when it arrives
```

The card never throws and never leaves the container empty.

## Other shared definitions

**Frame.** Every frame source inside the engine (camera, simulator, video file) produces the same object:

```js
{ t, width, height, landmarks }
// t          milliseconds, strictly increasing
// width      frame width in pixels
// height     frame height in pixels
// landmarks  33 items of { x, y, z, visibility }, x and y normalised 0..1, or null if no person
```

Landmark indices used: shoulders 11 and 12, elbows 13 and 14, wrists 15 and 16, hips 23 and 24.

**Motion signal.** Shoulder-midpoint height in pixels divided by torso length in pixels (shoulder midpoint to hip midpoint). The unit is "torso units", so the signal does not depend on how far the learner is from the camera. Image y grows downward, so pushing down makes the signal larger.

**Colours.** `src/styles.css` defines `--bg`, `--fg`, `--muted`, `--good`, `--warn` and `--bad`. Every track uses these variables and no other colours for status.

## CPR targets (adult, hands-only)

| Measure | Target |
|---|---|
| Rate | 100 to 120 compressions per minute |
| Recoil | Chest fully released after every compression |
| Arms | Elbows locked, shoulders directly over hands |
| Switching | Change compressors every 2 minutes, or sooner if tired |
| Pauses | Under 10 seconds |
| Compression fraction | 80% of the time or more (60% at the very least) |

Adult depth is 5 to 6 cm, but the app does not measure absolute depth. It tracks each compressor's push size against their own start.

## Starting values for `src/config.js`

```js
// Track A
BASELINE_WINDOW_MS: 1000,      // detrending window
MIN_TRAVEL: 0.03,              // torso units; smaller movements are not compressions
MIN_INTERVAL_MS: 250,          // two compressions cannot be closer than this
RATE_MIN: 100, RATE_MAX: 120,
RATE_WINDOW: 5, RATE_STALE_MS: 2000,
ELBOW_LOCKED_DEG: 160, ARM_LEAN_MAX_DEG: 15, RECOIL_MIN_RATIO: 0.85,
MIN_VISIBILITY: 0.5,
TORSO_CM: 50, DEPTH_MIN_CM: 5, DEPTH_MAX_CM: 6, DEPTH_TOLERANCE_CM: 0.5,
FEATURES: { depth: false },    // stays false: absolute depth is out of the product

// Track B
METRONOME_BPM: 110,
SESSION_SECONDS: 30,
VOICE_COOLDOWN_MS: 3500, VOICE_REPEAT_MS: 8000,
SCORE_WEIGHTS: { rate: 40, elbows: 20, alignment: 20, recoil: 20, depth: 15 },

// Track C
DEBRIEF_TIMEOUT_MS: 6000
```

Added for the relay drill:

```js
// Track A (task A5)
FATIGUE_BASELINE_MS: 10000,    // the first 10 s of compressions in a turn set the compressor's own baseline
FATIGUE_WINDOW: 6,             // recent compressions compared with the baseline
FATIGUE_TRAVEL_DROP: 0.2,      // pushes this much smaller than baseline: 'shallower'
FATIGUE_RATE_DROP_CPM: 8,      // rate this much below baseline: 'slower'
FATIGUE_ELBOW_DROP: 0.3,       // share of locked elbows this much below baseline: 'elbows'

// Track B (tasks B5 and B6)
DRILL_TURNS: 2,                // turns in one drill; compressors alternate 1, 2, 1, 2
DRILL_TURN_SECONDS: 40,        // the guideline is 120; shorter so the demo fits in a pitch
MIN_TURN_SECONDS: 15,          // no early switch before this
EARLY_SWITCH_MS: 3000,         // slipping must last this long before the app calls the switch
RHYTHM_CHECK_MS: 3000,         // simulated monitor analysis at each switch
PAUSE_MIN_MS: 1500,            // a gap between compressions longer than this is hands-off time
PAUSE_WARN_SEC: 5, PAUSE_MAX_SEC: 10,
CCF_MIN: 60, CCF_TARGET: 80,   // compression fraction: floor and target, in percent
RELAY_WEIGHTS: { technique: 60, handsOff: 40 },
```

These are starting points. People will tune them at the webcam, so never hard-code a threshold anywhere else.

## Rules that apply to every task

- **Pixels before geometry.** Normalised x and y have different scales on a 16:9 frame. Convert landmarks to pixels before computing any distance or angle.
- **Timestamps.** MediaPipe `detectForVideo` needs strictly increasing timestamps. Skip a frame when the video time has not advanced.
- **Never break the simulator.** `?sim=1` must keep working after every task. It is how you verify the app without a camera, how the other tracks build without waiting, and the backup for the live demo. Once A5 ships, `?sim=1&fatigue=1` must show a compressor slipping and the app calling an early switch.
- **Never break a contract.** If a contract has to change, stop and tell the person. All three tracks must agree first.
- **Runs offline.** The page must load and work with no internet, apart from the AI debrief, which has a fallback. No CDN scripts, no web fonts. Model and wasm files are served from `public/`.
- **No secrets in the browser.** The API key is read only inside `api/debrief.js` from an environment variable. Never print, log or commit it.
- **Readable from 3 metres.** Judges watch from a distance. Dark background, very large numbers, high contrast, and one consistent colour code: green for good, amber for nearly, red for fix this.
- **Honest wording.** This is a practice aid for adult hands-only CPR. Call the fatigue check "slipping" or "dropping off"; it compares a person with their own start and is not a measurement of force or depth. When quoting fatigue research, say it comes from manikin studies. Never say certified, accurate, clinical or medical-grade. Do not give medical advice beyond compression technique.
- **Render user text safely.** Leaderboard names are set with `textContent`, never `innerHTML`.
- **Tests use synthetic data.** No test may need a camera, a network call or a real API key.
- **Finish with proof.** End every task by running `npm test` and `npm run build` and showing the output.
