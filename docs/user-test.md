# PulseCoach user test

**The claim being tested:** the app notices slipping before people do.

Five people each take about three minutes. Run it once the relay drill (Track B, task B5) and slipping detection (Track A, task A5) are on `main`.

## Who to ask

Nursing or health sciences students if possible. Otherwise any adults who are comfortable kneeling and doing 90 seconds of chest compressions on a pillow. Note who they were (for example "nursing student, year 2") but **not their names**.

## Consent

Say this to each person before they start:

> "Nothing is recorded: the video stays on this laptop and is never saved or sent anywhere, and you can stop at any time."

## Setup

- One laptop running the app at `/?turns=1&turnSeconds=90`: one 90-second turn with full coaching (metronome, voice, rate and form).
- A firm pillow on the floor, side-on to the camera.
- A teammate with a stopwatch, and this page to fill in.

## For each person

1. Read the consent line.
2. Tell them: "Do compressions in time with the beat. The moment you feel your compressions getting worse, say 'tired' out loud, and keep going."
3. Start the stopwatch when the countdown ends and the first compression begins.
4. When they say "tired", note the stopwatch time.
5. When the turn ends, copy from the results screen when the app flagged slipping (or "never"), the average rate and the percentage in range.
6. Ask: "What was that like?" Write down one short quote.

## Results

| # | Who | App flagged slipping (s into turn, or never) | Said "tired" (s, or never) | Difference (s, app minus person) | Average rate (/min) | In range (%) | Quote |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |
| 4 | | | | | | | |
| 5 | | | | | | | |

A negative difference means the app flagged slipping before the person said "tired".

## Optional second part: pairs

If there's time, run pairs of volunteers through one relay drill each at `/?turnSeconds=30`, with the default two turns.

| Pair | Switch pause (s) | Compression fraction (%) | Switch called early? | Note |
|---|---|---|---|---|
| A | | | | |
| B | | | | |

## Summary, filled in afterwards

The app flagged slipping in ___ of 5 people, on average ___ seconds ___ (before / after) they said "tired".

This sentence goes into part 3 of `docs/pitch.md`.

## If the results don't support the claim

If the app rarely flagged slipping, flagged it after people said "tired", or the numbers are mixed, **report that honestly** in the pitch. Say what we would change, for example tuning the `FATIGUE_*` values in `src/config.js` or testing longer turns. A clear, honest result is better than a claim we can't back up.
