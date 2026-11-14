// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { checklistView, shortcutAction, SHORTCUTS, errorView, simulatorUrl, renderHome, renderError } from '../src/ui/home.js';

const failing = {
  ok: false,
  checks: [
    { id: 'person', pass: true, hint: 'Step into view' },
    { id: 'side-on', pass: false, hint: 'Turn so the camera sees your side' },
    { id: 'distance', pass: false, hint: 'Move back a little' },
  ],
};

describe('checklistView', () => {
  it('shows a hint for each failing check and none for passing ones', () => {
    const v = checklistView(failing);
    expect(v.visible).toBe(true);
    expect(v.items.map((i) => [i.id, i.pass, i.hint])).toEqual([
      ['person', true, null],
      ['side-on', false, 'Turn so the camera sees your side'],
      ['distance', false, 'Move back a little'],
    ]);
    expect(v.items[1].label).toBe('Side-on to the camera');
    expect(v).toMatchObject({ startEnabled: false, showStartAnyway: true });
  });
  it('Start becomes the main button once setup is ok', () => {
    const v = checklistView({ ok: true, checks: failing.checks.map((c) => ({ ...c, pass: true })) });
    expect(v).toMatchObject({ visible: true, startEnabled: true, showStartAnyway: false });
    expect(v.items.every((i) => i.hint === null)).toBe(true);
  });
  it('an empty checks list hides the checklist and leaves Start enabled', () => {
    expect(checklistView({ ok: true, checks: [] })).toMatchObject({ visible: false, startEnabled: true, showStartAnyway: false });
    expect(checklistView(undefined)).toMatchObject({ visible: false, startEnabled: true });
  });
});

describe('renderHome checklist', () => {
  it('draws ticks and hints, and hides when empty', () => {
    const root = document.createElement('div');
    let starts = 0;
    const home = renderHome(root, { onStart: () => starts++ });
    const checklist = root.querySelector('.checklist');
    const start = root.querySelector('.actions .btn');
    const anyway = root.querySelector('.link-button');
    expect(checklist.hidden).toBe(true);
    expect(start.disabled).toBe(false);

    home.updateSetup(failing);
    expect(checklist.hidden).toBe(false);
    expect([...root.querySelectorAll('.check-hint')].map((h) => h.textContent)).toEqual(['Turn so the camera sees your side', 'Move back a little']);
    expect(root.querySelector('[data-check="person"] .check-hint')).toBeNull();
    expect(root.querySelector('[data-check="person"]').classList.contains('status-good')).toBe(true);
    expect(start.disabled).toBe(true);
    expect(anyway.hidden).toBe(false);
    anyway.click();
    expect(starts).toBe(1);

    home.updateSetup({ ok: true, checks: [] });
    expect(checklist.hidden).toBe(true);
    expect(start.disabled).toBe(false);
    expect(anyway.hidden).toBe(true);
  });

  it('shows the shortcut legend', () => {
    const root = document.createElement('div');
    renderHome(root, { onStart() {} });
    expect([...root.querySelectorAll('.kbd')].map((k) => k.textContent)).toEqual(['Space', 'M', 'B', 'D', 'F']);
  });
});

describe('shortcutAction', () => {
  it('maps each shortcut key to its action', () => {
    expect(shortcutAction({ code: 'Space', key: ' ' })).toBe('start');
    expect(shortcutAction({ key: 'm' })).toBe('mute');
    expect(shortcutAction({ key: 'M' })).toBe('mute');
    expect(shortcutAction({ key: 'b' })).toBe('metronome');
    expect(shortcutAction({ key: 'd' })).toBe('debug');
    expect(shortcutAction({ key: 'f' })).toBe('fullscreen');
    expect(shortcutAction({ key: 'x' })).toBeNull();
    expect(SHORTCUTS.map((s) => s.action)).toEqual(['start', 'mute', 'metronome', 'debug', 'fullscreen']);
  });
  it('ignores repeats, modifier combos and typing in a field', () => {
    expect(shortcutAction({ key: 'f', metaKey: true })).toBeNull();
    expect(shortcutAction({ key: 'd', ctrlKey: true })).toBeNull();
    expect(shortcutAction({ key: 'm', repeat: true })).toBeNull();
    expect(shortcutAction({ key: 'm', target: document.createElement('input') })).toBeNull();
    expect(shortcutAction({ code: 'Space', key: ' ', target: document.createElement('input') })).toBeNull();
  });
});

describe('error screen', () => {
  it('each error code maps to its own message', () => {
    const codes = ['camera-denied', 'no-camera', 'model-failed'];
    const titles = codes.map((c) => errorView(c).title);
    expect(new Set(titles).size).toBe(3);
    expect(errorView('camera-denied').title).toBe('Camera blocked');
    expect(errorView('no-camera').title).toBe('No camera found');
    expect(errorView('model-failed').title).toBe('Body tracking did not load');
    expect(errorView('something-else').title).toBe('Something went wrong');
  });
  it('simulator URL adds sim=1 and drops a video source', () => {
    expect(simulatorUrl('http://localhost:5173/')).toBe('http://localhost:5173/?sim=1');
    expect(simulatorUrl('http://x.test/?video=a.mp4&cpm=90')).toBe('http://x.test/?cpm=90&sim=1');
  });
  it('offers Try again and Run simulator', () => {
    const root = document.createElement('div');
    const calls = [];
    renderError(root, { code: 'no-camera' }, { onRetry: () => calls.push('retry'), onSimulator: () => calls.push('sim') });
    expect(root.querySelector('.error-title').textContent).toBe('No camera found');
    const buttons = [...root.querySelectorAll('button')];
    expect(buttons.map((b) => b.textContent)).toEqual(['Try again', 'Run simulator']);
    buttons[0].click();
    buttons[1].click();
    expect(calls).toEqual(['retry', 'sim']);
  });
});
