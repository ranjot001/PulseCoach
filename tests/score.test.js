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

// ─── Relay ────────────────────────────────────────────────────────────────
import { summariseRelay, handsOffScore, switchPauses } from '../src/lib/score.js';
import { goodRelay } from './fixtures/relayStats.js';

/** A turn of makeEvents compressions starting at `startAt` (page clock). */
function turn(compressor, startAt, opts = {}, extra = {}) {
  const evs = makeEvents({ cpm: 110, seconds: 40, ...opts });
  const offset = startAt - evs[0].tTop;
  const events = evs.map((e) => ({ ...e, at: e.tTop + offset }));
  return { compressor, startAt, endAt: startAt + (opts.seconds ?? 40) * 1000, early: false, slippedAt: null, signs: [], events, ...extra };
}

/** Drill of turns where each turn after the first starts `switchMs` after the last compression of the one before. */
function drill({ startGapMs = 1000, switchMs = 5000, turnOpts = [{}, {}], extras = [] } = {}) {
  const turns = [];
  let t = startGapMs;
  for (const [i, opts] of turnOpts.entries()) {
    const tr = turn((i % 2) + 1, t, opts, extras[i]);
    turns.push(tr);
    t = tr.events[tr.events.length - 1].at + switchMs;
  }
  const last = turns[turns.length - 1];
  return { startedAt: 0, endedAt: last.events[last.events.length - 1].at, turns };
}

describe('summariseRelay', () => {
  it('has exactly the keys of goodRelay and goodRelay.turns[0]', () => {
    const s = summariseRelay(drill(), config);
    expect(Object.keys(s).sort()).toEqual(Object.keys(goodRelay).sort());
    expect(Object.keys(s.turns[0]).sort()).toEqual(Object.keys(goodRelay.turns[0]).sort());
    expect(s).toMatchObject({ mode: 'relay', switches: 1, earlySwitches: 0 });
    expect(s.turns.map((t) => t.compressor)).toEqual([1, 2]);
    expect(s.turns[0].score).toBeGreaterThanOrEqual(95);
  });

  it('two 40-second turns, a 1-second start and a 5-second switch give the hand-calculated compression fraction', () => {
    const d = drill({ startGapMs: 1000, switchMs: 5000 });
    // Turn 1 spans first to last compression; the drill ends at the last compression.
    const t1 = d.turns[0].events;
    const t2 = d.turns[1].events;
    const span1 = (t1[t1.length - 1].at - t1[0].at) / 1000;
    const span2 = (t2[t2.length - 1].at - t2[0].at) / 1000;
    const total = 1 + span1 + 5 + span2;
    const byHand = Math.round(((total - 6) / total) * 100);
    const s = summariseRelay(d, config);
    expect(s.compressionFraction).toBe(byHand);
    expect(byHand).toBe(93);
    expect(s.avgSwitchSec).toBe(5);
    expect(s.longestPauseSec).toBe(5);
    expect(s.durationSec).toBe(Math.round(total));
  });

  it('a 12-second switch pause takes 20 points off the hands-off part of the score', () => {
    // Long turns keep the compression fraction at or above target either way.
    const long = { seconds: 120 };
    const quick = summariseRelay(drill({ switchMs: 9000, turnOpts: [long, long] }), config);
    const slow = summariseRelay(drill({ switchMs: 12000, turnOpts: [long, long] }), config);
    expect(quick.compressionFraction).toBeGreaterThanOrEqual(config.CCF_TARGET);
    expect(slow.compressionFraction).toBeGreaterThanOrEqual(config.CCF_TARGET);
    expect(handsOffScore(slow.compressionFraction, [12], config)).toBe(80);
    expect(handsOffScore(quick.compressionFraction, [9], config)).toBe(100);
    const w = config.RELAY_WEIGHTS;
    expect(quick.score - slow.score).toBe(Math.round((20 * w.handsOff) / (w.technique + w.handsOff)));
    expect(slow.longestPauseSec).toBe(12);
  });

  it('compression fraction maps 0 at CCF_MIN to 100 at CCF_TARGET', () => {
    expect(handsOffScore(config.CCF_MIN, [], config)).toBe(0);
    expect(handsOffScore(70, [], config)).toBe(50);
    expect(handsOffScore(config.CCF_TARGET, [], config)).toBe(100);
    expect(handsOffScore(50, [20, 30], config)).toBe(0);
  });

  it('counts an early switch and carries slippedAtSec and signs through', () => {
    const d = drill({
      turnOpts: [{ seconds: 27 }, {}],
      extras: [{ early: true, slippedAt: 24.3, signs: ['shallower', 'slower'] }],
    });
    const s = summariseRelay(d, config);
    expect(s.earlySwitches).toBe(1);
    expect(s.turns[0]).toMatchObject({ slippedAtSec: 24, signs: ['shallower', 'slower'], durationSec: 27 });
    expect(s.turns[1]).toMatchObject({ slippedAtSec: null, signs: [] });
    expect(switchPauses(d)).toEqual([{ sec: 5, early: true }]);
  });

  it('zero compressions gives valid stats with a score of 0', () => {
    const empty = { startedAt: 0, endedAt: 30000, turns: [{ compressor: 1, startAt: null, endAt: null, early: false, slippedAt: null, signs: [], events: [] }] };
    const s = summariseRelay(empty, config);
    expect(Object.keys(s).sort()).toEqual(Object.keys(goodRelay).sort());
    expect(s).toMatchObject({ compressions: 0, compressionFraction: 0, switches: 0, earlySwitches: 0, avgSwitchSec: null, longestPauseSec: 30, score: 0, grade: 'Keep practising' });
    const numbers = ['durationSec', 'compressions', 'compressionFraction', 'switches', 'earlySwitches', 'longestPauseSec', 'score'];
    for (const k of numbers) expect(Number.isFinite(s[k])).toBe(true);
    for (const k of ['compressions', 'avgRate', 'pctRateInRange', 'score']) expect(Number.isFinite(s.turns[0][k])).toBe(true);
    expect(() => summariseRelay({ startedAt: 0, endedAt: 0, turns: [] }, config)).not.toThrow();
    expect(summariseRelay(undefined, config).score).toBe(0);
  });
});
