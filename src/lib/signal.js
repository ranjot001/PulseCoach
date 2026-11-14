// Motion signal: shoulder-midpoint height in torso units, smoothed and detrended.
// push(frame) → { t, raw, smooth, detrended, torsoLen, smoothPx, valid }
// Image y grows downward, so pushing down makes the signal larger.
// Pure logic: no DOM, no timers.
import { toPixels, distance, midpoint } from './geometry.js';

const SHOULDERS = [11, 12];
const HIPS = [23, 24];

// Rolling window of {t, v} samples by time.
function windowBuffer(spanMs) {
  const items = [];
  let sum = 0;
  return {
    push(t, v) {
      items.push({ t, v });
      sum += v;
      while (items.length && items[0].t <= t - spanMs) sum -= items.shift().v;
    },
    mean() {
      return items.length ? sum / items.length : NaN;
    },
    median() {
      if (!items.length) return NaN;
      const s = items.map((i) => i.v).sort((a, b) => a - b);
      const m = s.length >> 1;
      return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    },
    oldest() {
      return items[0];
    },
    clear() {
      items.length = 0;
      sum = 0;
    },
    get length() {
      return items.length;
    },
  };
}

// Midpoint of the visible landmarks of a pair, in pixels; null if neither is visible.
function visiblePoint(landmarks, pair, width, height, minVis) {
  const seen = pair.filter((i) => landmarks[i] && (landmarks[i].visibility ?? 0) >= minVis);
  if (!seen.length) return null;
  const pts = seen.map((i) => toPixels(landmarks[i], width, height));
  return pts.length === 2 ? midpoint(pts[0], pts[1]) : pts[0];
}

/**
 * @param {object} config needs BASELINE_WINDOW_MS, MIN_TRAVEL, MIN_VISIBILITY, SMOOTH_WINDOW_MS, TORSO_WINDOW_MS
 */
export function createMotionSignal(config) {
  const baselineMs = config.BASELINE_WINDOW_MS;
  const torso = windowBuffer(config.TORSO_WINDOW_MS);
  const hipY = windowBuffer(config.TORSO_WINDOW_MS); // hips barely move: a steady reference
  const smoothBuf = windowBuffer(config.SMOOTH_WINDOW_MS);
  const smoothPxBuf = windowBuffer(config.SMOOTH_WINDOW_MS);
  const baseBuf = windowBuffer(baselineMs);
  const baseHistory = windowBuffer(baselineMs); // past baseline means, for lag compensation
  let lastValidT = null;

  function reset() {
    torso.clear();
    hipY.clear();
    smoothBuf.clear();
    smoothPxBuf.clear();
    baseBuf.clear();
    baseHistory.clear();
    lastValidT = null;
  }

  function invalid(t, torsoLen = null) {
    return { t, raw: null, smooth: null, detrended: null, torsoLen, smoothPx: null, valid: false };
  }

  return {
    reset,
    push(frame) {
      const { t, width, height, landmarks } = frame;
      if (!landmarks) return invalid(t);
      const sh = visiblePoint(landmarks, SHOULDERS, width, height, config.MIN_VISIBILITY);
      const hp = visiblePoint(landmarks, HIPS, width, height, config.MIN_VISIBILITY);
      if (!sh || !hp) return invalid(t);
      const len = distance(sh, hp);
      if (!(len > 0)) return invalid(t);

      // A long gap means the windows hold stale posture: start over.
      if (lastValidT !== null && t - lastValidT > baselineMs) reset();
      lastValidT = t;

      torso.push(t, len);
      hipY.push(t, hp.y);
      const torsoLen = torso.median();
      // Shoulder height measured from the hips, in torso units. Using the hips as
      // the reference (instead of the top of the frame) keeps the signal independent
      // of where the learner sits in the frame and of the small torso-length wobble.
      // The hip height is a rolling median, so hip jitter does not add to the signal.
      const heightPx = sh.y - hipY.median();
      const raw = heightPx / torsoLen;

      smoothBuf.push(t, raw);
      const smooth = smoothBuf.mean();
      // The same height in plain pixels, smoothed. Ratios within a session (recoil) use
      // this: torso length shrinks a little during each push, which would skew them.
      smoothPxBuf.push(t, heightPx);
      const smoothPx = smoothPxBuf.mean();

      // Baseline: moving average over BASELINE_WINDOW_MS. A trailing average lags a
      // steady drift by half a window, so add back the slope over the last window.
      // The correction only starts once a full window of history exists, and is
      // capped: posture drift is slow, and an uncapped correction overshoots when
      // the learner stops mid-push, which would look like a compression.
      baseBuf.push(t, smooth);
      const ma = baseBuf.mean();
      const past = baseHistory.oldest();
      baseHistory.push(t, ma);
      let baseline = ma;
      if (past && t - past.t >= baselineMs * 0.9) {
        const slopePerMs = (ma - past.v) / (t - past.t);
        const cap = config.MIN_TRAVEL / 4;
        baseline = ma + Math.max(-cap, Math.min(cap, (slopePerMs * baselineMs) / 2));
      }

      return { t, raw, smooth, detrended: smooth - baseline, torsoLen, smoothPx, valid: true };
    },
  };
}
