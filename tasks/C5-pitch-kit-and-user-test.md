# C5: Pitch kit and user test

**Track:** C · Debrief and launch · **Branch:** `track-c` · **Time budget:** 40 min · **Priority:** Must-have
**Needs on main:** C1

## Goal

```
Complete tasks/C5-pitch-kit-and-user-test.md. Done means every item under "Done when" is verified, and npm test and npm run build both pass in the final output.
```

Read `CLAUDE.md` first, especially "Why a relay" and "The relay drill". Work on branch `track-c` and touch only Track C files.

## What to build

Everything the team needs to present: a pitch script, a demo script, and a short user test that produces real evidence. Another team is building a webcam CPR coach. Ours is different because it trains what happens after the first minute: fatigue, switching, and keeping pauses short. The pitch must make that difference obvious in the first 20 seconds, without mentioning the other team.

All three are Markdown files in `docs/`. Write them from what the app actually does, which you can check in the code and the progress files. Leave a clearly marked blank wherever a real result belongs, and never invent a number.

- **`docs/user-test.md`.** A test five people can each do in about three minutes, testing the claim at the heart of the pitch: the app notices slipping before people do.
  - Who to ask: nursing or health sciences students if possible.
  - A one-sentence spoken consent line: nothing is recorded and video stays on the laptop.
  - Setup: open the app with `?turns=1&turnSeconds=90`. Each person does one 90-second turn with full coaching. They say "tired" out loud the moment they feel their compressions getting worse, and a teammate notes the time on a stopwatch.
  - A results table with one row per person: when the app flagged slipping (from the results screen, or "never"), when they said "tired" (or "never"), average rate, percentage in range, and one quote.
  - Optional second part with pairs of volunteers: one relay drill each, recording the switch pause and the compression fraction.
  - A summary line to fill in afterwards: in how many of the five the app flagged slipping, and on average how many seconds before or after the person said "tired".
  - A note that if the results are flat or go the other way, the team reports that honestly and says what it would change.
- **`docs/pitch.md`.** A three-minute script in five parts, with a time for each:
  - **The problem.** Use only these figures, each with its source:
    - After a 911 call, help takes a median of 7 minutes, and 13 in rural areas (Mell et al., JAMA Surgery, 2017).
    - In manikin studies, compression quality starts to drop after about one minute (Hightower et al., 1995), and rescuers do not notice for about three (Ochoa et al., 1998).
    - Guidelines: switch every 2 minutes or sooner if tired, pauses under 10 seconds, compressions 80% of the time (AHA).
    - Open with the line "CPR is a relay, not a sprint."
  - **The live demo.** Two people relay.
  - **The evidence**, with blanks for the user-test results.
  - **Honest limits.**
    - Adult hands-only CPR only.
    - A practice aid between certified sessions, not a replacement for them.
    - The slipping check compares each person with their own start; it does not measure force or depth.
    - A pillow is not a manikin.
    - The drill shortens the 2-minute turn so it fits a demo.
    - The camera cannot see hand placement.
    - The blood-flow meter is an illustration of why pauses matter, not a measurement.
  - **What comes next.** Present these as plans, not as things the app does today:
    - **A sensor pad.** A low-cost pressure and motion sensor under the pillow or manikin that measures compression depth and force directly. The camera then handles rate, form and slipping, and the pad handles centimetres.
    - **Patient profiles.** With measured depth, the app can switch targets by patient: adult 5 to 6 cm, child about 5 cm, infant about 4 cm (AHA).
    - **Too-deep warnings.** The adult limit of 6 cm exists because deeper compressions are linked to more injuries, mostly rib and breastbone fractures, and older patients' bones are more fragile. With a sensor, the app can train control: deep enough, and not too deep.
    - Wording to keep: do not say the app prevents broken ribs, and do not say older adults need shallower compressions. The adult depth target is the same at every age.
    - Also: validation against a feedback manikin, review by a CPR instructor, a code-team mode with more roles, and unit-wide history for nurse educators across devices. Today the educator view shows only drills saved in one browser.
  - **Prepared answers** to the questions judges are most likely to ask:
    - "How do you know it is right?"
    - "Why not measure depth?"
    - "Won't a pillow be too easy to get tired on?"
    - "What about children and infants?"
    - "What about older patients and broken ribs?"
- **`docs/demo-script.md`.** A step-by-step run of the live demo:
  - Who presents, and which two people demonstrate.
  - Where the second compressor waits: out of the camera's view, on the far side of the pillow, so the camera only ever sees one person.
  - The exact order:
    - The setup check.
    - A relay with `?turnSeconds=30`. Compressor 1 does good compressions, then lets their form slip on purpose, and the app calls the switch.
    - The rhythm-check pause and a fast swap.
    - Compressor 2 finishes.
    - The results screen: team score, compression fraction, the switch pause, and compressor 1's slipping time.
    - The team debrief.
    - If the educator view is on `main`, ten seconds on `/educator.html`: "this is what the nurse educator sees".
    - Then invite two judges to try.
  - What to do if the camera fails (`?video=/demo.mp4`), and if everything fails (`?sim=1&fatigue=1&turnSeconds=30`).
  - A checklist for the five minutes before presenting.

## Done when

- [ ] The three files exist in `docs/`.
- [ ] Every claim about what the app does matches the code or the progress files. List anything you could not confirm, such as a feature not yet on `main`.
- [ ] Every figure in the pitch is one listed in this file, with its source, or is a marked blank for a measured result.
- [ ] The pitch says, in plain words, that this is for adult hands-only CPR and is a practice aid.
- [ ] Reading the pitch aloud at a normal pace takes about three minutes, which is roughly 400 to 450 words.
- [ ] `npm run check` still passes.
- [ ] No file outside Track C's list was changed.
- [ ] `progress/track-c.md` updated.

## Human check

- Read the pitch aloud once with a timer.
- Once the relay drill is on `main`, run the user test with five people and fill in the table.
- Put the real results into the pitch, then ask Claude to tighten the evidence section around them.
- Then say "ship it".

## Out of scope

Slides, code changes, anything in Track A or B files.
