// Results screen: score, grade, breakdown bars, debrief card, name field and Try again.
import { config } from '../config.js';
import { RESULTS, RELAY_RESULTS } from '../copy.js';
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

const RING_R = 88;
const RING_C = 2 * Math.PI * RING_R;

/** Stroke offset that leaves `score` percent of the ring filled. */
export function ringOffset(score) {
  return RING_C * (1 - Math.max(0, Math.min(100, score)) / 100);
}

/** Score card: label, a ring that fills to the score over 600 ms, the number inside, the grade. */
export function scoreCard(heading, score, grade) {
  const status = scoreStatus(score);
  const card = el('section', `card results-score status-${status}`);
  const ring = el('div', 'score-ring');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 208 208');
  svg.setAttribute('aria-hidden', 'true');
  for (const cls of ['ring-track', 'ring-value']) {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', '104');
    c.setAttribute('cy', '104');
    c.setAttribute('r', String(RING_R));
    c.setAttribute('class', cls);
    if (cls === 'ring-value') {
      c.style.strokeDasharray = String(RING_C);
      c.style.strokeDashoffset = String(RING_C);
      const fill = () => (c.style.strokeDashoffset = String(ringOffset(score)));
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(fill));
      else fill();
    }
    svg.append(c);
  }
  ring.append(svg, el('div', `num results-score-number${String(score).length > 2 ? ' is-long' : ''}`, String(score)));
  card.append(el('div', 'label', heading), ring, el('div', 'results-grade', grade));
  return card;
}

/** "Save to the team board": a name field and the green Save button. */
export function saveCard({ id, placeholder, srLabel, onSave }) {
  const card = el('section', 'card results-save-card');
  const form = el('form', 'results-save');
  const label = el('label', 'sr-only', srLabel);
  label.htmlFor = id;
  const input = document.createElement('input');
  input.id = id;
  input.className = 'results-name';
  input.type = 'text';
  input.maxLength = config.NAME_MAX_CHARS;
  input.placeholder = placeholder;
  input.autocomplete = 'off';
  const save = el('button', 'btn btn-primary btn-save', RESULTS.save);
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
  card.append(el('div', 'label', RELAY_RESULTS.saveHeading), form);
  return { card, input };
}

/** The quiet "Run it again · Space" button. */
export function runAgainButton(onRetry) {
  const retry = el('button', 'btn btn-secondary btn-again', RELAY_RESULTS.runAgain);
  retry.type = 'button';
  retry.dataset.action = 'retry';
  retry.addEventListener('click', () => onRetry());
  return retry;
}

/**
 * Solo results, in three columns: score, save, run again and the board; the breakdown; the debrief.
 * @param {HTMLElement} container
 * @param {object} stats Contract 2 stats
 * @param {{ onSave: (name: string) => void, onRetry: () => void }} opts
 * @returns {{ leaderboardSlot: HTMLElement, nameInput: HTMLInputElement }}
 */
export function renderResults(container, stats, { onSave, onRetry }) {
  const left = el('section', 'results-col results-score-col');
  const { card: save, input } = saveCard({ id: 'results-name', placeholder: RESULTS.namePlaceholder, srLabel: RESULTS.nameLabel, onSave });
  const leaderboardSlot = el('div', 'card results-leaderboard');
  left.append(scoreCard(RESULTS.scoreHeading, stats.score, stats.grade), save, runAgainButton(onRetry), leaderboardSlot);

  const middle = el('section', 'results-col results-main');
  const breakdown = el('section', 'card results-breakdown');
  const meta = el('div', 'results-meta', `${RESULTS.compressions(stats.compressions)} · ${RESULTS.trend[stats.rateTrend] ?? ''}`);
  const bars = el('div', 'results-bars');
  for (const row of breakdownRows(stats)) {
    const r = el('div', `results-bar status-${row.status}`);
    r.dataset.row = row.id;
    const fill = el('i', 'meter-fill results-bar-fill');
    fill.style.width = `${Math.max(0, Math.min(100, row.pct))}%`;
    const track = el('div', 'meter results-bar-track');
    track.append(fill);
    r.append(el('div', 'results-bar-label', row.label), track, el('div', 'num results-bar-value', row.value));
    bars.append(r);
  }
  breakdown.append(el('div', 'label', RESULTS.breakdownHeading), meta, bars);
  middle.append(breakdown);

  const right = el('section', 'results-col results-side');
  const debrief = el('div', 'results-debrief');
  renderDebriefCard(debrief, stats);
  right.append(debrief);

  container.replaceChildren(left, middle, right);
  return { leaderboardSlot, nameInput: input };
}
