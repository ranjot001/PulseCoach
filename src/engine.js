// Contract 1: the engine. This is the scaffold's fake engine.
// Track A replaces the inside task by task and never changes the interface.
import { config } from './config.js';

const STATE_INTERVAL_MS = 100;

const defaultTimers = {
  setInterval: (fn, ms) => globalThis.setInterval(fn, ms),
  clearInterval: (id) => globalThis.clearInterval(id),
  now: () => (globalThis.performance ? globalThis.performance.now() : Date.now()),
};

function num(params, key, fallback) {
  const raw = params.get(key);
  if (raw === null || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** Simulator settings read from the address. */
export function readSimParams(search) {
  const params = new URLSearchParams(search || '');
  return {
    cpm: Math.max(1, num(params, 'cpm', 110)),
    bend: num(params, 'bend', 5), // degrees of elbow bend
    lean: num(params, 'lean', 3), // degrees of arm lean
    recoil: num(params, 'recoil', 0.95), // 0..1
    travel: num(params, 'travel', 0.1), // torso units
  };
}

function rateZoneFor(rate) {
  if (rate === null) return 'none';
  if (rate < config.RATE_MIN) return 'slow';
  if (rate > config.RATE_MAX) return 'fast';
  return 'good';
}

/**
 * @param {object} opts
 * @param {HTMLElement} [opts.stage]
 * @param {(state: object) => void} [opts.onState]
 * @param {(event: object) => void} [opts.onCompression]
 * @param {(error: {code: string, message: string}) => void} [opts.onError]
 * @param {{setInterval: Function, clearInterval: Function, now: () => number}} [opts.timers] for tests
 * @param {string} [opts.search] address query string; defaults to location.search
 */
export function createEngine({ stage, onState, onCompression, onError, timers, search } = {}) {
  const t = { ...defaultTimers, ...(timers || {}) };
  const sim = readSimParams(search ?? globalThis.location?.search ?? '');
  const periodMs = 60000 / sim.cpm;

  const elbowsBad = sim.bend >= 20;
  const positionBad = sim.lean >= 20;
  const recoilBad = sim.recoil < 0.85;

  let stateTimer = null;
  let compressionTimer = null;
  let ready = false;
  let compressions = 0;
  let lastCompressionAt = null;
  let restMarked = false;
  let debug = false;
  let panel = null;
  let debugLine = null;

  function mountStage() {
    if (!stage || typeof document === 'undefined') return;
    panel = document.createElement('div');
    panel.className = 'fake-engine-panel';
    panel.style.cssText =
      'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
      'min-height:240px;border:2px dashed var(--muted);color:var(--muted);font-size:2rem;';
    const label = document.createElement('div');
    label.textContent = 'Fake engine';
    debugLine = document.createElement('div');
    debugLine.style.cssText = 'font-size:1rem;margin-top:0.5rem;';
    debugLine.hidden = !debug;
    panel.append(label, debugLine);
    stage.replaceChildren(panel);
  }

  function currentRate() {
    if (compressions < 2 || lastCompressionAt === null) return null;
    if (t.now() - lastCompressionAt > config.RATE_STALE_MS) return null;
    return Math.round(sim.cpm);
  }

  function snapshot() {
    const rate = currentRate();
    return {
      ready,
      personVisible: ready,
      compressions,
      rate,
      rateZone: rateZoneFor(rate),
      issues: {
        elbows: elbowsBad,
        position: positionBad,
        recoil: recoilBad,
        depth: null,
      },
      setup: { ok: true, checks: [] },
    };
  }

  function emitState() {
    const state = snapshot();
    if (debugLine && debug) debugLine.textContent = `compressions ${state.compressions} · rate ${state.rate ?? '–'}`;
    safeCall(onState, state);
  }

  function emitCompression() {
    const now = t.now();
    const intervalMs = lastCompressionAt === null ? periodMs : now - lastCompressionAt;
    lastCompressionAt = now;
    compressions += 1;
    const event = {
      index: compressions - 1,
      tBottom: now - periodMs / 2,
      tTop: now,
      travel: sim.travel,
      intervalMs,
      elbowAngleDeg: 180 - sim.bend,
      armLeanDeg: sim.lean,
      recoilRatio: sim.recoil,
      elbowsLocked: !elbowsBad,
      aligned: !positionBad,
      fullRecoil: !recoilBad,
      depthCm: null,
    };
    safeCall(onCompression, event);
  }

  function safeCall(fn, arg) {
    if (typeof fn !== 'function') return;
    try {
      fn(arg);
    } catch (err) {
      console.error(err);
    }
  }

  function clearTimers() {
    if (stateTimer !== null) t.clearInterval(stateTimer);
    if (compressionTimer !== null) t.clearInterval(compressionTimer);
    stateTimer = null;
    compressionTimer = null;
  }

  return {
    async start() {
      clearTimers();
      try {
        mountStage();
      } catch (err) {
        safeCall(onError, { code: 'model-failed', message: String(err?.message || err) });
        return;
      }
      ready = true;
      stateTimer = t.setInterval(emitState, STATE_INTERVAL_MS);
      compressionTimer = t.setInterval(emitCompression, periodMs);
      emitState();
    },
    stop() {
      clearTimers();
      ready = false;
    },
    reset() {
      compressions = 0;
      lastCompressionAt = null;
      restMarked = false;
    },
    markRest() {
      restMarked = true;
      return restMarked;
    },
    setDebug(on) {
      debug = Boolean(on);
      if (debugLine) debugLine.hidden = !debug;
    },
  };
}
