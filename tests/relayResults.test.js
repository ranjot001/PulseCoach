// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderRelayResults, ccfStatus, switchStatus, switchRows, turnSlipLine, clockTime } from '../src/ui/relayResults.js';
import { goodRelay, slowSwitchRelay, fadingRelay } from './fixtures/relayStats.js';

function render(stats, opts = {}) {
  const root = document.createElement('div');
  renderRelayResults(root, stats, { onSave() {}, onRetry() {}, ...opts });
  return root;
}

describe('relay results', () => {
  it.each([['goodRelay', goodRelay], ['slowSwitchRelay', slowSwitchRelay], ['fadingRelay', fadingRelay]])('renders %s without throwing', (_, stats) => {
    const root = render(stats);
    expect(root.querySelector('.results-score-number').textContent).toBe(String(stats.score));
    expect(root.querySelector('.relay-ccf-number').textContent).toBe(`${stats.compressionFraction}%`);
    expect(root.querySelectorAll('.relay-turn')).toHaveLength(stats.turns.length);
    expect(root.querySelector('.results-debrief').textContent.length).toBeGreaterThan(0);
  });

  it('slowSwitchRelay shows a red pause and an amber compression fraction', () => {
    const root = render(slowSwitchRelay);
    const sw = root.querySelector('.relay-switch');
    expect(sw.classList.contains('status-bad')).toBe(true);
    expect(sw.querySelector('.relay-switch-sec').textContent).toBe('18.2 s');
    expect(root.querySelector('.relay-ccf').classList.contains('status-warn')).toBe(true);
  });

  it('fadingRelay shows "early switch" and a slipping time for compressor 1', () => {
    const root = render(fadingRelay);
    expect(root.querySelector('.relay-early').textContent).toBe('early switch');
    const [c1, c2] = root.querySelectorAll('.relay-turn');
    expect(c1.querySelector('.relay-turn-title').textContent).toBe('Compressor 1');
    expect(c1.querySelector('.relay-turn-slip').textContent).toBe('Started slipping at 0:24: smaller pushes, slower');
    expect(c1.querySelector('.relay-turn-slip').classList.contains('status-warn')).toBe(true);
    expect(c2.querySelector('.relay-turn-slip').textContent).toBe('Held form for the whole turn');
    expect(c2.querySelector('.relay-turn-slip').classList.contains('status-good')).toBe(true);
  });

  it('goodRelay is green with the 80% target marked', () => {
    const root = render(goodRelay);
    expect(root.querySelector('.relay-ccf').classList.contains('status-good')).toBe(true);
    expect(root.querySelector('.relay-ccf-target').style.left).toBe('80%');
    expect(root.querySelector('.relay-switch').classList.contains('status-good')).toBe(true);
    expect(root.querySelector('.relay-early')).toBeNull();
  });

  it('uses the exact list of pauses when the page passes one', () => {
    const root = render({ ...goodRelay, switches: 3 }, { pauses: [{ sec: 4, early: false }, { sec: 7.5, early: true }, { sec: 11, early: false }] });
    const rows = [...root.querySelectorAll('.relay-switch')];
    expect(rows.map((r) => [...r.classList].find((c) => c.startsWith('status-')))).toEqual(['status-good', 'status-warn', 'status-bad']);
    expect(rows[1].querySelector('.relay-early')).not.toBeNull();
    expect(switchRows({ ...goodRelay, switches: 3 })[0].label).toBe('Average switch');
  });

  it('colour helpers and time format', () => {
    expect([80, 79, 60, 59].map((p) => ccfStatus(p))).toEqual(['good', 'warn', 'warn', 'bad']);
    expect([5, 5.1, 10, 10.1].map((s) => switchStatus(s))).toEqual(['good', 'warn', 'warn', 'bad']);
    expect(clockTime(24)).toBe('0:24');
    expect(clockTime(75)).toBe('1:15');
    expect(turnSlipLine({ slippedAtSec: 5, signs: [] }).text).toBe('Started slipping at 0:05');
  });

  it('Save sends the team name once; Try again calls onRetry', () => {
    const saved = [];
    let retries = 0;
    const root = render(goodRelay, { onSave: (n) => saved.push(n), onRetry: () => retries++ });
    root.querySelector('.results-name').value = 'Team A';
    const form = root.querySelector('form');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(saved).toEqual(['Team A']);
    root.querySelector('[data-action="retry"]').click();
    expect(retries).toBe(1);
  });
});
