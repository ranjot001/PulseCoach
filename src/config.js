// PulseCoach settings. Change only the values in your own track's section.
// These are starting points for tuning at the webcam; never hard-code a threshold elsewhere.

export const config = {
  // ─── Track A · Motion engine ───────────────────────────────────────────
  BASELINE_WINDOW_MS: 1000, // detrending window
  SMOOTH_WINDOW_MS: 100, // short moving average that removes landmark jitter
  TORSO_WINDOW_MS: 1000, // rolling median window for a steady torso length
  MIN_TRAVEL: 0.03, // torso units; smaller movements are not compressions
  MIN_INTERVAL_MS: 250, // two compressions cannot be closer than this
  RATE_MIN: 100,
  RATE_MAX: 120,
  RATE_WINDOW: 5,
  RATE_STALE_MS: 2000,
  ELBOW_LOCKED_DEG: 160,
  ARM_LEAN_MAX_DEG: 15,
  RECOIL_MIN_RATIO: 0.85,
  MIN_VISIBILITY: 0.5,
  TORSO_CM: 50,
  DEPTH_MIN_CM: 5,
  DEPTH_MAX_CM: 6,
  DEPTH_TOLERANCE_CM: 0.5,
  FEATURES: { depth: false },
  // Fatigue (task A5): each compressor is compared with their own start.
  FATIGUE_BASELINE_MS: 10000, // the first 10 s of compressions in a turn set the compressor's own baseline
  FATIGUE_WINDOW: 6, // recent compressions compared with the baseline
  FATIGUE_TRAVEL_DROP: 0.2, // pushes this much smaller than baseline: 'shallower'
  FATIGUE_RATE_DROP_CPM: 8, // rate this much below baseline: 'slower'
  FATIGUE_ELBOW_DROP: 0.3, // share of locked elbows this much below baseline: 'elbows'

  // ─── Track B · Coach and session ───────────────────────────────────────
  METRONOME_BPM: 110,
  METRONOME_VOLUME: 0.8, // 0..1
  RATE_WARN_MARGIN: 10, // cpm outside the target band that still shows amber
  GAUGE_MIN: 60, GAUGE_MAX: 160, // cpm range drawn on the rate gauge
  SESSION_SECONDS: 30,
  VOICE_COOLDOWN_MS: 3500,
  VOICE_REPEAT_MS: 8000,
  VOICE_PERSIST_MS: 1500, // a problem must last this long before it is spoken
  PRAISE_AFTER_MS: 6000, // clean time needed before praise
  PRAISE_REPEAT_MS: 10000, // at most one praise this often
  CUE_BANNER_MS: 3000, // how long a cue stays on screen
  SCORE_WEIGHTS: { rate: 40, elbows: 20, alignment: 20, recoil: 20, depth: 15 },
  RATE_TREND_CPM: 6, // first vs last third must differ by this much to count as slowing/speeding
  GRADE_BANDS: { lifesaver: 90, strong: 75, gettingThere: 50 }, // minimum score for each grade
  RESULT_GOOD_PCT: 80, RESULT_WARN_PCT: 50, // colour of each breakdown bar
  COUNTDOWN_SECONDS: 3,
  LEADERBOARD_SIZE: 10,
  NAME_MAX_CHARS: 12,

  // ─── Track C · Debrief and launch ──────────────────────────────────────
  DEBRIEF_TIMEOUT_MS: 6000,
  DEBRIEF_STRONG_PCT: 90, // every component at or above this: "all strong", suggest a longer session
  DEBRIEF_WEAK_PCT: 75, // a second-weakest component below this also gets a tip
};

export default config;
