// PulseCoach page: a small screen state machine — home → countdown → practice (relay drill or solo) → results → countdown …
import './styles.css';
import { createEngine } from './engine.js';
import { config } from './config.js';
import { PRODUCT_NAME, FOOTER_LINE, PRACTICE, SESSION, RELAY, RELAY_RESULTS } from './copy.js';
import { createHud, createSwitchOverlay, setTitle, setTurnTitle } from './ui/hud.js';
import { renderHome, renderError, shortcutAction, simulatorUrl } from './ui/home.js';
import { renderResults } from './ui/results.js';
import { renderRelayResults, clockTime } from './ui/relayResults.js';
import { createLeaderboard, renderLeaderboard } from './ui/leaderboard.js';
import { createMetronome } from './audio/metronome.js';
import { createVoice } from './audio/voice.js';
import { createCoach } from './lib/feedback.js';
import { summarise, summariseRelay, switchPauses } from './lib/score.js';
import { createRelay, drillOptions } from './lib/relay.js';
import { buildTimeline } from './lib/timeline.js';
import { saveDrill } from './history.js';

document.getElementById('title').textContent = PRODUCT_NAME;
document.getElementById('footer').textContent = FOOTER_LINE;

const screens = {
  home: document.getElementById('screen-home'),
  session: document.getElementById('screen-session'),
  results: document.getElementById('screen-results'),
  error: document.getElementById('screen-error'),
};
const countdownEl = document.getElementById('countdown');
const countdownNumber = document.getElementById('countdown-number');
const timerEl = document.getElementById('timer');
const relayLabel = document.getElementById('relay-label');

const hud = createHud(document.getElementById('hud'));
const switchOverlay = createSwitchOverlay(document.getElementById('switch'));
const leaderboard = createLeaderboard();

// ─── Metronome ────────────────────────────────────────────────────────────
const beatDot = document.getElementById('beat-dot');
const toggle = document.getElementById('metronome-toggle');
const metronome = createMetronome({
  onBeat() {
    beatDot.classList.remove('beat');
    void beatDot.offsetWidth;
    beatDot.classList.add('beat');
  },
});

function renderToggle() {
  const on = metronome.running;
  toggle.textContent = on ? PRACTICE.metronomeOn : PRACTICE.metronomeOff;
  toggle.setAttribute('aria-pressed', String(on));
  toggle.title = PRACTICE.metronomeHint;
  beatDot.classList.toggle('on', on);
}

function setMetronome(on) {
  if (on && !metronome.running) metronome.start();
  if (!on && metronome.running) metronome.stop();
  renderToggle();
}

// Browsers block audio until the user interacts: unlock on the first click or key press.
function unlockAudio() {
  metronome.unlock();
}
window.addEventListener('pointerdown', unlockAudio, { capture: true });
window.addEventListener('keydown', unlockAudio, { capture: true });
toggle.addEventListener('click', () => setMetronome(!metronome.running));
renderToggle();

// ─── Voice coaching ───────────────────────────────────────────────────────
const voice = createVoice();
let bannerTimer = null;
const coach = createCoach(config, {
  speaker: voice,
  onCue(id, text) {
    hud.setCue(text, id === 'praise' ? 'good' : 'warn');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => hud.setCue(''), config.CUE_BANNER_MS);
  },
});

const voiceToggle = document.getElementById('voice-toggle');
function renderVoiceToggle() {
  voiceToggle.textContent = coach.muted ? PRACTICE.voiceMuted : PRACTICE.voiceOn;
  voiceToggle.setAttribute('aria-pressed', String(coach.muted));
  voiceToggle.classList.toggle('muted', coach.muted);
  voiceToggle.title = PRACTICE.voiceHint;
}
function toggleMute() {
  coach.setMuted(!coach.muted);
  voice.setMuted(coach.muted);
  renderVoiceToggle();
}
voiceToggle.addEventListener('click', toggleMute);
renderVoiceToggle();

const clock = () => (globalThis.performance ? performance.now() : Date.now());

// ─── Engine ───────────────────────────────────────────────────────────────
let screen = 'home';
let events = [];
let homeView = null;
let debug = false;
let mode = 'relay'; // 'relay' | 'solo'
let relay = null;
let lastState = null;
let coachTurn = 0;

function relayPhase() {
  return relay ? relay.getView(clock()).phase : null;
}

const engine = createEngine({
  stage: document.getElementById('stage'),
  onState(state) {
    lastState = state;
    hud.update(state);
    if (screen === 'home' && homeView) homeView.updateSetup(state.setup);
    // Coaching cues stay quiet during a relay switch.
    if (screen === 'practice' && (mode === 'solo' || relayPhase() === 'compressing')) coach.next(state, clock());
  },
  onCompression(event) {
    hud.compression(event);
    if (screen !== 'practice') return;
    if (mode === 'solo') {
      events.push(event);
      return;
    }
    const now = clock();
    relay.onCompression(event, now);
    const view = relay.getView(now);
    if (view.phase === 'compressing' && view.turn !== coachTurn) {
      coachTurn = view.turn;
      coach.reset();
    }
  },
  onError(err) {
    showError(err);
  },
});

// ─── Screens ──────────────────────────────────────────────────────────────
let countdownTimer = null;
let sessionTimer = null;

function show(name) {
  screen = name;
  screens.home.hidden = name !== 'home';
  screens.session.hidden = name !== 'countdown' && name !== 'practice';
  screens.results.hidden = name !== 'results';
  screens.error.hidden = name !== 'error';
  countdownEl.hidden = name !== 'countdown';
  timerEl.hidden = name !== 'countdown' && name !== 'practice';
  relayLabel.hidden = mode !== 'relay' || (name !== 'countdown' && name !== 'practice' && name !== 'results');
  if (name !== 'practice') switchOverlay.hide();
  document.body.dataset.screen = name;
}

function clearTimers() {
  clearInterval(countdownTimer);
  clearInterval(sessionTimer);
  countdownTimer = null;
  sessionTimer = null;
}

function renderTimer(secondsLeft) {
  timerEl.textContent = `${Math.max(0, Math.ceil(secondsLeft))}${SESSION.timerUnit}`;
}

function drawLeaderboard(slot) {
  renderLeaderboard(slot, {
    entries: leaderboard.load(),
    onReset() {
      leaderboard.reset();
      drawLeaderboard(slot);
    },
  });
}

function goHome() {
  clearTimers();
  setMetronome(false);
  show('home');
  homeView = renderHome(screens.home, { onStart: () => startCountdown('relay'), onSolo: () => startCountdown('solo') });
  drawLeaderboard(homeView.leaderboardSlot);
}

function showError(err) {
  clearTimers();
  setMetronome(false);
  voice.cancel();
  show('error');
  renderError(screens.error, err || {}, {
    onRetry() {
      engine.stop();
      goHome();
      startEngine();
    },
    onSimulator() {
      globalThis.location.assign(simulatorUrl(globalThis.location.href));
    },
  });
}

function startCountdown(nextMode = mode) {
  if (screen === 'countdown' || screen === 'practice' || screen === 'error') return;
  clearTimers();
  mode = nextMode;
  hud.setCue('');
  if (mode === 'relay') {
    const opts = drillOptions(globalThis.location?.search, config);
    setTurnTitle(relayLabel, 1, 1, opts.turns);
    renderTimer(opts.turnSeconds);
  } else {
    renderTimer(config.SESSION_SECONDS);
  }
  show('countdown');
  let n = config.COUNTDOWN_SECONDS;
  const tickCount = () => {
    countdownNumber.textContent = String(n);
    if (!coach.muted) voice.speak(String(n));
  };
  tickCount();
  countdownTimer = setInterval(() => {
    n -= 1;
    if (n > 0) tickCount();
    else startPractice();
  }, 1000);
}

function startPractice() {
  clearTimers();
  engine.reset();
  engine.markRest();
  coach.reset();
  events = [];
  if (!coach.muted) voice.speak(SESSION.go);
  show('practice');
  setMetronome(true);
  if (mode === 'relay') {
    startRelay();
    return;
  }
  const startedAt = clock();
  const durationMs = config.SESSION_SECONDS * 1000;
  renderTimer(config.SESSION_SECONDS);
  sessionTimer = setInterval(() => {
    const elapsed = clock() - startedAt;
    renderTimer((durationMs - elapsed) / 1000);
    if (elapsed >= durationMs) finishSession();
  }, 100);
}

// ─── Relay drill ──────────────────────────────────────────────────────────
function startRelay() {
  relay = createRelay(config, drillOptions(globalThis.location?.search, config));
  relay.start(clock());
  coachTurn = 1;
  renderRelay();
  sessionTimer = setInterval(relayTick, 100);
}

function renderRelay() {
  const view = relay.getView(clock());
  setTurnTitle(relayLabel, view.compressor, view.turn, view.turns);
  renderTimer(view.turnSecondsLeft);
  switchOverlay.update(view);
}

/** Drill prompts are spoken at once, cancelling any cue in progress, and respect mute. */
function sayPrompt(text) {
  clearTimeout(bannerTimer);
  hud.setCue(text, 'warn');
  bannerTimer = setTimeout(() => hud.setCue(''), config.CUE_BANNER_MS);
  if (!coach.muted) voice.speak(text);
}

function relayTick() {
  for (const prompt of relay.tick(lastState, clock())) {
    if (prompt === 'finished') {
      finishSession();
      return;
    }
    if (prompt === 'rhythmCheck' || prompt === 'switchEarly') engine.markTurn?.();
    sayPrompt(RELAY.prompts[prompt]);
  }
  renderRelay();
}

function finishSession() {
  clearTimers();
  setMetronome(false);
  voice.cancel();
  clearTimeout(bannerTimer);
  hud.setCue('');
  switchOverlay.hide();
  if (mode === 'relay') {
    showRelayResults();
    return;
  }
  const stats = summarise(events, config.SESSION_SECONDS, config);
  show('results');
  screens.results.classList.remove('relay-results');
  const { leaderboardSlot } = renderResults(screens.results, stats, {
    onSave(name) {
      leaderboard.add({ name, score: stats.score, avgRate: stats.avgRate });
      drawLeaderboard(leaderboardSlot);
    },
    onRetry: startCountdown,
  });
  drawLeaderboard(leaderboardSlot);
}

function showRelayResults() {
  const drill = relay.getDrill();
  const stats = summariseRelay(drill, config);
  const avgRate = stats.compressions ? Math.round(stats.turns.reduce((a, t) => a + t.avgRate * t.compressions, 0) / stats.compressions) : 0;
  const [doneMain, ...doneSub] = RELAY_RESULTS.drillComplete(stats.turns.length, clockTime(stats.durationSec)).split(' · ');
  setTitle(relayLabel, doneMain, doneSub.join(' · '));
  show('results');
  screens.results.classList.add('relay-results');
  const { leaderboardSlot } = renderRelayResults(screens.results, stats, {
    pauses: switchPauses(drill),
    timeline: buildTimeline(drill, config),
    onSave(name) {
      leaderboard.add({ name, score: stats.score, avgRate, mode: 'relay', compressionFraction: stats.compressionFraction });
      saveDrill(name, stats);
      drawLeaderboard(leaderboardSlot);
    },
    onRetry: startCountdown,
  });
  drawLeaderboard(leaderboardSlot);
}

// ─── Keyboard ─────────────────────────────────────────────────────────────
function toggleFullscreen() {
  try {
    if (document.fullscreenElement) document.exitFullscreen?.()?.catch?.(() => {});
    else document.documentElement.requestFullscreen?.()?.catch?.(() => {});
  } catch {
    // Fullscreen not allowed here; ignore.
  }
}

function toggleDebug() {
  debug = !debug;
  engine.setDebug(debug);
}

const actions = {
  start() {
    if (screen === 'home') startCountdown('relay');
    else if (screen === 'results') startCountdown();
  },
  mute: toggleMute,
  metronome: () => setMetronome(!metronome.running),
  debug: toggleDebug,
  fullscreen: toggleFullscreen,
};

window.addEventListener('keydown', (e) => {
  const action = shortcutAction(e);
  if (!action) return;
  // Space on a focused button would also click it; handle it once here instead.
  if (action === 'start') e.preventDefault();
  actions[action]();
});

// Debug tools hidden until D is pressed. The engine runs from load so the setup checklist is live.
function startEngine() {
  try {
    Promise.resolve(engine.start()).catch((err) => showError({ code: 'model-failed', message: String(err?.message || err) }));
  } catch (err) {
    showError({ code: 'model-failed', message: String(err?.message || err) });
  }
}

engine.setDebug(false);
goHome();
startEngine();
