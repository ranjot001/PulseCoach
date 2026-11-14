// Coaching cue selection. Pure logic: no DOM, no timers. Time comes in as `now` (ms).
import { config as defaultConfig } from '../config.js';
import { CUES } from '../copy.js';

/** Problem cue ids, highest priority first. Praise comes after all of them. */
export const PRIORITY = ['notVisible', 'slow', 'fast', 'elbows', 'position', 'recoil', 'shallow', 'deep'];

/** The problems present in one engine state, in priority order. */
export function activeProblems(state) {
  if (!state || !state.ready) return [];
  if (!state.personVisible) return ['notVisible'];
  const issues = state.issues || {};
  const out = [];
  if (state.rateZone === 'slow') out.push('slow');
  if (state.rateZone === 'fast') out.push('fast');
  if (issues.elbows) out.push('elbows');
  if (issues.position) out.push('position');
  if (issues.recoil) out.push('recoil');
  if (issues.depth === 'shallow') out.push('shallow');
  if (issues.depth === 'deep') out.push('deep');
  return out;
}

/** Clean means a person in view, a good rate and nothing failing. */
function isClean(state, problems) {
  return Boolean(state && state.ready && state.personVisible && state.rateZone === 'good' && problems.length === 0);
}

/**
 * @param {object} [config]
 * @param {object} [opts]
 * @param {{ speak(text: string): void }} [opts.speaker] called with the cue text unless muted
 * @param {(id: string, text: string) => void} [opts.onCue] called for every cue, muted or not (the banner)
 */
export function createCoach(config = defaultConfig, { speaker, onCue } = {}) {
  let since = {}; // problem id → when it became continuously active
  let lastSaid = {}; // cue id → when it was last given
  let lastCueAt = -Infinity;
  let cleanSince = null;
  let muted = false;

  function emit(id, now) {
    lastCueAt = now;
    lastSaid[id] = now;
    const text = CUES[id];
    if (!muted && speaker && typeof speaker.speak === 'function') speaker.speak(text);
    if (typeof onCue === 'function') onCue(id, text);
    return id;
  }

  return {
    /** @returns {string|null} the cue id to give now, or null */
    next(state, now) {
      const problems = activeProblems(state);

      // Track how long each problem has lasted without a break.
      const nextSince = {};
      for (const id of problems) nextSince[id] = since[id] ?? now;
      since = nextSince;

      if (isClean(state, problems)) cleanSince = cleanSince ?? now;
      else cleanSince = null;

      if (now - lastCueAt < config.VOICE_COOLDOWN_MS) return null;

      if (problems.length > 0) {
        // One fix at a time: only the highest-priority problem may be spoken.
        const top = problems[0];
        if (now - since[top] < config.VOICE_PERSIST_MS) return null;
        if (lastSaid[top] !== undefined && now - lastSaid[top] < config.VOICE_REPEAT_MS) return null;
        return emit(top, now);
      }

      if (cleanSince !== null && now - cleanSince >= config.PRAISE_AFTER_MS) {
        const last = lastSaid.praise;
        const gap = Math.max(config.PRAISE_REPEAT_MS, config.VOICE_REPEAT_MS);
        if (last === undefined || now - last >= gap) return emit('praise', now);
      }
      return null;
    },
    setMuted(on) {
      muted = Boolean(on);
    },
    get muted() {
      return muted;
    },
    reset() {
      since = {};
      lastSaid = {};
      lastCueAt = -Infinity;
      cleanSince = null;
    },
  };
}
