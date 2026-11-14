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
