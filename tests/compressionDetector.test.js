import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { createMotionSignal } from '../src/lib/signal.js';
import { createCompressionDetector } from '../src/lib/compressionDetector.js';
import { simFrame, SIM_FPS } from '../src/pose/simSource.js';

const DT = 1000 / SIM_FPS;

const LEAD_IN_MS = 2000;

// Feed frames through signal → detector, the way a session runs in the app: the
// learner kneels still during the countdown (LEAD_IN_MS), the detector is reset
// when the countdown ends, then `seconds` of compressions. `phaseTime(t)` maps
// session time to motion time, so a test can pause the motion.
// Event times are in session time (0 = end of countdown).
function detect(params = {}, seconds = 30, phaseTime = (t) => t, leadInMs = LEAD_IN_MS) {
  const signal = createMotionSignal(config);
  const detector = createCompressionDetector(config);
  const events = [];
  let i = 0;
  for (let t = -leadInMs; t <= seconds * 1000; t += DT, i++) {
    if (t >= 0 && t - DT < 0) detector.reset();
    const f = simFrame(Math.max(0, phaseTime(Math.max(0, t))), { ...params, seed: (params.seed ?? 1) + i });
    const ev = detector.push(signal.push({ ...f, t: t + leadInMs }));
    if (ev) events.push({ ...ev, tBottom: ev.tBottom - leadInMs, tTop: ev.tTop - leadInMs });
  }
  return events;
}

describe('compression detector on simulated frames', () => {
  it.each([[80, 40], [110, 55], [140, 70]])('30 s at %i per minute gives %i ± 1', (cpm, expected) => {
    const events = detect({ cpm });
    expect(Math.abs(events.length - expected)).toBeLessThanOrEqual(1);
  });

  it.each([80, 110, 140])('every intervalMs is within 8%% of the true interval at %i', (cpm) => {
    const events = detect({ cpm });
    const truth = 60000 / cpm;
    expect(events[0].intervalMs).toBeNull();
    for (const e of events.slice(1)) expect(Math.abs(e.intervalMs - truth) / truth).toBeLessThan(0.08);
  });

  it('counts right from a cold start too (no lead-in, no history)', () => {
    for (const [cpm, expected] of [[80, 40], [110, 55], [140, 70]]) {
      expect(Math.abs(detect({ cpm }, 30, (t) => t, 0).length - expected)).toBeLessThanOrEqual(1);
    }
  });

  it('travel 0 gives zero compressions in 30 s', () => {
    expect(detect({ travel: 0 })).toHaveLength(0);
  });

  it('a bounce of half MIN_TRAVEL gives zero compressions', () => {
    expect(detect({ travel: config.MIN_TRAVEL / 2 })).toHaveLength(0);
  });

  it('three times the default noise still counts within ±2', () => {
    for (const seed of [1, 2, 3]) {
      const events = detect({ cpm: 110, noise: 3, seed: seed * 1000 });
      expect(Math.abs(events.length - 55)).toBeLessThanOrEqual(2);
    }
  });

  it('10 s on, 5 s still, 10 s on: no events in the pause and the right total', () => {
    // Motion time stops between 10 s and 15 s, so the figure holds still.
    const phase = (t) => (t < 10000 ? t : t < 15000 ? 10000 : t - 5000);
    const events = detect({ cpm: 110 }, 25, phase);
    const inPause = events.filter((e) => e.tBottom > 10300 && e.tBottom < 15000);
    expect(inPause).toHaveLength(0);
    // 20 s of motion at 110/min ≈ 36.7
    expect(Math.abs(events.length - 20 * 110 / 60)).toBeLessThanOrEqual(1.5);
  });

  it('no two events are closer than MIN_INTERVAL_MS, even when noisy and fast', () => {
    for (const params of [{ cpm: 140, noise: 3 }, { cpm: 110, noise: 3 }, { cpm: 80 }]) {
      const events = detect(params);
      for (let i = 1; i < events.length; i++) {
        expect(events[i].tBottom - events[i - 1].tBottom).toBeGreaterThanOrEqual(config.MIN_INTERVAL_MS);
      }
    }
  });

  it('events carry index, tBottom, tTop, travel and intervalMs', () => {
    const events = detect({ cpm: 110, travel: 0.1 }, 10);
    events.forEach((e, i) => {
      expect(e.index).toBe(i);
      expect(e.tTop).toBeLessThan(e.tBottom);
      expect(e.travel).toBeGreaterThanOrEqual(config.MIN_TRAVEL);
    });
    // Once the baseline has settled (2 s), travel matches the simulated 0.10 torso units.
    for (const e of events.filter((e) => e.tBottom > 2000)) {
      expect(e.travel).toBeGreaterThan(0.08);
      expect(e.travel).toBeLessThan(0.13);
    }
  });

  it('rejects strokes sooner than MIN_INTERVAL_MS and resets after a second of invalid signal', () => {
    const d = createCompressionDetector(config);
    const s = (t, v) => ({ t, detrended: v, valid: true });
    const evs = [];
    const feed = (t, v) => { const e = d.push(s(t, v)); if (e) evs.push(e); };
    // stroke 1
    feed(0, -0.05); feed(100, 0.05); feed(200, -0.05);
    // stroke 2, bottom only 150 ms after stroke 1's bottom → rejected
    feed(250, 0.05); feed(300, -0.05);
    expect(evs).toHaveLength(1);
    // invalid for more than a second, then a stroke: interval is null again
    for (let t = 400; t <= 1600; t += 100) d.push({ t, detrended: null, valid: false });
    feed(1700, -0.05); feed(1800, 0.05); feed(1900, -0.05);
    expect(evs).toHaveLength(2);
    expect(evs[1].intervalMs).toBeNull();
    expect(evs[1].index).toBe(1);
  });
});
