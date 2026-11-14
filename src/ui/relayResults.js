// Relay results: team score, compression fraction, switch pauses, one column per turn,
// the debrief card, a team name field, the leaderboard and Try again.
import { config } from '../config.js';
import { RELAY, RELAY_RESULTS as T } from '../copy.js';
import { renderDebriefCard } from '../debrief/card.js';
import { scoreStatus, scoreCard, saveCard, runAgainButton } from './results.js';

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
 * Relay results in three columns: team score, save, run again and the board; on the chest and
 * each switch (with room for the timeline, task B8); one card per compressor, then the debrief.
 * @param {HTMLElement} container
 * @param {object} stats relay stats (Contract 2)
 * @param {{ onSave: (name: string) => void, onRetry: () => void, pauses?: {sec: number, early: boolean}[] }} opts
 * @returns {{ leaderboardSlot: HTMLElement, nameInput: HTMLInputElement, timelineSlot: HTMLElement }}
 */
export function renderRelayResults(container, stats, { onSave, onRetry, pauses = null }) {
  const cfg = config;

  const left = el('section', 'results-col results-score-col');
  const { card: save, input } = saveCard({ id: 'relay-team-name', placeholder: T.teamNamePlaceholder, srLabel: T.teamNameLabel, onSave });
  const leaderboardSlot = el('div', 'card results-leaderboard');
  left.append(scoreCard(T.teamScore, stats.score, stats.grade), save, runAgainButton(onRetry), leaderboardSlot);

  const middle = el('section', 'results-col relay-middle');
  const pair = el('div', 'relay-pair');
  const ccf = el('section', `card relay-ccf status-${ccfStatus(stats.compressionFraction, cfg)}`);
  const ccfLine = el('div', 'relay-ccf-line');
  ccfLine.append(el('div', 'num relay-ccf-number', T.ccfValue(stats.compressionFraction)), el('small', 'relay-ccf-hint', T.ccfHint(cfg.CCF_TARGET)));
  const ccfTrack = el('div', 'meter relay-ccf-track');
  const ccfFill = el('i', 'meter-fill relay-ccf-fill');
  ccfFill.style.width = `${Math.max(0, Math.min(100, stats.compressionFraction))}%`;
  const ccfMark = el('span', 'meter-tick relay-ccf-target');
  ccfMark.style.left = `${cfg.CCF_TARGET}%`;
  ccfTrack.append(ccfFill, ccfMark);
  ccf.append(el('div', 'label', T.ccfHeading), ccfLine, ccfTrack);

  const switches = el('div', 'relay-switches');
  const rows = switchRows(stats, pauses, cfg);
  if (rows.length === 0) {
    const none = el('section', 'card relay-switch-none');
    none.append(el('div', 'label', T.switchesHeading), el('div', 'relay-note', T.noSwitches));
    switches.append(none);
  }
  for (const row of rows) {
    const card = el('section', `card relay-switch status-${row.status}`);
    const line = el('div', 'relay-switch-line');
    const sec = el('span', 'num relay-switch-sec', T.pauseNumber(row.sec));
    sec.append(el('small', 'relay-switch-unit', T.pauseUnit));
    line.append(sec);
    if (row.early) line.append(el('span', 'tag tag-warn relay-early', T.earlyTag));
    card.append(el('div', 'label relay-switch-label', row.label), line, el('div', 'relay-note', row.early ? T.earlyNote(cfg.PAUSE_MAX_SEC) : T.switchNote(cfg.PAUSE_MAX_SEC)));
    switches.append(card);
  }
  pair.append(ccf, switches);
  const longest = el('div', 'relay-longest', T.longestPause(stats.longestPauseSec ?? 0));
  const timelineSlot = el('div', 'relay-timeline-slot');
  middle.append(pair, longest, timelineSlot);

  const right = el('section', 'results-col relay-right');
  for (const [i, turn] of (stats.turns || []).entries()) {
    const card = el('section', 'card relay-turn');
    card.dataset.turn = String(i + 1);
    const slip = turnSlipLine(turn);
    card.append(
      el('h3', 'relay-turn-title', T.compressor(turn.compressor)),
      el('div', `num relay-turn-score status-${scoreStatus(turn.score)}`, String(turn.score)),
      el('div', 'relay-turn-stats', T.turnStats(turn.compressions, turn.avgRate, clockTime(turn.durationSec))),
      el('div', `relay-turn-slip status-${slip.status}`, slip.text),
    );
    right.append(card);
  }
  const debrief = el('div', 'results-debrief');
  renderDebriefCard(debrief, stats);
  right.append(debrief);

  container.replaceChildren(left, middle, right);
  return { leaderboardSlot, nameInput: input, timelineSlot };
}
