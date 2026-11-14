import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { createRateTracker, zoneFor } from '../src/lib/rate.js';

function feed(tracker, intervals, t0 = 0) {
  let t = t0;
  tracker.onCompression({ tBottom: t, intervalMs: null });
  for (const iv of intervals) {
    t += iv;
    tracker.onCompression({ tBottom: t, intervalMs: iv });
  }
  return t;
}

describe('rate tracker', () => {
  it('steady 110 per minute gives 110 ± 2', () => {
    const r = createRateTracker(config);
    const t = feed(r, Array(10).fill(60000 / 110));
    expect(Math.abs(r.getRate(t) - 110)).toBeLessThanOrEqual(2);
  });

  it('one outlier interval among five moves it by no more than 3', () => {
    const iv = 60000 / 110;
    for (const outlier of [iv * 2, iv * 0.5, 2000]) {
      const r = createRateTracker(config);
      const t = feed(r, [iv, iv, iv, iv, outlier]);
      expect(Math.abs(r.getRate(t) - 110)).toBeLessThanOrEqual(3);
    }
  });

  it('is null before three compressions', () => {
    const r = createRateTracker(config);
    expect(r.getRate(0)).toBeNull();
    r.onCompression({ tBottom: 0, intervalMs: null });
    expect(r.getRate(0)).toBeNull();
    r.onCompression({ tBottom: 545, intervalMs: 545 });
    expect(r.getRate(545)).toBeNull();
    r.onCompression({ tBottom: 1090, intervalMs: 545 });
    expect(r.getRate(1090)).not.toBeNull();
  });

  it('is null after a gap longer than RATE_STALE_MS', () => {
    const r = createRateTracker(config);
    const t = feed(r, Array(5).fill(545));
    expect(r.getRate(t + config.RATE_STALE_MS)).not.toBeNull();
    expect(r.getRate(t + config.RATE_STALE_MS + 1)).toBeNull();
  });

  it('reset clears it', () => {
    const r = createRateTracker(config);
    const t = feed(r, Array(5).fill(545));
    r.reset();
    expect(r.getRate(t)).toBeNull();
  });

  it('zone boundaries: 99 slow, 100 good, 120 good, 121 fast, null none', () => {
    const r = createRateTracker(config);
    expect(r.zone(99)).toBe('slow');
    expect(r.zone(100)).toBe('good');
    expect(r.zone(120)).toBe('good');
    expect(r.zone(121)).toBe('fast');
    expect(r.zone(null)).toBe('none');
    expect(zoneFor(119.9, config)).toBe('good');
  });
});
