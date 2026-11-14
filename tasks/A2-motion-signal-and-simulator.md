# A2: Motion signal and simulator

**Track:** A · Motion engine · **Branch:** `track-a` · **Time budget:** 30 min · **Priority:** Must-have
**Needs on main:** A1

## Goal

```
Complete tasks/A2-motion-signal-and-simulator.md. Done means every item under "Done when" is verified with evidence, and npm test and npm run build both pass in the final output.
```

Read `CLAUDE.md` first. Work on branch `track-a` and touch only Track A files.

## What to build

Turn pose frames into one clean number per frame, the shoulder height, and draw it as a live wave. Replace the scaffold's hand-made stand-in with a simulator that produces real frames, so the whole pipeline can be tested without a camera. Every later Track A task depends on this signal being clean.

- **`src/pose/simSource.js`.**
  - `simFrame(tMs, params)`: a pure function that returns 33 landmarks for a kneeling figure seen side-on. The shoulders move up and down as a sine wave. Hips stay still. Wrists rest on the pillow below the shoulders.
  - At `scale` 1 the torso is about 30% of the frame height, on a 1280×720 frame.
  - Parameters, all with defaults: `cpm` 110, `travel` 0.10 torso units, `noise` about 1 pixel, `bend` 0 degrees of elbow bend, `lean` 0 degrees of arm lean from vertical, `recoil` 1 (fraction of the way back up), `scale` 1, `seed`.
  - Noise comes from a seeded random generator so tests are repeatable.
  - `createSimSource(params)` with `start(onFrame)` and `stop()`, producing 30 frames per second.
- **`src/lib/signal.js`.** `createMotionSignal(config)` returns an object whose `push(frame)` gives `{ t, raw, smooth, detrended, torsoLen, valid }`.
  - `raw`: shoulder-midpoint y in pixels divided by torso length in pixels. Use a steady torso length, such as a rolling median over about one second.
  - `smooth`: a short moving average to remove jitter.
  - `detrended`: `smooth` minus a moving average over `BASELINE_WINDOW_MS`, so slow posture drift disappears and the wave centres on zero.
  - `valid`: false when shoulders or hips fall below `MIN_VISIBILITY`, or there is no person.
- **`src/ui/chart.js`.** A light canvas line chart of the last 6 seconds of the detrended signal, drawn inside the stage. `engine.setDebug(true)` shows it and `setDebug(false)` hides it.
- **`src/engine.js`.** With `?sim=1`, frames now come from `createSimSource` and the overlay draws the simulated skeleton on a dark background with a "SIMULATED" badge. Every frame from either source goes through the motion signal. Compression events and state for `?sim=1` still come from the scaffold's stand-in until A3, so Track B sees no change.

## Done when

- [ ] `npm run check` passes, including these new tests on simulated frames:
  - At 110 per minute over 10 seconds, the detrended signal crosses zero at a rate that gives 110 ± 2 cycles per minute.
  - With a slow drift added (the figure shifting by 10% of torso length over 10 seconds), the detrended mean stays within 10% of the wave's amplitude.
  - With `travel` 0, the detrended amplitude stays below half of `MIN_TRAVEL`.
  - With `scale` 0.5, the signal amplitude matches the full-size run within 10%.
  - With low visibility on the shoulders, `valid` is false.
- [ ] `/dev/stage.html?sim=1` shows a moving skeleton and a sine-like wave. Verify in a browser if you have one available; otherwise say so.
- [ ] The scaffold's engine tests still pass, and the engine interface is unchanged.
- [ ] `progress/track-a.md` updated.

## Human check

- Open `/dev/stage.html` with the camera. Kneel side-on and push on the pillow: a clean wave, one bump per push.
- Hold still: a flat line.
- Shift your weight slowly: the wave stays centred instead of wandering off.
- Then say "ship it".

## Out of scope

Counting, rate, form checks, anything in Track B or C files.
