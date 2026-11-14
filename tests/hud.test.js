// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { rateView, chipViews, depthView, statusText, gaugePercent, createHud } from '../src/ui/hud.js';
import { createEngine } from '../src/engine.js';
import { config } from '../src/config.js';

describe('rateView', () => {
  it('90 asks to push faster in amber', () => {
    expect(rateView(90)).toMatchObject({ text: '90', label: 'Push faster', status: 'warn' });
  });
  it('110 is a good pace in green', () => {
    expect(rateView(110)).toMatchObject({ text: '110', label: 'Good pace', status: 'good' });
  });
  it('135 asks to slow down in red', () => {
    expect(rateView(135)).toMatchObject({ label: 'Slow down', status: 'bad' });
  });
  it('95 is amber and 85 is red', () => {
    expect(rateView(95).status).toBe('warn');
    expect(rateView(85).status).toBe('bad');
  });
  it('band edges are green and the margin edges are amber', () => {
    expect(rateView(100).status).toBe('good');
    expect(rateView(120).status).toBe('good');
    expect(rateView(130).status).toBe('warn');
    expect(rateView(90).status).toBe('warn');
  });
  it('null shows a dash', () => {
    expect(rateView(null)).toEqual({ text: '–', label: '', status: 'none' });
  });
});

describe('gaugePercent', () => {
  it('clamps to the gauge range', () => {
    expect(gaugePercent(config.GAUGE_MIN)).toBe(0);
    expect(gaugePercent(config.GAUGE_MAX)).toBe(100);
    expect(gaugePercent(0)).toBe(0);
    expect(gaugePercent(500)).toBe(100);
  });
});

describe('chipViews', () => {
  const byId = (issues) => Object.fromEntries(chipViews(issues).map((c) => [c.id, c.status]));
  it('all green when every check is clear', () => {
    expect(byId({ elbows: false, position: false, recoil: false })).toEqual({ elbows: 'good', position: 'good', recoil: 'good' });
  });
  it.each(['elbows', 'position', 'recoil'])('only %s goes red when only it fails', (id) => {
    const issues = { elbows: false, position: false, recoil: false, [id]: true };
    const s = byId(issues);
    for (const key of Object.keys(s)) expect(s[key]).toBe(key === id ? 'bad' : 'good');
  });
  it('labels are Elbows, Position and Recoil', () => {
    expect(chipViews({}).map((c) => c.label)).toEqual(['Elbows', 'Position', 'Recoil']);
  });
});

describe('depthView', () => {
  it('hidden when depth is null and no depthCm', () => {
    expect(depthView(null, null).visible).toBe(false);
  });
  it('shown as shallow when depth is shallow', () => {
    expect(depthView('shallow')).toMatchObject({ visible: true, label: 'Estimated depth', value: 'shallow' });
  });
  it('shown as deep, and as good when only depthCm is present', () => {
    expect(depthView('deep').value).toBe('deep');
    expect(depthView(null, 5.4)).toMatchObject({ visible: true, value: 'good', status: 'good' });
  });
});

describe('statusText', () => {
  it('Loading, No person in view, or nothing', () => {
    expect(statusText({ ready: false, personVisible: false })).toBe('Loading');
    expect(statusText({ ready: true, personVisible: false })).toBe('No person in view');
    expect(statusText({ ready: true, personVisible: true })).toBe('');
  });
});

describe('createHud', () => {
  const base = {
    ready: true, personVisible: true, compressions: 3, rate: 110, rateZone: 'good',
    issues: { elbows: false, position: false, recoil: false, depth: null },
    setup: { ok: true, checks: [] },
  };

  it('draws the rate, counter and chips from state', () => {
    const root = document.createElement('div');
    const hud = createHud(root);
    hud.update({ ...base, issues: { ...base.issues, elbows: true } });
    expect(root.querySelector('.hud-rate-number').textContent).toBe('110');
    expect(root.querySelector('.hud-rate-label').textContent).toBe('Good pace');
    expect(root.querySelector('.hud-rate').classList.contains('status-good')).toBe(true);
    expect(root.querySelector('.hud-counter-number').textContent).toBe('3');
    expect(root.querySelector('[data-check="elbows"]').classList.contains('status-bad')).toBe(true);
    expect(root.querySelector('[data-check="position"]').classList.contains('status-good')).toBe(true);
    expect(root.querySelector('[data-check="depth"]').hidden).toBe(true);
  });

  it('shows the depth chip once depth is reported', () => {
    const root = document.createElement('div');
    const hud = createHud(root);
    hud.update({ ...base, issues: { ...base.issues, depth: 'shallow' } });
    const chip = root.querySelector('[data-check="depth"]');
    expect(chip.hidden).toBe(false);
    expect(chip.textContent).toBe('Estimated depth: shallow');
  });

  it('pulses the counter on each compression', () => {
    const root = document.createElement('div');
    const hud = createHud(root);
    hud.update({ ...base, compressions: 0 });
    hud.compression({ depthCm: null });
    const n = root.querySelector('.hud-counter-number');
    expect(n.textContent).toBe('1');
    expect(n.classList.contains('pulse')).toBe(true);
  });
});

// Simulator settings flow through the engine into the HUD with the expected labels.
describe('HUD with the simulator', () => {
  function drive(search) {
    const root = document.createElement('div');
    const hud = createHud(root);
    let now = 0;
    const intervals = [];
    const timers = {
      setInterval: (fn, ms) => { intervals.push({ fn, ms, next: ms }); return intervals.length - 1; },
      clearInterval: () => {},
      now: () => now,
    };
    const engine = createEngine({ search, timers, onState: (s) => hud.update(s), onCompression: (e) => hud.compression(e) });
    engine.start();
    for (; now < 5000; now += 10) for (const iv of intervals) if (now >= iv.next) { iv.next += iv.ms; iv.fn(); }
    return root;
  }
  const label = (root) => root.querySelector('.hud-rate-label').textContent;
  const cls = (root) => [...root.querySelector('.hud-rate').classList].find((c) => c.startsWith('status-'));
  const red = (root) => [...root.querySelectorAll('.hud-chip:not([hidden])')].filter((c) => c.classList.contains('status-bad')).map((c) => c.dataset.check);

  it('cpm=90 → Push faster in amber', () => {
    const r = drive('?sim=1&cpm=90');
    expect(label(r)).toBe('Push faster');
    expect(cls(r)).toBe('status-warn');
  });
  it('cpm=110 → Good pace in green', () => {
    const r = drive('?sim=1&cpm=110');
    expect(label(r)).toBe('Good pace');
    expect(cls(r)).toBe('status-good');
  });
  it('cpm=135 → Slow down', () => {
    expect(label(drive('?sim=1&cpm=135'))).toBe('Slow down');
  });
  it('bend=30 → only Elbows is red', () => {
    expect(red(drive('?sim=1&bend=30'))).toEqual(['elbows']);
  });
});

// jsdom does no layout, so check the stylesheet: the rate number never drops below 120 px.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
describe('rate number size', () => {
  it('is at least 120 px tall at any window size', () => {
    const css = readFileSync(resolve(import.meta.dirname, '../src/styles.css'), 'utf8');
    const block = css.match(/\.hud-rate-number\s*\{([^}]*)\}/)[1];
    const [, min] = block.match(/font-size:\s*clamp\((\d+)px/);
    expect(Number(min)).toBeGreaterThanOrEqual(120);
    expect(block).toMatch(/line-height:\s*1;/);
  });
});

import { slipView, pauseStatus, switchMessage, createSwitchOverlay } from '../src/ui/hud.js';

describe('relay HUD', () => {
  it('slipping chip names the signs in plain words, hidden when not slipping or fatigue is missing', () => {
    expect(slipView({ slipping: true, signs: ['shallower', 'slower', 'elbows'] })).toEqual({ visible: true, text: 'Slipping: smaller pushes, slower, elbows bending' });
    expect(slipView({ slipping: true, signs: [] })).toEqual({ visible: true, text: 'Slipping' });
    expect(slipView({ slipping: false, signs: [] }).visible).toBe(false);
    expect(slipView(undefined).visible).toBe(false);
  });

  it('pause timer is green, amber after PAUSE_WARN_SEC, red after PAUSE_MAX_SEC', () => {
    expect(pauseStatus(0)).toBe('good');
    expect(pauseStatus(config.PAUSE_WARN_SEC - 0.1)).toBe('good');
    expect(pauseStatus(config.PAUSE_WARN_SEC)).toBe('warn');
    expect(pauseStatus(config.PAUSE_MAX_SEC)).toBe('bad');
  });

  it('switch overlay shows the pause with one decimal and the right line', () => {
    expect(switchMessage({ phase: 'rhythmCheck', compressor: 2 })).toBe('Rhythm check: hands off');
    expect(switchMessage({ phase: 'resume', compressor: 2 })).toBe('Switch! Compressor 2, start now');
    const root = document.createElement('div');
    const overlay = createSwitchOverlay(root);
    expect(root.hidden).toBe(true);
    overlay.update({ phase: 'resume', compressor: 1, pauseSec: 6.25 });
    expect(root.hidden).toBe(false);
    expect(root.querySelector('.switch-timer').textContent).toBe('6.3s');
    expect(root.querySelector('.switch-timer').classList.contains('status-warn')).toBe(true);
    overlay.update({ phase: 'compressing', pauseSec: 0 });
    expect(root.hidden).toBe(true);
  });

  it('the pause timer is at least 160 px tall at any window size', () => {
    const css = readFileSync(resolve(import.meta.dirname, '../src/styles.css'), 'utf8');
    const block = css.match(/\.switch-timer\s*\{([^}]*)\}/)[1];
    const [, min] = block.match(/font-size:\s*clamp\((\d+)px/);
    expect(Number(min)).toBeGreaterThanOrEqual(160);
    expect(block).toMatch(/line-height:\s*1;/);
  });
});
