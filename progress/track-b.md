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
- **Setup checklist** on home from `state.setup.checks`: live ✓/✗ per check, hint under failing ones. While not ok, Start is disabled and a quiet "Start anyway" link shows; once ok, Start is the main button. Empty `checks` → checklist hidden, Start enabled. Check ids get friendly labels in `SETUP.labels` (`person`, `visible`, `side-on`, `distance`, `in-frame` from task A6, renumbered from A5 in the relay plan).
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

## B5: Relay drill — done (2026-11-14)

**Built**
- `src/lib/relay.js`: `createRelay(config, { turns, turnSeconds })`, pure, page-clock `now` only (event `tBottom`/`tTop` are never stored as times; each event gets `at`). `start`, `onCompression`, `tick(state, now)` → prompts (`rhythmCheck`, `resume`, `switchEarly`, `backOn`, `finished`), `getView`, `getDrill` in the B6 shape. A turn's clock starts at its first compression. Early switch needs `EARLY_SWITCH_MS` of continuous slipping and `MIN_TURN_SECONDS`; never on the last turn (the slip is still recorded). `slippedAt` and `signs` record the first slip that lasted `EARLY_SWITCH_MS`. Missing `fatigue` = not slipping. At a switch the next turn is created at once (startAt `null` until its first compression), so the view shows the incoming compressor during the switch. Compressions during the rhythm check belong to no turn. Also `drillOptions(search)` for `?turns=` / `?turnSeconds=`.
- `src/main.js`: modes `relay` and `solo`. Home: **Start relay drill** (main button, Space) and **Solo practice · 30 s**. A 100 ms timer drives `relay.tick` with the latest engine state. `engine.markTurn?.()` once at every rhythm check (normal or early). Coach reset at each new turn, and coach cues only while compressing. Prompts spoken at once (voice cancels), shown in the cue banner, respect mute. Try again / Space on results repeats the same mode. Until B6 the drill ends on the solo results screen with `summarise` over every turn's events and the whole drill's duration.
- `src/ui/hud.js`: "Slipping" chip (amber, signs in plain words: smaller pushes, slower, elbows bending), `createSwitchOverlay` (pause timer with one decimal, green → amber at `PAUSE_WARN_SEC` → red at `PAUSE_MAX_SEC`, "Rhythm check: hands off" then "Switch! Compressor N, start now"). Pure: `slipView`, `pauseStatus`, `switchMessage`.
- `index.html`: "Compressor 1 · Turn 1 of 2" label next to the turn countdown in the top bar; `#switch` overlay over the practice screen.
- `src/copy.js`: `RELAY` prompts and labels.
- Tests: `tests/relay.test.js`, `tests/main-relay.test.js` (whole drill on `?sim=1&turnSeconds=20`, fake engine without `markTurn`, no console errors), `tests/main-relay-engine.test.js` (real simulator wrapped with `markTurn` and fatigue: `markTurn` once, and slipping 20 s into turn 1 → "switchEarly" spoken, the switch overlay and turn 2), relay HUD and a 160 px pause-timer stylesheet test in `tests/hud.test.js`. `tests/main.test.js` now starts solo with the solo button (the main button is the relay now).

**Config added (Track B section)**: the relay keys from CLAUDE.md, unchanged values: `DRILL_TURNS`, `DRILL_TURN_SECONDS`, `MIN_TURN_SECONDS`, `EARLY_SWITCH_MS`, `RHYTHM_CHECK_MS`, `PAUSE_MIN_MS`, `PAUSE_WARN_SEC`, `PAUSE_MAX_SEC`, `CCF_MIN`, `CCF_TARGET`, `RELAY_WEIGHTS`.

**Known limits**
- If nobody compresses after "Resume now", the drill waits (the pause timer keeps counting, red after 10 s). There is no way back to home from results apart from reloading (unchanged from B3).
- The fake engine never stops pushing, so in `?sim=1` the switch pause is always ~3.5 s until Track A's A5 simulator (with `swap`) lands.

**Human checks still to do**
- Two people, `?sim=1&turnSeconds=20`: the drill runs end to end; prompts clear over the metronome; switch screen readable from across the room.
- Once A5 is on `main`: `?sim=1&fatigue=1` calls "Your compressions are dropping off. Switch now." partway through turn 1.
- With the camera: two people swap on the pillow; the pause timer stops the moment the second person starts.
- Then say "ship it".

## B6: Relay results and team score — done (2026-11-14)

**Built**
- `src/lib/score.js`: `summariseRelay(drill, config)` returns exactly the Contract 2 relay shape (keys checked against `goodRelay` and `goodRelay.turns[0]`). Per turn: `summarise(turn.events, turn seconds)` (actual seconds from first compression to turn end, so an early turn is shorter) plus `compressor`, `slippedAtSec` (rounded) and `signs`. Hands-off pieces from page-clock `at` times: before the first compression, every gap over `PAUSE_MIN_MS`, after the last compression until the drill ends; compressions during a rhythm check are not in any turn, so they do not shorten a switch pause. `switches` = turns − 1, `earlySwitches` = turns ended early, `avgSwitchSec` = mean last-to-first gap across each switch (null with no switch), `longestPauseSec` = longest hands-off piece. Team score = (compression-weighted turn scores × `RELAY_WEIGHTS.technique` + hands-off score × `RELAY_WEIGHTS.handsOff`) / total weight, where hands-off score = linear 0 at `CCF_MIN` → 100 at `CCF_TARGET`, minus 20 per hands-off piece over `PAUSE_MAX_SEC`, floored at 0. Zero compressions → all numbers finite, score 0. Helpers exported: `handsOffPieces`, `switchPauses`, `handsOffScore`.
- `src/ui/relayResults.js`: `renderRelayResults(container, stats, { onSave, onRetry, pauses })`. Three columns: team score + grade, compression fraction (big %, bar with the 80% target marked, green/amber/red), switch pauses (green ≤ `PAUSE_WARN_SEC`, amber ≤ `PAUSE_MAX_SEC`, red above, "early switch" tag) and longest pause; one card per turn (compressions, avg rate, score, then "Started slipping at 0:24: smaller pushes, slower" in amber or "Held form for the whole turn" in green) and the debrief card; team name + Save, leaderboard, Try again (Space too).
  - Contract 2 has only `avgSwitchSec`, not each pause, so `main.js` passes the exact list from `switchPauses(drill)`. Without that list (e.g. rendering a fixture) one switch shows exactly and several show the average.
- Leaderboard: entries now store `mode` (`'solo'` default; old entries without one count as solo). Relay entries also store `compressionFraction` and show a "Relay" tag and "CCF 92%" in place of the rate. Same key `pulsecoach.leaderboard.v1`, names still `textContent`.
- `src/main.js`: the drill ends with `summariseRelay` → `renderRelayResults`; relay leaderboard entries use the compression-weighted average rate.
- Tests: relay part of `tests/score.test.js`, `tests/relayResults.test.js`, leaderboard modes in `tests/leaderboard.test.js`, and `tests/main-relay.test.js` now ends on the relay results screen and saves a `<b>x</b>` team name as literal text with a Relay tag.

**Fit at 1366×768**: not measured in a browser (none available). Built to fit: a fixed-height three-column grid with `overflow: hidden`; the tallest column is estimated at ~460 px of the ~640 px available. A very long debrief card is clipped rather than scrolling the page.

**Config**: none changed.

**Human checks still to do**
- A drill in the simulator: the numbers on the results screen match what happened. Once A5 is on `main`, `?sim=1&fatigue=1`: compressor 1 shows a slipping time and an early switch.
- Two people at the camera with one deliberately slow switch: the pause shows red and the compression fraction drops.
- Save a team name and reload: still on the leaderboard with a Relay tag.
- Check at 1366×768 that the relay results do not scroll.
- Then say "ship it".
