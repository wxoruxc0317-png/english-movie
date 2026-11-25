import React from 'react';
import { AlertTriangle, ArrowRight, Film, Plus, RotateCcw, Trash2 } from 'lucide-react';
import type { ExpressionItem } from '../types';

interface ExpressionsScreenProps {
  expressions: ExpressionItem[];
  onChange: (next: ExpressionItem[]) => void;
  onLoadSample: (preset: 'baseball' | 'cafe') => void;
  onNext: () => void;
}

export const ExpressionsScreen: React.FC<ExpressionsScreenProps> = ({
  expressions,
  onChange,
  onLoadSample,
  onNext,
}) => {
  const filledExpressions = expressions.filter(
    (e) => e.expression.trim().length > 0 && e.movie.trim().length > 0
  );
  const uniqueMovies = new Set(
    filledExpressions.map((e) => e.movie.trim().toLowerCase())
  );

  const hasEnoughExpressions = filledExpressions.length >= 5;
  const hasMultipleMovies = uniqueMovies.size >= 2;
  const isValid = hasEnoughExpressions && hasMultipleMovies;

  const handleUpdate = (
    id: string,
    field: keyof ExpressionItem,
    value: string
  ) => {
    onChange(
      expressions.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleAddRow = () => {
    onChange([
      ...expressions,
      {
        id: `expr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        expression: '',
        meaningKo: '',
        movie: '',
      },
    ]);
  };

  const handleRemoveRow = (id: string) => {
    if (expressions.length <= 1) return;
    onChange(expressions.filter((item) => item.id !== id));
  };

  const handleClearAll = () => {
    onChange(
      Array.from({ length: 5 }, (_, idx) => ({
        id: `expr-empty-${Date.now()}-${idx}`,
        expression: '',
        meaningKo: '',
        movie: '',
      }))
    );
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1E242B]">
            Collect Your Movie Expressions
          </h1>
          <p className="text-base sm:text-lg text-[#525D68] max-w-2xl leading-relaxed">
            Enter at least 5 English expressions you learned from at least 2 different movies. Every line you type will appear in your 30-second film.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onLoadSample('baseball')}
            className="px-4 py-2.5 text-sm font-medium text-[#1E242B] bg-white border border-[#D4D6D0] rounded-xl hover:bg-[#EFEFEA] transition-colors min-h-[44px] whitespace-nowrap cursor-pointer"
          >
            Baseball Sample
          </button>
          <button
            type="button"
            onClick={() => onLoadSample('cafe')}
            className="px-4 py-2.5 text-sm font-medium text-[#1E242B] bg-white border border-[#D4D6D0] rounded-xl hover:bg-[#EFEFEA] transition-colors min-h-[44px] whitespace-nowrap cursor-pointer"
          >
            Cafe Sample
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            className="px-4 py-2.5 text-sm font-medium text-[#525D68] bg-transparent border border-[#E2E2DC] rounded-xl hover:bg-white transition-colors min-h-[44px] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Clear
          </button>
        </div>
      </div>

      {/* Unboxed typographic status line (zero pills) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 pb-2 border-b border-[#E2E2DC] text-sm sm:text-base text-[#525D68]">
        <div className="flex items-center gap-3 font-mono-num">
          <span className={hasEnoughExpressions ? 'text-[#3A7D6B] font-medium' : 'text-[#9A5B13] font-medium'}>
            {filledExpressions.length} / 5+ expressions
          </span>
          <span aria-hidden="true">·</span>
          <span className={hasMultipleMovies ? 'text-[#3A7D6B] font-medium' : 'text-[#9A5B13] font-medium'}>
            {uniqueMovies.size} / 2+ movies
          </span>
        </div>
        <span className="text-sm text-[#6B7682]">
          Everyday English · Korean University Edition
        </span>
      </div>

      {/* Warning banner when < 5 expressions or <= 1 movie */}
      {!isValid && (
        <div
          role="alert"
          className="flex items-start gap-3.5 p-4 sm:p-5 rounded-2xl bg-[#FEF6E6] border border-[#E8C57B] text-[#7A4B0E]"
        >
          <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5 text-[#B4690E]" />
          <div className="space-y-1">
            <p className="font-semibold text-base sm:text-lg">
              More expressions or movies needed
            </p>
            <p className="text-sm sm:text-base leading-relaxed">
              {!hasEnoughExpressions && !hasMultipleMovies
                ? `Add at least ${5 - filledExpressions.length} more complete expression(s) and include expressions from at least 2 different movies.`
                : !hasEnoughExpressions
                ? `You have ${filledExpressions.length} complete expression(s). Please fill in at least 5 expressions (with their source movie).`
                : 'All expressions currently come from only 1 movie (or none). Add at least 1 expression from a second movie.'}
            </p>
          </div>
        </div>
      )}

      {/* Expression cards */}
      <div className="space-y-4">
        {expressions.map((item, idx) => (
          <div
            key={item.id}
            className="bg-white border border-[#E2E2DC] rounded-2xl p-4 sm:p-5 transition-colors focus-within:border-[#3D5A80]"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-sm font-semibold text-[#525D68] font-mono-num">
                Expression {String(idx + 1).padStart(2, '0')}
              </span>
              {expressions.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveRow(item.id)}
                  aria-label={`Remove expression ${idx + 1}`}
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-[#6B7682] hover:text-[#B42318] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-5 space-y-1.5">
                <label
                  htmlFor={`expr-${item.id}`}
                  className="block text-sm font-medium text-[#525D68]"
                >
                  English Expression
                </label>
                <input
                  id={`expr-${item.id}`}
                  type="text"
                  value={item.expression}
                  onChange={(e) =>
                    handleUpdate(item.id, 'expression', e.target.value)
                  }
                  placeholder="e.g., Be in charge of"
                  className="w-full min-h-[48px] px-4 py-2.5 text-base sm:text-lg text-[#1E242B] bg-[#F7F7F5] border border-[#DCDCD6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3D5A80] focus:bg-white"
                />
              </div>

              <div className="md:col-span-4 space-y-1.5">
                <label
                  htmlFor={`ko-${item.id}`}
                  className="block text-sm font-medium text-[#525D68]"
                >
                  Korean Meaning (한국어 뜻)
                </label>
                <input
                  id={`ko-${item.id}`}
                  type="text"
                  value={item.meaningKo}
                  onChange={(e) =>
                    handleUpdate(item.id, 'meaningKo', e.target.value)
                  }
                  placeholder="예: ~을 맡고 있다"
                  className="w-full min-h-[48px] px-4 py-2.5 text-base sm:text-lg text-[#1E242B] bg-[#F7F7F5] border border-[#DCDCD6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3D5A80] focus:bg-white"
                />
              </div>

              <div className="md:col-span-3 space-y-1.5">
                <label
                  htmlFor={`movie-${item.id}`}
                  className="block text-sm font-medium text-[#525D68]"
                >
                  Movie Title
                </label>
                <div className="relative">
                  <Film className="w-4 h-4 text-[#7C8794] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id={`movie-${item.id}`}
                    type="text"
                    value={item.movie}
                    onChange={(e) =>
                      handleUpdate(item.id, 'movie', e.target.value)
                    }
                    placeholder="e.g., Inside Out 2"
                    className="w-full min-h-[48px] pl-10 pr-4 py-2.5 text-base sm:text-lg text-[#1E242B] bg-[#F7F7F5] border border-[#DCDCD6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3D5A80] focus:bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={handleAddRow}
          className="min-h-[52px] px-6 py-3 text-base font-semibold text-[#3D5A80] bg-white border border-[#CFD4DC] rounded-2xl hover:bg-[#EFEFEA] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Add Another Expression
        </button>

        <button
          type="button"
          disabled={!isValid}
          onClick={onNext}
          className="min-h-[54px] px-8 py-3.5 text-base sm:text-lg font-semibold text-white bg-[#3D5A80] rounded-2xl hover:bg-[#314968] disabled:bg-[#B4BEC8] disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2.5 cursor-pointer"
        >
          Continue to Scene Setup
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
};
