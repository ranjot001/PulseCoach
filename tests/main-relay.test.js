// @vitest-environment jsdom
// A whole relay drill on the real page with the simulator, ?sim=1&turnSeconds=20, and fake timers.
// The scaffold's fake engine has no markTurn(): the drill must run without it.
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { RELAY } from '../src/copy.js';

const visible = (id) => !document.getElementById(id).hidden;
const spoken = [];

describe('relay drill with ?sim=1&turnSeconds=20', () => {
  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] });
    const html = readFileSync(resolve(import.meta.dirname, '../index.html'), 'utf8');
    document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)[1].replace(/<script[\s\S]*?<\/script>/g, '');
    window.history.replaceState(null, '', '/?sim=1&turnSeconds=20');
    const data = new Map();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k), clear: () => data.clear() },
    });
    globalThis.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    globalThis.speechSynthesis = { cancel() {}, speak: (u) => spoken.push(u.text), getVoices: () => [] };
    await import('../src/main.js');
  });
  afterAll(() => {
    vi.useRealTimers();
    delete globalThis.speechSynthesis;
    delete globalThis.SpeechSynthesisUtterance;
  });

  it('runs two turns with one rhythm check, then the results screen', async () => {
    const errors = vi.spyOn(console, 'error');
    const home = document.querySelector('#screen-home .btn-primary');
    expect(home.textContent).toBe('Start relay drill');
    expect(document.querySelector('#screen-home [data-action="solo"]').textContent).toBe('Solo practice · 30 s');
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' }));
    expect(visible('countdown')).toBe(true);
    await vi.advanceTimersByTimeAsync(3000);
    expect(visible('relay-label')).toBe(true);
    expect(document.getElementById('relay-label').textContent).toBe('Compressor 1 · Turn 1 of 2');

    // Turn 1 runs ~20 s from its first compression.
    await vi.advanceTimersByTimeAsync(10000);
    expect(visible('switch')).toBe(false);
    // The turn clock starts at the first compression, about half a second in.
    expect(document.getElementById('timer').textContent).toBe('11s');
    await vi.advanceTimersByTimeAsync(10700);
    expect(visible('switch')).toBe(true);
    expect(document.querySelector('.switch-text').textContent).toBe('Rhythm check: hands off');
    expect(document.getElementById('relay-label').textContent).toBe('Compressor 2 · Turn 2 of 2');
    expect(spoken).toContain(RELAY.prompts.rhythmCheck);

    await vi.advanceTimersByTimeAsync(3000);
    expect(spoken).toContain(RELAY.prompts.resume);
    // The simulator keeps pushing, so the pause ends at its next compression.
    await vi.advanceTimersByTimeAsync(700);
    expect(visible('switch')).toBe(false);

    await vi.advanceTimersByTimeAsync(20000);
    expect(visible('screen-results')).toBe(true);
    expect(spoken.filter((t) => t === RELAY.prompts.rhythmCheck)).toHaveLength(1);
    expect(spoken).not.toContain(RELAY.prompts.switchEarly);
    expect(Number(document.querySelector('.results-score-number').textContent)).toBeGreaterThan(0);
    expect(errors).not.toHaveBeenCalled();
  });
});
