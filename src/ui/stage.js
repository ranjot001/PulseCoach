// Builds the video + skeleton canvas inside the engine's stage container.
import './stage.css';
import { drawPose } from './overlay.js';

export function createStage(container) {
  const root = document.createElement('div');
  root.className = 'pc-stage';
  const mirror = document.createElement('div');
  mirror.className = 'pc-stage__mirror';
  const video = document.createElement('video');
  video.className = 'pc-stage__video';
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  const canvas = document.createElement('canvas');
  canvas.className = 'pc-stage__canvas';
  mirror.append(video, canvas);
  const debug = document.createElement('div');
  debug.className = 'pc-stage__debug';
  debug.hidden = true;
  root.append(mirror, debug);
  container.replaceChildren(root);

  let ctx = null; // fetched on first draw

  return {
    video,
    canvas,
    draw(frame, minVisibility) {
      ctx ||= canvas.getContext('2d');
      if (!ctx) return;
      if (canvas.width !== frame.width || canvas.height !== frame.height) {
        canvas.width = frame.width;
        canvas.height = frame.height;
      }
      drawPose(ctx, frame.landmarks, frame.width, frame.height, minVisibility);
    },
    setDebug(on) {
      debug.hidden = !on;
    },
    setDebugText(text) {
      debug.textContent = text;
    },
    destroy() {
      root.remove();
    },
  };
}
