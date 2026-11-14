# C2: AI debrief

**Track:** C · Debrief and launch · **Branch:** `track-c` · **Time budget:** 40 min · **Priority:** Should-have
**Needs on main:** C1

## Goal

```
Complete tasks/C2-ai-debrief.md. Done means every item under "Done when" is verified with evidence, and npm test and npm run build both pass in the final output.
```

Read `CLAUDE.md` first. Work on branch `track-c` and touch only Track C files.

## About the API key

The live call needs an Anthropic API key. The repository owner adds it to the deployed site, so this task can be built and tested without one. If the person has a key on this laptop, it goes in a file named `.env.local` in the project root as `ANTHROPIC_API_KEY=...`.

Claude: read the key only through the environment. Never print it, log it, commit it or copy it into another file. If there is no key, build everything anyway and say plainly in your final message that the live call was not verified.

## What to build

After each session, the debrief card shows two or three sentences of personal coaching written by Claude from the session's numbers. The quick tips from C1 appear at once and are replaced when the AI text arrives, so the card is never empty and the demo never waits on the network.

- **`src/debrief/schema.js`.** Add `buildPrompt(stats)`, returning `{ system, user }`.
- **The prompt.** The system prompt should establish: you are a CPR instructor debriefing a learner who practised adult hands-only chest compressions on a pillow with a webcam coach. Use only the numbers given and the adult targets (rate 100 to 120 per minute, depth 5 to 6 cm, full recoil, straight arms, shoulders over hands). Write two or three sentences, under 70 words, in plain encouraging language addressed to "you". Name one specific thing done well, then the one or two most important fixes, each with a concrete physical tip. Treat depth as an estimate. Give no medical advice beyond compression technique.
- **`api/debrief.js`.** A Vercel-style Node function: `export default async function handler(req, res)`.
  - POST only; anything else gets 405. Bodies over 2 KB or failing `validateStats` get 400.
  - Call Claude with the official `@anthropic-ai/sdk` package, already installed. Use model `claude-opus-5-5` at low effort for speed. **Load the `claude-api` skill before writing this call and follow it for the exact request shape. Do not write the request from memory.**
  - Leave enough room in `max_tokens` that the reply is never cut off.
  - Check the stop reason. If the reply did not end normally or has no text, respond 502.
  - Success returns `{ text }`. Errors return `{ error }` with a short generic message. Never pass upstream error details or the key to the browser.
  - A simple in-memory limit of 20 requests a minute is enough for a demo.
- **Local development, in `vite.config.js`.** Make `npm run dev` serve `/api/debrief` as well, with a small Vite plugin that mounts the same handler and loads `.env.local`.
- **`src/debrief/client.js`.** `getDebrief(stats)` posts the stats with a timeout of `DEBRIEF_TIMEOUT_MS`. It returns `{ text, source: 'ai' }` on success, and `{ text: fallbackDebrief(stats), source: 'fallback' }` on any failure. It never throws.
- **`src/debrief/card.js`.** After showing the quick tips, call `getDebrief`. If the source is `'ai'`, fade to the new text and change the label to "AI coach". Otherwise leave the card as it is.
- **Privacy.** Only the stats object leaves the browser. No name, no video, no images.

## Done when

- [ ] `npm run check` passes, including new tests that make no real API calls:
  - `buildPrompt` includes the session's numbers and the targets.
  - The handler returns 405 for GET and 400 for a bad body, tested with fake request and response objects and a mocked SDK.
  - The handler returns 502 when the mocked reply has no text.
  - `getDebrief` returns the fallback on a timeout, a 500 and a network error, tested with a mocked `fetch`.
  - The card keeps the quick tips when the source is `'fallback'` and swaps the text when it is `'ai'`.
- [ ] With a key present: a POST of `goodStats` to the local `/api/debrief` returns `{ text }` with two or three sentences. Show the response. Without a key: show the fallback path working and state that the live call was not verified.
- [ ] After `npm run build`, a search of `dist/` finds neither `ANTHROPIC_API_KEY` nor anything starting `sk-ant`.
- [ ] `.env.local` is listed in `.gitignore` and is not in `git status`.
- [ ] The signature `renderDebriefCard(container, stats)` is unchanged.
- [ ] No file outside Track C's list was changed.
- [ ] `progress/track-c.md` updated.

## Human check

- Open `/dev/debrief.html`. With a key and Wi-Fi on, the AI text replaces the quick tips within a few seconds and matches the sample's numbers.
- Turn Wi-Fi off and press a button again. The quick tips stay, and no error appears.
- Then say "ship it".

## Out of scope

Deployment, the results screen, anything in Track A or B files.
