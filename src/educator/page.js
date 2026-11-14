// The educator view: every saved drill in this browser, whether the team met the
// targets, and a record that can be printed or exported. Never throws.
// All user text (team names) is set with textContent.

import { config } from '../config.js';
import { relayTargets } from '../debrief/schema.js';
import { fallbackRelayDebrief } from '../debrief/fallback.js';
import {
  HISTORY_KEY, loadHistory, cleanHistory, summariseHistory, slowestSwitchSec, compressorSummary,
  localDateTime, toCsv,
} from './summary.js';
import { SAMPLE_HISTORY } from './sample.js';

const SVG_NS = 'http://www.w3.org/2000/svg'; // XML namespace identifier, not a network request
const FOOTER = 'Practice record for adult hands-only CPR. Not a certification.';
const SIGN_WORDS = { shallower: 'smaller pushes', slower: 'slower', elbows: 'bending elbows' };

function el(doc, tag, className, text) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const clock = (sec) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
const seconds = (sec) => `${sec.toFixed(1)} s`;

function ccfStatus(pct, t) {
  if (pct >= t.ccfTarget) return 'good';
  if (pct >= t.ccfMin) return 'warn';
  return 'bad';
}
function pauseStatus(sec, t) {
  if (sec <= t.pauseWarnSec) return 'good';
  if (sec <= t.pauseMaxSec) return 'warn';
  return 'bad';
}
function scoreStatus(score) {
  if (score >= config.RESULT_GOOD_PCT) return 'good';
  if (score >= config.RESULT_WARN_PCT) return 'warn';
  return 'bad';
}

function safeStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * @param {HTMLElement} root
 * @param {object} [opts]
 * @param {Storage|null} [opts.storage]  defaults to localStorage, or null when it is blocked
 * @param {Window} [opts.win]            for confirm, print and the CSV download
 */
export function renderEducator(root, { storage = safeStorage(), win = globalThis } = {}) {
  if (!root) return;
  const doc = root.ownerDocument;
  const targets = relayTargets(config);
  const state = { entries: loadHistory(storage), sample: false, selectedId: null };

  function tile(label, value, sub, status) {
    const card = el(doc, 'section', 'card tile');
    card.append(el(doc, 'div', 'label', label));
    card.append(el(doc, 'div', `big${status ? ` ${status}` : ''}`, value));
    if (sub) card.append(el(doc, 'div', 'sub', sub));
    return card;
  }

  function tiles() {
    const s = summariseHistory(state.entries, config);
    const wrap = el(doc, 'div', 'tiles');
    wrap.append(
      tile('Drills run', String(s.drills), s.drills === 1 ? 'saved drill' : 'saved drills'),
      tile(`Met ${targets.ccfTarget}% on the chest`, `${s.metCcf} of ${s.drills}`, 'teams that hit the target',
        s.metCcf === s.drills ? 'good' : s.metCcf * 2 >= s.drills ? 'warn' : 'bad'),
      tile(`Switches under ${targets.pauseMaxSec} s`, `${s.switchesUnderMax} of ${s.switches}`, 'hands-off at each swap',
        s.switches === 0 ? undefined : s.switchesUnderMax === s.switches ? 'good' : s.switchesUnderMax * 2 >= s.switches ? 'warn' : 'bad'),
      tile('Typical time before slipping', s.medianSlipSec === null ? '—' : clock(s.medianSlipSec),
        s.slippedTurns === 0 ? 'no turn slipped' : `median of ${s.slippedTurns} ${s.slippedTurns === 1 ? 'turn' : 'turns'} that slipped`),
    );
    return wrap;
  }

  function svg(tag, attrs) {
    const node = doc.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
    return node;
  }

  function trend() {
    const card = el(doc, 'section', 'card trend');
    card.append(el(doc, 'div', 'label', 'On the chest, each drill in time order'));
    const W = 640, H = 170, L = 36, R = 12, T = 12, B = 22;
    const chart = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'trend-chart', role: 'img' });
    chart.setAttribute('aria-label', `Compression fraction for each drill, with a line at the ${targets.ccfTarget}% target`);
    const y = (pct) => T + (1 - pct / 100) * (H - T - B);
    const oldestFirst = [...state.entries].reverse();
    const x = (i) => (oldestFirst.length === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (oldestFirst.length - 1));

    for (const pct of [0, 50, 100]) {
      chart.append(svg('line', { x1: L, x2: W - R, y1: y(pct), y2: y(pct), class: 'grid' }));
      const label = svg('text', { x: L - 6, y: y(pct) + 4, class: 'axis', 'text-anchor': 'end' });
      label.textContent = `${pct}%`;
      chart.append(label);
    }
    chart.append(svg('line', { x1: L, x2: W - R, y1: y(targets.ccfTarget), y2: y(targets.ccfTarget), class: 'target' }));
    const tLabel = svg('text', { x: W - R, y: y(targets.ccfTarget) - 5, class: 'axis target-label', 'text-anchor': 'end' });
    tLabel.textContent = `target ${targets.ccfTarget}%`;
    chart.append(tLabel);

    const points = oldestFirst.map((e, i) => `${x(i).toFixed(1)},${y(e.stats.compressionFraction).toFixed(1)}`).join(' ');
    if (oldestFirst.length > 1) chart.append(svg('polyline', { points, class: 'series' }));
    oldestFirst.forEach((e, i) => {
      chart.append(svg('circle', { cx: x(i), cy: y(e.stats.compressionFraction), r: 5, class: `dot ${ccfStatus(e.stats.compressionFraction, targets)}` }));
    });
    card.append(chart);
    return card;
  }

  function slipText(stats) {
    return compressorSummary(stats)
      .map((c) => `C${c.compressor} ${c.slippedAtSec === null ? 'held' : clock(c.slippedAtSec)}`)
      .join(' · ');
  }

  function table() {
    const card = el(doc, 'section', 'card drills');
    card.append(el(doc, 'div', 'label', 'Drills, newest first'));
    const wrap = el(doc, 'div', 'table-wrap');
    const t = el(doc, 'table', 'drill-table');
    const head = el(doc, 'tr');
    for (const h of ['Date and time', 'Team', 'Score', 'On the chest', 'Slowest switch', 'Early switches', 'Slipping began']) {
      head.append(el(doc, 'th', '', h));
    }
    const thead = el(doc, 'thead');
    thead.append(head);
    const tbody = el(doc, 'tbody');
    for (const entry of state.entries) {
      const { stats } = entry;
      const { date, time } = localDateTime(entry.savedAt);
      const row = el(doc, 'tr', 'drill-row');
      row.dataset.id = entry.id;
      row.tabIndex = 0;
      row.setAttribute('aria-selected', String(entry.id === state.selectedId));
      const slow = slowestSwitchSec(stats);
      row.append(
        el(doc, 'td', 'when', `${date} ${time}`),
        el(doc, 'td', 'team', entry.team || 'No name'),
        el(doc, 'td', `num ${scoreStatus(stats.score)}`, String(Math.round(stats.score))),
        el(doc, 'td', `num ${ccfStatus(stats.compressionFraction, targets)}`, `${Math.round(stats.compressionFraction)}%`),
        el(doc, 'td', `num${slow === null ? '' : ` ${pauseStatus(slow, targets)}`}`, slow === null ? '—' : seconds(slow)),
        el(doc, 'td', 'num', String(stats.earlySwitches)),
        el(doc, 'td', 'slips', slipText(stats)),
      );
      const select = () => {
        state.selectedId = entry.id;
        render();
        root.querySelector('.detail')?.scrollIntoView?.({ block: 'nearest' });
      };
      row.addEventListener('click', select);
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          select();
        }
      });
      tbody.append(row);
    }
    t.append(thead, tbody);
    wrap.append(t);
    card.append(wrap);
    return card;
  }

  function detail(entry) {
    const { stats } = entry;
    const { date, time } = localDateTime(entry.savedAt);
    const card = el(doc, 'section', 'card detail');
    const top = el(doc, 'div', 'detail-top');
    const title = el(doc, 'h2', 'detail-title');
    title.textContent = entry.team || 'No name';
    top.append(title, el(doc, 'span', 'label', `${date} ${time}`));
    card.append(top);

    const facts = el(doc, 'dl', 'facts');
    const fact = (label, value, status) => {
      const row = el(doc, 'div', 'fact');
      row.append(el(doc, 'dt', '', label), el(doc, 'dd', status ? status : '', value));
      facts.append(row);
    };
    fact('Team score', `${Math.round(stats.score)} · ${stats.grade}`, scoreStatus(stats.score));
    fact('On the chest', `${Math.round(stats.compressionFraction)}%`, ccfStatus(stats.compressionFraction, targets));
    fact('Switches', `${stats.switches} (${stats.earlySwitches} early)`);
    const slow = slowestSwitchSec(stats);
    fact('Slowest switch', slow === null ? '—' : seconds(slow), slow === null ? undefined : pauseStatus(slow, targets));
    fact('Longest pause', seconds(stats.longestPauseSec), pauseStatus(stats.longestPauseSec, targets));
    fact('Compressions', `${stats.compressions} in ${clock(stats.durationSec)}`);
    card.append(facts);

    const turns = el(doc, 'ol', 'turns');
    stats.turns.forEach((turn) => {
      const li = el(doc, 'li', 'turn');
      li.append(el(doc, 'div', 'turn-name', `Compressor ${turn.compressor}`));
      li.append(el(doc, 'div', 'turn-meta',
        `${turn.compressions} compressions · ${Math.round(turn.avgRate)}/min · ${clock(turn.durationSec)} · score ${Math.round(turn.score)}`));
      li.append(turn.slippedAtSec === null
        ? el(doc, 'div', 'turn-slip good', 'Held form for the whole turn')
        : el(doc, 'div', 'turn-slip warn',
          `Started slipping at ${clock(turn.slippedAtSec)}${turn.signs.length ? `: ${turn.signs.map((s) => SIGN_WORDS[s]).join(', ')}` : ''}`));
      turns.append(li);
    });
    card.append(turns);

    const debrief = el(doc, 'div', 'debrief-card');
    const head = el(doc, 'div', 'debrief-card__header');
    head.append(el(doc, 'h2', 'debrief-card__title', 'Team debrief'), el(doc, 'span', 'debrief-card__label', 'Quick tips'));
    debrief.append(head, el(doc, 'p', 'debrief-card__text', fallbackRelayDebrief(stats)));
    card.append(debrief);
    return card;
  }

  function downloadCsv() {
    try {
      const text = toCsv(state.entries);
      const blob = new win.Blob(['﻿', text], { type: 'text/csv;charset=utf-8' });
      const url = win.URL.createObjectURL(blob);
      const a = doc.createElement('a');
      a.href = url;
      a.download = `pulsecoach-drills-${localDateTime(new Date().toISOString()).date}.csv`;
      doc.body.append(a);
      a.click();
      a.remove();
      win.setTimeout?.(() => win.URL.revokeObjectURL(url), 1000);
    } catch {
      // A failed download leaves the page as it is.
    }
  }

  function clearHistory() {
    try {
      const sure = win.confirm?.('Clear every saved drill from this browser? This cannot be undone.');
      if (!sure) return;
      if (!state.sample) storage?.removeItem(HISTORY_KEY);
    } catch {
      // Storage may be blocked; the page still empties.
    }
    state.entries = state.sample ? loadHistory(storage) : [];
    state.sample = false;
    state.selectedId = null;
    render();
  }

  function actions() {
    const bar = el(doc, 'div', 'actions');
    const button = (text, onClick, extra = '') => {
      const b = el(doc, 'button', `btn${extra}`, text);
      b.type = 'button';
      b.addEventListener('click', onClick);
      return b;
    };
    bar.append(
      button('Export CSV', downloadCsv, ' btn-export'),
      button('Print', () => { try { win.print?.(); } catch { /* nothing to do */ } }, ' btn-print'),
      button(state.sample ? 'Hide sample data' : 'Clear history', clearHistory, ' btn-clear'),
    );
    return bar;
  }

  function emptyState() {
    const card = el(doc, 'section', 'card empty');
    card.append(el(doc, 'h2', 'empty-title', 'No drills saved yet'));
    card.append(el(doc, 'p', 'empty-text', 'Run a relay drill and save a team name on the results screen. Every saved drill in this browser appears here.'));
    const b = el(doc, 'button', 'btn btn-primary btn-sample', 'Load sample data');
    b.type = 'button';
    b.addEventListener('click', () => {
      state.entries = cleanHistory(SAMPLE_HISTORY); // shown only; never written to storage
      state.sample = true;
      state.selectedId = state.entries[0]?.id ?? null;
      render();
    });
    card.append(b);
    return card;
  }

  function render() {
    const page = el(doc, 'div', 'educator');

    if (state.sample) page.append(el(doc, 'div', 'sample-banner', 'Sample data, not real drills'));

    const header = el(doc, 'header', 'top');
    const brand = el(doc, 'div', 'brand', 'PulseCoach');
    const h1 = el(doc, 'h1', 'title', 'Educator view');
    const back = el(doc, 'a', 'back', 'Back to the drill');
    back.href = '/';
    header.append(brand, h1, back);
    page.append(header);

    if (state.entries.length === 0) {
      page.append(emptyState());
    } else {
      if (!state.entries.some((e) => e.id === state.selectedId)) state.selectedId = state.entries[0].id;
      page.append(tiles(), actions(), table());
      const grid = el(doc, 'div', 'grid');
      grid.append(trend(), detail(state.entries.find((e) => e.id === state.selectedId)));
      page.append(grid);
    }

    page.append(el(doc, 'footer', 'foot', FOOTER));
    root.replaceChildren(page);
  }

  try {
    render();
  } catch {
    try {
      root.textContent = 'No drills saved yet.';
    } catch {
      // Nothing more can be done safely.
    }
  }
}
