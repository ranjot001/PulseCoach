# A1: Camera and skeleton

**Track:** A · Motion engine · **Branch:** `track-a` · **Time budget:** 30 min · **Priority:** Must-have
**Needs on main:** 00

## Goal

```
Complete tasks/A1-camera-and-skeleton.md. Done means every item under "Done when" is verified with evidence, and npm test and npm run build both pass in the final output.
```

Read `CLAUDE.md` first. Work on branch `track-a` and touch only Track A files.

## What to build

The live webcam with a pose skeleton drawn over it, inside the engine's stage. This is the riskiest integration in the project, so it comes first.

- **Local model file.** Nothing may load from a CDN at runtime. Download the lite pose model to `public/models/pose_landmarker_lite.task` and commit it. Try `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task`. If that fails, replace `latest` with `1`, or find the current link in the MediaPipe Pose Landmarker documentation. The wasm files are already copied to `public/wasm/` by the scaffold.
- **`src/lib/geometry.js`.** `toPixels(landmark, width, height)`, `distance(a, b)`, `midpoint(a, b)`, `angleAt(a, b, c)` in degrees at point b, and `angleFromVertical(a, b)` in degrees.
- **`src/pose/camera.js`.** `getUserMedia` for video only, around 1280×720. Turn a denied permission into the error code `camera-denied` and a missing camera into `no-camera`.
- **`src/pose/poseTracker.js`.** Create the `PoseLandmarker` in video mode with one pose, GPU delegate with a CPU fallback. Run detection in a `requestAnimationFrame` loop and produce frames in the shape from `CLAUDE.md`. A failure to load becomes the error code `model-failed`. Check the installed package's types for exact option names.
- **`src/ui/stage.js` and `src/ui/overlay.js`.** Inside the stage container: the video, and a canvas over it that draws the joints and bones we use: shoulders, elbows, wrists, hips. Thick lines, visible from a distance. Styles go in `src/ui/stage.css`.
- **`src/engine.js`.** When the address has no `?sim=1`, start the camera and the tracker, draw the overlay, and report `ready` and `personVisible` from real frames. Errors go to `onError`. Compression events are not produced from the camera yet; that is task A3. With `?sim=1`, the fake engine from the scaffold keeps working exactly as before.
- **`dev/stage.html`.** Show the stage full-size, a frames-per-second counter, and the raw state.

## Done when

- [ ] `npm run check` passes and includes geometry tests: a right angle gives 90°, a straight line gives 180°, and an angle on a 1280×720 frame is correct after pixel conversion.
- [ ] `public/models/pose_landmarker_lite.task` exists and is larger than 1 MB, and `public/wasm/` contains `.wasm` files after `npm install`.
- [ ] A search of `src/` and `dev/` finds no runtime URL pointing at a CDN or `googleapis.com`.
- [ ] A rejected camera permission reaches `onError` with the code `camera-denied`, shown by a test that injects a failing `getUserMedia`.
- [ ] `?sim=1` behaves as it did before this task, and the scaffold's engine tests still pass.
- [ ] The engine interface in `CLAUDE.md` is unchanged.
- [ ] `progress/track-a.md` updated.

## Human check

- Run `npm run dev`, open `/dev/stage.html`, allow the camera.
- You see yourself with a skeleton that follows your shoulders, elbows, wrists and hips.
- The counter shows 20 frames per second or more.
- Then say "ship it".

## Out of scope

Counting compressions, the simulator's skeleton, anything in Track B or C files.
