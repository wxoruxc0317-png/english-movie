import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Edit3,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import type { BeatId, ExpressionItem, StoryBeat, StoryboardData } from '../types';
import { countWords, splitHighlightedSegments } from '../utils/textHelpers';

interface StoryboardScreenProps {
  storyboard: StoryboardData;
  expressions: ExpressionItem[];
  regeneratingBeatId: BeatId | null;
  errorMessage: string | null;
  onUpdateBeat: (beatId: BeatId, updates: Partial<StoryBeat>) => void;
  onRegenerateBeat: (beatId: BeatId, feedback?: string) => void;
  onBack: () => void;
  onContinueToVideo: () => void;
}

export const StoryboardScreen: React.FC<StoryboardScreenProps> = ({
  storyboard,
  expressions,
  regeneratingBeatId,
  errorMessage,
  onUpdateBeat,
  onRegenerateBeat,
  onBack,
  onContinueToVideo,
}) => {
  const [editingBeatId, setEditingBeatId] = useState<BeatId | null>(null);
  const [regenNoteByBeat, setRegenNoteByBeat] = useState<Record<string, string>>({});

  const validExprStrings = expressions
    .map((e) => e.expression.trim())
    .filter((s) => s.length > 0);

  const totalWords = storyboard.beats.reduce(
    (sum, beat) => sum + countWords(beat.englishLines),
    0
  );
  const wordCountInTarget = totalWords >= 60 && totalWords <= 70;

  const combinedScriptLower = storyboard.beats
    .map((b) => b.englishLines)
    .join(' ')
    .toLowerCase();

  const expressionStatus = validExprStrings.map((expr) => ({
    expr,
    found: combinedScriptLower.includes(expr.toLowerCase()),
  }));
  const missingCount = expressionStatus.filter((item) => !item.found).length;

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1E242B]">
          Review & Edit Your 4-Beat Storyboard
        </h1>
        <p className="text-base sm:text-lg text-[#525D68] max-w-2xl leading-relaxed">
          Your 30-second film is split into 4 beats. Every expression you entered is highlighted below. Edit any line or regenerate a single beat.
        </p>
      </div>

      {/* Word count & expression verification summary */}
      <div className="bg-white border border-[#E2E2DC] rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#EFEFEA]">
          <div className="flex items-center gap-2.5">
            {wordCountInTarget ? (
              <CheckCircle2 className="w-5 h-5 text-[#3A7D6B] shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-[#B4690E] shrink-0" />
            )}
            <span className="font-semibold text-base sm:text-lg text-[#1E242B]">
              Total Script Length:{' '}
              <span className="font-mono-num">
                {totalWords} words
              </span>
            </span>
            <span className="text-sm text-[#6B7682] font-mono-num">
              (Target: 60–70 words)
            </span>
          </div>

          <div className="text-sm font-medium text-[#525D68] font-mono-num">
            {validExprStrings.length - missingCount} / {validExprStrings.length} expressions used verbatim
          </div>
        </div>

        {/* Expression checklist */}
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm sm:text-base">
          {expressionStatus.map((item) => (
            <div
              key={item.expr}
              className="inline-flex items-center gap-1.5"
            >
              {item.found ? (
                <CheckCircle2 className="w-4 h-4 text-[#3A7D6B] shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[#B4690E] shrink-0" />
              )}
              <span
                className={
                  item.found
                    ? 'text-[#1E242B] font-medium'
                    : 'text-[#9A5B13] font-semibold underline decoration-dotted'
                }
              >
                {item.expr}
              </span>
            </div>
          ))}
        </div>

        {missingCount > 0 && (
          <p className="text-sm text-[#9A5B13]">
            Tip: Make sure every highlighted expression appears word-for-word in the English lines above before creating your video.
          </p>
        )}
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#F5C2C2] text-[#8A1C1C] text-base"
        >
          {errorMessage}
        </div>
      )}

      {/* 4 Beats */}
      <div className="space-y-5">
        {storyboard.beats.map((beat, idx) => {
          const isEditing = editingBeatId === beat.id;
          const isRegenerating = regeneratingBeatId === beat.id;
          const segments = splitHighlightedSegments(
            beat.englishLines,
            validExprStrings
          );
          const beatWordCount = countWords(beat.englishLines);

          return (
            <article
              key={beat.id}
              className="bg-white border border-[#E2E2DC] rounded-2xl p-5 sm:p-6 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EFEFEA]">
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-lg sm:text-xl font-bold text-[#1E242B]">
                    Beat {idx + 1}: {beat.label}
                  </span>
                  <span className="font-mono-num text-sm font-medium text-[#3D5A80]">
                    {beat.timeRange}
                  </span>
                  <span className="text-sm text-[#6B7682] font-mono-num">
                    · {beatWordCount} words
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingBeatId(isEditing ? null : beat.id)
                    }
                    className={`min-h-[44px] px-4 py-2 text-sm font-medium rounded-xl border transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      isEditing
                        ? 'bg-[#3D5A80] text-white border-[#3D5A80]'
                        : 'bg-[#F7F7F5] text-[#1E242B] border-[#DCDCD6] hover:bg-[#EFEFEA]'
                    }`}
                  >
                    <Edit3 className="w-4 h-4" />
                    {isEditing ? 'Done Editing' : 'Edit Beat'}
                  </button>

                  <button
                    type="button"
                    disabled={regeneratingBeatId !== null}
                    onClick={() =>
                      onRegenerateBeat(beat.id, regenNoteByBeat[beat.id])
                    }
                    className="min-h-[44px] px-4 py-2 text-sm font-medium rounded-xl bg-white text-[#3D5A80] border border-[#CFD4DC] hover:bg-[#EFEFEA] disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    {isRegenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Regenerate Beat
                      </>
                    )}
                  </button>
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-[#525D68]">
                      Scene Description
                    </label>
                    <textarea
                      rows={2}
                      value={beat.sceneDescription}
                      onChange={(e) =>
                        onUpdateBeat(beat.id, {
                          sceneDescription: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 text-base text-[#1E242B] bg-[#F7F7F5] border border-[#DCDCD6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3D5A80] focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-[#525D68]">
                      English Lines (Spoken Voice)
                    </label>
                    <textarea
                      rows={2}
                      value={beat.englishLines}
                      onChange={(e) => {
                        const val = e.target.value;
                        onUpdateBeat(beat.id, {
                          englishLines: val,
                          subtitles: val,
                        });
                      }}
                      className="w-full px-4 py-3 text-base sm:text-lg text-[#1E242B] bg-[#F7F7F5] border border-[#DCDCD6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3D5A80] focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-semibold text-[#525D68]">
                        Subtitles (Word-for-Word Match)
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateBeat(beat.id, {
                            subtitles: beat.englishLines,
                          })
                        }
                        className="text-xs font-medium text-[#3D5A80] hover:underline cursor-pointer"
                      >
                        Sync to English Lines
                      </button>
                    </div>
                    <input
                      type="text"
                      value={beat.subtitles}
                      onChange={(e) =>
                        onUpdateBeat(beat.id, { subtitles: e.target.value })
                      }
                      className="w-full min-h-[46px] px-4 py-2.5 text-base text-[#1E242B] bg-[#F7F7F5] border border-[#DCDCD6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3D5A80] focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <label className="block text-sm font-medium text-[#525D68]">
                      Optional note before regenerating this beat
                    </label>
                    <input
                      type="text"
                      value={regenNoteByBeat[beat.id] ?? ''}
                      onChange={(e) =>
                        setRegenNoteByBeat((prev) => ({
                          ...prev,
                          [beat.id]: e.target.value,
                        }))
                      }
                      placeholder="e.g., Make the reaction funnier or clearer"
                      className="w-full min-h-[44px] px-4 py-2 text-sm text-[#1E242B] bg-[#F7F7F5] border border-[#DCDCD6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3D5A80]"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7682] mb-1">
                      Scene Description
                    </div>
                    <p className="text-base text-[#374151] leading-relaxed">
                      {beat.sceneDescription}
                    </p>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-[#6B7682] mb-1">
                      English Lines &amp; Subtitles
                    </div>
                    <p className="text-lg sm:text-xl font-medium text-[#1E242B] leading-relaxed">
                      {segments.map((seg, i) =>
                        seg.highlighted ? (
                          <mark
                            key={i}
                            className="bg-[#FEF08A] text-[#5C3D06] px-1.5 py-0.5 rounded-md font-semibold"
                          >
                            {seg.text}
                          </mark>
                        ) : (
                          <React.Fragment key={i}>{seg.text}</React.Fragment>
                        )
                      )}
                    </p>
                    {beat.subtitles.trim() !== beat.englishLines.trim() && (
                      <p className="mt-1.5 text-sm text-[#525D68]">
                        Subtitle override: {beat.subtitles}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Bottom CTAs */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[52px] px-6 py-3 text-base font-semibold text-[#525D68] bg-white border border-[#CFD4DC] rounded-2xl hover:bg-[#EFEFEA] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Scene
        </button>

        <button
          type="button"
          onClick={onContinueToVideo}
          className="min-h-[54px] px-8 py-3.5 text-base sm:text-lg font-semibold text-white bg-[#3D5A80] rounded-2xl hover:bg-[#314968] transition-colors inline-flex items-center justify-center gap-2.5 cursor-pointer"
        >
          Make 30s Animated Video
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
};
