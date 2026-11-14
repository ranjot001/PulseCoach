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
  rateSub: 'per min · target 100–120',
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
  metronomeOn: 'Beat on · B',
  metronomeOff: 'Beat off · B',
  metronomeHint: 'Press B',
  voiceHint: 'Press M',
  errorPrefix: 'Camera problem',
  voiceOn: 'Voice on · M',
  voiceMuted: 'Voice off · M',
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
  eyebrow: 'Team CPR drill · adult hands-only',
  headline: ['CPR is a relay,', 'not a sprint.'],
  lede: 'Two people, one pillow, one laptop camera. PulseCoach spots when compressions start to slip, calls the switch and times every pause.',
  facts: [
    { value: '7 min', text: 'median wait for help after a 911 call' },
    { value: '~1 min', text: 'until compression quality starts to drop, in manikin studies' },
    { value: '80%', text: 'of the time, compressions should be happening' },
  ],
  factSources: 'Mell et al. 2017 · Hightower et al. 1995 · AHA',
  steps: [
    { title: 'Compress.', text: 'The camera learns your own level in the first 10 seconds.' },
    { title: 'Switch.', text: 'On the clock, or sooner if you start to slip. Keep the pause under 10 seconds.' },
    { title: 'Debrief.', text: 'A team score and a line for each compressor.' },
  ],
  boardHeading: 'Team board',
  spaceKey: 'Space',
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
  heading: 'Team board',
  empty: 'No scores yet. Be the first.',
  reset: 'Reset',
  confirmReset: 'Clear every score on the leaderboard?',
  anonymous: 'Anonymous',
  perMin: '/min',
  relayTag: 'Relay',
  ccf: (pct) => `${pct}% on chest`,
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
  handsOffHeading: 'Hands-off time',
  pauseNumber: (sec) => sec.toFixed(1),
  pauseUnit: 's',
  pauseMarks: (warn, max, end) => ['0', `${warn} s`, `${max} s · limit`, String(end)],
  switchLead: 'Switch! ',
  switchWho: (compressor) => `Compressor ${compressor}`,
  switchTail: ', start now',
  switchNow: (compressor) => `Switch! Compressor ${compressor}, start now`,
  pauseValue: (sec) => `${sec.toFixed(1)}s`,
  slipping: 'Slipping',
  signs: { shallower: 'smaller pushes', slower: 'slower', elbows: 'elbows bending' },
};

export const RELAY_RESULTS = {
  teamScore: 'Team score',
  drillComplete: (turns, time) => `Drill complete · ${turns} turns · ${time}`,
  ccfHeading: 'On the chest',
  ccfHint: (target) => `target ${target}%`,
  ccfValue: (pct) => `${pct}%`,
  switchesHeading: 'Switches',
  switchLabel: (n) => `Switch ${n}`,
  switchAverage: 'Average switch',
  noSwitches: 'No switches',
  pauseValue: (sec) => `${sec.toFixed(1)} s`,
  pauseNumber: (sec) => sec.toFixed(1),
  pauseUnit: ' s',
  switchNote: (max) => `Limit ${max} s.`,
  earlyNote: (max) => `Called early, when the compressor started slipping. Limit ${max} s.`,
  earlyTag: 'early switch',
  longestPause: (sec) => `Longest pause ${sec.toFixed(1)} s`,
  compressor: (n) => `Compressor ${n}`,
  turnStats: (compressions, rate, time) => `${compressions} compressions · ${rate} / min · ${time}`,
  turnScore: (score) => `Score ${score}`,
  slippedAt: (time, signs) => (signs ? `Started slipping at ${time}: ${signs}` : `Started slipping at ${time}`),
  heldForm: 'Held form for the whole turn',
  saveHeading: 'Save to the team board',
  runAgain: 'Run it again · Space',
  teamNameLabel: 'Team name for the leaderboard',
  teamNamePlaceholder: 'Team name',
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
  fail: '!',
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

export const copy = { PRODUCT_NAME, FOOTER_LINE, PRACTICE, CUES, GRADES, HOME, SESSION, RESULTS, LEADERBOARD, SETUP, SHORTCUT_LEGEND, ERRORS, RELAY, RELAY_RESULTS };
export default copy;
