import React from 'react';
import type { ScreenStep } from '../types';

interface TopNavProps {
  currentStep: ScreenStep;
  maxUnlockedStep: number;
  onSelectStep: (step: ScreenStep) => void;
  onResetSample: () => void;
}

const STEPS: Array<{ id: ScreenStep; label: string }> = [
  { id: 'expressions', label: '1. Expressions' },
  { id: 'scene', label: '2. Scene' },
  { id: 'storyboard', label: '3. Storyboard' },
  { id: 'video', label: '4. Video' },
  { id: 'final', label: '5. Final' },
];

export const TopNav: React.FC<TopNavProps> = ({
  currentStep,
  maxUnlockedStep,
  onSelectStep,
  onResetSample,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#F7F7F5]/95 backdrop-blur-md border-b border-[#E2E2DC]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4 sm:gap-8">
        <button
          type="button"
          onClick={() => onSelectStep('expressions')}
          className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#1E242B] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#3D5A80] rounded-md"
        >
          SceneLines
        </button>

        <nav
          aria-label="Creation steps"
          className="hidden md:flex items-center gap-5 text-sm font-medium overflow-x-auto"
        >
          {STEPS.map((step, index) => {
            const isActive = currentStep === step.id;
            const isUnlocked = index <= maxUnlockedStep;
            return (
              <button
                key={step.id}
                type="button"
                disabled={!isUnlocked}
                onClick={() => isUnlocked && onSelectStep(step.id)}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer disabled:cursor-not-allowed ${
                  isActive
                    ? 'border-[#3D5A80] text-[#1E242B] font-semibold'
                    : isUnlocked
                    ? 'border-transparent text-[#525D68] hover:text-[#1E242B]'
                    : 'border-transparent text-[#A1AAB3]'
                }`}
              >
                {step.label}
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={onResetSample}
          className="px-4 py-2 text-sm font-medium text-[#3D5A80] bg-white border border-[#D4D6D0] rounded-xl hover:bg-[#EFEFEA] transition-colors whitespace-nowrap shrink-0 min-h-[40px] cursor-pointer"
        >
          Sample Story
        </button>
      </div>

      {/* Compact mobile step bar (keeps total sticky height minimal) */}
      <nav
        aria-label="Mobile steps"
        className="md:hidden flex items-center gap-1 px-3 pb-2 overflow-x-auto"
      >
        {STEPS.map((step, index) => {
          const isActive = currentStep === step.id;
          const isUnlocked = index <= maxUnlockedStep;
          return (
            <button
              key={step.id}
              type="button"
              disabled={!isUnlocked}
              onClick={() => isUnlocked && onSelectStep(step.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                isActive
                  ? 'bg-[#3D5A80] text-white'
                  : isUnlocked
                  ? 'text-[#525D68] bg-white border border-[#E2E2DC]'
                  : 'text-[#A1AAB3] bg-transparent'
              }`}
            >
              {step.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
