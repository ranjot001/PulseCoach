// Contract 2 sample session stats, in the exact shape summarise() returns.

export const goodStats = {
  durationSec: 30,
  compressions: 56,
  avgRate: 112,
  pctRateInRange: 94,
  pctElbowsLocked: 96,
  pctAligned: 93,
  pctRecoil: 95,
  avgDepthCm: null,
  rateTrend: 'steady',
  score: 94,
  grade: 'Lifesaver',
};

export const slowStats = {
  durationSec: 30,
  compressions: 43,
  avgRate: 86,
  pctRateInRange: 8,
  pctElbowsLocked: 90,
  pctAligned: 88,
  pctRecoil: 92,
  avgDepthCm: null,
  rateTrend: 'slowing',
  score: 52,
  grade: 'Getting there',
};

export const sloppyStats = {
  durationSec: 30,
  compressions: 61,
  avgRate: 124,
  pctRateInRange: 41,
  pctElbowsLocked: 35,
  pctAligned: 48,
  pctRecoil: 52,
  avgDepthCm: 4.2,
  rateTrend: 'speeding',
  score: 44,
  grade: 'Keep practising',
};

export const allStats = { goodStats, slowStats, sloppyStats };
