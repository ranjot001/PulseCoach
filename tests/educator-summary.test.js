import { describe, it, expect } from 'vitest';
import {
  summariseHistory, toCsv, cleanHistory, loadHistory, slowestSwitchSec, compressorSummary, localDateTime, HISTORY_KEY,
} from '../src/educator/summary.js';
import { SAMPLE_HISTORY } from '../src/educator/sample.js';
import { sampleHistory, HISTORY_KEY as FIXTURE_KEY } from './fixtures/history.js';
import { goodRelay, fadingRelay } from './fixtures/relayStats.js';

// Splits CSV text into rows of cells, honouring quotes and doubled quotes.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\r') { /* part of \r\n */ }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

describe('sample data', () => {
  it('is an exact copy of the history fixture, under the Contract 4 key', () => {
    expect(SAMPLE_HISTORY).toEqual(sampleHistory);
    expect(HISTORY_KEY).toBe(FIXTURE_KEY);
  });
});

describe('summariseHistory', () => {
  it('gives the hand-calculated numbers for sampleHistory', () => {
    // On the chest: 94, 90, 88, 79, 84, 72 -> 4 meet 80.
    // One switch each: 4.2, 6.1, 7.4, 18.2, 9.3, 21.5 s -> 4 of 6 at 10 s or less.
    // Slipped turns: compressor 1 at 24 s in d5 and d2 -> 2, median 24.
    expect(summariseHistory(cleanHistory(sampleHistory))).toEqual({
      drills: 6, metCcf: 4, switches: 6, switchesUnderMax: 4, slippedTurns: 2, medianSlipSec: 24,
    });
  });

  it('gives zeros and null for no drills', () => {
    expect(summariseHistory([])).toEqual({
      drills: 0, metCcf: 0, switches: 0, switchesUnderMax: 0, slippedTurns: 0, medianSlipSec: null,
    });
  });

  it('uses PAUSE_MAX_SEC and CCF_TARGET from config when present', () => {
    const s = summariseHistory(cleanHistory(sampleHistory), { PAUSE_MAX_SEC: 5, CCF_TARGET: 90 });
    expect(s.metCcf).toBe(2); // 94 and 90
    expect(s.switchesUnderMax).toBe(1); // 4.2
  });

  it('counts every switch of a multi-switch drill by its longest pause', () => {
    const turns = [goodRelay.turns[0], goodRelay.turns[1], goodRelay.turns[0]];
    const ok = { id: 'a', savedAt: '2026-11-14T10:00:00Z', team: 'A', stats: { ...goodRelay, switches: 2, avgSwitchSec: 5, longestPauseSec: 8, turns } };
    const slow = { id: 'b', savedAt: '2026-11-14T11:00:00Z', team: 'B', stats: { ...goodRelay, switches: 2, avgSwitchSec: 5, longestPauseSec: 12, turns } };
    const s = summariseHistory([ok, slow]);
    expect(s.switches).toBe(4);
    expect(s.switchesUnderMax).toBe(2);
    expect(slowestSwitchSec(slow.stats)).toBe(12);
    expect(slowestSwitchSec({ ...goodRelay, switches: 0, avgSwitchSec: null })).toBeNull();
  });

  it('takes the middle of an even number of slips', () => {
    const e = (id, at) => ({ id, savedAt: '2026-11-14T10:00:00Z', team: 'T', stats: { ...fadingRelay, turns: [{ ...fadingRelay.turns[0], slippedAtSec: at }, fadingRelay.turns[1]] } });
    expect(summariseHistory([e('a', 20), e('b', 30)]).medianSlipSec).toBe(25);
  });
});

describe('cleanHistory and loadHistory', () => {
  it('keeps valid entries newest first and skips broken ones', () => {
    const broken = [
      null, 'x', { ...sampleHistory[0], id: '' }, { ...sampleHistory[0], savedAt: 'yesterday' },
      { ...sampleHistory[0], team: 42 }, { ...sampleHistory[0], stats: { ...goodRelay, mode: 'solo' } },
      { ...sampleHistory[0], stats: { ...goodRelay, compressionFraction: NaN } },
    ];
    const clean = cleanHistory([sampleHistory[5], ...broken, sampleHistory[0]]);
    expect(clean.map((e) => e.id)).toEqual(['d6', 'd1']);
  });

  it('never throws on missing, corrupt or blocked storage', () => {
    expect(loadHistory(null)).toEqual([]);
    expect(loadHistory({ getItem: () => null })).toEqual([]);
    expect(loadHistory({ getItem: () => '{not json' })).toEqual([]);
    expect(loadHistory({ getItem: () => '{"a":1}' })).toEqual([]);
    expect(loadHistory({ getItem: () => { throw new Error('SecurityError'); } })).toEqual([]);
    expect(loadHistory({ getItem: () => JSON.stringify(sampleHistory) })).toHaveLength(6);
  });
});

describe('toCsv', () => {
  const entries = cleanHistory(sampleHistory);

  it('has one header row and one row per drill, all the same width', () => {
    const rows = parseCsv(toCsv(entries));
    expect(rows).toHaveLength(1 + entries.length);
    expect(rows[0]).toEqual([
      'Date', 'Time', 'Team', 'Score', 'Grade', 'On the chest %', 'Switches', 'Early switches',
      'Average switch s', 'Longest pause s',
      'Compressor 1 score', 'Compressor 1 slipped at s', 'Compressor 2 score', 'Compressor 2 slipped at s',
    ]);
    for (const row of rows) expect(row).toHaveLength(14);
  });

  it('writes each drill’s numbers', () => {
    const rows = parseCsv(toCsv(entries));
    const d5 = rows[2]; // newest first: d6, d5, ...
    const { date, time } = localDateTime(sampleHistory[1].savedAt);
    expect(d5).toEqual([date, time, 'Night shift', '92', 'Lifesaver', '90', '1', '1', '6.1', '6.1', '76', '24', '93', '']);
  });

  it('quotes every cell', () => {
    const lines = toCsv(entries).trim().split('\r\n');
    for (const line of lines) expect(line).toMatch(/^"[^]*"$/);
  });

  it('neutralises a team name that starts like a formula', () => {
    for (const team of ['=1+1', '+SUM(A1)', '-2', '@cmd', '\t=1']) {
      const csv = toCsv([{ ...entries[0], team }]);
      const cell = parseCsv(csv)[1][2];
      expect(cell).toBe(`'${team}`);
    }
  });

  it('keeps a team name with quotes and a comma in one cell', () => {
    const csv = toCsv([{ ...entries[0], team: 'Ward "4B", north' }]);
    expect(csv).toContain('"Ward ""4B"", north"');
    const rows = parseCsv(csv);
    expect(rows[1][2]).toBe('Ward "4B", north');
    expect(rows[1]).toHaveLength(14);
  });

  it('adds columns for more compressors when a drill has them', () => {
    const turns = [1, 2, 3].map((c) => ({ ...goodRelay.turns[0], compressor: c }));
    const rows = parseCsv(toCsv([{ ...entries[0], stats: { ...goodRelay, switches: 2, turns } }]));
    expect(rows[0]).toContain('Compressor 3 slipped at s');
    expect(rows[1]).toHaveLength(16);
  });

  it('gives just the header for no drills', () => {
    expect(parseCsv(toCsv([]))).toHaveLength(1);
  });
});

describe('compressorSummary', () => {
  it('averages each compressor’s turns and keeps their first slip', () => {
    const turns = [
      { ...fadingRelay.turns[0], score: 70 }, fadingRelay.turns[1], { ...fadingRelay.turns[0], score: 80, slippedAtSec: 30 },
    ];
    expect(compressorSummary({ ...fadingRelay, turns })).toEqual([
      { compressor: 1, score: 75, slippedAtSec: 24 },
      { compressor: 2, score: 93, slippedAtSec: null },
    ]);
  });
});
