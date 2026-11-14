// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createEngine } from '../src/engine.js';
import { config } from '../src/config.js';

const EVENT_FIELDS = [
  'index', 'tBottom', 'tTop', 'travel', 'intervalMs',
  'elbowAngleDeg', 'armLeanDeg', 'recoilRatio',
  'elbowsLocked', 'aligned', 'fullRecoil', 'depthCm', 'travelRatio',
];
const STATE_FIELDS = ['ready', 'personVisible', 'compressions', 'rate', 'rateZone', 'issues', 'fatigue', 'setup'];

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
    expect(last.setup.ok).toBe(true);
    expect(last.setup.checks.map((c) => c.id)).toEqual(['person', 'visible', 'side-on', 'distance', 'in-frame']);
    expect(last.setup.checks.every((c) => c.pass && typeof c.hint === 'string')).toBe(true);
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
    vi.advanceTimersByTime(1000 + 30000); // after markRest() the simulated learner rests 1 s, then 30 s of compressions
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

  // A session as the app runs it: start, countdown, reset() + markRest() at "go", then practice.
  async function practice(search, ms = 15000) {
    const timers = fakeTimers();
    const states = [];
    const events = [];
    const stage = document.createElement('div');
    const engine = createEngine({ stage, search, timers, onState: (s) => states.push(s), onCompression: (e) => events.push(e) });
    await engine.start();
    vi.advanceTimersByTime(3000);
    engine.reset();
    engine.markRest();
    events.length = 0;
    vi.advanceTimersByTime(ms);
    engine.stop();
    return { states, events, last: states.at(-1) };
  }

  it('good technique: all events pass and no issue is raised', async () => {
    const { events, last } = await practice('?sim=1');
    expect(events.length).toBeGreaterThan(20);
    expect(events.every((e) => e.elbowsLocked && e.aligned && e.fullRecoil)).toBe(true);
    expect(last.issues).toEqual({ elbows: false, position: false, recoil: false, depth: null });
  });

  it.each([
    ['bend=30', { elbows: true, position: false, recoil: false }, 'elbowsLocked'],
    ['lean=25', { elbows: false, position: true, recoil: false }, 'aligned'],
    ['recoil=0.6', { elbows: false, position: false, recoil: true }, 'fullRecoil'],
  ])('%s raises only its own issue', async (param, issues, field) => {
    const { events, last } = await practice(`?sim=1&${param}`);
    expect(last.issues).toEqual({ ...issues, depth: null });
    expect(events.filter((e) => !e[field]).length / events.length).toBeGreaterThanOrEqual(0.9);
  });

  it('bend=30 raises issues.elbows even without markRest (cold start)', async () => {
    const { states } = await run('?sim=1&bend=30', 5000);
    expect(states.at(-1).issues).toEqual({ elbows: true, position: false, recoil: false, depth: null });
  });

  it('events carry real form angles', async () => {
    const { events } = await practice('?sim=1&bend=30&lean=25', 6000);
    const e = events.at(-1);
    expect(e.elbowAngleDeg).toBeGreaterThan(140);
    expect(e.elbowAngleDeg).toBeLessThan(160);
    expect(e.armLeanDeg).toBeGreaterThan(20);
    expect(e.armLeanDeg).toBeLessThan(30);
    expect(typeof e.recoilRatio).toBe('number');
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

describe('fatigue and turns (?sim=1)', () => {
  // Engine with fake timers; returns helpers to run time and read what happened.
  async function drill(search) {
    const timers = fakeTimers();
    const states = [];
    const events = [];
    const engine = createEngine({
      stage: document.createElement('div'), search, timers,
      onState: (s) => states.push({ ...s, at: Date.now() }),
      onCompression: (e) => events.push({ ...e, at: Date.now() }),
    });
    await engine.start();
    vi.advanceTimersByTime(3000); // countdown
    engine.reset();
    engine.markRest(); // the simulated compressor starts 1 s later
    events.length = 0; // keep only the session, not the countdown
    states.length = 0;
    const turnStart = Date.now() + 1000;
    return { engine, states, events, turnStart, advance: (ms) => vi.advanceTimersByTime(ms) };
  }

  it('fatigue=0 for 60 simulated seconds: never slipping', async () => {
    const d = await drill('?sim=1&fatigue=0');
    d.advance(61000);
    d.engine.stop();
    expect(d.events.length).toBeGreaterThan(100);
    expect(d.states.every((s) => s.fatigue.slipping === false)).toBe(true);
    expect(d.states.at(-1).fatigue).toEqual({ slipping: false, signs: [] });
  });

  it("fatigue=1: slipping by 40 s into the turn, with 'shallower' among the signs", async () => {
    const d = await drill('?sim=1&fatigue=1');
    d.advance(1000 + 40000);
    d.engine.stop();
    const first = d.states.find((s) => s.fatigue.slipping);
    expect(first).toBeDefined();
    expect(first.at - d.turnStart).toBeLessThanOrEqual(40000);
    expect(first.at - d.turnStart).toBeGreaterThan(15000); // not before the compressor starts tiring
    const last = d.states.at(-1);
    expect(last.fatigue.slipping).toBe(true);
    expect(last.fatigue.signs).toContain('shallower');
  });

  it('every event carries travelRatio: null during the baseline, then near 1, then falling with fatigue', async () => {
    const d = await drill('?sim=1&fatigue=1');
    d.advance(1000 + 40000);
    d.engine.stop();
    const into = (e) => e.at - d.turnStart;
    expect(d.events.every((e) => 'travelRatio' in e)).toBe(true);
    expect(d.events.filter((e) => into(e) < 9000).every((e) => e.travelRatio === null)).toBe(true);
    const fresh = d.events.filter((e) => into(e) > 11000 && into(e) < 15000).map((e) => e.travelRatio);
    expect(fresh.length).toBeGreaterThan(3);
    for (const r of fresh) expect(r).toBeGreaterThan(0.85);
    const tired = d.events.filter((e) => into(e) > 36000).map((e) => e.travelRatio);
    for (const r of tired) expect(r).toBeLessThan(0.85);
  });

  it('after markTurn(): no compressions for about swap seconds, then counting resumes and slipping is false', async () => {
    const d = await drill('?sim=1&fatigue=1&swap=5');
    d.advance(1000 + 40000);
    expect(d.states.at(-1).fatigue.slipping).toBe(true);
    const countBefore = d.states.at(-1).compressions;
    const turnAt = Date.now();
    d.engine.markTurn();
    d.advance(100);
    expect(d.states.at(-1).fatigue).toEqual({ slipping: false, signs: [] });
    expect(d.states.at(-1).compressions).toBe(countBefore); // not zeroed
    d.advance(15000);
    d.engine.stop();
    const after = d.events.filter((e) => e.at > turnAt);
    // a stroke already under way may finish just after the call; nothing else for ~swap s
    const quiet = after.filter((e) => e.at > turnAt + 400 && e.at < turnAt + 5000);
    expect(quiet).toHaveLength(0);
    const resumed = after.filter((e) => e.at >= turnAt + 5000);
    expect(resumed.length).toBeGreaterThan(15);
    expect(resumed[0].at - turnAt).toBeLessThan(6000);
    // indexes keep counting across the turn
    const idx = d.events.map((e) => e.index);
    expect(idx).toEqual(idx.map((_, i) => i));
    expect(d.states.every((s) => s.at <= turnAt || !s.fatigue.slipping)).toBe(true);
    expect(d.states.at(-1).compressions).toBeGreaterThan(countBefore);
  });

  it('markTurn() drops the rest reference: issues behave as in A4 for the new compressor', async () => {
    const d = await drill('?sim=1&bend=30');
    d.advance(8000);
    expect(d.states.at(-1).issues.elbows).toBe(true);
    d.engine.markTurn();
    d.advance(100);
    expect(d.states.at(-1).issues).toEqual({ elbows: false, position: false, recoil: false, depth: null });
    d.advance(10000);
    d.engine.stop();
    expect(d.states.at(-1).issues).toEqual({ elbows: true, position: false, recoil: false, depth: null });
  });

  it('reset() also starts a fresh turn', async () => {
    const d = await drill('?sim=1&fatigue=1');
    d.advance(41000);
    expect(d.states.at(-1).fatigue.slipping).toBe(true);
    d.engine.reset();
    d.advance(100);
    d.engine.stop();
    expect(d.states.at(-1).fatigue).toEqual({ slipping: false, signs: [] });
  });

});

describe('setup check in the engine', () => {
  it('?sim=1 reports setup.ok within two seconds', async () => {
    const timers = fakeTimers();
    const states = [];
    const engine = createEngine({ stage: document.createElement('div'), search: '?sim=1', timers, onState: (s) => states.push({ ...s, at: Date.now() }) });
    const t0 = Date.now();
    await engine.start();
    expect(states[0].setup.ok).toBe(false); // nothing seen yet
    vi.advanceTimersByTime(2000);
    engine.stop();
    const firstOk = states.find((s) => s.setup.ok);
    expect(firstOk).toBeDefined();
    expect(firstOk.at - t0).toBeLessThanOrEqual(2000);
    expect(states.at(-1).setup.ok).toBe(true);
  });

  it('before any frame, setup is not ok and lists the five checks failing', async () => {
    const states = [];
    const engine = createEngine({
      stage: document.createElement('div'), search: '',
      mediaDevices: { getUserMedia: () => Promise.reject(Object.assign(new Error(), { name: 'NotFoundError' })) },
      onState: (s) => states.push(s),
    });
    await engine.start();
    engine.stop();
    expect(states.at(-1).setup.ok).toBe(false);
    expect(states.at(-1).setup.checks).toHaveLength(5);
    expect(states.at(-1).setup.checks[0]).toEqual({ id: 'person', pass: false, hint: 'Step into view' });
  });
});
