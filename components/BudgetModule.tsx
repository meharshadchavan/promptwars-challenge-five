'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { Download, Plus, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { BudgetCategoryItem, CurrencyCode } from '@/types/event';
import {
  calculateBudgetSummary,
  formatCurrencyAmount,
  generateBudgetCSV,
  normalizeBudgetAllocations,
  sanitizeUserInput,
} from '@/lib/utils';
import { CURRENCY_CONFIG } from '@/lib/constants';

interface BudgetModuleProps {
  categories: BudgetCategoryItem[];
  totalBudget: number;
  guestCount: number;
  currency: CurrencyCode;
  highContrast: boolean;
  onUpdateCategories: (next: BudgetCategoryItem[]) => void;
  onUpdateTotalBudget: (nextBudget: number) => void;
  onResetBudget: () => void;
}

export default function BudgetModule({
  categories,
  totalBudget,
  guestCount,
  currency,
  highContrast,
  onUpdateCategories,
  onUpdateTotalBudget,
  onResetBudget,
}: BudgetModuleProps) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryPct, setNewCategoryPct] = useState('10');
  const [newCategoryNotes, setNewCategoryNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Memoize budget summary math to prevent unnecessary recalculations
  const summary = useMemo(
    () => calculateBudgetSummary(categories, totalBudget),
    [categories, totalBudget]
  );

  const perGuestPlanned = useMemo(() => {
    const safeGuests = Math.max(1, guestCount);
    return Math.round(totalBudget / safeGuests);
  }, [totalBudget, guestCount]);

  const handlePercentageSliderChange = useCallback(
    (categoryId: string, nextPct: number) => {
      const rebalanced = normalizeBudgetAllocations(
        categories,
        totalBudget,
        categoryId,
        nextPct
      );
      onUpdateCategories(rebalanced);
    },
    [categories, totalBudget, onUpdateCategories]
  );

  const handleActualSpentChange = useCallback(
    (categoryId: string, rawVal: string) => {
      const rate = CURRENCY_CONFIG[currency]?.rateFromUSD ?? 1;
      const numericDisplay = Math.max(0, Number(rawVal) || 0);
      const amountInUSD = Math.round(numericDisplay / rate);

      const updated = categories.map((item) =>
        item.id === categoryId ? { ...item, actualSpent: amountInUSD } : item
      );
      onUpdateCategories(updated);
    },
    [categories, currency, onUpdateCategories]
  );

  const handleAddCategory = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const cleanName = sanitizeUserInput(newCategoryName, 60);
      if (!cleanName) {
        setFormError('Please enter a category name before adding.');
        return;
      }
      setFormError('');
      const requestedPct = Math.min(40, Math.max(3, Number(newCategoryPct) || 10));
      const newId = `cat-custom-${Date.now()}`;
      const nextList: BudgetCategoryItem[] = [
        ...categories,
        {
          id: newId,
          name: cleanName,
          percentage: requestedPct,
          plannedAmount: 0,
          actualSpent: 0,
          notes: sanitizeUserInput(newCategoryNotes || 'Custom allocation line item', 140),
        },
      ];
      onUpdateCategories(normalizeBudgetAllocations(nextList, totalBudget, newId, requestedPct));
      setNewCategoryName('');
      setNewCategoryNotes('');
    },
    [newCategoryName, newCategoryPct, newCategoryNotes, categories, totalBudget, onUpdateCategories]
  );

  const handleExportCSV = useCallback(() => {
    const csvContent = generateBudgetCSV(categories, currency);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fete-and-folio-budget-${currency.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [categories, currency]);

  const handleExportJSON = useCallback(() => {
    const payload = JSON.stringify(
      { totalBudgetUSD: totalBudget, displayCurrency: currency, summary, categories },
      null,
      2
    );
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fete-and-folio-budget.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [totalBudget, currency, summary, categories]);

  const rate = CURRENCY_CONFIG[currency]?.rateFromUSD ?? 1;

  return (
    <section
      aria-labelledby="budget-engine-heading"
      className={`rounded-xl border p-6 ${
        highContrast
          ? 'bg-slate-900 border-slate-700 text-white'
          : 'bg-white border-slate-200/90 text-slate-900'
      }`}
    >
      {/* Header & Export Toolbar */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <p className="text-xs font-medium opacity-75">
            01. Dynamic Financial Allocation · Auto-Balanced to 100% · Protected 5–10% Contingency
          </p>
          <h2
            id="budget-engine-heading"
            className="text-2xl font-bold tracking-tight mt-1"
            style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
          >
            Dynamic Budget Engine &amp; Variance Ledger
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onResetBudget}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              highContrast
                ? 'border-slate-600 bg-slate-800 text-white hover:bg-slate-700'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Rebalance Weights</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              highContrast
                ? 'border-slate-600 bg-slate-800 text-white hover:bg-slate-700'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Download CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportJSON}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              highContrast
                ? 'border-slate-600 bg-slate-800 text-white hover:bg-slate-700'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* 4-Column Financial Telemetry Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-6 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <label
            htmlFor="total-budget-cap-input"
            className="block text-xs font-medium opacity-75"
          >
            Total Budget Cap ({CURRENCY_CONFIG[currency].symbol})
          </label>
          <div className="mt-1 flex items-baseline gap-2">
            <input
              id="total-budget-cap-input"
              type="number"
              min={100}
              step={500}
              value={Math.round(totalBudget * rate)}
              onChange={(e) => {
                const val = Math.max(100, Number(e.target.value) || 100);
                onUpdateTotalBudget(Math.round(val / rate));
              }}
              className={`w-full max-w-[180px] px-2.5 py-1.5 text-lg font-mono font-bold tabular-nums rounded border ${
                highContrast
                  ? 'bg-slate-950 border-slate-600 text-white'
                  : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>
          <p className="text-xs opacity-70 mt-1 font-mono tabular-nums">
            {formatCurrencyAmount(perGuestPlanned, currency)} / guest ({guestCount} guests)
          </p>
        </div>

        <div>
          <span className="block text-xs font-medium opacity-75">
            Planned Allocation (100% Cap)
          </span>
          <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums">
            {formatCurrencyAmount(summary.totalPlanned, currency)}
          </p>
          <p className="text-xs opacity-75 mt-1 font-mono tabular-nums">
            Weight Sum: {summary.percentageSum}% · Buffer: {summary.contingencyPct}%
          </p>
        </div>

        <div>
          <span className="block text-xs font-medium opacity-75">Actual Committed Spend</span>
          <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums">
            {formatCurrencyAmount(summary.totalActual, currency)}
          </p>
          <p className="text-xs opacity-75 mt-1 font-mono tabular-nums">
            Utilization: {summary.utilizationPct}% of Total Cap
          </p>
        </div>

        <div>
          <span className="block text-xs font-medium opacity-75">Net Budget Variance</span>
          <div className="mt-1.5 flex items-center gap-2">
            {summary.isOverBudget ? (
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" aria-hidden="true" />
            )}
            <span
              className={`text-2xl font-bold font-mono tabular-nums ${
                summary.isOverBudget
                  ? highContrast
                    ? 'text-red-400'
                    : 'text-red-700'
                  : highContrast
                  ? 'text-emerald-400'
                  : 'text-emerald-800'
              }`}
            >
              {summary.varianceAmount >= 0 ? '+' : ''}
              {formatCurrencyAmount(summary.varianceAmount, currency)}
            </span>
          </div>
          <p className="text-xs opacity-75 mt-1">
            {summary.isOverBudget
              ? 'Warning: Actual spend exceeds stated budget cap'
              : `Under cap by ${summary.variancePct}%`}
          </p>
        </div>
      </div>

      {/* Stacked Proportional Allocation Bar */}
      <div className="py-5 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-semibold">Proportional Allocation Distribution</span>
          <span className="font-mono tabular-nums opacity-80">
            Total = {summary.percentageSum}% (Contingency Locked 5–10%)
          </span>
        </div>
        <div
          role="img"
          aria-label="Proportional budget allocation bar across categories"
          className="h-3.5 w-full rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800"
        >
          {categories.map((cat, idx) => {
            const shades = [
              'bg-slate-900',
              'bg-emerald-800',
              'bg-amber-700',
              'bg-stone-600',
              'bg-teal-800',
              'bg-rose-800',
              'bg-indigo-900',
            ];
            return (
              <div
                key={cat.id}
                style={{ width: `${cat.percentage}%` }}
                title={`${cat.name}: ${cat.percentage}%`}
                className={`${shades[idx % shades.length]} transition-all duration-150 border-r border-white/20 last:border-r-0`}
              />
            );
          })}
        </div>
      </div>

      {/* High-Density Interactive Category Table */}
      <div className="overflow-x-auto mt-4">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider opacity-75">
              <th className="py-3 pr-4 font-semibold">Category &amp; Operational Scope</th>
              <th className="py-3 px-4 font-semibold w-52">Allocation Slider (%)</th>
              <th className="py-3 px-4 font-semibold text-right">Planned ({currency})</th>
              <th className="py-3 px-4 font-semibold text-right">Actual Spent ({currency})</th>
              <th className="py-3 pl-4 font-semibold text-right">Variance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
            {categories.map((cat) => {
              const itemVariance = cat.plannedAmount - cat.actualSpent;
              const isItemOver = itemVariance < 0;
              return (
                <tr key={cat.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="py-3.5 pr-4 align-top">
                    <div className="font-semibold">
                      {cat.name}
                      {cat.isContingency && (
                        <span className="ml-2 text-xs font-normal opacity-75">
                          · Protected 5–10% Buffer
                        </span>
                      )}
                    </div>
                    <p className="text-xs opacity-75 mt-0.5">{cat.notes}</p>
                  </td>

                  <td className="py-3.5 px-4 align-middle">
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        aria-label={`${cat.name} Allocation Percentage`}
                        min={cat.isContingency ? 5 : 2}
                        max={cat.isContingency ? 10 : 80}
                        value={cat.percentage}
                        onChange={(e) =>
                          handlePercentageSliderChange(cat.id, Number(e.target.value))
                        }
                        className="w-full accent-slate-900 cursor-pointer"
                      />
                      <span className="w-11 text-right font-mono text-xs font-semibold tabular-nums">
                        {cat.percentage}%
                      </span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 align-middle text-right font-mono font-medium tabular-nums">
                    {formatCurrencyAmount(cat.plannedAmount, currency)}
                  </td>

                  <td className="py-3.5 px-4 align-middle text-right">
                    <input
                      type="number"
                      min={0}
                      step={50}
                      aria-label={`Actual spent for ${cat.name} in ${currency}`}
                      value={Math.round(cat.actualSpent * rate)}
                      onChange={(e) => handleActualSpentChange(cat.id, e.target.value)}
                      className={`w-28 px-2 py-1 text-right font-mono text-xs font-semibold tabular-nums rounded border ${
                        highContrast
                          ? 'bg-slate-950 border-slate-600 text-white'
                          : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </td>

                  <td
                    className={`py-3.5 pl-4 align-middle text-right font-mono text-xs font-semibold tabular-nums ${
                      isItemOver
                        ? highContrast
                          ? 'text-red-400'
                          : 'text-red-700'
                        : highContrast
                        ? 'text-emerald-400'
                        : 'text-emerald-800'
                    }`}
                  >
                    {itemVariance >= 0 ? '+' : ''}
                    {formatCurrencyAmount(itemVariance, currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Custom Budget Category Form */}
      <form
        onSubmit={handleAddCategory}
        className="mt-6 pt-5 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-end gap-3"
      >
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="new-cat-name" className="block text-xs font-medium mb-1">
            Add Custom Budget Line Item
          </label>
          <input
            id="new-cat-name"
            type="text"
            placeholder="e.g., Guest Shuttle & Accessibility Transport"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className={`w-full px-3 py-2 text-xs rounded-lg border ${
              highContrast
                ? 'bg-slate-950 border-slate-600 text-white'
                : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          />
        </div>

        <div className="w-28">
          <label htmlFor="new-cat-pct" className="block text-xs font-medium mb-1">
            Target Weight %
          </label>
          <input
            id="new-cat-pct"
            type="number"
            min={3}
            max={40}
            value={newCategoryPct}
            onChange={(e) => setNewCategoryPct(e.target.value)}
            className={`w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg border ${
              highContrast
                ? 'bg-slate-950 border-slate-600 text-white'
                : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          />
        </div>

        <div className="flex-1 min-w-[200px]">
          <label htmlFor="new-cat-notes" className="block text-xs font-medium mb-1">
            Scope Notes
          </label>
          <input
            id="new-cat-notes"
            type="text"
            placeholder="Describe vendor deliverables or buffer notes..."
            value={newCategoryNotes}
            onChange={(e) => setNewCategoryNotes(e.target.value)}
            className={`w-full px-3 py-2 text-xs rounded-lg border ${
              highContrast
                ? 'bg-slate-950 border-slate-600 text-white'
                : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          />
        </div>

        <button
          type="submit"
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            highContrast
              ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Add &amp; Auto-Balance</span>
        </button>

        {formError && (
          <p role="alert" className="w-full text-xs text-red-600 font-medium mt-1">
            {formError}
          </p>
        )}
      </form>
    </section>
  );
}
