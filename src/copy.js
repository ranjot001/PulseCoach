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
  metronomeHint: 'Press B',
  voiceHint: 'Press M',
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

export const RELAY = {
  prompts: {
    rhythmCheck: 'Stop compressions. Rhythm check.',
    resume: 'Switch compressors. Resume now.',
    switchEarly: 'Your compressions are dropping off. Switch now.',
    backOn: 'Back on the chest!',
  },
  startRelay: 'Start relay drill',
  startSolo: 'Solo practice · 30 s',
  turnLabel: (compressor, turn, turns) => `Compressor ${compressor} · Turn ${turn} of ${turns}`,
  rhythmHandsOff: 'Rhythm check: hands off',
  switchNow: (compressor) => `Switch! Compressor ${compressor}, start now`,
  pauseValue: (sec) => `${sec.toFixed(1)}s`,
  slipping: 'Slipping',
  signs: { shallower: 'smaller pushes', slower: 'slower', elbows: 'elbows bending' },
};

export const SETUP = {
  heading: 'Get into position',
  startAnyway: 'Start anyway',
  // Labels for Track A's setup check ids; unknown ids show their id.
  labels: {
    person: 'Person in view',
    visible: 'Arms and hips visible',
    'side-on': 'Side-on to the camera',
    distance: 'Right distance',
    'in-frame': 'Centred in the picture',
  },
  pass: '✓',
  fail: '✗',
};

export const SHORTCUT_LEGEND = {
  heading: 'Keys',
  start: 'Start relay / restart',
  mute: 'Voice on / off',
  metronome: 'Metronome',
  debug: 'Debug view',
  fullscreen: 'Fullscreen',
};

export const ERRORS = {
  'camera-denied': {
    title: 'Camera blocked',
    body: 'Allow camera access in the browser’s address bar, then try again.',
  },
  'no-camera': {
    title: 'No camera found',
    body: 'Connect a webcam and try again, or run the simulator.',
  },
  'model-failed': {
    title: 'Body tracking did not load',
    body: 'Try again. If it keeps failing, run the simulator.',
  },
  unknown: {
    title: 'Something went wrong',
    body: 'Try again, or run the simulator.',
  },
  tryAgain: 'Try again',
  runSimulator: 'Run simulator',
};

export const copy = { PRODUCT_NAME, FOOTER_LINE, PRACTICE, CUES, GRADES, HOME, SESSION, RESULTS, LEADERBOARD, SETUP, SHORTCUT_LEGEND, ERRORS, RELAY };
export default copy;
