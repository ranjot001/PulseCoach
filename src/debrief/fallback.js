// Rule-based debrief text: two or three plain sentences, no internet needed.
// Pure logic: no DOM, no browser APIs. Expects stats that passed validateStats().

import { config as defaultConfig } from '../config.js';

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
