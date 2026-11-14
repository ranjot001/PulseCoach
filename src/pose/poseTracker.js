// MediaPipe PoseLandmarker on a <video>, producing frames in the CLAUDE.md shape.
import { EngineError } from './camera.js';

const BASE = import.meta.env?.BASE_URL ?? '/';
export const WASM_PATH = `${BASE}wasm`;
export const MODEL_PATH = `${BASE}models/pose_landmarker_lite.task`;

async function createLandmarker() {
  const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
  const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
  const options = (delegate) => ({
    baseOptions: { modelAssetPath: MODEL_PATH, delegate },
    runningMode: 'VIDEO',
    numPoses: 1,
  });
  try {
    return await PoseLandmarker.createFromOptions(fileset, options('GPU'));
  } catch (gpuErr) {
    console.warn('PoseLandmarker GPU delegate failed, falling back to CPU', gpuErr);
    return await PoseLandmarker.createFromOptions(fileset, options('CPU'));
  }
}

/**
 * @param {HTMLVideoElement} video
 * @param {(frame: {t, width, height, landmarks}) => void} onFrame
 */
export function createPoseTracker(video, onFrame) {
  let landmarker = null;
  let rafId = null;
  let running = false;
  let lastVideoTime = -1;
  let lastTs = 0;

  function loop() {
    if (!running) return;
    rafId = requestAnimationFrame(loop);
    if (video.readyState < 2 || !video.videoWidth) return;
    const vt = video.currentTime;
    if (vt === lastVideoTime) return; // video has not advanced: skip
    lastVideoTime = vt;
    const ts = Math.max(performance.now(), lastTs + 1); // strictly increasing
    lastTs = ts;
    let result;
    try {
      result = landmarker.detectForVideo(video, ts);
    } catch (err) {
      console.error('detectForVideo failed', err);
      return;
    }
    const pose = result?.landmarks?.[0];
    onFrame({
      t: ts,
      width: video.videoWidth,
      height: video.videoHeight,
      landmarks: pose && pose.length >= 33
        ? pose.map((l) => ({ x: l.x, y: l.y, z: l.z, visibility: l.visibility ?? 0 }))
        : null,
    });
  }

  return {
    async load() {
      try {
        landmarker = await createLandmarker();
      } catch (err) {
        throw new EngineError('model-failed', `Pose model failed to load: ${err?.message || err}`);
      }
    },
    start() {
      if (running || !landmarker) return;
      running = true;
      rafId = requestAnimationFrame(loop);
    },
    stop() {
      running = false;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
    },
    close() {
      this.stop();
      landmarker?.close?.();
      landmarker = null;
    },
  };
}
