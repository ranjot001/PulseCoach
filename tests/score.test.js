import { describe, it, expect } from 'vitest';
import { summarise, rateTrend, gradeFor, rollingRates } from '../src/lib/score.js';
import { makeEvents } from './fixtures/events.js';
import { goodStats } from './fixtures/stats.js';
import { config } from '../src/config.js';

const S = 30;

describe('summarise', () => {
  it('a perfect synthetic session scores 95 or more', () => {
    const s = summarise(makeEvents({ cpm: 110 }), S, config);
    expect(s.score).toBeGreaterThanOrEqual(95);
    expect(s).toMatchObject({ avgRate: 110, pctRateInRange: 100, pctElbowsLocked: 100, pctAligned: 100, pctRecoil: 100, rateTrend: 'steady', grade: 'Lifesaver' });
  });

  it('a session at 85 per minute has a rate component of 0 and a clearly lower score', () => {
    const perfect = summarise(makeEvents({ cpm: 110 }), S, config);
    const slow = summarise(makeEvents({ cpm: 85 }), S, config);
    expect(slow.pctRateInRange).toBe(0);
    expect(slow.avgRate).toBe(85);
    // Rate is 40 of 100 weight: the other components alone give 60.
    expect(slow.score).toBe(60);
    expect(perfect.score - slow.score).toBeGreaterThanOrEqual(30);
  });

  it('rateTrend detects a session that slows by 15 per minute', () => {
    expect(summarise(makeEvents({ cpm: 115, slowDownBy: 15 }), S, config).rateTrend).toBe('slowing');
    expect(summarise(makeEvents({ cpm: 100, slowDownBy: -15 }), S, config).rateTrend).toBe('speeding');
    expect(rateTrend(makeEvents({ cpm: 110, slowDownBy: 2 }), config)).toBe('steady');
  });

  it('five compressions in 30 seconds scores far below a full session with the same percentages', () => {
    const full = summarise(makeEvents({ cpm: 110 }), S, config);
    const few = summarise(makeEvents({ cpm: 110 }).slice(0, 5), S, config);
    expect(few.pctElbowsLocked).toBe(full.pctElbowsLocked);
    expect(few.pctRateInRange).toBe(full.pctRateInRange);
    // Activity factor: 5 / (half of 100 per min × 0.5 min = 25) = 0.2.
    expect(few.score).toBe(20);
    expect(full.score - few.score).toBeGreaterThanOrEqual(70);
  });

  it('with no depth data, avgDepthCm is null and the other weights are rescaled', () => {
    // 50% elbows only: (40·100 + 20·50 + 20·100 + 20·100) / 100 = 90.
    const s = summarise(makeEvents({ lockedRate: 0.5 }), S, config);
    expect(s.avgDepthCm).toBeNull();
    expect(s.score).toBe(90);
  });

  it('with depth data, the depth weight is used', () => {
    // All shallow (3 cm): (40·100 + 20·100·3 + 15·0) / 115 = 87.
    const shallow = summarise(makeEvents({ depthCm: 3 }), S, config);
    expect(shallow.avgDepthCm).toBe(3);
    expect(shallow.score).toBe(Math.round((100 * 100) / 115));
    // Within tolerance (6.4 cm counts as good): full marks.
    const good = summarise(makeEvents({ depthCm: 6.4 }), S, config);
    expect(good.avgDepthCm).toBe(6.4);
    expect(good.score).toBe(100);
  });

  it('averages depth only over events that have one', () => {
    const ev = makeEvents().map((e, i) => ({ ...e, depthCm: i % 2 ? null : 5 }));
    expect(summarise(ev, S, config).avgDepthCm).toBe(5);
  });

  it('each grade boundary gives the right label', () => {
    expect(gradeFor(100)).toBe('Lifesaver');
    expect(gradeFor(90)).toBe('Lifesaver');
    expect(gradeFor(89)).toBe('Strong');
    expect(gradeFor(75)).toBe('Strong');
    expect(gradeFor(74)).toBe('Getting there');
    expect(gradeFor(50)).toBe('Getting there');
    expect(gradeFor(49)).toBe('Keep practising');
    expect(gradeFor(0)).toBe('Keep practising');
  });

  it('the output has exactly the fields of Contract 2', () => {
    const s = summarise(makeEvents(), S, config);
    expect(Object.keys(s).sort()).toEqual(Object.keys(goodStats).sort());
    expect(Object.keys(summarise([], S, config)).sort()).toEqual(Object.keys(goodStats).sort());
  });

  it('an empty session scores 0 without throwing', () => {
    expect(summarise([], S, config)).toMatchObject({ compressions: 0, avgRate: 0, score: 0, grade: 'Keep practising', avgDepthCm: null, rateTrend: 'steady' });
  });

  it('a long pause does not count as in range', () => {
    const ev = makeEvents();
    ev[20] = { ...ev[20], intervalMs: 5000 };
    expect(rollingRates(ev, config)[20]).toBeNull();
    expect(summarise(ev, S, config).pctRateInRange).toBeLessThan(100);
  });
});
