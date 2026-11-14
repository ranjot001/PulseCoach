// Builds the video + skeleton canvas (+ debug chart) inside the engine's stage container.
import './stage.css';
import { drawPose } from './overlay.js';
import { createChart } from './chart.js';

/**
 * @param {HTMLElement} container
 * @param {{simulated?: boolean}} [opts] simulated: dark background and a SIMULATED badge, no video
 */
export function createStage(container, { simulated = false } = {}) {
  const root = document.createElement('div');
  root.className = simulated ? 'pc-stage pc-stage--sim' : 'pc-stage';
  const layer = document.createElement('div');
  layer.className = simulated ? 'pc-stage__layer' : 'pc-stage__layer pc-stage__mirror';
  const video = document.createElement('video');
  video.className = 'pc-stage__video';
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.hidden = simulated;
  const canvas = document.createElement('canvas');
  canvas.className = 'pc-stage__canvas';
  layer.append(video, canvas);

  const debug = document.createElement('div');
  debug.className = 'pc-stage__debug';
  debug.hidden = true;
  const chartCanvas = document.createElement('canvas');
  chartCanvas.className = 'pc-stage__chart';
  chartCanvas.hidden = true;
  root.append(layer, chartCanvas, debug);
  if (simulated) {
    const badge = document.createElement('div');
    badge.className = 'pc-stage__badge';
    badge.textContent = 'SIMULATED';
    root.append(badge);
  }
  container.replaceChildren(root);

  const chart = createChart(chartCanvas);
  let debugOn = false;
  let ctx = null;
  let ctxTried = false;

  return {
    video,
    canvas,
    draw(frame, minVisibility, status) {
      if (!ctxTried) {
        ctxTried = true;
        try {
          ctx = canvas.getContext('2d');
        } catch {
          ctx = null;
        }
      }
      if (!ctx) return;
      if (canvas.width !== frame.width || canvas.height !== frame.height) {
        canvas.width = frame.width;
        canvas.height = frame.height;
      }
      drawPose(ctx, frame.landmarks, frame.width, frame.height, minVisibility, status);
    },
    /** Add one motion-signal sample (null when invalid) and redraw the chart if visible. */
    plot(t, value) {
      chart.push(t, value);
      if (debugOn) chart.draw();
    },
    setDebug(on) {
      debugOn = Boolean(on);
      debug.hidden = !debugOn;
      chartCanvas.hidden = !debugOn;
    },
    setDebugText(text) {
      debug.textContent = text;
    },
    destroy() {
      root.remove();
    },
  };
}
