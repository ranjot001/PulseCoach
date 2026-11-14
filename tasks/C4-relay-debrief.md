# C4: Relay debrief

**Track:** C · Debrief and launch · **Branch:** `track-c` · **Time budget:** 35 min · **Priority:** Must-have
**Needs on main:** C2 (build against `tests/fixtures/relayStats.js`; Track B's relay results are not needed)

## Goal

```
Complete tasks/C4-relay-debrief.md. Done means every item under "Done when" is verified with evidence, and npm test and npm run build both pass in the final output.
```

Read `CLAUDE.md` first, especially "The relay drill", Contract 2 and Contract 3. Work on branch `track-c` and touch only Track C files.

## What to build

Hospitals hold a short debrief after every real code. This task gives the relay drill one: a line for the team, then a line for each compressor, built from the relay stats. The solo debrief keeps working exactly as it does now.

- **`src/debrief/schema.js`.**
  - `validateRelayStats(body)`: as strict as `validateStats`.
    - `mode` must be `'relay'`.
    - The top-level numbers must be finite and in range, with `avgSwitchSec` allowed to be `null`.
    - `turns` is an array of 1 to 8 items. Each turn passes `validateStats` and has a `compressor` of 1 to 4, a `slippedAtSec` that is `null` or 0 to 3600, and `signs` drawn only from `'shallower'`, `'slower'` and `'elbows'`, with no repeats.
    - Unknown fields are dropped at every level.
  - `validateAnyStats(body)`: relay when `mode` is `'relay'`, solo otherwise.
  - `buildRelayPrompt(stats)`: the system prompt is a CPR instructor running a short post-drill debrief for a team relay.
    - It gives the targets from `src/config.js`: rate, switching every 2 minutes or sooner when tired, pauses under `PAUSE_MAX_SEC` seconds, and compressions at least `CCF_TARGET`% of the time.
    - Ask for three to five sentences and under 110 words. Speak to the team first, then to each compressor by number, with one concrete physical tip each.
    - Same honesty rules as the solo prompt: "slipping" means dropping below their own start, it is not a measurement of force, no medical advice, and none of the banned words.
- **`src/debrief/fallback.js`.** `fallbackRelayDebrief(stats)`: three to five rule-based sentences.
  - **Team.** The compression fraction against the 80% target, and the slowest switch against 10 seconds.
  - **Each compressor.** Their strongest point and their main fix. When they slipped, say when and how, in plain words, and say that switching early is the right response. For example: "Compressor 1, your pushes got smaller and slower from about 24 seconds in; that is normal, and switching early kept the team's compressions strong."
  - When everything is strong, say so and suggest longer turns.
- **`src/debrief/card.js`.** Relay stats get the title "Team debrief". Everything else stays the same: quick tips at once, the AI text when it arrives, never throws, never empty. Solo stats behave exactly as before.
- **`api/debrief.js`.** Accept either shape through `validateAnyStats`, and use the matching prompt. Raise the body limit to 8 KB.
- **`dev/debrief.html`.** Add three buttons for `goodRelay`, `slowSwitchRelay` and `fadingRelay`.
- **`README.md`.** If C3 already wrote it, update the description to the relay drill.

## Done when

- [ ] `npm run check` passes, including new tests:
  - `validateRelayStats` accepts all three relay fixtures. It rejects a bad `mode`, a turn with a string number, an unknown sign, a repeated sign, nine turns, and `NaN` anywhere. It drops unknown fields at both levels.
  - `fallbackRelayDebrief` for `slowSwitchRelay` mentions the slow switch and the compression fraction. For `fadingRelay` it mentions compressor 1 slipping at about 24 seconds and the early switch. For `goodRelay` it says everything was strong. Each is three to five sentences.
  - `buildRelayPrompt` contains only numbers and fixed labels from the stats, and includes each compressor's number.
  - The API handler accepts a relay body, calls the mocked SDK with the relay prompt, and still rejects bad bodies with 400.
  - `renderDebriefCard` with relay stats shows "Team debrief". With solo stats it is unchanged. With broken relay stats it shows the neutral sentence and does not throw.
- [ ] The signature `renderDebriefCard(container, stats)` is unchanged.
- [ ] No file outside Track C's list was changed.
- [ ] `progress/track-c.md` updated.

## Human check

- Open `/dev/debrief.html` and press the three relay buttons. Each debrief reads like a short post-code debrief and matches the numbers in that sample.
- With a key in `.env.local`, the AI text replaces the quick tips for a relay sample.
- Then say "ship it".

## Out of scope

The relay results screen, which is Track B's. Deployment, which is C3.
