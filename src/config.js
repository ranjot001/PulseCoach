// PulseCoach settings. Change only the values in your own track's section.
// These are starting points for tuning at the webcam; never hard-code a threshold elsewhere.

export const config = {
  // ─── Track A · Motion engine ───────────────────────────────────────────
  BASELINE_WINDOW_MS: 1000, // detrending window
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
  // Relay drill (tasks B5 and B6)
  DRILL_TURNS: 2, // turns in one drill; compressors alternate 1, 2, 1, 2
  DRILL_TURN_SECONDS: 40, // the guideline is 120; shorter so the demo fits in a pitch
  MIN_TURN_SECONDS: 15, // no early switch before this
  EARLY_SWITCH_MS: 3000, // slipping must last this long before the app calls the switch
  RHYTHM_CHECK_MS: 3000, // simulated monitor analysis at each switch
  PAUSE_MIN_MS: 1500, // a gap between compressions longer than this is hands-off time
  PAUSE_WARN_SEC: 5, PAUSE_MAX_SEC: 10,
  CCF_MIN: 60, CCF_TARGET: 80, // compression fraction: floor and target, in percent
  RELAY_WEIGHTS: { technique: 60, handsOff: 40 },

  // ─── Track C · Debrief and launch ──────────────────────────────────────
  DEBRIEF_TIMEOUT_MS: 6000,
  DEBRIEF_STRONG_PCT: 90, // every component at or above this: "all strong", suggest a longer session
  DEBRIEF_WEAK_PCT: 75, // a second-weakest component below this also gets a tip
};

export default config;
