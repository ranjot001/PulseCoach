// Form checks for each compression: locked elbows, shoulders over hands, full recoil.
// Pure logic: no DOM, no timers.
import { toPixels, angleAt, angleFromVertical } from './geometry.js';

const ARMS = {
  left: { shoulder: 11, elbow: 13, wrist: 15 },
  right: { shoulder: 12, elbow: 14, wrist: 16 },
};

const RECOIL_TOP_WINDOW_MS = 6000; // fallback reference: highest top in roughly the last 6 s
const REST_CAPTURE_MS = 400; // markRest(): median shoulder height over this long after the call
const EXTREME_SAMPLES = 1; // samples averaged for a stroke's top and bottom; 1 was the best balance in a noise sweep
const HISTORY_MS = 8000; // samples kept for recoil lookups

const vis = (l) => l?.visibility ?? 0;

/** The arm nearer the camera: higher average visibility of shoulder, elbow and wrist. */
export function chooseArm(landmarks) {
  if (!landmarks) return null;
  const score = (a) => (vis(landmarks[a.shoulder]) + vis(landmarks[a.elbow]) + vis(landmarks[a.wrist])) / 3;
  return score(ARMS.right) > score(ARMS.left) ? 'right' : 'left';
}

function armPixels(frame, minVisibility = 0) {
  const lm = frame?.landmarks;
  const side = chooseArm(lm);
  if (!side) return null;
  const a = ARMS[side];
  const pts = [lm[a.shoulder], lm[a.elbow], lm[a.wrist]];
  if (pts.some((p) => !p || vis(p) < minVisibility)) return null;
  const [shoulder, elbow, wrist] = pts.map((p) => toPixels(p, frame.width, frame.height));
  return { side, shoulder, elbow, wrist };
}

/** Angle at the elbow between shoulder and wrist, degrees, pixel space. null if the arm is not visible. */
export function elbowAngleDeg(frame, minVisibility = 0) {
  const arm = armPixels(frame, minVisibility);
  if (!arm) return null;
  const a = angleAt(arm.shoulder, arm.elbow, arm.wrist);
  return Number.isFinite(a) ? a : null;
}

/** Angle between the shoulder→wrist line and vertical, degrees, pixel space. null if not visible. */
export function armLeanDeg(frame, minVisibility = 0) {
  const arm = armPixels(frame, minVisibility);
  if (!arm) return null;
  const a = angleFromVertical(arm.shoulder, arm.wrist);
  return Number.isFinite(a) ? a : null;
}

function median(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Two-of-three rule: a check starts failing when two of the last three compressions
 * failed it, and passes again when two of the last three pass.
 */
function createVote() {
  let last = [];
  let failing = false;
  return {
    push(pass) {
      last.push(pass);
      if (last.length > 3) last.shift();
      const fails = last.filter((p) => !p).length;
      const passes = last.length - fails;
      if (fails >= 2) failing = true;
      else if (passes >= 2) failing = false;
    },
    get failing() {
      return failing;
    },
    reset() {
      last = [];
      failing = false;
    },
  };
}

/**
 * @param {object} config needs ELBOW_LOCKED_DEG, ARM_LEAN_MAX_DEG, RECOIL_MIN_RATIO, MIN_VISIBILITY
 */
export function createFormTracker(config) {
  let cycleElbow = []; // angles since the last compression
  let cycleLean = [];
  let history = []; // { t, smooth } signal samples, for recoil
  let prevBottomT = null;
  let restRef = null; // shoulder height at rest (markRest)
  let restCaptureUntil = null;
  let restSamples = [];
  let lastT = null;
  const votes = { elbows: createVote(), position: createVote(), recoil: createVote() };

  // A stroke's top or bottom: the mean of the EXTREME_SAMPLES most extreme values in a
  // window. Averaging more fights jitter but cuts the rounded peak short.
  function extreme(from, to, highest) {
    const xs = [];
    for (const h of history) if (h.t >= from && h.t <= to) xs.push(h.smooth);
    if (!xs.length) return null;
    xs.sort((a, b) => (highest ? b - a : a - b));
    const top = xs.slice(0, Math.min(EXTREME_SAMPLES, xs.length));
    return top.reduce((a, b) => a + b, 0) / top.length;
  }
  const minSmooth = (from, to) => extreme(from, to, false);
  const maxSmooth = (from, to) => extreme(from, to, true);

  return {
    /** Every frame, with its motion-signal sample. */
    onFrame(frame, sample) {
      lastT = frame.t;
      const e = elbowAngleDeg(frame, config.MIN_VISIBILITY);
      const l = armLeanDeg(frame, config.MIN_VISIBILITY);
      if (e !== null) cycleElbow.push(e);
      if (l !== null) cycleLean.push(l);
      // Recoil uses the pixel height: within a session it is a fair ruler, while the
      // torso-unit signal is stretched slightly by torso length changing during pushes.
      const height = sample?.smoothPx ?? sample?.smooth;
      if (sample?.valid && Number.isFinite(height)) {
        history.push({ t: sample.t, smooth: height });
        while (history.length && history[0].t < sample.t - HISTORY_MS) history.shift();
        // The learner is still at "go": the rest height is the median of the capture window.
        if (restCaptureUntil !== null) {
          restSamples.push(height);
          if (sample.t >= restCaptureUntil) {
            restRef = median(restSamples);
            restSamples = [];
            restCaptureUntil = null;
          }
        }
      }
    },

    /** Fill the form fields of a compression event (index, tTop, tBottom, travel, intervalMs). */
    complete(event) {
      const elbow = median(cycleElbow);
      const lean = median(cycleLean);
      cycleElbow = [];
      cycleLean = [];

      // Recoil: the release leading into this push. Top = highest point between the
      // previous bottom and this one; bottom = lowest point of this stroke.
      const now = lastT ?? event.tBottom;
      const from = prevBottomT ?? event.tBottom - 1500;
      const top = minSmooth(from, event.tBottom);
      const bottom = maxSmooth(event.tTop, now);
      prevBottomT = event.tBottom;
      const ref = restRef !== null && restCaptureUntil === null ? restRef : minSmooth(now - RECOIL_TOP_WINDOW_MS, now);
      let recoilRatio = 1;
      if (top !== null && bottom !== null && ref !== null && bottom - ref > 1e-6) {
        recoilRatio = Math.max(0, Math.min(1.5, (bottom - top) / (bottom - ref)));
      }

      const elbowAngle = elbow ?? 180;
      const leanAngle = lean ?? 0;
      const fields = {
        elbowAngleDeg: elbowAngle,
        armLeanDeg: leanAngle,
        recoilRatio,
        elbowsLocked: elbowAngle >= config.ELBOW_LOCKED_DEG,
        aligned: leanAngle <= config.ARM_LEAN_MAX_DEG,
        fullRecoil: recoilRatio >= config.RECOIL_MIN_RATIO,
      };
      votes.elbows.push(fields.elbowsLocked);
      votes.position.push(fields.aligned);
      votes.recoil.push(fields.fullRecoil);
      return fields;
    },

    getLiveIssues() {
      return {
        elbows: votes.elbows.failing,
        position: votes.position.failing,
        recoil: votes.recoil.failing,
      };
    },

    /** Record the resting shoulder height: the median over the next REST_CAPTURE_MS. */
    markRest() {
      restRef = null;
      restSamples = [];
      restCaptureUntil = (lastT ?? 0) + REST_CAPTURE_MS;
    },

    /** Clear cycles, recoil lookups and the live issues. The rest reference is kept. */
    reset() {
      cycleElbow = [];
      cycleLean = [];
      prevBottomT = null;
      for (const v of Object.values(votes)) v.reset();
    },
  };
}
