// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createEngine } from '../src/engine.js';
import { config } from '../src/config.js';

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

describe('engine on the simulator (?sim=1)', () => {
  it('gives 20 ± 1 compressions in 10 s at cpm=120, every field filled', async () => {
    const { states, events, stage } = await run('?sim=1&cpm=120', 10000);
    expect(Math.abs(events.length - 20)).toBeLessThanOrEqual(1);
    for (const e of events) {
      expect(Object.keys(e).sort()).toEqual([...EVENT_FIELDS].sort());
      for (const f of EVENT_FIELDS) expect(e[f]).not.toBeUndefined();
      expect(typeof e.elbowsLocked).toBe('boolean');
      expect(typeof e.aligned).toBe('boolean');
      expect(typeof e.fullRecoil).toBe('boolean');
      expect(e.depthCm).toBeNull();
    }
    expect(events[0].intervalMs).toBeNull();
    // Cold start with no countdown: the baseline settles during the first second.
    for (const e of events.filter((e) => e.intervalMs !== null && e.tBottom > 1500)) {
      expect(Math.abs(e.intervalMs - 500) / 500).toBeLessThan(0.08);
    }
    expect(stage.textContent).toContain('SIMULATED');

    // onState fires about every 100 ms, with the contract shape
    expect(states.length).toBeGreaterThanOrEqual(99);
    const last = states.at(-1);
    expect(Object.keys(last).sort()).toEqual([...STATE_FIELDS].sort());
    expect(events.length - last.compressions).toBeLessThanOrEqual(1);
    expect(Math.abs(last.rate - 120)).toBeLessThanOrEqual(2);
    expect(last.rateZone).toBe('good');
    expect(last.ready).toBe(true);
    expect(last.personVisible).toBe(true);
    expect(Object.keys(last.issues).sort()).toEqual(['depth', 'elbows', 'position', 'recoil']);
    expect(last.setup).toEqual({ ok: true, checks: [] });
  });

  it('a 30 s session at 110 through the whole engine: right count and rate', async () => {
    const timers = fakeTimers();
    const states = [];
    const events = [];
    const engine = createEngine({
      stage: document.createElement('div'), search: '?sim=1&cpm=110', timers,
      onState: (s) => states.push(s),
      onCompression: (e) => events.push(e),
    });
    await engine.start();
    vi.advanceTimersByTime(3000); // countdown
    engine.reset();
    engine.markRest();
    events.length = 0;
    vi.advanceTimersByTime(30000);
    engine.stop();
    expect(Math.abs(events.length - 55)).toBeLessThanOrEqual(1);
    events.forEach((e, i) => expect(e.index).toBe(i));
    const truth = 60000 / 110;
    for (const e of events.slice(1)) expect(Math.abs(e.intervalMs - truth) / truth).toBeLessThan(0.08);
    for (let i = 1; i < events.length; i++) {
      expect(events[i].tBottom - events[i - 1].tBottom).toBeGreaterThanOrEqual(config.MIN_INTERVAL_MS);
    }
    const last = states.at(-1);
    expect(Math.abs(last.compressions - events.length)).toBeLessThanOrEqual(1);
    expect(Math.abs(last.rate - 110)).toBeLessThanOrEqual(2);
    expect(last.rateZone).toBe('good');
  });

  it('cpm=90 is slow and cpm=135 is fast', async () => {
    const slow = (await run('?sim=1&cpm=90', 5000)).states.at(-1);
    expect(Math.abs(slow.rate - 90)).toBeLessThanOrEqual(2);
    expect(slow.rateZone).toBe('slow');
    const fast = (await run('?sim=1&cpm=135', 5000)).states.at(-1);
    expect(Math.abs(fast.rate - 135)).toBeLessThanOrEqual(2);
    expect(fast.rateZone).toBe('fast');
  });

  it('rate is null before three compressions', async () => {
    const { states } = await run('?sim=1&cpm=110', 600);
    expect(states.at(-1).rate).toBeNull();
    expect(states.at(-1).rateZone).toBe('none');
  });

  it('travel=0 gives no compressions', async () => {
    const { events, states } = await run('?sim=1&travel=0', 10000);
    expect(events).toHaveLength(0);
    expect(states.at(-1).compressions).toBe(0);
  });

  it('issues stay clear and form fields pass until the form checks (A4), even with bend=30&lean=25', async () => {
    const { states, events } = await run('?sim=1&bend=30&lean=25&recoil=0.6', 3000);
    expect(states.at(-1).issues).toEqual({ elbows: false, position: false, recoil: false, depth: null });
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((e) => e.elbowsLocked && e.aligned && e.fullRecoil)).toBe(true);
  });

  it('reset zeroes the count and the rate; markRest, setDebug and stop do not throw', async () => {
    const timers = fakeTimers();
    const states = [];
    const engine = createEngine({ stage: document.createElement('div'), search: '?sim=1', timers, onState: (s) => states.push(s) });
    await engine.start();
    vi.advanceTimersByTime(3000);
    expect(states.at(-1).compressions).toBeGreaterThan(0);
    expect(() => engine.setDebug(true)).not.toThrow();
    expect(() => engine.markRest()).not.toThrow();
    expect(() => engine.reset()).not.toThrow();
    vi.advanceTimersByTime(100);
    expect(states.at(-1).compressions).toBe(0);
    expect(states.at(-1).rate).toBeNull();
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
