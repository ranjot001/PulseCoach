import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { createMotionSignal } from '../src/lib/signal.js';
import { createCompressionDetector } from '../src/lib/compressionDetector.js';
import { createFormTracker, chooseArm, elbowAngleDeg, armLeanDeg } from '../src/lib/form.js';
import { simFrame, SIM_FPS } from '../src/pose/simSource.js';
import { angleAt, angleFromVertical } from '../src/lib/geometry.js';

const DT = 1000 / SIM_FPS;

// A session as the app runs it: the learner kneels still, markRest() at "go",
// a moment of rest, then `seconds` of compressions. Returns completed events.
function session(params = {}, seconds = 20, { rest = true } = {}) {
  const signal = createMotionSignal(config);
  const detector = createCompressionDetector(config);
  const form = createFormTracker(config);
  const goAt = 2000;
  const motionStartMs = goAt + 1000;
  const events = [];
  const issues = [];
  let i = 0;
  for (let t = 0; t <= motionStartMs + seconds * 1000; t += DT, i++) {
    if (rest && t >= goAt && t - DT < goAt) { detector.reset(); form.reset(); form.markRest(); }
    const frame = simFrame(t, { ...params, motionStartMs, seed: (params.seed ?? 1) * 7919 + i });
    const sample = signal.push(frame);
    form.onFrame(frame, sample);
    const partial = detector.push(sample);
    if (partial) {
      events.push({ ...partial, ...form.complete(partial) });
      issues.push(form.getLiveIssues());
    }
  }
  return { events, issues };
}

const share = (events, f) => events.filter(f).length / events.length;

describe('form checks on simulated frames', () => {
  it('bend=0: at least 95% locked; bend=30: at least 90% not locked', () => {
    const good = session({ bend: 0 }).events;
    const bent = session({ bend: 30 }).events;
    expect(good.length).toBeGreaterThan(30);
    expect(share(good, (e) => e.elbowsLocked)).toBeGreaterThanOrEqual(0.95);
    expect(share(bent, (e) => !e.elbowsLocked)).toBeGreaterThanOrEqual(0.9);
    expect(bent[5].elbowAngleDeg).toBeCloseTo(150, -1);
  });

  it('lean=0: aligned; lean=25: at least 90% not aligned', () => {
    const straight = session({ lean: 0 }).events;
    const leaning = session({ lean: 25 }).events;
    expect(share(straight, (e) => e.aligned)).toBeGreaterThanOrEqual(0.95);
    expect(share(leaning, (e) => !e.aligned)).toBeGreaterThanOrEqual(0.9);
    expect(leaning[5].armLeanDeg).toBeCloseTo(25, -1);
  });

  it('recoil=1: full recoil; recoil=0.6: at least 90% flagged', () => {
    const full = session({ recoil: 1 }).events;
    const partial = session({ recoil: 0.6 }).events;
    expect(share(full, (e) => e.fullRecoil)).toBeGreaterThanOrEqual(0.95);
    expect(share(partial, (e) => !e.fullRecoil)).toBeGreaterThanOrEqual(0.9);
    const later = partial.slice(3).map((e) => e.recoilRatio);
    expect(Math.max(...later)).toBeLessThan(config.RECOIL_MIN_RATIO);
  });

  it('good technique raises no live issue; each fault raises only its own', () => {
    const last = (p) => session(p).issues.at(-1);
    expect(last({})).toEqual({ elbows: false, position: false, recoil: false });
    expect(last({ bend: 30 })).toEqual({ elbows: true, position: false, recoil: false });
    expect(last({ lean: 25 })).toEqual({ elbows: false, position: true, recoil: false });
    expect(last({ recoil: 0.6 })).toEqual({ elbows: false, position: false, recoil: true });
  });

  it('holds up with three times the default noise', () => {
    const good = session({ noise: 3 }).events;
    expect(share(good, (e) => e.elbowsLocked && e.aligned && e.fullRecoil)).toBeGreaterThanOrEqual(0.9);
  });
});

describe('arm choice and angles', () => {
  it('chooses the arm with higher visibility', () => {
    const f = simFrame(0, { noise: 0 });
    expect(chooseArm(f.landmarks)).toBe('left'); // simulator: near side is left
    for (const i of [11, 13, 15]) f.landmarks[i].visibility = 0.3;
    for (const i of [12, 14, 16]) f.landmarks[i].visibility = 0.9;
    expect(chooseArm(f.landmarks)).toBe('right');
  });

  it('uses the chosen arm for the angles', () => {
    const f = simFrame(0, { noise: 0 });
    // Bend the right arm only: 90° at the elbow.
    const set = (i, x, y) => Object.assign(f.landmarks[i], { x: x / 1280, y: y / 720 });
    set(12, 600, 200); set(14, 600, 400); set(16, 800, 400);
    expect(elbowAngleDeg(f)).toBeGreaterThan(170); // left arm, straight
    for (const i of [11, 13, 15]) f.landmarks[i].visibility = 0.3;
    for (const i of [12, 14, 16]) f.landmarks[i].visibility = 0.9;
    expect(elbowAngleDeg(f)).toBeCloseTo(90);
  });

  it('angles are right on a 1280×720 frame and wrong without pixel conversion', () => {
    const f = { width: 1280, height: 720, landmarks: Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.1 })) };
    // Left arm in pixels: shoulder (640,200), elbow (640,380), wrist (820,560).
    // Elbow: 135° in pixels. Lean of shoulder→wrist: atan(180/360) = 26.57°.
    const set = (i, x, y) => Object.assign(f.landmarks[i], { x: x / 1280, y: y / 720, visibility: 0.95 });
    set(11, 640, 200); set(13, 640, 380); set(15, 820, 560);
    expect(elbowAngleDeg(f)).toBeCloseTo(135, 1);
    expect(armLeanDeg(f)).toBeCloseTo(26.57, 1);
    // The same landmarks treated as if normalised x and y had the same scale give other answers.
    const L = f.landmarks;
    const n = (i) => ({ x: L[i].x, y: L[i].y });
    expect(Math.abs(angleAt(n(11), n(13), n(15)) - 135)).toBeGreaterThan(5);
    expect(Math.abs(angleFromVertical(n(11), n(15)) - 26.57)).toBeGreaterThan(5);
  });

  it('returns null when the arm is not visible enough', () => {
    const f = simFrame(0);
    for (const i of [11, 12, 13, 14, 15, 16]) f.landmarks[i].visibility = 0.2;
    expect(elbowAngleDeg(f, config.MIN_VISIBILITY)).toBeNull();
    expect(armLeanDeg(f, config.MIN_VISIBILITY)).toBeNull();
    expect(elbowAngleDeg({ ...f, landmarks: null })).toBeNull();
  });
});

describe('two-of-three rule', () => {
  // Drive the tracker with synthetic frames whose elbow angle we choose per cycle.
  function tracker() {
    const form = createFormTracker(config);
    let t = 0;
    let index = 0;
    const frameWithElbow = (deg) => {
      const f = { t, width: 1280, height: 720, landmarks: Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.95 })) };
      const rad = ((180 - deg) * Math.PI) / 180;
      const set = (i, x, y) => Object.assign(f.landmarks[i], { x: x / 1280, y: y / 720 });
      set(11, 640, 200); set(13, 640, 380); set(15, 640 + 180 * Math.sin(rad), 380 + 180 * Math.cos(rad));
      for (const i of [12, 14, 16]) f.landmarks[i].visibility = 0.1;
      return f;
    };
    return {
      form,
      compression(deg) {
        for (let k = 0; k < 5; k++, t += 100) form.onFrame(frameWithElbow(deg), { t, valid: true, smooth: 0 });
        form.complete({ index: index++, tTop: t - 400, tBottom: t - 200, travel: 0.1, intervalMs: 545 });
        return form.getLiveIssues().elbows;
      },
    };
  }

  it('a single bad compression does not raise an issue', () => {
    const tr = tracker();
    expect([175, 175, 140, 175, 175].map((d) => tr.compression(d))).toEqual([false, false, false, false, false]);
  });

  it('two of the last three bad raises it, two of the last three good clears it', () => {
    const tr = tracker();
    expect(tr.compression(140)).toBe(false); // one bad
    expect(tr.compression(140)).toBe(true); // two bad
    expect(tr.compression(175)).toBe(true); // bad, bad, good: still two bad
    expect(tr.compression(175)).toBe(false); // bad, good, good: two good
    expect(tr.compression(140)).toBe(false); // good, good, bad
  });

  it('reset clears the live issues', () => {
    const tr = tracker();
    tr.compression(140); tr.compression(140);
    expect(tr.form.getLiveIssues().elbows).toBe(true);
    tr.form.reset();
    expect(tr.form.getLiveIssues()).toEqual({ elbows: false, position: false, recoil: false });
  });
});
