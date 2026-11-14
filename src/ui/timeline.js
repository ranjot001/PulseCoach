// The drill timeline chart: inline SVG, no library. x is time through the drill, y is push size
// from 50% to 120% of each compressor's own start.
import { config } from '../config.js';
import { TIMELINE } from '../copy.js';
import { slipThresholdPct } from '../lib/timeline.js';

const NS = 'http://www.w3.org/2000/svg'; // XML namespace identifier, not a network request
const W = 640;
const H = 220;
const LEFT = 40;
const RIGHT = 630;
const TOP = 30;
const BOTTOM = 190;
const Y_MIN = 50;
const Y_MAX = 120;
const MIN_POINTS = 6;

function svg(tag, attrs = {}, text) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  if (text !== undefined) n.textContent = text;
  return n;
}

function clock(sec) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Tick spacing for the time axis, in seconds. */
export function axisStep(durationSec) {
  if (durationSec > 150) return 60;
  if (durationSec > 80) return 30;
  if (durationSec > 40) return 20;
  if (durationSec > 15) return 10;
  return 5;
}

/**
 * Draws the timeline into `container`. Never throws: on bad input it leaves an empty chart.
 * @param {HTMLElement} container
 * @param {ReturnType<import('../lib/timeline.js').buildTimeline>} timeline
 */
export function renderTimeline(container, timeline, cfg = config) {
  if (!container) return;
  try {
    const duration = Math.max(1, timeline?.durationSec || 0);
    const X = (s) => LEFT + (Math.max(0, Math.min(duration, s)) / duration) * (RIGHT - LEFT);
    const Y = (p) => BOTTOM - ((Math.max(Y_MIN, Math.min(Y_MAX, p)) - Y_MIN) / (Y_MAX - Y_MIN)) * (BOTTOM - TOP);
    const chart = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'timeline-svg', role: 'img', 'aria-label': TIMELINE.heading });

    for (const p of timeline?.pauses || []) {
      const over = p.sec > cfg.PAUSE_MAX_SEC;
      const g = svg('g', { class: 'tl-pause-group' });
      g.append(svg('rect', { class: 'tl-pause', x: X(p.startSec), y: TOP - 18, width: Math.max(2, X(p.endSec) - X(p.startSec)), height: BOTTOM - TOP + 18, rx: 4 }));
      // Label pauses that matter; a fraction of a second at the very start or end only adds noise.
      if (p.sec >= 1) g.append(svg('text', { class: `tl-pause-label status-${over ? 'bad' : 'none'}`, x: (X(p.startSec) + X(p.endSec)) / 2, y: TOP - 6, 'text-anchor': 'middle' }, TIMELINE.pauseValue(p.sec)));
      chart.append(g);
    }

    const threshold = slipThresholdPct(cfg);
    chart.append(svg('line', { class: 'tl-ref', x1: LEFT, x2: RIGHT, y1: Y(100), y2: Y(100) }));
    chart.append(svg('line', { class: 'tl-threshold', x1: LEFT, x2: RIGHT, y1: Y(threshold), y2: Y(threshold) }));
    chart.append(svg('text', { class: 'tl-axis', x: 0, y: Y(100) + 4 }, '100%'));
    chart.append(svg('text', { class: 'tl-axis', x: 0, y: Y(threshold) + 4 }, `${threshold}%`));

    for (const turn of timeline?.turns || []) {
      const pts = turn.points || [];
      if (pts.length < MIN_POINTS) continue;
      const slipAt = turn.slippedAtSec;
      const before = slipAt === null ? pts : pts.filter((p) => p.tSec <= slipAt);
      const after = slipAt === null ? [] : pts.filter((p) => p.tSec >= slipAt);
      if (before.length && after.length && before[before.length - 1] !== after[0]) after.unshift(before[before.length - 1]);
      const d = (list) => list.map((p, i) => `${i ? 'L' : 'M'}${X(p.tSec).toFixed(1)} ${Y(p.pushPct).toFixed(1)}`).join(' ');
      const who = turn.compressor === 2 ? 'tl-c2' : 'tl-c1';
      if (before.length > 1) chart.append(svg('path', { class: `tl-line ${who}`, d: d(before), 'data-turn': turn.compressor }));
      if (after.length > 1) chart.append(svg('path', { class: 'tl-line tl-slip', d: d(after), 'data-turn': turn.compressor }));
      if (slipAt !== null) {
        chart.append(svg('line', { class: 'tl-slip-marker', x1: X(slipAt), x2: X(slipAt), y1: TOP + 4, y2: BOTTOM }));
        chart.append(svg('text', { class: 'tl-slip-label', x: X(slipAt) - 6, y: TOP + 14, 'text-anchor': 'end' }, TIMELINE.slippingFrom(clock(slipAt))));
      }
    }

    const step = axisStep(duration);
    for (let s = 0; s <= duration + 0.01; s += step) {
      chart.append(svg('text', { class: 'tl-axis', x: X(s), y: H - 8, 'text-anchor': 'middle' }, clock(s)));
    }

    const legend = document.createElement('div');
    legend.className = 'timeline-legend';
    for (const [cls, text] of [['tl-key-c1', TIMELINE.legend.c1], ['tl-key-c2', TIMELINE.legend.c2], ['tl-key-slip', TIMELINE.legend.slipping], ['tl-key-pause', TIMELINE.legend.handsOff]]) {
      const item = document.createElement('span');
      const swatch = document.createElement('i');
      swatch.className = cls;
      item.append(swatch, document.createTextNode(text));
      legend.append(item);
    }
    container.replaceChildren(chart, legend);
  } catch {
    container.replaceChildren();
  }
}
