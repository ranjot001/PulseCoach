// Validation for Contract 2 session stats. Pure logic: no DOM, no browser APIs.
// Used by the debrief card and, from C2, by the server function before any stats
// reach the AI prompt. Nothing but numbers and fixed labels gets through.

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
