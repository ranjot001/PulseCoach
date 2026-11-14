// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createLeaderboard, renderLeaderboard, cleanName, STORAGE_KEY } from '../src/ui/leaderboard.js';

function fakeStorage() {
  const data = new Map();
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
}

describe('leaderboard store', () => {
  it('sorts by score, keeps only 10, and survives a reload', () => {
    const storage = fakeStorage();
    const lb = createLeaderboard(storage);
    const scores = [40, 95, 12, 77, 88, 63, 50, 99, 20, 71, 85, 30];
    for (const [i, score] of scores.entries()) lb.add({ name: `p${i}`, score, avgRate: 110, date: `d${i}` });
    // "Reload": a fresh leaderboard over the same storage.
    const reloaded = createLeaderboard(storage).load();
    expect(reloaded).toHaveLength(10);
    expect(reloaded.map((e) => e.score)).toEqual([99, 95, 88, 85, 77, 71, 63, 50, 40, 30]);
    expect(reloaded[0]).toEqual({ name: 'p7', score: 99, avgRate: 110, date: 'd7', mode: 'solo' });
    expect(JSON.parse(storage.getItem(STORAGE_KEY))).toHaveLength(10);
  });

  it('caps names at 12 characters and names blanks Anonymous', () => {
    expect(cleanName('Alexandria-Rose')).toBe('Alexandria-R');
    expect(cleanName('   ')).toBe('Anonymous');
  });

  it('reset clears the board; bad stored data does not throw', () => {
    const storage = fakeStorage();
    const lb = createLeaderboard(storage);
    lb.add({ name: 'a', score: 50, avgRate: 100 });
    lb.reset();
    expect(lb.load()).toEqual([]);
    storage.setItem(STORAGE_KEY, '{not json');
    expect(lb.load()).toEqual([]);
    expect(createLeaderboard(null).load()).toEqual([]);
  });
});

describe('renderLeaderboard', () => {
  it('a name containing <b> appears as literal text', () => {
    const lb = createLeaderboard(fakeStorage());
    const entries = lb.add({ name: '<b>Bo</b>', score: 80, avgRate: 110 });
    const root = document.createElement('div');
    renderLeaderboard(root, { entries });
    const name = root.querySelector('.lb-name');
    expect(name.textContent).toBe('<b>Bo</b>'.slice(0, 12));
    expect(root.querySelector('b')).toBeNull();
  });

  it('Reset asks for confirmation first', () => {
    const root = document.createElement('div');
    let resets = 0;
    let answer = false;
    const asked = [];
    renderLeaderboard(root, {
      entries: [{ name: 'a', score: 1, avgRate: 1, date: 'x' }],
      onReset: () => resets++,
      confirm: (m) => { asked.push(m); return answer; },
    });
    const btn = root.querySelector('button');
    btn.click();
    expect(asked).toHaveLength(1);
    expect(resets).toBe(0);
    answer = true;
    btn.click();
    expect(resets).toBe(1);
  });
});

describe('leaderboard modes', () => {
  it('relay entries show a Relay tag and the compression fraction; old entries without a mode count as solo', () => {
    const storage = fakeStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify([{ name: 'Old', score: 70, avgRate: 105, date: 'x' }]));
    const lb = createLeaderboard(storage);
    const entries = lb.add({ name: 'Team A', score: 90, avgRate: 111, mode: 'relay', compressionFraction: 92 });
    expect(entries[0]).toMatchObject({ name: 'Team A', mode: 'relay', compressionFraction: 92 });
    const root = document.createElement('div');
    renderLeaderboard(root, { entries });
    const [relay, old] = root.querySelectorAll('li');
    expect(relay.dataset.mode).toBe('relay');
    expect(relay.querySelector('.lb-tag').textContent).toBe('Relay');
    expect(relay.querySelector('.lb-rate').textContent).toBe('CCF 92%');
    expect(old.dataset.mode).toBe('solo');
    expect(old.querySelector('.lb-tag').textContent).toBe('');
    expect(old.querySelector('.lb-rate').textContent).toBe('105/min');
  });
});
