# A3: Compression detection and rate

**Track:** A · Motion engine · **Branch:** `track-a` · **Time budget:** 35 min · **Priority:** Must-have
**Needs on main:** A2

## Goal

```
Complete tasks/A3-compression-detection-and-rate.md. Done means every item under "Done when" is verified with evidence, and npm test and npm run build both pass in the final output.
```

Read `CLAUDE.md` first. Work on branch `track-a` and touch only Track A files.

## What to build

Count each chest compression as it happens, with no double counts and no counts from noise or fidgeting, and work out the rate. After this task the engine's numbers are real for both the camera and the simulator. This is the heart of the app, and the moment Track B's screen starts showing real data.

- **`src/lib/compressionDetector.js`.** `createCompressionDetector(config)` returns an object whose `push(sample)` takes one motion-signal sample and returns a compression event or `null`.
  - Fields set here: `index`, `tBottom`, `tTop`, `travel` (top-to-bottom movement in torso units), `intervalMs` (time since the previous bottom, `null` for the first).
  - Reject a cycle when `travel` is below `MIN_TRAVEL` or it comes sooner than `MIN_INTERVAL_MS` after the last one.
  - Reset when the signal has been invalid for more than one second.
  - A suggested approach: a two-state machine with hysteresis on the detrended signal. Enter "down" when it rises above half of `MIN_TRAVEL`, enter "up" when it falls below the negative of that, track the extreme value in each state, and emit the event on the down-to-up change. Use something else if it passes the tests more reliably.
- **`src/lib/rate.js`.** `createRateTracker(config)` with:
  - `onCompression(event)`.
  - `getRate(now)`: 60000 divided by the median of the last `RATE_WINDOW` intervals. Returns `null` until there are three compressions, and `null` again when no compression has arrived for `RATE_STALE_MS`.
  - `zone(rate)`: `'slow'` below `RATE_MIN`, `'good'` from `RATE_MIN` to `RATE_MAX` inclusive, `'fast'` above, `'none'` for `null`.
- **`src/engine.js`.** Remove the scaffold's stand-in. For every source, the path is now frame, signal, detector, rate. `onCompression` fires with real events, and `state.compressions`, `state.rate` and `state.rateZone` are real. Until A4, fill the form fields of each event with passing values and keep `issues` all clear. `reset()` zeroes the detector and the rate tracker.

## Done when

- [ ] `npm run check` passes, including these new tests on simulated frames with default noise:
  - 30 seconds at 80, 110 and 140 per minute give 40, 55 and 70 compressions, each within ±1.
  - Every `intervalMs` is within 8% of the true interval.
  - `travel` 0 gives zero compressions in 30 seconds, and so does a bounce of half `MIN_TRAVEL`.
  - Three times the default noise still gives a count within ±2.
  - Ten seconds of compressions, five seconds still, ten more seconds: no events during the pause and the right total.
  - No two events are closer together than `MIN_INTERVAL_MS`.
  - Steady 110 per minute gives a rate of 110 ± 2; one outlier interval among five moves it by no more than 3.
  - The rate is `null` before three compressions and after a gap longer than `RATE_STALE_MS`.
  - Zone boundaries: 99 is slow, 100 is good, 120 is good, 121 is fast.
- [ ] An engine-level test feeds simulator frames through the whole engine and gets the right count and rate from `onCompression` and `onState`.
- [ ] Every event still has every field from the contract, and the engine interface is unchanged.
- [ ] With `?sim=1&cpm=90`, `state.rateZone` is `'slow'`; with `cpm=135` it is `'fast'`.
- [ ] `progress/track-a.md` updated.

## Human check

- Open `/dev/stage.html` with the camera. Do 20 compressions on the pillow, counting aloud. The count reads 20, give or take one.
- Shift your posture, talk and reach for something: the count does not move.
- Push in time with a 110 beat: the rate settles between 100 and 120 within five pushes.
- If it miscounts, adjust `MIN_TRAVEL` in `src/config.js` and try again.
- Then say "ship it", and tell Track B that real numbers are on `main`.

## Out of scope

Form checks, the rate gauge and counter display, audio, scoring.
