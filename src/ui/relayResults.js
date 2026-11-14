// Relay results: team score, compression fraction, switch pauses, one column per turn,
// the debrief card, a team name field, the leaderboard and Try again.
import { config } from '../config.js';
import { RESULTS, RELAY, RELAY_RESULTS as T } from '../copy.js';
import { renderDebriefCard } from '../debrief/card.js';
import { scoreStatus } from './results.js';

/** Green at or above CCF_TARGET, amber at or above CCF_MIN, red below. */
export function ccfStatus(pct, cfg = config) {
  if (pct >= cfg.CCF_TARGET) return 'good';
  if (pct >= cfg.CCF_MIN) return 'warn';
  return 'bad';
}

/** Green up to PAUSE_WARN_SEC, amber up to PAUSE_MAX_SEC, red above. */
export function switchStatus(sec, cfg = config) {
  if (sec <= cfg.PAUSE_WARN_SEC) return 'good';
  if (sec <= cfg.PAUSE_MAX_SEC) return 'warn';
  return 'bad';
}

/** Seconds as m:ss. */
export function clockTime(sec) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * One row per switch. With the page's own list of pauses ({ sec, early }) each switch is exact;
 * from stats alone (Contract 2 has only the average), one switch is exact and several show the average.
 */
export function switchRows(stats, pauses = null, cfg = config) {
  if (Array.isArray(pauses) && pauses.length > 0) {
    return pauses.map((p, i) => ({ label: T.switchLabel(i + 1), sec: p.sec, early: p.early, status: switchStatus(p.sec, cfg) }));
  }
  if (!stats.switches || stats.avgSwitchSec === null || stats.avgSwitchSec === undefined) return [];
  const label = stats.switches === 1 ? T.switchLabel(1) : T.switchAverage;
  return [{ label, sec: stats.avgSwitchSec, early: stats.earlySwitches > 0, status: switchStatus(stats.avgSwitchSec, cfg) }];
}

/** The slipping line for a turn. */
export function turnSlipLine(turn) {
  if (turn.slippedAtSec === null || turn.slippedAtSec === undefined) return { text: T.heldForm, status: 'good' };
  const signs = (turn.signs || []).map((s) => RELAY.signs[s]).filter(Boolean).join(', ');
  return { text: T.slippedAt(clockTime(turn.slippedAtSec), signs), status: 'warn' };
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * @param {HTMLElement} container
 * @param {object} stats relay stats (Contract 2)
 * @param {{ onSave: (name: string) => void, onRetry: () => void, pauses?: {sec: number, early: boolean}[] }} opts
 * @returns {{ leaderboardSlot: HTMLElement, nameInput: HTMLInputElement }}
 */
export function renderRelayResults(container, stats, { onSave, onRetry, pauses = null }) {
  const cfg = config;

  // Column 1: team score, compression fraction, switches
  const main = el('section', 'relay-main');
  const scoreBox = el('div', `results-score status-${scoreStatus(stats.score)}`);
  scoreBox.append(el('div', 'hud-heading', T.teamScore), el('div', 'results-score-number', String(stats.score)), el('div', 'results-grade', stats.grade));

  const ccf = el('div', `relay-ccf status-${ccfStatus(stats.compressionFraction, cfg)}`);
  const ccfTrack = el('div', 'relay-ccf-track');
  const ccfFill = el('div', 'relay-ccf-fill');
  ccfFill.style.width = `${Math.max(0, Math.min(100, stats.compressionFraction))}%`;
  const ccfMark = el('div', 'relay-ccf-target');
  ccfMark.style.left = `${cfg.CCF_TARGET}%`;
  ccfTrack.append(ccfFill, ccfMark);
  ccf.append(
    el('div', 'hud-heading', T.ccfHeading),
    el('div', 'relay-ccf-number', T.ccfValue(stats.compressionFraction)),
    ccfTrack,
    el('div', 'relay-ccf-hint', T.ccfHint(cfg.CCF_TARGET)),
  );

  const switches = el('div', 'relay-switches');
  switches.append(el('div', 'hud-heading', T.switchesHeading));
  const rows = switchRows(stats, pauses, cfg);
  if (rows.length === 0) switches.append(el('div', 'relay-switch-none', T.noSwitches));
  for (const row of rows) {
    const r = el('div', `relay-switch status-${row.status}`);
    r.append(el('span', 'relay-switch-label', row.label), el('span', 'relay-switch-sec', T.pauseValue(row.sec)));
    if (row.early) r.append(el('span', 'relay-early', T.earlyTag));
    switches.append(r);
  }
  switches.append(el('div', 'relay-longest', T.longestPause(stats.longestPauseSec ?? 0)));
  main.append(scoreBox, ccf, switches);

  // Column 2: one column per turn, then the debrief
  const middle = el('section', 'relay-middle');
  const turns = el('div', 'relay-turns');
  for (const [i, turn] of (stats.turns || []).entries()) {
    const col = el('div', 'relay-turn');
    col.dataset.turn = String(i + 1);
    const slip = turnSlipLine(turn);
    const slipLine = el('div', `relay-turn-slip status-${slip.status}`, slip.text);
    col.append(
      el('div', 'relay-turn-title', T.compressor(turn.compressor)),
      el('div', 'relay-turn-stats', T.turnStats(turn.compressions, turn.avgRate)),
      el('div', `relay-turn-score status-${scoreStatus(turn.score)}`, T.turnScore(turn.score)),
      slipLine,
    );
    turns.append(col);
  }
  const debrief = el('div', 'results-debrief');
  renderDebriefCard(debrief, stats);
  middle.append(turns, debrief);

  // Column 3: team name, leaderboard, Try again
  const side = el('section', 'results-side relay-side');
  const form = el('form', 'results-save');
  const label = el('label', 'sr-only', T.teamNameLabel);
  label.htmlFor = 'relay-team-name';
  const input = document.createElement('input');
  input.id = 'relay-team-name';
  input.className = 'results-name';
  input.type = 'text';
  input.maxLength = cfg.NAME_MAX_CHARS;
  input.placeholder = T.teamNamePlaceholder;
  input.autocomplete = 'off';
  const save = el('button', 'btn', RESULTS.save);
  save.type = 'submit';
  form.append(label, input, save);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (save.disabled) return;
    onSave(input.value);
    save.disabled = true;
    input.disabled = true;
    save.textContent = RESULTS.saved;
  });
  const leaderboardSlot = el('div', 'results-leaderboard');
  const retry = el('button', 'btn btn-primary', RESULTS.tryAgain);
  retry.type = 'button';
  retry.addEventListener('click', () => onRetry());
  const actions = el('div', 'actions');
  actions.append(retry, el('span', 'hint', RESULTS.tryAgainHint));
  side.append(form, leaderboardSlot, actions);

  container.replaceChildren(main, middle, side);
  return { leaderboardSlot, nameInput: input };
}
