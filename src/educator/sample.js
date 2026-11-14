// A copy of tests/fixtures/history.js, shown by "Load sample data" on the educator view.
// It is never written to storage. tests/educator-summary.test.js checks it still matches the fixture.

export const SAMPLE_HISTORY = [
  {
    id: 'd6',
    savedAt: '2026-11-14T15:42:10.000Z',
    team: 'Ward 4B',
    stats: {
      mode: 'relay',
      durationSec: 85,
      compressions: 147,
      compressionFraction: 94,
      switches: 1,
      earlySwitches: 0,
      avgSwitchSec: 4.2,
      longestPauseSec: 4.2,
      score: 96,
      grade: 'Lifesaver',
      turns: [
        {
          compressor: 1,
          durationSec: 40,
          compressions: 74,
          avgRate: 112,
          pctRateInRange: 95,
          pctElbowsLocked: 97,
          pctAligned: 94,
          pctRecoil: 96,
          avgDepthCm: null,
          rateTrend: 'steady',
          score: 95,
          grade: 'Lifesaver',
          slippedAtSec: null,
          signs: []
        },
        {
          compressor: 2,
          durationSec: 40,
          compressions: 73,
          avgRate: 110,
          pctRateInRange: 92,
          pctElbowsLocked: 95,
          pctAligned: 93,
          pctRecoil: 94,
          avgDepthCm: null,
          rateTrend: 'steady',
          score: 93,
          grade: 'Lifesaver',
          slippedAtSec: null,
          signs: []
        }
      ]
    }
  },
  {
    id: 'd5',
    savedAt: '2026-11-14T15:31:55.000Z',
    team: 'Night shift',
    stats: {
      mode: 'relay',
      durationSec: 74,
      compressions: 119,
      compressionFraction: 90,
      switches: 1,
      earlySwitches: 1,
      avgSwitchSec: 6.1,
      longestPauseSec: 6.1,
      score: 92,
      grade: 'Lifesaver',
      turns: [
        {
          compressor: 1,
          durationSec: 27,
          compressions: 47,
          avgRate: 104,
          pctRateInRange: 70,
          pctElbowsLocked: 81,
          pctAligned: 90,
          pctRecoil: 74,
          avgDepthCm: null,
          rateTrend: 'slowing',
          score: 76,
          grade: 'Strong',
          slippedAtSec: 24,
          signs: [
            'shallower',
            'slower'
          ]
        },
        {
          compressor: 2,
          durationSec: 40,
          compressions: 72,
          avgRate: 109,
          pctRateInRange: 92,
          pctElbowsLocked: 95,
          pctAligned: 92,
          pctRecoil: 94,
          avgDepthCm: null,
          rateTrend: 'steady',
          score: 93,
          grade: 'Lifesaver',
          slippedAtSec: null,
          signs: []
        }
      ]
    }
  },
  {
    id: 'd4',
    savedAt: '2026-11-14T15:20:30.000Z',
    team: 'Ward 4B',
    stats: {
      mode: 'relay',
      durationSec: 85,
      compressions: 147,
      compressionFraction: 88,
      switches: 1,
      earlySwitches: 0,
      avgSwitchSec: 7.4,
      longestPauseSec: 7.4,
      score: 90,
      grade: 'Lifesaver',
      turns: [
        {
          compressor: 1,
          durationSec: 40,
          compressions: 74,
          avgRate: 112,
          pctRateInRange: 95,
          pctElbowsLocked: 97,
          pctAligned: 94,
          pctRecoil: 96,
          avgDepthCm: null,
          rateTrend: 'steady',
          score: 95,
          grade: 'Lifesaver',
          slippedAtSec: null,
          signs: []
        },
        {
          compressor: 2,
          durationSec: 40,
          compressions: 73,
          avgRate: 110,
          pctRateInRange: 92,
          pctElbowsLocked: 95,
          pctAligned: 93,
          pctRecoil: 94,
          avgDepthCm: null,
          rateTrend: 'steady',
          score: 93,
          grade: 'Lifesaver',
          slippedAtSec: null,
          signs: []
        }
      ]
    }
  },
  {
    id: 'd3',
    savedAt: '2026-11-14T15:08:02.000Z',
    team: 'Sim lab',
    stats: {
      mode: 'relay',
      durationSec: 101,
      compressions: 142,
      compressionFraction: 79,
      switches: 1,
      earlySwitches: 0,
      avgSwitchSec: 18.2,
      longestPauseSec: 18.2,
      score: 82,
      grade: 'Strong',
      turns: [
        {
          compressor: 1,
          durationSec: 40,
          compressions: 72,
          avgRate: 109,
          pctRateInRange: 88,
          pctElbowsLocked: 92,
          pctAligned: 86,
          pctRecoil: 90,
          avgDepthCm: null,
          rateTrend: 'steady',
          score: 88,
          grade: 'Strong',
          slippedAtSec: null,
          signs: []
        },
        {
          compressor: 2,
          durationSec: 40,
          compressions: 70,
          avgRate: 106,
          pctRateInRange: 84,
          pctElbowsLocked: 88,
          pctAligned: 85,
          pctRecoil: 87,
          avgDepthCm: null,
          rateTrend: 'steady',
          score: 85,
          grade: 'Strong',
          slippedAtSec: null,
          signs: []
        }
      ]
    }
  },
  {
    id: 'd2',
    savedAt: '2026-11-14T14:55:47.000Z',
    team: 'Night shift',
    stats: {
      mode: 'relay',
      durationSec: 74,
      compressions: 119,
      compressionFraction: 84,
      switches: 1,
      earlySwitches: 1,
      avgSwitchSec: 9.3,
      longestPauseSec: 9.3,
      score: 85,
      grade: 'Strong',
      turns: [
        {
          compressor: 1,
          durationSec: 27,
          compressions: 47,
          avgRate: 104,
          pctRateInRange: 70,
          pctElbowsLocked: 81,
          pctAligned: 90,
          pctRecoil: 74,
          avgDepthCm: null,
          rateTrend: 'slowing',
          score: 76,
          grade: 'Strong',
          slippedAtSec: 24,
          signs: [
            'shallower',
            'slower'
          ]
        },
        {
          compressor: 2,
          durationSec: 40,
          compressions: 72,
          avgRate: 109,
          pctRateInRange: 92,
          pctElbowsLocked: 95,
          pctAligned: 92,
          pctRecoil: 94,
          avgDepthCm: null,
          rateTrend: 'steady',
          score: 93,
          grade: 'Lifesaver',
          slippedAtSec: null,
          signs: []
        }
      ]
    }
  },
  {
    id: 'd1',
    savedAt: '2026-11-14T14:41:19.000Z',
    team: 'Ward 4B',
    stats: {
      mode: 'relay',
      durationSec: 101,
      compressions: 142,
      compressionFraction: 72,
      switches: 1,
      earlySwitches: 0,
      avgSwitchSec: 21.5,
      longestPauseSec: 21.5,
      score: 74,
      grade: 'Getting there',
      turns: [
        {
          compressor: 1,
          durationSec: 40,
          compressions: 72,
          avgRate: 109,
          pctRateInRange: 88,
          pctElbowsLocked: 92,
          pctAligned: 86,
          pctRecoil: 90,
          avgDepthCm: null,
          rateTrend: 'steady',
          score: 88,
          grade: 'Strong',
          slippedAtSec: null,
          signs: []
        },
        {
          compressor: 2,
          durationSec: 40,
          compressions: 70,
          avgRate: 106,
          pctRateInRange: 84,
          pctElbowsLocked: 88,
          pctAligned: 85,
          pctRecoil: 87,
          avgDepthCm: null,
          rateTrend: 'steady',
          score: 85,
          grade: 'Strong',
          slippedAtSec: null,
          signs: []
        }
      ]
    }
  }
];
