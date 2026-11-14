import { describe, it, expect, afterEach } from 'vitest';
import { createVoice } from '../src/audio/voice.js';

afterEach(() => {
  delete globalThis.speechSynthesis;
  delete globalThis.SpeechSynthesisUtterance;
});

function installFakeSpeech(voices = []) {
  const calls = [];
  globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  globalThis.speechSynthesis = {
    cancel: () => calls.push('cancel'),
    speak: (u) => calls.push(u),
    getVoices: () => voices,
  };
  return calls;
}

describe('createVoice', () => {
  it('does nothing when speech is unavailable', () => {
    const v = createVoice();
    expect(v.available).toBe(false);
    expect(() => v.speak('Lock your elbows')).not.toThrow();
  });

  it('cancels anything pending before speaking, so phrases never stack', () => {
    const calls = installFakeSpeech();
    const v = createVoice();
    v.speak('one');
    v.speak('two');
    expect(calls.map((c) => (typeof c === 'string' ? c : c.text))).toEqual(['cancel', 'one', 'cancel', 'two']);
  });

  it('prefers an English voice', () => {
    const fr = { lang: 'fr-FR', localService: true, default: true };
    const en = { lang: 'en-GB', localService: true, default: false };
    const calls = installFakeSpeech([fr, en]);
    createVoice().speak('hi');
    expect(calls[1].voice).toBe(en);
  });

  it('stays silent when muted', () => {
    const calls = installFakeSpeech();
    const v = createVoice();
    v.setMuted(true);
    v.speak('hi');
    expect(calls.filter((c) => typeof c !== 'string')).toEqual([]);
  });
});
