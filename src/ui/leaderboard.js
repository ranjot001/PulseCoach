// Leaderboard: top scores in localStorage. Names are always rendered with textContent.
import { config } from '../config.js';
import { LEADERBOARD } from '../copy.js';

export const STORAGE_KEY = 'pulsecoach.leaderboard.v1';

function safeStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

/** Trim, cap at NAME_MAX_CHARS, fall back to "Anonymous". */
export function cleanName(name, cfg = config) {
  const trimmed = String(name ?? '').replace(/\s+/g, ' ').trim();
  return Array.from(trimmed).slice(0, cfg.NAME_MAX_CHARS).join('') || LEADERBOARD.anonymous;
}

/** Highest score first; ties keep the earlier entry first. Keeps the top LEADERBOARD_SIZE. */
export function rankEntries(entries, cfg = config) {
  return entries
    .map((e, i) => ({ e, i }))
    .sort((a, b) => b.e.score - a.e.score || a.i - b.i)
    .map(({ e }) => e)
    .slice(0, cfg.LEADERBOARD_SIZE);
}

/** Old entries have no mode: they count as solo. */
export function entryMode(e) {
  return e && e.mode === 'relay' ? 'relay' : 'solo';
}

function isEntry(e) {
  return e && typeof e.name === 'string' && Number.isFinite(e.score);
}

/**
 * @param {Storage} [storage] anything with getItem/setItem/removeItem; defaults to localStorage
 */
export function createLeaderboard(storage = safeStorage(), cfg = config) {
  function load() {
    if (!storage) return [];
    try {
      const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? rankEntries(parsed.filter(isEntry), cfg) : [];
    } catch {
      return [];
    }
  }

  function save(entries) {
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Storage full or blocked: the leaderboard just will not persist.
    }
  }

  return {
    load,
    /** Adds { name, score, avgRate, date, mode, compressionFraction? } and returns the new top list. */
    add({ name, score, avgRate, date = new Date().toISOString(), mode = 'solo', compressionFraction }) {
      const entry = { name: cleanName(name, cfg), score: Math.round(Number(score) || 0), avgRate: Math.round(Number(avgRate) || 0), date, mode: entryMode({ mode }) };
      if (entry.mode === 'relay') entry.compressionFraction = Math.round(Number(compressionFraction) || 0);
      const entries = rankEntries([...load(), entry], cfg);
      save(entries);
      return entries;
    },
    reset() {
      if (!storage) return;
      try {
        storage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    },
  };
}

/**
 * Draws the leaderboard into `container`.
 * @param {object} opts
 * @param {object[]} opts.entries
 * @param {() => void} [opts.onReset] called after the person confirms
 * @param {(msg: string) => boolean} [opts.confirm] defaults to window.confirm
 */
export function renderLeaderboard(container, { entries, onReset, confirm = (m) => globalThis.confirm?.(m) ?? false } = {}) {
  const wrap = document.createElement('section');
  wrap.className = 'leaderboard';

  const head = document.createElement('div');
  head.className = 'leaderboard-head';
  const h = document.createElement('h2');
  h.textContent = LEADERBOARD.heading;
  head.append(h);
  if (onReset && entries.length > 0) {
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'btn btn-small';
    reset.textContent = LEADERBOARD.reset;
    reset.addEventListener('click', () => {
      if (confirm(LEADERBOARD.confirmReset)) onReset();
    });
    head.append(reset);
  }
  wrap.append(head);

  if (entries.length === 0) {
    const p = document.createElement('p');
    p.className = 'leaderboard-empty';
    p.textContent = LEADERBOARD.empty;
    wrap.append(p);
  } else {
    const ol = document.createElement('ol');
    ol.className = 'leaderboard-list';
    for (const e of entries) {
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.className = 'lb-name';
      name.textContent = e.name;
      const relay = entryMode(e) === 'relay';
      li.dataset.mode = entryMode(e);
      const rate = document.createElement('span');
      rate.className = 'lb-rate';
      rate.textContent = relay ? LEADERBOARD.ccf(e.compressionFraction ?? 0) : `${e.avgRate}${LEADERBOARD.perMin}`;
      const tag = document.createElement('span');
      tag.className = 'lb-tag';
      tag.textContent = relay ? LEADERBOARD.relayTag : '';
      const score = document.createElement('span');
      score.className = 'lb-score';
      score.textContent = String(e.score);
      li.append(name, tag, rate, score);
      ol.append(li);
    }
    wrap.append(ol);
  }
  container.replaceChildren(wrap);
}
