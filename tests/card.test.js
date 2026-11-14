// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderDebriefCard } from '../src/debrief/card.js';
import { fallbackDebrief } from '../src/debrief/fallback.js';
import { goodStats, slowStats, sloppyStats } from './fixtures/stats.js';

const makeContainer = () => document.createElement('div');

afterEach(() => {
  delete globalThis.speechSynthesis;
  delete globalThis.SpeechSynthesisUtterance;
});

describe('renderDebriefCard', () => {
  it('has the Contract 3 signature (container, stats)', () => {
    expect(renderDebriefCard.length).toBe(2);
  });

  it('shows the title, the Quick tips label, the fallback text and a Read aloud button at once', () => {
    const container = makeContainer();
    const result = renderDebriefCard(container, slowStats);
    expect(result).toBeUndefined(); // synchronous: the text is there straight away
    expect(container.querySelector('.debrief-card__title').textContent).toBe("Coach's debrief");
    expect(container.querySelector('.debrief-card__label').textContent).toBe('Quick tips');
    expect(container.querySelector('.debrief-card__text').textContent).toBe(fallbackDebrief(slowStats));
    expect(container.querySelector('button').textContent).toBe('Read aloud');
  });

  it('shows a different debrief for each fixture and replaces the previous card', () => {
    const container = makeContainer();
    const texts = [goodStats, slowStats, sloppyStats].map((stats) => {
      renderDebriefCard(container, stats);
      expect(container.querySelectorAll('.debrief-card').length).toBe(1);
      return container.querySelector('.debrief-card__text').textContent;
    });
    expect(new Set(texts).size).toBe(3);
  });

  it.each([
    ['undefined', undefined], ['null', null], ['a string', 'nope'], ['an empty object', {}],
    ['NaN score', { ...goodStats, score: NaN }], ['bad rateTrend', { ...goodStats, rateTrend: 'wobbly' }],
    ['out-of-range value', { ...goodStats, pctRecoil: 140 }],
  ])('does not throw and shows one neutral sentence for invalid stats: %s', (_name, stats) => {
    const container = makeContainer();
    expect(() => renderDebriefCard(container, stats)).not.toThrow();
    expect(container.childElementCount).toBeGreaterThan(0);
    const text = container.querySelector('.debrief-card__text').textContent;
    expect(text.length).toBeGreaterThan(0);
    expect((text.match(/[.!?](?=\s|$)/g) || []).length).toBe(1);
    expect(container.querySelector('.debrief-card__title').textContent).toBe("Coach's debrief");
  });

  it('does not throw when the container is missing', () => {
    expect(() => renderDebriefCard(null, goodStats)).not.toThrow();
    expect(() => renderDebriefCard(undefined, goodStats)).not.toThrow();
  });

  it('never renders stats as HTML', () => {
    const container = makeContainer();
    renderDebriefCard(container, { ...goodStats, grade: '<img src=x onerror=alert(1)>' });
    expect(container.querySelector('img')).toBeNull();
  });

  it('Read aloud does nothing when speech is unavailable', () => {
    const container = makeContainer();
    renderDebriefCard(container, goodStats);
    expect(globalThis.speechSynthesis).toBeUndefined();
    expect(() => container.querySelector('button').click()).not.toThrow();
  });

  it('Read aloud speaks the card text when speech is available', () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    globalThis.speechSynthesis = { speak, cancel };
    globalThis.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text;
      }
    };
    const container = makeContainer();
    renderDebriefCard(container, sloppyStats);
    container.querySelector('button').click();
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0].text).toBe(fallbackDebrief(sloppyStats));
  });

  it('Read aloud survives a speech engine that throws', () => {
    globalThis.speechSynthesis = { cancel() {}, speak() { throw new Error('boom'); } };
    globalThis.SpeechSynthesisUtterance = class {};
    const container = makeContainer();
    renderDebriefCard(container, goodStats);
    expect(() => container.querySelector('button').click()).not.toThrow();
  });
});
