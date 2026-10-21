'use client';

import React from 'react';
import { ShieldCheck, Contrast, Type as TypeIcon, Globe } from 'lucide-react';
import type {
  AccessibilitySettings,
  CurrencyCode,
  EventCategoryType,
} from '@/types/event';
import { CURRENCY_CONFIG, EVENT_CATEGORIES } from '@/lib/constants';

interface TopHeaderProps {
  activeSection: 'all' | 'budget' | 'timeline' | 'vendors' | 'ideas';
  onSelectSection: (section: 'all' | 'budget' | 'timeline' | 'vendors' | 'ideas') => void;
  activeEventType: EventCategoryType;
  onSelectPreset: (type: EventCategoryType) => void;
  a11y: AccessibilitySettings;
  onUpdateA11y: (next: Partial<AccessibilitySettings>) => void;
  onOpenDiagnostics: () => void;
}

export default function TopHeader({
  activeSection,
  onSelectSection,
  activeEventType,
  onSelectPreset,
  a11y,
  onUpdateA11y,
  onOpenDiagnostics,
}: TopHeaderProps) {
  return (
    <div
      className={
        a11y.highContrast
          ? 'bg-slate-950 text-white border-b border-slate-700'
          : 'bg-white/95 backdrop-blur-sm text-slate-900 border-b border-slate-200'
      }
    >
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="max-w-[1380px] mx-auto flex items-center justify-between gap-3 sm:gap-8 px-4 sm:px-6 py-3.5 sm:py-4">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onSelectSection('all');
          }}
          className="text-lg sm:text-xl font-bold tracking-tight whitespace-nowrap shrink-0"
          style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
        >
          Fête &amp; Folio
        </a>

        {/* Zone 2: 4–5 concise single-line text navigation links */}
        <nav
          aria-label="Primary Workspace Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium"
        >
          <button
            type="button"
            onClick={() => onSelectSection('all')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
              activeSection === 'all'
                ? 'border-current font-semibold'
                : 'border-transparent opacity-75 hover:opacity-100'
            }`}
          >
            Full Workspace
          </button>
          <button
            type="button"
            onClick={() => onSelectSection('budget')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
              activeSection === 'budget'
                ? 'border-current font-semibold'
                : 'border-transparent opacity-75 hover:opacity-100'
            }`}
          >
            Budget Engine
          </button>
          <button
            type="button"
            onClick={() => onSelectSection('timeline')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
              activeSection === 'timeline'
                ? 'border-current font-semibold'
                : 'border-transparent opacity-75 hover:opacity-100'
            }`}
          >
            Run-Sheet
          </button>
          <button
            type="button"
            onClick={() => onSelectSection('vendors')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
              activeSection === 'vendors'
                ? 'border-current font-semibold'
                : 'border-transparent opacity-75 hover:opacity-100'
            }`}
          >
            Vendor Checklist
          </button>
          <button
            type="button"
            onClick={() => onSelectSection('ideas')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
              activeSection === 'ideas'
                ? 'border-current font-semibold'
                : 'border-transparent opacity-75 hover:opacity-100'
            }`}
          >
            Idea Studio
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenDiagnostics}
            aria-label="System Diagnostics and Self-Test"
            className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 ${
              a11y.highContrast
                ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 focus-visible:outline-amber-400'
                : 'bg-slate-900 text-white hover:bg-slate-800 focus-visible:outline-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="sm:hidden">Self-Test</span>
            <span className="hidden sm:inline">System Diagnostics &amp; Self-Test</span>
          </button>
        </div>
      </header>

      {/* Secondary Accessibility, Localization & Archetype Bar */}
      <div
        role="region"
        aria-label="Accessibility, Multi-Currency, and Event Preset Controls"
        className={`border-t px-4 sm:px-6 py-2.5 text-xs ${
          a11y.highContrast
            ? 'border-slate-800 bg-slate-900 text-slate-100'
            : 'border-slate-200/80 bg-[#F4F2ED] text-slate-700'
        }`}
      >
        <div className="max-w-[1380px] mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Event Archetype Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold whitespace-nowrap shrink-0">Event Archetype:</span>
            <div
              role="group"
              aria-label="Select Event Preset"
              className={`flex flex-wrap items-center gap-1 p-1 rounded-lg border ${
                a11y.highContrast
                  ? 'bg-slate-950 border-slate-700'
                  : 'bg-white border-slate-200'
              }`}
            >
              {EVENT_CATEGORIES.map((cat) => {
                const active = activeEventType === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => onSelectPreset(cat.id)}
                    aria-pressed={active}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? a11y.highContrast
                          ? 'bg-amber-400 text-slate-950 font-semibold'
                          : 'bg-slate-900 text-white font-semibold'
                        : 'hover:opacity-100 opacity-80'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Multi-Currency, Font Scale & High-Contrast Controls */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Multi-Currency Selector */}
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <label htmlFor="currency-select" className="font-medium whitespace-nowrap shrink-0">
                Currency:
              </label>
              <select
                id="currency-select"
                aria-label="Display Currency"
                value={a11y.currency}
                onChange={(e) => onUpdateA11y({ currency: e.target.value as CurrencyCode })}
                className={`px-2 py-1 rounded border font-mono text-xs font-semibold focus-visible:outline-2 ${
                  a11y.highContrast
                    ? 'bg-slate-950 border-slate-600 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                {(Object.keys(CURRENCY_CONFIG) as CurrencyCode[]).map((code) => (
                  <option key={code} value={code}>
                    {CURRENCY_CONFIG[code].label}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Scaling Control */}
            <div className="flex items-center gap-1.5">
              <TypeIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <label htmlFor="font-scale-select" className="font-medium whitespace-nowrap shrink-0">
                Text Size:
              </label>
              <select
                id="font-scale-select"
                aria-label="Font Size Scaling"
                value={a11y.fontScale}
                onChange={(e) =>
                  onUpdateA11y({
                    fontScale: e.target.value as AccessibilitySettings['fontScale'],
                  })
                }
                className={`px-2 py-1 rounded border text-xs font-medium focus-visible:outline-2 ${
                  a11y.highContrast
                    ? 'bg-slate-950 border-slate-600 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                <option value="normal">100% Standard</option>
                <option value="large">110% Large</option>
                <option value="xlarge">120% Extra Large</option>
              </select>
            </div>

            {/* High-Contrast Toggle */}
            <button
              type="button"
              onClick={() => onUpdateA11y({ highContrast: !a11y.highContrast })}
              aria-pressed={a11y.highContrast}
              aria-label="Toggle WCAG High-Contrast Mode"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border font-medium transition-colors whitespace-nowrap shrink-0 ${
                a11y.highContrast
                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-semibold'
                  : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <Contrast className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{a11y.highContrast ? 'High Contrast: On' : 'High Contrast: Off'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
