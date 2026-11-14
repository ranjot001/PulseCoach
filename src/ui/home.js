// Home screen (setup checklist, shortcut legend, leaderboard, Start), the keyboard
// shortcut map, and the camera error screen. Mapping logic is in small pure functions.
import { PRODUCT_NAME, HOME, SETUP, SHORTCUT_LEGEND, ERRORS, RELAY } from '../copy.js';

// ─── Pure mappings ────────────────────────────────────────────────────────

/**
 * What the setup checklist shows for `state.setup`.
 * Empty checks (no setup task yet): checklist hidden, Start enabled.
 */
export function checklistView(setup) {
  const checks = Array.isArray(setup?.checks) ? setup.checks : [];
  if (checks.length === 0) return { visible: false, ok: true, startEnabled: true, showStartAnyway: false, items: [] };
  const ok = Boolean(setup.ok);
  return {
    visible: true,
    ok,
    startEnabled: ok,
    showStartAnyway: !ok,
    items: checks.map((c) => ({
      id: c.id,
      label: SETUP.labels[c.id] ?? String(c.id),
      pass: Boolean(c.pass),
      hint: c.pass ? null : c.hint || null,
    })),
  };
}

/** Keyboard shortcuts, in legend order. */
export const SHORTCUTS = [
  { key: 'Space', action: 'start', label: SHORTCUT_LEGEND.start },
  { key: 'M', action: 'mute', label: SHORTCUT_LEGEND.mute },
  { key: 'B', action: 'metronome', label: SHORTCUT_LEGEND.metronome },
  { key: 'D', action: 'debug', label: SHORTCUT_LEGEND.debug },
  { key: 'F', action: 'fullscreen', label: SHORTCUT_LEGEND.fullscreen },
];

const LETTER_ACTIONS = { m: 'mute', b: 'metronome', d: 'debug', f: 'fullscreen' };

/**
 * The action for a keydown, or null. Ignores repeats, modifier combinations and typing in a field.
 * @param {{ key: string, code?: string, repeat?: boolean, ctrlKey?: boolean, metaKey?: boolean, altKey?: boolean, target?: any }} e
 */
export function shortcutAction(e) {
  if (!e || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return null;
  const t = e.target;
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || ''))) return null;
  if (e.code === 'Space' || e.key === ' ') return 'start';
  return LETTER_ACTIONS[String(e.key || '').toLowerCase()] ?? null;
}

/** Message for an engine error code. */
export function errorView(code) {
  const m = ERRORS[code] && ERRORS[code].title ? ERRORS[code] : ERRORS.unknown;
  return { title: m.title, body: m.body };
}

/** The same address with ?sim=1, for the "Run simulator" button. */
export function simulatorUrl(href) {
  const url = new URL(href);
  url.searchParams.delete('video');
  url.searchParams.set('sim', '1');
  return url.toString();
}

// ─── DOM ──────────────────────────────────────────────────────────────────

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function shortcutLegend() {
  const wrap = el('section', 'shortcuts');
  wrap.append(el('h2', 'label shortcuts-heading', SHORTCUT_LEGEND.heading));
  const dl = el('dl', 'shortcuts-list');
  for (const s of SHORTCUTS) {
    const row = el('div', 'shortcut');
    row.append(el('dt', 'kbd', s.key), el('dd', '', s.label));
    dl.append(row);
  }
  wrap.append(dl);
  return wrap;
}

/**
 * Home: the pitch on the left (headline, starts, fact tiles, three steps), the setup
 * checklist and the team board on the right.
 * @param {HTMLElement} container
 * @param {{ onStart: () => void, onSolo?: () => void }} opts  onStart runs the relay drill
 * @returns {{ leaderboardSlot: HTMLElement, updateSetup(setup: object): void }}
 */
export function renderHome(container, { onStart, onSolo }) {
  const intro = el('section', 'home-intro');
  const eyebrow = el('div', 'eyebrow', HOME.eyebrow);
  const h = el('h2', 'home-title');
  h.setAttribute('aria-label', `${PRODUCT_NAME}: ${HOME.headline.join(' ')}`);
  for (const line of HOME.headline) h.append(el('span', 'home-title-line', line));
  const lede = el('p', 'home-lede', HOME.lede);

  const start = el('button', 'btn btn-primary btn-cta', RELAY.startRelay);
  start.type = 'button';
  start.dataset.action = 'relay';
  start.dataset.key = HOME.spaceKey;
  start.addEventListener('click', () => onStart());
  const solo = el('button', 'btn btn-secondary btn-cta', RELAY.startSolo);
  solo.type = 'button';
  solo.dataset.action = 'solo';
  solo.addEventListener('click', () => (onSolo || onStart)());
  const startAnyway = el('button', 'link-button', SETUP.startAnyway);
  startAnyway.type = 'button';
  startAnyway.hidden = true;
  startAnyway.addEventListener('click', () => onStart());
  const actions = el('div', 'actions home-cta');
  actions.append(start, solo, startAnyway);

  const facts = el('div', 'facts');
  for (const f of HOME.facts) {
    const fact = el('div', 'fact');
    fact.append(el('div', 'num fact-value', f.value), el('p', 'fact-text', f.text));
    facts.append(fact);
  }
  const sources = el('p', 'fact-sources', HOME.factSources);

  const steps = el('ol', 'steps');
  for (const [i, step] of HOME.steps.entries()) {
    const li = el('li', 'step');
    const body = el('span', 'step-body');
    body.append(el('strong', '', step.title), document.createTextNode(` ${step.text}`));
    li.append(el('b', 'step-num', String(i + 1)), body);
    steps.append(li);
  }

  intro.append(eyebrow, h, lede, actions, facts, sources, steps);

  const side = el('div', 'home-side');
  const checklist = el('section', 'card checklist');
  checklist.hidden = true;
  const list = el('ul', 'checklist-list');
  checklist.append(el('h2', 'label checklist-heading', SETUP.heading), list);
  const leaderboardSlot = el('div', 'card home-leaderboard');
  side.append(checklist, leaderboardSlot, shortcutLegend());

  container.replaceChildren(intro, side);

  let lastKey = '';
  function updateSetup(setup) {
    const view = checklistView(setup);
    const key = JSON.stringify(view);
    if (key === lastKey) return;
    lastKey = key;
    checklist.hidden = !view.visible;
    start.disabled = !view.startEnabled;
    start.classList.toggle('btn-primary', view.startEnabled);
    startAnyway.hidden = !view.showStartAnyway;
    list.replaceChildren(
      ...view.items.map((item) => {
        const li = el('li', `check status-${item.pass ? 'good' : 'warn'}`);
        li.dataset.check = item.id;
        li.append(el('span', 'check-mark', item.pass ? SETUP.pass : SETUP.fail), el('span', 'check-label', item.label));
        if (item.hint) li.append(el('span', 'check-hint', item.hint));
        return li;
      }),
    );
  }

  updateSetup({ ok: true, checks: [] });
  return { leaderboardSlot, updateSetup, startButton: start };
}

/**
 * Camera error screen.
 * @param {HTMLElement} container
 * @param {{ code: string, message?: string }} error
 * @param {{ onRetry: () => void, onSimulator: () => void }} opts
 */
export function renderError(container, error, { onRetry, onSimulator }) {
  const view = errorView(error?.code);
  const box = el('section', 'card error-box');
  box.dataset.code = error?.code ?? 'unknown';
  const retry = el('button', 'btn btn-primary', ERRORS.tryAgain);
  retry.type = 'button';
  retry.addEventListener('click', () => onRetry());
  const sim = el('button', 'btn btn-secondary', ERRORS.runSimulator);
  sim.type = 'button';
  sim.dataset.action = 'simulator';
  sim.addEventListener('click', () => onSimulator());
  const actions = el('div', 'actions');
  actions.append(retry, sim);
  box.append(el('h2', 'error-title', view.title), el('p', 'error-body', view.body), actions);
  container.replaceChildren(box);
}
