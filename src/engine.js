// Contract 1: the engine. Track A changes the inside task by task and never the interface.
//
// Every source (camera, simulator) produces frames { t, width, height, landmarks }.
// Each frame goes: motion signal → compression detector → rate tracker.
import { config } from './config.js';
import { openCamera, stopStream } from './pose/camera.js';
import { createPoseTracker } from './pose/poseTracker.js';
import { createSimSource, SIM_DEFAULTS } from './pose/simSource.js';
import { createMotionSignal } from './lib/signal.js';
import { createCompressionDetector } from './lib/compressionDetector.js';
import { createRateTracker } from './lib/rate.js';
import { createStage } from './ui/stage.js';

const STATE_INTERVAL_MS = 100;
const FRAME_STALE_MS = 1000; // no frame for this long → not ready

const defaultTimers = {
  setInterval: (fn, ms) => globalThis.setInterval(fn, ms),
  clearInterval: (id) => globalThis.clearInterval(id),
  now: () => (globalThis.performance ? globalThis.performance.now() : Date.now()),
};

const SIM_KEYS = ['cpm', 'bend', 'lean', 'recoil', 'travel'];

/** Simulator settings read from the address, over the simulator defaults. */
export function readSimParams(search) {
  const params = new URLSearchParams(search || '');
  const out = { ...SIM_DEFAULTS };
  for (const key of SIM_KEYS) {
    const raw = params.get(key);
    if (raw === null || raw === '') continue;
    const n = Number(raw);
    if (Number.isFinite(n)) out[key] = n;
  }
  out.cpm = Math.max(1, out.cpm);
  return out;
}

const KEY_SHOULDERS = [11, 12];
const KEY_HIPS = [23, 24];

export function isPersonVisible(landmarks, minVisibility = config.MIN_VISIBILITY) {
  if (!landmarks) return false;
  const seen = (i) => (landmarks[i]?.visibility ?? 0) >= minVisibility;
  return KEY_SHOULDERS.some(seen) && KEY_HIPS.some(seen);
}

function safeCall(fn, arg) {
  if (typeof fn !== 'function') return;
  try {
    fn(arg);
  } catch (err) {
    console.error(err);
  }
}

function toEngineError(err) {
  return { code: err?.code || 'model-failed', message: String(err?.message || err) };
}

// Form fields of a compression event. Passing values until the form checks (A4).
function formFields() {
  return {
    elbowAngleDeg: 180,
    armLeanDeg: 0,
    recoilRatio: 1,
    elbowsLocked: true,
    aligned: true,
    fullRecoil: true,
    depthCm: null,
  };
}

/**
 * @param {object} opts
 * @param {HTMLElement} [opts.stage]
 * @param {(state: object) => void} [opts.onState]
 * @param {(event: object) => void} [opts.onCompression]
 * @param {(error: {code: string, message: string}) => void} [opts.onError]
 * @param {{setInterval: Function, clearInterval: Function, now: () => number}} [opts.timers] for tests
 * @param {string} [opts.search] address query string; defaults to location.search
 * @param {MediaDevices} [opts.mediaDevices] for tests
 */
export function createEngine({ stage, onState, onCompression, onError, timers, search, mediaDevices } = {}) {
  const t = { ...defaultTimers, ...(timers || {}) };
  const query = search ?? globalThis.location?.search ?? '';
  const isSim = new URLSearchParams(query).get('sim') === '1';
  const simParams = readSimParams(query);

  const signal = createMotionSignal(config);
  const detector = createCompressionDetector(config);
  const rate = createRateTracker(config);

  let view = null;
  let source = null; // sim source or pose tracker
  let stream = null;
  let stateTimer = null;
  let sourceReady = false; // sim running, or camera + model loaded
  let debug = false;
  let generation = 0; // guards against stop() during an in-flight start()

  // Frame clock: frame times are in the source's own clock. Map wall time onto it
  // so the rate goes stale even when frames stop arriving.
  let lastFrameT = null;
  let lastFrameWall = null;
  let lastSampleValid = false;
  let compressions = 0;

  let fpsCount = 0;
  let fpsWindowStart = 0;
  let fps = 0;

  function frameNow() {
    if (lastFrameT === null) return 0;
    return lastFrameT + (t.now() - lastFrameWall);
  }

  function handleFrame(frame) {
    const wall = t.now();
    lastFrameT = frame.t;
    lastFrameWall = wall;

    const sample = signal.push(frame);
    lastSampleValid = sample.valid;

    if (view) {
      view.draw(frame, config.MIN_VISIBILITY);
      view.plot(frame.t, sample.valid ? sample.detrended : null);
    }

    fpsCount += 1;
    if (wall - fpsWindowStart >= 1000) {
      fps = (fpsCount * 1000) / (wall - fpsWindowStart);
      fpsCount = 0;
      fpsWindowStart = wall;
    }

    const partial = detector.push(sample);
    if (!partial) return;
    const event = { ...partial, ...formFields() };
    rate.onCompression(event);
    compressions += 1;
    safeCall(onCompression, event);
  }

  function snapshot() {
    const ready = sourceReady && lastFrameWall !== null && t.now() - lastFrameWall < FRAME_STALE_MS;
    const r = ready ? rate.getRate(frameNow()) : null;
    const cpm = r === null ? null : Math.round(r);
    return {
      ready,
      personVisible: ready && lastSampleValid,
      compressions,
      rate: cpm,
      rateZone: rate.zone(cpm),
      issues: { elbows: false, position: false, recoil: false, depth: null },
      setup: { ok: true, checks: [] },
    };
  }

  function emitState() {
    const state = snapshot();
    if (debug && view) {
      view.setDebugText(
        `${fps.toFixed(0)} fps · ${state.compressions} compressions · rate ${state.rate ?? '–'}` +
          (state.personVisible ? '' : ' · no person'),
      );
    }
    safeCall(onState, state);
  }

  function teardown() {
    if (stateTimer !== null) t.clearInterval(stateTimer);
    stateTimer = null;
    if (source) {
      if (typeof source.close === 'function') source.close();
      else source.stop();
    }
    source = null;
    stopStream(stream);
    stream = null;
    sourceReady = false;
  }

  async function startCamera(gen) {
    stream = await openCamera(mediaDevices);
    if (gen !== generation) {
      stopStream(stream);
      return;
    }
    view.video.srcObject = stream;
    try {
      await view.video.play();
    } catch {
      // autoplay is muted; the tracker waits for frames either way
    }
    const tracker = createPoseTracker(view.video, handleFrame);
    await tracker.load();
    if (gen !== generation) {
      tracker.close();
      return;
    }
    source = tracker;
    sourceReady = true;
    tracker.start();
  }

  function startSim() {
    const sim = createSimSource(simParams, t);
    source = sim;
    sourceReady = true;
    sim.start(handleFrame);
  }

  return {
    async start() {
      teardown();
      const gen = ++generation;
      lastFrameT = null;
      lastFrameWall = null;
      fpsWindowStart = t.now();
      try {
        view = createStage(stage || document.createElement('div'), { simulated: isSim });
        view.setDebug(debug);
        stateTimer = t.setInterval(emitState, STATE_INTERVAL_MS);
        if (isSim) startSim();
        else await startCamera(gen);
      } catch (err) {
        if (gen !== generation) return;
        teardown();
        safeCall(onError, toEngineError(err));
      }
      if (gen === generation) emitState();
    },
    stop() {
      generation += 1;
      teardown();
    },
    reset() {
      detector.reset();
      rate.reset();
      compressions = 0;
    },
    markRest() {
      // Records the resting shoulder height from A5/A6 onward.
    },
    setDebug(on) {
      debug = Boolean(on);
      view?.setDebug(debug);
    },
  };
}
