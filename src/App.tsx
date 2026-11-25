import { useState } from 'react';
import type {
  BeatId,
  ExpressionItem,
  SceneConfig,
  ScreenStep,
  StoryBeat,
  StoryboardData,
} from './types';
import {
  CAFE_SAMPLE_EXPRESSIONS,
  CAFE_SCENE,
  DEFAULT_SCENE,
  SAMPLE_EXPRESSIONS,
} from './data/presets';
import { TopNav } from './components/TopNav';
import { ExpressionsScreen } from './components/ExpressionsScreen';
import { SceneScreen } from './components/SceneScreen';
import { StoryboardScreen } from './components/StoryboardScreen';
import { VideoScreen } from './components/VideoScreen';
import { FinalScreen } from './components/FinalScreen';
import { countWords } from './utils/textHelpers';

const STEP_ORDER: ScreenStep[] = [
  'expressions',
  'scene',
  'storyboard',
  'video',
  'final',
];

export default function App() {
  const [currentStep, setCurrentStep] = useState<ScreenStep>('expressions');
  const [expressions, setExpressions] = useState<ExpressionItem[]>(
    SAMPLE_EXPRESSIONS
  );
  const [scene, setScene] = useState<SceneConfig>(DEFAULT_SCENE);
  const [storyboard, setStoryboard] = useState<StoryboardData | null>(null);
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);

  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [storyboardError, setStoryboardError] = useState<string | null>(null);
  const [regeneratingBeatId, setRegeneratingBeatId] = useState<BeatId | null>(
    null
  );

  const maxUnlockedStep = (() => {
    if (storyboard) return 4;
    const validCount = expressions.filter(
      (e) => e.expression.trim() && e.movie.trim()
    ).length;
    const uniqueMovies = new Set(
      expressions
        .filter((e) => e.expression.trim() && e.movie.trim())
        .map((e) => e.movie.trim().toLowerCase())
    );
    if (validCount >= 5 && uniqueMovies.size >= 2) return 1;
    return 0;
  })();

  const handleLoadSample = (preset: 'baseball' | 'cafe') => {
    if (exportedVideoUrl) {
      URL.revokeObjectURL(exportedVideoUrl);
    }
    setExportedVideoUrl(null);
    setStoryboard(null);
    setStoryboardError(null);

    if (preset === 'cafe') {
      setExpressions(CAFE_SAMPLE_EXPRESSIONS);
      setScene(CAFE_SCENE);
    } else {
      setExpressions(SAMPLE_EXPRESSIONS);
      setScene(DEFAULT_SCENE);
    }
    setCurrentStep('expressions');
  };

  const handleGenerateStoryboard = async () => {
    setIsGeneratingStoryboard(true);
    setStoryboardError(null);
    try {
      const res = await fetch('/api/storyboard/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expressions, scene }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate storyboard.');
      }
      setStoryboard(data);
      if (exportedVideoUrl) {
        URL.revokeObjectURL(exportedVideoUrl);
        setExportedVideoUrl(null);
      }
      setCurrentStep('storyboard');
    } catch (err: unknown) {
      setStoryboardError(
        err instanceof Error ? err.message : 'Unable to generate storyboard.'
      );
    } finally {
      setIsGeneratingStoryboard(false);
    }
  };

  const handleUpdateBeat = (beatId: BeatId, updates: Partial<StoryBeat>) => {
    setStoryboard((prev) => {
      if (!prev) return prev;
      const nextBeats = prev.beats.map((b) =>
        b.id === beatId ? { ...b, ...updates } : b
      );
      const totalWords = nextBeats.reduce(
        (sum, b) => sum + countWords(b.englishLines),
        0
      );
      return { ...prev, beats: nextBeats, totalWords };
    });
    if (exportedVideoUrl) {
      URL.revokeObjectURL(exportedVideoUrl);
      setExportedVideoUrl(null);
    }
  };

  const handleRegenerateBeat = async (beatId: BeatId, feedback?: string) => {
    if (!storyboard) return;
    setRegeneratingBeatId(beatId);
    setStoryboardError(null);
    try {
      const res = await fetch('/api/storyboard/regenerate-beat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beatId,
          beats: storyboard.beats,
          expressions,
          scene,
          feedback,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to regenerate beat.');
      }
      handleUpdateBeat(beatId, data.beat);
    } catch (err: unknown) {
      setStoryboardError(
        err instanceof Error ? err.message : 'Failed to regenerate beat.'
      );
    } finally {
      setRegeneratingBeatId(null);
    }
  };

  const handleContinueToVideo = () => {
    if (!storyboard) return;
    setCurrentStep('video');
  };

  const handleSelectStep = (step: ScreenStep) => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx <= maxUnlockedStep) {
      setCurrentStep(step);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#1E242B] flex flex-col">
      <TopNav
        currentStep={currentStep}
        maxUnlockedStep={maxUnlockedStep}
        onSelectStep={handleSelectStep}
        onResetSample={() => handleLoadSample('baseball')}
      />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {currentStep === 'expressions' && (
          <ExpressionsScreen
            expressions={expressions}
            onChange={(next) => {
              setExpressions(next);
              setStoryboard(null);
            }}
            onLoadSample={handleLoadSample}
            onNext={() => setCurrentStep('scene')}
          />
        )}

        {currentStep === 'scene' && (
          <SceneScreen
            scene={scene}
            isGenerating={isGeneratingStoryboard}
            errorMessage={storyboardError}
            onChange={setScene}
            onBack={() => setCurrentStep('expressions')}
            onGenerateStoryboard={handleGenerateStoryboard}
          />
        )}

        {currentStep === 'storyboard' && storyboard && (
          <StoryboardScreen
            storyboard={storyboard}
            expressions={expressions}
            regeneratingBeatId={regeneratingBeatId}
            errorMessage={storyboardError}
            onUpdateBeat={handleUpdateBeat}
            onRegenerateBeat={handleRegenerateBeat}
            onBack={() => setCurrentStep('scene')}
            onContinueToVideo={handleContinueToVideo}
          />
        )}

        {currentStep === 'video' && storyboard && (
          <VideoScreen
            storyboard={storyboard}
            scene={scene}
            exportedVideoUrl={exportedVideoUrl}
            onExportedVideo={(url) => {
              if (exportedVideoUrl) URL.revokeObjectURL(exportedVideoUrl);
              setExportedVideoUrl(url);
            }}
            onBack={() => setCurrentStep('storyboard')}
            onNextFinal={() => setCurrentStep('final')}
          />
        )}

        {currentStep === 'final' && storyboard && (
          <FinalScreen
            storyboard={storyboard}
            scene={scene}
            expressions={expressions}
            exportedVideoUrl={exportedVideoUrl}
            onExportedVideo={(url) => {
              if (exportedVideoUrl) URL.revokeObjectURL(exportedVideoUrl);
              setExportedVideoUrl(url);
            }}
            onBackToVideo={() => setCurrentStep('video')}
            onStartNew={() => handleLoadSample('baseball')}
          />
        )}
      </main>
    </div>
  );
}
