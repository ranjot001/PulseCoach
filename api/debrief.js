// POST /api/debrief: turns validated session stats into a short AI debrief.
// The API key is read only here, from the environment. It is never logged or returned.

import Anthropic from '@anthropic-ai/sdk';
import { validateAnyStats, buildPrompt, buildRelayPrompt } from '../src/debrief/schema.js';

const MAX_BODY_BYTES = 8192; // a relay drill with eight turns fits comfortably
const RATE_LIMIT = 20; // requests per minute, across all callers: enough for a demo
const WINDOW_MS = 60_000;

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

// Vercel gives req.body already parsed; the Vite dev server gives a raw stream.
async function readBody(req) {
  if (req.body !== undefined) {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(raw) > MAX_BODY_BYTES) return { tooLarge: true };
    return { value: typeof req.body === 'string' ? JSON.parse(raw) : req.body };
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) return { tooLarge: true };
    chunks.push(chunk);
  }
  return { value: JSON.parse(Buffer.concat(chunks).toString('utf8')) };
}

export function createHandler({ getClient, now = () => Date.now() } = {}) {
  let client;
  const clientFor = () => (client ??= getClient ? getClient() : new Anthropic({ timeout: 20_000, maxRetries: 1 }));
  const recent = [];

  return async function handler(req, res) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return send(res, 405, { error: 'Method not allowed' });
    }

    const t = now();
    while (recent.length && t - recent[0] > WINDOW_MS) recent.shift();
    if (recent.length >= RATE_LIMIT) return send(res, 429, { error: 'Too many requests' });
    recent.push(t);

    let stats;
    try {
      const body = await readBody(req);
      if (body.tooLarge) return send(res, 400, { error: 'Bad request' });
      stats = validateAnyStats(body.value);
    } catch {
      return send(res, 400, { error: 'Bad request' });
    }

    try {
      const { system, user } = stats.mode === 'relay' ? buildRelayPrompt(stats) : buildPrompt(stats);
      const response = await clientFor().beta.messages.create({
        model: 'claude-opus-5-5',
        max_tokens: 16000, // thinking shares this budget; plenty of room so the reply is never cut off
        output_config: { effort: 'low' },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default', // on a refusal, the API retries on a fallback model in the same call
        system,
        messages: [{ role: 'user', content: user }],
      });

      const text = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('')
        .trim();
      if (response.stop_reason !== 'end_turn' || !text) {
        return send(res, 502, { error: 'Debrief unavailable' });
      }
      return send(res, 200, { text });
    } catch {
      // Never pass upstream details (or anything about the key) to the browser.
      return send(res, 502, { error: 'Debrief unavailable' });
    }
  };
}

export default createHandler();
