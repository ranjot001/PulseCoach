# C4: Pitch kit and user test

**Track:** C · Debrief and launch · **Branch:** `track-c` · **Time budget:** 40 min · **Priority:** Must-have
**Needs on main:** C1

## Goal

```
Complete tasks/C4-pitch-kit-and-user-test.md. Done means every item under "Done when" is verified, and npm test and npm run build both pass in the final output.
```

Read `CLAUDE.md` and `PulseCoach-Project-Description.pdf` first. Work on branch `track-c` and touch only Track C files.

## What to build

Everything the team needs to present: a pitch script, a demo script, and a short user test that produces real evidence. A working demo with measured results and a clear story is what wins.

All three are Markdown files in `docs/`. Write them from what the app actually does, which you can check in the code and the progress files. Leave a clearly marked blank wherever a real result belongs, and never invent a number.

- **`docs/user-test.md`.** A test five people can each do in three minutes:
  - Who to ask: nursing or health sciences students if possible.
  - A one-sentence spoken consent line: nothing is recorded and video stays on the laptop.
  - Round 1: 30 seconds with the metronome and voice muted. Round 2: 30 seconds with full coaching.
  - A results table with one row per person: average rate and score for each round, whether the rate was inside 100 to 120, and one quote.
  - A summary line to fill in afterwards: how many of the five were in the target range without coaching, and how many with it.
  - A note that if the results are flat or worse, the team reports that honestly and says what it would change.
- **`docs/pitch.md`.** A three-minute script in five parts, with a time for each:
  - The problem, using the figures in the project description.
  - The live demo.
  - The evidence, with blanks for the user-test results.
  - Honest limits: adult hands-only CPR only; a practice aid between certified sessions, not a replacement for them; depth is an estimate; the app cannot see hand placement.
  - What comes next: validation against a feedback manikin, review by a CPR instructor, child and infant modes.
  - Prepared answers to the three questions judges are most likely to ask: "How do you know it is right?", "What about depth?", and "What about children and infants?"
- **`docs/demo-script.md`.** A step-by-step run of the live demo:
  - Who presents and who demonstrates.
  - The exact order: setup check, a deliberately poor 10 seconds so the coaching speaks, a good 20 seconds, the score, the debrief, then a judge is invited to try.
  - What to do if the camera fails (`?video=/demo.mp4`), and if everything fails (`?sim=1`).
  - A checklist for the five minutes before presenting.

## Done when

- [ ] The three files exist in `docs/`.
- [ ] Every claim about what the app does matches the code or the progress files. List anything you could not confirm.
- [ ] Every figure in the pitch comes from the project description or is a marked blank for a measured result.
- [ ] The pitch says, in plain words, that this is for adult hands-only CPR and is a practice aid.
- [ ] Reading the pitch aloud at a normal pace takes about three minutes, which is roughly 400 to 450 words.
- [ ] `npm run check` still passes.
- [ ] No file outside Track C's list was changed.
- [ ] `progress/track-c.md` updated.

## Human check

- Read the pitch aloud once with a timer.
- Once the app is ready to demo, run the user test with five people and fill in the table.
- Put the real results into the pitch, then ask Claude to tighten the evidence section around them.
- Then say "ship it".

## Out of scope

Slides, code changes, anything in Track A or B files.
