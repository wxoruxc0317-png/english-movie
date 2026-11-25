export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export interface TextSegment {
  text: string;
  highlighted: boolean;
}

export function splitHighlightedSegments(
  text: string,
  expressions: string[]
): TextSegment[] {
  const cleanExprs = expressions
    .map((e) => e.trim())
    .filter((e) => e.length > 0)
    .sort((a, b) => b.length - a.length);

  if (!text || cleanExprs.length === 0) {
    return [{ text, highlighted: false }];
  }

  const escaped = cleanExprs.map((e) =>
    e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');

  const parts = text.split(regex);
  return parts
    .filter((part) => part.length > 0)
    .map((part) => ({
      text: part,
      highlighted: cleanExprs.some(
        (e) => e.toLowerCase() === part.toLowerCase()
      ),
    }));
}

export interface TimedSubtitleChunk {
  lines: string[];
  startSec: number;
  endSec: number;
}

function wrapIntoTwoLines(words: string[], maxCharsPerLine = 34): string[] {
  if (words.length === 0) return [];
  const full = words.join(' ');
  if (full.length <= maxCharsPerLine) {
    return [full];
  }

  // Try balanced 2-line split near midpoint
  const totalLen = full.length;
  let bestIdx = Math.ceil(words.length / 2);
  let bestDiff = Infinity;

  for (let i = 1; i < words.length; i++) {
    const l1 = words.slice(0, i).join(' ');
    const l2 = words.slice(i).join(' ');
    if (l1.length <= maxCharsPerLine + 4 && l2.length <= maxCharsPerLine + 4) {
      const diff = Math.abs(l1.length - l2.length);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }
  }

  return [
    words.slice(0, bestIdx).join(' '),
    words.slice(bestIdx).join(' '),
  ];
}

export function buildTimedSubtitles(
  text: string,
  beatStartSec: number,
  beatEndSec: number,
  audioDurationSec?: number
): TimedSubtitleChunk[] {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (!clean) return [];

  const words = clean.split(' ');
  const beatLength = Math.max(1, beatEndSec - beatStartSec);
  const leadIn = 0.25;
  const effectiveAudioDur = audioDurationSec
    ? Math.min(beatLength - 0.15, Math.max(1.5, audioDurationSec))
    : beatLength - 0.5;

  const speakStart = beatStartSec + leadIn;
  const speakEnd = Math.min(beatEndSec, speakStart + effectiveAudioDur);
  const speakWindow = Math.max(1, speakEnd - speakStart);

  // Group words into cards of max ~66 chars (fits cleanly in 2 lines of ~33 chars)
  const cards: string[][] = [];
  let current: string[] = [];
  let currentLen = 0;

  for (const word of words) {
    const nextLen = currentLen + (current.length > 0 ? 1 : 0) + word.length;
    if (nextLen > 64 && current.length >= 3) {
      cards.push(current);
      current = [word];
      currentLen = word.length;
    } else {
      current.push(word);
      currentLen = nextLen;
    }
  }
  if (current.length > 0) {
    cards.push(current);
  }

  const totalChars = cards.reduce(
    (sum, card) => sum + card.join(' ').length,
    0
  );

  const result: TimedSubtitleChunk[] = [];
  let cursor = speakStart;

  cards.forEach((cardWords, idx) => {
    const charWeight = cardWords.join(' ').length / Math.max(1, totalChars);
    const chunkDur = speakWindow * charWeight;
    const chunkEnd = idx === cards.length - 1 ? beatEndSec : cursor + chunkDur;

    result.push({
      lines: wrapIntoTwoLines(cardWords, 34).slice(0, 2),
      startSec: idx === 0 ? beatStartSec : cursor,
      endSec: chunkEnd,
    });
    cursor += chunkDur;
  });

  return result;
}

export function decodeWavEnvelope(base64: string, fps = 30): number[] {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    if (bytes.length <= 44) return [];

    const view = new DataView(bytes.buffer);
    const sampleRate = view.getUint32(24, true) || 24000;
    const pcmStart = 44;
    const totalSamples = Math.floor((bytes.length - pcmStart) / 2);
    const samplesPerFrame = Math.max(1, Math.floor(sampleRate / fps));
    const envelope: number[] = [];

    for (let offset = 0; offset < totalSamples; offset += samplesPerFrame) {
      let sumSq = 0;
      const count = Math.min(samplesPerFrame, totalSamples - offset);
      for (let j = 0; j < count; j++) {
        const sample = view.getInt16(pcmStart + (offset + j) * 2, true) / 32768;
        sumSq += sample * sample;
      }
      const rms = Math.sqrt(sumSq / Math.max(1, count));
      envelope.push(Math.min(1, rms * 4.2));
    }

    return envelope;
  } catch {
    return [];
  }
}
