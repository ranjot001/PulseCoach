# Track A progress

## 00 Scaffold (on `main`)

- Built: Vite + Vitest project, `src/config.js` (CLAUDE.md starting values, no changes), colours in `src/styles.css`, `src/copy.js`, fake engine in `src/engine.js` (Contract 1), stand-in `src/debrief/card.js` (Contract 3), fixtures `tests/fixtures/stats.js` and `tests/fixtures/events.js` (Contract 2), minimal `index.html`/`src/main.js`, `dev/stage.html`, `dev/debrief.html`.
- `createEngine` also accepts optional `timers` ({ setInterval, clearInterval, now }) and `search` (query string) for tests. Both default to the browser's own.
- Fake engine defaults: bend 5, lean 3, recoil 0.95, travel 0.1. `bend>=20`, `lean>=20`, `recoil<0.85` set the matching issue. `depthCm` is null.
- `makeEvents` also takes an optional `depthCm` (default null) for depth-score tests.
- Human checks still to do: open `/?sim=1` (count climbs, rate about 110); add `&bend=30` (elbows true); tell the team the scaffold is on `main`.

## A1 Camera and skeleton (on `track-a`)

- Built: `src/lib/geometry.js` (toPixels, distance, midpoint, angleAt, angleFromVertical), `src/pose/camera.js` (getUserMedia 1280×720, errors mapped to `camera-denied` / `no-camera`), `src/pose/poseTracker.js` (PoseLandmarker lite, VIDEO mode, 1 pose, GPU then CPU fallback, rAF loop, skips frames when video time has not advanced, strictly increasing timestamps, load failure → `model-failed`), `src/ui/stage.js` + `stage.css` + `overlay.js` (mirrored video with thick skeleton for shoulders, elbows, wrists, hips; FPS badge when debug is on).
- `src/engine.js`: `?sim=1` → scaffold fake engine, unchanged. Otherwise camera engine: `ready` = model loaded and a frame in the last second; `personVisible` = at least one shoulder and one hip at or above `MIN_VISIBILITY` (side-on, the far side is often hidden). No compressions yet (A3). Interface unchanged; added optional `mediaDevices` option for tests.
- Model committed at `public/models/pose_landmarker_lite.task` (5.8 MB, from the `latest` float16 link). Wasm and model are served from `public/`, no CDN.
- Test change: the scaffold's rate-zone test used `?cpm=80` without `sim=1`; it now passes `?sim=1&cpm=80`, since only `?sim=1` selects the fake engine.
- No config values changed.
- Human checks still to do: `npm run dev`, open `/dev/stage.html`, allow the camera; skeleton follows shoulders, elbows, wrists, hips; FPS badge shows 20 or more.

## A2 Motion signal and simulator (on `track-a`)

- Built: `src/pose/simSource.js` (`simFrame(tMs, params)` pure, seeded noise; `createSimSource(params, timers)` at 30 fps; params cpm, travel, noise, bend, lean, recoil, scale, seed, plus `drift` for tests), `src/lib/signal.js` (`createMotionSignal(config).push(frame)` → `{ t, raw, smooth, detrended, torsoLen, valid }`), `src/ui/chart.js` (last 6 s of the detrended signal, shown by `setDebug(true)`).
- `src/engine.js`: `?sim=1` now draws the simulated skeleton on a dark stage with a SIMULATED badge. Every frame from the sim or the camera goes through the motion signal and the chart. Compression events and state for `?sim=1` still come from the scaffold stand-in (A3 replaces this). Interface unchanged.
- **Signal definition note (for the team):** `raw` is shoulder-midpoint y minus hip-midpoint y, divided by the rolling-median torso length. Measuring from the top of the frame let the small torso-length wobble during each push leak into the signal, multiplied by the learner's position in the frame: half-scale figures read 27% bigger. Measured from the hips, full and half scale match within 2%. Still "shoulder height in torso units, larger when pushing down", so nothing downstream changes.
- Detrending: moving average over `BASELINE_WINDOW_MS` plus a slope correction, so a steady posture drift does not leave an offset (a plain trailing average lags a drift by half a window, which was right at the 10% limit).
- Config: added two Track A keys, `SMOOTH_WINDOW_MS: 100` (jitter smoothing) and `TORSO_WINDOW_MS: 1000` (torso-length median), so no window is hard-coded. No existing values changed.
- Test change: the scaffold test that looked for the "Fake engine" panel now looks for the SIMULATED badge, which this task replaces it with.
- Human checks still to do: `/dev/stage.html` with the camera, kneel side-on and push on the pillow → one bump per push; hold still → flat line; shift weight slowly → wave stays centred. Also eyeball `/dev/stage.html?sim=1` (moving skeleton, sine wave); no browser was available to me.

## A3 Compression detection and rate (on `track-a`)

- Built: `src/lib/compressionDetector.js` (two-state hysteresis at ±`MIN_TRAVEL`/2 on the detrended signal; emits `index, tBottom, tTop, travel, intervalMs` on each down→up; rejects travel < `MIN_TRAVEL` and strokes closer than `MIN_INTERVAL_MS`; resets after 1 s of invalid signal), `src/lib/rate.js` (60000 / median of the last `RATE_WINDOW` intervals; null before 3 compressions or after `RATE_STALE_MS`; zones slow / good / fast / none).
- `src/engine.js` rewritten: the scaffold stand-in is gone. Camera and `?sim=1` share one path: frame → signal → detector → rate. `onCompression`, `compressions`, `rate`, `rateZone` are real for both. `reset()` zeroes the detector, rate and count. Form fields on events are passing values and `issues` stay clear until A4. Interface unchanged.
- **For Track B:** until A4 ships, `?sim=1&bend=30` (and `lean`, `recoil`) bends the simulated skeleton but does not raise `issues` any more. `rate` is now an integer, `null` until the third compression. The first event of a session has `intervalMs: null`.
- Timing: `tBottom` is the midpoint of the zero crossings either side of the stroke (the bottom of the wave is flat, so the single highest sample jitters by ±2 frames). Falls back to the highest sample if the stroke is lopsided (e.g. stopping mid-push).
- Signal change: the hip reference is now a rolling median over `TORSO_WINDOW_MS`, like torso length, so hip jitter does not add to the signal. With 2 px landmark jitter a still figure went from 7 false counts per 10 minutes to 0.
- Robustness sweep (20 noise seeds × 30 s, with a 2 s still lead-in like the countdown): counts exact at 80/110/140 with 1× and 3× noise; 0 false counts when still with up to 2 px jitter or bouncing at half `MIN_TRAVEL`; 3 px jitter gives about 1 false count per 20 s when completely still. Worst single interval: 6–10% at default noise, and the worst ones are always the first interval after starting from rest (baseline settling); after that ≤ 5%. Rate uses the median, so it is unaffected.
- Tests model a session like the app runs it: still for 2 s (countdown), `reset()`, then compressions. A separate test checks that a cold start with no lead-in still counts right.
- No config values changed.
- Human checks still to do: `/dev/stage.html` with the camera, 20 counted compressions → 20 ± 1; shift posture, talk, reach → count does not move; push to a 110 beat → rate 100 to 120 within five pushes. If it miscounts, tune `MIN_TRAVEL` in `src/config.js`.

## A4 Form checks (on `track-a`)

- Built: `src/lib/form.js`: `chooseArm` (higher average visibility of shoulder, elbow, wrist), `elbowAngleDeg(frame)` and `armLeanDeg(frame)` in pixel space, `createFormTracker(config)` with `onFrame`, `complete(event)`, `getLiveIssues()` (two of the last three), `markRest()`, `reset()`. Angles are the median over each cycle.
- `src/engine.js`: events carry real `elbowAngleDeg`, `armLeanDeg`, `recoilRatio`, `elbowsLocked`, `aligned`, `fullRecoil`; `state.issues.elbows/position/recoil` come from `getLiveIssues()`. `reset()` clears the form tracker. `markRest()` records the rest height. Interface unchanged. Track B's `hud.test.js` "bend=30 → only Elbows is red" passes again.
- `src/ui/overlay.js`: arms drawn thicker in `--bad` while the elbows check is failing.
- Recoil: the release leading into each push, `(bottom − top) / (bottom − rest)`. The rest reference is the median shoulder height over the 400 ms after `markRest()` (the learner is still on "go"); without one, the highest top in the last 6 s. Measured in pixels of shoulder height above the hips, not torso units: torso length shrinks a little during each push, which made every release read about 0.15 too full. `signal.push()` now also returns `smoothPx` for this.
- Simulator: after `markRest()` the simulated learner kneels still for 1 s, then starts compressing from full release (the first push starts smoothly from rest). Before, it kept compressing through the countdown, so the rest reference was a half-released top and `?sim=1&recoil=0.6` could never go red in the app. The motion signal restarts at that moment in sim mode, so its baseline fills with the rest pose as it would for a real learner. New `simFrame` param `motionStartMs` and `createSimSource().rest(ms)`.
- Noise sweep (20 seeds × 20 s each): good technique at 1×, 2× and 3× noise never raised a live issue; bend 25/30 and lean 25 flagged 100%; recoil 0.6 and 0.8 flagged 97% (the misses are the first push from rest). Measured recoil at a true 1.0 is 0.97; at 0.85 it is 0.82.
- No config values changed.
- **Tuning watch at the webcam:** the rest reference is taken once per session. If a learner settles lower after "go" (shifts their knees), every release can look incomplete. If good technique turns Recoil red, lower `RECOIL_MIN_RATIO` first.
- Human checks still to do: main page with the camera; bend elbows → Elbows red within three pushes, green again when straight; sit back with angled arms → Position red; don't come fully up → Recoil red; best technique for 15 s → all three green (if not, loosen that threshold in `src/config.js`).

## A5 Fatigue signal and turns (on `track-a`)

- **For Track B: `engine.markTurn()`, `state.fatigue` and `event.travelRatio` are ready** (Contract 1 as written in CLAUDE.md). `state.fatigue` is always present: `{ slipping, signs }`, signs in the order `'shallower'`, `'slower'`, `'elbows'`. `markTurn()` does not zero the count; event indexes keep counting across turns. In the simulator, `markTurn()` stops the figure for `swap` seconds (default 5), then a fresh compressor starts; `?sim=1&fatigue=1` slips at about 30–33 s into each turn.
- Built: `src/lib/fatigue.js` `createFatigueTracker(config)` with `startTurn()`, `push(event)` → `travelRatio`, `getState()`, `getBaseline()`. Baseline = compressions in the first `FATIGUE_BASELINE_MS` of a turn and at least 6: median travel, median rate, share of locked elbows. Signs compare the last `FATIGUE_WINDOW` compressions with it. Intervals longer than `RATE_STALE_MS` are ignored for rate.
- `src/engine.js`: `markTurn()` starts a fresh fatigue turn and drops the previous person's rest reference and live form issues (recoil falls back to its rolling reference). `reset()` also starts a fresh turn. Debug text shows `slipping: …`.
- Simulator: `fatigue` (0–1) shrinks pushes by up to 25% and the rate by up to 12/min, ramping from 15 s to 35 s into each turn; the phase is the integral of the rate, so the wave stays smooth. `swap` from the address. `fatigue=0` gives exactly the old motion.
- `dev/stage.html`: "Start session" (`reset()` + `markRest()`) and "Mark turn" buttons, fatigue status, and the last compression's travelRatio and form numbers.
- **Detector change:** `travel` is now measured on the smoothed signal, not the detrended one. Detrending inflates the wave by about 9% at 110/min and 18% at 98/min, so a tiring compressor who slowed down looked like they were pushing harder; a true 25% shrink read as 15%. Now it reads 24%. Counting is unchanged in the A3 sweep.
- New `detector.restart()`: forgets the stroke in progress but keeps the index. The simulator's `markRest()` now uses it too.
- Config: added the five `FATIGUE_*` values from CLAUDE.md to the Track A section, unchanged.
- Sweep: 180 fresh 60 s turns (cpm 100/110/120, 1–3× noise, 20 seeds) never falsely slipped. `fatigue=1`: slipping in 20/20 turns at 30–33 s with 'shallower' and 'slower'. `fatigue=0.5` stays under the thresholds by design (12.5% and 6/min).
- Human checks still to do: `/dev/stage.html` with the camera, press "Start session", 15 s of good compressions then clearly smaller and slower → "slipping" within about six pushes with the right signs; "Mark turn" then good compressions → slipping clears, new baseline after 10 s; 40 s of steady good compressions → never slipping (if it does, raise the `FATIGUE_*` thresholds).

## A6 Setup check and video source (on `track-a`)

- Built: `src/lib/setupCheck.js`: `checkFrame(frame, config)` and `checkSetup(recentFrames, config)` → `{ ok, checks }` with `person`, `visible`, `side-on`, `distance`, `in-frame` (ids match Track B's labels; hints exactly as in the task). `ok` once every check has passed on every frame for `SETUP_HOLD_MS`. The engine keeps the last 1.5 s of frames and sends the real result in `state.setup`. Before any frame it is `{ ok: false, checks: [all five failing] }`.
- **Deliberate change to `visible`:** the task says all shoulders, elbows, wrists and hips at 0.6 or more. Side-on, the far arm is hidden behind the body, so a real learner would never pass. It now needs the nearer arm (shoulder, elbow and wrist) and at least one hip at 0.6 or more.
- `src/pose/videoSource.js` `loadVideo(video, src)`: `?video=<path>` plays a looping, muted local clip through the same tracker as the camera, unmirrored (the live camera stays mirrored). A clip that errors or does not load within 10 s → `onError` with `no-camera`. Tested with an injected fake video element (load, loop, play, error, timeout) and in the engine with jsdom's video element (error path, camera never opened). Not tried in a browser with a real clip: no browser was available to me.
- Config: added `SETUP_MIN_VISIBILITY 0.6`, `SETUP_SIDE_ON_MAX 0.45`, `SETUP_TORSO_MIN 0.15`, `SETUP_TORSO_MAX 0.45`, `SETUP_MARGIN 0.02`, `SETUP_HOLD_MS 1000` to the Track A section (the task's numbers).
- **Edited a Track B file, with the person's OK:** `tests/main.test.js` clicked Start the instant the page loaded, which only worked while the engine sent the placeholder `setup: { ok: true, checks: [] }`. One line added before the click: `await vi.advanceTimersByTimeAsync(1500)` so the setup check sees a second of good simulated frames. Track B: please keep that line.
- `?sim=1` reaches `setup.ok` at about 1 s.

### Recording the backup clip (`public/demo.mp4`)

- Laptop on a table at chest height, about 2 m away, landscape. Good light from the front or side, plain background, nobody else in the picture.
- Compressor kneels **side-on** to the camera beside a firm pillow on the floor, head, arms and hips all in view. Check the home-screen checklist is all green before recording.
- One relay: compressor 1 does about 30 s of good compressions at the 110 beat, then lets their form slip for the last 10 s (clearly smaller and slower pushes). Then a switch: compressor 1 moves out of view, compressor 2 kneels in within 5 s and does about 30 s of good compressions.
- Keep it under about 90 s. Record with the laptop camera (QuickTime "New Movie Recording" on a Mac) and export as `.mp4` (H.264). Save it as `public/demo.mp4`; files in `public/` are served at `/`.
- Try it with `?video=/demo.mp4`: it should count like the live camera and show slipping near the end of the first turn. Track B's drill calls `markTurn()` at the switch.

- Human checks still to do: kneel in position and watch the home checklist tick; turn to face the camera → side-on fails with its hint. Record the clip above and run `?video=/demo.mp4`.

## A7 Push-size bars and stage polish (on `track-a`)

- Built: `src/ui/pushBars.js`: `barView(travelRatio, config)` → `{ heightPct, tone }` (ratio 1 at 70%, capped at 100%; `'base'` while null, `'low'` at or below `1 − FATIGUE_TRAVEL_DROP`, else `'ok'`), and `createPushBars(container, config)` with `push(event)`, `clear()`, `setLabel(text, tone)`. Keeps the last `PUSH_BARS`, newest on the right, dashed "your start" line at 70%. While the baseline is set, bars are grey and sized by raw travel against the largest so far.
- Stage (`stage.js`, `stage.css`, `overlay.js`), matched to `tasks/design/relay-mock.png` screen 2: rounded corners and hairline border from the design tokens (with the CLAUDE.md fallbacks), a "LIVE" pill (red dot) or "SIMULATED" (amber dot) top left, debug text moved top right and the debug chart moved above the strip. Skeleton bones in `--accent`, joints in `--fg`; arms stay `--bad` while the elbows check fails. The strip sits over the bottom of the picture on a dark fade and is always visible, debug or not. Bar colours come from `--muted`, `--good`, `--warn` in CSS.
- `src/engine.js`: every compression goes into the strip; `reset()` and `markTurn()` clear it. Label from the fatigue state: "Setting your baseline" (muted) while the baseline is set, then nothing, then the signs in `--warn`: "Smaller pushes", "Slower", "Elbows bending" joined with " · ". Exported `pushBarsLabel()` for tests. Interface unchanged.
- Config: `PUSH_BARS: 40` added to the Track A section (value from CLAUDE.md).
- Not checked in a browser: no browser was available to me. Engine cost is unchanged (36 simulated seconds: about 50 ms of engine work, was 41 ms).
- **For Track B:** `tests/main.test.js` runs a whole 36-simulated-second session inside the default 5 s test timeout. It takes about 0.3 s alone and 1.8–2.8 s in the full suite, but on a busy laptop (Chrome running the live app at 220% CPU, load average 12–23) it timed out 2 times in 7 full runs. Suggest giving that one test a longer timeout, e.g. `it('runs Start → …', async () => { … }, 20000)`.
- Human checks still to do: start a drill with the camera; bars grey for 10 s, then green; smaller pushes → amber bars below the dashed line. From 3 m: green and amber bars are distinguishable and the shrinking is visible.

## Merge of `main` (Track B up to B9, Track C up to C6) into `track-a`

- Merged `origin/main` (PRs #2 and #3) into `track-a`. One git conflict, in `tests/main.test.js`: kept Track B's new solo button selector and the A6 wait for the setup check.
- **Track B test files updated for the real engine, with the person's OK** (they were written against the scaffold's fake engine). No behaviour checks removed; only timings:
  - `tests/main-relay-engine.test.js`: wait 1.5 s for the setup check before pressing Start; turn 1 ends about 21.6 s after Go (the real first compression is about 1.6 s after Go, not 0.5 s), so the switch is checked at 22 s instead of 21 s.
  - `tests/main-relay.test.js`: the same setup wait; address `&swap=0` so the simulated compressor keeps pushing through the rhythm check (which is what the test checks); turn clock reads `12s` at 10 s; switch checked at 22 s instead of 20.7 s.
- Track A fix found by the merge: the stage and debug chart no longer call `canvas.getContext()` under jsdom, which logged a console error that Track B's relay test checks for.
- End-to-end check of the merged app on the real engine (simulator): a two-turn relay runs, the real `markTurn()` gives a 6.0 s switch pause, results show score 99, compression fraction 83%, one switch, two turns. With `?sim=1&fatigue=1` the slipping chip shows at 32 s and the app calls the early switch at 35 s.
- `npm run check`: 453 tests pass across all tracks, three runs in a row.
