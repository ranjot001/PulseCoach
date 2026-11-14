// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderResults, breakdownRows, barStatus } from '../src/ui/results.js';
import { goodStats, slowStats, sloppyStats } from './fixtures/stats.js';

describe('results screen', () => {
  it('shows score, grade, a bar per component and the debrief card', () => {
    const root = document.createElement('div');
    renderResults(root, slowStats, { onSave() {}, onRetry() {} });
    expect(root.querySelector('.results-score-number').textContent).toBe('52');
    expect(root.querySelector('.results-grade').textContent).toBe('Getting there');
    expect([...root.querySelectorAll('.results-bar')].map((b) => b.dataset.row)).toEqual(['rate', 'elbows', 'position', 'recoil']);
    expect(root.querySelector('[data-row="rate"] .results-bar-value').textContent).toBe('avg 86/min');
    expect(root.querySelector('[data-row="rate"]').classList.contains('status-bad')).toBe(true);
    // Whatever Track C's card renders, the container is not empty.
    expect(root.querySelector('.results-debrief').textContent.length).toBeGreaterThan(0);
  });

  it('labels depth "Estimated depth" only when it was measured', () => {
    expect(breakdownRows(goodStats).some((r) => r.id === 'depth')).toBe(false);
    const depth = breakdownRows(sloppyStats).find((r) => r.id === 'depth');
    expect(depth).toMatchObject({ label: 'Estimated depth', value: '4.2 cm', status: 'bad' });
  });

  it('bar colours', () => {
    expect(barStatus(95)).toBe('good');
    expect(barStatus(60)).toBe('warn');
    expect(barStatus(10)).toBe('bad');
  });

  it('save passes the name once; Try again calls onRetry', () => {
    const root = document.createElement('div');
    const saved = [];
    let retries = 0;
    renderResults(root, goodStats, { onSave: (n) => saved.push(n), onRetry: () => retries++ });
    root.querySelector('.results-name').value = 'Sam';
    const form = root.querySelector('form');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(saved).toEqual(['Sam']);
    root.querySelector('.btn-primary').click();
    expect(retries).toBe(1);
  });
});
