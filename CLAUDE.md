# PulseCoach

A web app that coaches CPR chest compressions using only a laptop webcam. The learner kneels over a firm pillow, side-on to the camera. The app tracks their body, counts compressions, checks rate and form, speaks corrections, and scores a 30-second session. It covers adult hands-only CPR.

This is a 6-hour hackathon build by a team of three. A feature that works reliably in a live demo beats a cleverer one that sometimes fails. When in doubt, choose the simpler option and move on.

## How the work is organised

Three people build at the same time, one track each. Every track owns its own files, and the tracks meet only at the three contracts described below.

| Track | Builds | Branch |
|---|---|---|
| A · Motion engine | Camera, body tracking, compression detection, form checks | `track-a` |
| B · Coach and session | Practice screen, metronome, voice, score, leaderboard | `track-b` |
| C · Debrief and launch | Coaching text after each session, public link, pitch kit | `track-c` |

- Tasks are in `tasks/`. `00-scaffold.md` comes first and is shared. After that, each track runs its own tasks in order: `A1`, `A2`, and so on.
- Work on exactly one task per session: the one you are given.
- Each task file has a **Done when** checklist. The task is finished only when every item is verified and your final output shows `npm test` and `npm run build` passing.
- Items under **Human check** need a real webcam and a person. You cannot verify them. Leave them for the person and list them in your final message.
- Stay inside the task and inside your track's files. Do not start the next task.
- When you finish, append a short entry to your track's progress file, `progress/track-a.md`, `progress/track-b.md` or `progress/track-c.md`: what was built, any config values you changed and why, and the human checks still to do.

## Who owns which files

| Track | Files |
|---|---|
| A | `src/engine.js`, `src/pose/`, `src/lib/geometry.js`, `src/lib/signal.js`, `src/lib/compressionDetector.js`, `src/lib/rate.js`, `src/lib/form.js`, `src/lib/depth.js`, `src/lib/setupCheck.js`, `src/ui/stage.js`, `src/ui/stage.css`, `src/ui/overlay.js`, `src/ui/chart.js`, `dev/stage.html`, `public/models/` |
| B | `index.html`, `src/main.js`, `src/styles.css`, `src/copy.js`, `src/ui/hud.js`, `src/ui/home.js`, `src/ui/results.js`, `src/ui/leaderboard.js`, `src/audio/`, `src/lib/feedback.js`, `src/lib/score.js` |
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
engine.reset();         // zero the counters before a new session
engine.markRest();      // call when the countdown ends; records the resting shoulder height
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
    depth,         // null, 'shallow' or 'deep'; null until the depth task ships
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
  depthCm          // number, or null until the depth task ships
}
```

The scaffold ships this exact interface backed by a fake engine that invents plausible state and events. Track A replaces the inside task by task and never changes the interface. Track B builds against it from the first minute.

Simulator settings, read from the address in every version of the engine: `cpm` (default 110), `bend` (degrees of elbow bend), `lean` (degrees of arm lean), `recoil` (0 to 1), `travel` (torso units).

## Contract 2: session stats (Track B provides, Track C uses)

`summarise(events, durationSec, config)` in `src/lib/score.js` returns:

```js
{
  durationSec, compressions, avgRate,
  pctRateInRange, pctElbowsLocked, pctAligned, pctRecoil,   // 0 to 100
  avgDepthCm,      // number or null
  rateTrend,       // 'steady' | 'slowing' | 'speeding'
  score,           // 0 to 100
  grade            // short label
}
```

Sample objects in this shape are in `tests/fixtures/stats.js`.

## Contract 3: the debrief card (Track C provides, Track B uses)

```js
import { renderDebriefCard } from './debrief/card.js';

renderDebriefCard(container, stats);   // shows quick tips at once, then swaps in the AI text when it arrives
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
| Depth | 5 to 6 cm |
| Recoil | Chest fully released after every compression |
| Arms | Elbows locked, shoulders directly over hands |

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
FEATURES: { depth: false },

// Track B
METRONOME_BPM: 110,
SESSION_SECONDS: 30,
VOICE_COOLDOWN_MS: 3500, VOICE_REPEAT_MS: 8000,
SCORE_WEIGHTS: { rate: 40, elbows: 20, alignment: 20, recoil: 20, depth: 15 },

// Track C
DEBRIEF_TIMEOUT_MS: 6000
```

These are starting points. People will tune them at the webcam, so never hard-code a threshold anywhere else.

## Rules that apply to every task

- **Pixels before geometry.** Normalised x and y have different scales on a 16:9 frame. Convert landmarks to pixels before computing any distance or angle.
- **Timestamps.** MediaPipe `detectForVideo` needs strictly increasing timestamps. Skip a frame when the video time has not advanced.
- **Never break the simulator.** `?sim=1` must keep working after every task. It is how you verify the app without a camera, how the other tracks build without waiting, and the backup for the live demo.
- **Never break a contract.** If a contract has to change, stop and tell the person. All three tracks must agree first.
- **Runs offline.** The page must load and work with no internet, apart from the AI debrief, which has a fallback. No CDN scripts, no web fonts. Model and wasm files are served from `public/`.
- **No secrets in the browser.** The API key is read only inside `api/debrief.js` from an environment variable. Never print, log or commit it.
- **Readable from 3 metres.** Judges watch from a distance. Dark background, very large numbers, high contrast, and one consistent colour code: green for good, amber for nearly, red for fix this.
- **Honest wording.** This is a practice aid for adult hands-only CPR. Say "estimated depth". Never say certified, accurate, clinical or medical-grade. Do not give medical advice beyond compression technique.
- **Render user text safely.** Leaderboard names are set with `textContent`, never `innerHTML`.
- **Tests use synthetic data.** No test may need a camera, a network call or a real API key.
- **Finish with proof.** End every task by running `npm test` and `npm run build` and showing the output.
