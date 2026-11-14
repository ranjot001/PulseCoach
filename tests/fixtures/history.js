// Contract 4 sample drill history, in the exact shape stored under 'pulsecoach.history.v1'.
// Newest first. Team names are user text: always render them with textContent.

import { goodRelay, slowSwitchRelay, fadingRelay } from './relayStats.js';

export const HISTORY_KEY = 'pulsecoach.history.v1';

export const sampleHistory = [
  { id: 'd6', savedAt: '2026-11-14T15:42:10.000Z', team: 'Ward 4B', stats: goodRelay },
  { id: 'd5', savedAt: '2026-11-14T15:31:55.000Z', team: 'Night shift', stats: fadingRelay },
  {
    id: 'd4',
    savedAt: '2026-11-14T15:20:30.000Z',
    team: 'Ward 4B',
    stats: { ...goodRelay, compressionFraction: 88, avgSwitchSec: 7.4, longestPauseSec: 7.4, score: 90 },
  },
  { id: 'd3', savedAt: '2026-11-14T15:08:02.000Z', team: 'Sim lab', stats: slowSwitchRelay },
  {
    id: 'd2',
    savedAt: '2026-11-14T14:55:47.000Z',
    team: 'Night shift',
    stats: { ...fadingRelay, compressionFraction: 84, avgSwitchSec: 9.3, longestPauseSec: 9.3, score: 85, grade: 'Strong' },
  },
  {
    id: 'd1',
    savedAt: '2026-11-14T14:41:19.000Z',
    team: 'Ward 4B',
    stats: { ...slowSwitchRelay, compressionFraction: 72, avgSwitchSec: 21.5, longestPauseSec: 21.5, score: 74, grade: 'Getting there' },
  },
];
