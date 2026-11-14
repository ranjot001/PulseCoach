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

  // ─── Track C · Debrief and launch ──────────────────────────────────────
  DEBRIEF_TIMEOUT_MS: 6000,
};

export default config;
