// The flow meter model: a teaching picture of why pauses matter, not a measurement.
// Pure logic: time comes in as `now` (ms).
import { config as defaultConfig } from '../config.js';

const clamp = (v) => Math.min(100, Math.max(0, v));

/** A compression counts in full with full recoil and an interval inside the target rate. */
export function isGoodCompression(event, cfg = defaultConfig) {
  const ms = event?.intervalMs;
  if (!Number.isFinite(ms) || ms <= 0) return false;
  const rate = 60000 / ms;
  return event.fullRecoil !== false && rate >= cfg.RATE_MIN && rate <= cfg.RATE_MAX;
}

export function createFlowModel(cfg = defaultConfig) {
  // Steady compressions in the target band never drain the meter: the decay starts once the
  // gap is longer than the slowest in-target interval, then halves every FLOW_HALF_LIFE_MS.
  const graceMs = 60000 / cfg.RATE_MIN;
  let level = 0;
  let lastAt = null;

  function decayed(now) {
    if (lastAt === null) return level;
    const idle = Math.max(0, now - lastAt - graceMs);
    return level * 0.5 ** (idle / cfg.FLOW_HALF_LIFE_MS);
  }

  return {
    onCompression(event, now) {
      const current = decayed(now);
      const rise = isGoodCompression(event, cfg) ? cfg.FLOW_RISE : cfg.FLOW_RISE * cfg.FLOW_POOR_FACTOR;
      level = clamp(current + (100 - current) * rise);
      lastAt = now;
    },
    /** 0 to 100 */
    value(now) {
      return clamp(decayed(now));
    },
    reset() {
      level = 0;
      lastAt = null;
    },
  };
}
