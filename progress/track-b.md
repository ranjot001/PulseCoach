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

## B3: Session, score and leaderboard — done (2026-11-14)

**Built**
- Screen state machine in `src/main.js`: `home` → `countdown` → `practice` → `results` → (Try again / Space) `countdown`, no reloads. The engine starts on the first Start (so the camera prompt follows a click) and keeps running between sessions.
- Countdown: 3, 2, 1 large over the practice screen and spoken (respects mute), then `engine.reset()`, `engine.markRest()`, coach reset, "Go".
- Practice: B1 screen plus a big countdown timer in the top bar; metronome starts by itself, voice coaching on; every `onCompression` event collected. At `SESSION_SECONDS` the metronome and voice stop and results show.
- `src/lib/score.js`: `summarise(events, durationSec, config)` returns exactly the Contract 2 fields. Rate in range is judged per compression on a rolling `RATE_WINDOW` rate (the engine's smoothing); intervals over `RATE_STALE_MS` (pauses) count as out of range and are left out of `avgRate`. Weighted score over components with data, depth band `DEPTH_MIN_CM − TOL` to `DEPTH_MAX_CM + TOL`, activity factor `min(1, n / (RATE_MIN·duration/60 / 2))`.
- `src/ui/home.js`: name, tagline, instruction, side-on SVG diagram, leaderboard, Start (Space too).
- `src/ui/results.js`: big score + grade, compressions and rate trend, a bar per component with its number, "Estimated depth" row only when measured, Track C's `renderDebriefCard`, name field + Save, leaderboard, Try again (Space too; Space is ignored while typing a name).
- `src/ui/leaderboard.js`: top 10 by score in `localStorage` `pulsecoach.leaderboard.v1` as `{ name, score, avgRate, date }`; names trimmed to 12 chars, rendered with `textContent`; Reset asks for confirmation.
- `src/audio/voice.js`: added `cancel()`.
- Tests: `tests/score.test.js`, `tests/leaderboard.test.js`, `tests/results.test.js`, `tests/main.test.js` (whole loop on the real page with `?sim=1` and fake timers, including a `<b>` name shown as literal text and the debrief card present).

**Config added (Track B section)**
- `RATE_TREND_CPM: 6`: first vs last third must differ by this to be slowing/speeding (a 15/min slowdown gives ~10).
- `GRADE_BANDS: { lifesaver: 90, strong: 75, gettingThere: 50 }`, from the task.
- `RESULT_GOOD_PCT: 80`, `RESULT_WARN_PCT: 50`: colour of breakdown bars.
- `COUNTDOWN_SECONDS: 3`, `LEADERBOARD_SIZE: 10`, `NAME_MAX_CHARS: 12`.

**Note for tests**: Node 25's experimental global `localStorage` shadows jsdom's (it is `undefined` without a flag), so `tests/main.test.js` installs an in-memory one. The app itself falls back to no persistence if storage is missing.

**Not verified in a real browser** by me (only Safari, no automation). The loop was verified in jsdom.

**Human checks still to do**
- One full session in the simulator, then one at the camera once Track A's detection is on `main`: score and breakdown match what happened.
- `?sim=1&cpm=85&bend=30`: score drops, breakdown shows rate and elbows red.
- Enter a name, reload: the entry is still on the leaderboard.
- Then say "ship it".

## B4: Polish and shortcuts — done (2026-11-14)

**Built**
- **Readable from 3 m**: rate number `clamp(130px, 20vh, 240px)` with `line-height: 1` (≥120 px tall, checked by a stylesheet test); bigger rate label; screens are 100vh grids with `overflow: hidden`, so no scrolling at 1366×768 or 1920×1080; status colours only from `--good/--warn/--bad`.
- **Camera error screen** (`renderError` in `src/ui/home.js`, `#screen-error`): a title and message per code (`camera-denied`, `no-camera`, `model-failed`, plus a fallback), "Try again" (stop + start the engine, back home) and "Run simulator" (same address with `sim=1`, `video` removed). A rejected `engine.start()` also lands here as `model-failed`.
- **Setup checklist** on home from `state.setup.checks`: live ✓/✗ per check, hint under failing ones. While not ok, Start is disabled and a quiet "Start anyway" link shows; once ok, Start is the main button. Empty `checks` → checklist hidden, Start enabled. Check ids get friendly labels in `SETUP.labels` (`person`, `visible`, `side-on`, `distance`, `in-frame` from task A5).
- **The engine now starts at page load** (not on first Start) so the checklist is live on home; the camera prompt and any camera error appear on load.
- **Shortcuts** (`shortcutAction` in `src/ui/home.js`): Space start/restart, `M` voice mute (was metronome in B1), `B` metronome, `D` debug (`engine.setDebug`), `F` fullscreen. Ignored while typing, with modifiers or on key repeat. Legend on the home screen.
- **Debug hidden**: `engine.setDebug(false)` at start-up.
- **Finishing**: page title "PulseCoach · CPR compression practice", inline SVG pulse-line favicon (data URI), footer line from `src/copy.js`.
- Tests: `tests/home.test.js`, `tests/main-errors.test.js` (injected engine: start-up debug off, D/M/B keys, live checklist, injected `camera-denied` error → error screen → Run simulator navigates to `?sim=1`, Try again restarts the engine), stylesheet size test in `tests/hud.test.js`; `tests/main.test.js` also checks the debug line stays hidden until `D` on the sim loop.

**Third-party URL search**: the only `http` strings in `index.html` and Track B files are the SVG XML namespace `http://www.w3.org/2000/svg` (an identifier, never fetched). No fonts, CDNs or `@import`.

**Error screen verified by injecting an error** (mocked engine in `tests/main-errors.test.js`), not in a browser with the camera blocked.

**Human checks still to do**
- Stand 3 m away: rate, indicators and cue banner readable.
- Block the camera in the browser and reload (without `?sim=1`): the error screen appears with both buttons. Note: until Track A's camera task lands on `main`, the fake engine never errors, so this needs Track A's engine.
- Once Track A's setup check is on `main`, kneel in position and watch the checklist tick.
- Then say "ship it".
