# PulseCoach

PulseCoach is a two-person relay drill for adult hands-only CPR, coached by a laptop webcam: it counts compressions, checks rate and form, and calls the switch when the compressor's pushes start to slip. It also has a 30-second solo mode, and it is a practice aid, not a certification or a medical device.

## Run it locally

You need Node 20 or newer.

```sh
npm install        # also copies the MediaPipe wasm files into public/wasm
npm run dev        # http://localhost:5173
```

**With the AI debrief.** Create a file named `.env.local` in the project root containing one line, `ANTHROPIC_API_KEY=...`, then restart `npm run dev`. The dev server serves `/api/debrief` itself, so the debrief card switches from "Quick tips" to "AI coach" a few seconds after a session ends.

**Without the AI debrief.** Leave out `.env.local`. Everything else works, and the debrief card shows the built-in quick tips.

**Offline backup**, in case the venue Wi-Fi fails:

```sh
npm run build
npm run preview    # http://localhost:4173, works with the network off
```

The preview server has no `/api/debrief`, so the debrief card stays on quick tips. That is expected.

`npm test` runs the tests. `npm run check` runs the tests and then the build.

## The public link

The site is hosted on Vercel, which is connected to this GitHub repository. Every push to `main` builds and publishes a new version of the public link automatically; there is no deploy command to run. Vercel serves the built app from `dist/` and runs `api/debrief.js` as a serverless function.

## Environment variables

| Name | Where | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Vercel project settings, and `.env.local` on a laptop | Lets `api/debrief.js` call Claude for the AI debrief. Without it, the card uses quick tips. |

The key is read only on the server. Never commit it: `.env.local` is in `.gitignore`.

## Educator view

`/educator.html` lists every relay drill saved in this browser: how many teams met the targets, a trend chart, a table of drills, each drill's record with its team debrief, and buttons to export a CSV, print, or clear the history. Press "Load sample data" to see it with example drills; sample data is never saved. Nothing on the page leaves the browser.

## Keyboard shortcuts

| Key | Action |
|---|---|
| Space | Start or restart |
| M | Voice on or off |
| B | Metronome on or off |
| D | Debug view |
| F | Fullscreen |

## Three ways to run a demo

| Source | Address | When to use it |
|---|---|---|
| Camera | `/` | The real thing: kneel side-on to the webcam over a firm pillow. |
| Recorded video | `/?video=/demo.mp4` | A known-good run that plays the same way every time. Arrives with Track A's task A6. |
| Simulator | `/?sim=1` | No camera and no person needed. Also the backup if the camera fails on stage. |

Settings you can add to the address:

- `&fatigue=1` makes the simulated compressor slip partway through a turn, so the app calls an early switch. Arrives with Track A's task A5.
- `?turnSeconds=20` shortens each relay turn for a quick demo. Arrives with Track B's task B5.
- The simulator also takes `cpm` (rate, default 110), `bend` (degrees of elbow bend), `lean` (degrees of arm lean), `recoil` (0 to 1) and `travel` (push size), for example `/?sim=1&cpm=90&bend=30`.

## The team

- **Track A, motion engine:** camera, body tracking, compression counting, form checks and the slipping signal.
- **Track B, coach and drill:** practice screen, relay drill, metronome, voice, score and leaderboard.
- **Track C, debrief and launch:** debrief for each compressor and the team, the public link and the pitch kit.
