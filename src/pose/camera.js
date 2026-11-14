// Webcam access. Errors are turned into the engine's error codes.

export class EngineError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const DENIED = new Set(['NotAllowedError', 'SecurityError', 'PermissionDeniedError']);
const MISSING = new Set(['NotFoundError', 'DevicesNotFoundError', 'OverconstrainedError', 'NotReadableError', 'TrackStartError']);

export function cameraError(err) {
  const name = err?.name || '';
  if (DENIED.has(name)) return new EngineError('camera-denied', 'Camera permission was denied. Allow the camera and reload.');
  if (MISSING.has(name)) return new EngineError('no-camera', 'No usable camera was found.');
  return new EngineError('no-camera', `Could not open the camera: ${err?.message || name || 'unknown error'}`);
}

/**
 * Open the webcam, video only, around 1280×720.
 * @param {MediaDevices} [mediaDevices] injectable for tests
 * @returns {Promise<MediaStream>} rejects with an EngineError
 */
export async function openCamera(mediaDevices = globalThis.navigator?.mediaDevices) {
  if (!mediaDevices || typeof mediaDevices.getUserMedia !== 'function') {
    throw new EngineError('no-camera', 'This browser cannot access a camera.');
  }
  try {
    return await mediaDevices.getUserMedia({
      audio: false,
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
    });
  } catch (err) {
    throw cameraError(err);
  }
}

export function stopStream(stream) {
  stream?.getTracks?.().forEach((t) => t.stop());
}
