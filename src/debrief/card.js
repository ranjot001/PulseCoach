// Contract 3: the debrief card.
// renderDebriefCard(container, stats) shows rule-based quick tips at once.
// It never throws and never leaves the container empty.

import './card.css';
import { validateStats } from './schema.js';
import { fallbackDebrief } from './fallback.js';

const NEUTRAL_TEXT = 'Finish a practice session and your coaching tips will appear here.';

function debriefText(stats) {
  try {
    return fallbackDebrief(validateStats(stats));
  } catch {
    return NEUTRAL_TEXT;
  }
}

// Speaks the text, and does nothing if speech is unavailable.
function readAloud(text) {
  try {
    const synth = globalThis.speechSynthesis;
    const Utterance = globalThis.SpeechSynthesisUtterance;
    if (!synth || typeof Utterance !== 'function') return;
    synth.cancel();
    synth.speak(new Utterance(text));
  } catch {
    // Speech is a nice-to-have; never let it break the card.
  }
}

export function renderDebriefCard(container, stats) {
  if (!container) return;
  try {
    const doc = container.ownerDocument;

    const card = doc.createElement('section');
    card.className = 'debrief-card';

    const header = doc.createElement('div');
    header.className = 'debrief-card__header';

    const title = doc.createElement('h2');
    title.className = 'debrief-card__title';
    title.textContent = "Coach's debrief";

    const label = doc.createElement('span');
    label.className = 'debrief-card__label';
    label.textContent = 'Quick tips';

    const text = doc.createElement('p');
    text.className = 'debrief-card__text';
    text.textContent = debriefText(stats);

    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'debrief-card__speak';
    button.textContent = 'Read aloud';
    button.addEventListener('click', () => readAloud(text.textContent));

    header.append(title, label);
    card.append(header, text, button);
    container.replaceChildren(card);
  } catch {
    // Last resort: the card never throws and never leaves the container empty.
    try {
      container.textContent = NEUTRAL_TEXT;
    } catch {
      // Nothing more can be done safely.
    }
  }
}
