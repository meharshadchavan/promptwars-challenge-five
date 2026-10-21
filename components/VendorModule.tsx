'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Search, Plus, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { CurrencyCode, VendorChecklistItem, VendorStatus } from '@/types/event';
import { formatCurrencyAmount, sanitizeUserInput } from '@/lib/utils';
import { CURRENCY_CONFIG } from '@/lib/constants';

interface VendorModuleProps {
  vendors: VendorChecklistItem[];
  currency: CurrencyCode;
  highContrast: boolean;
  onUpdateVendors: (next: VendorChecklistItem[]) => void;
}

export default function VendorModule({
  vendors,
  currency,
  highContrast,
  onUpdateVendors,
}: VendorModuleProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | VendorStatus>('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [expandedVendorId, setExpandedVendorId] = useState<string | null>(
    vendors[0]?.id || null
  );

  // New vendor form state
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorCategory, setNewVendorCategory] = useState('Catering & Hospitality');
  const [newVendorCost, setNewVendorCost] = useState('2500');
  const [newVendorInclusivity, setNewVendorInclusivity] = useState('');
  const [formError, setFormError] = useState('');

  // 250ms debounce on vendor search bar
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim().toLowerCase());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
      const matchesQuery =
        !debouncedQuery ||
        v.vendorName.toLowerCase().includes(debouncedQuery) ||
        v.category.toLowerCase().includes(debouncedQuery) ||
        v.inclusivityNotes.toLowerCase().includes(debouncedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [vendors, statusFilter, debouncedQuery]);

  const vendorTotals = useMemo(() => {
    const totalEstimated = vendors.reduce((s, v) => s + (v.estimatedCost || 0), 0);
    const totalPaid = vendors.reduce((s, v) => s + (v.amountPaid || 0), 0);
    const remaining = Math.max(0, totalEstimated - totalPaid);
    return { totalEstimated, totalPaid, remaining };
  }, [vendors]);

  const handleStatusChange = useCallback(
    (vendorId: string, nextStatus: VendorStatus) => {
      const updated = vendors.map((v) =>
        v.id === vendorId
          ? {
              ...v,
              status: nextStatus,
              amountPaid: nextStatus === 'paid' ? v.estimatedCost : v.amountPaid,
            }
          : v
      );
      onUpdateVendors(updated);
    },
    [vendors, onUpdateVendors]
  );

  const handlePaidChange = useCallback(
    (vendorId: string, rawVal: string) => {
      const rate = CURRENCY_CONFIG[currency]?.rateFromUSD ?? 1;
      const displayVal = Math.max(0, Number(rawVal) || 0);
      const usdVal = Math.round(displayVal / rate);
      const updated = vendors.map((v) =>
        v.id === vendorId ? { ...v, amountPaid: usdVal } : v
      );
      onUpdateVendors(updated);
    },
    [vendors, currency, onUpdateVendors]
  );

  const handleAddVendor = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const cleanName = sanitizeUserInput(newVendorName, 80);
      if (!cleanName) {
        setFormError('Please enter a vendor partner name.');
        return;
      }
      setFormError('');
      const rate = CURRENCY_CONFIG[currency]?.rateFromUSD ?? 1;
      const costUSD = Math.max(50, Math.round((Number(newVendorCost) || 1500) / rate));
      const newVendor: VendorChecklistItem = {
        id: `vnd-custom-${Date.now()}`,
        category: sanitizeUserInput(newVendorCategory, 50) || 'Event Services',
        vendorName: cleanName,
        status: 'shortlisted',
        estimatedCost: costUSD,
        amountPaid: 0,
        contactEmail: 'concierge@partner.example.com',
        inclusivityNotes:
          sanitizeUserInput(newVendorInclusivity, 160) ||
          'Verified step-free access and dietary compliance protocol.',
        vettingQuestions: [
          'What is your backup staffing and equipment failure contingency clause?',
          'Are dietary and accessibility accommodations included without additional surcharges?',
          'What is the cancellation and force-majeure refund schedule?',
        ],
      };
      onUpdateVendors([...vendors, newVendor]);
      setNewVendorName('');
      setNewVendorInclusivity('');
      setExpandedVendorId(newVendor.id);
    },
    [
      newVendorName,
      newVendorCategory,
      newVendorCost,
      newVendorInclusivity,
      currency,
      vendors,
      onUpdateVendors,
    ]
  );

  const rate = CURRENCY_CONFIG[currency]?.rateFromUSD ?? 1;

  return (
    <section
      aria-labelledby="vendor-module-heading"
      className={`rounded-xl border p-6 ${
        highContrast
          ? 'bg-slate-900 border-slate-700 text-white'
          : 'bg-white border-slate-200/90 text-slate-900'
      }`}
    >
      {/* Header & Search/Filter Controls */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <p className="text-xs font-medium opacity-75">
            03. Smart Vendor Pipeline · Contract &amp; Deposit Ledger · AI Vetting Prompts
          </p>
          <h2
            id="vendor-module-heading"
            className="text-2xl font-bold tracking-tight mt-1"
            style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
          >
            Vendor Checklist &amp; Vetting Matrix
          </h2>
          <p className="text-xs font-mono tabular-nums opacity-75 mt-1">
            Estimated Contracts: {formatCurrencyAmount(vendorTotals.totalEstimated, currency)} ·
            Paid to Date: {formatCurrencyAmount(vendorTotals.totalPaid, currency)} · Balance Due:{' '}
            {formatCurrencyAmount(vendorTotals.remaining, currency)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Debounced Search Input */}
          <div className="relative">
            <Search
              className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-60"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Search vendors by name, category, or accessibility note"
              placeholder="Search vendors or notes..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={`pl-8 pr-3 py-1.5 text-xs rounded-lg border w-52 ${
                highContrast
                  ? 'bg-slate-950 border-slate-600 text-white'
                  : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>

          {/* Interactive Status Filter */}
          <div
            role="group"
            aria-label="Filter vendors by contract status"
            className={`inline-flex items-center p-1 rounded-lg border text-xs ${
              highContrast ? 'bg-slate-950 border-slate-700' : 'bg-slate-100 border-slate-200'
            }`}
          >
            {(['all', 'researching', 'shortlisted', 'contracted', 'paid'] as const).map(
              (st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md font-medium capitalize transition-colors whitespace-nowrap shrink-0 ${
                    statusFilter === st
                      ? highContrast
                        ? 'bg-amber-400 text-slate-950 font-semibold'
                        : 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'opacity-75 hover:opacity-100'
                  }`}
                >
                  {st}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Vendor Rows */}
      {filteredVendors.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm opacity-75">No vendors match your current search or status filter.</p>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setSearchInput('');
            }}
            className="mt-3 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white"
          >
            Reset Vendor Filters
          </button>
        </div>
      ) : (
        <div className="divide-y divide-slate-200/70 dark:divide-slate-800">
          {filteredVendors.map((vnd) => {
            const isExpanded = expandedVendorId === vnd.id;
            const balanceDue = Math.max(0, vnd.estimatedCost - vnd.amountPaid);
            return (
              <div key={vnd.id} className="py-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3 className="text-base font-semibold">{vnd.vendorName}</h3>
                      <span className="text-xs opacity-70">· {vnd.category}</span>
                      <span className="text-xs font-mono opacity-65">· {vnd.contactEmail}</span>
                    </div>
                    <p className="text-xs opacity-80">
                      Inclusivity &amp; Dietary Note: {vnd.inclusivityNotes}
                    </p>
                  </div>

                  {/* Financial & Status Controls */}
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <div className="text-right font-mono text-xs tabular-nums">
                      <span className="block opacity-70">Est. Quote</span>
                      <span className="font-semibold">
                        {formatCurrencyAmount(vnd.estimatedCost, currency)}
                      </span>
                    </div>

                    <div>
                      <label
                        htmlFor={`paid-${vnd.id}`}
                        className="block text-xs opacity-70 font-mono"
                      >
                        Paid ({currency})
                      </label>
                      <input
                        id={`paid-${vnd.id}`}
                        type="number"
                        min={0}
                        step={100}
                        value={Math.round(vnd.amountPaid * rate)}
                        onChange={(e) => handlePaidChange(vnd.id, e.target.value)}
                        className={`w-24 px-2 py-1 text-right font-mono text-xs font-semibold tabular-nums rounded border ${
                          highContrast
                            ? 'bg-slate-950 border-slate-600 text-white'
                            : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    <div className="text-right font-mono text-xs tabular-nums min-w-[85px]">
                      <span className="block opacity-70">Balance</span>
                      <span className="font-semibold">
                        {formatCurrencyAmount(balanceDue, currency)}
                      </span>
                    </div>

                    <div>
                      <label
                        htmlFor={`status-${vnd.id}`}
                        className="block text-xs opacity-70"
                      >
                        Pipeline Stage
                      </label>
                      <select
                        id={`status-${vnd.id}`}
                        aria-label={`Pipeline status for ${vnd.vendorName}`}
                        value={vnd.status}
                        onChange={(e) =>
                          handleStatusChange(vnd.id, e.target.value as VendorStatus)
                        }
                        className={`px-2.5 py-1 text-xs font-medium rounded border capitalize ${
                          highContrast
                            ? 'bg-slate-950 border-slate-600 text-white'
                            : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      >
                        <option value="researching">Researching</option>
                        <option value="shortlisted">Shortlisted</option>
                        <option value="contracted">Contracted</option>
                        <option value="paid">Paid in Full</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedVendorId(isExpanded ? null : vnd.id)
                      }
                      aria-expanded={isExpanded}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                        highContrast
                          ? 'border-slate-600 bg-slate-800 text-white hover:bg-slate-700'
                          : 'border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Vetting Questions ({vnd.vettingQuestions.length})</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expandable AI Vetting Questions Panel */}
                {isExpanded && (
                  <div
                    className={`mt-3 p-4 rounded-lg border text-xs ${
                      highContrast
                        ? 'bg-slate-950 border-slate-700 text-slate-200'
                        : 'bg-[#FAF9F6] border-slate-200/80 text-slate-800'
                    }`}
                  >
                    <p className="font-semibold mb-2">
                      Recommended Contract &amp; Inclusivity Vetting Questions for {vnd.vendorName}:
                    </p>
                    <ol className="list-decimal list-inside space-y-1.5">
                      {vnd.vettingQuestions.map((q, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {q}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Vendor Partner Form */}
      <form
        onSubmit={handleAddVendor}
        className="mt-6 pt-5 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-end gap-3"
      >
        <div className="flex-1 min-w-[180px]">
          <label htmlFor="new-vnd-name" className="block text-xs font-medium mb-1">
            Add Vendor Partner
          </label>
          <input
            id="new-vnd-name"
            type="text"
            placeholder="e.g., Heritage Floral & Canopy Co."
            value={newVendorName}
            onChange={(e) => setNewVendorName(e.target.value)}
            className={`w-full px-3 py-2 text-xs rounded-lg border ${
              highContrast
                ? 'bg-slate-950 border-slate-600 text-white'
                : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          />
        </div>

        <div className="w-44">
          <label htmlFor="new-vnd-cat" className="block text-xs font-medium mb-1">
            Category
          </label>
          <input
            id="new-vnd-cat"
            type="text"
            value={newVendorCategory}
            onChange={(e) => setNewVendorCategory(e.target.value)}
            className={`w-full px-3 py-2 text-xs rounded-lg border ${
              highContrast
                ? 'bg-slate-950 border-slate-600 text-white'
                : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          />
        </div>

        <div className="w-32">
          <label htmlFor="new-vnd-cost" className="block text-xs font-medium mb-1">
            Est. Quote ({currency})
          </label>
          <input
            id="new-vnd-cost"
            type="number"
            min={50}
            step={100}
            value={newVendorCost}
            onChange={(e) => setNewVendorCost(e.target.value)}
            className={`w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg border ${
              highContrast
                ? 'bg-slate-950 border-slate-600 text-white'
                : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          />
        </div>

        <div className="flex-1 min-w-[200px]">
          <label htmlFor="new-vnd-inc" className="block text-xs font-medium mb-1">
            Inclusivity &amp; Dietary Compliance Note
          </label>
          <input
            id="new-vnd-inc"
            type="text"
            placeholder="e.g., Step-free loading & dedicated allergen prep"
            value={newVendorInclusivity}
            onChange={(e) => setNewVendorInclusivity(e.target.value)}
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
          <span>Add Vendor</span>
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
