import { describe, it, expect } from 'vitest';
import { goodStats, slowStats, sloppyStats } from './fixtures/stats.js';
import { makeEvents } from './fixtures/events.js';

const STATS_FIELDS = [
  'durationSec', 'compressions', 'avgRate',
  'pctRateInRange', 'pctElbowsLocked', 'pctAligned', 'pctRecoil',
  'avgDepthCm', 'rateTrend', 'score', 'grade',
];
const EVENT_FIELDS = [
  'index', 'tBottom', 'tTop', 'travel', 'intervalMs',
  'elbowAngleDeg', 'armLeanDeg', 'recoilRatio',
  'elbowsLocked', 'aligned', 'fullRecoil', 'depthCm',
];

describe('stats fixtures (Contract 2)', () => {
  it.each([['goodStats', goodStats], ['slowStats', slowStats], ['sloppyStats', sloppyStats]])(
    '%s has exactly the contract fields',
    (_name, s) => {
      expect(Object.keys(s).sort()).toEqual([...STATS_FIELDS].sort());
      for (const k of ['pctRateInRange', 'pctElbowsLocked', 'pctAligned', 'pctRecoil', 'score']) {
        expect(s[k]).toBeGreaterThanOrEqual(0);
        expect(s[k]).toBeLessThanOrEqual(100);
      }
      expect(['steady', 'slowing', 'speeding']).toContain(s.rateTrend);
      expect(s.avgDepthCm === null || typeof s.avgDepthCm === 'number').toBe(true);
      expect(typeof s.grade).toBe('string');
    },
  );
});

describe('makeEvents', () => {
  it('produces contract-shaped events at the requested rate', () => {
    const events = makeEvents({ cpm: 120, seconds: 30 });
    expect(events.length).toBe(60);
    for (const e of events) expect(Object.keys(e).sort()).toEqual([...EVENT_FIELDS].sort());
    expect(events[0].intervalMs).toBeCloseTo(500);
  });

  it('honours the form rates', () => {
    const events = makeEvents({ cpm: 100, seconds: 30, lockedRate: 0.8, alignedRate: 0.5, recoilRate: 0 });
    const pct = (f) => events.filter((e) => e[f]).length / events.length;
    expect(pct('elbowsLocked')).toBeCloseTo(0.8, 1);
    expect(pct('aligned')).toBeCloseTo(0.5, 1);
    expect(pct('fullRecoil')).toBe(0);
  });

  it('slows down by slowDownBy over the session', () => {
    const events = makeEvents({ cpm: 115, seconds: 30, slowDownBy: 15 });
    const first = 60000 / events[0].intervalMs;
    const last = 60000 / events.at(-1).intervalMs;
    expect(first).toBeCloseTo(115, 0);
    expect(first - last).toBeGreaterThan(12);
  });
});
