# A5: Setup check and video source

**Track:** A · Motion engine · **Branch:** `track-a` · **Time budget:** 25 min · **Priority:** Should-have
**Needs on main:** A4

## Goal

```
Complete tasks/A5-setup-check-and-video-source.md. Done means every item under "Done when" is verified with evidence, and npm test and npm run build both pass in the final output.
```

Read `CLAUDE.md` first. Work on branch `track-a` and touch only Track A files.

## What to build

Two things that make the demo hard to get wrong: a check that the learner is framed correctly before they start, and a way to run the app from a recorded video if the camera fails on stage.

- **`src/lib/setupCheck.js`.** A pure function that takes recent frames and returns `{ ok, checks }`, where `checks` is a list of `{ id, pass, hint }`:
  - `person`: a person is detected. Hint: "Step into view".
  - `visible`: shoulders, elbows, wrists and hips are all at 0.6 visibility or above. Hint: "Make sure your arms and hips are in view".
  - `side-on`: the horizontal gap between the two shoulders is under 0.45 of torso length. Hint: "Turn so the camera sees your side".
  - `distance`: torso length is between 15% and 45% of frame height. Hint: "Move back a little" or "Move a little closer".
  - `in-frame`: the whole upper body is inside the frame with a small margin. Hint: "Move to the middle of the picture".
  - `ok` is true once all five have passed continuously for one second.
- **`src/engine.js`.** `state.setup` now carries the real result. Track B's screen already reads it.
- **Video file source.** `?video=<path>` plays a looping local video through the same pipeline as the camera. A video that cannot be loaded goes to `onError` with the code `no-camera`.
- **Notes.** Add a few lines to `progress/track-a.md` on recording a clip into `public/demo.mp4`.

## Done when

- [ ] `npm run check` passes, including new `setupCheck` tests on simulated frames:
  - A well-placed side-on figure passes all five.
  - A front-facing figure with wide shoulders fails only `side-on`.
  - A figure at `scale` 0.2 and one at `scale` 2 fail `distance`, each with the right hint.
  - A figure with hidden hips fails `visible`.
  - `ok` turns true only after one continuous second of passes.
- [ ] `?sim=1` reports `setup.ok` as true within two seconds.
- [ ] The video source is exercised by a test with an injected fake video element, or verified in a browser with any short clip. Say which.
- [ ] The engine interface is unchanged.
- [ ] `progress/track-a.md` updated.

## Human check

- Kneel in position and watch the checklist on the home screen tick. Turn to face the camera: the side-on check fails with its hint.
- Record a 40-second clip of good compressions, save it as `public/demo.mp4`, and open the app with `?video=/demo.mp4`. It counts and scores like the live camera.
- Then say "ship it".

## Out of scope

The checklist display, the error screen, depth.
