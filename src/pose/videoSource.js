// A recorded clip as the frame source (the backup for the live demo): ?video=<path>.
import { EngineError } from './camera.js';

const LOAD_TIMEOUT_MS = 10000;

/**
 * Load `src` into `video`, looping and muted, and start it playing.
 * @param {HTMLVideoElement} video the stage's video element (or a fake one in tests)
 * @param {string} src a local path such as /demo.mp4
 * @returns {Promise<void>} rejects with EngineError 'no-camera' if the clip cannot be loaded
 */
export function loadVideo(video, src, { timeoutMs = LOAD_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    if (!video || !src) {
      reject(new EngineError('no-camera', 'No video file was given.'));
      return;
    }
    let timer = null;
    const done = (fn) => {
      video.removeEventListener('loadeddata', onLoaded);
      video.removeEventListener('error', onError);
      if (timer !== null) clearTimeout(timer);
      fn();
    };
    const fail = (why) =>
      done(() => reject(new EngineError('no-camera', `Could not load the video ${src}${why ? `: ${why}` : ''}.`)));
    function onLoaded() {
      done(() => {
        Promise.resolve()
          .then(() => video.play?.())
          .catch(() => {
            // muted autoplay; the tracker waits for frames either way
          })
          .then(resolve);
      });
    }
    function onError() {
      fail(video.error?.message || '');
    }
    video.addEventListener('loadeddata', onLoaded);
    video.addEventListener('error', onError);
    timer = setTimeout(() => fail('timed out'), timeoutMs);
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.src = src;
    video.load?.();
  });
}
