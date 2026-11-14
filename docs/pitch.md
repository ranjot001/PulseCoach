# PulseCoach pitch

A three-minute script in five parts. The lines in quote blocks are spoken aloud: about 440 words, which is three minutes at a normal pace. Everything else is a note for the presenters.

Who speaks, as in `TEAM.md`:
- **Track C lead** opens, then presents the evidence, the limits and what comes next.
- **Track B lead** runs the live demo and is compressor 1.
- **Track A lead** is compressor 2 and explains how the camera spots slipping.

Blanks marked `[RESULT: …]` are filled in from `docs/user-test.md`. Never replace a blank with a guess. If the test has not run, say "we have not tested this yet".

---

## 1. The problem (0:00 to 0:40), Track C lead

> CPR is a relay, not a sprint.
>
> After a 911 call, help takes a median of seven minutes to arrive, and thirteen in rural areas. Someone has to keep pushing for all of that time.
>
> In manikin studies, compression quality starts to drop after about one minute, and rescuers do not notice for about three. That is why the guidelines say: switch compressors every two minutes, or sooner if you are tired, keep every pause under ten seconds, and keep compressions going at least eighty percent of the time.
>
> Practice usually stops at getting the first pushes right. PulseCoach trains what happens after the first minute: fatigue, switching, and short pauses. It is a practice aid for adult hands-only CPR, and it needs nothing but a laptop webcam.

Sources, if asked:
- Median time to help, 7 minutes, and 13 in rural areas: Mell et al., *JAMA Surgery*, 2017.
- Quality drops after about one minute: Hightower et al., 1995.
- Rescuers don't notice for about three minutes: Ochoa et al., 1998.
- Switch every 2 minutes or sooner if tired, pauses under 10 seconds, compressions at least 80% of the time: American Heart Association guidelines.

## 2. The live demo (0:40 to 1:40), Track B and Track A leads

Follow `docs/demo-script.md`. Speak only these lines; let the app do the rest.

> Track B: Two of us, one pillow. I start. The camera only ever sees whoever is compressing.
>
> Track A: The camera tracks the shoulders, elbows and hips. In the first seconds of a turn it learns your own rhythm. When your pushes get smaller, slower or your elbows bend, compared with how you started, that is slipping, and the app calls the switch.
>
> Track B, after the results: One team score, the time the switch took, and the moment I started to slip.

## 3. The evidence (1:40 to 2:10), Track C lead

> We asked five [RESULT: who, for example "nursing students"] to compress for ninety seconds and say "tired" the moment they felt their compressions getting worse. The app flagged slipping in [RESULT: x] of five, on average [RESULT: y] seconds [RESULT: before / after] they said it. [RESULT: one short quote from a volunteer.]

If the results are flat or go the other way, say so plainly, and say what the team would change.

## 4. Honest limits (2:10 to 2:35), Track C lead

> What it is not. This is for adult hands-only CPR only. It is a practice aid between certified courses, not a replacement for them. The slipping check compares you with your own start; it does not measure force or depth. A pillow is not a manikin, the camera cannot see hand placement, and our demo turns are shorter than two minutes so they fit on stage. The blood-flow meter shows why pauses matter; it is an illustration, not a measurement.

Cut the blood-flow meter sentence if the flow meter (Track B, task B9) is not in the build.

## 5. What comes next (2:35 to 3:00), Track C lead

> Next, we would add a low-cost sensor pad under the pillow or manikin to measure depth and force directly. The camera keeps rate, form and slipping; the pad handles centimetres. With real depth, the app can switch targets by patient, and warn when a push goes too deep, training control: deep enough, and not too deep. We would also check it against a feedback manikin, have a CPR instructor review it, and add a code-team mode. CPR is a relay. PulseCoach trains the whole race.

Notes on what comes next. These are plans, not things the app does today:
- **Patient profiles** (AHA): adult 5 to 6 cm, child about 5 cm, infant about 4 cm.
- **Too-deep warnings:** the adult limit of 6 cm exists because deeper compressions are linked to more injuries, mostly rib and breastbone fractures, and older patients' bones are more fragile.
- **Wording to keep:** never say the app prevents broken ribs, and never say older adults need shallower compressions. The adult depth target is the same at every age.
- **Unit-wide history:** the educator view today shows only drills saved in one browser. Next would be history across devices for a nurse educator's whole unit.

---

## Prepared answers

These aren't part of the three minutes. Keep each answer to about 20 seconds.

**"How do you know it is right?"**
We don't claim it is exact. The rate and form checks follow the camera's view of the joints, and the slipping check compares each person with their own first seconds, so it doesn't depend on body size or distance from the camera. Our evidence so far is the five-person test: [RESULT: summary line]. The next step is checking it against a feedback manikin.

**"Why not measure depth?"**
A single webcam can't measure centimetres reliably: it sees the shoulders move, not the chest. Rather than show a number we can't stand behind, we track change against your own start. Depth is the job of the sensor pad we would add next.

**"Won't a pillow be too easy to get tired on?"**
Probably, yes: a pillow pushes back less than a chest or a manikin. That is one reason we compare each person with their own start rather than with a fixed target. The relay habits we train, switching early and keeping pauses short, carry over either way. We list it as a limit.

**"What about children and infants?"**
Today it is adult hands-only CPR only. Children and infants need different technique and depth targets. With measured depth from a sensor pad, the app could switch targets by patient: about 5 cm for a child and about 4 cm for an infant (AHA). We haven't built that.

**"What about older patients and broken ribs?"**
The adult depth target is the same at every age. The adult limit of 6 cm exists because deeper compressions are linked to more injuries, mostly rib and breastbone fractures, and older patients' bones are more fragile. With a sensor, the app could train control, deep enough and not too deep. We don't claim it prevents injuries.
