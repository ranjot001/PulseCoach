// getDebrief(stats): asks /api/debrief for AI coaching text, with a timeout.
// Only the stats object leaves the browser. Never throws.

import { config } from '../config.js';
import { fallbackAnyDebrief, NEUTRAL_TEXT } from './fallback.js';

const MAX_TEXT_CHARS = 1200; // a relay debrief runs to about 110 words

function fallback(stats) {
  try {
    return { text: fallbackAnyDebrief(stats), source: 'fallback' };
  } catch {
    return { text: NEUTRAL_TEXT, source: 'fallback' };
  }
}

export async function getDebrief(stats, { timeoutMs = config.DEBRIEF_TIMEOUT_MS, fetchImpl = globalThis.fetch } = {}) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  let timer;
  try {
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        controller?.abort();
        reject(new Error('timeout'));
      }, timeoutMs);
    });
    const request = (async () => {
      const res = await fetchImpl('/api/debrief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stats),
        signal: controller?.signal,
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (typeof data?.text !== 'string' || !data.text.trim() || data.text.length > MAX_TEXT_CHARS) {
        throw new Error('bad reply');
      }
      return { text: data.text.trim(), source: 'ai' };
    })();
    return await Promise.race([request, timeout]);
  } catch {
    return fallback(stats);
  } finally {
    clearTimeout(timer);
  }
}
