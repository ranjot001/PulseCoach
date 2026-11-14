// Draws the joints and bones PulseCoach uses over the video.
import { toPixels } from '../lib/geometry.js';

export const JOINTS = [11, 12, 13, 14, 15, 16, 23, 24];
export const BONES = [
  [11, 12], [23, 24], // shoulders, hips
  [11, 13], [13, 15], // left arm
  [12, 14], [14, 16], // right arm
  [11, 23], [12, 24], // torso sides
];

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array|null} landmarks 33 normalised landmarks or null
 * @param {number} width canvas width in pixels
 * @param {number} height canvas height in pixels
 * @param {number} minVisibility
 */
export function drawPose(ctx, landmarks, width, height, minVisibility) {
  ctx.clearRect(0, 0, width, height);
  if (!landmarks) return;
  const scale = Math.max(1, width / 640);
  const seen = (i) => (landmarks[i]?.visibility ?? 0) >= minVisibility;
  const px = (i) => toPixels(landmarks[i], width, height);

  ctx.lineCap = 'round';
  ctx.lineWidth = 10 * scale;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  for (const [a, b] of BONES) {
    if (!seen(a) || !seen(b)) continue;
    const p = px(a);
    const q = px(b);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }

  const good = getComputedStyle(document.documentElement).getPropertyValue('--good').trim() || '#22c55e';
  ctx.fillStyle = good;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3 * scale;
  for (const i of JOINTS) {
    if (!seen(i)) continue;
    const p = px(i);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 12 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}
