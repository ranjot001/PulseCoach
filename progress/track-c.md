# Track C progress

## C1: Quick tips and debrief card

**Built**
- `src/debrief/schema.js`: `validateStats(body)` returns a clean copy with only the Contract 2 fields, or throws. Numbers must be finite and in range, `rateTrend` must be one of its three values, `avgDepthCm` may be `null`, and unknown fields are dropped.
- `src/debrief/fallback.js`: `fallbackDebrief(stats)` builds two or three sentences from rules: the strongest component, then the one or two weakest with a physical tip, the rate trend when it is not steady, and estimated depth only when there is a number.
- `src/debrief/card.js` and `card.css`: the real `renderDebriefCard(container, stats)`. Same signature as the scaffold stand-in. Title "Coach's debrief", label "Quick tips", "Read aloud" button. Invalid stats show one neutral sentence.
- `dev/debrief.html`: three buttons, one per sample in `tests/fixtures/stats.js`. `?sample=slowStats` opens straight on a sample.
- Tests: `tests/schema.test.js`, `tests/fallback.test.js`, `tests/card.test.js` (jsdom).

**Config values added (Track C section of `src/config.js`)**
- `DEBRIEF_STRONG_PCT: 90`. When every component is at or above this, the debrief says everything was strong and suggests a longer session.
- `DEBRIEF_WEAK_PCT: 75`. The second-weakest component gets its own tip only when it is below this, so a mostly good session gets one fix, not two.
- The debrief also reads `RATE_MIN`, `RATE_MAX`, `DEPTH_MIN_CM` and `DEPTH_MAX_CM` from Track A's section. It does not change them.

**Notes for other tracks**
- Track B: `validateStats` is strict about Contract 2. Every numeric field must be a finite number (only `avgDepthCm` may be `null`), and `grade` must be a short label of letters, spaces, apostrophes, hyphens or "!", up to 40 characters. If `summarise()` ever returns `avgRate: null` (for example with zero compressions) or a grade with digits or other punctuation, the card will not throw but will show its neutral sentence. Tell Track C if the grade labels need other characters.
- The card's text element has the class `debrief-card__text` and the label `debrief-card__label`. C2 swaps the AI text into these.

**Verified**
- `npm run check` passes: 81 tests in 5 files, build clean.
- `/dev/debrief.html` loaded in headless Chrome from the Vite dev server. Each of the three buttons showed a different debrief, with no page errors.

**Human checks still to do**
- Open `/dev/debrief.html` and press each button. Each debrief should read like a patient instructor and match the numbers in that sample.
- Press "Read aloud" and listen. Headless Chrome confirmed the click raises no error, but nobody has heard it speak.
