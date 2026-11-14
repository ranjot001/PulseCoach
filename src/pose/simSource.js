// Simulated pose frames: a kneeling figure seen side-on doing chest compressions.
// simFrame is pure, so tests get repeatable frames.

export const SIM_WIDTH = 1280;
export const SIM_HEIGHT = 720;
export const SIM_FPS = 30;

export const SIM_DEFAULTS = {
  cpm: 110, // compressions per minute
  travel: 0.1, // shoulder travel per compression, torso units
  noise: 1, // landmark jitter, pixels (standard deviation)
  bend: 0, // degrees of elbow bend (0 = locked straight)
  lean: 0, // degrees of arm lean from vertical
  recoil: 1, // fraction of the way back up after each compression
  scale: 1, // 1 = torso about 30% of the frame height
  drift: 0, // slow posture drift of the upper body (hips stay still), torso units per second
  seed: 1,
};

const TORSO_FRACTION = 0.3;

// mulberry32: small seeded PRNG
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand) {
  const u = Math.max(rand(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/** Downward shoulder displacement as a fraction of `travel`, 0 (top) .. 1 (bottom). */
export function compressionPhase(tMs, cpm, recoil) {
  const p = ((tMs * cpm) / 60000) % 1;
  const wave = (1 - Math.cos(2 * Math.PI * p)) / 2; // 0 at top, 1 at bottom
  const r = Math.min(1, Math.max(0, recoil));
  return 1 - r + r * wave;
}

/**
 * One frame of 33 landmarks for a side-on kneeling figure on a 1280×720 frame.
 * @returns {{t, width, height, landmarks}}
 */
export function simFrame(tMs, params = {}) {
  const p = { ...SIM_DEFAULTS, ...params };
  const W = SIM_WIDTH;
  const H = SIM_HEIGHT;
  const T = TORSO_FRACTION * H * p.scale; // torso length in pixels
  const rad = Math.PI / 180;

  // Arms: two equal segments; bending shortens the shoulder-to-wrist distance.
  const seg = 0.45 * T;
  const bend = Math.max(0, p.bend) * rad;
  const reach = 2 * seg * Math.cos(bend / 2);
  const lean = p.lean * rad;

  // Anchor: hands rest on the pillow, centre of the frame, at 80% height.
  const driftPx = p.drift * T * (tMs / 1000);
  const down = compressionPhase(tMs, p.cpm, p.recoil) * p.travel * T;
  const wristRest = { x: W * 0.55, y: H * 0.8 - 0.5 * T * (1 - p.scale) };
  const wrist = { x: wristRest.x, y: wristRest.y + down + driftPx };
  // Shoulder above the wrist, tilted back by the lean angle (hands ahead of shoulders).
  const shoulder = { x: wrist.x - reach * Math.sin(lean), y: wrist.y - reach * Math.cos(lean) };
  // Elbow bows outward from the shoulder→wrist line.
  const mid = { x: (shoulder.x + wrist.x) / 2, y: (shoulder.y + wrist.y) / 2 };
  const bow = seg * Math.sin(bend / 2);
  const elbow = { x: mid.x + bow * Math.cos(lean), y: mid.y - bow * Math.sin(lean) };

  // Hips stay still (apart from drift): behind and below the resting shoulder.
  const restShoulder = { x: wristRest.x - reach * Math.sin(lean), y: wristRest.y - reach * Math.cos(lean) };
  const hip = { x: restShoulder.x - 0.8 * T, y: restShoulder.y + 0.6 * T };
  const knee = { x: hip.x + 0.1 * T, y: hip.y + 0.55 * T };
  const ankle = { x: knee.x - 0.6 * T, y: knee.y + 0.05 * T };
  const head = { x: shoulder.x + 0.3 * T, y: shoulder.y - 0.25 * T };

  // Near side (left, odd indices) clearly visible; far side a few pixels behind.
  const far = (pt) => ({ x: pt.x - 0.03 * T, y: pt.y - 0.01 * T });
  const pts = new Array(33);
  for (let i = 0; i <= 10; i++) pts[i] = { ...head, x: head.x + (i % 3) * 0.03 * T, y: head.y + (i % 4) * 0.02 * T, v: 0.9 };
  const pair = (l, r, pt) => {
    pts[l] = { ...pt, v: 0.95 };
    pts[r] = { ...far(pt), v: 0.8 };
  };
  pair(11, 12, shoulder);
  pair(13, 14, elbow);
  pair(15, 16, wrist);
  pair(17, 18, { x: wrist.x + 0.05 * T, y: wrist.y });
  pair(19, 20, { x: wrist.x + 0.07 * T, y: wrist.y });
  pair(21, 22, { x: wrist.x + 0.03 * T, y: wrist.y - 0.02 * T });
  pair(23, 24, hip);
  pair(25, 26, knee);
  pair(27, 28, ankle);
  pair(29, 30, { x: ankle.x - 0.05 * T, y: ankle.y });
  pair(31, 32, { x: ankle.x - 0.12 * T, y: ankle.y });

  const rand = rng((p.seed * 2654435761) ^ Math.round(tMs * 1000));
  const landmarks = pts.map((pt) => ({
    x: (pt.x + gaussian(rand) * p.noise) / W,
    y: (pt.y + gaussian(rand) * p.noise) / H,
    z: 0,
    visibility: pt.v,
  }));

  return { t: tMs, width: W, height: H, landmarks };
}

/**
 * Real-time simulated source at 30 frames per second.
 * @param {object} params simFrame parameters
 * @param {{setInterval, clearInterval, now}} [timers]
 */
export function createSimSource(params = {}, timers = {}) {
  const t = {
    setInterval: (fn, ms) => globalThis.setInterval(fn, ms),
    clearInterval: (id) => globalThis.clearInterval(id),
    now: () => (globalThis.performance ? globalThis.performance.now() : Date.now()),
    ...timers,
  };
  let id = null;
  let t0 = 0;
  let lastT = -1;
  return {
    start(onFrame) {
      this.stop();
      t0 = t.now();
      lastT = -1;
      id = t.setInterval(() => {
        let ts = t.now() - t0;
        if (ts <= lastT) ts = lastT + 1; // strictly increasing
        lastT = ts;
        onFrame(simFrame(ts, params));
      }, 1000 / SIM_FPS);
    },
    stop() {
      if (id !== null) t.clearInterval(id);
      id = null;
    },
  };
}
