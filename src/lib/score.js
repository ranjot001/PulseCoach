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
