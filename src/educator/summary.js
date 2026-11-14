// Educator view logic: reading the saved drills (Contract 4), the summary tiles and
// the CSV export. Pure logic: no DOM, no timers. Storage is passed in.

import { config as defaultConfig } from '../config.js';
import { validateRelayStats, relayTargets } from '../debrief/schema.js';

export const HISTORY_KEY = 'pulsecoach.history.v1';
const TEAM_MAX_CHARS = 60;

/**
 * Checks one history entry and returns a clean copy, or null when it fails.
 * Team names are user text; they are kept as plain strings and must be rendered with textContent.
 */
export function cleanEntry(entry) {
  try {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return null;
    if (typeof entry.id !== 'string' || entry.id.length === 0 || entry.id.length > 64) return null;
    if (typeof entry.savedAt !== 'string' || !Number.isFinite(Date.parse(entry.savedAt))) return null;
    if (typeof entry.team !== 'string' || entry.team.length > TEAM_MAX_CHARS) return null;
    return { id: entry.id, savedAt: entry.savedAt, team: entry.team, stats: validateRelayStats(entry.stats) };
  } catch {
    return null;
  }
}

/** Valid entries from a parsed history array, newest first. Anything else gives []. */
export function cleanHistory(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(cleanEntry)
    .filter(Boolean)
    .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt));
}

/** Reads the history from storage. Never throws: missing, corrupt or blocked storage gives []. */
export function loadHistory(storage) {
  try {
    const text = storage?.getItem(HISTORY_KEY);
    if (!text) return [];
    return cleanHistory(JSON.parse(text));
  } catch {
    return [];
  }
}

/**
 * The time a drill's slowest switch took, in seconds, or null with no switch.
 * With one switch it is avgSwitchSec; with more, longestPauseSec is the worst case.
 */
export function slowestSwitchSec(stats) {
  if (stats.switches === 0 || stats.avgSwitchSec === null) return null;
  return stats.switches === 1 ? stats.avgSwitchSec : stats.longestPauseSec;
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * @param {Array} entries  clean history entries
 * @param {object} [cfg]   settings; defaults to src/config.js
 */
export function summariseHistory(entries, cfg = defaultConfig) {
  const { ccfTarget, pauseMaxSec } = relayTargets(cfg);
  let metCcf = 0;
  let switches = 0;
  let switchesUnderMax = 0;
  const slips = [];

  for (const { stats } of entries) {
    if (stats.compressionFraction >= ccfTarget) metCcf += 1;
    switches += stats.switches;
    const slowest = slowestSwitchSec(stats);
    if (slowest !== null && slowest <= pauseMaxSec) switchesUnderMax += stats.switches;
    for (const turn of stats.turns) {
      if (turn.slippedAtSec !== null) slips.push(turn.slippedAtSec);
    }
  }

  return {
    drills: entries.length,
    metCcf,
    switches,
    switchesUnderMax,
    slippedTurns: slips.length,
    medianSlipSec: median(slips),
  };
}

/** One row per compressor number: their mean turn score and the first time they slipped. */
export function compressorSummary(stats) {
  const by = new Map();
  for (const t of stats.turns) {
    if (!by.has(t.compressor)) by.set(t.compressor, []);
    by.get(t.compressor).push(t);
  }
  return [...by.keys()]
    .sort((a, b) => a - b)
    .map((compressor) => {
      const turns = by.get(compressor);
      const slipped = turns.find((t) => t.slippedAtSec !== null);
      return {
        compressor,
        score: Math.round(turns.reduce((sum, t) => sum + t.score, 0) / turns.length),
        slippedAtSec: slipped ? slipped.slippedAtSec : null,
      };
    });
}

const pad = (n) => String(n).padStart(2, '0');

/** Local date and time of a saved drill, as YYYY-MM-DD and HH:MM. */
export function localDateTime(iso) {
  const d = new Date(iso);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

// Quote every cell, double inner quotes, and stop spreadsheets running user text as a formula.
function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/** The drills as CSV text: one header row, then one row per drill. */
export function toCsv(entries) {
  const maxCompressor = Math.max(2, ...entries.flatMap((e) => e.stats.turns.map((t) => t.compressor)));
  const header = [
    'Date', 'Time', 'Team', 'Score', 'Grade', 'On the chest %', 'Switches', 'Early switches',
    'Average switch s', 'Longest pause s',
  ];
  for (let c = 1; c <= maxCompressor; c++) header.push(`Compressor ${c} score`, `Compressor ${c} slipped at s`);

  const rows = entries.map(({ savedAt, team, stats }) => {
    const { date, time } = localDateTime(savedAt);
    const row = [
      date, time, team, stats.score, stats.grade, stats.compressionFraction, stats.switches, stats.earlySwitches,
      stats.avgSwitchSec, stats.longestPauseSec,
    ];
    const comp = new Map(compressorSummary(stats).map((c) => [c.compressor, c]));
    for (let c = 1; c <= maxCompressor; c++) {
      const s = comp.get(c);
      row.push(s ? s.score : null, s ? s.slippedAtSec : null);
    }
    return row;
  });

  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
