// Practice-screen readouts, drawn from the engine's onState and onCompression.
// The state → label/colour mapping lives in small pure functions at the top so it can be tested.
import { config } from '../config.js';
import { PRACTICE } from '../copy.js';

/** Status colours map to the CSS variables --good, --warn, --bad. 'none' is muted. */

/**
 * @param {number|null} rate compressions per minute
 * @returns {{ text: string, label: string, status: 'good'|'warn'|'bad'|'none' }}
 */
export function rateView(rate, cfg = config) {
  if (rate === null || rate === undefined || !Number.isFinite(rate)) {
    return { text: PRACTICE.rateEmpty, label: '', status: 'none' };
  }
  const text = String(Math.round(rate));
  if (rate >= cfg.RATE_MIN && rate <= cfg.RATE_MAX) {
    return { text, label: PRACTICE.rateGood, status: 'good' };
  }
  const slow = rate < cfg.RATE_MIN;
  const distance = slow ? cfg.RATE_MIN - rate : rate - cfg.RATE_MAX;
  return {
    text,
    label: slow ? PRACTICE.rateSlow : PRACTICE.rateFast,
    status: distance <= cfg.RATE_WARN_MARGIN ? 'warn' : 'bad',
  };
}

/** Position of a value on the gauge as a percentage 0..100, clamped. */
export function gaugePercent(value, cfg = config) {
  const span = cfg.GAUGE_MAX - cfg.GAUGE_MIN;
  const pct = ((value - cfg.GAUGE_MIN) / span) * 100;
  return Math.min(100, Math.max(0, pct));
}

/** One chip per form check: green while clear, red while failing. */
export function chipViews(issues = {}) {
  return [
    { id: 'elbows', label: PRACTICE.chipElbows, status: issues.elbows ? 'bad' : 'good' },
    { id: 'position', label: PRACTICE.chipPosition, status: issues.position ? 'bad' : 'good' },
    { id: 'recoil', label: PRACTICE.chipRecoil, status: issues.recoil ? 'bad' : 'good' },
  ];
}

/**
 * The depth chip appears only once depth data exists: the engine reports a depth issue,
 * or compression events carry a depthCm.
 * @param {null|'shallow'|'deep'} depthIssue state.issues.depth
 * @param {number|null} lastDepthCm depthCm from the latest compression event
 */
export function depthView(depthIssue, lastDepthCm = null) {
  const hasCm = typeof lastDepthCm === 'number' && Number.isFinite(lastDepthCm);
  if (depthIssue == null && !hasCm) return { visible: false, label: PRACTICE.chipDepth, value: '', status: 'none' };
  if (depthIssue === 'shallow') return { visible: true, label: PRACTICE.chipDepth, value: PRACTICE.depthShallow, status: 'bad' };
  if (depthIssue === 'deep') return { visible: true, label: PRACTICE.chipDepth, value: PRACTICE.depthDeep, status: 'bad' };
  return { visible: true, label: PRACTICE.chipDepth, value: PRACTICE.depthGood, status: 'good' };
}

/** "Loading", "No person in view", or nothing. */
export function statusText(state) {
  if (!state || !state.ready) return PRACTICE.statusLoading;
  if (!state.personVisible) return PRACTICE.statusNoPerson;
  return '';
}

// ─── DOM ──────────────────────────────────────────────────────────────────

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * Builds the readout panel inside `root`.
 * @returns {{ update(state): void, compression(event): void, setCue(text: string): void, setError(text: string): void }}
 */
export function createHud(root, cfg = config) {
  const rateCard = el('section', 'hud-rate status-none');
  const rateHeading = el('div', 'hud-heading', PRACTICE.rateHeading);
  const rateRow = el('div', 'hud-rate-row');
  const rateNumber = el('div', 'hud-rate-number', PRACTICE.rateEmpty);
  const rateUnit = el('div', 'hud-rate-unit', PRACTICE.rateUnit);
  rateRow.append(rateNumber, rateUnit);
  const rateLabel = el('div', 'hud-rate-label', '');

  const gauge = el('div', 'hud-gauge');
  const band = el('div', 'hud-gauge-band');
  const bandLeft = gaugePercent(cfg.RATE_MIN, cfg);
  band.style.left = `${bandLeft}%`;
  band.style.width = `${gaugePercent(cfg.RATE_MAX, cfg) - bandLeft}%`;
  const marker = el('div', 'hud-gauge-marker');
  marker.hidden = true;
  gauge.append(band, marker);
  const gaugeCaption = el('div', 'hud-gauge-caption', PRACTICE.rateTarget);
  rateCard.append(rateHeading, rateRow, rateLabel, gauge, gaugeCaption);

  const counterCard = el('section', 'hud-counter');
  const counterHeading = el('div', 'hud-heading', PRACTICE.counterHeading);
  const counterNumber = el('div', 'hud-counter-number', '0');
  counterCard.append(counterHeading, counterNumber);

  const chips = el('section', 'hud-chips');
  const chipNodes = {};
  for (const view of chipViews({})) {
    const chip = el('div', `hud-chip status-${view.status}`, view.label);
    chip.dataset.check = view.id;
    chipNodes[view.id] = chip;
    chips.append(chip);
  }
  const depthChip = el('div', 'hud-chip hud-chip-depth status-none');
  depthChip.dataset.check = 'depth';
  depthChip.hidden = true;
  chips.append(depthChip);

  const cue = el('section', 'hud-cue');
  cue.setAttribute('aria-live', 'polite');
  const status = el('div', 'hud-status', PRACTICE.statusLoading);

  root.replaceChildren(rateCard, counterCard, chips, cue, status);

  let lastDepthCm = null;
  let lastDepthIssue = null;
  let shownCount = 0;

  function setStatusClass(node, s) {
    node.classList.remove('status-good', 'status-warn', 'status-bad', 'status-none');
    node.classList.add(`status-${s}`);
  }

  function renderDepth() {
    const view = depthView(lastDepthIssue, lastDepthCm);
    depthChip.hidden = !view.visible;
    if (!view.visible) return;
    depthChip.textContent = `${view.label}: ${view.value}`;
    setStatusClass(depthChip, view.status);
  }

  function pulse() {
    counterNumber.classList.remove('pulse');
    // Force a reflow so the animation restarts on every compression.
    void counterNumber.offsetWidth;
    counterNumber.classList.add('pulse');
  }

  return {
    update(state) {
      if (!state) return;
      const rv = rateView(state.rate, cfg);
      rateNumber.textContent = rv.text;
      rateLabel.textContent = rv.label;
      setStatusClass(rateCard, rv.status);
      if (rv.status === 'none') {
        marker.hidden = true;
      } else {
        marker.hidden = false;
        marker.style.left = `${gaugePercent(state.rate, cfg)}%`;
      }

      const count = state.compressions ?? 0;
      if (count !== shownCount) {
        shownCount = count;
        counterNumber.textContent = String(count);
      }

      for (const view of chipViews(state.issues || {})) setStatusClass(chipNodes[view.id], view.status);
      lastDepthIssue = state.issues ? state.issues.depth ?? null : null;
      renderDepth();

      status.textContent = statusText(state);
    },
    compression(event) {
      if (event && typeof event.depthCm === 'number') lastDepthCm = event.depthCm;
      shownCount += 1;
      counterNumber.textContent = String(shownCount);
      pulse();
      renderDepth();
    },
    setCue(text) {
      cue.textContent = text || '';
    },
    setError(text) {
      status.textContent = text || '';
    },
  };
}
