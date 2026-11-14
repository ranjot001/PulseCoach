import { describe, it, expect } from 'vitest';
import { createRelay, drillOptions, compressorFor } from '../src/lib/relay.js';
import { config } from '../src/config.js';

const ok = { fatigue: { slipping: false, signs: [] } };
const slipping = (signs = ['shallower']) => ({ fatigue: { slipping: true, signs } });
const ev = (i) => ({ index: i, tBottom: 999999, tTop: 999999, intervalMs: 545 });

/**
 * Drive a relay: compressions every `cpmMs` while it is accepting them, ticks every 100 ms.
 * `stateAt(now, view)` gives the engine state; returns every prompt with its time.
 */
function drive(relay, { until, stateAt = () => ok, cpmMs = 500, compressDuringSwitch = true, from = 0 }) {
  const prompts = [];
  let i = 0;
  let nextPush = from;
  for (let now = from; now <= until; now += 100) {
    if (now >= nextPush) {
      const phase = relay.getView(now).phase;
      if (phase !== 'done' && (compressDuringSwitch || phase === 'compressing' || phase === 'resume')) relay.onCompression(ev(i++), now);
      nextPush += cpmMs;
    }
    for (const p of relay.tick(stateAt(now, relay.getView(now)), now)) prompts.push({ t: now, p });
    if (relay.getView(now).phase === 'done') break;
  }
  return prompts;
}

describe('drillOptions', () => {
  it('reads ?turns= and ?turnSeconds=, falling back to config', () => {
    expect(drillOptions('', config)).toEqual({ turns: config.DRILL_TURNS, turnSeconds: config.DRILL_TURN_SECONDS });
    expect(drillOptions('?sim=1&turns=4&turnSeconds=20', config)).toEqual({ turns: 4, turnSeconds: 20 });
    expect(drillOptions('?turns=0&turnSeconds=abc', config)).toEqual({ turns: config.DRILL_TURNS, turnSeconds: config.DRILL_TURN_SECONDS });
  });
});

describe('createRelay', () => {
  it('a turn ends on the clock, timed from its first compression', () => {
    const r = createRelay(config, { turns: 2, turnSeconds: 20 });
    r.start(0);
    expect(r.getView(0)).toMatchObject({ phase: 'compressing', compressor: 1, turn: 1, turns: 2, turnSecondsLeft: 20 });
    expect(r.tick(ok, 5000)).toEqual([]); // no compression yet: the turn clock has not started
    r.onCompression(ev(0), 5000);
    expect(r.getView(15000).turnSecondsLeft).toBe(10);
    expect(r.tick(ok, 24900)).toEqual([]);
    expect(r.tick(ok, 25000)).toEqual(['rhythmCheck']);
    expect(r.getView(25000)).toMatchObject({ phase: 'rhythmCheck', compressor: 2, turn: 2 });
    const d = r.getDrill();
    expect(d.turns[0]).toMatchObject({ compressor: 1, startAt: 5000, endAt: 25000, early: false });
  });

  it('ends early only after MIN_TURN_SECONDS and EARLY_SWITCH_MS of continuous slipping', () => {
    // Slipping from 2 s into the turn: held long ago, but no switch before 15 s.
    const r = createRelay(config, { turns: 2, turnSeconds: 40 });
    r.start(0);
    const prompts = drive(r, { until: 40000, stateAt: (now) => (now >= 2000 ? slipping() : ok) });
    expect(prompts[0]).toEqual({ t: config.MIN_TURN_SECONDS * 1000, p: 'switchEarly' });
    expect(r.getDrill().turns[0]).toMatchObject({ early: true, endAt: 15000, slippedAt: 2, signs: ['shallower'] });

    // Slipping from 20 s: switch exactly EARLY_SWITCH_MS later.
    const r2 = createRelay(config, { turns: 2, turnSeconds: 40 });
    r2.start(0);
    const p2 = drive(r2, { until: 40000, stateAt: (now) => (now >= 20000 ? slipping(['slower']) : ok) });
    expect(p2[0]).toEqual({ t: 20000 + config.EARLY_SWITCH_MS, p: 'switchEarly' });
  });

  it('a two-second slip does not switch or count as a slip', () => {
    const r = createRelay(config, { turns: 2, turnSeconds: 40 });
    r.start(0);
    const prompts = drive(r, { until: 40000, stateAt: (now) => (now >= 20000 && now < 22000 ? slipping() : ok) });
    expect(prompts[0]).toEqual({ t: 40000, p: 'rhythmCheck' });
    expect(r.getDrill().turns[0]).toMatchObject({ early: false, slippedAt: null, signs: [] });
  });

  it('treats a missing fatigue as not slipping', () => {
    const r = createRelay(config, { turns: 2, turnSeconds: 20 });
    r.start(0);
    const prompts = drive(r, { until: 20000, stateAt: () => ({}) });
    expect(prompts).toEqual([{ t: 20000, p: 'rhythmCheck' }]);
    expect(() => r.tick(null, 20100)).not.toThrow();
  });

  it('turns: 1 runs one full turn with no rhythm check; a late slip is recorded but does not switch', () => {
    const r = createRelay(config, { turns: 1, turnSeconds: 40 });
    r.start(0);
    const prompts = drive(r, { until: 50000, stateAt: (now) => (now >= 20000 ? slipping(now >= 21000 ? ['shallower', 'elbows'] : ['shallower']) : ok) });
    expect(prompts).toEqual([{ t: 40000, p: 'finished' }]);
    expect(r.getView(40000)).toMatchObject({ phase: 'done', turnSecondsLeft: 0 });
    const d = r.getDrill();
    expect(d.turns).toHaveLength(1);
    expect(d.turns[0]).toMatchObject({ early: false, slippedAt: 20, signs: ['shallower', 'elbows'] });
    expect(d.endedAt).toBe(40000);
  });

  it('the last turn has no rhythm check and no early switch', () => {
    const r = createRelay(config, { turns: 2, turnSeconds: 20 });
    r.start(0);
    const prompts = drive(r, { until: 60000, stateAt: (now, view) => (view.turn === 2 ? slipping() : ok) });
    expect(prompts.map((x) => x.p)).toEqual(['rhythmCheck', 'resume', 'finished']);
    expect(r.getDrill().turns[1]).toMatchObject({ compressor: 2, early: false });
    expect(r.getDrill().turns[1].slippedAt).not.toBeNull();
  });

  it('with turns: 4, compressors run 1, 2, 1, 2', () => {
    const r = createRelay(config, { turns: 4, turnSeconds: 20 });
    r.start(0);
    drive(r, { until: 200000 });
    const d = r.getDrill();
    expect(d.turns.map((t) => t.compressor)).toEqual([1, 2, 1, 2]);
    expect(d.turns.every((t) => t.startAt !== null && t.endAt !== null && t.events.length > 0)).toBe(true);
    expect([0, 1, 2, 3].map(compressorFor)).toEqual([1, 2, 1, 2]);
  });

  it('the pause runs from the rhythm-check prompt to the first compression after resume', () => {
    const r = createRelay(config, { turns: 2, turnSeconds: 20 });
    r.start(0);
    r.onCompression(ev(0), 0);
    expect(r.tick(ok, 20000)).toEqual(['rhythmCheck']);
    r.onCompression(ev(1), 21000); // during the rhythm check: belongs to no turn
    expect(r.getView(21000)).toMatchObject({ phase: 'rhythmCheck', pauseSec: 1 });
    expect(r.tick(ok, 20000 + config.RHYTHM_CHECK_MS)).toEqual(['resume']);
    expect(r.getView(24000)).toMatchObject({ phase: 'resume', pauseSec: 4, compressor: 2 });
    r.onCompression(ev(2), 24500);
    expect(r.getView(24500)).toMatchObject({ phase: 'compressing', pauseSec: 0, turn: 2 });
    const d = r.getDrill();
    expect(d.turns[0].events.map((e) => e.index)).toEqual([0]);
    expect(d.turns[1].startAt).toBe(24500);
    expect(d.turns[1].events).toEqual([{ ...ev(2), at: 24500 }]);
    expect(d.turns[1].startAt - d.turns[0].endAt).toBe(4500);
  });

  it('says "back on" once when a switch pause passes PAUSE_WARN_SEC', () => {
    const r = createRelay(config, { turns: 2, turnSeconds: 20 });
    r.start(0);
    r.onCompression(ev(0), 0);
    r.tick(ok, 20000);
    const prompts = [];
    for (let t = 20100; t <= 30000; t += 100) prompts.push(...r.tick(ok, t).map((p) => ({ t, p })));
    expect(prompts).toEqual([
      { t: 20000 + config.RHYTHM_CHECK_MS, p: 'resume' },
      { t: 20000 + config.PAUSE_WARN_SEC * 1000, p: 'backOn' },
    ]);
  });

  it('stores page-clock times, not the engine event times', () => {
    const r = createRelay(config, { turns: 1, turnSeconds: 20 });
    r.start(1000);
    r.onCompression({ tBottom: 5, tTop: 6 }, 1200);
    expect(r.getDrill()).toMatchObject({ startedAt: 1000, turns: [{ startAt: 1200, events: [{ tTop: 6, at: 1200 }] }] });
  });
});
