// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { config } from '../src/config.js';
import { barView, createPushBars } from '../src/ui/pushBars.js';
import { createEngine, pushBarsLabel } from '../src/engine.js';

afterEach(() => vi.useRealTimers());

describe('barView', () => {
  it("null gives 'base'", () => {
    expect(barView(null, config).tone).toBe('base');
  });
  it("1 gives 'ok' at 70%", () => {
    expect(barView(1, config)).toEqual({ heightPct: 70, tone: 'ok' });
  });
  it("0.79 gives 'low' with the default threshold; 0.8 is the edge", () => {
    expect(config.FATIGUE_TRAVEL_DROP).toBe(0.2);
    expect(barView(0.79, config).tone).toBe('low');
    expect(barView(0.79, config).heightPct).toBeCloseTo(55.3);
    expect(barView(0.8, config).tone).toBe('low');
    expect(barView(0.81, config).tone).toBe('ok');
  });
  it('2 is capped at 100%', () => {
    expect(barView(2, config)).toEqual({ heightPct: 100, tone: 'ok' });
  });
});

describe('createPushBars', () => {
  const bars = (c) => [...c.querySelectorAll('.pc-bars__bar')];

  it(`50 pushes keep only PUSH_BARS (${config.PUSH_BARS}) bars, newest on the right; clear() empties it`, () => {
    const c = document.createElement('div');
    const strip = createPushBars(c, config);
    for (let i = 0; i < 50; i++) strip.push({ travel: 0.1, travelRatio: i === 49 ? 0.5 : 1 });
    expect(bars(c)).toHaveLength(config.PUSH_BARS);
    expect(bars(c).at(-1).dataset.tone).toBe('low'); // the newest is last
    strip.clear();
    expect(bars(c)).toHaveLength(0);
  });

  it('has the heading, a dashed "your start" line at 70%, and a label', () => {
    const c = document.createElement('div');
    const strip = createPushBars(c, config);
    expect(c.querySelector('.pc-bars__title').textContent).toBe('Push size vs your start');
    const ref = c.querySelector('.pc-bars__ref');
    expect(ref.textContent).toBe('your start');
    expect(ref.style.bottom).toBe('70%');
    strip.setLabel('Smaller pushes', 'warn');
    expect(c.querySelector('.pc-bars__label').textContent).toBe('Smaller pushes');
    expect(c.querySelector('.pc-bars__label').dataset.tone).toBe('warn');
  });

  it('while the baseline is set, bars are base and sized by raw travel against the largest so far', () => {
    const c = document.createElement('div');
    const strip = createPushBars(c, config);
    strip.push({ travel: 0.1, travelRatio: null });
    strip.push({ travel: 0.05, travelRatio: null });
    strip.push({ travel: 0.2, travelRatio: null });
    const [a, b, d] = bars(c);
    expect([a, b, d].every((x) => x.dataset.tone === 'base')).toBe(true);
    const h = (x) => parseFloat(x.style.height);
    expect(h(a)).toBeCloseTo(70);
    expect(h(b)).toBeCloseTo(35);
    expect(h(d)).toBeCloseTo(70);
  });

  it('colours come from the CSS variables', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const css = readFileSync(resolve(import.meta.dirname, '../src/ui/stage.css'), 'utf8');
    expect(css).toMatch(/\.pc-bars__bar\s*\{[^}]*background:\s*var\(--good\)/);
    expect(css).toMatch(/\.pc-bars__bar--base\s*\{[^}]*background:\s*var\(--muted\)/);
    expect(css).toMatch(/\.pc-bars__bar--low\s*\{[^}]*background:\s*var\(--warn\)/);
  });
});

describe('pushBarsLabel', () => {
  it('baseline, nothing, then the signs in plain words', () => {
    expect(pushBarsLabel({ slipping: false, signs: [] }, false)).toEqual({ text: 'Setting your baseline', tone: 'muted' });
    expect(pushBarsLabel({ slipping: false, signs: [] }, true)).toEqual({ text: '', tone: null });
    expect(pushBarsLabel({ slipping: true, signs: ['shallower', 'slower', 'elbows'] }, true)).toEqual({
      text: 'Smaller pushes · Slower · Elbows bending',
      tone: 'warn',
    });
  });
});

describe('push-size strip in the engine', () => {
  async function drill(search) {
    vi.useFakeTimers();
    const timers = { setInterval: (f, m) => setInterval(f, m), clearInterval: (i) => clearInterval(i), now: () => Date.now() };
    const stage = document.createElement('div');
    const engine = createEngine({ stage, search, timers });
    await engine.start(); // debug is off by default
    vi.advanceTimersByTime(3000);
    engine.reset();
    engine.markRest();
    const tones = () => [...stage.querySelectorAll('.pc-bars__bar')].map((b) => b.dataset.tone);
    const label = () => stage.querySelector('.pc-bars__label');
    return { engine, stage, tones, label, advance: (ms) => vi.advanceTimersByTime(ms) };
  }

  it('is present when debug is off, with a LIVE or SIMULATED badge', async () => {
    const d = await drill('?sim=1');
    expect(d.stage.querySelector('.pc-bars')).not.toBeNull();
    expect(d.stage.querySelector('.pc-stage__chart').hidden).toBe(true); // debug off
    expect(d.stage.querySelector('.pc-stage__badge').textContent).toBe('SIMULATED');
    d.engine.stop();
    const live = document.createElement('div');
    const cam = createEngine({ stage: live, search: '', mediaDevices: { getUserMedia: () => Promise.reject(Object.assign(new Error(), { name: 'NotFoundError' })) } });
    await cam.start();
    expect(live.querySelector('.pc-bars')).not.toBeNull();
    expect(live.querySelector('.pc-stage__badge').textContent).toBe('LIVE');
    cam.stop();
  });

  it("?sim=1: base bars while the baseline is set, then every bar is 'ok'", async () => {
    const d = await drill('?sim=1');
    d.advance(1000 + 5000);
    expect(d.tones().length).toBeGreaterThan(5);
    expect(d.tones().every((t) => t === 'base')).toBe(true);
    expect(d.label().textContent).toBe('Setting your baseline');
    d.advance(25000);
    d.engine.stop();
    const tones = d.tones();
    expect(tones).toHaveLength(config.PUSH_BARS);
    const after = tones.slice(tones.lastIndexOf('base') + 1);
    expect(after.length).toBeGreaterThan(15);
    expect(after.every((t) => t === 'ok')).toBe(true);
    expect(d.label().textContent).toBe('');
  });

  it("?sim=1&fatigue=1: 'low' bars and a warn label by 40 s, empty right after markTurn()", async () => {
    const d = await drill('?sim=1&fatigue=1');
    d.advance(1000 + 40000);
    expect(d.tones()).toContain('low');
    expect(d.tones().slice(-3).every((t) => t === 'low')).toBe(true);
    expect(d.label().dataset.tone).toBe('warn');
    expect(d.label().textContent).toContain('Smaller pushes');
    d.engine.markTurn();
    expect(d.tones()).toHaveLength(0);
    d.advance(100);
    expect(d.label().textContent).toBe('Setting your baseline');
    d.engine.stop();
  });

  it('reset() clears the strip', async () => {
    const d = await drill('?sim=1');
    d.advance(5000);
    expect(d.tones().length).toBeGreaterThan(0);
    d.engine.reset();
    expect(d.tones()).toHaveLength(0);
    d.engine.stop();
  });
});
