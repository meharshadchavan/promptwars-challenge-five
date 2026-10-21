'use client';

import React, { useState, useCallback } from 'react';
import { Copy, Check, Utensils, Compass, Palette } from 'lucide-react';
import type { CurrencyCode, PersonalizedIdeas } from '@/types/event';
import { formatCurrencyAmount } from '@/lib/utils';

interface IdeaStudioModuleProps {
  ideas: PersonalizedIdeas;
  currency: CurrencyCode;
  highContrast: boolean;
}

export default function IdeaStudioModule({
  ideas,
  currency,
  highContrast,
}: IdeaStudioModuleProps) {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const handleCopyHex = useCallback((hex: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(hex).catch(() => {});
    }
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1800);
  }, []);

  return (
    <section
      aria-labelledby="idea-studio-heading"
      className={`rounded-xl border p-6 ${
        highContrast
          ? 'bg-slate-900 border-slate-700 text-white'
          : 'bg-white border-slate-200/90 text-slate-900'
      }`}
    >
      {/* Editorial Header */}
      <div className="pb-6 border-b border-slate-200/80 dark:border-slate-800">
        <p className="text-xs font-medium opacity-75">
          04. Personalized Creative Folio · Culturally Nuanced · Respects Active Budget Cap
        </p>
        <h2
          id="idea-studio-heading"
          className="text-2xl font-bold tracking-tight mt-1"
          style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
        >
          {ideas.themeName}
        </h2>
        <p className="text-sm leading-relaxed mt-2 max-w-3xl opacity-90">
          {ideas.themeConcept}
        </p>
        <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="font-semibold block">Cultural &amp; Accessibility Alignment:</span>
            <p className="opacity-80 mt-0.5 leading-relaxed">{ideas.culturalNuanceSummary}</p>
          </div>
          <div>
            <span className="font-semibold block">Budget Cap Calibration:</span>
            <p className="opacity-80 mt-0.5 leading-relaxed font-mono">{ideas.budgetTierNote}</p>
          </div>
        </div>
      </div>

      {/* Color Palette Swatches */}
      <div className="py-6 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-4 h-4 opacity-75" aria-hidden="true" />
          <h3 className="text-sm font-semibold">
            Architectural Color &amp; Material Palette (Click Swatch to Copy HEX)
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ideas.colorPalette.map((swatch) => {
            const isCopied = copiedHex === swatch.hex;
            return (
              <button
                key={swatch.hex + swatch.name}
                type="button"
                onClick={() => handleCopyHex(swatch.hex)}
                aria-label={`Copy color ${swatch.name} ${swatch.hex}`}
                className={`text-left p-3.5 rounded-lg border transition-colors flex items-center gap-3.5 ${
                  highContrast
                    ? 'border-slate-700 bg-slate-950 hover:border-amber-400'
                    : 'border-slate-200 bg-[#FAF9F6] hover:border-slate-400'
                }`}
              >
                <span
                  className="w-12 h-12 rounded-md border border-black/15 shrink-0"
                  style={{ backgroundColor: swatch.hex }}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold truncate">{swatch.name}</span>
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <Copy className="w-3 h-3 opacity-50 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs font-mono tabular-nums opacity-75 mt-0.5">
                    {isCopied ? 'Copied!' : swatch.hex}
                  </p>
                  <p className="text-xs opacity-70 truncate mt-0.5">{swatch.usage}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Two-Column Split: Inclusive Culinary Menu & Guest Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6">
        {/* Curated Menu */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Utensils className="w-4 h-4 opacity-75" aria-hidden="true" />
            <h3 className="text-sm font-semibold">
              Inclusive Culinary Tasting Menu
            </h3>
          </div>
          <div className="divide-y divide-slate-200/70 dark:divide-slate-800">
            {ideas.curatedMenu.map((course, idx) => (
              <div key={idx} className="py-3.5 first:pt-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-medium opacity-70">
                    {course.courseType}
                  </span>
                  <span className="text-xs font-mono font-semibold tabular-nums">
                    {formatCurrencyAmount(course.perPersonEstimate, currency)} / guest
                  </span>
                </div>
                <h4 className="text-sm font-semibold mt-0.5">{course.dishName}</h4>
                <p className="text-xs opacity-80 mt-1 leading-relaxed">
                  {course.description}
                </p>
                {/* Clean unboxed dietary metadata */}
                {course.dietaryTags.length > 0 && (
                  <p className="text-xs opacity-70 mt-1.5 font-mono">
                    Dietary Compliance: {course.dietaryTags.join(' · ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Signature Activities */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Compass className="w-4 h-4 opacity-75" aria-hidden="true" />
            <h3 className="text-sm font-semibold">
              Signature Guest Experiences &amp; Accessibility Adaptations
            </h3>
          </div>
          <div className="divide-y divide-slate-200/70 dark:divide-slate-800">
            {ideas.signatureActivities.map((act) => (
              <div key={act.id} className="py-3.5 first:pt-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-mono opacity-70">{act.timing}</span>
                  <span className="text-xs font-mono font-semibold tabular-nums">
                    Est. {formatCurrencyAmount(act.estimatedCost, currency)}
                  </span>
                </div>
                <h4 className="text-sm font-semibold mt-0.5">{act.title}</h4>
                <p className="text-xs opacity-80 mt-1 leading-relaxed">
                  {act.description}
                </p>
                <p className="text-xs opacity-75 mt-1.5">
                  <span className="font-semibold">Accessibility Adaptation:</span>{' '}
                  {act.accessibilityAdaptation}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
