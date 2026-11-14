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

const SVG_NS = 'http://www.w3.org/2000/svg'; // XML namespace identifier, not a network request

function svgEl(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Side view: a laptop camera on the left, a person kneeling over a pillow, arms straight. */
function positionDiagram() {
  const svg = svgEl('svg', { viewBox: '0 0 320 180', class: 'home-diagram', role: 'img', 'aria-label': HOME.diagramLabel });
  const line = { stroke: 'currentColor', 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' };
  svg.append(svgEl('line', { x1: 10, y1: 165, x2: 310, y2: 165, stroke: 'var(--muted)', 'stroke-width': 3 }));
  svg.append(svgEl('rect', { x: 18, y: 112, width: 8, height: 52, fill: 'var(--muted)' }));
  svg.append(svgEl('rect', { x: 14, y: 160, width: 50, height: 5, fill: 'var(--muted)' }));
  svg.append(svgEl('circle', { cx: 26, cy: 118, r: 4, fill: 'var(--good)' }));
  svg.append(svgEl('path', { d: 'M30 118 L300 40 L300 165 Z', fill: 'var(--good)', opacity: 0.08 }));
  svg.append(svgEl('rect', { x: 150, y: 150, width: 60, height: 14, rx: 6, fill: 'var(--muted)' }));
  svg.append(svgEl('circle', { cx: 196, cy: 52, r: 14, ...line }));
  svg.append(svgEl('path', { d: 'M196 68 L250 100', ...line }));
  svg.append(svgEl('path', { d: 'M190 74 L182 148', ...line }));
  svg.append(svgEl('path', { d: 'M250 100 L262 160 L300 162', ...line }));
  return svg;
}

function shortcutLegend() {
  const wrap = el('section', 'shortcuts');
  wrap.append(el('h2', 'shortcuts-heading', SHORTCUT_LEGEND.heading));
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
 * @param {HTMLElement} container
 * @param {{ onStart: () => void, onSolo?: () => void }} opts  onStart runs the relay drill
 * @returns {{ leaderboardSlot: HTMLElement, updateSetup(setup: object): void }}
 */
export function renderHome(container, { onStart, onSolo }) {
  const intro = el('section', 'home-intro');
  const h = el('h2', 'home-title', PRODUCT_NAME);
  const tag = el('p', 'home-tagline', HOME.tagline);
  const instr = el('p', 'home-instruction', HOME.instruction);

  const checklist = el('section', 'checklist');
  checklist.hidden = true;
  const checklistHeading = el('h2', 'checklist-heading', SETUP.heading);
  const list = el('ul', 'checklist-list');
  checklist.append(checklistHeading, list);

  const start = el('button', 'btn btn-primary', RELAY.startRelay);
  start.type = 'button';
  start.dataset.action = 'relay';
  start.addEventListener('click', () => onStart());
  const solo = el('button', 'btn', RELAY.startSolo);
  solo.type = 'button';
  solo.dataset.action = 'solo';
  solo.addEventListener('click', () => (onSolo || onStart)());
  const startAnyway = el('button', 'link-button', SETUP.startAnyway);
  startAnyway.type = 'button';
  startAnyway.hidden = true;
  startAnyway.addEventListener('click', () => onStart());
  const hint = el('span', 'hint', HOME.startHint);
  const actions = el('div', 'actions');
  actions.append(start, startAnyway, hint, solo);

  intro.append(h, tag, instr, positionDiagram(), checklist, actions);

  const side = el('div', 'home-side');
  const leaderboardSlot = el('div', 'home-leaderboard');
  side.append(leaderboardSlot, shortcutLegend());

  container.replaceChildren(intro, side);

  let lastKey = '';
  function updateSetup(setup) {
    const view = checklistView(setup);
    const key = JSON.stringify(view);
    if (key === lastKey) return;
    lastKey = key;
    checklist.hidden = !view.visible;
    positionDiagramToggle(view.visible);
    start.disabled = !view.startEnabled;
    start.classList.toggle('btn-primary', view.startEnabled);
    startAnyway.hidden = !view.showStartAnyway;
    list.replaceChildren(
      ...view.items.map((item) => {
        const li = el('li', `check status-${item.pass ? 'good' : 'bad'}`);
        li.dataset.check = item.id;
        li.append(el('span', 'check-mark', item.pass ? SETUP.pass : SETUP.fail), el('span', 'check-label', item.label));
        if (item.hint) li.append(el('span', 'check-hint', item.hint));
        return li;
      }),
    );
  }

  // The diagram gives way to the checklist when there is one, to keep the screen unscrolled.
  function positionDiagramToggle(checklistShown) {
    const svg = intro.querySelector('.home-diagram');
    if (svg) svg.classList.toggle('compact', checklistShown);
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
  const box = el('section', 'error-box');
  box.dataset.code = error?.code ?? 'unknown';
  const retry = el('button', 'btn btn-primary', ERRORS.tryAgain);
  retry.type = 'button';
  retry.addEventListener('click', () => onRetry());
  const sim = el('button', 'btn', ERRORS.runSimulator);
  sim.type = 'button';
  sim.dataset.action = 'simulator';
  sim.addEventListener('click', () => onSimulator());
  const actions = el('div', 'actions');
  actions.append(retry, sim);
  box.append(el('h2', 'error-title', view.title), el('p', 'error-body', view.body), actions);
  container.replaceChildren(box);
}
