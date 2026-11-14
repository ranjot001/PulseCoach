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
