// Metronome: a click at METRONOME_BPM, scheduled against the audio clock with a short
// lookahead so the beat does not drift. A timer only wakes the scheduler; it never sets the beat.
import { config } from '../config.js';

const LOOKAHEAD_MS = 25; // how often the scheduler wakes
const SCHEDULE_AHEAD_MS = 120; // how far ahead clicks are queued on the audio clock
const CLICK_MS = 40;

/** Milliseconds between beats. */
export function beatIntervalMs(bpm) {
  return 60000 / bpm;
}

/**
 * Time of beat number `index`, counted from `startMs`. Computed from the start each time
 * rather than by adding intervals, so rounding never accumulates into drift.
 */
export function beatTimeMs(startMs, index, bpm) {
  return startMs + index * beatIntervalMs(bpm);
}

/** Index of the first beat at or after `nowMs`. */
export function nextBeatIndex(startMs, nowMs, bpm) {
  if (nowMs <= startMs) return 0;
  return Math.ceil((nowMs - startMs) / beatIntervalMs(bpm) - 1e-9);
}

function getAudioContextClass() {
  return globalThis.AudioContext || globalThis.webkitAudioContext || null;
}

/**
 * @param {object} [opts]
 * @param {number} [opts.bpm]
 * @param {number} [opts.volume] 0..1
 * @param {(beatIndex: number) => void} [opts.onBeat] called close to when each click sounds
 */
export function createMetronome({ bpm = config.METRONOME_BPM, volume = config.METRONOME_VOLUME, onBeat } = {}) {
  let ctx = null;
  let running = false;
  let timer = null;
  let startMs = 0;
  let nextIndex = 0;
  let gain = Math.min(1, Math.max(0, volume));
  const visualTimers = new Set();

  function ensureContext() {
    if (ctx) return ctx;
    const AC = getAudioContextClass();
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function resume() {
    if (!ctx || ctx.state !== 'suspended' || typeof ctx.resume !== 'function') return;
    try {
      const p = ctx.resume();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch {
      // Blocked until the user interacts; unlock() will try again.
    }
  }

  function nowMs() {
    return ctx.currentTime * 1000;
  }

  function scheduleClick(whenMs, index) {
    try {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      const when = whenMs / 1000;
      osc.type = 'square';
      osc.frequency.value = index % 4 === 0 ? 1500 : 1000;
      env.gain.setValueAtTime(0.0001, when);
      env.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), when + 0.002);
      env.gain.exponentialRampToValueAtTime(0.0001, when + CLICK_MS / 1000);
      osc.connect(env).connect(ctx.destination);
      osc.start(when);
      osc.stop(when + CLICK_MS / 1000 + 0.01);
    } catch {
      // A failed click must never stop the session.
    }
    if (typeof onBeat === 'function') {
      const delay = Math.max(0, whenMs - nowMs());
      const id = setTimeout(() => {
        visualTimers.delete(id);
        if (running) onBeat(index);
      }, delay);
      visualTimers.add(id);
    }
  }

  function tick() {
    if (!running || !ctx || ctx.state !== 'running') return;
    const horizon = nowMs() + SCHEDULE_AHEAD_MS;
    // If the clock jumped (tab asleep), skip missed beats instead of firing a burst.
    const due = nextBeatIndex(startMs, nowMs(), bpm);
    if (due > nextIndex) nextIndex = due;
    while (beatTimeMs(startMs, nextIndex, bpm) < horizon) {
      scheduleClick(beatTimeMs(startMs, nextIndex, bpm), nextIndex);
      nextIndex += 1;
    }
  }

  function restartClock() {
    if (!ctx) return;
    startMs = nowMs() + 50;
    nextIndex = 0;
  }

  return {
    /** Start clicking. Safe to call before any user interaction: it never throws. */
    start() {
      if (running) return;
      running = true;
      try {
        if (ensureContext()) {
          resume();
          restartClock();
        }
      } catch {
        // Audio unavailable; stay silent.
      }
      timer = setInterval(() => {
        try {
          tick();
        } catch {
          // keep going
        }
      }, LOOKAHEAD_MS);
    },
    stop() {
      running = false;
      if (timer !== null) clearInterval(timer);
      timer = null;
      for (const id of visualTimers) clearTimeout(id);
      visualTimers.clear();
    },
    /** Call from a click or key handler: browsers only allow audio after the user interacts. */
    unlock() {
      try {
        ensureContext();
        resume();
      } catch {
        // ignore
      }
    },
    setVolume(v) {
      gain = Math.min(1, Math.max(0, Number(v) || 0));
    },
    get volume() {
      return gain;
    },
    get running() {
      return running;
    },
  };
}
