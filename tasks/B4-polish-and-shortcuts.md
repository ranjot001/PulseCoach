# B4: Polish and shortcuts

**Track:** B · Coach and session · **Branch:** `track-b` · **Time budget:** 35 min · **Priority:** Should-have
**Needs on main:** B3

## Goal

```
Complete tasks/B4-polish-and-shortcuts.md. Done means every item under "Done when" is verified with evidence, and npm test and npm run build both pass in the final output.
```

Read `CLAUDE.md` first. Work on branch `track-b` and touch only Track B files.

## What to build

Make the app hard to get wrong in front of judges: readable from across a room, clear about how to get into position, and graceful when the camera fails. If time is short, do the error screen and the big-screen layout first.

- **Readable from 3 metres.**
  - The rate number is at least 120 pixels tall on the practice screen.
  - No scrolling at 1366×768 or 1920×1080.
  - High contrast, and the same green, amber and red meanings everywhere.
  - A fullscreen toggle on the `F` key.
- **Camera error screen.** When the engine calls `onError`, show a clear message for the error code with two buttons: "Try again", and "Run simulator", which reloads with `?sim=1`.
- **Setup checklist on the home screen.** Draw the list from `state.setup.checks`: each check with a live tick and, when it fails, its hint. Start becomes the main button once `state.setup.ok` is true. Keep a quiet "Start anyway" link. When `checks` is empty, hide the checklist and leave Start enabled.
- **Keyboard shortcuts.** Space to start or restart, `M` mute, `B` metronome, `D` debug (calls `engine.setDebug`), `F` fullscreen. Show a small legend on the home screen.
- **Debug tools hidden.** Call `engine.setDebug(false)` at start-up.
- **Finishing touches.** A page title, a simple pulse or heart icon as an inline SVG favicon, and the footer line from `src/copy.js`.

## Done when

- [ ] `npm run check` passes, including new tests:
  - The checklist view shows a hint for each failing check and none for passing ones.
  - An empty `checks` list hides the checklist and leaves Start enabled.
  - Each error code maps to its own message.
  - Each shortcut key maps to its action.
- [ ] A search of `index.html` and Track B's files finds no third-party URL loaded at runtime, and no web font.
- [ ] `?sim=1` still runs the whole loop, with the debug chart hidden until `D` is pressed.
- [ ] The camera error screen offers "Run simulator" and it works. Verify by injecting an error, or in a browser with the camera blocked. Say which.
- [ ] No file outside Track B's list was changed.
- [ ] `progress/track-b.md` updated.

## Human check

- Stand 3 metres from the screen. You can read the rate, the indicators and the cue banner.
- Block the camera in the browser and reload: the error screen appears with both buttons.
- Once Track A's setup check is on `main`, kneel in position and watch the checklist tick.
- Then say "ship it".

## Out of scope

New coaching features, anything in Track A or C files.
