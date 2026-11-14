# 00: Scaffold

**Track:** shared, built by the Track A lead · **Branch:** `main` · **Time budget:** 20 min · **Priority:** Must-have
**Needs on main:** nothing

## Goal

```
Complete tasks/00-scaffold.md. Done means every item under "Done when" is verified with evidence, and npm test and npm run build both pass in the final output.
```

Read `CLAUDE.md` first. This is the only task that commits on `main` directly.

## What to build

A running project with a stand-in at each of the three contracts in `CLAUDE.md`, so that all three tracks can start at the same time. Build only what is listed. Speed matters here: two people are waiting on this task.

- **Project.** Vite, vanilla JavaScript, in the repository root. Keep `CLAUDE.md`, `TEAM.md`, `tasks/` and the PDFs untouched. Set `"type": "module"` and a Node version under `engines`.
- **Scripts.** `dev`, `build`, `preview`, `test` (`vitest run`), `check` (tests, then build), and `setup:assets`, which copies `node_modules/@mediapipe/tasks-vision/wasm/` to `public/wasm/` and also runs on `postinstall`.
- **Dependencies.** Install everything any track will need, so nobody edits `package.json` later: `@mediapipe/tasks-vision` and `@anthropic-ai/sdk`, with `vitest` and `jsdom` as dev dependencies. Tests that need a page use Vitest's jsdom environment.
- **`.gitignore`.** `node_modules`, `dist`, `.env.local`, `.env*.local`, `public/wasm`, `.vercel`, `.DS_Store`.
- **`.env.example`.** One line: `ANTHROPIC_API_KEY=`.
- **`src/config.js`.** The starting values from `CLAUDE.md`, in three sections with a comment header for each track.
- **`src/styles.css`.** The colour variables from `CLAUDE.md` and a dark page base with system fonts.
- **`src/copy.js`.** The product name and the footer line "Practice aid for adult hands-only CPR. Not a substitute for certified training."
- **Contract 1, `src/engine.js`.** The exact interface from `CLAUDE.md`, backed by a fake engine:
  - `onState` fires every 100 ms and `onCompression` fires at the `cpm` rate, with every field of both shapes filled in plausibly.
  - It reads `cpm`, `bend`, `lean`, `recoil` and `travel` from the address. A `bend` of 20 or more sets `issues.elbows` and makes events report `elbowsLocked: false`. A `lean` of 20 or more does the same for position, and a `recoil` under 0.85 for recoil.
  - `reset()`, `markRest()`, `stop()` and `setDebug()` exist and do not throw.
  - The stage container shows a plain panel reading "Fake engine".
  - Take the timer functions as an optional argument so the test can drive time.
- **Contract 2, `tests/fixtures/`.**
  - `stats.js`: three sample stats objects in the contract shape, `goodStats`, `slowStats` and `sloppyStats`.
  - `events.js`: `makeEvents({ cpm, seconds, lockedRate, alignedRate, recoilRate, slowDownBy })`, which returns a list of compression events.
- **Contract 3, `src/debrief/card.js`.** A stand-in `renderDebriefCard(container, stats)` that writes one placeholder sentence into the container.
- **`index.html` and `src/main.js`.** A minimal page that starts the engine in a stage element and prints the compression count, rate, rate zone and issues as plain text. Track B replaces this page later.
- **Dev pages.** `dev/stage.html`, which mounts the engine stage and prints the raw state, and `dev/debrief.html`, which calls `renderDebriefCard` with `goodStats`.
- **Progress files.** `progress/track-a.md`, `progress/track-b.md` and `progress/track-c.md`, each with a title line.

## Done when

- [ ] `npm install` followed by `npm run check` passes.
- [ ] A test drives the fake engine with fake timers: 10 seconds at `cpm=120` gives 20 compressions, give or take one, and every event has every field from the contract.
- [ ] A test confirms `bend=30` sets `issues.elbows` and `lean=25` sets `issues.position`.
- [ ] `npm run dev` serves the page, and with `?sim=1&cpm=110` the printed count climbs at about 110 a minute. Verify in a browser if you have one available; otherwise say so.
- [ ] `/dev/stage.html` and `/dev/debrief.html` both load.
- [ ] The fixtures match the contract shapes in `CLAUDE.md` field for field.
- [ ] The work is committed on `main`. Push only when the person says to.

## Human check

- Open the page with `?sim=1`. The count climbs and the rate reads about 110.
- Add `&bend=30` to the address. The elbows issue shows as true.
- Tell the team the scaffold is on `main`. Everyone pulls, runs `npm install`, and creates their track branch.

## Out of scope

The camera, real detection, real screens, audio, the real debrief.
