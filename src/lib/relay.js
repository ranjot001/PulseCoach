// Relay drill state machine. Pure logic: time comes in as `now` (ms, the page's clock).
// Phases: 'idle' → 'compressing' → 'rhythmCheck' → 'resume' → 'compressing' (next turn) … → 'done'.
import { config as defaultConfig } from '../config.js';

function positiveInt(raw, fallback) {
  if (raw === null || raw === undefined || raw === '') return fallback;
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n >= 1 ? n : fallback;
}

/** `?turns=` and `?turnSeconds=` from an address query string, falling back to config. */
export function drillOptions(search, cfg = defaultConfig) {
  const params = new URLSearchParams(search || '');
  return {
    turns: positiveInt(params.get('turns'), cfg.DRILL_TURNS),
    turnSeconds: positiveInt(params.get('turnSeconds'), cfg.DRILL_TURN_SECONDS),
  };
}

/** Compressors alternate 1, 2, 1, 2 … */
export function compressorFor(turnIndex) {
  return (turnIndex % 2) + 1;
}

/**
 * @param {object} [cfg]
 * @param {{ turns?: number, turnSeconds?: number }} [opts]
 */
export function createRelay(cfg = defaultConfig, { turns = cfg.DRILL_TURNS, turnSeconds = cfg.DRILL_TURN_SECONDS } = {}) {
  const turnMs = turnSeconds * 1000;
  let phase = 'idle';
  let startedAt = null;
  let endedAt = null;
  const turnList = [];
  let index = -1;

  // Switch pause
  let pauseStart = null;
  let backOnSent = false;

  // Slip tracking for the current turn
  let slipStart = null;
  let slipSigns = new Set();
  let recordingSlip = false;

  function current() {
    return turnList[index];
  }

  function beginTurn() {
    index += 1;
    turnList.push({ compressor: compressorFor(index), startAt: null, endAt: null, early: false, slippedAt: null, signs: [], events: [] });
    slipStart = null;
    slipSigns = new Set();
    recordingSlip = false;
  }

  function endTurn(now, early) {
    const turn = current();
    turn.endAt = now;
    turn.early = early;
    if (index >= turns - 1) {
      phase = 'done';
      endedAt = now;
      return ['finished'];
    }
    phase = 'rhythmCheck';
    pauseStart = now;
    backOnSent = false;
    beginTurn();
    return [early ? 'switchEarly' : 'rhythmCheck'];
  }

  function trackSlip(state, now) {
    const turn = current();
    const fatigue = state && state.fatigue ? state.fatigue : { slipping: false, signs: [] };
    if (!fatigue.slipping) {
      slipStart = null;
      slipSigns = new Set();
      recordingSlip = false;
      return false;
    }
    if (slipStart === null) slipStart = now;
    for (const s of fatigue.signs || []) slipSigns.add(s);
    const held = now - slipStart >= cfg.EARLY_SWITCH_MS;
    if (held && turn.slippedAt === null) {
      turn.slippedAt = Math.max(0, (slipStart - turn.startAt) / 1000);
      recordingSlip = true;
    }
    if (recordingSlip) turn.signs = [...new Set([...turn.signs, ...slipSigns])];
    return held;
  }

  function pauseSec(now) {
    return pauseStart === null ? 0 : Math.max(0, (now - pauseStart) / 1000);
  }

  return {
    start(now) {
      startedAt = now;
      phase = 'compressing';
      beginTurn();
    },

    onCompression(event, now) {
      if (phase === 'resume') {
        phase = 'compressing';
        pauseStart = null;
      }
      if (phase !== 'compressing') return;
      const turn = current();
      if (turn.startAt === null) turn.startAt = now;
      turn.events.push({ ...event, at: now });
    },

    /** @returns {string[]} prompts to give now */
    tick(state, now) {
      const prompts = [];
      if (phase === 'compressing') {
        const turn = current();
        if (turn.startAt === null) return prompts;
        const slipHeld = trackSlip(state, now);
        const elapsed = now - turn.startAt;
        const lastTurn = index >= turns - 1;
        if (elapsed >= turnMs) return endTurn(now, false);
        if (!lastTurn && slipHeld && elapsed >= cfg.MIN_TURN_SECONDS * 1000) return endTurn(now, true);
        return prompts;
      }
      if (phase === 'rhythmCheck' && now - pauseStart >= cfg.RHYTHM_CHECK_MS) {
        phase = 'resume';
        prompts.push('resume');
      }
      if ((phase === 'rhythmCheck' || phase === 'resume') && !backOnSent && pauseSec(now) >= cfg.PAUSE_WARN_SEC) {
        backOnSent = true;
        prompts.push('backOn');
      }
      return prompts;
    },

    getView(now) {
      const turn = current();
      let turnSecondsLeft = turnSeconds;
      if (phase === 'done') turnSecondsLeft = 0;
      else if (phase === 'compressing' && turn && turn.startAt !== null) turnSecondsLeft = Math.max(0, turnSeconds - (now - turn.startAt) / 1000);
      const switching = phase === 'rhythmCheck' || phase === 'resume';
      return {
        phase,
        compressor: turn ? turn.compressor : 1,
        turn: index + 1,
        turns,
        turnSecondsLeft,
        pauseSec: switching ? pauseSec(now) : 0,
      };
    },

    getDrill() {
      return {
        startedAt,
        endedAt,
        turns: turnList.map((t) => ({ ...t, signs: [...t.signs], events: [...t.events] })),
      };
    },
  };
}
