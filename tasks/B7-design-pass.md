# B7: Design pass

**Track:** B · Coach and drill · **Branch:** `track-b` · **Time budget:** 45 min · **Priority:** Must-have
**Needs on main:** B6

## Goal

```
Complete tasks/B7-design-pass.md. Done means every item under "Done when" is verified with evidence, and npm test and npm run build both pass in the final output.
```

Read `CLAUDE.md` first, especially "Colours and design tokens". Then open `tasks/design/relay-mock.png` and `tasks/design/relay-mock.html`: these are the target. Work on branch `track-b` and touch only Track B files.

## What to build

One look across every screen, matching the design reference. Judges decide in the first ten seconds whether this is a product or a class project, and they watch from across a room. This task changes how things look and are arranged. It does not change what the app does.

- **Tokens (`src/styles.css`).** Define every token from "Colours and design tokens" in `CLAUDE.md` on `:root`, with the values given there. Replace hard-coded colours, radii and font stacks in Track B's styles with the tokens.
- **Shared pieces.** Build these once and reuse them, as in the mock:
  - Cards: `--surface`, a `--line` border, `--radius` corners.
  - Small uppercase labels in `--muted`.
  - Big numbers in `--font-num` with tabular figures.
  - Pill chips tinted by status.
  - Meter tracks with a filled bar and tick marks.
  - Quiet pill buttons, and one green primary button.
- **Home (mock screen 1).**
  - Left: the eyebrow line, the headline "CPR is a relay, not a sprint.", one sentence on what the app does, **Start relay drill** as the primary button and **Solo practice · 30 s** as the secondary.
  - Three fact tiles with a source line under them:
    - "7 min": median wait for help after a 911 call (Mell et al. 2017).
    - "~1 min": until compression quality starts to drop, in manikin studies (Hightower et al. 1995).
    - "80%": of the time, compressions should be happening (AHA).
  - The three-step strip: Compress, Switch, Debrief.
  - Right: the setup checklist and the team board.
  - Put every string in `src/copy.js`.
- **Drill (mock screen 2).**
  - Top bar: compressor and turn in the centre, the turn clock on the right.
  - Right column, in this order: the rate card (number, verdict, gauge with the target band), the compression count, the status chips, and the cue banner pinned to the bottom.
  - Leave room for the "On the chest" card and the flow meter, which arrive in B9. Do not build them here.
- **Switch (mock screen 3).** The drill dims behind an overlay. The pause timer is the largest thing on screen, with the bar and its 5 s and 10 s ticks under it, then "Switch! Compressor 2, start now".
- **Relay results (mock screen 4).** Three columns:
  - Left: score ring, grade, the save field, run again.
  - Middle: "On the chest" with its 80% tick, and a card for each switch. Leave room under them for the timeline, which arrives in B8.
  - Right: one card per compressor, then the debrief card.
- **Solo results and the error screen.** Restyle with the same pieces.
- **Motion.** Keep it small.
  - Status colours change over 150 ms.
  - The score ring fills over 600 ms when results appear.
  - The pause timer pulses once when it turns red.
  - Turn all of it off under `prefers-reduced-motion`.
- **Words.** Use "On the chest" for compression fraction on every screen.

## Rules for this task

- Do not rename or remove any element id, class or function that a test or `src/main.js` uses, unless you update both in this task. Every existing test must still pass.
- Status colours are only `--good`, `--warn` and `--bad`. `--accent` is for neutral data and links, never a status.
- No web fonts, no images from the network, no CSS framework.
- Everything fits 1366×768 and 1920×1080 with no scrolling.
- Track A styles the inside of the stage and Track C styles the debrief card. Leave both alone; they use the same tokens.

## Done when

- [ ] `npm run check` passes, including new or updated stylesheet tests:
  - Every token in `CLAUDE.md` is defined on `:root`.
  - Outside `:root`, Track B's CSS has no hex colour.
  - The rate number is at least 120 px tall and the pause timer at least 160 px at 1366×768.
  - A `prefers-reduced-motion` block exists.
- [ ] Each of the four screens matches the mock in layout and hierarchy. If a browser is available, take a screenshot of each at 1366×768 and compare it with `tasks/design/relay-mock.png`. Otherwise say so.
- [ ] The fact tiles show their sources, and the footer line is unchanged.
- [ ] Solo practice, the relay drill and the error screen all still work, verified by the existing tests.
- [ ] No file outside Track B's list was changed.
- [ ] `progress/track-b.md` updated.

## Human check

- Open each screen next to `tasks/design/relay-mock.png`. They look like the same product.
- Stand 3 metres away during a drill and during a switch. You can read the rate, the compressor, the turn clock and the pause timer.
- Put the laptop on the projector or a big screen once. Nothing is cut off.
- Then say "ship it".

## Out of scope

New features. The timeline is B8, and the flow meter and live "On the chest" card are B9.
