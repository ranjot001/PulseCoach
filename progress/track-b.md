# Track B progress

## B1: Practice screen — done (2026-11-14)

**Built**
- `index.html`, `src/main.js`, `src/styles.css`: two-column practice screen (engine stage left, readouts right), dark, fits 1366×768 with no scrolling (`.app` is a 100vh grid, body `overflow: hidden`).
- `src/ui/hud.js`: rate (huge number, gauge with 100–120 band, "Push faster" / "Good pace" / "Slow down"), compression counter with pulse, Elbows/Position/Recoil chips, "Estimated depth" chip (hidden until depth data exists), empty cue banner for B2 (`hud.setCue(text)`), status line. Pure mappers: `rateView`, `chipViews`, `depthView`, `statusText`, `gaugePercent`.
- `src/audio/metronome.js`: Web Audio click scheduled on the audio clock (25 ms wake-up, 120 ms lookahead); beat times computed from the start (`beatTimeMs`) so they never drift. `start()`, `stop()`, `unlock()`, `setVolume()`, `onBeat` drives the visual dot. Never throws without audio or before user interaction.
- Controls: metronome toggle button (also the `M` key); audio unlocks on the first click or key press.
- `src/copy.js`: all screen labels under `PRACTICE`.
- Tests: `tests/hud.test.js`, `tests/metronome.test.js` (incl. sim cpm=90/110/135 and bend=30 driven through the engine into the HUD).

**Config added (Track B section)**
- `METRONOME_VOLUME: 0.8`
- `RATE_WARN_MARGIN: 10`: cpm outside the band that still shows amber (the task's "within 10").
- `GAUGE_MIN: 60`, `GAUGE_MAX: 160`: range drawn on the rate gauge.

**Not verified in a browser.** No Chromium was available on this machine; the sim checks were verified with jsdom tests instead.

**Human checks still to do**
- Open `?sim=1`: rate, counter and chips readable from across the room.
- Change `cpm` in the address (90, 110, 135): label and colour follow.
- Turn the metronome on: click clearly audible on laptop speakers, dot beats in time.
- Then say "ship it".

## B2: Voice coaching — done (2026-11-14)

**Built**
- `src/lib/feedback.js`: `createCoach(config, { speaker, onCue })`, `next(state, now)` → cue id or `null`. Priority: not visible, rate (slow/fast), elbows, position, recoil, depth (shallow/deep), praise. Only the highest-priority *active* problem may be spoken (one fix at a time), once it has lasted `VOICE_PERSIST_MS`. `VOICE_COOLDOWN_MS` between any cues, `VOICE_REPEAT_MS` before the same cue again. Praise after `PRAISE_AFTER_MS` clean (person visible, rate in band, no issues), at most every `PRAISE_REPEAT_MS`. `setMuted()` silences the speaker but `onCue` (the banner) still fires. `reset()` for new sessions (B3).
- `src/audio/voice.js`: `speechSynthesis` wrapper, `speak(text)`, `setMuted(bool)`. Cancels before every phrase, prefers a local English voice, silent no-op without speech support.
- `src/copy.js`: cue text in `CUES`; mute button labels.
- Banner: the cue shows in the B1 cue area for `CUE_BANNER_MS` (amber for fixes, green for praise).
- Mute button ("Voice on" / "Voice muted") in the top bar.
- Tests: `tests/feedback.test.js`, `tests/voice.test.js` (incl. sim cpm=90 and cpm=110 driven through engine → coach → banner).

**Config added (Track B section)**
- `VOICE_PERSIST_MS: 1500`, `PRAISE_AFTER_MS: 6000`, `PRAISE_REPEAT_MS: 10000` (from the task spec).
- `CUE_BANNER_MS: 3000`: how long a cue stays on screen.

**Sim timings (from tests)**: cpm=90 → "Push faster" at ~2.8 s, nothing else for the cooldown. cpm=110 → praise at ~7 s (rate appears ~1 s in, then 6 clean seconds).

**Human checks still to do**
- Cues clearly audible over the metronome on laptop speakers.
- Cues never overlap or stack up.
- 30 s of mixed mistakes in the sim (e.g. `?sim=1&cpm=90&bend=30&recoil=0.5`) feels like coaching, not nagging. If it nags, raise `VOICE_COOLDOWN_MS`.
- Then say "ship it".
