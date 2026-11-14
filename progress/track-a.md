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
