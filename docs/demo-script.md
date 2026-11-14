# PulseCoach demo script

A step-by-step run of the live demo in part 2 of `docs/pitch.md`. It takes about one minute on stage.

## People

| Role | Who | Where |
|---|---|---|
| Presenter | Track C lead | Beside the screen, facing the judges |
| Compressor 1, drives the laptop | Track B lead | Kneeling side-on to the camera, over the pillow |
| Compressor 2 | Track A lead | Kneeling on the far side of the pillow, **out of the camera's view**, so the camera only ever sees one person |

At the switch, compressor 1 lifts their hands and leans back out of view, and compressor 2 moves in. Practise this swap until it takes under five seconds.

## Before you start

- The laptop is on a stable surface, side-on to the pillow, with the whole upper body of whoever is compressing in the picture.
- The pillow is firm and sits on the floor, not on a soft surface.
- The address bar is ready with the demo address: `/?turnSeconds=30`.
- The volume is up, so the room hears the metronome and the voice.

## The run

1. **Setup check.** Compressor 1 kneels in position. Point at the "Get into position" checklist on the home screen. Each line turns to ✓ as the camera sees a person, arms and hips, side-on and at the right distance. Press Space to start.
2. **Countdown, then compressor 1.** Compressor 1 does good compressions in time with the metronome for about 15 seconds: arms straight, shoulders over hands, full release. The rate shows green.
3. **The slip, on purpose.** Compressor 1 lets their form slip: smaller, slower pushes and bent elbows. Hold it until the app flags slipping and calls the switch. Track A says their line from the pitch while this happens.
4. **Rhythm check and swap.** The voice says "Stop compressions. Rhythm check." A pause timer counts up, green, then amber, then red. When the voice says "Switch compressors. Resume now", compressor 2 moves in and starts straight away.
5. **Compressor 2 finishes** the turn with good compressions.
6. **Results screen.** Point at four things: the team score, the compression fraction, the switch pause, and the time compressor 1 started to slip.
7. **Team debrief.** Read the first two sentences of the team debrief card aloud, or press "Read aloud".
8. **Educator view**, only if it is on `main`: ten seconds on `/educator.html`. "This is what the nurse educator sees."
9. **Invite two judges to try.** Hand over the pillow and press Space.

## If something fails

| Problem | Do this | Say |
|---|---|---|
| The camera won't start, or tracking is poor | Load `/?video=/demo.mp4&turnSeconds=30` | "Here is the same drill from a recording." |
| Everything fails | Load `/?sim=1&fatigue=1&turnSeconds=30` | "This is the built-in simulator: a virtual compressor who tires on cue." |
| No internet | Nothing changes: the app runs offline, and the debrief shows its quick tips instead of the AI text | Nothing |

Keep both backup addresses in open browser tabs before you present.

## Five minutes before presenting

- [ ] The laptop is charged, plugged in, and won't sleep or show notifications.
- [ ] Tabs open: the demo address, the video backup and the simulator backup.
- [ ] The camera has permission, and the setup check shows all ✓ with compressor 1 in position.
- [ ] The volume is up; press M to check the voice is on.
- [ ] The pillow is in place and compressor 2 is out of the camera's view.
- [ ] One full practice run of the swap.
- [ ] Back to the home screen, ready to press Space.
- [ ] Pitch blanks are filled in with the real user-test results, or the line is changed to "we have not tested this yet".

## Not on `main` yet

These steps depend on tasks that weren't on `main` when this script was written (C5). Check each before the demo, and cut any step that isn't there:

- The relay drill, switch overlay, rhythm-check voice and `?turnSeconds=` (Track B, task B5).
- The relay results screen with compression fraction, switch pause and slipping time (B6).
- Slipping detection and `&fatigue=1` (Track A, task A5).
- The `?video=` source and the camera-based setup check (A6). The setup checklist on the home screen is on `main` (B4), but its checks come from Track A's engine.
- The team debrief card: built in C4 and waiting in PR #2.
- The educator view (C6).
