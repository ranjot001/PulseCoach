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

export const GRADES = {
  lifesaver: 'Lifesaver',
  strong: 'Strong',
  gettingThere: 'Getting there',
  keepPractising: 'Keep practising',
};

export const HOME = {
  tagline: 'Practice for adult hands-only CPR',
  instruction: 'Kneel side-on to the camera over a firm pillow, with your whole upper body in view.',
  start: 'Start',
  startHint: 'or press Space',
  diagramLabel: 'Kneeling side-on to the camera, arms straight, hands on a pillow',
};

export const SESSION = {
  getReady: 'Get ready',
  go: 'Go',
  timerUnit: 's',
};

export const RESULTS = {
  scoreHeading: 'Score',
  breakdownHeading: 'Breakdown',
  rate: 'Rate in range',
  elbows: 'Elbows locked',
  position: 'Shoulders over hands',
  recoil: 'Full recoil',
  depth: 'Estimated depth',
  avgRate: (r) => `avg ${r}/min`,
  compressions: (n) => `${n} compressions`,
  depthValue: (cm) => `${cm} cm`,
  trend: { steady: 'Rate steady', slowing: 'Rate slowing', speeding: 'Rate speeding up' },
  nameLabel: 'Name for the leaderboard',
  namePlaceholder: 'Your name',
  save: 'Save',
  saved: 'Saved',
  tryAgain: 'Try again',
  tryAgainHint: 'or press Space',
};

export const LEADERBOARD = {
  heading: 'Leaderboard',
  empty: 'No scores yet. Be the first.',
  reset: 'Reset',
  confirmReset: 'Clear every score on the leaderboard?',
  anonymous: 'Anonymous',
  perMin: '/min',
};

export const copy = { PRODUCT_NAME, FOOTER_LINE, PRACTICE, CUES, GRADES, HOME, SESSION, RESULTS, LEADERBOARD };
export default copy;
