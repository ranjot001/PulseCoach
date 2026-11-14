// Rule-based debrief text: two or three plain sentences, no internet needed.
// Pure logic: no DOM, no browser APIs. Expects stats that passed validateStats().

import { config as defaultConfig } from '../config.js';
import { relayTargets } from './schema.js';

// Shown when there are no usable stats to coach from.
export const NEUTRAL_TEXT = 'Finish a practice session and your coaching tips will appear here.';

const round = (n) => Math.round(n);

// The four form components, in tie-break order.
function components(stats) {
  return [
    { id: 'rate', pct: stats.pctRateInRange },
    { id: 'elbows', pct: stats.pctElbowsLocked },
    { id: 'alignment', pct: stats.pctAligned },
    { id: 'recoil', pct: stats.pctRecoil },
  ];
}

function praise(id, stats, cfg) {
  const range = `${cfg.RATE_MIN} to ${cfg.RATE_MAX}`;
  switch (id) {
    case 'rate':
      return `Your pace was your strongest point, with ${round(stats.pctRateInRange)}% of your compressions inside the ${range} a minute target.`;
    case 'elbows':
      return `Your arms were your strongest point, with your elbows locked on ${round(stats.pctElbowsLocked)}% of your compressions.`;
    case 'alignment':
      return `Your body position was your strongest point, with your shoulders over your hands on ${round(stats.pctAligned)}% of your compressions.`;
    default:
      return `Your recoil was your strongest point, with a full release on ${round(stats.pctRecoil)}% of your compressions.`;
  }
}

function trendClause(trend) {
  if (trend === 'slowing') return ' and it slowed down as you went on';
  if (trend === 'speeding') return ' and it kept speeding up as you went on';
  return '';
}

function fix(id, stats, cfg) {
  const range = `${cfg.RATE_MIN} to ${cfg.RATE_MAX}`;
  switch (id) {
    case 'rate': {
      const avg = round(stats.avgRate);
      const trend = trendClause(stats.rateTrend);
      if (stats.avgRate < cfg.RATE_MIN) {
        return `Your pace was too slow at about ${avg} a minute${trend}, so push on every beat of the metronome and keep that tempo right to the end.`;
      }
      if (stats.avgRate > cfg.RATE_MAX) {
        return `Your pace was too fast at about ${avg} a minute${trend}, so settle onto the beat of the metronome and finish each push before you start the next.`;
      }
      return `Your pace drifted in and out of the ${range} a minute target${trend}, so lock onto the beat of the metronome and count along with it.`;
    }
    case 'elbows':
      return `Your elbows were locked on only ${round(stats.pctElbowsLocked)}% of your compressions, so straighten your arms, lean your shoulders further over your hands and let your body weight do the work.`;
    case 'alignment':
      return `Your shoulders were over your hands on only ${round(stats.pctAligned)}% of your compressions, so shuffle your knees closer and keep your arms straight up and down.`;
    default:
      return `You released fully on only ${round(stats.pctRecoil)}% of your compressions, so lift your weight right off between pushes while keeping your hands in place.`;
  }
}

function trendSentence(trend) {
  return trend === 'slowing'
    ? 'Your pace slowed down towards the end, so keep pushing with the beat as you tire.'
    : 'Your pace crept up towards the end, so stay with the beat and do not rush.';
}

function depthSentence(depthCm, cfg) {
  const target = `${cfg.DEPTH_MIN_CM} to ${cfg.DEPTH_MAX_CM} cm`;
  const avg = depthCm.toFixed(1);
  if (depthCm < cfg.DEPTH_MIN_CM) {
    return `Your estimated depth averaged ${avg} cm, so press a little deeper towards the ${target} target.`;
  }
  if (depthCm > cfg.DEPTH_MAX_CM) {
    return `Your estimated depth averaged ${avg} cm, so ease off slightly towards the ${target} target.`;
  }
  return `Your estimated depth averaged ${avg} cm, right inside the ${target} target.`;
}

// Adds a sentence, or joins it to the last one when the debrief is already full.
function add(sentences, sentence, maxSentences) {
  if (sentences.length < maxSentences) {
    sentences.push(sentence);
    return;
  }
  const last = sentences.length - 1;
  const joined = sentence.charAt(0).toLowerCase() + sentence.slice(1);
  sentences[last] = `${sentences[last].slice(0, -1)}; ${joined}`;
}

/**
 * Two or three plain coaching sentences built from the session stats.
 * @param {object} stats  Contract 2 stats, already validated
 * @param {object} [cfg]  settings; defaults to src/config.js
 */
export function fallbackDebrief(stats, cfg = defaultConfig) {
  const MAX_SENTENCES = 3;

  if (stats.compressions === 0) {
    return 'No compressions were counted this time. Kneel side-on to the camera with your shoulders and hips in view, then push hard and fast in time with the metronome.';
  }

  const parts = components(stats);
  const strongest = parts.reduce((best, p) => (p.pct > best.pct ? p : best));
  // Weakest first; the strongest is never also named as a weakness.
  const others = parts.filter((p) => p !== strongest).sort((a, b) => a.pct - b.pct);
  const weakest = others[0];

  const sentences = [praise(strongest.id, stats, cfg)];
  let rateCovered = false;

  if (weakest.pct >= cfg.DEBRIEF_STRONG_PCT) {
    sentences.push(
      'Everything else was strong too, so try a longer session next and see if you can hold this form as you tire.',
    );
  } else {
    sentences.push(fix(weakest.id, stats, cfg));
    rateCovered = weakest.id === 'rate';
    const second = others[1];
    if (second.pct < cfg.DEBRIEF_WEAK_PCT) {
      sentences.push(fix(second.id, stats, cfg));
      rateCovered = rateCovered || second.id === 'rate';
    }
  }

  if (stats.rateTrend !== 'steady' && !rateCovered) {
    add(sentences, trendSentence(stats.rateTrend), MAX_SENTENCES);
  }
  if (stats.avgDepthCm !== null) {
    add(sentences, depthSentence(stats.avgDepthCm, cfg), MAX_SENTENCES);
  }

  return sentences.join(' ');
}

// ─── Relay debrief ──────────────────────────────────────────────────────────

const LABELS = {
  rate: 'your pace',
  elbows: 'locked elbows',
  alignment: 'shoulders over hands',
  recoil: 'full recoil',
};

function relayTip(id, turn, cfg) {
  switch (id) {
    case 'rate':
      if (turn.avgRate < cfg.RATE_MIN) return 'push a little faster, on every beat of the metronome';
      if (turn.avgRate > cfg.RATE_MAX) return 'ease back onto the beat of the metronome';
      return 'stay locked onto the beat of the metronome';
    case 'elbows':
      return 'lock your elbows and let your body weight do the work';
    case 'alignment':
      return 'shuffle your knees in so your shoulders sit right over your hands';
    default:
      return 'let the chest come all the way back up between pushes';
  }
}

// "your pushes got smaller and slower", "your pace slowed", "your elbows started to bend", ...
function slipWords(signs) {
  const has = (s) => signs.includes(s);
  const parts = [];
  if (has('shallower') && has('slower')) parts.push('your pushes got smaller and slower');
  else if (has('shallower')) parts.push('your pushes got smaller');
  else if (has('slower')) parts.push('your pace slowed');
  if (has('elbows')) parts.push('your elbows started to bend');
  if (parts.length === 0) return 'your compressions dropped below your own start';
  return parts.join(' and ');
}

function teamSentence(stats, cfg) {
  const { pauseMaxSec, ccfTarget } = relayTargets(cfg);
  const ccf = round(stats.compressionFraction);
  const ccfOk = stats.compressionFraction >= ccfTarget;
  const sw = stats.avgSwitchSec;
  const swText = sw === null ? null : sw.toFixed(1);
  const swWord = stats.switches > 1 ? 'your switches took' : 'your switch took';
  const swOk = sw === null || sw <= pauseMaxSec;

  const fraction = ccfOk
    ? `As a team, you kept compressions going ${ccf}% of the time, above the ${ccfTarget}% target`
    : `As a team, you kept compressions going ${ccf}% of the time, under the ${ccfTarget}% target`;

  if (sw === null) {
    return ccfOk ? `${fraction}.` : `${fraction}, so start compressions straight away and keep every pause short.`;
  }
  if (swOk) {
    const avg = stats.switches > 1 ? ' on average' : '';
    return ccfOk
      ? `${fraction}, and ${swWord} ${swText} seconds${avg}, under ${pauseMaxSec}.`
      : `${fraction}, so start compressions straight away; ${swWord} ${swText} seconds${avg}, under ${pauseMaxSec}.`;
  }
  const fix = `so have the next compressor kneeling ready with hands up before the call, and aim to switch in under ${pauseMaxSec} seconds`;
  return ccfOk
    ? `${fraction}, but ${swWord} ${swText} seconds, ${fix}.`
    : `${fraction}, mostly because ${swWord} ${swText} seconds, ${fix}.`;
}

// One sentence for each compressor, built from the turn that matters most:
// the first turn where they slipped, otherwise their lowest-scoring turn.
function compressorSentence(number, turns, stats, cfg) {
  const turn = turns.find((t) => t.slippedAtSec !== null) ?? turns.reduce((a, b) => (b.score < a.score ? b : a));
  const who = `Compressor ${number}`;

  if (turn.compressions === 0) {
    return { text: `${who}, no compressions were counted in your turn, so make sure you are in the camera's view when you take over.`, kind: 'fix' };
  }

  const parts = components(turn);
  const best = parts.reduce((a, b) => (b.pct > a.pct ? b : a));
  const worst = parts.filter((p) => p !== best).reduce((a, b) => (b.pct < a.pct ? b : a));

  if (turn.slippedAtSec !== null) {
    const isLastTurn = stats.turns.indexOf(turn) === stats.turns.length - 1;
    const response =
      stats.earlySwitches > 0 && !isLastTurn
        ? "switching early kept the team's compressions strong"
        : 'switching early as soon as you notice it is the right response';
    return {
      text: `${who}, ${slipWords(turn.signs)} from about ${round(turn.slippedAtSec)} seconds in; that is normal, and ${response}.`,
      kind: 'slip',
    };
  }

  if (worst.pct >= cfg.DEBRIEF_STRONG_PCT) {
    return { text: `${who}, every part of your technique was strong, led by ${LABELS[best.id]} at ${round(best.pct)}%.`, kind: 'strong' };
  }
  return {
    text: `${who}, your strongest point was ${LABELS[best.id]} at ${round(best.pct)}%; next time, ${relayTip(worst.id, turn, cfg)}.`,
    kind: 'fix',
  };
}

/**
 * Three to five plain sentences for a relay drill: one for the team, one for
 * each compressor, and a closing line when there is room.
 * @param {object} stats  relay stats, already validated
 * @param {object} [cfg]  settings; defaults to src/config.js
 */
export function fallbackRelayDebrief(stats, cfg = defaultConfig) {
  const MAX_SENTENCES = 5;

  if (stats.compressions === 0) {
    return 'No compressions were counted in this drill. Kneel side-on to the camera with your shoulders and hips in view. Then push hard and fast in time with the metronome, and switch when the app calls it.';
  }

  const { pauseMaxSec, ccfTarget } = relayTargets(cfg);
  const sentences = [teamSentence(stats, cfg)];

  const byCompressor = new Map();
  for (const t of stats.turns) {
    if (!byCompressor.has(t.compressor)) byCompressor.set(t.compressor, []);
    byCompressor.get(t.compressor).push(t);
  }
  const teamOk = stats.compressionFraction >= ccfTarget && (stats.avgSwitchSec === null || stats.avgSwitchSec <= pauseMaxSec);
  const kinds = [];
  for (const number of [...byCompressor.keys()].sort((a, b) => a - b)) {
    const { text, kind } = compressorSentence(number, byCompressor.get(number), stats, cfg);
    kinds.push(kind);
    add(sentences, text, MAX_SENTENCES);
  }

  let closing;
  if (teamOk && kinds.every((k) => k === 'strong')) {
    closing = 'Everything was strong, so try longer turns next time, building towards the full 2 minutes.';
  } else if (!teamOk || kinds.includes('fix')) {
    closing = 'Run the drill again, with each of you working on your one fix.';
  } else {
    closing = 'Keep switching as soon as someone starts to slip, and run the drill again.';
  }
  add(sentences, closing, MAX_SENTENCES);

  return sentences.join(' ');
}

/** The rule-based debrief for either kind of stats, already validated. */
export function fallbackAnyDebrief(stats, cfg = defaultConfig) {
  return stats.mode === 'relay' ? fallbackRelayDebrief(stats, cfg) : fallbackDebrief(stats, cfg);
}
