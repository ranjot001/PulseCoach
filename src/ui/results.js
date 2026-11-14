// Results screen: score, grade, breakdown bars, debrief card, name field and Try again.
import { config } from '../config.js';
import { RESULTS } from '../copy.js';
import { renderDebriefCard } from '../debrief/card.js';

/** Colour of a breakdown bar from its percentage. */
export function barStatus(pctValue, cfg = config) {
  if (pctValue >= cfg.RESULT_GOOD_PCT) return 'good';
  if (pctValue >= cfg.RESULT_WARN_PCT) return 'warn';
  return 'bad';
}

/** Colour of the score from its grade bands. */
export function scoreStatus(score, cfg = config) {
  if (score >= cfg.GRADE_BANDS.strong) return 'good';
  if (score >= cfg.GRADE_BANDS.gettingThere) return 'warn';
  return 'bad';
}

/** The rows of the breakdown: { id, label, pct, value, status }. Depth only when measured. */
export function breakdownRows(stats, cfg = config) {
  const rows = [
    { id: 'rate', label: RESULTS.rate, pct: stats.pctRateInRange, value: RESULTS.avgRate(stats.avgRate) },
    { id: 'elbows', label: RESULTS.elbows, pct: stats.pctElbowsLocked, value: `${stats.pctElbowsLocked}%` },
    { id: 'position', label: RESULTS.position, pct: stats.pctAligned, value: `${stats.pctAligned}%` },
    { id: 'recoil', label: RESULTS.recoil, pct: stats.pctRecoil, value: `${stats.pctRecoil}%` },
  ].map((r) => ({ ...r, status: barStatus(r.pct, cfg) }));
  if (typeof stats.avgDepthCm === 'number') {
    const lo = cfg.DEPTH_MIN_CM - cfg.DEPTH_TOLERANCE_CM;
    const hi = cfg.DEPTH_MAX_CM + cfg.DEPTH_TOLERANCE_CM;
    const d = stats.avgDepthCm;
    const scaleMax = cfg.DEPTH_MAX_CM + 2;
    rows.push({
      id: 'depth',
      label: RESULTS.depth,
      pct: Math.min(100, Math.round((d / scaleMax) * 100)),
      value: RESULTS.depthValue(d),
      status: d >= lo && d <= hi ? 'good' : 'bad',
    });
  }
  return rows;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * @param {HTMLElement} container
 * @param {object} stats Contract 2 stats
 * @param {{ onSave: (name: string) => void, onRetry: () => void }} opts
 * @returns {{ leaderboardSlot: HTMLElement, nameInput: HTMLInputElement }}
 */
export function renderResults(container, stats, { onSave, onRetry }) {
  // Left: score and breakdown
  const left = el('section', 'results-main');
  const scoreBox = el('div', `results-score status-${scoreStatus(stats.score)}`);
  scoreBox.append(el('div', 'hud-heading', RESULTS.scoreHeading), el('div', 'results-score-number', String(stats.score)), el('div', 'results-grade', stats.grade));
  const meta = el('div', 'results-meta', `${RESULTS.compressions(stats.compressions)} · ${RESULTS.trend[stats.rateTrend] ?? ''}`);

  const bars = el('div', 'results-bars');
  for (const row of breakdownRows(stats)) {
    const r = el('div', `results-bar status-${row.status}`);
    r.dataset.row = row.id;
    const fill = el('div', 'results-bar-fill');
    fill.style.width = `${Math.max(0, Math.min(100, row.pct))}%`;
    const track = el('div', 'results-bar-track');
    track.append(fill);
    r.append(el('div', 'results-bar-label', row.label), track, el('div', 'results-bar-value', row.value));
    bars.append(r);
  }
  left.append(scoreBox, meta, bars);

  // Right: debrief, save, leaderboard, try again
  const right = el('section', 'results-side');
  const debrief = el('div', 'results-debrief');
  renderDebriefCard(debrief, stats);

  const form = el('form', 'results-save');
  const label = el('label', 'sr-only', RESULTS.nameLabel);
  label.htmlFor = 'results-name';
  const input = document.createElement('input');
  input.id = 'results-name';
  input.className = 'results-name';
  input.type = 'text';
  input.maxLength = config.NAME_MAX_CHARS;
  input.placeholder = RESULTS.namePlaceholder;
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

  right.append(debrief, form, leaderboardSlot, actions);
  container.replaceChildren(left, right);
  return { leaderboardSlot, nameInput: input };
}
