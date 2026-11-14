// Fatigue: is this compressor slipping below their own start? Pure logic.
//
// The first FATIGUE_BASELINE_MS of a turn (from its first compression, and at least
// MIN_BASELINE compressions) set the compressor's own baseline: median travel,
// median rate and share of locked elbows. After that, the last FATIGUE_WINDOW
// compressions are compared with it. This compares a person with themselves; it is
// not a measurement of force or depth.

const MIN_BASELINE = 6;
const SIGN_ORDER = ['shallower', 'slower', 'elbows'];

function median(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * @param {object} config needs FATIGUE_BASELINE_MS, FATIGUE_WINDOW, FATIGUE_TRAVEL_DROP,
 *   FATIGUE_RATE_DROP_CPM, FATIGUE_ELBOW_DROP, RATE_STALE_MS
 */
export function createFatigueTracker(config) {
  let startT; // tBottom of the turn's first compression
  let collecting; // events in the baseline period
  let baseline; // { travel, rate, locked } or null
  let recent; // last FATIGUE_WINDOW events after the baseline
  let state;

  function startTurn() {
    startT = null;
    collecting = [];
    baseline = null;
    recent = [];
    state = { slipping: false, signs: [] };
  }
  startTurn();

  // Rate from intervals, ignoring pauses (a switch, a stop) longer than RATE_STALE_MS.
  function rateOf(events) {
    const ivs = events
      .map((e) => e.intervalMs)
      .filter((iv) => Number.isFinite(iv) && iv > 0 && iv <= config.RATE_STALE_MS);
    const m = median(ivs);
    return m ? 60000 / m : null;
  }
  const lockedShare = (events) => events.filter((e) => e.elbowsLocked).length / events.length;

  function summarise(events) {
    return { travel: median(events.map((e) => e.travel)), rate: rateOf(events), locked: lockedShare(events) };
  }

  function evaluate() {
    if (!baseline || recent.length < config.FATIGUE_WINDOW) {
      state = { slipping: false, signs: [] };
      return;
    }
    const now = summarise(recent);
    const signs = [];
    if (baseline.travel > 0 && now.travel <= baseline.travel * (1 - config.FATIGUE_TRAVEL_DROP)) signs.push('shallower');
    if (baseline.rate !== null && now.rate !== null && now.rate <= baseline.rate - config.FATIGUE_RATE_DROP_CPM) {
      signs.push('slower');
    }
    if (now.locked <= baseline.locked - config.FATIGUE_ELBOW_DROP) signs.push('elbows');
    signs.sort((a, b) => SIGN_ORDER.indexOf(a) - SIGN_ORDER.indexOf(b));
    state = { slipping: signs.length > 0, signs };
  }

  return {
    startTurn,

    /** A finished compression event (with travel, intervalMs, elbowsLocked). Returns its travelRatio. */
    push(event) {
      if (!baseline) {
        if (startT === null) startT = event.tBottom;
        const inWindow = event.tBottom - startT < config.FATIGUE_BASELINE_MS;
        if (inWindow || collecting.length < MIN_BASELINE) {
          collecting.push(event);
          return null;
        }
        baseline = summarise(collecting);
        collecting = [];
      }
      recent.push(event);
      if (recent.length > config.FATIGUE_WINDOW) recent.shift();
      evaluate();
      return baseline.travel > 0 ? event.travel / baseline.travel : null;
    },

    /** { slipping, signs } — a copy, safe to hand out. */
    getState() {
      return { slipping: state.slipping, signs: [...state.signs] };
    },

    /** The baseline, or null while it is being set. For debugging and tests. */
    getBaseline() {
      return baseline ? { ...baseline } : null;
    },
  };
}
