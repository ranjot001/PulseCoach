// PulseCoach page: a small screen state machine — home → countdown → practice → results → countdown …
import './styles.css';
import { createEngine } from './engine.js';
import { config } from './config.js';
import { PRODUCT_NAME, FOOTER_LINE, PRACTICE, SESSION } from './copy.js';
import { createHud } from './ui/hud.js';
import { renderHome } from './ui/home.js';
import { renderResults } from './ui/results.js';
import { createLeaderboard, renderLeaderboard } from './ui/leaderboard.js';
import { createMetronome } from './audio/metronome.js';
import { createVoice } from './audio/voice.js';
import { createCoach } from './lib/feedback.js';
import { summarise } from './lib/score.js';

document.getElementById('title').textContent = PRODUCT_NAME;
document.getElementById('footer').textContent = FOOTER_LINE;

const screens = {
  home: document.getElementById('screen-home'),
  session: document.getElementById('screen-session'),
  results: document.getElementById('screen-results'),
};
const countdownEl = document.getElementById('countdown');
const countdownNumber = document.getElementById('countdown-number');
const timerEl = document.getElementById('timer');

const hud = createHud(document.getElementById('hud'));
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
}
voiceToggle.addEventListener('click', () => {
  coach.setMuted(!coach.muted);
  voice.setMuted(coach.muted);
  renderVoiceToggle();
});
renderVoiceToggle();

const clock = () => (globalThis.performance ? performance.now() : Date.now());

// ─── Engine ───────────────────────────────────────────────────────────────
let screen = 'home';
let events = [];

const engine = createEngine({
  stage: document.getElementById('stage'),
  onState(state) {
    hud.update(state);
    if (screen === 'practice') coach.next(state, clock());
  },
  onCompression(event) {
    hud.compression(event);
    if (screen === 'practice') events.push(event);
  },
  onError(err) {
    hud.setError(`${PRACTICE.errorPrefix}: ${err.message}`);
  },
});
let engineStarted = false;

// ─── Screens ──────────────────────────────────────────────────────────────
let countdownTimer = null;
let sessionTimer = null;

function show(name) {
  screen = name;
  screens.home.hidden = name !== 'home';
  screens.session.hidden = name !== 'countdown' && name !== 'practice';
  screens.results.hidden = name !== 'results';
  countdownEl.hidden = name !== 'countdown';
  timerEl.hidden = name !== 'countdown' && name !== 'practice';
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
  const { leaderboardSlot } = renderHome(screens.home, { onStart: startCountdown });
  drawLeaderboard(leaderboardSlot);
}

function startCountdown() {
  if (screen === 'countdown' || screen === 'practice') return;
  clearTimers();
  if (!engineStarted) {
    engineStarted = true;
    engine.start();
  }
  hud.setCue('');
  renderTimer(config.SESSION_SECONDS);
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
  const startedAt = clock();
  const durationMs = config.SESSION_SECONDS * 1000;
  renderTimer(config.SESSION_SECONDS);
  sessionTimer = setInterval(() => {
    const elapsed = clock() - startedAt;
    renderTimer((durationMs - elapsed) / 1000);
    if (elapsed >= durationMs) finishSession();
  }, 100);
}

function finishSession() {
  clearTimers();
  setMetronome(false);
  voice.cancel();
  clearTimeout(bannerTimer);
  hud.setCue('');
  const stats = summarise(events, config.SESSION_SECONDS, config);
  show('results');
  const { leaderboardSlot } = renderResults(screens.results, stats, {
    onSave(name) {
      leaderboard.add({ name, score: stats.score, avgRate: stats.avgRate });
      drawLeaderboard(leaderboardSlot);
    },
    onRetry: startCountdown,
  });
  drawLeaderboard(leaderboardSlot);
}

// ─── Keyboard ─────────────────────────────────────────────────────────────
function isTyping(target) {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

window.addEventListener('keydown', (e) => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
  if (e.key === 'm' || e.key === 'M') {
    setMetronome(!metronome.running);
    return;
  }
  if (e.code === 'Space' || e.key === ' ') {
    if (screen !== 'home' && screen !== 'results') return;
    // Space on a focused button would also click it; handle it once here instead.
    e.preventDefault();
    startCountdown();
  }
});

goHome();
