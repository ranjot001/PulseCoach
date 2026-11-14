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

## C2: AI debrief

**Built**
- `src/debrief/schema.js`: `buildPrompt(stats)` returns `{ system, user }`. It is built only from validated stats; the targets come from `src/config.js`.
- `api/debrief.js`: Vercel-style `handler(req, res)`.
  - POST only (405 otherwise). Bodies over 2 KB or failing `validateStats` get 400. 20 requests a minute in memory (429 after).
  - Calls `claude-opus-5-5` with `@anthropic-ai/sdk` at low effort, `max_tokens` 16000.
  - Returns 502 unless the reply ended with `end_turn` and has text. All errors are generic; no upstream detail reaches the browser.
  - Uses the API's server-side refusal fallback (`fallbacks: 'default'`, beta `server-side-fallback-2026-07-01`). If Claude declines, the API retries on a fallback model in the same call. Remove those two lines to turn it off.
  - `createHandler({ getClient, now })` exists for tests; the default export is the real handler.
- `src/debrief/client.js`: `getDebrief(stats)` posts only the stats, with a `DEBRIEF_TIMEOUT_MS` timeout. Returns `{ text, source: 'ai' }`, or the quick tips with `source: 'fallback'` on any failure. Never throws.
- `src/debrief/card.js`: shows the quick tips at once, then fades in the AI text and changes the label to "AI coach". A late reply never overwrites a newer card. Invalid stats never trigger a call.
- `vite.config.js`: a small plugin mounts the same handler at `/api/debrief` under `npm run dev` and loads `.env.local` into the server's environment only.
- Tests: `tests/api-debrief.test.js` (mocked SDK), `tests/client.test.js` (mocked `fetch`), plus additions to `tests/schema.test.js` and `tests/card.test.js`.

**Config values changed**: none.

**Verified**
- `npm run check` passes: 118 tests in 7 files, build clean.
- Local dev server: GET gives 405, a bad body gives 400.
- `dist/` contains neither `ANTHROPIC_API_KEY` nor `sk-ant`.
- `.env.local` is in `.gitignore`.

**Not verified: the live AI call.** There was no API key on this laptop, so a POST of `goodStats` returned a generic 502 and the card kept its quick tips. To test it, put `ANTHROPIC_API_KEY=...` in `.env.local`, restart `npm run dev`, and POST `goodStats` to `/api/debrief`.

**For C3 (deploy)**: set `ANTHROPIC_API_KEY` in the Vercel project's environment variables.

**Human checks still to do**
- With a key and Wi-Fi on, open `/dev/debrief.html`. The AI text should replace the quick tips within a few seconds, with the label "AI coach", and match the sample's numbers.
- Turn Wi-Fi off and press a button again. The quick tips should stay, with no error shown.

## C3: Deploy and offline backup

**Built**
- `README.md`: what PulseCoach is, running locally with and without the AI debrief, the offline backup, how the public link updates, environment variables, keyboard shortcuts, the three demo sources, and the three tracks.
- No `vercel.json`. Vercel detects Vite (`npm run build` into `dist/`) and runs `api/debrief.js` as a Node function without one. `npm install` on Vercel runs `postinstall`, which copies the wasm files into `public/wasm`, so they land in `dist/wasm`.

**Config values changed**: none.

**Verified**
- `npm run check` passes.
- `dist/` contains the four MediaPipe wasm files. **It has no pose model yet**, because Track A's A1 (`public/models/`) is not on `main`. Once it is, the model is copied into `dist/` the same way.
- `npm run preview`: `/`, a built script, a built stylesheet, the wasm file and `/dev/debrief.html` all return 200. `/api/debrief` returns 404 there, so the card stays on quick tips.
- `dist/` fetches no third-party URL. The only URLs are the SVG namespace and comments inside MediaPipe's wasm loader. No API key or `sk-ant` string is present.

**README notes for later tasks**: `?video=` arrives with A6, `&fatigue=1` with A5 and `?turnSeconds=` with B5. The README says so; remove those notes once they ship.

**Human checks still to do**
- The repository owner imports the repo into Vercel and adds `ANTHROPIC_API_KEY`. Then open the public link with `?sim=1`, finish one session, and check that the debrief label changes to "AI coach".
- Turn Wi-Fi off, run `npm run build && npm run preview`, and finish one session from the laptop.
- Post the public link in the team chat.
