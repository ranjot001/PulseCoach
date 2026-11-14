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

  // ─── Track B · Coach and session ───────────────────────────────────────
  METRONOME_BPM: 110,
  SESSION_SECONDS: 30,
  VOICE_COOLDOWN_MS: 3500,
  VOICE_REPEAT_MS: 8000,
  SCORE_WEIGHTS: { rate: 40, elbows: 20, alignment: 20, recoil: 20, depth: 15 },

  // ─── Track C · Debrief and launch ──────────────────────────────────────
  DEBRIEF_TIMEOUT_MS: 6000,
};

export default config;
