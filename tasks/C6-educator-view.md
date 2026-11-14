# C6: Educator view and drill record

**Track:** C · Debrief and launch · **Branch:** `track-c` · **Time budget:** 40 min · **Priority:** Should-have
**Needs on main:** C4 (build against `tests/fixtures/history.js`; Track B's history is not needed)

## Goal

```
Complete tasks/C6-educator-view.md. Done means every item under "Done when" is verified with evidence, and npm test and npm run build both pass in the final output.
```

Read `CLAUDE.md` first, especially Contract 4 and "Colours and design tokens". Work on branch `track-c` and touch only Track C files.

## What to build

The page a nurse educator would open: every drill a unit has run, whether the team met the targets, and a record that can be printed or exported. It answers the judges' question "who would use this, and how would they know it works?"

- **`educator.html`** in the repository root, with its code in `src/educator/`. Add it to the build as a second page in `vite.config.js`, so `npm run build` puts it in `dist/`.
- **Data.** Read the drill history of Contract 4 from `localStorage`. Check every entry with `validateRelayStats` and skip any that fail. The page never throws on bad or missing data.
- **`src/educator/summary.js`.** Pure logic:
  - `summariseHistory(entries, config)` returns:
    - the number of drills,
    - how many met `CCF_TARGET`,
    - the number of switches and how many took `PAUSE_MAX_SEC` or less (a switch's time is the drill's `avgSwitchSec` when it has one switch; for more, use `longestPauseSec` as the worst case),
    - how many turns slipped,
    - the median `slippedAtSec` of those turns, or `null`.
  - `toCsv(entries)` returns one row per drill: date, time, team, score, grade, on the chest %, switches, early switches, average switch seconds, longest pause seconds, and each compressor's score and slipping time.
    - Quote every cell and double any quote inside it.
    - Team names are typed by users. If a cell starts with `=`, `+`, `-` or `@`, put a single quote in front of it so a spreadsheet does not run it as a formula.
- **The page.**
  - A heading, "Educator view", and a link back to the drill.
  - **Four tiles:** drills run; teams that met 80% on the chest; switches under 10 seconds; typical time before slipping began.
  - **Trend:** a small inline SVG chart of "on the chest" for each drill in time order, with a line at 80%.
  - **Table:** newest first. Date and time, team, score, on the chest, slowest switch, early switches, and when each compressor slipped. Colour the numbers with the status tokens, using the same limits as the results screen.
  - **One drill.** Selecting a row shows that drill's record: the numbers, each compressor's turn, and the quick-tips team debrief from `fallbackRelayDebrief`.
  - **Buttons:** "Export CSV" (a download built in the browser), "Print", and "Clear history" (asks first).
  - **Sample data.** When there is no history, show "No drills saved yet" and a "Load sample data" button. Sample data comes from a copy of the fixture kept in `src/educator/sample.js`. While it is showing, a banner across the top reads "Sample data, not real drills". Sample data is never written to storage.
  - **Empty or failing storage** shows the same empty state.
- **Print.** A print stylesheet: white background, dark text, no buttons. The printed page ends with "Practice record for adult hands-only CPR. Not a certification."
- **Look.** Use the design tokens with the fallback values in `CLAUDE.md`, and the same cards, labels and big numbers as `tasks/design/relay-mock.png`. Team names are set with `textContent`.
- **Debrief card.** Restyle `src/debrief/card.css` with the same tokens so it matches the card on screen 4 of the mock.

## Done when

- [ ] `npm run check` passes, including new tests:
  - `summariseHistory` on `sampleHistory` gives the numbers you calculate by hand, and on `[]` gives zeros and `null`.
  - `toCsv` has one header row and one row per drill. A team named `=1+1` is neutralised, and a team named `Ward "4B", north` stays in one cell.
  - The page in jsdom: with the fixture in storage it shows one table row per entry; a corrupt entry is skipped; a team name `<b>x</b>` shows as literal text; with empty storage it shows the empty state; "Load sample data" shows the banner and writes nothing to storage.
- [ ] `npm run build` output contains `educator.html`. Show it in the listing.
- [ ] With `npm run dev` or `npm run preview`, `/educator.html` returns 200.
- [ ] No file outside Track C's list was changed.
- [ ] `progress/track-c.md` updated, with a note to Track B that the page exists, so B8 can link to it.

## Human check

- Open `/educator.html` and press "Load sample data". The tiles, chart and table make sense at a glance, and the banner is clear.
- Once Track B's B8 is on `main`, run a drill, save a team name, and open the page. The drill is there.
- Press "Export CSV" and open the file. Press "Print" and look at the preview.
- Then say "ship it".

## Out of scope

Accounts, logins, or sending data anywhere. Everything stays in this browser.
