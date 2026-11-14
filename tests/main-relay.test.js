// @vitest-environment jsdom
// A whole relay drill on the real page with the simulator, ?sim=1&turnSeconds=20, and fake timers.
// Runs on the real engine (A5+). &swap=0 keeps the simulated compressor pushing through the
// rhythm check, so the test can check that those pushes count for no turn.
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
    window.history.replaceState(null, '', '/?sim=1&turnSeconds=20&swap=0');
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

  it('runs two turns with one rhythm check, then the relay results screen', async () => {
    const errors = vi.spyOn(console, 'error');
    await vi.advanceTimersByTimeAsync(1500); // A6: let the setup check see a second of good frames
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
    // The turn clock starts at the first compression, about 1.6 s in with the real engine
    // (the simulated compressor kneels still for a second after Go), so the switch is at about 21.6 s.
    expect(document.getElementById('timer').textContent).toBe('12s');
    await vi.advanceTimersByTimeAsync(12000);
    expect(visible('switch')).toBe(true);
    expect(document.querySelector('.switch-text').textContent).toBe('Rhythm check: hands off');
    expect(document.getElementById('relay-label').textContent).toBe('Compressor 2 · Turn 2 of 2');
    expect(spoken).toContain(RELAY.prompts.rhythmCheck);
    // The flow meter falls during the switch: the rhythm check ignores the simulator's pushes.
    const flowAt = () => Number(document.querySelector('.hud-flow').dataset.value);
    expect(document.querySelector('.switch-flow .flow-note').textContent).toBe('illustration, not a measurement');
    const flowBefore = flowAt();
    expect(flowBefore).toBeGreaterThan(70);
    await vi.advanceTimersByTimeAsync(2500);
    expect(flowAt()).toBeLessThan(flowBefore);
    expect(Number(document.querySelector('.switch-flow').dataset.value)).toBe(flowAt());

    await vi.advanceTimersByTimeAsync(500);
    expect(spoken).toContain(RELAY.prompts.resume);
    // The simulator keeps pushing, so the pause ends at its next compression.
    await vi.advanceTimersByTimeAsync(700);
    expect(visible('switch')).toBe(false);

    await vi.advanceTimersByTimeAsync(20000);
    expect(visible('screen-results')).toBe(true);
    expect(spoken.filter((t) => t === RELAY.prompts.rhythmCheck)).toHaveLength(1);
    expect(spoken).not.toContain(RELAY.prompts.switchEarly);
    expect(Number(document.querySelector('.results-score-number').textContent)).toBeGreaterThan(0);
    // The relay results screen: compression fraction, one switch, one column per turn.
    expect(document.querySelector('#screen-results .relay-ccf')).not.toBeNull();
    expect(document.querySelectorAll('#screen-results .relay-switch')).toHaveLength(1);
    expect(document.querySelectorAll('#screen-results .relay-turn')).toHaveLength(2);
    expect(Number(document.querySelector('.relay-ccf-number').textContent.replace('%', ''))).toBeGreaterThan(80);
    // The last live "On the chest" value equals the result.
    expect(document.querySelector('.hud-chest-number').textContent).toBe(document.querySelector('.relay-ccf-number').textContent);
    // The drill timeline is on screen: one line per compressor and the switch band.
    const chart = document.querySelector('#screen-results .timeline-svg');
    expect(chart).not.toBeNull();
    expect(document.querySelector('#screen-results .timeline .label').textContent).toBe('Push size through the drill, each compressor against their own start');
    expect(chart.querySelectorAll('path.tl-c1')).toHaveLength(1);
    expect(chart.querySelectorAll('path.tl-c2')).toHaveLength(1);
    expect(chart.querySelectorAll('rect.tl-pause').length).toBeGreaterThanOrEqual(1);

    // A team name with markup is saved and shown as literal text, tagged Relay.
    document.querySelector('#screen-results .results-name').value = '<b>x</b>';
    document.querySelector('#screen-results .results-save').dispatchEvent(new Event('submit', { cancelable: true }));
    const li = document.querySelector('#screen-results .leaderboard-list li');
    expect(li.querySelector('.lb-name').textContent).toBe('<b>x</b>');
    expect(li.querySelector('b')).toBeNull();
    expect(li.querySelector('.lb-tag').textContent).toBe('Relay');
    expect(JSON.parse(localStorage.getItem('pulsecoach.leaderboard.v1'))[0]).toMatchObject({ name: '<b>x</b>', mode: 'relay' });
    // Saving a team name also saves the drill to the history (Contract 4).
    const history = JSON.parse(localStorage.getItem('pulsecoach.history.v1'));
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ team: '<b>x</b>', stats: { mode: 'relay' } });
    expect(errors).not.toHaveBeenCalled();
  });
});
