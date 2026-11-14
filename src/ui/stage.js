// Builds the video + skeleton canvas (+ debug chart) inside the engine's stage container.
import './stage.css';
import { drawPose } from './overlay.js';
import { createChart, canvasSupported } from './chart.js';
import { createPushBars } from './pushBars.js';
import { config } from '../config.js';

/**
 * @param {HTMLElement} container
 * @param {{simulated?: boolean, mirror?: boolean}} [opts] simulated: dark background and a
 *   SIMULATED badge, no video. mirror: flip like a selfie view (live camera only).
 */
export function createStage(container, { simulated = false, mirror = !simulated } = {}) {
  const root = document.createElement('div');
  root.className = simulated ? 'pc-stage pc-stage--sim' : 'pc-stage';
  const layer = document.createElement('div');
  layer.className = mirror ? 'pc-stage__layer pc-stage__mirror' : 'pc-stage__layer';
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
  root.append(layer, chartCanvas);
  const pushBars = createPushBars(root, config); // always visible, debug or not
  const badge = document.createElement('div');
  badge.className = simulated ? 'pc-stage__badge pc-stage__badge--sim' : 'pc-stage__badge';
  badge.textContent = simulated ? 'SIMULATED' : 'LIVE';
  root.append(badge, debug);
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
          ctx = canvasSupported() ? canvas.getContext('2d') : null;
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
    /** The push-size strip: push(event), clear(), setLabel(text, tone). */
    pushBars,
    destroy() {
      root.remove();
    },
  };
}
