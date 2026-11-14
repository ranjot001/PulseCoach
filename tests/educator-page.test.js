// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderEducator } from '../src/educator/page.js';
import { fallbackRelayDebrief } from '../src/debrief/fallback.js';
import { sampleHistory, HISTORY_KEY } from './fixtures/history.js';

function memoryStorage(initial) {
  const map = new Map(initial === undefined ? [] : [[HISTORY_KEY, initial]]);
  return {
    getItem: vi.fn((k) => (map.has(k) ? map.get(k) : null)),
    setItem: vi.fn((k, v) => map.set(k, String(v))),
    removeItem: vi.fn((k) => map.delete(k)),
    map,
  };
}

function mount(storage, win = {}) {
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  renderEducator(root, { storage, win: { confirm: () => true, print: vi.fn(), ...win } });
  return root;
}

const rows = (root) => [...root.querySelectorAll('tbody tr.drill-row')];
const text = (root, sel) => root.querySelector(sel)?.textContent;

describe('educator view', () => {
  it('shows the heading and a link back to the drill', () => {
    const root = mount(memoryStorage(JSON.stringify(sampleHistory)));
    expect(text(root, 'h1')).toBe('Educator view');
    expect(root.querySelector('a.back').getAttribute('href')).toBe('/');
  });

  it('shows one table row per stored entry, newest first', () => {
    const root = mount(memoryStorage(JSON.stringify(sampleHistory)));
    expect(rows(root)).toHaveLength(6);
    expect(rows(root).map((r) => r.dataset.id)).toEqual(['d6', 'd5', 'd4', 'd3', 'd2', 'd1']);
    expect(root.querySelector('.sample-banner')).toBeNull();
  });

  it('shows four tiles with the summary numbers', () => {
    const root = mount(memoryStorage(JSON.stringify(sampleHistory)));
    const tiles = [...root.querySelectorAll('.tile')];
    expect(tiles).toHaveLength(4);
    expect(tiles.map((t) => t.querySelector('.big').textContent)).toEqual(['6', '4 of 6', '4 of 6', '0:24']);
    expect(tiles[1].querySelector('.label').textContent).toBe('Met 80% on the chest');
    expect(tiles[2].querySelector('.label').textContent).toBe('Switches under 10 s');
  });

  it('colours table numbers with the status classes', () => {
    const root = mount(memoryStorage(JSON.stringify(sampleHistory)));
    const d3 = rows(root).find((r) => r.dataset.id === 'd3'); // slowSwitchRelay: 79% on the chest, 18.2 s switch
    const cells = [...d3.querySelectorAll('td')];
    expect(cells[3].textContent).toBe('79%');
    expect(cells[3].classList.contains('warn')).toBe(true);
    expect(cells[4].textContent).toBe('18.2 s');
    expect(cells[4].classList.contains('bad')).toBe(true);
    const d6 = rows(root)[0];
    expect(d6.querySelectorAll('td')[3].classList.contains('good')).toBe(true);
    expect(text(d6, '.slips')).toBe('C1 held · C2 held');
    expect(text(rows(root)[1], '.slips')).toBe('C1 0:24 · C2 held');
  });

  it('draws a trend chart with one dot per drill and a target line', () => {
    const root = mount(memoryStorage(JSON.stringify(sampleHistory)));
    const svg = root.querySelector('svg.trend-chart');
    expect(svg.querySelectorAll('circle.dot')).toHaveLength(6);
    expect(svg.querySelector('line.target')).not.toBeNull();
    expect(svg.querySelector('polyline.series')).not.toBeNull();
  });

  it('skips a corrupt entry and keeps the rest', () => {
    const stored = [sampleHistory[0], { ...sampleHistory[1], stats: { ...sampleHistory[1].stats, turns: 'oops' } }, 'garbage', null, sampleHistory[2]];
    const root = mount(memoryStorage(JSON.stringify(stored)));
    expect(rows(root).map((r) => r.dataset.id)).toEqual(['d6', 'd4']);
  });

  it('shows a team name with HTML as literal text', () => {
    const stored = [{ ...sampleHistory[0], team: '<b>x</b>' }];
    const root = mount(memoryStorage(JSON.stringify(stored)));
    expect(text(rows(root)[0], '.team')).toBe('<b>x</b>');
    expect(text(root, '.detail-title')).toBe('<b>x</b>');
    expect(root.querySelector('b')).toBeNull();
  });

  it('shows the selected drill’s record, turns and quick-tips team debrief', () => {
    const root = mount(memoryStorage(JSON.stringify(sampleHistory)));
    expect(text(root, '.detail-title')).toBe('Ward 4B'); // newest selected by default
    rows(root)[1].click(); // d5, fadingRelay
    expect(text(root, '.detail-title')).toBe('Night shift');
    expect(rows(root)[1].getAttribute('aria-selected')).toBe('true');
    const turns = [...root.querySelectorAll('.turn')];
    expect(turns).toHaveLength(2);
    expect(text(turns[0], '.turn-slip')).toBe('Started slipping at 0:24: smaller pushes, slower');
    expect(text(turns[1], '.turn-slip')).toBe('Held form for the whole turn');
    expect(text(root, '.detail .debrief-card__title')).toBe('Team debrief');
    expect(text(root, '.detail .debrief-card__label')).toBe('Quick tips');
    expect(text(root, '.detail .debrief-card__text')).toBe(fallbackRelayDebrief(sampleHistory[1].stats));
  });

  it.each([
    ['empty storage', memoryStorage()],
    ['an empty array', memoryStorage('[]')],
    ['corrupt JSON', memoryStorage('{oops')],
    ['no storage at all', null],
    ['storage that throws', { getItem: () => { throw new Error('SecurityError'); }, setItem: vi.fn(), removeItem: vi.fn() }],
  ])('shows the empty state for %s', (_name, storage) => {
    const root = mount(storage);
    expect(text(root, '.empty-title')).toBe('No drills saved yet');
    expect(root.querySelector('.btn-sample').textContent).toBe('Load sample data');
    expect(rows(root)).toHaveLength(0);
  });

  it('"Load sample data" shows the banner and the sample drills, and writes nothing to storage', () => {
    const storage = memoryStorage();
    const root = mount(storage);
    root.querySelector('.btn-sample').click();
    expect(text(root, '.sample-banner')).toBe('Sample data, not real drills');
    expect(rows(root)).toHaveLength(6);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(storage.map.size).toBe(0);
  });

  it('"Hide sample data" returns to the empty state without touching storage', () => {
    const storage = memoryStorage();
    const root = mount(storage);
    root.querySelector('.btn-sample').click();
    root.querySelector('.btn-clear').click();
    expect(text(root, '.empty-title')).toBe('No drills saved yet');
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it('"Clear history" asks first, and only clears when confirmed', () => {
    const storage = memoryStorage(JSON.stringify(sampleHistory));
    const confirm = vi.fn(() => false);
    let root = mount(storage, { confirm });
    root.querySelector('.btn-clear').click();
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(rows(root)).toHaveLength(6);

    root = mount(storage, { confirm: () => true });
    root.querySelector('.btn-clear').click();
    expect(storage.removeItem).toHaveBeenCalledWith(HISTORY_KEY);
    expect(text(root, '.empty-title')).toBe('No drills saved yet');
  });

  it('"Print" calls print, and "Export CSV" builds a download in the browser', () => {
    const print = vi.fn();
    const createObjectURL = vi.fn(() => 'blob:csv');
    let blobParts;
    class FakeBlob { constructor(parts) { blobParts = parts; } }
    const root = mount(memoryStorage(JSON.stringify(sampleHistory)), {
      print, Blob: FakeBlob, URL: { createObjectURL, revokeObjectURL: vi.fn() }, setTimeout: vi.fn(),
    });
    const clicked = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    root.querySelector('.btn-print').click();
    expect(print).toHaveBeenCalledTimes(1);
    root.querySelector('.btn-export').click();
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clicked).toHaveBeenCalledTimes(1);
    expect(blobParts.join('')).toContain('"Night shift"');
    clicked.mockRestore();
  });

  it('ends with the practice-record line', () => {
    for (const storage of [memoryStorage(), memoryStorage(JSON.stringify(sampleHistory))]) {
      expect(text(mount(storage), '.foot')).toBe('Practice record for adult hands-only CPR. Not a certification.');
    }
  });

  it('never throws without a root', () => {
    expect(() => renderEducator(null)).not.toThrow();
  });
});
