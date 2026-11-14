// Spoken cues through the browser's speechSynthesis. Never queues more than one phrase.
// If speech is unavailable it does nothing; the on-screen banner carries the message.

function getSynth() {
  const synth = globalThis.speechSynthesis;
  const Utterance = globalThis.SpeechSynthesisUtterance;
  return synth && typeof Utterance === 'function' ? { synth, Utterance } : null;
}

function pickEnglishVoice(synth) {
  let voices = [];
  try {
    voices = synth.getVoices() || [];
  } catch {
    return null;
  }
  const english = voices.filter((v) => /^en([-_]|$)/i.test(v.lang || ''));
  return (
    english.find((v) => v.localService && v.default) ||
    english.find((v) => v.localService) ||
    english[0] ||
    null
  );
}

export function createVoice({ rate = 1.05, volume = 1 } = {}) {
  let muted = false;

  return {
    get available() {
      return getSynth() !== null;
    },
    speak(text) {
      if (muted || !text) return;
      const s = getSynth();
      if (!s) return;
      try {
        // Cancel anything pending so phrases never stack up.
        s.synth.cancel();
        const u = new s.Utterance(text);
        const voice = pickEnglishVoice(s.synth);
        if (voice) u.voice = voice;
        u.lang = voice?.lang || 'en-US';
        u.rate = rate;
        u.volume = volume;
        s.synth.speak(u);
      } catch {
        // Speech failed; the banner still shows the cue.
      }
    },
    /** Stop anything speaking or queued. */
    cancel() {
      try {
        getSynth()?.synth.cancel();
      } catch {
        // ignore
      }
    },
    setMuted(on) {
      muted = Boolean(on);
      if (muted) {
        try {
          getSynth()?.synth.cancel();
        } catch {
          // ignore
        }
      }
    },
    get muted() {
      return muted;
    },
  };
}
