// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createEngine } from '../src/engine.js';

const EVENT_FIELDS = [
  'index', 'tBottom', 'tTop', 'travel', 'intervalMs',
  'elbowAngleDeg', 'armLeanDeg', 'recoilRatio',
  'elbowsLocked', 'aligned', 'fullRecoil', 'depthCm',
];
const STATE_FIELDS = ['ready', 'personVisible', 'compressions', 'rate', 'rateZone', 'issues', 'setup'];

function fakeTimers() {
  vi.useFakeTimers();
  return {
    setInterval: (fn, ms) => setInterval(fn, ms),
    clearInterval: (id) => clearInterval(id),
    now: () => Date.now(),
  };
}

async function run(search, ms) {
  const timers = fakeTimers();
  const stage = document.createElement('div');
  const states = [];
  const events = [];
  const engine = createEngine({
    stage, search, timers,
    onState: (s) => states.push(s),
    onCompression: (e) => events.push(e),
    onError: () => {},
  });
  await engine.start();
  vi.advanceTimersByTime(ms);
  engine.stop();
  return { engine, stage, states, events };
}

afterEach(() => vi.useRealTimers());

describe('fake engine', () => {
  it('gives 20 ± 1 compressions in 10 s at cpm=120, every field filled', async () => {
    const { states, events, stage } = await run('?sim=1&cpm=120', 10000);
    expect(Math.abs(events.length - 20)).toBeLessThanOrEqual(1);
    for (const e of events) {
      expect(Object.keys(e).sort()).toEqual([...EVENT_FIELDS].sort());
      for (const f of EVENT_FIELDS) {
        if (f === 'depthCm') expect(e[f] === null || typeof e[f] === 'number').toBe(true);
        else expect(e[f]).not.toBeUndefined();
      }
      expect(typeof e.elbowsLocked).toBe('boolean');
      expect(e.intervalMs).toBeCloseTo(500, 0);
    }
    expect(stage.textContent).toContain('SIMULATED');

    // onState fires about every 100 ms
    expect(states.length).toBeGreaterThanOrEqual(99);
    const last = states.at(-1);
    expect(Object.keys(last).sort()).toEqual([...STATE_FIELDS].sort());
    expect(events.length - last.compressions).toBeLessThanOrEqual(1);
    expect(last.rate).toBe(120);
    expect(last.rateZone).toBe('good');
    expect(Object.keys(last.issues).sort()).toEqual(['depth', 'elbows', 'position', 'recoil']);
    expect(last.setup).toEqual({ ok: true, checks: [] });
    expect(last.issues).toEqual({ elbows: false, position: false, recoil: false, depth: null });
  });

  it('bend=30 sets issues.elbows and lean=25 sets issues.position', async () => {
    const { states, events } = await run('?sim=1&bend=30&lean=25', 3000);
    const last = states.at(-1);
    expect(last.issues.elbows).toBe(true);
    expect(last.issues.position).toBe(true);
    expect(last.issues.recoil).toBe(false);
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((e) => e.elbowsLocked === false && e.aligned === false)).toBe(true);
  });

  it('recoil under 0.85 sets issues.recoil', async () => {
    const { states, events } = await run('?sim=1&recoil=0.6', 2000);
    expect(states.at(-1).issues.recoil).toBe(true);
    expect(events.every((e) => e.fullRecoil === false)).toBe(true);
  });

  it('reports slow and fast rate zones', async () => {
    expect((await run('?sim=1&cpm=80', 3000)).states.at(-1).rateZone).toBe('slow');
    expect((await run('?sim=1&cpm=140', 3000)).states.at(-1).rateZone).toBe('fast');
  });

  it('reset, markRest, setDebug and stop do not throw', async () => {
    const timers = fakeTimers();
    const states = [];
    const engine = createEngine({ stage: document.createElement('div'), search: '?sim=1', timers, onState: (s) => states.push(s) });
    await engine.start();
    vi.advanceTimersByTime(3000);
    expect(() => engine.setDebug(true)).not.toThrow();
    expect(() => engine.markRest()).not.toThrow();
    expect(() => engine.reset()).not.toThrow();
    vi.advanceTimersByTime(100);
    expect(states.at(-1).compressions).toBe(0);
    expect(() => engine.setDebug(false)).not.toThrow();
    expect(() => engine.stop()).not.toThrow();
    expect(() => engine.stop()).not.toThrow();
  });

  it('?sim=1 draws a simulated stage, and setDebug shows and hides the chart', async () => {
    const timers = fakeTimers();
    const stage = document.createElement('div');
    const engine = createEngine({ stage, search: '?sim=1', timers });
    await engine.start();
    vi.advanceTimersByTime(1000);
    expect(stage.querySelector('.pc-stage--sim')).not.toBeNull();
    expect(stage.querySelector('.pc-stage__badge').textContent).toBe('SIMULATED');
    const chart = stage.querySelector('.pc-stage__chart');
    expect(chart.hidden).toBe(true);
    engine.setDebug(true);
    expect(chart.hidden).toBe(false);
    engine.setDebug(false);
    expect(chart.hidden).toBe(true);
    engine.stop();
  });
});
