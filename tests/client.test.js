import { describe, it, expect, vi, afterEach } from 'vitest';
import { getDebrief } from '../src/debrief/client.js';
import { fallbackDebrief } from '../src/debrief/fallback.js';
import { goodStats, slowStats } from './fixtures/stats.js';

const okFetch = (body) => vi.fn(async () => ({ ok: true, status: 200, json: async () => body }));

afterEach(() => {
  vi.useRealTimers();
});

describe('getDebrief', () => {
  it('returns the AI text on success and posts only the stats', async () => {
    const fetchImpl = okFetch({ text: '  You did well. Keep going.  ' });
    const result = await getDebrief(slowStats, { fetchImpl });
    expect(result).toEqual({ text: 'You did well. Keep going.', source: 'ai' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('/api/debrief');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(slowStats);
  });

  it('returns the fallback on a timeout', async () => {
    vi.useFakeTimers();
    let aborted = false;
    const fetchImpl = vi.fn(
      (_url, { signal }) =>
        new Promise((_, reject) => {
          signal?.addEventListener('abort', () => {
            aborted = true;
            reject(new Error('aborted'));
          });
        }),
    );
    const pending = getDebrief(slowStats, { fetchImpl, timeoutMs: 6000 });
    await vi.advanceTimersByTimeAsync(6000);
    await expect(pending).resolves.toEqual({ text: fallbackDebrief(slowStats), source: 'fallback' });
    expect(aborted).toBe(true);
  });

  it('returns the fallback on a 500', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({ error: 'x' }) }));
    expect(await getDebrief(slowStats, { fetchImpl })).toEqual({ text: fallbackDebrief(slowStats), source: 'fallback' });
  });

  it('returns the fallback on a network error', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    expect(await getDebrief(goodStats, { fetchImpl })).toEqual({ text: fallbackDebrief(goodStats), source: 'fallback' });
  });

  it.each([
    ['no text', {}],
    ['empty text', { text: '  ' }],
    ['a non-string', { text: 42 }],
    ['an over-long reply', { text: 'x'.repeat(5000) }],
  ])('returns the fallback for a reply with %s', async (_name, body) => {
    expect((await getDebrief(goodStats, { fetchImpl: okFetch(body) })).source).toBe('fallback');
  });

  it('returns the fallback when the JSON is broken, and never throws even for bad stats', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('bad'); } }));
    expect((await getDebrief(goodStats, { fetchImpl })).source).toBe('fallback');
    const res = await getDebrief(undefined, { fetchImpl: vi.fn(async () => { throw new Error('x'); }) });
    expect(res.source).toBe('fallback');
    expect(res.text.length).toBeGreaterThan(0);
  });

  it('returns the fallback when fetch is unavailable', async () => {
    expect((await getDebrief(goodStats, { fetchImpl: undefined })).source).toBe('fallback');
  });
});
