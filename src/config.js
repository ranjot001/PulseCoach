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
  // Setup check (task A6)
  SETUP_MIN_VISIBILITY: 0.6, // near arm and a hip must be at least this visible
  SETUP_SIDE_ON_MAX: 0.45, // shoulder gap ÷ torso length below this counts as side-on
  SETUP_TORSO_MIN: 0.15, // torso length ÷ frame height: closer than this → "Move a little closer"
  SETUP_TORSO_MAX: 0.45, // further than this → "Move back a little"
  SETUP_MARGIN: 0.02, // upper body must be this far inside the frame edges (share of frame)
  SETUP_HOLD_MS: 1000, // all checks pass continuously this long before setup is ok
  PUSH_BARS: 40, // compressions shown in the push-size strip (task A7)

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
  HISTORY_SIZE: 50, // saved drills kept in the history (Contract 4)
  // Flow meter (task B9): a teaching picture, not a measurement
  FLOW_RISE: 0.12, // each good compression closes this share of the gap to full
  FLOW_POOR_FACTOR: 0.5, // a poor compression counts this much
  FLOW_HALF_LIFE_MS: 2500, // the flow meter halves this fast when compressions stop
  FLOW_WARN: 50, FLOW_BAD: 25, // meter colour limits

  // ─── Track C · Debrief and launch ──────────────────────────────────────
  DEBRIEF_TIMEOUT_MS: 6000,
  DEBRIEF_STRONG_PCT: 90, // every component at or above this: "all strong", suggest a longer session
  DEBRIEF_WEAK_PCT: 75, // a second-weakest component below this also gets a tip
};

export default config;
