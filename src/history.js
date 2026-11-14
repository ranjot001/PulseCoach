// Contract 4: saved relay drills in localStorage, newest first, at most HISTORY_SIZE.
// Track B writes; Track C's educator view reads. Nothing leaves the browser.
import { config } from './config.js';
import { cleanName } from './ui/leaderboard.js';

export const HISTORY_KEY = 'pulsecoach.history.v1';

function safeStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function newId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Every saved drill, newest first. [] when storage is missing or the data is unreadable. */
export function loadHistory({ storage = safeStorage() } = {}) {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Saves one relay drill. Does nothing if storage is missing or full.
 * @returns {object|null} the saved entry
 */
export function saveDrill(team, stats, { storage = safeStorage(), cfg = config, now = new Date(), id = newId() } = {}) {
  const entry = { id, savedAt: now.toISOString(), team: cleanName(team, cfg), stats };
  if (!storage) return null;
  try {
    const entries = [entry, ...loadHistory({ storage })].slice(0, cfg.HISTORY_SIZE);
    storage.setItem(HISTORY_KEY, JSON.stringify(entries));
    return entry;
  } catch {
    return null;
  }
}

export function clearHistory({ storage = safeStorage() } = {}) {
  try {
    storage?.removeItem(HISTORY_KEY);
  } catch {
    // nothing to clear
  }
}
