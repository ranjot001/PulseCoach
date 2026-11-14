# A6: Estimated depth

**Track:** A · Motion engine · **Branch:** `track-a` · **Time budget:** 20 min · **Priority:** Stretch
**Needs on main:** A4

Skip this task if the team is behind at 3:00. A missing feature is better than a wrong number in front of judges.

## Goal

```
Complete tasks/A6-depth-estimate.md. Done means every item under "Done when" is verified with evidence, and npm test and npm run build both pass in the final output.
```

Read `CLAUDE.md` first. Work on branch `track-a` and touch only Track A files.

## What to build

An estimated depth in centimetres for each compression. A webcam cannot measure depth exactly, so the feature sits behind a switch and is always described as an estimate. Track B's screens, coach and score already handle depth whenever the engine supplies it, so this task needs no changes outside Track A.

- **`src/lib/depth.js`.**
  - `depthCm = travel × torsoCm`, where `travel` is the compression's movement in torso units and `torsoCm` is `TORSO_CM`.
  - `depthZone(depthCm)`: `'shallow'` below `DEPTH_MIN_CM − DEPTH_TOLERANCE_CM`, `'deep'` above `DEPTH_MAX_CM + DEPTH_TOLERANCE_CM`, otherwise `'good'`.
- **Switch.** `FEATURES.depth` in `src/config.js`. Set it to `true` in this task.
- **`src/engine.js`.** When the switch is on, each event carries `depthCm`, and `state.issues.depth` is `'shallow'` or `'deep'` when two of the last three compressions were outside the good zone, otherwise `null`. When the switch is off, `depthCm` and `issues.depth` are both `null`, exactly as before this task.

## Done when

- [ ] `npm run check` passes, including new tests:
  - Travel 0.10 with a 50 cm torso gives 5.0 cm.
  - Zone boundaries behave as defined, including the tolerance.
  - With the switch off, every event has `depthCm` as `null` and `issues.depth` is `null`.
  - With the switch on, `travel=0.06` raises `'shallow'` and `travel=0.11` raises nothing.
- [ ] The engine interface is unchanged.
- [ ] `progress/track-a.md` updated.

## Human check

- Push shallow, then deep, on your pillow. The depth indicator on the practice screen follows.
- Good compressions land in or near the target. If the numbers are clearly off, adjust `TORSO_CM`.
- If it is still unreliable, set `FEATURES.depth` back to `false`, ship that, and leave depth out of the pitch.
- Then say "ship it", and tell the team whether depth is on or off.

## Out of scope

Anything outside Track A files.
