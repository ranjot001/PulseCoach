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
import { createFormTracker } from './lib/form.js';
import { createFatigueTracker } from './lib/fatigue.js';
import { createStage } from './ui/stage.js';
import { loadVideo } from './pose/videoSource.js';
import { checkSetup, checkFrame } from './lib/setupCheck.js';

const STATE_INTERVAL_MS = 100;
const FRAME_STALE_MS = 1000; // no frame for this long → not ready
const SETUP_FRAMES_MS = 1500; // recent frames kept for the setup check

const defaultTimers = {
  setInterval: (fn, ms) => globalThis.setInterval(fn, ms),
  clearInterval: (id) => globalThis.clearInterval(id),
  now: () => (globalThis.performance ? globalThis.performance.now() : Date.now()),
};

const SIM_KEYS = ['cpm', 'bend', 'lean', 'recoil', 'travel', 'fatigue', 'swap'];

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
  out.fatigue = Math.min(1, Math.max(0, out.fatigue));
  out.swap = Math.max(0, out.swap);
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

const SIM_REST_MS = 1000; // after markRest() the simulated learner starts from rest, like a real one on "go"

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
  const videoPath = isSim ? null : new URLSearchParams(query).get('video') || null;
  const simParams = readSimParams(query);

  const signal = createMotionSignal(config);
  const detector = createCompressionDetector(config);
  const rate = createRateTracker(config);
  const form = createFormTracker(config);
  const fatigue = createFatigueTracker(config);

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
  let recentFrames = []; // for the setup check

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

    recentFrames.push(frame);
    while (recentFrames.length && recentFrames[0].t < frame.t - SETUP_FRAMES_MS) recentFrames.shift();

    const sample = signal.push(frame);
    lastSampleValid = sample.valid;
    form.onFrame(frame, sample);

    if (view) {
      view.draw(frame, config.MIN_VISIBILITY, { elbowsBad: form.getLiveIssues().elbows });
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
    const event = { ...partial, ...form.complete(partial), depthCm: null };
    event.travelRatio = fatigue.push(event);
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
      issues: { ...form.getLiveIssues(), depth: null },
      fatigue: fatigue.getState(),
      setup: ready ? checkSetup(recentFrames, config) : { ok: false, checks: checkFrame(null, config) },
    };
  }

  function emitState() {
    const state = snapshot();
    if (debug && view) {
      view.setDebugText(
        `${fps.toFixed(0)} fps · ${state.compressions} compressions · rate ${state.rate ?? '–'}` +
          (state.personVisible ? '' : ' · no person') +
          (state.fatigue.slipping ? ` · slipping: ${state.fatigue.signs.join(', ')}` : ''),
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
    await startTracker(gen);
  }

  // ?video=<path>: a looping local clip through the same pipeline as the camera.
  async function startVideo(gen) {
    await loadVideo(view.video, videoPath);
    if (gen !== generation) return;
    await startTracker(gen);
  }

  async function startTracker(gen) {
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
      recentFrames = [];
      fpsWindowStart = t.now();
      try {
        view = createStage(stage || document.createElement('div'), { simulated: isSim, mirror: !isSim && !videoPath });
        view.setDebug(debug);
        stateTimer = t.setInterval(emitState, STATE_INTERVAL_MS);
        if (isSim) startSim();
        else if (videoPath) await startVideo(gen);
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
      form.reset();
      fatigue.startTurn();
      compressions = 0;
    },
    markRest() {
      // The simulated learner kneels still for a moment first, as a real one does on "go".
      // It jumps to rest from wherever it was mid-stroke, so the signal starts over and
      // fills its baseline with the rest pose, as it would for someone who was already still.
      if (isSim && source && typeof source.rest === 'function') {
        source.rest(SIM_REST_MS);
        signal.reset();
        detector.restart();
      }
      form.markRest();
    },
    /**
     * A switch begins: the next compressions set the new compressor's own baseline.
     * Drops what belonged to the previous person's body (rest reference, live form
     * issues). Does not zero the compression count.
     */
    markTurn() {
      fatigue.startTurn();
      form.reset();
      form.dropRest();
      // Simulator: the figure stops for `swap` seconds, then a fresh compressor starts
      // from rest with the fatigue clock restarted.
      if (isSim && source && typeof source.rest === 'function') {
        source.rest(simParams.swap * 1000);
        signal.reset();
        detector.restart();
      }
    },
    setDebug(on) {
      debug = Boolean(on);
      view?.setDebug(debug);
    },
  };
}
