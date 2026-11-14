import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { checkFrame, checkSetup, SETUP_HINTS } from '../src/lib/setupCheck.js';
import { simFrame } from '../src/pose/simSource.js';

const failing = (frame) => checkFrame(frame, config).filter((c) => !c.pass).map((c) => c.id);
const check = (frame, id) => checkFrame(frame, config).find((c) => c.id === id);

// Turn the simulated figure to face the camera: spread each left/right pair apart.
function frontFacing(frame) {
  const T = 0.3 * 720;
  const f = structuredClone(frame);
  for (const [l, r] of [[11, 12], [13, 14], [15, 16], [23, 24]]) {
    const cx = (f.landmarks[l].x + f.landmarks[r].x) / 2;
    f.landmarks[l].x = cx + (0.3 * T) / 1280;
    f.landmarks[r].x = cx - (0.3 * T) / 1280;
    f.landmarks[l].visibility = f.landmarks[r].visibility = 0.95;
  }
  return f;
}

describe('setup check on simulated frames', () => {
  it('a well-placed side-on figure passes all five', () => {
    const checks = checkFrame(simFrame(0), config);
    expect(checks.map((c) => c.id)).toEqual(['person', 'visible', 'side-on', 'distance', 'in-frame']);
    expect(checks.every((c) => c.pass)).toBe(true);
  });

  it('passes all five through a whole compression cycle and with 3× noise', () => {
    for (let t = 0; t < 1200; t += 33) expect(failing(simFrame(t, { noise: 3, seed: t }))).toEqual([]);
  });

  it('a front-facing figure with wide shoulders fails only side-on', () => {
    expect(failing(frontFacing(simFrame(0)))).toEqual(['side-on']);
    expect(check(frontFacing(simFrame(0)), 'side-on').hint).toBe('Turn so the camera sees your side');
  });

  it('scale 0.2 fails distance with "Move a little closer"', () => {
    const c = check(simFrame(0, { scale: 0.2 }), 'distance');
    expect(c.pass).toBe(false);
    expect(c.hint).toBe(SETUP_HINTS.closer);
    expect(c.hint).toBe('Move a little closer');
  });

  it('scale 2 fails distance with "Move back a little"', () => {
    const c = check(simFrame(0, { scale: 2 }), 'distance');
    expect(c.pass).toBe(false);
    expect(c.hint).toBe('Move back a little');
  });

  it('hidden hips fail visible', () => {
    const f = simFrame(0);
    f.landmarks[23].visibility = 0.2;
    f.landmarks[24].visibility = 0.1;
    expect(failing(f)).toEqual(['visible']);
    expect(check(f, 'visible').hint).toBe('Make sure your arms and hips are in view');
  });

  it('visible needs the near arm complete; the hidden far arm alone is fine', () => {
    const f = simFrame(0);
    for (const i of [12, 14, 16]) f.landmarks[i].visibility = 0.1; // far arm hidden: normal side-on
    expect(failing(f)).toEqual([]);
    f.landmarks[15].visibility = 0.3; // near wrist hidden too
    expect(failing(f)).toEqual(['visible']);
  });

  it('a figure off the edge fails in-frame', () => {
    const f = simFrame(0);
    for (const l of f.landmarks) l.x += 0.45;
    expect(failing(f)).toContain('in-frame');
    expect(check(f, 'in-frame').hint).toBe('Move to the middle of the picture');
  });

  it('no person fails person with "Step into view"', () => {
    const checks = checkFrame({ t: 0, width: 1280, height: 720, landmarks: null }, config);
    expect(checks[0]).toEqual({ id: 'person', pass: false, hint: 'Step into view' });
    expect(checks.every((c) => !c.pass)).toBe(true);
  });
});

describe('ok needs one continuous second', () => {
  const frames = (from, to, bad = () => false) => {
    const out = [];
    for (let t = from; t <= to; t += 1000 / 30) {
      const f = simFrame(t, { seed: Math.round(t) });
      out.push(bad(t) ? { ...f, landmarks: null } : f);
    }
    return out;
  };

  it('turns true only after one continuous second of passes', () => {
    expect(checkSetup(frames(0, 500), config).ok).toBe(false);
    expect(checkSetup(frames(0, 950), config).ok).toBe(false);
    expect(checkSetup(frames(0, 1050), config).ok).toBe(true);
  });

  it('a single failing frame restarts the second', () => {
    const fs = frames(0, 1500, (t) => t > 700 && t < 740);
    expect(checkSetup(fs, config).ok).toBe(false); // only ~760 ms since the bad frame
    const later = frames(0, 1800, (t) => t > 700 && t < 740);
    expect(checkSetup(later, config).ok).toBe(true);
  });

  it('checks are those of the newest frame; empty input is not ok', () => {
    const fs = frames(0, 1500, (t) => t > 1450);
    const r = checkSetup(fs, config);
    expect(r.ok).toBe(false);
    expect(r.checks[0].pass).toBe(false);
    expect(checkSetup([], config).ok).toBe(false);
  });
});
