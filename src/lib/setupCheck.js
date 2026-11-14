// Is the learner framed well enough to start? Pure logic.
import { toPixels, distance, midpoint } from './geometry.js';

export const SETUP_HINTS = {
  person: 'Step into view',
  visible: 'Make sure your arms and hips are in view',
  'side-on': 'Turn so the camera sees your side',
  closer: 'Move a little closer',
  back: 'Move back a little',
  'in-frame': 'Move to the middle of the picture',
};

const ARMS = [
  [11, 13, 15],
  [12, 14, 16],
];
const HIPS = [23, 24];
const UPPER_BODY = [0, 11, 12, 13, 14, 15, 16, 23, 24]; // nose, arms, hips

const vis = (l) => l?.visibility ?? 0;

/**
 * Checks for one frame, in display order.
 * @returns {Array<{id: string, pass: boolean, hint: string}>}
 */
export function checkFrame(frame, config) {
  const lm = frame?.landmarks;
  const fail = (id, hint) => ({ id, pass: false, hint });
  if (!lm) {
    return [
      fail('person', SETUP_HINTS.person),
      fail('visible', SETUP_HINTS.visible),
      fail('side-on', SETUP_HINTS['side-on']),
      fail('distance', SETUP_HINTS.back),
      fail('in-frame', SETUP_HINTS['in-frame']),
    ];
  }
  const { width: W, height: H } = frame;
  const px = (i) => toPixels(lm[i], W, H);
  const minVis = config.SETUP_MIN_VISIBILITY;

  // Visible: side-on, the far arm is usually hidden behind the body, so we need the
  // nearer arm (shoulder, elbow, wrist) and at least one hip.
  const armVis = ARMS.map((arm) => Math.min(...arm.map((i) => vis(lm[i]))));
  const visible = Math.max(...armVis) >= minVis && HIPS.some((i) => vis(lm[i]) >= minVis);

  // Torso length: shoulder midpoint to hip midpoint, in pixels.
  const torso = distance(midpoint(px(11), px(12)), midpoint(px(23), px(24)));

  // Side-on: the two shoulders nearly overlap horizontally.
  const gap = Math.abs(px(11).x - px(12).x);
  const sideOn = torso > 0 && gap / torso < config.SETUP_SIDE_ON_MAX;

  // Distance: torso length as a share of frame height.
  const share = torso / H;
  const tooFar = share < config.SETUP_TORSO_MIN;
  const tooClose = share > config.SETUP_TORSO_MAX;

  // In frame: every upper-body landmark inside the picture with a small margin.
  const m = config.SETUP_MARGIN;
  const inFrame = UPPER_BODY.every((i) => lm[i] && lm[i].x >= m && lm[i].x <= 1 - m && lm[i].y >= m && lm[i].y <= 1 - m);

  return [
    { id: 'person', pass: true, hint: SETUP_HINTS.person },
    { id: 'visible', pass: visible, hint: SETUP_HINTS.visible },
    { id: 'side-on', pass: sideOn, hint: SETUP_HINTS['side-on'] },
    { id: 'distance', pass: !tooFar && !tooClose, hint: tooFar ? SETUP_HINTS.closer : SETUP_HINTS.back },
    { id: 'in-frame', pass: inFrame, hint: SETUP_HINTS['in-frame'] },
  ];
}

/**
 * @param {Array<{t, width, height, landmarks}>} frames recent frames, oldest first
 * @param {object} config needs SETUP_* values
 * @returns {{ ok: boolean, checks: Array<{id, pass, hint}> }} checks are for the newest frame;
 *   ok once every check has passed on every frame for SETUP_HOLD_MS.
 */
export function checkSetup(frames, config) {
  if (!frames?.length) return { ok: false, checks: checkFrame(null, config) };
  const results = frames.map((f) => checkFrame(f, config).every((c) => c.pass));
  const newest = frames[frames.length - 1];
  let i = frames.length - 1;
  while (i >= 0 && results[i]) i--;
  const streakStart = i + 1 < frames.length ? frames[i + 1].t : null;
  const ok = streakStart !== null && newest.t - streakStart >= config.SETUP_HOLD_MS;
  return { ok, checks: checkFrame(newest, config) };
}
