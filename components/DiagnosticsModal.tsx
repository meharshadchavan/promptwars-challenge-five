'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { X, CheckCircle2, XCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import type { DiagnosticSuiteReport } from '@/types/event';
import { runSystemDiagnostics } from '@/lib/diagnostics';

interface DiagnosticsModalProps {
  isOpen: boolean;
  highContrast: boolean;
  onClose: () => void;
}

export default function DiagnosticsModal({
  isOpen,
  highContrast,
  onClose,
}: DiagnosticsModalProps) {
  const [report, setReport] = useState<DiagnosticSuiteReport | null>(null);

  const executeDiagnostics = useCallback(() => {
    const res = runSystemDiagnostics();
    setReport(res);
  }, []);

  useEffect(() => {
    if (isOpen) {
      executeDiagnostics();
    }
  }, [isOpen, executeDiagnostics]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="diagnostics-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div
        className={`w-full max-w-3xl rounded-xl border p-6 shadow-xl max-h-[90vh] overflow-y-auto ${
          highContrast
            ? 'bg-slate-950 border-slate-600 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" aria-hidden="true" />
            <div>
              <h2
                id="diagnostics-modal-title"
                className="text-lg font-bold tracking-tight"
                style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
              >
                System Diagnostics &amp; Self-Test Verification
              </h2>
              <p className="text-xs opacity-75">
                Live runtime assertions verifying Budget Math, XSS/Prompt-Injection Sanitization,
                Offline Schema Fallback, and Deterministic O(1) Cache Latency.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close System Diagnostics Modal"
            className="p-1.5 rounded-lg border border-transparent hover:border-slate-300 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Summary Banner */}
        {report && (
          <div className="py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs font-mono tabular-nums">
            <div>
              <span className="font-semibold">
                Assertion Status: {report.passedCount}/{report.totalTests} PASSED
              </span>
              <span className="mx-2" aria-hidden="true">
                ·
              </span>
              <span>Total Execution Time: {report.totalDurationMs}ms</span>
            </div>

            <button
              type="button"
              onClick={executeDiagnostics}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-sans font-semibold transition-colors ${
                highContrast
                  ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Re-run Self-Test Suite</span>
            </button>
          </div>
        )}

        {/* Assertion Rows */}
        {report && (
          <div className="divide-y divide-slate-200/80 dark:divide-slate-800 mt-2">
            {report.results.map((item) => (
              <div key={item.id} className="py-3.5 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {item.passed ? (
                      <CheckCircle2
                        className="w-4 h-4 text-emerald-600 shrink-0"
                        aria-hidden="true"
                      />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />
                    )}
                    <span className="text-xs font-mono uppercase opacity-70">{item.suite}</span>
                  </div>
                  <h3 className="text-sm font-semibold">{item.name}</h3>
                  <p className="text-xs font-mono opacity-75">Expected: {item.expected}</p>
                  <p className="text-xs font-mono opacity-90">Actual: {item.actual}</p>
                </div>

                <div className="text-right font-mono text-xs tabular-nums shrink-0">
                  <span
                    className={`font-bold ${
                      item.passed ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'
                    }`}
                  >
                    {item.passed ? 'PASS' : 'FAIL'}
                  </span>
                  <span className="block opacity-70 mt-0.5">{item.durationMs}ms</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 text-xs font-semibold rounded-lg border ${
              highContrast
                ? 'border-slate-600 text-white hover:bg-slate-800'
                : 'border-slate-300 text-slate-800 hover:bg-slate-100'
            }`}
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
}
