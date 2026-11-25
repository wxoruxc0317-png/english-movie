import type { StoryBeat, VoiceName } from '../types';
import { countWords } from './textHelpers';

export function isSpeechSynthesisSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined'
  );
}

export function getEnglishVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSynthesisSupported()) return [];
  try {
    return window.speechSynthesis
      .getVoices()
      .filter((v) => v.lang.toLowerCase().startsWith('en'));
  } catch {
    return [];
  }
}

export function pickVoiceForPreset(
  preset: VoiceName
): { voice: SpeechSynthesisVoice | null; pitch: number; rate: number } {
  const enVoices = getEnglishVoices();
  const defaults: Record<VoiceName, { pitch: number; rate: number; hints: string[] }> = {
    Kore: {
      pitch: 1.06,
      rate: 0.96,
      hints: ['samantha', 'aria', 'jenny', 'natural', 'google us english', 'female'],
    },
    Zephyr: {
      pitch: 1.1,
      rate: 1.0,
      hints: ['libby', 'sonia', 'karen', 'ava', 'google uk english female'],
    },
    Puck: {
      pitch: 1.02,
      rate: 1.03,
      hints: ['guy', 'alex', 'daniel', 'ryan', 'google uk english male'],
    },
    Charon: {
      pitch: 0.94,
      rate: 0.94,
      hints: ['daniel', 'andrew', 'christopher', 'david', 'google us english'],
    },
    Fenrir: {
      pitch: 0.96,
      rate: 0.98,
      hints: ['mark', 'eric', 'thomas', 'george', 'male'],
    },
  };

  const config = defaults[preset] || defaults.Kore;
  if (enVoices.length === 0) {
    return { voice: null, pitch: config.pitch, rate: config.rate };
  }

  for (const hint of config.hints) {
    const matched = enVoices.find((v) =>
      v.name.toLowerCase().includes(hint)
    );
    if (matched) {
      return { voice: matched, pitch: config.pitch, rate: config.rate };
    }
  }

  const usVoice =
    enVoices.find((v) => v.lang.toLowerCase() === 'en-us') || enVoices[0];
  return { voice: usVoice, pitch: config.pitch, rate: config.rate };
}

export function estimateBeatSpeechDuration(beat: StoryBeat): number {
  const words = countWords(beat.englishLines);
  const slotLen = Math.max(1, beat.endSec - beat.startSec);
  // Natural speaking speed ~2.45 words/sec, bounded to fit cleanly inside the beat slot
  return Math.min(slotLen - 0.35, Math.max(2.2, words / 2.45));
}

export function stopSpeechPlayback(): void {
  if (!isSpeechSynthesisSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Safe no-op fallback
  }
}

export interface SpeakBeatCallbacks {
  onStart?: () => void;
  onWordBoundary?: (charIndex: number) => void;
  onEnd?: () => void;
  onFallback?: () => void;
}

export function speakBeatLines(
  text: string,
  preset: VoiceName,
  slotDurationSec: number,
  callbacks?: SpeakBeatCallbacks
): boolean {
  const cleanText = text.trim();
  if (!cleanText || !isSpeechSynthesisSupported()) {
    callbacks?.onFallback?.();
    return false;
  }

  try {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const { voice, pitch, rate } = pickVoiceForPreset(preset);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = 'en-US';
    }

    // Gently pace longer lines so each beat finishes cleanly inside its 7s-8s window
    const words = countWords(cleanText);
    const estAtBase = words / (2.5 * rate);
    const maxWindow = Math.max(3.5, slotDurationSec - 0.6);
    const adjustedRate =
      estAtBase > maxWindow
        ? Math.min(1.18, rate * (estAtBase / maxWindow))
        : rate;

    utterance.pitch = pitch;
    utterance.rate = adjustedRate;
    utterance.volume = 1;

    utterance.onstart = () => {
      callbacks?.onStart?.();
    };
    utterance.onboundary = (event) => {
      if (typeof event.charIndex === 'number') {
        callbacks?.onWordBoundary?.(event.charIndex);
      }
    };
    utterance.onend = () => {
      callbacks?.onEnd?.();
    };
    utterance.onerror = () => {
      callbacks?.onFallback?.();
    };

    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    callbacks?.onFallback?.();
    return false;
  }
}
