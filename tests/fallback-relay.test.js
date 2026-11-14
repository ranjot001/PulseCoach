import { describe, it, expect } from 'vitest';
import { fallbackRelayDebrief, fallbackAnyDebrief, fallbackDebrief } from '../src/debrief/fallback.js';
import { goodRelay, slowSwitchRelay, fadingRelay } from './fixtures/relayStats.js';
import { goodStats } from './fixtures/stats.js';

const fixtures = [['goodRelay', goodRelay], ['slowSwitchRelay', slowSwitchRelay], ['fadingRelay', fadingRelay]];
const countSentences = (text) => (text.match(/[.!?](?=\s|$)/g) || []).length;
const BANNED = /certified|accurate|clinical|medical/i;

describe('fallbackRelayDebrief', () => {
  it.each(fixtures)('gives three to five sentences for %s, with honest wording', (_name, stats) => {
    const text = fallbackRelayDebrief(stats);
    expect(countSentences(text)).toBeGreaterThanOrEqual(3);
    expect(countSentences(text)).toBeLessThanOrEqual(5);
    expect(text).not.toMatch(BANNED);
    expect(text).toMatch(/^As a team/);
  });

  it('mentions the slow switch and the compression fraction for slowSwitchRelay', () => {
    const text = fallbackRelayDebrief(slowSwitchRelay);
    expect(text).toContain('79%');
    expect(text).toMatch(/under the 80% target/);
    expect(text).toMatch(/switch took 18\.2 seconds/);
    expect(text).toMatch(/under 10 seconds/);
  });

  it('mentions compressor 1 slipping at about 24 seconds and the early switch for fadingRelay', () => {
    const text = fallbackRelayDebrief(fadingRelay);
    expect(text).toMatch(/Compressor 1, your pushes got smaller and slower from about 24 seconds in/);
    expect(text).toMatch(/that is normal/);
    expect(text).toMatch(/switching early kept the team's compressions strong/);
    expect(text).toMatch(/Compressor 2/);
  });

  it('says everything was strong and suggests longer turns for goodRelay', () => {
    const text = fallbackRelayDebrief(goodRelay);
    expect(text).toMatch(/Everything was strong/);
    expect(text).toMatch(/longer turns/);
    expect(text).toMatch(/Compressor 1.*Compressor 2/);
  });

  it('describes each sign in plain words', () => {
    const slip = (signs) =>
      fallbackRelayDebrief({ ...fadingRelay, turns: [{ ...fadingRelay.turns[0], signs }, fadingRelay.turns[1]] });
    expect(slip(['shallower'])).toMatch(/your pushes got smaller from about/);
    expect(slip(['slower'])).toMatch(/your pace slowed from about/);
    expect(slip(['elbows'])).toMatch(/your elbows started to bend from about/);
    expect(slip(['shallower', 'elbows'])).toMatch(/your pushes got smaller and your elbows started to bend/);
    expect(slip([])).toMatch(/dropped below your own start/);
  });

  it('does not claim an early switch when the slip came on the last turn', () => {
    const late = {
      ...goodRelay,
      turns: [goodRelay.turns[0], { ...goodRelay.turns[1], slippedAtSec: 30, signs: ['slower'] }],
    };
    const text = fallbackRelayDebrief(late);
    expect(text).toMatch(/Compressor 2, your pace slowed from about 30 seconds in/);
    expect(text).not.toMatch(/kept the team's compressions strong/);
    expect(text).toMatch(/switching early as soon as you notice it/);
  });

  it('stays within three to five sentences for one to eight turns and many shapes', () => {
    for (let n = 1; n <= 8; n++) {
      for (const base of [goodRelay, slowSwitchRelay, fadingRelay]) {
        for (const avgSwitchSec of [null, 3, 25]) {
          const turns = Array.from({ length: n }, (_, i) => ({ ...base.turns[i % base.turns.length], compressor: (i % 4) + 1 }));
          const text = fallbackRelayDebrief({ ...base, avgSwitchSec, turns });
          const c = countSentences(text);
          if (c < 3 || c > 5) throw new Error(`${c} sentences for ${n} turns: ${text}`);
        }
      }
    }
  });

  it('handles a drill with no compressions', () => {
    const text = fallbackRelayDebrief({ ...goodRelay, compressions: 0 });
    expect(text).toMatch(/No compressions were counted/);
    expect(countSentences(text)).toBe(3);
  });
});

describe('fallbackAnyDebrief', () => {
  it('picks the relay or solo debrief by mode', () => {
    expect(fallbackAnyDebrief(fadingRelay)).toBe(fallbackRelayDebrief(fadingRelay));
    expect(fallbackAnyDebrief(goodStats)).toBe(fallbackDebrief(goodStats));
  });
});
