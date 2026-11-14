// @vitest-environment jsdom
// The relay with an engine that has markTurn() and reports fatigue: the real simulator, wrapped.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { RELAY } from '../src/copy.js';

const fake = vi.hoisted(() => ({ markTurn: 0, slipping: false }));
vi.mock('../src/engine.js', async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    createEngine(opts) {
      const engine = real.createEngine({
        ...opts,
        onState: (s) => opts.onState({ ...s, fatigue: { slipping: fake.slipping, signs: fake.slipping ? ['shallower', 'slower'] : [] } }),
      });
      return { ...engine, markTurn: () => (fake.markTurn += 1) };
    },
  };
});

const visible = (id) => !document.getElementById(id).hidden;
let spoken = [];

async function load(search) {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] });
  const html = readFileSync(resolve(import.meta.dirname, '../index.html'), 'utf8');
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)[1].replace(/<script[\s\S]*?<\/script>/g, '');
  window.history.replaceState(null, '', search);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null, setItem() {}, removeItem() {} } });
  spoken = [];
  globalThis.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  globalThis.speechSynthesis = { cancel() {}, speak: (u) => spoken.push(u.text), getVoices: () => [] };
  fake.markTurn = 0;
  fake.slipping = false;
  await import('../src/main.js');
  document.querySelector('#screen-home .btn-primary').click();
  await vi.advanceTimersByTimeAsync(3000);
}

beforeEach(() => {});
afterEach(() => vi.useRealTimers());

describe('relay with an engine that has markTurn and fatigue', () => {
  it('calls markTurn once at the single rhythm check of a two-turn drill', async () => {
    await load('/?sim=1&turnSeconds=20');
    await vi.advanceTimersByTimeAsync(21000);
    expect(visible('switch')).toBe(true);
    expect(fake.markTurn).toBe(1);
    await vi.advanceTimersByTimeAsync(25000);
    expect(visible('screen-results')).toBe(true);
    expect(fake.markTurn).toBe(1);
  });

  it('slipping 20 s into turn 1 gives the early switch and its spoken prompt', async () => {
    await load('/?sim=1');
    await vi.advanceTimersByTimeAsync(20500);
    expect(visible('switch')).toBe(false);
    fake.slipping = true;
    expect(document.querySelector('[data-check="slipping"]').hidden).toBe(true);
    await vi.advanceTimersByTimeAsync(200);
    const chip = document.querySelector('[data-check="slipping"]');
    expect(chip.hidden).toBe(false);
    expect(chip.textContent).toBe('Slipping: smaller pushes, slower');
    await vi.advanceTimersByTimeAsync(3000);
    expect(spoken).toContain(RELAY.prompts.switchEarly);
    expect(visible('switch')).toBe(true);
    expect(fake.markTurn).toBe(1);
    expect(document.getElementById('relay-label').textContent).toBe('Compressor 2 · Turn 2 of 2');
    // Coaching cues stay quiet during the switch.
    const banner = document.querySelector('.hud-cue').textContent;
    expect(banner).toBe(RELAY.prompts.switchEarly);
  });
});
