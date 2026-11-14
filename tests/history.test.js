import { describe, it, expect } from 'vitest';
import { saveDrill, loadHistory, clearHistory, HISTORY_KEY } from '../src/history.js';
import { sampleHistory, HISTORY_KEY as FIXTURE_KEY } from './fixtures/history.js';
import { goodRelay } from './fixtures/relayStats.js';
import { config } from '../src/config.js';

function fakeStorage() {
  const data = new Map();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) };
}

describe('drill history (Contract 4)', () => {
  it('saveDrill then loadHistory returns the entry in the Contract 4 shape', () => {
    const storage = fakeStorage();
    const now = new Date('2026-11-14T16:00:00.000Z');
    const entry = saveDrill('Ward 4B', goodRelay, { storage, now, id: 'abc' });
    expect(entry).toEqual({ id: 'abc', savedAt: '2026-11-14T16:00:00.000Z', team: 'Ward 4B', stats: goodRelay });
    expect(loadHistory({ storage })).toEqual([entry]);
    expect(HISTORY_KEY).toBe(FIXTURE_KEY);
    expect(Object.keys(entry).sort()).toEqual(Object.keys(sampleHistory[0]).sort());
    expect(JSON.parse(storage.getItem('pulsecoach.history.v1'))).toEqual([entry]);
  });

  it('keeps newest first, and a 51st entry drops the oldest', () => {
    const storage = fakeStorage();
    for (let i = 1; i <= config.HISTORY_SIZE + 1; i++) saveDrill(`T${i}`, goodRelay, { storage, id: `d${i}` });
    const h = loadHistory({ storage });
    expect(config.HISTORY_SIZE).toBe(50);
    expect(h).toHaveLength(50);
    expect(h[0].id).toBe('d51');
    expect(h[h.length - 1].id).toBe('d2');
    expect(h.some((e) => e.id === 'd1')).toBe(false);
  });

  it('missing or full storage does not throw', () => {
    expect(() => saveDrill('x', goodRelay, { storage: null })).not.toThrow();
    expect(loadHistory({ storage: null })).toEqual([]);
    const full = { getItem: () => '[]', setItem: () => { throw new Error('QuotaExceededError'); }, removeItem() {} };
    expect(saveDrill('x', goodRelay, { storage: full })).toBeNull();
    const broken = { getItem: () => '{nope', setItem() {}, removeItem() {} };
    expect(loadHistory({ storage: broken })).toEqual([]);
    expect(() => clearHistory({ storage: null })).not.toThrow();
  });

  it('clearHistory empties it; ids are unique by default', () => {
    const storage = fakeStorage();
    const a = saveDrill('a', goodRelay, { storage });
    const b = saveDrill('b', goodRelay, { storage });
    expect(a.id).not.toBe(b.id);
    clearHistory({ storage });
    expect(loadHistory({ storage })).toEqual([]);
  });
});
