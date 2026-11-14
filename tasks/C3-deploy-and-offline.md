# C3: Deploy and offline backup

**Track:** C · Debrief and launch · **Branch:** `track-c` · **Time budget:** 20 min · **Priority:** Should-have
**Needs on main:** C2

## Goal

```
Complete tasks/C3-deploy-and-offline.md. Done means every item under "Done when" is verified with evidence, and npm test and npm run build both pass in the final output.
```

Read `CLAUDE.md` first. Work on branch `track-c` and touch only Track C files.

## Before you start (people)

The repository owner does this once, in a browser:

- Sign in to Vercel with GitHub and import the PulseCoach repository. From then on, every push to `main` updates the public link.
- Add `ANTHROPIC_API_KEY` under the Vercel project's environment variables, then redeploy.

Claude: prepare the project so the import works first time. Do not run any deploy command yourself.

## What to build

A public link for the submission, and a copy that runs from a laptop with no internet in case the venue Wi-Fi fails.

- **Deployable build.** Confirm the Vite build and the `api/debrief.js` function work together on Vercel. Add a `vercel.json` only if it is needed.
- **Offline run.** `npm run build` then `npm run preview` must serve a working app with the network off. The model file, the wasm files and every other asset come from the build output. The preview server has no `/api/debrief`, so the debrief card stays on quick tips, which is the intended behaviour.
- **`README.md`.** Short and practical:
  - What PulseCoach is, in two sentences: a two-person relay drill for adult hands-only CPR that calls the switch when compressions slip, with a solo mode. Say it is a practice aid.
  - Run locally, with and without the AI debrief.
  - How the public link is updated.
  - Environment variables.
  - Keyboard shortcuts.
  - The three ways to run a demo: camera, `?video=/demo.mp4`, `?sim=1`, plus `&fatigue=1` to make the simulated compressor slip and `?turnSeconds=` to shorten turns.
  - The team's three tracks, one line each.

## Done when

- [ ] `npm run check` passes.
- [ ] `dist/` contains the pose model and the wasm files, once Track A's first task is on `main`. If it is not yet, say so.
- [ ] With `npm run preview` running, requests for `/` and one built asset each return 200. Show the output.
- [ ] A search of `dist/` finds no third-party URL fetched at runtime and no API key.
- [ ] `README.md` exists and covers the seven points above.
- [ ] No file outside Track C's list was changed.
- [ ] `progress/track-c.md` updated.

## Human check

- After the repository owner has imported the project, open the public link with `?sim=1` and finish one session. The debrief label changes to "AI coach".
- Turn Wi-Fi off, run `npm run preview`, and finish one session from the laptop.
- Post the public link in the team chat.
- Then say "ship it".

## Out of scope

New features of any kind.
