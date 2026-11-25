import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Info,
  Loader2,
  Music,
  Pause,
  Play,
  RotateCcw,
  Video,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { BeatId, SceneConfig, StoryboardData } from '../types';
import { renderStoryFrame } from '../utils/canvasRenderer';
import {
  estimateBeatSpeechDuration,
  isSpeechSynthesisSupported,
  speakBeatLines,
  stopSpeechPlayback,
} from '../utils/speechPlayer';

interface VideoScreenProps {
  storyboard: StoryboardData;
  scene: SceneConfig;
  exportedVideoUrl: string | null;
  onExportedVideo: (url: string) => void;
  onBack: () => void;
  onNextFinal: () => void;
}

const TOTAL_DURATION = 30;

export const VideoScreen: React.FC<VideoScreenProps> = ({
  storyboard,
  scene,
  exportedVideoUrl,
  onExportedVideo,
  onBack,
  onNextFinal,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const padGainRef = useRef<GainNode | null>(null);
  const padOscsRef = useRef<OscillatorNode[]>([]);
  const rafRef = useRef<number | null>(null);

  const lastSpokenBeatIdRef = useRef<BeatId | null>(null);
  const isSpeakingRef = useRef(false);
  const mouthPulseUntilRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [voiceOn, setVoiceOn] = useState(true);
  const [ambientPadOn, setAmbientPadOn] = useState(true);
  const [speechFallbackActive, setSpeechFallbackActive] = useState(
    () => !isSpeechSynthesisSupported()
  );
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [recordError, setRecordError] = useState<string | null>(null);

  const playStartTimestampRef = useRef<number>(0);
  const playOffsetRef = useRef<number>(0);

  // Trigger browser voice loading if supported
  useEffect(() => {
    if (isSpeechSynthesisSupported()) {
      try {
        window.speechSynthesis.getVoices();
      } catch {
        setSpeechFallbackActive(true);
      }
    }
  }, []);

  const stopAmbientPad = useCallback(() => {
    padOscsRef.current.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // ignore
      }
    });
    padOscsRef.current = [];
    if (padGainRef.current) {
      try {
        padGainRef.current.disconnect();
      } catch {
        // ignore
      }
      padGainRef.current = null;
    }
  }, []);

  const startAmbientPad = useCallback(
    async (remainingSec: number, dest?: MediaStreamAudioDestinationNode) => {
      stopAmbientPad();
      if (!ambientPadOn) return;
      try {
        const ctx =
          audioCtxRef.current ||
          new (window.AudioContext || (window as any).webkitAudioContext)();
        audioCtxRef.current = ctx;
        if (ctx.state === 'suspended') await ctx.resume();

        const targetNode: AudioNode = dest || ctx.destination;
        const now = ctx.currentTime;
        const dur = Math.max(0.5, remainingSec);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.022, now + 0.8);
        gain.gain.setValueAtTime(0.022, now + Math.max(0.5, dur - 1.0));
        gain.gain.linearRampToValueAtTime(0.0001, now + dur);
        gain.connect(targetNode);
        padGainRef.current = gain;

        [261.63, 329.63, 392.0].forEach((freq) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);
          osc.connect(gain);
          osc.start(now);
          osc.stop(now + dur);
          padOscsRef.current.push(osc);
        });
      } catch {
        // Safe fallback if Web Audio is blocked
      }
    },
    [ambientPadOn, stopAmbientPad]
  );

  const triggerBeatVoice = useCallback(
    (beatIdx: number, tSec: number) => {
      const beat = storyboard.beats[beatIdx];
      if (!beat) return;
      lastSpokenBeatIdRef.current = beat.id;

      if (!voiceOn || speechFallbackActive) {
        isSpeakingRef.current = false;
        return;
      }

      const elapsedInBeat = Math.max(0, tSec - beat.startSec);
      const slotDur = Math.max(1, beat.endSec - beat.startSec);
      let textToSpeak = beat.englishLines.trim();

      // If starting mid-beat, speak remaining words proportionally
      if (elapsedInBeat > 0.8) {
        const words = textToSpeak.split(/\s+/);
        const startWordIdx = Math.min(
          words.length - 1,
          Math.floor((elapsedInBeat / slotDur) * words.length)
        );
        textToSpeak = words.slice(startWordIdx).join(' ');
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
    [scene.voice, speechFallbackActive, storyboard.beats, voiceOn]
  );

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
      const beatSpeakEnd = activeBeat.startSec + 0.25 + estDur;
      const inEstimatedSpeech =
        clampedT >= activeBeat.startSec + 0.25 && clampedT <= beatSpeakEnd;

      let mouthOpenness = 0;
      if (isPlaying || isRecording) {
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
        authorName: scene.authorName,
      });
    },
    [isPlaying, isRecording, scene.authorName, scene.style, storyboard]
  );

  useEffect(() => {
    if (!isPlaying && !isRecording) {
      drawAtTime(currentTime);
    }
  }, [currentTime, drawAtTime, isPlaying, isRecording]);

  const handlePause = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    stopSpeechPlayback();
    stopAmbientPad();
    isSpeakingRef.current = false;
    lastSpokenBeatIdRef.current = null;
    setIsPlaying(false);
  }, [stopAmbientPad]);

  const handlePlay = useCallback(
    async (fromSec?: number) => {
      if (isRecording) return;
      const startFrom =
        typeof fromSec === 'number'
          ? fromSec
          : currentTime >= TOTAL_DURATION - 0.2
          ? 0
          : currentTime;

      stopSpeechPlayback();
      lastSpokenBeatIdRef.current = null;
      playOffsetRef.current = startFrom;
      await startAmbientPad(TOTAL_DURATION - startFrom);
      playStartTimestampRef.current = performance.now();
      setIsPlaying(true);

      // Speak initial beat immediately inside user gesture
      const initialBeatIdx = storyboard.beats.findIndex(
        (b) => startFrom >= b.startSec && startFrom < b.endSec
      );
      if (initialBeatIdx >= 0) {
        triggerBeatVoice(initialBeatIdx, startFrom);
      }

      const tick = (nowMs: number) => {
        const elapsed = (nowMs - playStartTimestampRef.current) / 1000;
        const t = playOffsetRef.current + elapsed;

        if (t >= TOTAL_DURATION) {
          setCurrentTime(TOTAL_DURATION);
          drawAtTime(TOTAL_DURATION);
          stopSpeechPlayback();
          stopAmbientPad();
          isSpeakingRef.current = false;
          lastSpokenBeatIdRef.current = null;
          setIsPlaying(false);
          rafRef.current = null;
          return;
        }

        const beatIdx = storyboard.beats.findIndex(
          (b) => t >= b.startSec && t < b.endSec
        );
        if (beatIdx >= 0) {
          const beat = storyboard.beats[beatIdx];
          if (beat.id !== lastSpokenBeatIdRef.current) {
            triggerBeatVoice(beatIdx, t);
          }
        }

        setCurrentTime(t);
        drawAtTime(t);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [
      currentTime,
      drawAtTime,
      isRecording,
      startAmbientPad,
      stopAmbientPad,
      storyboard.beats,
      triggerBeatVoice,
    ]
  );

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      stopSpeechPlayback();
      stopAmbientPad();
    };
  }, [stopAmbientPad]);

  const handleSeek = (tSec: number) => {
    if (isRecording) return;
    const clamped = Math.min(TOTAL_DURATION, Math.max(0, tSec));
    setCurrentTime(clamped);
    if (isPlaying) {
      void handlePlay(clamped);
    } else {
      drawAtTime(clamped);
    }
  };

  const handleExportVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isRecording) return;
    setRecordError(null);
    handlePause();

    try {
      const ctx =
        audioCtxRef.current ||
        new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') await ctx.resume();

      const dest = ctx.createMediaStreamDestination();
      const canvasStream = canvas.captureStream(30);
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : '';

      if (!mimeType) {
        setRecordError('Video recording is not supported in this browser.');
        return;
      }

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 3_500_000,
      });

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const recordingFinished = new Promise<string>((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          resolve(URL.createObjectURL(blob));
        };
      });

      setIsRecording(true);
      setRecordProgress(0);
      setCurrentTime(0);
      drawAtTime(0);

      recorder.start(250);
      await startAmbientPad(TOTAL_DURATION, dest);
      const startMs = performance.now();

      const animateExport = (nowMs: number) => {
        const t = (nowMs - startMs) / 1000;
        if (t >= TOTAL_DURATION) {
          drawAtTime(TOTAL_DURATION);
          setCurrentTime(TOTAL_DURATION);
          setRecordProgress(TOTAL_DURATION);
          stopAmbientPad();
          recorder.stop();
          return;
        }
        drawAtTime(t);
        setCurrentTime(t);
        setRecordProgress(t);
        rafRef.current = requestAnimationFrame(animateExport);
      };
      rafRef.current = requestAnimationFrame(animateExport);

      const url = await recordingFinished;
      onExportedVideo(url);
      setIsRecording(false);
      onNextFinal();
    } catch (err: unknown) {
      setIsRecording(false);
      stopAmbientPad();
      setRecordError(
        err instanceof Error ? err.message : 'Failed to render video.'
      );
    }
  };

  const activeBeat =
    storyboard.beats.find(
      (b) => currentTime >= b.startSec && currentTime < b.endSec
    ) || storyboard.beats[storyboard.beats.length - 1];

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1E242B]">
            30-Second Animated Clip Studio
          </h1>
          <p className="text-base sm:text-lg text-[#525D68] max-w-2xl leading-relaxed">
            All 4 beats play in order with English voice and burned-in word-for-word subtitles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const next = !voiceOn;
              setVoiceOn(next);
              if (!next) stopSpeechPlayback();
            }}
            className={`min-h-[44px] px-4 py-2 text-sm font-medium rounded-xl border transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              voiceOn && !speechFallbackActive
                ? 'bg-white border-[#3D5A80] text-[#3D5A80]'
                : 'bg-[#EFEFEA] border-[#DCDCD6] text-[#525D68]'
            }`}
          >
            {voiceOn ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
            English Voice: {voiceOn ? 'On' : 'Muted'}
          </button>

          <button
            type="button"
            onClick={() => setAmbientPadOn((v) => !v)}
            className={`min-h-[44px] px-4 py-2 text-sm font-medium rounded-xl border transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              ambientPadOn
                ? 'bg-white border-[#3D5A80] text-[#3D5A80]'
                : 'bg-[#EFEFEA] border-[#DCDCD6] text-[#525D68]'
            }`}
          >
            <Music className="w-4 h-4" />
            Soft Tone: {ambientPadOn ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      {speechFallbackActive && (
        <div
          role="status"
          className="p-4 rounded-2xl bg-[#F2F5F8] border border-[#D4DDE6] flex items-center gap-3 text-[#2F4358]"
        >
          <Info className="w-5 h-5 shrink-0 text-[#3D5A80]" />
          <p className="text-sm sm:text-base">
            Browser speech synthesis is unavailable here — playing your 30-second animated clip with word-for-word English subtitles.
          </p>
        </div>
      )}

      {recordError && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#F5C2C2] text-[#8A1C1C]"
        >
          {recordError}
        </div>
      )}

      {/* Video Canvas Viewport */}
      <div className="bg-white border border-[#E2E2DC] rounded-2xl p-4 sm:p-6 space-y-5">
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#1E242B]">
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            className="w-full h-full block"
          />

          {isRecording && (
            <div className="absolute inset-0 bg-[#1E242B]/55 backdrop-blur-xs flex flex-col items-center justify-center text-white p-6 text-center space-y-3">
              <Loader2 className="w-9 h-9 animate-spin" />
              <div className="font-display text-xl font-bold">
                Rendering 30-Second Video...
              </div>
              <div className="font-mono-num text-base">
                {Math.min(30, Math.floor(recordProgress))}s / 30s
              </div>
            </div>
          )}
        </div>

        {/* Beat timeline selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {storyboard.beats.map((beat, idx) => {
            const isCurrent = activeBeat.id === beat.id;
            return (
              <button
                key={beat.id}
                type="button"
                disabled={isRecording}
                onClick={() => handleSeek(beat.startSec)}
                className={`p-3 rounded-xl border text-left transition-colors min-h-[54px] cursor-pointer ${
                  isCurrent
                    ? 'border-[#3D5A80] bg-[#EEF3F8]'
                    : 'border-[#E2E2DC] bg-[#F7F7F5] hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-sm text-[#1E242B]">
                    {idx + 1}. {beat.label}
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-[#3A7D6B] shrink-0" />
                </div>
                <div className="font-mono-num text-xs text-[#525D68]">
                  {beat.timeRange}
                </div>
              </button>
            );
          })}
        </div>

        {/* Scrubber + Big Transport Controls */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="font-mono-num text-sm text-[#525D68] w-12">
              {currentTime.toFixed(1)}s
            </span>
            <input
              type="range"
              aria-label="Video timeline"
              min={0}
              max={TOTAL_DURATION}
              step={0.1}
              value={currentTime}
              disabled={isRecording}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="flex-1 accent-[#3D5A80] h-2 cursor-pointer"
            />
            <span className="font-mono-num text-sm text-[#525D68] w-12 text-right">
              30.0s
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isRecording}
                onClick={() => (isPlaying ? handlePause() : void handlePlay())}
                className="min-h-[50px] px-6 py-3 text-base font-semibold text-white bg-[#3D5A80] rounded-xl hover:bg-[#314968] disabled:bg-[#B4BEC8] transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-5 h-5" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    {currentTime > 0 && currentTime < 29.8 ? 'Resume' : 'Play 30s Film'}
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isRecording}
                onClick={() => void handlePlay(0)}
                className="min-h-[50px] px-4 py-3 text-base font-medium text-[#1E242B] bg-[#F7F7F5] border border-[#DCDCD6] rounded-xl hover:bg-[#EFEFEA] disabled:opacity-50 transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Replay
              </button>
            </div>

            <div className="text-sm text-[#525D68]">
              Character consistency locked · {storyboard.characterBible.lead.name}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
        <button
          type="button"
          disabled={isRecording}
          onClick={() => {
            handlePause();
            onBack();
          }}
          className="min-h-[52px] px-6 py-3 text-base font-semibold text-[#525D68] bg-white border border-[#CFD4DC] rounded-2xl hover:bg-[#EFEFEA] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Storyboard
        </button>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            disabled={isRecording}
            onClick={handleExportVideo}
            className="min-h-[54px] px-7 py-3.5 text-base font-semibold text-white bg-[#3A7D6B] rounded-2xl hover:bg-[#2F6758] disabled:bg-[#B4BEC8] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Video className="w-5 h-5" />
            {exportedVideoUrl ? 'Re-Render & Finish' : 'Render Video & Finish'}
          </button>

          <button
            type="button"
            disabled={isRecording}
            onClick={() => {
              handlePause();
              onNextFinal();
            }}
            className="min-h-[54px] px-6 py-3.5 text-base font-semibold text-[#3D5A80] bg-white border border-[#3D5A80] rounded-2xl hover:bg-[#EEF3F8] disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            Go to Final Screen
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
};
