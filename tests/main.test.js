// @vitest-environment jsdom
// The whole practice loop on the real page with ?sim=1, driven by fake timers: no reloads.
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from '../src/config.js';

const visible = (id) => !document.getElementById(id).hidden;

describe('practice loop with ?sim=1', () => {
  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] });
    const html = readFileSync(resolve(import.meta.dirname, '../index.html'), 'utf8');
    document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)[1].replace(/<script[\s\S]*?<\/script>/g, '');
    window.history.replaceState(null, '', '/?sim=1');
    // Node's experimental global localStorage can shadow jsdom's; install a plain in-memory one.
    const data = new Map();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k), clear: () => data.clear() },
    });
    await import('../src/main.js');
  });
  afterAll(() => vi.useRealTimers());

  it('runs Start → countdown → practice → results → Try again → countdown', async () => {
    let loads = 0;
    window.addEventListener('beforeunload', () => loads++);

    expect(visible('screen-home')).toBe(true);
    expect(document.querySelector('#screen-home').textContent).toContain('Practice for adult hands-only CPR');
    // Debug output is hidden until D is pressed (checked on the scaffold's fake engine panel when present).
    const debugLine = document.querySelector('.fake-engine-panel > div:nth-child(2)');
    if (debugLine) {
      expect(debugLine.hidden).toBe(true);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
      expect(debugLine.hidden).toBe(false);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
      expect(debugLine.hidden).toBe(true);
    }
    document.querySelector('#screen-home .btn-primary').click();

    expect(visible('countdown')).toBe(true);
    expect(document.getElementById('countdown-number').textContent).toBe('3');
    await vi.advanceTimersByTimeAsync(1000);
    expect(document.getElementById('countdown-number').textContent).toBe('2');
    await vi.advanceTimersByTimeAsync(2000);

    expect(visible('countdown')).toBe(false);
    expect(visible('screen-session')).toBe(true);
    expect(document.getElementById('timer').textContent).toBe(`${config.SESSION_SECONDS}s`);
    expect(document.getElementById('metronome-toggle').getAttribute('aria-pressed')).toBe('true');
    await vi.advanceTimersByTimeAsync(10000);
    expect(document.getElementById('timer').textContent).toBe('20s');

    await vi.advanceTimersByTimeAsync(20200);
    expect(visible('screen-results')).toBe(true);
    expect(document.getElementById('metronome-toggle').getAttribute('aria-pressed')).toBe('false');
    const score = Number(document.querySelector('.results-score-number').textContent);
    expect(score).toBeGreaterThanOrEqual(90); // sim defaults: 110/min, good form
    expect(document.querySelector('.results-debrief').textContent.length).toBeGreaterThan(0);

    // Save a name containing markup: it shows as literal text.
    document.querySelector('.results-name').value = '<b>Bo</b>';
    document.querySelector('.results-save').dispatchEvent(new Event('submit', { cancelable: true }));
    const name = document.querySelector('#screen-results .lb-name');
    expect(name.textContent).toBe('<b>Bo</b>');
    expect(document.querySelector('#screen-results .leaderboard b')).toBeNull();
    expect(JSON.parse(localStorage.getItem('pulsecoach.leaderboard.v1'))[0]).toMatchObject({ name: '<b>Bo</b>', score });

    // Space on the results screen restarts.
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' }));
    expect(visible('countdown')).toBe(true);
    expect(visible('screen-results')).toBe(false);
    await vi.advanceTimersByTimeAsync(3000 + config.SESSION_SECONDS * 1000 + 200);
    expect(visible('screen-results')).toBe(true);

    // Try again button also restarts.
    document.querySelector('#screen-results .btn-primary').click();
    expect(visible('countdown')).toBe(true);
    expect(loads).toBe(0);
  });
});
