import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Download,
  FileText,
  Info,
  Loader2,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import type {
  BeatId,
  ExpressionItem,
  SceneConfig,
  StoryboardData,
} from '../types';
import { renderStoryFrame } from '../utils/canvasRenderer';
import {
  estimateBeatSpeechDuration,
  isSpeechSynthesisSupported,
  speakBeatLines,
  stopSpeechPlayback,
} from '../utils/speechPlayer';

interface FinalScreenProps {
  storyboard: StoryboardData;
  scene: SceneConfig;
  expressions: ExpressionItem[];
  exportedVideoUrl: string | null;
  onExportedVideo: (url: string) => void;
  onBackToVideo: () => void;
  onStartNew: () => void;
}

const TOTAL_DURATION = 30;

export const FinalScreen: React.FC<FinalScreenProps> = ({
  storyboard,
  scene,
  expressions,
  exportedVideoUrl,
  onExportedVideo,
  onBackToVideo,
  onStartNew,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const padOscsRef = useRef<OscillatorNode[]>([]);
  const rafRef = useRef<number | null>(null);

  const lastSpokenBeatIdRef = useRef<BeatId | null>(null);
  const isSpeakingRef = useRef(false);
  const mouthPulseUntilRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speechFallbackActive, setSpeechFallbackActive] = useState(
    () => !isSpeechSynthesisSupported()
  );
  const [isRenderingDownload, setIsRenderingDownload] = useState(false);
  const [renderSec, setRenderSec] = useState(0);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const playStartTimestampRef = useRef(0);
  const playOffsetRef = useRef(0);

  const creditAuthor = scene.authorName.trim() || 'Yu taewoo';

  useEffect(() => {
    if (isSpeechSynthesisSupported()) {
      try {
        window.speechSynthesis.getVoices();
      } catch {
        setSpeechFallbackActive(true);
      }
    }
  }, []);

  const stopPad = useCallback(() => {
    padOscsRef.current.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // ignore
      }
    });
    padOscsRef.current = [];
  }, []);

  const drawAtTime = useCallback(
    (tSec: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const clampedT = Math.min(TOTAL_DURATION, Math.max(0, tSec));
      const activeBeat =
        storyboard.beats.find(
          (b) => clampedT >= b.startSec && clampedT < b.endSec
        ) || storyboard.beats[storyboard.beats.length - 1];

      const estDur = estimateBeatSpeechDuration(activeBeat);
      const inEstimatedSpeech =
        clampedT >= activeBeat.startSec + 0.25 &&
        clampedT <= activeBeat.startSec + 0.25 + estDur;

      let mouthOpenness = 0;
      if (isPlaying || isRenderingDownload) {
        if (performance.now() < mouthPulseUntilRef.current) {
          mouthOpenness = 0.55 + Math.abs(Math.sin(clampedT * 18)) * 0.45;
        } else if (isSpeakingRef.current || inEstimatedSpeech) {
          mouthOpenness = 0.25 + Math.abs(Math.sin(clampedT * 14)) * 0.45;
        }
      }

      renderStoryFrame({
        ctx,
        timeSec: clampedT,
        beat: activeBeat,
        bible: storyboard.characterBible,
        style: scene.style,
        audioDurationSec: estDur,
        mouthOpenness,
        authorName: creditAuthor,
      });
    },
    [creditAuthor, isPlaying, isRenderingDownload, scene.style, storyboard]
  );

  useEffect(() => {
    if (!isPlaying && !isRenderingDownload) {
      drawAtTime(currentTime);
    }
  }, [currentTime, drawAtTime, isPlaying, isRenderingDownload]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      stopSpeechPlayback();
      stopPad();
    };
  }, [stopPad]);

  const triggerBeatVoice = useCallback(
    (beatIdx: number, tSec: number) => {
      const beat = storyboard.beats[beatIdx];
      if (!beat) return;
      lastSpokenBeatIdRef.current = beat.id;

      if (speechFallbackActive) {
        isSpeakingRef.current = false;
        return;
      }

      const elapsedInBeat = Math.max(0, tSec - beat.startSec);
      const slotDur = Math.max(1, beat.endSec - beat.startSec);
      let textToSpeak = beat.englishLines.trim();

      if (elapsedInBeat > 0.8) {
        const words = textToSpeak.split(/\s+/);
        const startIdx = Math.min(
          words.length - 1,
          Math.floor((elapsedInBeat / slotDur) * words.length)
        );
        textToSpeak = words.slice(startIdx).join(' ');
      }

      const remainingSlot = Math.max(1.5, beat.endSec - tSec);
      const ok = speakBeatLines(textToSpeak, scene.voice, remainingSlot, {
        onStart: () => {
          isSpeakingRef.current = true;
          mouthPulseUntilRef.current = performance.now() + 260;
        },
        onWordBoundary: () => {
          isSpeakingRef.current = true;
          mouthPulseUntilRef.current = performance.now() + 280;
        },
        onEnd: () => {
          isSpeakingRef.current = false;
        },
        onFallback: () => {
          isSpeakingRef.current = false;
          setSpeechFallbackActive(true);
        },
      });

      if (!ok) {
        isSpeakingRef.current = false;
        setSpeechFallbackActive(true);
      }
    },
    [scene.voice, speechFallbackActive, storyboard.beats]
  );

  const handleTogglePlay = () => {
    if (isRenderingDownload) return;
    if (isPlaying) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      stopSpeechPlayback();
      isSpeakingRef.current = false;
      lastSpokenBeatIdRef.current = null;
      setIsPlaying(false);
      return;
    }

    const startFrom = currentTime >= TOTAL_DURATION - 0.2 ? 0 : currentTime;
    stopSpeechPlayback();
    lastSpokenBeatIdRef.current = null;
    playOffsetRef.current = startFrom;
    playStartTimestampRef.current = performance.now();
    setIsPlaying(true);

    const initialIdx = storyboard.beats.findIndex(
      (b) => startFrom >= b.startSec && startFrom < b.endSec
    );
    if (initialIdx >= 0) {
      triggerBeatVoice(initialIdx, startFrom);
    }

    const tick = (nowMs: number) => {
      const t = playOffsetRef.current + (nowMs - playStartTimestampRef.current) / 1000;
      if (t >= TOTAL_DURATION) {
        setCurrentTime(TOTAL_DURATION);
        drawAtTime(TOTAL_DURATION);
        stopSpeechPlayback();
        isSpeakingRef.current = false;
        lastSpokenBeatIdRef.current = null;
        setIsPlaying(false);
        return;
      }

      const beatIdx = storyboard.beats.findIndex(
        (b) => t >= b.startSec && t < b.endSec
      );
      if (beatIdx >= 0 && storyboard.beats[beatIdx].id !== lastSpokenBeatIdRef.current) {
        triggerBeatVoice(beatIdx, t);
      }

      setCurrentTime(t);
      drawAtTime(t);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const triggerBlobDownload = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadVideo = async () => {
    setDownloadError(null);
    if (exportedVideoUrl) {
      triggerBlobDownload(exportedVideoUrl, 'scenelines-30s-film.webm');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas || isRenderingDownload) return;

    if (isPlaying) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      stopSpeechPlayback();
      setIsPlaying(false);
    }

    try {
      const ctx =
        audioCtxRef.current ||
        new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') await ctx.resume();

      const dest = ctx.createMediaStreamDestination();
      const canvasStream = canvas.captureStream(30);
      const combined = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : '';

      if (!mimeType) {
        setDownloadError('Video recording is not supported in this browser.');
        return;
      }

      const recorder = new MediaRecorder(combined, {
        mimeType,
        videoBitsPerSecond: 3_500_000,
      });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const donePromise = new Promise<string>((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          resolve(URL.createObjectURL(blob));
        };
      });

      // Gentle ambient chord track for exported WebM
      stopPad();
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.02, now + 0.8);
      gain.gain.setValueAtTime(0.02, now + TOTAL_DURATION - 1.0);
      gain.gain.linearRampToValueAtTime(0.0001, now + TOTAL_DURATION);
      gain.connect(dest);
      [261.63, 329.63, 392.0].forEach((freq) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + TOTAL_DURATION);
        padOscsRef.current.push(osc);
      });

      setIsRenderingDownload(true);
      setRenderSec(0);
      drawAtTime(0);
      recorder.start(250);
      const startMs = performance.now();

      const tickExport = (nowMs: number) => {
        const t = (nowMs - startMs) / 1000;
        if (t >= TOTAL_DURATION) {
          drawAtTime(TOTAL_DURATION);
          setRenderSec(TOTAL_DURATION);
          stopPad();
          recorder.stop();
          return;
        }
        drawAtTime(t);
        setRenderSec(t);
        rafRef.current = requestAnimationFrame(tickExport);
      };
      rafRef.current = requestAnimationFrame(tickExport);

      const url = await donePromise;
      setIsRenderingDownload(false);
      onExportedVideo(url);
      triggerBlobDownload(url, 'scenelines-30s-film.webm');
    } catch (err: unknown) {
      setIsRenderingDownload(false);
      stopPad();
      setDownloadError(
        err instanceof Error ? err.message : 'Unable to export video.'
      );
    }
  };

  const handleDownloadScript = () => {
    const lines: string[] = [
      'SceneLines — 30-Second English Short Film',
      `Credit: Made with Google AI Studio · Script by ${creditAuthor}`,
      '',
      '--- Movie Expressions ---',
      ...expressions
        .filter((e) => e.expression.trim())
        .map(
          (e, i) =>
            `${i + 1}. ${e.expression} (${e.meaningKo || '—'}) — ${e.movie}`
        ),
      '',
      '--- 4-Beat Storyboard ---',
      ...storyboard.beats.flatMap((b) => [
        `[${b.label} · ${b.timeRange}]`,
        `Scene: ${b.sceneDescription}`,
        `Lines: ${b.englishLines}`,
        '',
      ]),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    triggerBlobDownload(url, 'scenelines-study-script.txt');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1E242B]">
          Your 30-Second Film Is Ready
        </h1>
        <p className="text-base sm:text-lg text-[#525D68] max-w-2xl leading-relaxed">
          Watch your completed clip with English voice and burned-in subtitles, or download it to keep studying anytime.
        </p>
      </div>

      {speechFallbackActive && (
        <div
          role="status"
          className="p-4 rounded-2xl bg-[#F2F5F8] border border-[#D4DDE6] flex items-center gap-3 text-[#2F4358]"
        >
          <Info className="w-5 h-5 shrink-0 text-[#3D5A80]" />
          <p className="text-sm sm:text-base">
            Browser speech synthesis is unavailable here — playing visual clip with word-for-word English subtitles.
          </p>
        </div>
      )}

      {downloadError && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#F5C2C2] text-[#8A1C1C]"
        >
          {downloadError}
        </div>
      )}

      {/* Theater Card */}
      <div className="bg-white border border-[#E2E2DC] rounded-2xl p-4 sm:p-6 space-y-5">
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#1E242B]">
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            className="w-full h-full block"
          />

          {isRenderingDownload && (
            <div className="absolute inset-0 bg-[#1E242B]/60 backdrop-blur-xs flex flex-col items-center justify-center text-white p-6 text-center space-y-3">
              <Loader2 className="w-9 h-9 animate-spin" />
              <div className="font-display text-xl font-bold">
                Preparing Downloadable Video...
              </div>
              <div className="font-mono-num text-base">
                {Math.min(30, Math.floor(renderSec))}s / 30s
              </div>
            </div>
          )}
        </div>

        {/* Timeline progress indicator */}
        <div className="flex items-center gap-3">
          <span className="font-mono-num text-sm text-[#525D68] w-12">
            {currentTime.toFixed(1)}s
          </span>
          <input
            type="range"
            aria-label="Playback position"
            min={0}
            max={TOTAL_DURATION}
            step={0.1}
            value={currentTime}
            disabled={isRenderingDownload}
            onChange={(e) => {
              const val = Number(e.target.value);
              setCurrentTime(val);
              if (isPlaying) {
                if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
                stopSpeechPlayback();
                setIsPlaying(false);
              }
              drawAtTime(val);
            }}
            className="flex-1 accent-[#3D5A80] h-2 cursor-pointer"
          />
          <span className="font-mono-num text-sm text-[#525D68] w-12 text-right">
            30.0s
          </span>
        </div>

        {/* Big Action Buttons */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={isRenderingDownload}
              onClick={handleTogglePlay}
              className="min-h-[52px] px-7 py-3 text-base font-semibold text-white bg-[#3D5A80] rounded-2xl hover:bg-[#314968] disabled:bg-[#B4BEC8] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-5 h-5" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  {currentTime > 0 && currentTime < 29.8 ? 'Resume Film' : 'Play Film'}
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isRenderingDownload}
              onClick={handleDownloadVideo}
              className="min-h-[52px] px-7 py-3 text-base font-semibold text-white bg-[#3A7D6B] rounded-2xl hover:bg-[#2F6758] disabled:bg-[#B4BEC8] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              {isRenderingDownload ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Rendering ({Math.floor(renderSec)}s)...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Download Video (.webm)
                </>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadScript}
            className="min-h-[50px] px-5 py-3 text-base font-medium text-[#1E242B] bg-[#F7F7F5] border border-[#DCDCD6] rounded-2xl hover:bg-[#EFEFEA] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileText className="w-5 h-5 text-[#3D5A80]" />
            Download Study Script
          </button>
        </div>

        {/* Required Credit */}
        <div className="pt-4 border-t border-[#EFEFEA] text-center">
          <p className="font-display text-base sm:text-lg font-semibold text-[#1E242B]">
            Made with Google AI Studio · Script by {creditAuthor}
          </p>
        </div>
      </div>

      {/* Expression Review Cards for Studying */}
      <div className="bg-white border border-[#E2E2DC] rounded-2xl p-5 sm:p-6 space-y-4">
        <h2 className="font-display text-xl font-bold text-[#1E242B]">
          Expressions Featured in This Film
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {expressions
            .filter((e) => e.expression.trim().length > 0)
            .map((e) => (
              <div
                key={e.id}
                className="p-4 rounded-xl bg-[#F7F7F5] border border-[#E6E6E0] space-y-1"
              >
                <div className="font-semibold text-base text-[#1E242B]">
                  {e.expression}
                </div>
                <div className="text-sm text-[#525D68]">
                  {e.meaningKo || 'Everyday English expression'} · {e.movie}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={() => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
            stopSpeechPlayback();
            onBackToVideo();
          }}
          className="min-h-[52px] px-6 py-3 text-base font-semibold text-[#525D68] bg-white border border-[#CFD4DC] rounded-2xl hover:bg-[#EFEFEA] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Clip Studio
        </button>

        <button
          type="button"
          onClick={() => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
            stopSpeechPlayback();
            onStartNew();
          }}
          className="min-h-[52px] px-6 py-3 text-base font-semibold text-[#3D5A80] bg-white border border-[#3D5A80] rounded-2xl hover:bg-[#EEF3F8] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          Create Another Story
        </button>
      </div>
    </section>
  );
};
