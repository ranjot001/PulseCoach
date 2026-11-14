// Practice screen: engine stage on the left, readouts on the right.
import './styles.css';
import { createEngine } from './engine.js';
import { config } from './config.js';
import { PRODUCT_NAME, FOOTER_LINE, PRACTICE } from './copy.js';
import { createHud } from './ui/hud.js';
import { createMetronome } from './audio/metronome.js';
import { createVoice } from './audio/voice.js';
import { createCoach } from './lib/feedback.js';

document.getElementById('title').textContent = PRODUCT_NAME;
document.getElementById('footer').textContent = FOOTER_LINE;

const hud = createHud(document.getElementById('hud'));

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

function toggleMetronome() {
  if (metronome.running) metronome.stop();
  else metronome.start();
  renderToggle();
}

// Browsers block audio until the user interacts: unlock on the first click or key press.
function unlockAudio() {
  metronome.unlock();
}
window.addEventListener('pointerdown', unlockAudio, { capture: true });
window.addEventListener('keydown', unlockAudio, { capture: true });

toggle.addEventListener('click', toggleMetronome);
window.addEventListener('keydown', (e) => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'm' || e.key === 'M') toggleMetronome();
});
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
const engine = createEngine({
  stage: document.getElementById('stage'),
  onState(state) {
    hud.update(state);
    coach.next(state, clock());
  },
  onCompression(event) {
    hud.compression(event);
  },
  onError(err) {
    hud.setError(`${PRACTICE.errorPrefix}: ${err.message}`);
  },
});

engine.start();
