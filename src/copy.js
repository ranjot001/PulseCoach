// Every label the learner sees lives here.
export const PRODUCT_NAME = 'PulseCoach';
export const FOOTER_LINE = 'Practice aid for adult hands-only CPR. Not a substitute for certified training.';

export const PRACTICE = {
  rateHeading: 'Rate',
  rateUnit: 'per min',
  rateEmpty: '–',
  rateSlow: 'Push faster',
  rateGood: 'Good pace',
  rateFast: 'Slow down',
  rateTarget: 'Target 100–120',
  counterHeading: 'Compressions',
  chipElbows: 'Elbows',
  chipPosition: 'Position',
  chipRecoil: 'Recoil',
  chipDepth: 'Estimated depth',
  depthShallow: 'shallow',
  depthGood: 'good',
  depthDeep: 'deep',
  statusLoading: 'Loading',
  statusNoPerson: 'No person in view',
  metronomeOn: 'Metronome on',
  metronomeOff: 'Metronome off',
  metronomeHint: 'Press M',
  errorPrefix: 'Camera problem',
  voiceOn: 'Voice on',
  voiceMuted: 'Voice muted',
};

// Spoken coaching cues, keyed by the ids src/lib/feedback.js returns.
export const CUES = {
  notVisible: 'Move back into view',
  slow: 'Push faster',
  fast: 'Slow down a little',
  elbows: 'Lock your elbows',
  position: 'Shoulders over your hands',
  recoil: 'Let the chest come all the way up',
  shallow: 'Push a little harder',
  deep: 'Ease off slightly',
  praise: 'Good pace, keep going',
};

export const copy = { PRODUCT_NAME, FOOTER_LINE, PRACTICE, CUES };
export default copy;
