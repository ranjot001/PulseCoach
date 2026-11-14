// Home screen: name, tagline, instruction, position diagram, leaderboard and Start.
import { PRODUCT_NAME, HOME } from '../copy.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

/** Side view: a laptop camera on the left, a person kneeling over a pillow, arms straight. */
function positionDiagram() {
  const svg = svgEl('svg', { viewBox: '0 0 320 180', class: 'home-diagram', role: 'img', 'aria-label': HOME.diagramLabel });
  const line = { stroke: 'currentColor', 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' };
  // floor
  svg.append(svgEl('line', { x1: 10, y1: 165, x2: 310, y2: 165, stroke: 'var(--muted)', 'stroke-width': 3 }));
  // laptop with camera, facing the person
  svg.append(svgEl('rect', { x: 18, y: 112, width: 8, height: 52, fill: 'var(--muted)' }));
  svg.append(svgEl('rect', { x: 14, y: 160, width: 50, height: 5, fill: 'var(--muted)' }));
  svg.append(svgEl('circle', { cx: 26, cy: 118, r: 4, fill: 'var(--good)' }));
  // view cone from the camera
  svg.append(svgEl('path', { d: 'M30 118 L300 40 L300 165 Z', fill: 'var(--good)', opacity: 0.08 }));
  // pillow
  svg.append(svgEl('rect', { x: 150, y: 150, width: 60, height: 14, rx: 6, fill: 'var(--muted)' }));
  // person: head, back, arms, thigh, shin
  svg.append(svgEl('circle', { cx: 196, cy: 52, r: 14, ...line }));
  svg.append(svgEl('path', { d: 'M196 68 L250 100', ...line })); // torso to hip
  svg.append(svgEl('path', { d: 'M190 74 L182 148', ...line })); // straight arm to hands
  svg.append(svgEl('path', { d: 'M250 100 L262 160 L300 162', ...line })); // thigh and shin
  return svg;
}

/**
 * @param {HTMLElement} container
 * @param {{ onStart: () => void }} opts
 * @returns {{ leaderboardSlot: HTMLElement }}
 */
export function renderHome(container, { onStart }) {
  const intro = document.createElement('section');
  intro.className = 'home-intro';

  const h = document.createElement('h2');
  h.className = 'home-title';
  h.textContent = PRODUCT_NAME;
  const tag = document.createElement('p');
  tag.className = 'home-tagline';
  tag.textContent = HOME.tagline;
  const instr = document.createElement('p');
  instr.className = 'home-instruction';
  instr.textContent = HOME.instruction;

  const start = document.createElement('button');
  start.type = 'button';
  start.className = 'btn btn-primary';
  start.textContent = HOME.start;
  start.addEventListener('click', () => onStart());
  const hint = document.createElement('span');
  hint.className = 'hint';
  hint.textContent = HOME.startHint;
  const actions = document.createElement('div');
  actions.className = 'actions';
  actions.append(start, hint);

  intro.append(h, tag, instr, positionDiagram(), actions);

  const leaderboardSlot = document.createElement('div');
  leaderboardSlot.className = 'home-leaderboard';

  container.replaceChildren(intro, leaderboardSlot);
  return { leaderboardSlot, startButton: start };
}
