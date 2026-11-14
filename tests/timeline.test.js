// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { buildTimeline, slipThresholdPct, median, fatigueSetting } from '../src/lib/timeline.js';
import { renderTimeline, axisStep } from '../src/ui/timeline.js';
import { handsOffGaps } from '../src/lib/score.js';
import { config } from '../src/config.js';

/** A turn of pushes every 545 ms from `startAt` for `seconds`, with travel given by `travelAt(secIntoTurn)`. */
function turn(compressor, startAt, seconds, travelAt = () => 0.1, extra = {}) {
  const events = [];
  for (let t = 0; t <= seconds * 1000; t += 545) events.push({ index: events.length, intervalMs: 545, travel: travelAt(t / 1000), at: startAt + t });
  return { compressor, startAt, endAt: startAt + seconds * 1000, early: false, slippedAt: null, signs: [], events, ...extra };
}

function drill() {
  // Drill starts at page time 5000 ms; turn 1 starts 1 s later; a 5 s switch; turn 2.
  const t1 = turn(1, 6000, 40, (s) => (s < 24 ? 0.1 : 0.075), { slippedAt: 24 });
  const last1 = t1.events[t1.events.length - 1].at;
  const t2 = turn(2, last1 + 5000, 40);
  return { startedAt: 5000, endedAt: t2.events[t2.events.length - 1].at, turns: [t1, t2] };
}

describe('buildTimeline', () => {
  it('steady pushes give about 100; travel falling by 25% gives about 75', () => {
    const tl = buildTimeline(drill(), config);
    const [p1, p2] = tl.turns.map((t) => t.points);
    expect(p1.filter((p) => p.tSec - 1 < 24).every((p) => p.pushPct === 100)).toBe(true);
    expect(p1[p1.length - 1].pushPct).toBe(75);
    expect(p2.every((p) => p.pushPct === 100)).toBe(true);
  });

  it('measures tSec and slippedAtSec from the start of the drill', () => {
    const d = drill();
    const tl = buildTimeline(d, config);
    expect(tl.turns[0].points[0].tSec).toBe(1);
    expect(tl.turns[0].slippedAtSec).toBe(25);
    expect(tl.turns[1].slippedAtSec).toBeNull();
    expect(Math.abs(tl.turns[1].points[0].tSec - (d.turns[1].startAt - 5000) / 1000)).toBeLessThanOrEqual(0.006);
    expect(tl.durationSec).toBe(Math.round(((d.endedAt - 5000) / 1000) * 10) / 10);
  });

  it('the pauses match the hands-off gaps of the score', () => {
    const d = drill();
    const tl = buildTimeline(d, config);
    const gaps = handsOffGaps(d, config);
    expect(tl.pauses).toHaveLength(gaps.length);
    expect(tl.pauses.map((p) => p.sec)).toEqual([1, 5]);
    expect(tl.pauses[1].sec).toBe(5);
    expect(tl.pauses[1].startSec).toBeCloseTo((d.turns[0].events.at(-1).at - 5000) / 1000, 1);
  });

  it('smooths with a rolling median of 5, so one odd push does not show', () => {
    const d = { startedAt: 0, endedAt: 20000, turns: [turn(1, 0, 20, (s) => (Math.abs(s - 12) < 0.3 ? 0.05 : 0.1))] };
    expect(buildTimeline(d, config).turns[0].points.every((p) => p.pushPct === 100)).toBe(true);
  });

  it('copes with no travel, no events and no drill', () => {
    expect(buildTimeline({ startedAt: 0, endedAt: 1000, turns: [{ compressor: 1, startAt: null, endAt: null, slippedAt: null, events: [] }] }, config).turns[0].points).toEqual([]);
    expect(() => buildTimeline(undefined, config)).not.toThrow();
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it('uses the agreed fatigue values until Track A adds them to config', () => {
    expect(fatigueSetting({}, 'FATIGUE_TRAVEL_DROP')).toBe(0.2);
    expect(fatigueSetting({ FATIGUE_TRAVEL_DROP: 0.3 }, 'FATIGUE_TRAVEL_DROP')).toBe(0.3);
    expect(slipThresholdPct({ ...config, FATIGUE_TRAVEL_DROP: 0.2 })).toBe(80);
  });
});

describe('renderTimeline', () => {
  it('draws two lines for two turns, one band per pause, and a slipping marker for the slip', () => {
    const root = document.createElement('div');
    renderTimeline(root, buildTimeline(drill(), config), config);
    expect(root.querySelectorAll('path.tl-c1')).toHaveLength(1);
    expect(root.querySelectorAll('path.tl-c2')).toHaveLength(1);
    expect(root.querySelectorAll('path.tl-slip')).toHaveLength(1);
    expect(root.querySelectorAll('rect.tl-pause')).toHaveLength(2);
    expect(root.querySelectorAll('line.tl-slip-marker')).toHaveLength(1);
    expect(root.querySelector('.tl-slip-label').textContent).toBe('slipping from 0:25');
    expect(root.querySelector('.tl-threshold')).not.toBeNull();
    expect([...root.querySelectorAll('.timeline-legend span')].map((s) => s.textContent)).toEqual(['Compressor 1', 'Compressor 2', 'Slipping', 'Hands off']);
  });

  it('no marker when nobody slipped; a pause over the limit is labelled in red', () => {
    const tl = buildTimeline(drill(), config);
    tl.turns[0].slippedAtSec = null;
    tl.pauses.push({ startSec: 10, endSec: 22, sec: 12 });
    const root = document.createElement('div');
    renderTimeline(root, tl, config);
    expect(root.querySelector('.tl-slip-marker')).toBeNull();
    expect(root.querySelectorAll('path.tl-c1')).toHaveLength(1);
    const labels = [...root.querySelectorAll('.tl-pause-label')];
    expect(labels.find((l) => l.textContent === '12.0 s').getAttribute('class')).toContain('status-bad');
    expect(labels.find((l) => l.textContent === '5.0 s').getAttribute('class')).not.toContain('status-bad');
  });

  it('a turn with fewer than 6 compressions draws nothing; bad input never throws', () => {
    const root = document.createElement('div');
    const tl = { durationSec: 10, turns: [{ compressor: 1, slippedAtSec: null, points: [{ tSec: 1, pushPct: 100 }, { tSec: 2, pushPct: 100 }] }, { compressor: 2, slippedAtSec: null, points: [] }], pauses: [] };
    expect(() => renderTimeline(root, tl, config)).not.toThrow();
    expect(root.querySelectorAll('path')).toHaveLength(0);
    expect(() => renderTimeline(root, null, config)).not.toThrow();
    expect(() => renderTimeline(root, { turns: 'x' }, config)).not.toThrow();
    expect(() => renderTimeline(null, tl, config)).not.toThrow();
  });

  it('picks a readable time-axis step', () => {
    expect([10, 30, 74, 100, 300].map(axisStep)).toEqual([5, 10, 20, 30, 60]);
  });
});
