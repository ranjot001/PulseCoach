// Counts compressions from the detrended motion signal. Pure logic.
//
// Two-state machine with hysteresis. Pushing down makes the signal larger.
//   up   → down when detrended rises above +h
//   down → up   when detrended falls below −h      (h = MIN_TRAVEL / 2)
// In each state we track the extreme (top = minimum while up, bottom = maximum
// while down). On down → up we have a full top-to-bottom stroke and emit it.
//
// Timing: the bottom of the wave is flat, so the single highest sample jumps
// around by a few frames with landmark jitter. The zero crossings on either side
// are steep and precise, so tBottom is the midpoint of the interpolated crossing
// on the way down and the one on the way back up.

const INVALID_RESET_MS = 1000;
// How far (as a fraction of the stroke's width) the crossing midpoint may sit from
// the highest sample and still be trusted as the time of the bottom.
const SYMMETRY_TOLERANCE = 0.35;

/**
 * @param {object} config needs MIN_TRAVEL, MIN_INTERVAL_MS
 */
export function createCompressionDetector(config) {
  const h = config.MIN_TRAVEL / 2;
  let state;
  let top; // {t, v} lowest point of the current/last up phase
  let bottom; // {t, v} highest point of the current down phase
  let lastBottomT;
  let index;
  let invalidSince;
  let prev; // previous valid sample {t, v}
  let crossDown; // time the signal last rose through 0 (pushing down)
  let crossUp; // time it last fell back through 0 (coming up)

  function reset() {
    state = 'up';
    top = null;
    bottom = null;
    lastBottomT = null;
    index = 0;
    invalidSince = null;
    prev = null;
    crossDown = null;
    crossUp = null;
  }
  reset();

  function softReset() {
    // Keep the index; forget the stroke in progress and the interval.
    state = 'up';
    top = null;
    bottom = null;
    lastBottomT = null;
    prev = null;
    crossDown = null;
    crossUp = null;
  }

  // Linear interpolation of the time the signal crossed zero between prev and (t, v).
  function zeroTime(t, v) {
    if (!prev || prev.v === v) return t;
    return prev.t + ((0 - prev.v) / (v - prev.v)) * (t - prev.t);
  }

  return {
    reset,
    /**
     * @param {{t:number, detrended:number|null, valid:boolean}} sample
     * @returns {object|null} partial compression event
     */
    push(sample) {
      const { t } = sample;
      if (!sample.valid || sample.detrended === null || !Number.isFinite(sample.detrended)) {
        if (invalidSince === null) invalidSince = t;
        if (t - invalidSince > INVALID_RESET_MS) softReset();
        return null;
      }
      invalidSince = null;
      const v = sample.detrended;
      if (prev) {
        if (prev.v <= 0 && v > 0) crossDown = zeroTime(t, v);
        else if (prev.v >= 0 && v < 0) crossUp = zeroTime(t, v);
      }
      const before = prev;
      prev = { t, v };

      if (state === 'up') {
        if (!top || v < top.v) top = { t, v };
        if (v > h) {
          state = 'down';
          bottom = { t, v };
          if (crossDown === null || (before && crossDown < before.t - 1000)) crossDown = null;
          crossUp = null;
        }
        return null;
      }

      // state === 'down'
      if (v > bottom.v) bottom = { t, v };
      if (v >= -h) return null;

      // down → up: one full stroke, top → bottom.
      const stroke = { top, bottom };
      // Use the crossing midpoint only when the stroke is roughly symmetric around its
      // peak. A lopsided stroke (e.g. the learner stops mid-push and the signal
      // decays slowly) keeps the time of its highest sample.
      const mid = crossDown !== null && crossUp !== null ? (crossDown + crossUp) / 2 : null;
      const symmetric =
        mid !== null && crossDown < bottom.t && crossUp > bottom.t &&
        Math.abs(mid - bottom.t) <= SYMMETRY_TOLERANCE * (crossUp - crossDown);
      const tBottom = symmetric ? mid : bottom.t;
      state = 'up';
      top = { t, v };
      bottom = null;
      if (!stroke.top) return null; // started mid-stroke: no known top

      const travel = stroke.bottom.v - stroke.top.v;
      const intervalMs = lastBottomT === null ? null : tBottom - lastBottomT;
      if (travel < config.MIN_TRAVEL) return null;
      if (intervalMs !== null && intervalMs < config.MIN_INTERVAL_MS) return null;

      lastBottomT = tBottom;
      const event = {
        index,
        tBottom,
        tTop: stroke.top.t,
        travel,
        intervalMs,
      };
      index += 1;
      return event;
    },
  };
}
