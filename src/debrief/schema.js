// Validation for Contract 2 session stats. Pure logic: no DOM, no browser APIs.
// Used by the debrief card and, from C2, by the server function before any stats
// reach the AI prompt. Nothing but numbers and fixed labels gets through.

import { config as defaultConfig } from '../config.js';

const RATE_TRENDS = ['steady', 'slowing', 'speeding'];

// Sanity limits for what a real session can produce. These are input checks,
// not coaching thresholds; the coaching thresholds live in src/config.js.
const NUMBER_FIELDS = {
  durationSec: { min: 1, max: 3600 },
  compressions: { min: 0, max: 10000, integer: true },
  avgRate: { min: 0, max: 300 },
  pctRateInRange: { min: 0, max: 100 },
  pctElbowsLocked: { min: 0, max: 100 },
  pctAligned: { min: 0, max: 100 },
  pctRecoil: { min: 0, max: 100 },
  score: { min: 0, max: 100 },
};
const DEPTH_CM = { min: 0, max: 20 };

// The grade is a short label chosen by the app, never typed by the learner.
// Letters, spaces, apostrophes, hyphens and "!" only, so it cannot carry free text.
const GRADE_PATTERN = /^[A-Za-z][A-Za-z '’!-]{0,39}$/;

function checkNumber(name, value, { min, max, integer = false }) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
  if (value < min || value > max) {
    throw new RangeError(`${name} must be between ${min} and ${max}`);
  }
  if (integer && !Number.isInteger(value)) {
    throw new RangeError(`${name} must be a whole number`);
  }
  return value;
}

/**
 * Returns a clean copy of `body` holding only the Contract 2 fields, or throws.
 * Unknown fields are dropped.
 */
export function validateStats(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new TypeError('stats must be an object');
  }

  const clean = {};
  for (const [name, limits] of Object.entries(NUMBER_FIELDS)) {
    clean[name] = checkNumber(name, body[name], limits);
  }

  clean.avgDepthCm = body.avgDepthCm === null ? null : checkNumber('avgDepthCm', body.avgDepthCm, DEPTH_CM);

  if (!RATE_TRENDS.includes(body.rateTrend)) {
    throw new RangeError(`rateTrend must be one of ${RATE_TRENDS.join(', ')}`);
  }
  clean.rateTrend = body.rateTrend;

  if (typeof body.grade !== 'string' || !GRADE_PATTERN.test(body.grade)) {
    throw new TypeError('grade must be a short label');
  }
  clean.grade = body.grade;

  return clean;
}

// ─── The AI prompt ──────────────────────────────────────────────────────────
// Built only from validated stats, so the prompt never contains free text from
// the browser. Targets come from src/config.js so they match the rest of the app.


const TREND_WORDS = {
  steady: 'steady through the session',
  slowing: 'slowing down as the session went on',
  speeding: 'speeding up as the session went on',
};

/**
 * @param {object} stats  Contract 2 stats, already validated
 * @param {object} [cfg]  settings; defaults to src/config.js
 * @returns {{ system: string, user: string }}
 */
export function buildPrompt(stats, cfg = defaultConfig) {
  const system = [
    'You are a CPR instructor debriefing a learner who has just practised adult hands-only chest compressions on a pillow, coached by a webcam app.',
    `Use only the numbers you are given and these adult targets: a rate of ${cfg.RATE_MIN} to ${cfg.RATE_MAX} compressions per minute, a depth of ${cfg.DEPTH_MIN_CM} to ${cfg.DEPTH_MAX_CM} cm, full chest recoil after every compression, straight arms with locked elbows, and shoulders directly over the hands.`,
    'Write two or three sentences, under 70 words in total, in plain, encouraging language addressed to the learner as "you".',
    'Name one specific thing they did well, then the one or two most important fixes, each with a concrete physical tip they can try on their next attempt.',
    'Depth comes from a webcam, so always call it an estimated depth; if no depth is given, do not mention depth.',
    'Give no medical advice beyond compression technique, and never call the app or the measurements certified, accurate, clinical or medical-grade.',
    'Reply with the sentences only: no greeting, heading, list or sign-off.',
  ].join(' ');

  const depth =
    stats.avgDepthCm === null
      ? 'Estimated depth: not measured in this session.'
      : `Estimated average depth: ${stats.avgDepthCm.toFixed(1)} cm.`;

  const user = [
    `Session length: ${stats.durationSec} seconds.`,
    `Compressions: ${stats.compressions}.`,
    `Average rate: ${Math.round(stats.avgRate)} per minute, ${TREND_WORDS[stats.rateTrend]}.`,
    `Compressions inside the ${cfg.RATE_MIN} to ${cfg.RATE_MAX} per minute target: ${Math.round(stats.pctRateInRange)}%.`,
    `Compressions with elbows locked: ${Math.round(stats.pctElbowsLocked)}%.`,
    `Compressions with shoulders over hands: ${Math.round(stats.pctAligned)}%.`,
    `Compressions with full recoil: ${Math.round(stats.pctRecoil)}%.`,
    depth,
    `Overall score: ${Math.round(stats.score)} out of 100 (${stats.grade}).`,
    '',
    'Write the debrief.',
  ].join('\n');

  return { system, user };
}
