# C1: Quick tips and debrief card

**Track:** C · Debrief and launch · **Branch:** `track-c` · **Time budget:** 30 min · **Priority:** Must-have
**Needs on main:** 00

## Goal

```
Complete tasks/C1-quick-tips-and-debrief-card.md. Done means every item under "Done when" is verified with evidence, and npm test and npm run build both pass in the final output.
```

Read `CLAUDE.md` first. Work on branch `track-c` and touch only Track C files.

## What to build

The debrief card: the part of the results screen that tells the learner, in plain sentences, what they did well and what to fix. This task builds the card with rule-based tips that work with no internet. Task C2 then adds text written by Claude on top.

- **`src/debrief/schema.js`.** `validateStats(body)`: returns a clean object with only the fields of Contract 2 in `CLAUDE.md`, or throws. Numbers must be finite and inside sensible ranges, `rateTrend` must be one of its three values, and `avgDepthCm` may be `null`. Unknown fields are dropped. No free text is accepted.
- **`src/debrief/fallback.js`.** `fallbackDebrief(stats)`: two or three plain sentences built from rules.
  - Name one thing done well: the strongest component.
  - Then the one or two weakest areas, each with a concrete physical tip. For example, for elbows: "Your elbows bent as you tired, so lean your shoulders further over your hands and let your body weight do the work."
  - Mention the rate trend when it is `'slowing'` or `'speeding'`.
  - Mention depth only when `avgDepthCm` is not `null`, and call it estimated.
  - When everything is strong, say so and suggest a longer session.
  - Address the learner as "you". No medical advice beyond compression technique.
- **`src/debrief/card.js`.** Replace the scaffold's stand-in. `renderDebriefCard(container, stats)`:
  - Shows a card titled "Coach's debrief" with the fallback text, straight away.
  - A small label reads "Quick tips".
  - A "Read aloud" button speaks the text with `speechSynthesis`, and does nothing if speech is unavailable.
  - If the stats fail validation, the card shows one neutral sentence instead of throwing.
  - Text is set with `textContent`. Styles go in `src/debrief/card.css` and use the shared colour variables.
- **`dev/debrief.html`.** Three buttons, one for each sample in `tests/fixtures/stats.js`, each rendering the card for that sample.

## Done when

- [ ] `npm run check` passes, including new tests:
  - `validateStats` accepts all three fixtures, rejects strings, `NaN`, out-of-range values and a bad `rateTrend`, and drops extra fields.
  - `fallbackDebrief` for `slowStats` mentions pace, and for `sloppyStats` mentions the two weakest components.
  - Depth is mentioned only when `avgDepthCm` is a number, and then with the word "estimated".
  - The text is two or three sentences for every fixture.
  - `renderDebriefCard` with invalid stats does not throw and leaves the container non-empty, tested in Vitest's jsdom environment.
- [ ] `/dev/debrief.html` loads and each button shows a different debrief. Verify in a browser if you have one available; otherwise say so.
- [ ] The signature `renderDebriefCard(container, stats)` is unchanged.
- [ ] No file outside Track C's list was changed.
- [ ] `progress/track-c.md` updated.

## Human check

- Open `/dev/debrief.html` and press each button. Each debrief reads like something a patient instructor would say, and matches the numbers in that sample.
- Press "Read aloud".
- Then say "ship it".

## Out of scope

The AI call, the server function, deployment.
