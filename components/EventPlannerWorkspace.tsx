'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Sparkles, Calendar, Users, MapPin, ShieldAlert, Check } from 'lucide-react';
import type {
  AccessibilitySettings,
  BudgetCategoryItem,
  DietaryTag,
  EventCategoryType,
  EventContextInput,
  EventPlanBlueprint,
  TimelineMilestone,
  VendorChecklistItem,
} from '@/types/event';
import {
  CURRENCY_CONFIG,
  EVENT_PRESETS,
  INCLUSIVITY_TAGS,
  INITIAL_WEDDING_BLUEPRINT,
} from '@/lib/constants';
import {
  computeDeterministicHash,
  formatCurrencyAmount,
  generateDeterministicFallbackBlueprint,
  normalizeBudgetAllocations,
  sanitizeUserInput,
} from '@/lib/utils';
import TopHeader from './TopHeader';
import BudgetModule from './BudgetModule';
import TimelineModule from './TimelineModule';
import VendorModule from './VendorModule';
import IdeaStudioModule from './IdeaStudioModule';
import DiagnosticsModal from './DiagnosticsModal';

const LOCAL_STORAGE_CACHE_KEY = 'fete_and_folio_blueprint_cache_v1';
const COOLDOWN_MS = 3000;

export default function EventPlannerWorkspace() {
  const [activeSection, setActiveSection] = useState<
    'all' | 'budget' | 'timeline' | 'vendors' | 'ideas'
  >('all');

  const [a11y, setA11y] = useState<AccessibilitySettings>({
    highContrast: false,
    fontScale: 'normal',
    currency: 'USD',
  });

  const [context, setContext] = useState<EventContextInput>(EVENT_PRESETS.wedding);
  const [blueprint, setBlueprint] = useState<EventPlanBlueprint>(INITIAL_WEDDING_BLUEPRINT);
  const [isGenerating, setIsGenerating] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>(
    'Loaded Courtyard Heritage Wedding blueprint. Ready for customization.'
  );
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

  // O(1) In-Memory Deterministic Hash Cache
  const memoryCacheRef = useRef<Map<string, EventPlanBlueprint>>(
    new Map([[ computeDeterministicHash(EVENT_PRESETS.wedding), INITIAL_WEDDING_BLUEPRINT ]])
  );
  const lastGenerationTimestampRef = useRef<number>(0);

  // Hydrate cache from localStorage on mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, EventPlanBlueprint>;
        Object.entries(parsed).forEach(([k, v]) => {
          memoryCacheRef.current.set(k, v);
        });
      }
    } catch {
      // Ignore storage quota or private browsing errors
    }
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      const elapsed = Date.now() - lastGenerationTimestampRef.current;
      const left = Math.max(0, Math.ceil((COOLDOWN_MS - elapsed) / 1000));
      setCooldownRemaining(left);
    }, 300);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  const persistToCache = useCallback((hash: string, plan: EventPlanBlueprint) => {
    memoryCacheRef.current.set(hash, plan);
    try {
      const serialized: Record<string, EventPlanBlueprint> = {};
      memoryCacheRef.current.forEach((val, key) => {
        serialized[key] = val;
      });
      window.localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(serialized));
    } catch {
      // Ignore storage quota errors
    }
  }, []);

  const handleSelectPreset = useCallback(
    (type: EventCategoryType) => {
      const preset = EVENT_PRESETS[type];
      setContext({ ...preset, currency: a11y.currency });
      const hash = computeDeterministicHash(preset);
      const cached = memoryCacheRef.current.get(hash);
      if (cached) {
        setBlueprint({ ...cached, source: 'cache', latencyMs: 0 });
        setStatusMessage(`Switched to ${preset.eventName} (O(1) cache hit, 0ms).`);
      } else {
        const generated = generateDeterministicFallbackBlueprint(preset);
        persistToCache(hash, generated);
        setBlueprint(generated);
        setStatusMessage(`Loaded ${preset.eventName} preset blueprint.`);
      }
    },
    [a11y.currency, persistToCache]
  );

  const handleToggleDietaryTag = useCallback((tag: DietaryTag) => {
    setContext((prev) => {
      const exists = prev.inclusivityTags.includes(tag);
      const nextTags = exists
        ? prev.inclusivityTags.filter((t) => t !== tag)
        : [...prev.inclusivityTags, tag];
      return { ...prev, inclusivityTags: nextTags };
    });
  }, []);

  const handleUpdateTotalBudget = useCallback((nextBudgetUSD: number) => {
    const safeBudget = Math.max(100, Math.round(nextBudgetUSD));
    setContext((prev) => ({ ...prev, totalBudget: safeBudget }));
    setBlueprint((prev) => ({
      ...prev,
      context: { ...prev.context, totalBudget: safeBudget },
      budgetBreakdown: normalizeBudgetAllocations(prev.budgetBreakdown, safeBudget),
    }));
  }, []);

  const handleGenerateBlueprint = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();

      const sanitizedContext: EventContextInput = {
        ...context,
        eventName: sanitizeUserInput(context.eventName, 120) || 'Celebration Blueprint',
        location: sanitizeUserInput(context.location, 120) || 'Conservatory Venue',
        culturalContext: sanitizeUserInput(context.culturalContext, 300),
        customPrompt: sanitizeUserInput(context.customPrompt, 400),
      };

      const hash = computeDeterministicHash(sanitizedContext);

      // 1. O(1) Deterministic Hash Cache Lookup (0ms latency, zero token burn)
      const cachedBlueprint = memoryCacheRef.current.get(hash);
      if (cachedBlueprint) {
        setBlueprint({
          ...cachedBlueprint,
          context: sanitizedContext,
          source: 'cache',
          cacheHash: hash,
          latencyMs: 0,
        });
        setStatusMessage(
          `Returned cached blueprint (${hash}) in 0ms — zero duplicate token usage.`
        );
        return;
      }

      // 2. Enforce 3-second cooldown on non-cached AI triggers
      const now = Date.now();
      if (now - lastGenerationTimestampRef.current < COOLDOWN_MS) {
        const left = Math.ceil(
          (COOLDOWN_MS - (now - lastGenerationTimestampRef.current)) / 1000
        );
        setCooldownRemaining(left);
        setStatusMessage(`Rate-limit guard active: please wait ${left}s before next generation.`);
        return;
      }

      lastGenerationTimestampRef.current = now;
      setCooldownRemaining(3);
      setIsGenerating(true);
      setStatusMessage(
        'Synthesizing personalized budget, timeline, vendor vetting, and inclusive menu...'
      );

      const reqStart = performance.now();
      try {
        const res = await fetch('/api/event-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sanitizedContext),
        });

        if (!res.ok) {
          throw new Error('Server route returned non-200 status');
        }

        const data = (await res.json()) as EventPlanBlueprint;
        const latencyMs = Math.round(performance.now() - reqStart);
        const enriched: EventPlanBlueprint = {
          ...data,
          context: sanitizedContext,
          cacheHash: hash,
          latencyMs,
        };
        persistToCache(hash, enriched);
        setBlueprint(enriched);
        setStatusMessage(
          `Blueprint generated (${hash}) in ${latencyMs}ms with 100% budget alignment.`
        );
      } catch {
        const fallback = generateDeterministicFallbackBlueprint(sanitizedContext);
        persistToCache(hash, fallback);
        setBlueprint(fallback);
        setStatusMessage(
          `Generated deterministic offline blueprint (${hash}) with 100% budget alignment.`
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [context, persistToCache]
  );

  const handleUpdateCategories = useCallback((next: BudgetCategoryItem[]) => {
    setBlueprint((prev) => ({ ...prev, budgetBreakdown: next }));
  }, []);

  const handleResetBudget = useCallback(() => {
    const fresh = generateDeterministicFallbackBlueprint(context);
    setBlueprint((prev) => ({
      ...prev,
      budgetBreakdown: fresh.budgetBreakdown,
    }));
    setStatusMessage('Rebalanced budget weights to archetype defaults (100% sum).');
  }, [context]);

  const handleUpdateTimeline = useCallback((next: TimelineMilestone[]) => {
    setBlueprint((prev) => ({ ...prev, timeline: next }));
  }, []);

  const handleUpdateVendors = useCallback((next: VendorChecklistItem[]) => {
    setBlueprint((prev) => ({ ...prev, vendors: next }));
  }, []);

  const fontScaleClass =
    a11y.fontScale === 'xlarge'
      ? 'text-[112%]'
      : a11y.fontScale === 'large'
      ? 'text-[106%]'
      : 'text-base';

  const rate = CURRENCY_CONFIG[a11y.currency]?.rateFromUSD ?? 1;

  return (
    <div
      id="top"
      className={`min-h-screen transition-colors ${fontScaleClass} ${
        a11y.highContrast ? 'bg-slate-950 text-white' : 'bg-[#FAF9F6] text-slate-900'
      }`}
    >
      {/* Top Bar + Accessibility & Localization Sub-Bar */}
      <TopHeader
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        activeEventType={context.eventType}
        onSelectPreset={handleSelectPreset}
        a11y={a11y}
        onUpdateA11y={(partial) => setA11y((prev) => ({ ...prev, ...partial }))}
        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
      />

      {/* Main Content Landmark */}
      <main className="max-w-[1380px] mx-auto px-6 py-8 space-y-8">
        {/* Hero & Event Brief Configurator */}
        <section
          aria-labelledby="hero-heading"
          className={`rounded-xl border p-6 lg:p-8 ${
            a11y.highContrast
              ? 'bg-slate-900 border-slate-700 text-white'
              : 'bg-white border-slate-200/90 text-slate-900'
          }`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Column: Editorial Headline & Context Brief */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
              <div>
                <p className="text-xs font-medium opacity-75">
                  Celebration &amp; Event Planning Intelligence · Weddings · Birthdays · Community Galas
                </p>
                <h1
                  id="hero-heading"
                  className="text-3xl sm:text-4xl font-bold tracking-tight mt-2 text-balance"
                  style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
                >
                  Architect Every Celebration With Precision &amp; Cultural Grace
                </h1>
                <p className="text-sm leading-relaxed opacity-85 mt-3">
                  Synchronize 100%-balanced budgets with protected 5–10% contingency buffers,
                  date-calibrated run-sheets, vendor vetting pipelines, and inclusive culinary
                  curation inside one unified workspace.
                </p>
              </div>

              {/* Active Blueprint Telemetry Summary */}
              <div
                className={`p-4 rounded-lg border text-xs space-y-2 ${
                  a11y.highContrast
                    ? 'bg-slate-950 border-slate-700'
                    : 'bg-[#FAF9F6] border-slate-200/80'
                }`}
              >
                <div className="flex items-center justify-between font-mono tabular-nums">
                  <span className="font-semibold">Blueprint Signature:</span>
                  <span>{blueprint.cacheHash}</span>
                </div>
                <div className="flex items-center justify-between font-mono tabular-nums">
                  <span className="opacity-75">Active Budget Cap:</span>
                  <span className="font-semibold">
                    {formatCurrencyAmount(context.totalBudget, a11y.currency)} (
                    {formatCurrencyAmount(
                      Math.round(context.totalBudget / Math.max(1, context.guestCount)),
                      a11y.currency
                    )}
                    /guest)
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono tabular-nums">
                  <span className="opacity-75">Prompt Defense:</span>
                  <span>XML Isolated (&lt;user_event_context&gt;)</span>
                </div>
                <div
                  aria-live="polite"
                  className="pt-2 border-t border-slate-200 dark:border-slate-800 text-xs font-medium"
                >
                  {statusMessage}
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Event Parameters Form */}
            <form
              onSubmit={handleGenerateBlueprint}
              className="lg:col-span-7 space-y-4 flex flex-col justify-between"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="event-name-input" className="block text-xs font-semibold mb-1">
                    Celebration Title
                  </label>
                  <input
                    id="event-name-input"
                    type="text"
                    required
                    value={context.eventName}
                    onChange={(e) => setContext({ ...context, eventName: e.target.value })}
                    className={`w-full px-3 py-2 text-xs rounded-lg border ${
                      a11y.highContrast
                        ? 'bg-slate-950 border-slate-600 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label htmlFor="event-location-input" className="block text-xs font-semibold mb-1">
                    <MapPin className="w-3.5 h-3.5 inline mr-1" aria-hidden="true" />
                    Venue / Architectural Setting
                  </label>
                  <input
                    id="event-location-input"
                    type="text"
                    required
                    value={context.location}
                    onChange={(e) => setContext({ ...context, location: e.target.value })}
                    className={`w-full px-3 py-2 text-xs rounded-lg border ${
                      a11y.highContrast
                        ? 'bg-slate-950 border-slate-600 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 sm:col-span-2">
                  <div>
                    <label htmlFor="event-date-input" className="block text-xs font-semibold mb-1">
                      <Calendar className="w-3.5 h-3.5 inline mr-1" aria-hidden="true" />
                      Event Date
                    </label>
                    <input
                      id="event-date-input"
                      type="date"
                      required
                      value={context.eventDate}
                      onChange={(e) => setContext({ ...context, eventDate: e.target.value })}
                      className={`w-full px-2.5 py-2 text-xs font-mono tabular-nums rounded-lg border ${
                        a11y.highContrast
                          ? 'bg-slate-950 border-slate-600 text-white'
                          : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label htmlFor="guest-count-input" className="block text-xs font-semibold mb-1">
                      <Users className="w-3.5 h-3.5 inline mr-1" aria-hidden="true" />
                      Guest Count
                    </label>
                    <input
                      id="guest-count-input"
                      type="number"
                      min={5}
                      max={25000}
                      required
                      value={context.guestCount}
                      onChange={(e) =>
                        setContext({
                          ...context,
                          guestCount: Math.max(1, Number(e.target.value) || 50),
                        })
                      }
                      className={`w-full px-2.5 py-2 text-xs font-mono tabular-nums rounded-lg border ${
                        a11y.highContrast
                          ? 'bg-slate-950 border-slate-600 text-white'
                          : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label htmlFor="hero-budget-input" className="block text-xs font-semibold mb-1">
                      Budget Cap ({a11y.currency})
                    </label>
                    <input
                      id="hero-budget-input"
                      type="number"
                      min={100}
                      step={500}
                      required
                      value={Math.round(context.totalBudget * rate)}
                      onChange={(e) => {
                        const displayVal = Math.max(100, Number(e.target.value) || 100);
                        handleUpdateTotalBudget(Math.round(displayVal / rate));
                      }}
                      className={`w-full px-2.5 py-2 text-xs font-mono tabular-nums rounded-lg border ${
                        a11y.highContrast
                          ? 'bg-slate-950 border-slate-600 text-white'
                          : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Inclusivity, Dietary & Accessibility Multi-Select */}
              <div>
                <span className="block text-xs font-semibold mb-1.5">
                  Inclusivity, Accessibility &amp; Dietary Requirements:
                </span>
                <div
                  role="group"
                  aria-label="Dietary and Accessibility Tags"
                  className="flex flex-wrap gap-1.5"
                >
                  {INCLUSIVITY_TAGS.map((tag) => {
                    const selected = context.inclusivityTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleToggleDietaryTag(tag)}
                        aria-pressed={selected}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                          selected
                            ? a11y.highContrast
                              ? 'bg-amber-400 text-slate-950 border-amber-300 font-semibold'
                              : 'bg-slate-900 text-white border-slate-900 font-semibold'
                            : a11y.highContrast
                            ? 'bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-500'
                            : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {selected && <Check className="w-3 h-3" aria-hidden="true" />}
                        <span>{tag}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cultural & Custom Prompt */}
              <div>
                <label htmlFor="custom-prompt-input" className="block text-xs font-semibold mb-1">
                  Cultural Nuances &amp; Special Instructions
                </label>
                <textarea
                  id="custom-prompt-input"
                  rows={2}
                  value={context.customPrompt}
                  onChange={(e) => setContext({ ...context, customPrompt: e.target.value })}
                  placeholder="Describe ceremony traditions, sensory-friendly acoustic needs, or zero-waste goals..."
                  className={`w-full px-3 py-2 text-xs rounded-lg border ${
                    a11y.highContrast
                      ? 'bg-slate-950 border-slate-600 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Primary CTA & Rate-Limit Indicator */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <p className="text-xs opacity-75 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Inputs sanitized &amp; isolated inside &lt;user_event_context&gt;</span>
                </p>

                <button
                  type="submit"
                  disabled={isGenerating || cooldownRemaining > 0}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-60 cursor-pointer ${
                    a11y.highContrast
                      ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {isGenerating
                      ? 'Generating Blueprint...'
                      : cooldownRemaining > 0
                      ? `Cooldown Active (${cooldownRemaining}s)`
                      : 'Generate Event Blueprint'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Four Synchronized Planning Modules */}
        {(activeSection === 'all' || activeSection === 'budget') && (
          <BudgetModule
            categories={blueprint.budgetBreakdown}
            totalBudget={context.totalBudget}
            guestCount={context.guestCount}
            currency={a11y.currency}
            highContrast={a11y.highContrast}
            onUpdateCategories={handleUpdateCategories}
            onUpdateTotalBudget={handleUpdateTotalBudget}
            onResetBudget={handleResetBudget}
          />
        )}

        {(activeSection === 'all' || activeSection === 'timeline') && (
          <TimelineModule
            blueprint={blueprint}
            highContrast={a11y.highContrast}
            onUpdateTimeline={handleUpdateTimeline}
          />
        )}

        {(activeSection === 'all' || activeSection === 'vendors') && (
          <VendorModule
            vendors={blueprint.vendors}
            currency={a11y.currency}
            highContrast={a11y.highContrast}
            onUpdateVendors={handleUpdateVendors}
          />
        )}

        {(activeSection === 'all' || activeSection === 'ideas') && (
          <IdeaStudioModule
            ideas={blueprint.ideas}
            currency={a11y.currency}
            highContrast={a11y.highContrast}
          />
        )}
      </main>

      {/* Quiet Editorial Footer */}
      <footer
        className={`mt-12 border-t py-6 px-6 text-xs ${
          a11y.highContrast
            ? 'border-slate-800 bg-slate-950 text-slate-400'
            : 'border-slate-200/80 bg-white text-slate-600'
        }`}
      >
        <div className="max-w-[1380px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <span>
            Fête &amp; Folio — Celebration &amp; Event Planning Assistant (Weddings, Birthdays
            &amp; Community Galas)
          </span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsDiagnosticsOpen(true)}
              className="underline hover:opacity-100 opacity-80"
            >
              Run System Diagnostics &amp; Self-Test
            </button>
            <span aria-hidden="true">·</span>
            <span>WCAG 2.1 AA Compliant Workspace</span>
          </div>
        </div>
      </footer>

      {/* System Diagnostics & Self-Test Modal */}
      <DiagnosticsModal
        isOpen={isDiagnosticsOpen}
        highContrast={a11y.highContrast}
        onClose={() => setIsDiagnosticsOpen(false)}
      />
    </div>
  );
}
