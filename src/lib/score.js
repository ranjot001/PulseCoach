// Contract 2: session stats. Pure logic: no DOM, no timers.
import { config as defaultConfig } from '../config.js';
import { GRADES } from '../copy.js';

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const pct = (count, total) => (total > 0 ? Math.round((count / total) * 100) : 0);

function validInterval(ms, cfg) {
  return Number.isFinite(ms) && ms > 0 && ms <= cfg.RATE_STALE_MS;
}

/**
 * Rate at each event: compressions per minute over the last RATE_WINDOW intervals,
 * the same smoothing the engine uses. null after a pause (interval over RATE_STALE_MS).
 */
export function rollingRates(events, cfg = defaultConfig) {
  const window = [];
  return events.map((e) => {
    if (!validInterval(e.intervalMs, cfg)) {
      window.length = 0;
      return null;
    }
    window.push(e.intervalMs);
    if (window.length > cfg.RATE_WINDOW) window.shift();
    return 60000 / mean(window);
  });
}

/** 'steady' | 'slowing' | 'speeding', comparing the first and last third of the session. */
export function rateTrend(events, cfg = defaultConfig) {
  const rates = rollingRates(events, cfg);
  const third = Math.floor(rates.length / 3);
  if (third < 2) return 'steady';
  const first = mean(rates.slice(0, third).filter((r) => r !== null));
  const last = mean(rates.slice(-third).filter((r) => r !== null));
  if (first === null || last === null) return 'steady';
  if (last <= first - cfg.RATE_TREND_CPM) return 'slowing';
  if (last >= first + cfg.RATE_TREND_CPM) return 'speeding';
  return 'steady';
}

export function gradeFor(score, cfg = defaultConfig) {
  const b = cfg.GRADE_BANDS;
  if (score >= b.lifesaver) return GRADES.lifesaver;
  if (score >= b.strong) return GRADES.strong;
  if (score >= b.gettingThere) return GRADES.gettingThere;
  return GRADES.keepPractising;
}

/**
 * @param {object[]} events compression events from the engine (Contract 1)
 * @param {number} durationSec session length
 * @returns Contract 2 stats
 */
export function summarise(events, durationSec, config = defaultConfig) {
  const cfg = config;
  const list = Array.isArray(events) ? events : [];
  const n = list.length;

  const intervals = list.map((e) => e.intervalMs).filter((ms) => validInterval(ms, cfg));
  const avgInterval = mean(intervals);
  const avgRate = avgInterval ? Math.round(60000 / avgInterval) : 0;

  const rates = rollingRates(list, cfg);
  const inRange = rates.filter((r) => r !== null && r >= cfg.RATE_MIN && r <= cfg.RATE_MAX).length;

  const pctRateInRange = pct(inRange, n);
  const pctElbowsLocked = pct(list.filter((e) => e.elbowsLocked).length, n);
  const pctAligned = pct(list.filter((e) => e.aligned).length, n);
  const pctRecoil = pct(list.filter((e) => e.fullRecoil).length, n);

  const depths = list.map((e) => e.depthCm).filter((d) => typeof d === 'number' && Number.isFinite(d));
  const avgDepth = mean(depths);
  const avgDepthCm = avgDepth === null ? null : Math.round(avgDepth * 10) / 10;
  const depthLo = cfg.DEPTH_MIN_CM - cfg.DEPTH_TOLERANCE_CM;
  const depthHi = cfg.DEPTH_MAX_CM + cfg.DEPTH_TOLERANCE_CM;
  const pctDepth = pct(depths.filter((d) => d >= depthLo && d <= depthHi).length, depths.length);

  // Weighted average of the components that have data, rescaled over their weights.
  const w = cfg.SCORE_WEIGHTS;
  const components = [];
  if (n > 0) {
    components.push([w.rate, pctRateInRange], [w.elbows, pctElbowsLocked], [w.alignment, pctAligned], [w.recoil, pctRecoil]);
  }
  if (depths.length > 0) components.push([w.depth, pctDepth]);
  const totalWeight = components.reduce((a, [wt]) => a + wt, 0);
  const weighted = totalWeight > 0 ? components.reduce((a, [wt, p]) => a + wt * p, 0) / totalWeight : 0;

  // Barely moving cannot score well.
  const expectedHalf = (cfg.RATE_MIN * durationSec) / 60 / 2;
  const activity = expectedHalf > 0 ? Math.min(1, n / expectedHalf) : 0;
  const score = Math.max(0, Math.min(100, Math.round(weighted * activity)));

  return {
    durationSec,
    compressions: n,
    avgRate,
    pctRateInRange,
    pctElbowsLocked,
    pctAligned,
    pctRecoil,
    avgDepthCm,
    rateTrend: rateTrend(list, cfg),
    score,
    grade: gradeFor(score, cfg),
  };
}

// ─── Relay stats (Contract 2) ─────────────────────────────────────────────

const round1 = (x) => Math.round(x * 10) / 10;

function drillEvents(drill) {
  return (drill?.turns || []).flatMap((t) => t.events || []).map((e) => e.at).filter(Number.isFinite).sort((a, b) => a - b);
}

/**
 * Hands-off gaps as { startMs, endMs } on the page clock: before the first compression, every gap
 * longer than PAUSE_MIN_MS, and after the last compression until the drill ends.
 */
export function handsOffGaps(drill, cfg = defaultConfig) {
  const start = drill?.startedAt ?? 0;
  const end = drill?.endedAt ?? start;
  const times = drillEvents(drill);
  if (times.length === 0) return end > start ? [{ startMs: start, endMs: end }] : [];
  const gaps = [];
  if (times[0] > start) gaps.push({ startMs: start, endMs: times[0] });
  for (let i = 1; i < times.length; i++) {
    if (times[i] - times[i - 1] > cfg.PAUSE_MIN_MS) gaps.push({ startMs: times[i - 1], endMs: times[i] });
  }
  if (end > times[times.length - 1]) gaps.push({ startMs: times[times.length - 1], endMs: end });
  return gaps;
}

/** The length in ms of each hands-off gap. */
export function handsOffPieces(drill, cfg = defaultConfig) {
  return handsOffGaps(drill, cfg).map((g) => g.endMs - g.startMs);
}

/** Each switch: seconds from the last compression of one turn to the first of the next, and whether the app called it early. */
export function switchPauses(drill) {
  const turns = drill?.turns || [];
  const out = [];
  for (let i = 0; i < turns.length - 1; i++) {
    const before = turns[i].events || [];
    const after = turns[i + 1].events || [];
    if (before.length === 0 || after.length === 0) continue;
    out.push({ sec: round1((after[0].at - before[before.length - 1].at) / 1000), early: Boolean(turns[i].early) });
  }
  return out;
}

/** 0 at or below CCF_MIN, 100 at or above CCF_TARGET, linear between; minus 20 per pause over PAUSE_MAX_SEC. */
export function handsOffScore(compressionFraction, pausesSec, cfg = defaultConfig) {
  const span = cfg.CCF_TARGET - cfg.CCF_MIN;
  const ccfScore = Math.min(100, Math.max(0, ((compressionFraction - cfg.CCF_MIN) / span) * 100));
  const longOnes = pausesSec.filter((s) => s > cfg.PAUSE_MAX_SEC).length;
  return Math.max(0, ccfScore - 20 * longOnes);
}

/**
 * @param {object} drill getDrill() from src/lib/relay.js
 * @returns Contract 2 relay stats
 */
export function summariseRelay(drill, config = defaultConfig) {
  const cfg = config;
  const turnsIn = drill?.turns || [];
  const durationMs = Math.max(0, (drill?.endedAt ?? 0) - (drill?.startedAt ?? 0));
  const durationSec = Math.round(durationMs / 1000);

  const turns = turnsIn.map((t) => {
    const turnSec = t.startAt !== null && t.endAt !== null ? Math.round((t.endAt - t.startAt) / 1000) : 0;
    return {
      compressor: t.compressor,
      ...summarise(t.events || [], turnSec, cfg),
      slippedAtSec: t.slippedAt === null || t.slippedAt === undefined ? null : Math.round(t.slippedAt),
      signs: [...(t.signs || [])],
    };
  });

  const compressions = turns.reduce((a, t) => a + t.compressions, 0);
  const pieces = handsOffPieces(drill, cfg).map((ms) => ms / 1000);
  const handsOff = pieces.reduce((a, b) => a + b, 0);
  const compressionFraction = durationMs > 0 && compressions > 0 ? Math.round(Math.max(0, (durationMs / 1000 - handsOff) / (durationMs / 1000)) * 100) : 0;

  const switches = Math.max(0, turnsIn.length - 1);
  const earlySwitches = turnsIn.filter((t) => t.early).length;
  const switchSecs = switchPauses(drill).map((s) => s.sec);
  const avgSwitchSec = switchSecs.length ? round1(mean(switchSecs)) : null;
  const longestPauseSec = pieces.length ? round1(Math.max(...pieces)) : 0;

  const technique = compressions > 0 ? turns.reduce((a, t) => a + t.score * t.compressions, 0) / compressions : 0;
  const handsOffPart = compressions > 0 ? handsOffScore(compressionFraction, pieces, cfg) : 0;
  const w = cfg.RELAY_WEIGHTS;
  const score = Math.round((technique * w.technique + handsOffPart * w.handsOff) / (w.technique + w.handsOff));

  return {
    mode: 'relay',
    durationSec,
    compressions,
    compressionFraction,
    switches,
    earlySwitches,
    avgSwitchSec,
    longestPauseSec,
    score,
    grade: gradeFor(score, cfg),
    turns,
  };
}
