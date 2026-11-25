import React from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles, Volume2 } from 'lucide-react';
import type { SceneConfig } from '../types';
import { SCENE_PRESETS, STYLE_OPTIONS, VOICE_OPTIONS } from '../data/presets';
import { isSpeechSynthesisSupported, speakBeatLines } from '../utils/speechPlayer';

interface SceneScreenProps {
  scene: SceneConfig;
  isGenerating: boolean;
  errorMessage: string | null;
  onChange: (next: SceneConfig) => void;
  onBack: () => void;
  onGenerateStoryboard: () => void;
}

export const SceneScreen: React.FC<SceneScreenProps> = ({
  scene,
  isGenerating,
  errorMessage,
  onChange,
  onBack,
  onGenerateStoryboard,
}) => {
  const canGenerate =
    scene.place.trim().length > 0 &&
    scene.characters.trim().length > 0 &&
    scene.situation.trim().length > 0 &&
    !isGenerating;

  const applyPreset = (preset: (typeof SCENE_PRESETS)[number]) => {
    onChange({
      ...scene,
      place: preset.place,
      characters: preset.characters,
      situation: preset.situation,
    });
  };

  return (
    <section className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1E242B]">
            Set Your Scene & Visual Style
          </h1>
          <p className="text-base sm:text-lg text-[#525D68] max-w-2xl leading-relaxed">
            Describe where the story happens, invent original fictional characters, and pick one of the four calm visual styles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {SCENE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset)}
              className="px-4 py-2.5 text-sm font-medium text-[#1E242B] bg-white border border-[#D4D6D0] rounded-xl hover:bg-[#EFEFEA] transition-colors min-h-[44px] whitespace-nowrap cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="p-4 sm:p-5 rounded-2xl bg-[#FEF2F2] border border-[#F5C2C2] text-[#8A1C1C] text-base"
        >
          {errorMessage}
        </div>
      )}

      {/* Scene Fields */}
      <div className="bg-white border border-[#E2E2DC] rounded-2xl p-5 sm:p-7 space-y-6">
        <div className="space-y-2">
          <label
            htmlFor="scene-place"
            className="block text-base font-semibold text-[#1E242B]"
          >
            Place
          </label>
          <input
            id="scene-place"
            type="text"
            value={scene.place}
            onChange={(e) => onChange({ ...scene, place: e.target.value })}
            placeholder="e.g., A sunny university baseball stadium during an evening game"
            className="w-full min-h-[50px] px-4 py-3 text-base sm:text-lg text-[#1E242B] bg-[#F7F7F5] border border-[#DCDCD6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3D5A80] focus:bg-white"
          />
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <label
              htmlFor="scene-characters"
              className="block text-base font-semibold text-[#1E242B]"
            >
              Characters
            </label>
            <span className="text-sm text-[#6B7682]">
              Use original fictional characters only (no real people or movie characters)
            </span>
          </div>
          <textarea
            id="scene-characters"
            rows={2}
            value={scene.characters}
            onChange={(e) => onChange({ ...scene, characters: e.target.value })}
            placeholder="e.g., Minji, a cheerful college student in a mint hoodie and overalls holding drumsticks..."
            className="w-full px-4 py-3 text-base sm:text-lg text-[#1E242B] bg-[#F7F7F5] border border-[#DCDCD6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3D5A80] focus:bg-white resize-y"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="scene-situation"
            className="block text-base font-semibold text-[#1E242B]"
          >
            Situation
          </label>
          <textarea
            id="scene-situation"
            rows={2}
            value={scene.situation}
            onChange={(e) => onChange({ ...scene, situation: e.target.value })}
            placeholder="e.g., Minji works part-time playing cheer drums, messes up a beat, learns from it, and succeeds in the next game."
            className="w-full px-4 py-3 text-base sm:text-lg text-[#1E242B] bg-[#F7F7F5] border border-[#DCDCD6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3D5A80] focus:bg-white resize-y"
          />
        </div>
      </div>

      {/* Style Menu */}
      <div className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-[#1E242B]">
            Choose Visual Style
          </h2>
          <span className="text-sm text-[#6B7682]">
            Same characters, outfits, and palette across all 4 beats
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STYLE_OPTIONS.map((opt) => {
            const selected = scene.style === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ ...scene, style: opt.id })}
                className={`text-left rounded-2xl overflow-hidden border transition-all cursor-pointer flex flex-col ${
                  selected
                    ? 'border-[#3D5A80] ring-2 ring-[#3D5A80] bg-white'
                    : 'border-[#E2E2DC] bg-white hover:border-[#B6BCC4]'
                }`}
              >
                <div className="relative aspect-[4/3] w-full bg-[#EAEAE4] overflow-hidden">
                  <img
                    src={opt.imageUrl}
                    alt={`${opt.title} visual style preview`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  {selected && (
                    <span className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#3D5A80] text-white flex items-center justify-center shadow-sm">
                      <Check className="w-5 h-5" />
                    </span>
                  )}
                </div>
                <div className="p-4 space-y-1 flex-1">
                  <div className="font-display font-bold text-lg text-[#1E242B]">
                    {opt.title}
                  </div>
                  <p className="text-sm text-[#525D68] leading-snug">
                    {opt.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Voice & Script Credit */}
      <div className="bg-white border border-[#E2E2DC] rounded-2xl p-5 sm:p-7 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <label className="block text-base font-semibold text-[#1E242B] flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-[#3D5A80]" />
              English Narrator Voice
            </label>
            {isSpeechSynthesisSupported() && (
              <button
                type="button"
                onClick={() =>
                  speakBeatLines(
                    "I am in charge of playing the drums at my part-time job.",
                    scene.voice,
                    6
                  )
                }
                className="px-3 py-1.5 text-xs font-semibold text-[#3D5A80] bg-[#F7F7F5] border border-[#D4D6D0] rounded-lg hover:bg-[#EFEFEA] transition-colors whitespace-nowrap cursor-pointer"
              >
                Test Voice
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {VOICE_OPTIONS.map((v) => {
              const active = scene.voice === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onChange({ ...scene, voice: v.id })}
                  className={`p-3 rounded-xl border text-left transition-colors min-h-[52px] cursor-pointer ${
                    active
                      ? 'border-[#3D5A80] bg-[#EEF3F8] text-[#1E242B]'
                      : 'border-[#E2E2DC] bg-[#F7F7F5] text-[#525D68] hover:bg-white'
                  }`}
                >
                  <div className="font-semibold text-sm text-[#1E242B]">
                    {v.label}
                  </div>
                  <div className="text-xs text-[#525D68]">{v.tone}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2.5">
          <label
            htmlFor="author-name"
            className="block text-base font-semibold text-[#1E242B]"
          >
            Script Credit Name
          </label>
          <input
            id="author-name"
            type="text"
            value={scene.authorName}
            onChange={(e) => onChange({ ...scene, authorName: e.target.value })}
            placeholder="Yu taewoo"
            className="w-full min-h-[50px] px-4 py-3 text-base sm:text-lg text-[#1E242B] bg-[#F7F7F5] border border-[#DCDCD6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3D5A80] focus:bg-white"
          />
          <p className="text-sm text-[#6B7682]">
            Displayed on the final screen as: &ldquo;Made with Google AI Studio · Script by {scene.authorName.trim() || 'Yu taewoo'}&rdquo;
          </p>
        </div>
      </div>

      {/* Bottom CTAs */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isGenerating}
          className="min-h-[52px] px-6 py-3 text-base font-semibold text-[#525D68] bg-white border border-[#CFD4DC] rounded-2xl hover:bg-[#EFEFEA] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Expressions
        </button>

        <button
          type="button"
          disabled={!canGenerate}
          onClick={onGenerateStoryboard}
          className="min-h-[54px] px-8 py-3.5 text-base sm:text-lg font-semibold text-white bg-[#3D5A80] rounded-2xl hover:bg-[#314968] disabled:bg-[#B4BEC8] disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2.5 cursor-pointer"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Writing 4-Beat Storyboard...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate 4-Beat Storyboard
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </section>
  );
};
