import { describe, it, expect, afterEach, vi } from 'vitest';
import { beatIntervalMs, beatTimeMs, nextBeatIndex, createMetronome } from '../src/audio/metronome.js';

describe('beat arithmetic', () => {
  it('beats are 545 ms apart at 110 per minute', () => {
    expect(Math.round(beatIntervalMs(110))).toBe(545);
    expect(Math.round(beatTimeMs(0, 1, 110) - beatTimeMs(0, 0, 110))).toBe(545);
    expect(Math.round(beatTimeMs(1000, 501, 110) - beatTimeMs(1000, 500, 110))).toBe(545);
  });
  it('does not drift over 60 seconds', () => {
    // 110 beats at 110 per minute land exactly on 60 s.
    expect(beatTimeMs(250, 110, 110)).toBeCloseTo(60250, 6);
    // Step-by-step accumulation would drift; our formula stays within a microsecond of ideal.
    for (let i = 0; i <= 110; i++) expect(Math.abs(beatTimeMs(0, i, 110) - (i * 60000) / 110)).toBeLessThan(1e-6);
  });
  it('nextBeatIndex finds the first beat at or after now', () => {
    expect(nextBeatIndex(0, -5, 110)).toBe(0);
    expect(nextBeatIndex(0, 0, 110)).toBe(0);
    expect(nextBeatIndex(0, 1, 110)).toBe(1);
    expect(nextBeatIndex(0, beatTimeMs(0, 7, 110), 110)).toBe(7);
  });
});

describe('createMetronome', () => {
  afterEach(() => {
    delete globalThis.AudioContext;
    vi.useRealTimers();
  });

  it('start() without any audio support does not throw', () => {
    const m = createMetronome();
    expect(() => m.start()).not.toThrow();
    expect(m.running).toBe(true);
    m.stop();
    expect(m.running).toBe(false);
  });

  it('start() before user interaction (suspended context, resume rejects) does not throw', async () => {
    globalThis.AudioContext = class {
      constructor() { this.state = 'suspended'; this.currentTime = 0; }
      resume() { return Promise.reject(new Error('NotAllowedError')); }
    };
    const m = createMetronome();
    expect(() => m.start()).not.toThrow();
    expect(() => m.unlock()).not.toThrow();
    await new Promise((r) => setTimeout(r, 40));
    m.stop();
  });

  it('schedules clicks on the audio clock when running', () => {
    vi.useFakeTimers();
    const started = [];
    const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
    const ctx = {
      state: 'running', currentTime: 0, destination: {},
      createOscillator: () => ({ type: '', frequency: param(), connect: (n) => n, start: (t) => started.push(t), stop() {} }),
      createGain: () => ({ gain: param(), connect: (n) => n }),
    };
    globalThis.AudioContext = function () { return ctx; };
    const beats = [];
    const m = createMetronome({ bpm: 110, onBeat: (i) => beats.push(i) });
    m.start();
    for (let ms = 0; ms < 2000; ms += 25) { ctx.currentTime = ms / 1000; vi.advanceTimersByTime(25); }
    m.stop();
    expect(started.length).toBeGreaterThanOrEqual(3);
    const gaps = started.slice(1).map((t, i) => Math.round((t - started[i]) * 1000));
    expect(new Set(gaps)).toEqual(new Set([545]));
    expect(beats.length).toBeGreaterThan(0);
  });
});
