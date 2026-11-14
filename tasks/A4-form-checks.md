# A4: Form checks

**Track:** A · Motion engine · **Branch:** `track-a` · **Time budget:** 30 min · **Priority:** Must-have
**Needs on main:** A3

## Goal

```
Complete tasks/A4-form-checks.md. Done means every item under "Done when" is verified with evidence, and npm test and npm run build both pass in the final output.
```

Read `CLAUDE.md` first. Work on branch `track-a` and touch only Track A files.

## What to build

Check every compression for three things an instructor watches: locked elbows, shoulders directly over the hands, and a full release between pushes. Track B already shows the three indicators; this task makes them real.

- **`src/lib/form.js`.**
  - **Which arm.** Use the arm nearer the camera: the side whose shoulder, elbow and wrist have the higher average visibility.
  - **Elbows.** `elbowAngleDeg(frame)`: the angle at the elbow between shoulder and wrist, in pixel space. Locked means at or above `ELBOW_LOCKED_DEG`.
  - **Position.** `armLeanDeg(frame)`: the angle between the shoulder-to-wrist line and vertical. Aligned means at or below `ARM_LEAN_MAX_DEG`.
  - **Recoil.** `recoilRatio`: how far the shoulders came back up after the push, as a fraction of the way to a reference top position. Use the resting height recorded by `markRest()` when there is one, and otherwise the highest top reached in roughly the last six seconds. Full recoil means at or above `RECOIL_MIN_RATIO`.
  - `createFormTracker(config)`: takes every frame and signal sample, and when a compression event arrives, fills in `elbowAngleDeg`, `armLeanDeg`, `recoilRatio`, `elbowsLocked`, `aligned` and `fullRecoil`. Use the median over the cycle for the two angles so a single noisy frame does not decide the result.
  - `getLiveIssues()`: a check counts as failing when two of the last three compressions failed it, and as passing again when two of the last three pass.
- **`src/engine.js`.** Events now carry real form fields. `state.issues.elbows`, `position` and `recoil` come from `getLiveIssues()`. `markRest()` records the current shoulder height as the recoil reference. `reset()` clears the form tracker.
- **`src/ui/overlay.js`.** Draw the arm in the `--bad` colour while the elbows check is failing.

## Done when

- [ ] `npm run check` passes, including these new tests on simulated frames:
  - `bend=0`: at least 95% of compressions have `elbowsLocked` true. `bend=30`: at least 90% have it false.
  - `lean=0`: aligned. `lean=25`: at least 90% flagged as not aligned.
  - `recoil=1`: full recoil. `recoil=0.6`: at least 90% flagged.
  - The arm with higher visibility is the one chosen.
  - Angles are correct on a 1280×720 frame, which fails if pixel conversion is skipped.
  - The two-of-three rule: a single bad compression does not raise an issue.
- [ ] An engine-level test confirms `bend=30` raises only `issues.elbows`, `lean=25` only `issues.position`, and `recoil=0.6` only `issues.recoil`.
- [ ] The engine interface is unchanged.
- [ ] `progress/track-a.md` updated.

## Human check

- Open the main page with the camera. Bend your elbows on purpose: the Elbows indicator turns red within three pushes, then green again when you straighten.
- Sit back so your arms are angled: Position turns red.
- Push without coming fully up: Recoil turns red.
- Do your best technique for 15 seconds: all three stay green. If good technique triggers a warning, loosen that threshold in `src/config.js`.
- Then say "ship it".

## Out of scope

The indicator display, spoken cues, scoring, depth.
