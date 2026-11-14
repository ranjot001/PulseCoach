// Draws the joints and bones PulseCoach uses over the video.
import { toPixels } from '../lib/geometry.js';

export const JOINTS = [11, 12, 13, 14, 15, 16, 23, 24];
export const BONES = [
  [11, 12], [23, 24], // shoulders, hips
  [11, 13], [13, 15], // left arm
  [12, 14], [14, 16], // right arm
  [11, 23], [12, 24], // torso sides
];

const ARM_BONES = new Set(['11-13', '13-15', '12-14', '14-16']);

function cssColor(name, fallback) {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  } catch {
    return fallback;
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array|null} landmarks 33 normalised landmarks or null
 * @param {number} width canvas width in pixels
 * @param {number} height canvas height in pixels
 * @param {number} minVisibility
 * @param {{elbowsBad?: boolean}} [status] draw the arms in --bad while the elbows check is failing
 */
export function drawPose(ctx, landmarks, width, height, minVisibility, status = {}) {
  ctx.clearRect(0, 0, width, height);
  if (!landmarks) return;
  const scale = Math.max(1, width / 640);
  const seen = (i) => (landmarks[i]?.visibility ?? 0) >= minVisibility;
  const px = (i) => toPixels(landmarks[i], width, height);

  const accent = cssColor('--accent', '#5cc8ff');
  const bad = cssColor('--bad', '#ff4d5e');
  ctx.lineCap = 'round';
  ctx.lineWidth = 10 * scale;
  for (const [a, b] of BONES) {
    if (!seen(a) || !seen(b)) continue;
    const p = px(a);
    const q = px(b);
    const isArm = ARM_BONES.has(`${a}-${b}`);
    ctx.strokeStyle = status.elbowsBad && isArm ? bad : accent;
    ctx.lineWidth = (status.elbowsBad && isArm ? 14 : 10) * scale;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }

  ctx.fillStyle = cssColor('--fg', '#f2f6fa'); // light joints, as in the design
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
