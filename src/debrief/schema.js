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

// ─── Relay stats ────────────────────────────────────────────────────────────

const SIGNS = ['shallower', 'slower', 'elbows'];
const MAX_TURNS = 8;

const RELAY_NUMBER_FIELDS = {
  durationSec: { min: 1, max: 36000 },
  compressions: { min: 0, max: 100000, integer: true },
  compressionFraction: { min: 0, max: 100 },
  switches: { min: 0, max: MAX_TURNS - 1, integer: true },
  earlySwitches: { min: 0, max: MAX_TURNS - 1, integer: true },
  longestPauseSec: { min: 0, max: 36000 },
  score: { min: 0, max: 100 },
};

/**
 * Relay targets the debrief and educator view use. PAUSE_WARN_SEC, PAUSE_MAX_SEC,
 * CCF_MIN and CCF_TARGET belong to
 * Track B's section of src/config.js (tasks B5 and B6). Until they are there, the
 * starting values from CLAUDE.md are used; this is the only place they appear.
 */
export function relayTargets(cfg = defaultConfig) {
  return {
    pauseWarnSec: Number.isFinite(cfg.PAUSE_WARN_SEC) ? cfg.PAUSE_WARN_SEC : 5,
    pauseMaxSec: Number.isFinite(cfg.PAUSE_MAX_SEC) ? cfg.PAUSE_MAX_SEC : 10,
    ccfMin: Number.isFinite(cfg.CCF_MIN) ? cfg.CCF_MIN : 60,
    ccfTarget: Number.isFinite(cfg.CCF_TARGET) ? cfg.CCF_TARGET : 80,
  };
}

function validateTurn(turn, i) {
  const clean = validateStats(turn); // also rejects non-objects
  if (!Number.isInteger(turn.compressor) || turn.compressor < 1 || turn.compressor > 4) {
    throw new RangeError(`turns[${i}].compressor must be 1 to 4`);
  }
  clean.compressor = turn.compressor;
  clean.slippedAtSec =
    turn.slippedAtSec === null ? null : checkNumber(`turns[${i}].slippedAtSec`, turn.slippedAtSec, { min: 0, max: 3600 });
  if (!Array.isArray(turn.signs) || turn.signs.length > SIGNS.length) {
    throw new TypeError(`turns[${i}].signs must be a short array`);
  }
  for (const sign of turn.signs) {
    if (!SIGNS.includes(sign)) throw new RangeError(`turns[${i}].signs has an unknown sign`);
  }
  if (new Set(turn.signs).size !== turn.signs.length) throw new RangeError(`turns[${i}].signs has a repeat`);
  clean.signs = [...turn.signs];
  return clean;
}

/**
 * Returns a clean copy of relay stats (Contract 2) or throws. Unknown fields are
 * dropped at every level.
 */
export function validateRelayStats(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new TypeError('stats must be an object');
  }
  if (body.mode !== 'relay') throw new RangeError("mode must be 'relay'");

  const clean = { mode: 'relay' };
  for (const [name, limits] of Object.entries(RELAY_NUMBER_FIELDS)) {
    clean[name] = checkNumber(name, body[name], limits);
  }
  clean.avgSwitchSec =
    body.avgSwitchSec === null ? null : checkNumber('avgSwitchSec', body.avgSwitchSec, { min: 0, max: 3600 });
  if (typeof body.grade !== 'string' || !GRADE_PATTERN.test(body.grade)) {
    throw new TypeError('grade must be a short label');
  }
  clean.grade = body.grade;

  if (!Array.isArray(body.turns) || body.turns.length < 1 || body.turns.length > MAX_TURNS) {
    throw new RangeError(`turns must hold 1 to ${MAX_TURNS} items`);
  }
  clean.turns = body.turns.map(validateTurn);
  return clean;
}

/** Relay stats when mode is 'relay', solo stats otherwise. Throws when invalid. */
export function validateAnyStats(body) {
  return body !== null && typeof body === 'object' && body.mode === 'relay'
    ? validateRelayStats(body)
    : validateStats(body);
}

const SIGN_WORDS = { shallower: 'pushes got smaller', slower: 'rate slowed', elbows: 'elbows started to bend' };

/**
 * @param {object} stats  relay stats, already validated
 * @param {object} [cfg]  settings; defaults to src/config.js
 * @returns {{ system: string, user: string }}
 */
export function buildRelayPrompt(stats, cfg = defaultConfig) {
  const { pauseMaxSec, ccfTarget } = relayTargets(cfg);
  const system = [
    'You are a CPR instructor running a short post-drill debrief for a team that has just practised a relay of adult hands-only chest compressions on a pillow, coached by a webcam app that tracks whoever is compressing.',
    `Use only the numbers you are given and these targets: a rate of ${cfg.RATE_MIN} to ${cfg.RATE_MAX} compressions per minute, full chest recoil, straight arms with locked elbows, shoulders directly over the hands, switching compressors every 2 minutes or sooner when tired, hands-off pauses under ${pauseMaxSec} seconds, and compressions going at least ${ccfTarget}% of the time.`,
    'Write three to five sentences, under 110 words in total, in plain, encouraging language.',
    'Speak to the team first, about the compression fraction and the switches. Then speak to each compressor by number, as "Compressor 1", "Compressor 2" and so on, naming one thing they did well and giving one concrete physical tip.',
    '"Slipping" means a compressor dropped clearly below their own level from the start of their turn; it is not a measurement of force. When someone slipped, say that it is normal and that switching early is the right response.',
    'Give no medical advice beyond compression technique, and never call the app or the measurements certified, accurate, clinical or medical-grade.',
    'Reply with the sentences only: no greeting, heading, list or sign-off.',
  ].join(' ');

  const switchLine =
    stats.avgSwitchSec === null
      ? 'Switches: none.'
      : `Switches: ${stats.switches} (${stats.earlySwitches} called early because the compressor was slipping), averaging ${stats.avgSwitchSec.toFixed(1)} seconds hands-off.`;

  const lines = [
    `Drill length: ${Math.round(stats.durationSec)} seconds, ${stats.turns.length} turns.`,
    `Total compressions: ${stats.compressions}.`,
    `Compression fraction: ${Math.round(stats.compressionFraction)}% (target at least ${ccfTarget}%).`,
    switchLine,
    `Longest hands-off pause: ${stats.longestPauseSec.toFixed(1)} seconds.`,
    `Team score: ${Math.round(stats.score)} out of 100 (${stats.grade}).`,
    '',
  ];
  stats.turns.forEach((t, i) => {
    const slip =
      t.slippedAtSec === null
        ? 'Did not slip.'
        : `Started slipping ${Math.round(t.slippedAtSec)} seconds in: ${t.signs.map((s) => SIGN_WORDS[s]).join(', ') || 'below their own start'}.`;
    lines.push(
      `Turn ${i + 1}, Compressor ${t.compressor}: ${Math.round(t.durationSec)} seconds, ${t.compressions} compressions, average rate ${Math.round(t.avgRate)} per minute (${t.rateTrend}); in the target rate ${Math.round(t.pctRateInRange)}%, elbows locked ${Math.round(t.pctElbowsLocked)}%, shoulders over hands ${Math.round(t.pctAligned)}%, full recoil ${Math.round(t.pctRecoil)}%. ${slip}`,
    );
  });
  lines.push('', 'Write the debrief.');
  return { system, user: lines.join('\n') };
}
