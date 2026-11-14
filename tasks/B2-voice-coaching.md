# B2: Voice coaching

**Track:** B · Coach and session · **Branch:** `track-b` · **Time budget:** 25 min · **Priority:** Must-have
**Needs on main:** B1

## Goal

```
Complete tasks/B2-voice-coaching.md. Done means every item under "Done when" is verified with evidence, and npm test and npm run build both pass in the final output.
```

Read `CLAUDE.md` first. Work on branch `track-b` and touch only Track B files.

## What to build

Short spoken corrections during practice, one at a time, that help without nagging. The learner is looking down at the pillow, so sound is how the app reaches them.

- **`src/copy.js`.** All cue text in one place:
  - Not visible: "Move back into view"
  - Too slow: "Push faster"
  - Too fast: "Slow down a little"
  - Elbows: "Lock your elbows"
  - Position: "Shoulders over your hands"
  - Recoil: "Let the chest come all the way up"
  - Shallow: "Push a little harder"
  - Deep: "Ease off slightly"
  - Praise: "Good pace, keep going"
- **`src/lib/feedback.js`.** `createCoach(config)` returns an object whose `next(state, now)` takes the engine's state and gives a cue id or `null`.
  - Priority, highest first: not visible, rate, elbows, position, recoil, depth, praise.
  - A problem must last at least 1.5 seconds before it is spoken.
  - At least `VOICE_COOLDOWN_MS` between any two cues.
  - The same cue is not repeated within `VOICE_REPEAT_MS`.
  - Praise only after 6 seconds with nothing wrong, and at most once every 10 seconds.
  - Depth cues are given only when `state.issues.depth` is `'shallow'` or `'deep'`.
- **`src/audio/voice.js`.** A wrapper around `speechSynthesis`: `speak(text)`, `setMuted(bool)`. Never queue more than one phrase: cancel anything pending before speaking. Prefer an English voice. If speech is unavailable, do nothing and let the banner carry the message.
- **Banner.** The current cue appears as large text in the cue area from B1 for a few seconds, for noisy rooms and for people watching.
- **Controls.** A mute button.

## Done when

- [ ] `npm run check` passes, including new coach tests with an injected fake speaker:
  - With several problems at once, the highest-priority cue is chosen.
  - No two cues are closer together than `VOICE_COOLDOWN_MS`.
  - The same cue does not repeat within `VOICE_REPEAT_MS`.
  - A problem lasting under 1.5 seconds is never spoken.
  - Praise needs 6 clean seconds and respects its 10-second limit.
  - A depth cue is given only when no higher-priority problem is active.
  - When muted, the speaker is never called but the banner still updates.
- [ ] With `?sim=1&cpm=90`, the banner shows "Push faster", then stays quiet for the cooldown.
- [ ] With `?sim=1&cpm=110`, the banner shows the praise line after about 6 seconds.
- [ ] No file outside Track B's list was changed.
- [ ] `progress/track-b.md` updated.

## Human check

- Cues are clearly audible over the metronome on the laptop speakers.
- Cues never overlap or stack up.
- Thirty seconds of mixed mistakes in the simulator feels like coaching, not nagging. If it nags, raise `VOICE_COOLDOWN_MS`.
- Then say "ship it".

## Out of scope

The session timer, scoring, the results screen.
