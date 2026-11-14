// Compression rate from recent intervals. Pure logic.

/**
 * @param {object} config needs RATE_WINDOW, RATE_STALE_MS, RATE_MIN, RATE_MAX
 */
export function createRateTracker(config) {
  let intervals = [];
  let count = 0;
  let lastT = null;

  return {
    reset() {
      intervals = [];
      count = 0;
      lastT = null;
    },
    onCompression(event) {
      count += 1;
      lastT = event.tBottom;
      if (Number.isFinite(event.intervalMs) && event.intervalMs > 0) {
        intervals.push(event.intervalMs);
        if (intervals.length > config.RATE_WINDOW) intervals.shift();
      }
    },
    /** Compressions per minute, or null. `now` is in the same clock as event times. */
    getRate(now) {
      if (count < 3 || intervals.length === 0 || lastT === null) return null;
      if (now - lastT > config.RATE_STALE_MS) return null;
      const s = [...intervals].sort((a, b) => a - b);
      const m = s.length >> 1;
      const median = s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
      return 60000 / median;
    },
    zone(rate) {
      return zoneFor(rate, config);
    },
  };
}

export function zoneFor(rate, config) {
  if (rate === null || rate === undefined || !Number.isFinite(rate)) return 'none';
  if (rate < config.RATE_MIN) return 'slow';
  if (rate > config.RATE_MAX) return 'fast';
  return 'good';
}
