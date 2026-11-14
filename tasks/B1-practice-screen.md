# B1: Practice screen

**Track:** B · Coach and session · **Branch:** `track-b` · **Time budget:** 45 min · **Priority:** Must-have
**Needs on main:** 00

## Goal

```
Complete tasks/B1-practice-screen.md. Done means every item under "Done when" is verified with evidence, and npm test and npm run build both pass in the final output.
```

Read `CLAUDE.md` first. Work on branch `track-b` and touch only Track B files.

## What to build

The screen the learner and the judges watch during practice: a live rate, a compression counter, three form indicators and a metronome. Build it against the engine with `?sim=1`. The engine's numbers start as stand-ins and become real as Track A ships, with no change needed here.

- **Layout in `index.html`, `src/main.js` and `src/styles.css`.** Replace the scaffold's plain page. The engine's stage (video and skeleton) takes about half the screen; the readouts take the rest. Dark background, the colour variables from `src/styles.css`, no scrolling at 1366×768.
- **`src/ui/hud.js`.** Everything is drawn from the engine's `onState` and `onCompression`:
  - **Rate.** The largest element on the screen: a very large number, a gauge or bar with the 100 to 120 band marked, and a short label: "Push faster", "Good pace" or "Slow down". Green in the band, amber within 10 of it, red beyond. Show a dash when the rate is `null`.
  - **Counter.** A large compression count, with a brief pulse on each compression so a watcher can see every push register.
  - **Form indicators.** Three chips labelled Elbows, Position and Recoil. Green when the issue is clear, red while it is failing.
  - **Depth indicator.** A fourth chip that appears only when `state.issues.depth` is not `null` or events carry a `depthCm`: "Estimated depth", with shallow, good or deep. Hidden otherwise.
  - **Cue banner.** An empty area reserved for the coaching text that task B2 adds.
  - **Status line.** "Loading", "No person in view", or nothing, from `state.ready` and `state.personVisible`.
  - Keep the mapping from state to labels and colours in small pure functions so they can be tested.
- **`src/audio/metronome.js`.** A click at `METRONOME_BPM` using the Web Audio API. Schedule clicks against the audio clock with a short lookahead so the beat does not drift; do not rely on `setInterval` alone for timing. `start()`, `stop()`, a volume setting, and a visual beat dot in step with the sound. Keep the "when is the next beat" arithmetic in a pure function.
- **Controls.** A metronome toggle button. Browsers block audio until the user interacts, so start the audio context on the first click or key press.
- **`src/copy.js`.** Every label on this screen lives here.

## Done when

- [ ] `npm run check` passes, including new tests:
  - Rate label and colour: 90 gives "Push faster", 110 gives "Good pace" in green, 135 gives "Slow down"; 95 is amber and 85 is red; `null` gives a dash.
  - Chip state follows `state.issues` for each of the three checks.
  - The depth chip is hidden when depth is `null` and shown when it is `'shallow'`.
  - The next-beat function gives beats 545 ms apart at 110 per minute and does not drift over 60 seconds.
- [ ] With `?sim=1&cpm=90` the screen shows "Push faster" in a warning colour, with `cpm=110` "Good pace" in green, and with `cpm=135` "Slow down". Verify in a browser if you have one available; otherwise say so.
- [ ] With `?sim=1&bend=30` only the Elbows chip is red.
- [ ] Starting the metronome before any user interaction does not throw.
- [ ] No file outside Track B's list was changed.
- [ ] `progress/track-b.md` updated.

## Human check

- Open the page with `?sim=1`. The rate, counter and chips are readable from across the room.
- Change `cpm` in the address: the label and colour follow.
- Turn the metronome on: the click is clearly audible on the laptop speakers and the dot beats in time.
- Then say "ship it".

## Out of scope

Spoken cues, the session timer, scoring, anything in Track A or C files.
