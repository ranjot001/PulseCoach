// The drill timeline: push size through the whole relay, each compressor against their own start.
// Pure logic: no DOM, no timers.
import { config as defaultConfig } from '../config.js';
import { handsOffGaps } from './score.js';

// FATIGUE_BASELINE_MS and FATIGUE_TRAVEL_DROP are Track A's keys (task A5). Until they are in
// src/config.js, use the values agreed in CLAUDE.md.
const AGREED = { FATIGUE_BASELINE_MS: 10000, FATIGUE_TRAVEL_DROP: 0.2 };
export function fatigueSetting(cfg, key) {
  return Number.isFinite(cfg?.[key]) ? cfg[key] : AGREED[key];
}

const SMOOTH = 5;
const round1 = (x) => Math.round(x * 10) / 10;
const round2 = (x) => Math.round(x * 100) / 100;

export function median(xs) {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** The slipping threshold as a push-size percentage: 100 × (1 − FATIGUE_TRAVEL_DROP). */
export function slipThresholdPct(cfg = defaultConfig) {
  return round1(100 * (1 - fatigueSetting(cfg, 'FATIGUE_TRAVEL_DROP')));
}

/**
 * @param {object} drill getDrill() from src/lib/relay.js
 * @returns {{ durationSec, turns: [{ compressor, slippedAtSec, points: [{ tSec, pushPct }] }], pauses: [{ startSec, endSec, sec }] }}
 */
export function buildTimeline(drill, cfg = defaultConfig) {
  const startedAt = drill?.startedAt ?? 0;
  const endedAt = drill?.endedAt ?? startedAt;
  const toSec = (ms) => (ms - startedAt) / 1000;
  const baselineMs = fatigueSetting(cfg, 'FATIGUE_BASELINE_MS');

  const turns = (drill?.turns || []).map((turn) => {
    const events = (turn.events || []).filter((e) => Number.isFinite(e.at) && Number.isFinite(e.travel) && e.travel > 0);
    const startAt = turn.startAt ?? events[0]?.at ?? startedAt;
    const base = median(events.filter((e) => e.at - startAt <= baselineMs).map((e) => e.travel));
    const raw = base ? events.map((e) => (e.travel / base) * 100) : [];
    const points = raw.map((_, i) => ({
      tSec: round2(toSec(events[i].at)),
      pushPct: round1(median(raw.slice(Math.max(0, i - SMOOTH + 1), i + 1))),
    }));
    const slippedAtSec = turn.slippedAt === null || turn.slippedAt === undefined ? null : round1(toSec(startAt) + turn.slippedAt);
    return { compressor: turn.compressor, slippedAtSec, points };
  });

  const pauses = handsOffGaps(drill, cfg).map((g) => ({
    startSec: round1(toSec(g.startMs)),
    endSec: round1(toSec(g.endMs)),
    sec: round1((g.endMs - g.startMs) / 1000),
  }));

  return { durationSec: round1(Math.max(0, toSec(endedAt))), turns, pauses };
}
