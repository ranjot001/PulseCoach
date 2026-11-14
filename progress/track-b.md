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
