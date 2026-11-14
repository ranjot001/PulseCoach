# Track A progress

## 00 Scaffold (on `main`)

- Built: Vite + Vitest project, `src/config.js` (CLAUDE.md starting values, no changes), colours in `src/styles.css`, `src/copy.js`, fake engine in `src/engine.js` (Contract 1), stand-in `src/debrief/card.js` (Contract 3), fixtures `tests/fixtures/stats.js` and `tests/fixtures/events.js` (Contract 2), minimal `index.html`/`src/main.js`, `dev/stage.html`, `dev/debrief.html`.
- `createEngine` also accepts optional `timers` ({ setInterval, clearInterval, now }) and `search` (query string) for tests. Both default to the browser's own.
- Fake engine defaults: bend 5, lean 3, recoil 0.95, travel 0.1. `bend>=20`, `lean>=20`, `recoil<0.85` set the matching issue. `depthCm` is null.
- `makeEvents` also takes an optional `depthCm` (default null) for depth-score tests.
- Human checks still to do: open `/?sim=1` (count climbs, rate about 110); add `&bend=30` (elbows true); tell the team the scaffold is on `main`.
