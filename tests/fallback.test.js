import { describe, it, expect } from 'vitest';
import { fallbackDebrief } from '../src/debrief/fallback.js';
import { goodStats, slowStats, sloppyStats } from './fixtures/stats.js';

const fixtures = [['goodStats', goodStats], ['slowStats', slowStats], ['sloppyStats', sloppyStats]];

// A sentence ends at ".", "!" or "?" followed by a space or the end of the text,
// so the decimal point in "4.2 cm" is not counted.
const countSentences = (text) => (text.match(/[.!?](?=\s|$)/g) || []).length;

const BANNED = /certified|accurate|clinical|medical/i;

describe('fallbackDebrief', () => {
  it.each(fixtures)('gives two or three sentences for %s', (_name, stats) => {
    const text = fallbackDebrief(stats);
    expect(countSentences(text)).toBeGreaterThanOrEqual(2);
    expect(countSentences(text)).toBeLessThanOrEqual(3);
  });

  it.each(fixtures)('addresses the learner as "you" and uses honest wording for %s', (_name, stats) => {
    const text = fallbackDebrief(stats);
    expect(text).toMatch(/\byou(r)?\b/i);
    expect(text).not.toMatch(BANNED);
  });

  it('gives a different debrief for each fixture', () => {
    const texts = fixtures.map(([, stats]) => fallbackDebrief(stats));
    expect(new Set(texts).size).toBe(3);
  });

  it('mentions pace and the slowing trend for slowStats', () => {
    const text = fallbackDebrief(slowStats);
    expect(text).toMatch(/pace/i);
    expect(text).toMatch(/too slow/i);
    expect(text).toMatch(/slowed/i);
    expect(text).toContain('86');
  });

  it('names the strongest component first', () => {
    expect(fallbackDebrief(slowStats).split('.')[0]).toMatch(/recoil/i); // 92% is its best
    expect(fallbackDebrief(goodStats).split('.')[0]).toMatch(/elbows/i); // 96% is its best
  });

  it('mentions the two weakest components for sloppyStats, each with a physical tip', () => {
    const text = fallbackDebrief(sloppyStats);
    expect(text).toMatch(/elbows/i); // 35%, weakest
    expect(text).toMatch(/pace/i); // 41%, second weakest
    expect(text).toMatch(/lean your shoulders further over your hands/i);
    expect(text).toMatch(/metronome/i);
    expect(text).toMatch(/speeding up/i);
  });

  it('says everything was strong and suggests a longer session for goodStats', () => {
    const text = fallbackDebrief(goodStats);
    expect(text).toMatch(/strong/i);
    expect(text).toMatch(/longer session/i);
  });

  it('mentions depth only when avgDepthCm is a number, and then calls it estimated', () => {
    expect(fallbackDebrief(goodStats)).not.toMatch(/depth|deeper/i);
    expect(fallbackDebrief(slowStats)).not.toMatch(/depth|deeper/i);

    const sloppy = fallbackDebrief(sloppyStats);
    expect(sloppy).toMatch(/estimated depth/i);
    expect(sloppy).toContain('4.2 cm');

    for (const [, stats] of fixtures) {
      for (const avgDepthCm of [4.2, 5.5, 6.8]) {
        const text = fallbackDebrief({ ...stats, avgDepthCm });
        expect(text).toMatch(/estimated depth/i);
        expect(countSentences(text)).toBeLessThanOrEqual(3);
      }
      expect(fallbackDebrief({ ...stats, avgDepthCm: null })).not.toMatch(/depth|deeper/i);
    }
  });

  it('mentions the rate trend when the pace itself is not a weak area', () => {
    const slowing = fallbackDebrief({ ...goodStats, rateTrend: 'slowing' });
    expect(slowing).toMatch(/pace slowed/i);
    const speeding = fallbackDebrief({ ...goodStats, rateTrend: 'speeding' });
    expect(speeding).toMatch(/pace crept up/i);
    expect(fallbackDebrief(goodStats)).not.toMatch(/slowed|crept/i);
  });

  it('stays within two or three sentences across many stat combinations', () => {
    const levels = [0, 40, 74, 80, 95, 100];
    for (const rate of levels) for (const elbows of levels) for (const aligned of levels) for (const recoil of levels) {
      for (const rateTrend of ['steady', 'slowing', 'speeding']) for (const avgDepthCm of [null, 4.2]) for (const avgRate of [86, 110, 130]) {
        const text = fallbackDebrief({
          ...goodStats, pctRateInRange: rate, pctElbowsLocked: elbows, pctAligned: aligned, pctRecoil: recoil,
          rateTrend, avgDepthCm, avgRate,
        });
        const n = countSentences(text);
        if (n < 2 || n > 3) throw new Error(`${n} sentences: ${text}`);
        if (rateTrend !== 'steady' && !/slowed|speeding up|crept up/.test(text)) throw new Error(`trend missing: ${text}`);
      }
    }
  });

  it('handles a session with no compressions', () => {
    const text = fallbackDebrief({ ...goodStats, compressions: 0, avgRate: 0, pctRateInRange: 0, pctElbowsLocked: 0, pctAligned: 0, pctRecoil: 0, score: 0 });
    expect(text).toMatch(/no compressions/i);
    expect(countSentences(text)).toBe(2);
  });
});
