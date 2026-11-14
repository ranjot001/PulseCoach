import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { createFatigueTracker } from '../src/lib/fatigue.js';

// Synthetic events. `at(i)` gives { cpm, travel, locked } for compression i.
function events(n, at, t0 = 0) {
  const out = [];
  let t = t0;
  for (let i = 0; i < n; i++) {
    const { cpm = 110, travel = 0.1, locked = true } = at(i);
    const iv = 60000 / cpm;
    t += iv;
    out.push({ index: i, tTop: t - iv / 2, tBottom: t, travel, intervalMs: i === 0 ? null : iv, elbowsLocked: locked });
  }
  return out;
}

function feed(tracker, evs) {
  return evs.map((e) => ({ ratio: tracker.push(e), state: tracker.getState() }));
}

// 15 s steady, then over the next 15 s ramp the change in, then hold it.
const ramp = (i, n0 = 28, n1 = 55) => Math.min(1, Math.max(0, (i - n0) / (n1 - n0)));

describe('fatigue tracker', () => {
  it('steady pushes never slip', () => {
    const f = createFatigueTracker(config);
    // a little natural wobble in travel and rate
    const out = feed(f, events(120, (i) => ({ cpm: 110 + ((i * 7) % 5) - 2, travel: 0.1 * (1 + (((i * 13) % 7) - 3) / 100) })));
    expect(out.every((o) => !o.state.slipping)).toBe(true);
    expect(f.getState()).toEqual({ slipping: false, signs: [] });
  });

  it("travel falling 25% gives 'shallower' only", () => {
    const f = createFatigueTracker(config);
    feed(f, events(90, (i) => ({ travel: 0.1 * (1 - 0.25 * ramp(i)) })));
    expect(f.getState()).toEqual({ slipping: true, signs: ['shallower'] });
  });

  it("a rate falling by 12 a minute gives 'slower' only", () => {
    const f = createFatigueTracker(config);
    feed(f, events(90, (i) => ({ cpm: 110 - 12 * ramp(i) })));
    expect(f.getState()).toEqual({ slipping: true, signs: ['slower'] });
  });

  it("locked elbows falling from 100% to 50% gives 'elbows' only", () => {
    const f = createFatigueTracker(config);
    feed(f, events(90, (i) => ({ locked: i < 40 || i % 2 === 0 })));
    expect(f.getState()).toEqual({ slipping: true, signs: ['elbows'] });
  });

  it('lists several signs in order: shallower, slower, elbows', () => {
    const f = createFatigueTracker(config);
    feed(f, events(90, (i) => ({ cpm: 110 - 12 * ramp(i), travel: 0.1 * (1 - 0.3 * ramp(i)), locked: i < 40 || i % 2 === 0 })));
    expect(f.getState().signs).toEqual(['shallower', 'slower', 'elbows']);
  });

  it('travelRatio is null during the baseline, then close to 1 for steady pushes', () => {
    const f = createFatigueTracker(config);
    const out = feed(f, events(40, () => ({})));
    // 10 s at 110/min ≈ 18 compressions in the baseline
    const during = out.filter((o) => o.ratio === null);
    expect(during.length).toBeGreaterThanOrEqual(6);
    expect(during.length).toBeLessThanOrEqual(20);
    expect(out.slice(0, during.length).every((o) => o.ratio === null)).toBe(true);
    for (const o of out.slice(during.length)) expect(o.ratio).toBeCloseTo(1, 2);
  });

  it('needs at least 6 compressions for a baseline, even if 10 s have passed', () => {
    const f = createFatigueTracker(config);
    const out = feed(f, events(10, () => ({ cpm: 30 }))); // one every 2 s
    expect(out.slice(0, 6).every((o) => o.ratio === null)).toBe(true);
    expect(out[6].ratio).not.toBeNull();
  });

  it("a 6-second gap between compressions does not produce 'slower'", () => {
    const f = createFatigueTracker(config);
    const evs = events(60, () => ({}));
    // insert a 6 s pause before compression 40
    for (let i = 40; i < evs.length; i++) { evs[i].tBottom += 6000; evs[i].tTop += 6000; }
    evs[40].intervalMs += 6000;
    const out = feed(f, evs);
    expect(out.every((o) => !o.state.signs.includes('slower'))).toBe(true);
    expect(out.every((o) => !o.state.slipping)).toBe(true);
  });

  it('startTurn() clears slipping and starts a new baseline', () => {
    const f = createFatigueTracker(config);
    feed(f, events(90, (i) => ({ travel: 0.1 * (1 - 0.3 * ramp(i)) })));
    expect(f.getState().slipping).toBe(true);
    f.startTurn();
    expect(f.getState()).toEqual({ slipping: false, signs: [] });
    expect(f.getBaseline()).toBeNull();
    // The new compressor pushes smaller than the last one did at their start: that is
    // their own baseline, so it is not slipping.
    const out = feed(f, events(40, () => ({ travel: 0.07 }), 100000));
    expect(out[0].ratio).toBeNull();
    expect(f.getBaseline().travel).toBeCloseTo(0.07);
    expect(out.every((o) => !o.state.slipping)).toBe(true);
  });

  it('getState returns a copy', () => {
    const f = createFatigueTracker(config);
    f.getState().signs.push('x');
    expect(f.getState().signs).toEqual([]);
  });
});
