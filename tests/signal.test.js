import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { createMotionSignal } from '../src/lib/signal.js';
import { simFrame, SIM_FPS } from '../src/pose/simSource.js';

// Run the motion signal over simulated frames; skip the first `warmMs`.
function run(params = {}, seconds = 10, warmMs = 2000) {
  const signal = createMotionSignal(config);
  const out = [];
  const dt = 1000 / SIM_FPS;
  for (let t = 0; t <= seconds * 1000; t += dt) {
    const s = signal.push(simFrame(t, params));
    if (t >= warmMs) out.push(s);
  }
  return out;
}

const values = (out) => out.map((s) => s.detrended);
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
function amplitude(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const q = (f) => s[Math.floor(f * (s.length - 1))];
  return (q(0.98) - q(0.02)) / 2;
}

// Upward zero crossings with a little hysteresis; cycles per minute from first to last.
function cyclesPerMinute(out, hyst = 0.005) {
  const times = [];
  let armed = false;
  for (const s of out) {
    if (s.detrended < -hyst) armed = true;
    else if (armed && s.detrended > 0) {
      times.push(s.t);
      armed = false;
    }
  }
  return ((times.length - 1) * 60000) / (times.at(-1) - times[0]);
}

describe('motion signal on simulated frames', () => {
  it('110 per minute gives 110 ± 2 cycles per minute over 10 s', () => {
    const out = run({ cpm: 110 }, 10, 1000);
    expect(out.every((s) => s.valid)).toBe(true);
    expect(cyclesPerMinute(out)).toBeGreaterThanOrEqual(108);
    expect(cyclesPerMinute(out)).toBeLessThanOrEqual(112);
  });

  it('removes slow drift: detrended mean stays within 10% of the amplitude', () => {
    // Shift by 10% of torso length over 10 s.
    const out = run({ drift: 0.01 }, 10);
    const amp = amplitude(values(out));
    expect(amp).toBeGreaterThan(0.03);
    expect(Math.abs(mean(values(out)))).toBeLessThan(0.1 * amp);
    // Raw signal really did drift.
    expect(out.at(-1).raw - out[0].raw).toBeGreaterThan(0.05);
  });

  it('travel 0 keeps detrended amplitude below half of MIN_TRAVEL', () => {
    const out = run({ travel: 0 }, 10);
    const xs = values(out);
    const peak = (Math.max(...xs) - Math.min(...xs)) / 2;
    expect(peak).toBeLessThan(config.MIN_TRAVEL / 2);
  });

  it('scale 0.5 gives the same amplitude as full size within 10%', () => {
    const full = amplitude(values(run({ scale: 1 })));
    const half = amplitude(values(run({ scale: 0.5 })));
    expect(Math.abs(half - full) / full).toBeLessThan(0.1);
    expect(full).toBeGreaterThan(0.04); // travel 0.10 → about 0.05 either side
  });

  it('is invalid when the shoulders have low visibility or there is no person', () => {
    const signal = createMotionSignal(config);
    const f = simFrame(0);
    f.landmarks[11].visibility = 0.1;
    f.landmarks[12].visibility = 0.2;
    expect(signal.push(f).valid).toBe(false);
    expect(signal.push({ ...simFrame(33), landmarks: null }).valid).toBe(false);
    const g = simFrame(66);
    g.landmarks[23].visibility = 0.1;
    g.landmarks[24].visibility = 0.1;
    expect(signal.push(g).valid).toBe(false);
    expect(signal.push(simFrame(100)).valid).toBe(true);
  });

  it('raw is in torso units and grows when the shoulders go down', () => {
    const top = createMotionSignal(config).push(simFrame(0, { noise: 0 }));
    const bottom = createMotionSignal(config).push(simFrame(60000 / 110 / 2, { noise: 0 }));
    expect(bottom.raw).toBeGreaterThan(top.raw);
  });
});

describe('simFrame', () => {
  it('is deterministic for a seed and has 33 normalised landmarks', () => {
    const a = simFrame(1234, { seed: 7 });
    const b = simFrame(1234, { seed: 7 });
    expect(a).toEqual(b);
    expect(a.landmarks).toHaveLength(33);
    expect(a.width).toBe(1280);
    expect(a.height).toBe(720);
    for (const l of a.landmarks) {
      expect(l.x).toBeGreaterThan(0); expect(l.x).toBeLessThan(1);
      expect(l.y).toBeGreaterThan(0); expect(l.y).toBeLessThan(1);
    }
  });

  it('torso is about 30% of frame height at scale 1, and hips stay still', () => {
    const torsoPx = (f) => {
      const L = f.landmarks;
      const sx = (L[11].x + L[12].x) / 2 * 1280, sy = (L[11].y + L[12].y) / 2 * 720;
      const hx = (L[23].x + L[24].x) / 2 * 1280, hy = (L[23].y + L[24].y) / 2 * 720;
      return Math.hypot(sx - hx, sy - hy);
    };
    const f0 = simFrame(0, { noise: 0 });
    expect(torsoPx(f0) / 720).toBeCloseTo(0.3, 1);
    const f1 = simFrame(250, { noise: 0 });
    expect(f1.landmarks[23]).toEqual(f0.landmarks[23]);
    // wrists are below the shoulders
    expect(f0.landmarks[15].y).toBeGreaterThan(f0.landmarks[11].y);
  });

  it('bend and lean change the arm geometry', async () => {
    const { angleAt, angleFromVertical, toPixels } = await import('../src/lib/geometry.js');
    const px = (f, i) => toPixels(f.landmarks[i], f.width, f.height);
    const straight = simFrame(0, { noise: 0 });
    const bent = simFrame(0, { noise: 0, bend: 30 });
    const leaning = simFrame(0, { noise: 0, lean: 25 });
    expect(angleAt(px(straight, 11), px(straight, 13), px(straight, 15))).toBeCloseTo(180, 0);
    expect(angleAt(px(bent, 11), px(bent, 13), px(bent, 15))).toBeCloseTo(150, 0);
    expect(angleFromVertical(px(leaning, 11), px(leaning, 15))).toBeCloseTo(25, 0);
  });
});
