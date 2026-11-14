// Practice-screen readouts, drawn from the engine's onState and onCompression.
// The state → label/colour mapping lives in small pure functions at the top so it can be tested.
import { config } from '../config.js';
import { PRACTICE, RELAY } from '../copy.js';

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

/**
 * The "Slipping" chip: shown while the engine says this compressor is slipping,
 * naming the signs in plain words. A missing `fatigue` (engine before A5) means not slipping.
 */
export function slipView(fatigue) {
  if (!fatigue || !fatigue.slipping) return { visible: false, text: '' };
  const words = (fatigue.signs || []).map((s) => RELAY.signs[s]).filter(Boolean);
  return { visible: true, text: words.length ? `${RELAY.slipping}: ${words.join(', ')}` : RELAY.slipping };
}

/** Pause timer colour: green, amber after PAUSE_WARN_SEC, red after PAUSE_MAX_SEC. */
export function pauseStatus(sec, cfg = config) {
  if (sec >= cfg.PAUSE_MAX_SEC) return 'bad';
  if (sec >= cfg.PAUSE_WARN_SEC) return 'warn';
  return 'good';
}

/** The line under the pause timer for a relay view. */
export function switchMessage(view) {
  if (view.phase === 'rhythmCheck') return RELAY.rhythmHandsOff;
  if (view.phase === 'resume') return RELAY.switchNow(view.compressor);
  return '';
}

/**
 * A title in two parts, as in the top bar: "Compressor 1" large, "Turn 1 of 2" smaller.
 * The text reads as one line ("Compressor 1 · Turn 1 of 2") for screen readers and tests.
 */
export function setTitle(node, main, sub = '') {
  const parts = [el('span', 'title-main', main)];
  if (sub) parts.push(el('span', 'title-sep', ' · '), el('span', 'title-sub', sub));
  node.replaceChildren(...parts);
}

/** "Compressor 1 · Turn 1 of 2" in the top bar. */
export function setTurnTitle(node, compressor, turn, turns) {
  const [main, sub] = RELAY.turnLabel(compressor, turn, turns).split(' · ');
  setTitle(node, main, sub);
}

/** Width of the pause bar: the scale runs to two seconds past PAUSE_MAX_SEC. */
export function pauseScaleEnd(cfg = config) {
  return cfg.PAUSE_MAX_SEC + 2;
}

/**
 * Full-width switch overlay: "Hands-off time", a huge pause timer, a bar with the
 * PAUSE_WARN_SEC and PAUSE_MAX_SEC ticks, then the instruction.
 * @returns {{ update(view): void, hide(): void }}
 */
export function createSwitchOverlay(root, cfg = config) {
  const end = pauseScaleEnd(cfg);
  const inner = el('div', 'switch-inner');
  const label = el('div', 'label switch-label', RELAY.handsOffHeading);
  const timer = el('div', 'switch-timer num status-good');
  const timerValue = document.createTextNode(RELAY.pauseNumber(0));
  timer.append(timerValue, el('small', 'switch-unit', RELAY.pauseUnit));
  const pause = el('div', 'switch-pause status-good');
  const track = el('div', 'meter switch-track');
  const fill = el('i', 'meter-fill');
  fill.style.width = '0%';
  track.append(fill);
  for (const sec of [cfg.PAUSE_WARN_SEC, cfg.PAUSE_MAX_SEC]) {
    const tick = el('span', 'meter-tick');
    tick.style.left = `${(sec / end) * 100}%`;
    track.append(tick);
  }
  const marks = el('div', 'switch-marks');
  for (const [i, text] of RELAY.pauseMarks(cfg.PAUSE_WARN_SEC, cfg.PAUSE_MAX_SEC, end).entries()) {
    const m = el('span', '', text);
    if (i === 1 || i === 2) m.style.left = `${((i === 1 ? cfg.PAUSE_WARN_SEC : cfg.PAUSE_MAX_SEC) / end) * 100}%`;
    m.className = i === 0 ? 'mark-start' : i === 3 ? 'mark-end' : 'mark-tick';
    marks.append(m);
  }
  pause.append(track, marks);
  const message = el('div', 'switch-text', '');
  inner.append(label, timer, pause, message);
  root.replaceChildren(inner);
  root.hidden = true;
  let lastStatus = 'good';
  let lastMessage = null;

  return {
    update(view) {
      const switching = view.phase === 'rhythmCheck' || view.phase === 'resume';
      root.hidden = !switching;
      document.body?.classList.toggle('is-switching', switching);
      if (!switching) {
        lastStatus = 'good';
        return;
      }
      const status = pauseStatus(view.pauseSec, cfg);
      timerValue.textContent = RELAY.pauseNumber(view.pauseSec);
      for (const s of ['good', 'warn', 'bad']) {
        timer.classList.toggle(`status-${s}`, s === status);
        pause.classList.toggle(`status-${s}`, s === status);
      }
      // Pulse once as the pause turns red.
      if (status === 'bad' && lastStatus !== 'bad') {
        timer.classList.remove('pulse-once');
        void timer.offsetWidth;
        timer.classList.add('pulse-once');
      }
      lastStatus = status;
      fill.style.width = `${Math.min(100, (view.pauseSec / end) * 100)}%`;
      const key = `${view.phase}:${view.compressor}`;
      if (key !== lastMessage) {
        lastMessage = key;
        if (view.phase === 'resume') {
          message.replaceChildren(
            document.createTextNode(RELAY.switchLead),
            el('span', 'switch-who', RELAY.switchWho(view.compressor)),
            document.createTextNode(RELAY.switchTail),
          );
        } else {
          message.textContent = switchMessage(view);
        }
      }
    },
    hide() {
      root.hidden = true;
      document.body?.classList.remove('is-switching');
    },
  };
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
  const rateCard = el('section', 'card hud-rate status-none');
  const rateHeading = el('div', 'label hud-heading', PRACTICE.rateHeading);
  const rateRow = el('div', 'hud-rate-row');
  const rateNumber = el('div', 'num hud-rate-number', PRACTICE.rateEmpty);
  const rateSay = el('div', 'hud-rate-say');
  const rateLabel = el('div', 'hud-rate-label', '');
  rateSay.append(rateLabel, el('div', 'hud-rate-unit', PRACTICE.rateSub));
  rateRow.append(rateNumber, rateSay);

  const gauge = el('div', 'meter hud-gauge');
  const band = el('div', 'hud-gauge-band');
  const bandLeft = gaugePercent(cfg.RATE_MIN, cfg);
  band.style.left = `${bandLeft}%`;
  band.style.width = `${gaugePercent(cfg.RATE_MAX, cfg) - bandLeft}%`;
  const marker = el('div', 'hud-gauge-marker');
  marker.hidden = true;
  gauge.append(band, marker);
  rateCard.append(rateHeading, rateRow, gauge);

  // The second slot of this row is for the live "On the chest" card (task B9).
  const duo = el('div', 'hud-duo');
  const counterCard = el('section', 'card hud-counter');
  const counterHeading = el('div', 'label hud-heading', PRACTICE.counterHeading);
  const counterNumber = el('div', 'num hud-counter-number', '0');
  counterCard.append(counterHeading, counterNumber);
  duo.append(counterCard);

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
  const slipChip = el('div', 'hud-chip hud-chip-slip status-warn', RELAY.slipping);
  slipChip.dataset.check = 'slipping';
  slipChip.hidden = true;
  chips.append(slipChip);

  const cue = el('section', 'hud-cue status-none');
  cue.setAttribute('aria-live', 'polite');
  const status = el('div', 'hud-status', PRACTICE.statusLoading);

  root.replaceChildren(rateCard, duo, chips, status, cue);

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
      const slip = slipView(state.fatigue);
      slipChip.hidden = !slip.visible;
      if (slip.visible) slipChip.textContent = slip.text;

      status.textContent = statusText(state);
    },
    compression(event) {
      if (event && typeof event.depthCm === 'number') lastDepthCm = event.depthCm;
      shownCount += 1;
      counterNumber.textContent = String(shownCount);
      pulse();
      renderDepth();
    },
    /** Show a coaching cue; status colours it ('warn' for a fix, 'good' for praise). */
    setCue(text, cueStatus = 'warn') {
      cue.textContent = text || '';
      setStatusClass(cue, text ? cueStatus : 'none');
    },
    setError(text) {
      status.textContent = text || '';
    },
  };
}
