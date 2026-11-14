// @vitest-environment jsdom
// main.js wiring with an injected engine: start-up debug state, shortcuts, and the camera error screen.
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const fake = vi.hoisted(() => ({ opts: null, calls: [] }));
vi.mock('../src/engine.js', () => ({
  createEngine(opts) {
    fake.opts = opts;
    return {
      start: async () => fake.calls.push('start'),
      stop: () => fake.calls.push('stop'),
      reset: () => fake.calls.push('reset'),
      markRest: () => fake.calls.push('markRest'),
      setDebug: (on) => fake.calls.push(`debug:${on}`),
    };
  },
}));

const visible = (id) => !document.getElementById(id).hidden;
const press = (key, code) => window.dispatchEvent(new KeyboardEvent('keydown', { key, code }));
const assigned = [];

beforeAll(async () => {
  const html = readFileSync(resolve(import.meta.dirname, '../index.html'), 'utf8');
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)[1].replace(/<script[\s\S]*?<\/script>/g, '');
  vi.stubGlobal('location', { href: 'http://localhost:5173/', search: '', assign: (u) => assigned.push(u) });
  await import('../src/main.js');
});

describe('main wiring', () => {
  it('hides debug tools at start-up and starts the engine for the live checklist', () => {
    expect(fake.calls.slice(0, 2)).toEqual(['debug:false', 'start']);
  });

  it('D toggles debug, M mutes, B toggles the metronome', () => {
    press('d');
    expect(fake.calls.at(-1)).toBe('debug:true');
    press('d');
    expect(fake.calls.at(-1)).toBe('debug:false');
    press('m');
    expect(document.getElementById('voice-toggle').getAttribute('aria-pressed')).toBe('true');
    press('m');
    expect(document.getElementById('voice-toggle').getAttribute('aria-pressed')).toBe('false');
    press('b');
    expect(document.getElementById('metronome-toggle').getAttribute('aria-pressed')).toBe('true');
    press('b');
    expect(document.getElementById('metronome-toggle').getAttribute('aria-pressed')).toBe('false');
  });

  it('the setup checklist follows engine state on the home screen', () => {
    fake.opts.onState({
      ready: true, personVisible: true, compressions: 0, rate: null, rateZone: 'none',
      issues: { elbows: false, position: false, recoil: false, depth: null },
      setup: { ok: false, checks: [{ id: 'side-on', pass: false, hint: 'Turn so the camera sees your side' }] },
    });
    expect(document.querySelector('.checklist').hidden).toBe(false);
    expect(document.querySelector('.check-hint').textContent).toBe('Turn so the camera sees your side');
  });

  it('an injected camera error shows the error screen; Run simulator reloads with ?sim=1', () => {
    fake.opts.onError({ code: 'camera-denied', message: 'Permission denied' });
    expect(visible('screen-error')).toBe(true);
    expect(visible('screen-home')).toBe(false);
    expect(document.querySelector('.error-title').textContent).toBe('Camera blocked');
    press(' ', 'Space'); // Space does not start a session from the error screen
    expect(visible('countdown')).toBe(false);
    document.querySelector('[data-action="simulator"]').click();
    expect(assigned).toEqual(['http://localhost:5173/?sim=1']);
  });

  it('Try again restarts the engine and returns home', () => {
    fake.opts.onError({ code: 'no-camera', message: 'none' });
    const before = fake.calls.length;
    document.querySelector('#screen-error .btn-primary').click();
    expect(fake.calls.slice(before)).toEqual(['stop', 'start']);
    expect(visible('screen-home')).toBe(true);
  });
});
