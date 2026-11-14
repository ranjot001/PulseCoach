// Contract 3: the debrief card.
// renderDebriefCard(container, stats) shows rule-based quick tips at once, then
// swaps in the AI text if it arrives. It never throws and never leaves the
// container empty.

import './card.css';
import { validateAnyStats } from './schema.js';
import { fallbackAnyDebrief, NEUTRAL_TEXT } from './fallback.js';
import { getDebrief } from './client.js';

function cleanStats(stats) {
  try {
    return validateAnyStats(stats);
  } catch {
    return null;
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
    const isRelay = stats !== null && typeof stats === 'object' && stats.mode === 'relay';
    title.textContent = isRelay ? 'Team debrief' : "Coach's debrief";

    const label = doc.createElement('span');
    label.className = 'debrief-card__label';
    label.textContent = 'Quick tips';

    const text = doc.createElement('p');
    text.className = 'debrief-card__text';
    const clean = cleanStats(stats);
    text.textContent = clean ? fallbackAnyDebrief(clean) : NEUTRAL_TEXT;

    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'debrief-card__speak';
    button.textContent = 'Read aloud';
    button.addEventListener('click', () => readAloud(text.textContent));

    header.append(title, label);
    card.append(header, text, button);
    container.replaceChildren(card);

    if (clean) {
      getDebrief(clean)
        .then((result) => {
          // Skip if a newer card has replaced this one in the meantime.
          if (result?.source !== 'ai' || !card.isConnected) return;
          text.textContent = result.text;
          label.textContent = 'AI coach';
          label.classList.add('debrief-card__label--ai');
          text.classList.remove('debrief-card__text--fresh');
          void text.offsetWidth; // restart the fade if it ran before
          text.classList.add('debrief-card__text--fresh');
        })
        .catch(() => {
          // getDebrief never rejects; this is belt and braces.
        });
    }
  } catch {
    // Last resort: the card never throws and never leaves the container empty.
    try {
      container.textContent = NEUTRAL_TEXT;
    } catch {
      // Nothing more can be done safely.
    }
  }
}
