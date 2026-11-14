// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { getDebrief } from '../src/debrief/client.js';
import { renderDebriefCard } from '../src/debrief/card.js';
import { fallbackDebrief, fallbackRelayDebrief, NEUTRAL_TEXT } from '../src/debrief/fallback.js';
import { goodRelay, fadingRelay } from './fixtures/relayStats.js';
import { goodStats, slowStats, sloppyStats } from './fixtures/stats.js';

// The network client is mocked; by default it answers with the fallback.
vi.mock('../src/debrief/client.js', () => ({ getDebrief: vi.fn() }));

const makeContainer = () => {
  const el = document.createElement('div');
  document.body.append(el);
  return el;
};
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  getDebrief.mockReset();
  getDebrief.mockImplementation(async (stats) => ({ text: fallbackDebrief(stats), source: 'fallback' }));
});

afterEach(() => {
  document.body.replaceChildren();
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

describe('renderDebriefCard with the AI debrief', () => {
  it('keeps the quick tips when the source is fallback', async () => {
    const container = makeContainer();
    renderDebriefCard(container, slowStats);
    await flush();
    expect(getDebrief).toHaveBeenCalledWith(slowStats);
    expect(container.querySelector('.debrief-card__text').textContent).toBe(fallbackDebrief(slowStats));
    expect(container.querySelector('.debrief-card__label').textContent).toBe('Quick tips');
  });

  it('swaps in the AI text and the AI coach label when the source is ai', async () => {
    getDebrief.mockResolvedValue({ text: 'You kept a steady rhythm. Lock your elbows next time.', source: 'ai' });
    const container = makeContainer();
    renderDebriefCard(container, slowStats);
    // Quick tips first, straight away.
    expect(container.querySelector('.debrief-card__text').textContent).toBe(fallbackDebrief(slowStats));
    await flush();
    const text = container.querySelector('.debrief-card__text');
    expect(text.textContent).toBe('You kept a steady rhythm. Lock your elbows next time.');
    expect(text.classList.contains('debrief-card__text--fresh')).toBe(true);
    expect(container.querySelector('.debrief-card__label').textContent).toBe('AI coach');
  });

  it('Read aloud speaks the AI text once it has arrived', async () => {
    getDebrief.mockResolvedValue({ text: 'AI words.', source: 'ai' });
    const speak = vi.fn();
    globalThis.speechSynthesis = { speak, cancel() {} };
    globalThis.SpeechSynthesisUtterance = class {
      constructor(t) {
        this.text = t;
      }
    };
    const container = makeContainer();
    renderDebriefCard(container, goodStats);
    await flush();
    container.querySelector('button').click();
    expect(speak.mock.calls[0][0].text).toBe('AI words.');
  });

  it('does not touch a newer card when an older AI reply arrives late', async () => {
    let resolveFirst;
    getDebrief.mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)));
    const container = makeContainer();
    renderDebriefCard(container, goodStats);
    renderDebriefCard(container, sloppyStats);
    resolveFirst({ text: 'Stale words.', source: 'ai' });
    await flush();
    expect(container.querySelector('.debrief-card__text').textContent).toBe(fallbackDebrief(sloppyStats));
  });

  it('does not call the AI for invalid stats', async () => {
    renderDebriefCard(makeContainer(), { nope: true });
    await flush();
    expect(getDebrief).not.toHaveBeenCalled();
  });
});

describe('renderDebriefCard with relay stats', () => {
  it('shows the Team debrief title and the relay quick tips at once', () => {
    const container = makeContainer();
    renderDebriefCard(container, fadingRelay);
    expect(container.querySelector('.debrief-card__title').textContent).toBe('Team debrief');
    expect(container.querySelector('.debrief-card__label').textContent).toBe('Quick tips');
    expect(container.querySelector('.debrief-card__text').textContent).toBe(fallbackRelayDebrief(fadingRelay));
    expect(container.querySelector('button').textContent).toBe('Read aloud');
  });

  it('asks for the AI debrief with the clean relay stats and swaps it in', async () => {
    getDebrief.mockResolvedValue({ text: 'Team, well done. Compressor 1, good switch.', source: 'ai' });
    const container = makeContainer();
    renderDebriefCard(container, { ...goodRelay, team: 'Night shift' });
    await flush();
    const sent = getDebrief.mock.calls[0][0];
    expect(sent.mode).toBe('relay');
    expect(sent).not.toHaveProperty('team');
    expect(container.querySelector('.debrief-card__text').textContent).toBe('Team, well done. Compressor 1, good switch.');
    expect(container.querySelector('.debrief-card__label').textContent).toBe('AI coach');
    expect(container.querySelector('.debrief-card__title').textContent).toBe('Team debrief');
  });

  it('leaves solo stats unchanged', () => {
    const container = makeContainer();
    renderDebriefCard(container, goodStats);
    expect(container.querySelector('.debrief-card__title').textContent).toBe("Coach's debrief");
    expect(container.querySelector('.debrief-card__text').textContent).toBe(fallbackDebrief(goodStats));
  });

  it.each([
    ['no turns', { ...fadingRelay, turns: [] }],
    ['an unknown sign', { ...fadingRelay, turns: [{ ...fadingRelay.turns[0], signs: ['tired'] }] }],
    ['a NaN fraction', { ...fadingRelay, compressionFraction: NaN }],
    ['turns that are not objects', { ...fadingRelay, turns: [null, 'x'] }],
  ])('shows the neutral sentence for broken relay stats (%s) and does not throw', async (_name, stats) => {
    const container = makeContainer();
    expect(() => renderDebriefCard(container, stats)).not.toThrow();
    expect(container.childElementCount).toBeGreaterThan(0);
    expect(container.querySelector('.debrief-card__text').textContent).toBe(NEUTRAL_TEXT);
    await flush();
    expect(getDebrief).not.toHaveBeenCalled();
  });
});
