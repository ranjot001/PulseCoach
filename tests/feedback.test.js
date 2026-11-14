// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createCoach, activeProblems } from '../src/lib/feedback.js';
import { createEngine } from '../src/engine.js';
import { createHud } from '../src/ui/hud.js';
import { config } from '../src/config.js';
import { CUES } from '../src/copy.js';

const clean = {
  ready: true, personVisible: true, compressions: 10, rate: 110, rateZone: 'good',
  issues: { elbows: false, position: false, recoil: false, depth: null },
  setup: { ok: true, checks: [] },
};
const withIssues = (issues, extra = {}) => ({ ...clean, ...extra, issues: { ...clean.issues, ...issues } });

function fakeSpeaker() {
  const said = [];
  return { said, speak: (t) => said.push(t) };
}

/** Feed the same state every 100 ms from `from` to `to`; returns [{ t, id }] of cues given. */
function run(coach, stateAt, from, to) {
  const cues = [];
  for (let t = from; t <= to; t += 100) {
    const id = coach.next(typeof stateAt === 'function' ? stateAt(t) : stateAt, t);
    if (id) cues.push({ t, id });
  }
  return cues;
}

describe('activeProblems', () => {
  it('lists problems in priority order', () => {
    expect(activeProblems(withIssues({ recoil: true, elbows: true, depth: 'deep' }, { rateZone: 'fast' })))
      .toEqual(['fast', 'elbows', 'recoil', 'deep']);
  });
  it('not visible outranks everything', () => {
    expect(activeProblems(withIssues({ elbows: true }, { personVisible: false }))).toEqual(['notVisible']);
  });
  it('nothing while the engine is not ready', () => {
    expect(activeProblems({ ...clean, ready: false })).toEqual([]);
  });
});

describe('createCoach', () => {
  it('chooses the highest-priority cue when several problems are present', () => {
    const sp = fakeSpeaker();
    const coach = createCoach(config, { speaker: sp });
    const cues = run(coach, withIssues({ elbows: true, recoil: true, depth: 'shallow' }, { rateZone: 'slow' }), 0, 2000);
    expect(cues[0].id).toBe('slow');
    expect(sp.said[0]).toBe(CUES.slow);
  });

  it('never gives two cues closer than VOICE_COOLDOWN_MS', () => {
    const coach = createCoach(config);
    // Problems come and go on a rotating schedule to tempt the coach into talking often.
    const ids = ['elbows', 'position', 'recoil'];
    const stateAt = (t) => withIssues({ [ids[Math.floor(t / 2000) % 3]]: true });
    const cues = run(coach, stateAt, 0, 60000);
    expect(cues.length).toBeGreaterThan(3);
    for (let i = 1; i < cues.length; i++) expect(cues[i].t - cues[i - 1].t).toBeGreaterThanOrEqual(config.VOICE_COOLDOWN_MS);
  });

  it('does not repeat the same cue within VOICE_REPEAT_MS', () => {
    const coach = createCoach(config);
    const cues = run(coach, withIssues({ elbows: true }), 0, 30000);
    expect(cues.every((c) => c.id === 'elbows')).toBe(true);
    expect(cues.length).toBeGreaterThan(1);
    for (let i = 1; i < cues.length; i++) expect(cues[i].t - cues[i - 1].t).toBeGreaterThanOrEqual(config.VOICE_REPEAT_MS);
  });

  it('never speaks a problem lasting under 1.5 seconds', () => {
    const sp = fakeSpeaker();
    const coach = createCoach(config, { speaker: sp });
    // Elbows bends for 1.4 s, clears for 0.5 s, repeatedly.
    const stateAt = (t) => withIssues({ elbows: t % 1900 < 1400 }, { rateZone: 'none', rate: null });
    expect(run(coach, stateAt, 0, 30000)).toEqual([]);
    expect(sp.said).toEqual([]);
    // A problem held for exactly the persistence time is spoken.
    const c2 = createCoach(config);
    const cues = run(c2, withIssues({ elbows: true }), 0, 3000);
    expect(cues[0]).toEqual({ t: config.VOICE_PERSIST_MS, id: 'elbows' });
  });

  it('praise needs 6 clean seconds and comes at most once every 10 seconds', () => {
    const coach = createCoach(config);
    const cues = run(coach, clean, 0, 40000);
    expect(cues[0]).toEqual({ t: config.PRAISE_AFTER_MS, id: 'praise' });
    expect(cues.every((c) => c.id === 'praise')).toBe(true);
    for (let i = 1; i < cues.length; i++) expect(cues[i].t - cues[i - 1].t).toBeGreaterThanOrEqual(config.PRAISE_REPEAT_MS);
    // A problem resets the clean clock.
    const c2 = createCoach(config);
    const stateAt = (t) => (t >= 4000 && t < 4500 ? withIssues({ recoil: true }) : clean);
    expect(run(c2, stateAt, 0, 10400)).toEqual([]);
    expect(run(c2, clean, 10500, 10500)).toEqual([{ t: 10500, id: 'praise' }]);
  });

  it('no praise while the rate is unknown', () => {
    expect(run(createCoach(config), { ...clean, rate: null, rateZone: 'none' }, 0, 20000)).toEqual([]);
  });

  it('gives a depth cue only when no higher-priority problem is active', () => {
    const coach = createCoach(config);
    // Elbows and shallow depth together for 20 s: only elbows is spoken.
    const both = run(coach, withIssues({ elbows: true, depth: 'shallow' }), 0, 20000);
    expect(both.map((c) => c.id)).not.toContain('shallow');
    expect(both[0].id).toBe('elbows');
    // Elbows fixed; depth persists, so now depth is spoken.
    const alone = run(coach, withIssues({ depth: 'shallow' }), 20100, 30000);
    expect(alone[0].id).toBe('shallow');
    const deep = run(createCoach(config), withIssues({ depth: 'deep' }), 0, 3000);
    expect(deep[0].id).toBe('deep');
    // depth null never cues.
    expect(run(createCoach(config), withIssues({ depth: null }, { rateZone: 'none' }), 0, 20000)).toEqual([]);
  });

  it('when muted the speaker is never called but the banner still updates', () => {
    const sp = fakeSpeaker();
    const banner = [];
    const coach = createCoach(config, { speaker: sp, onCue: (id, text) => banner.push(text) });
    coach.setMuted(true);
    run(coach, withIssues({ elbows: true }, { rateZone: 'slow' }), 0, 20000);
    expect(sp.said).toEqual([]);
    expect(banner[0]).toBe(CUES.slow);
    coach.setMuted(false);
    run(coach, withIssues({ elbows: true }), 20100, 40000);
    expect(sp.said.length).toBeGreaterThan(0);
  });
});

// The simulator through the engine, the coach and the HUD banner, wired as in main.js.
describe('coach with the simulator', () => {
  function drive(search, untilMs) {
    const root = document.createElement('div');
    const hud = createHud(root);
    let now = 0;
    const intervals = [];
    const timers = {
      setInterval: (fn, ms) => { intervals.push({ fn, ms, next: ms }); return intervals.length - 1; },
      clearInterval: () => {},
      now: () => now,
    };
    const sp = fakeSpeaker();
    const log = [];
    const coach = createCoach(config, {
      speaker: sp,
      onCue: (id, text) => { hud.setCue(text, id === 'praise' ? 'good' : 'warn'); log.push({ t: now, text }); },
    });
    const engine = createEngine({ search, timers, onState: (s) => { hud.update(s); coach.next(s, now); } });
    engine.start();
    coach.next({ ...clean, ready: false }, 0);
    for (; now < untilMs; now += 10) for (const iv of intervals) if (now >= iv.next) { iv.next += iv.ms; iv.fn(); }
    return { root, log, sp };
  }
  const banner = (root) => root.querySelector('.hud-cue').textContent;

  it('cpm=90 shows "Push faster", then stays quiet for the cooldown', () => {
    const { root, log, sp } = drive('?sim=1&cpm=90', 12000);
    expect(log[0].text).toBe('Push faster');
    expect(banner(root)).toBe('Push faster');
    expect(sp.said[0]).toBe('Push faster');
    expect(log.filter((c) => c.t < log[0].t + config.VOICE_COOLDOWN_MS)).toHaveLength(1);
  });

  it('cpm=110 shows the praise line after about 6 seconds', () => {
    const { root, log } = drive('?sim=1&cpm=110', 9000);
    expect(log).toHaveLength(1);
    expect(log[0].text).toBe('Good pace, keep going');
    expect(log[0].t).toBeGreaterThanOrEqual(6000);
    expect(log[0].t).toBeLessThan(8000);
    expect(banner(root)).toBe('Good pace, keep going');
    expect(root.querySelector('.hud-cue').classList.contains('status-good')).toBe(true);
  });
});
