'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { Calendar, CheckCircle2, Clock, Plus, CircleDot } from 'lucide-react';
import type {
  EventPlanBlueprint,
  MilestonePriority,
  MilestoneStatus,
  TimelineMilestone,
} from '@/types/event';
import {
  generateICalendarFile,
  sanitizeUserInput,
  sortAndCalibrateTimeline,
} from '@/lib/utils';

interface TimelineModuleProps {
  blueprint: EventPlanBlueprint;
  highContrast: boolean;
  onUpdateTimeline: (next: TimelineMilestone[]) => void;
}

export default function TimelineModule({
  blueprint,
  highContrast,
  onUpdateTimeline,
}: TimelineModuleProps) {
  const [priorityFilter, setPriorityFilter] = useState<'all' | MilestonePriority>('all');
  const [newTitle, setNewTitle] = useState('');
  const [newDaysBefore, setNewDaysBefore] = useState('14');
  const [newTimeSlot, setNewTimeSlot] = useState('11:00 AM');
  const [newPriority, setNewPriority] = useState<MilestonePriority>('high');
  const [newOwner, setNewOwner] = useState('Lead Coordinator');
  const [formError, setFormError] = useState('');

  // Memoize chronological sorting and filtering
  const filteredTimeline = useMemo(() => {
    const sorted = sortAndCalibrateTimeline(blueprint.timeline, blueprint.context.eventDate);
    if (priorityFilter === 'all') return sorted;
    return sorted.filter((m) => m.priority === priorityFilter);
  }, [blueprint.timeline, blueprint.context.eventDate, priorityFilter]);

  const completionStats = useMemo(() => {
    const total = blueprint.timeline.length;
    const completed = blueprint.timeline.filter((m) => m.status === 'completed').length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pct };
  }, [blueprint.timeline]);

  const handleCycleStatus = useCallback(
    (milestoneId: string) => {
      const order: MilestoneStatus[] = ['upcoming', 'in_progress', 'completed'];
      const updated = blueprint.timeline.map((m) => {
        if (m.id !== milestoneId) return m;
        const nextStatus = order[(order.indexOf(m.status) + 1) % order.length];
        return { ...m, status: nextStatus };
      });
      onUpdateTimeline(updated);
    },
    [blueprint.timeline, onUpdateTimeline]
  );

  const handleAddMilestone = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const cleanTitle = sanitizeUserInput(newTitle, 90);
      if (!cleanTitle) {
        setFormError('Please enter a milestone title.');
        return;
      }
      setFormError('');
      const days = Math.max(0, Math.min(365, Number(newDaysBefore) || 14));
      const newItem: TimelineMilestone = {
        id: `ms-custom-${Date.now()}`,
        title: cleanTitle,
        description: `Scheduled ${days} days prior to ${blueprint.context.eventName}.`,
        daysBeforeEvent: days,
        dueDate: blueprint.context.eventDate,
        timeSlot: sanitizeUserInput(newTimeSlot, 20) || '10:00 AM',
        category: 'Operations',
        priority: newPriority,
        status: 'upcoming',
        owner: sanitizeUserInput(newOwner, 40) || 'Event Lead',
      };
      onUpdateTimeline(
        sortAndCalibrateTimeline([...blueprint.timeline, newItem], blueprint.context.eventDate)
      );
      setNewTitle('');
    },
    [
      newTitle,
      newDaysBefore,
      newTimeSlot,
      newPriority,
      newOwner,
      blueprint.timeline,
      blueprint.context.eventDate,
      blueprint.context.eventName,
      onUpdateTimeline,
    ]
  );

  const handleDownloadICS = useCallback(() => {
    const icsContent = generateICalendarFile(blueprint);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fete-and-folio-runsheet.ics';
    a.click();
    URL.revokeObjectURL(url);
  }, [blueprint]);

  return (
    <section
      aria-labelledby="timeline-module-heading"
      className={`rounded-xl border p-6 ${
        highContrast
          ? 'bg-slate-900 border-slate-700 text-white'
          : 'bg-white border-slate-200/90 text-slate-900'
      }`}
    >
      {/* Header & Controls */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <p className="text-xs font-medium opacity-75">
            02. Chronological Run-Sheet · Calibrated to Event Date ({blueprint.context.eventDate}) ·{' '}
            {completionStats.completed}/{completionStats.total} Completed ({completionStats.pct}%)
          </p>
          <h2
            id="timeline-module-heading"
            className="text-2xl font-bold tracking-tight mt-1"
            style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
          >
            Countdown Milestones &amp; Production Run-Sheet
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Interactive Priority Segmented Filter */}
          <div
            role="group"
            aria-label="Filter milestones by priority"
            className={`inline-flex items-center p-1 rounded-lg border text-xs ${
              highContrast ? 'bg-slate-950 border-slate-700' : 'bg-slate-100 border-slate-200'
            }`}
          >
            {(['all', 'critical', 'high', 'standard'] as const).map((prio) => (
              <button
                key={prio}
                type="button"
                onClick={() => setPriorityFilter(prio)}
                className={`px-2.5 py-1 rounded-md font-medium capitalize transition-colors whitespace-nowrap shrink-0 ${
                  priorityFilter === prio
                    ? highContrast
                      ? 'bg-amber-400 text-slate-950 font-semibold'
                      : 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                {prio}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleDownloadICS}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              highContrast
                ? 'border-amber-400 bg-amber-400 text-slate-950 hover:bg-amber-300'
                : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Download .ICS Calendar</span>
          </button>
        </div>
      </div>

      {/* Milestone List */}
      {filteredTimeline.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm opacity-75">No milestones match the selected priority filter.</p>
          <button
            type="button"
            onClick={() => setPriorityFilter('all')}
            className="mt-3 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white"
          >
            Show All Milestones
          </button>
        </div>
      ) : (
        <div className="divide-y divide-slate-200/70 dark:divide-slate-800">
          {filteredTimeline.map((ms) => {
            const isCompleted = ms.status === 'completed';
            const isInProgress = ms.status === 'in_progress';
            return (
              <div
                key={ms.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 px-2 rounded-lg transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <button
                    type="button"
                    onClick={() => handleCycleStatus(ms.id)}
                    aria-label={`Toggle status for ${ms.title} (currently ${ms.status.replace('_', ' ')})`}
                    className={`mt-0.5 p-1.5 rounded-lg border transition-colors shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : isInProgress
                        ? 'bg-amber-600 text-white border-amber-600'
                        : highContrast
                        ? 'bg-slate-950 border-slate-600 text-slate-300'
                        : 'bg-slate-50 border-slate-300 text-slate-600 hover:border-slate-900'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    ) : isInProgress ? (
                      <CircleDot className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Clock className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={`text-sm font-semibold ${
                          isCompleted ? 'line-through opacity-65' : ''
                        }`}
                      >
                        {ms.title}
                      </h3>
                    </div>
                    <p className="text-xs opacity-80 mt-0.5">{ms.description}</p>
                    {/* Unboxed Metadata with clean typographic separators */}
                    <div className="flex flex-wrap items-center gap-2 text-xs opacity-70 mt-1.5 font-mono tabular-nums">
                      <span>T-{ms.daysBeforeEvent}d</span>
                      <span aria-hidden="true">·</span>
                      <span>Due {ms.dueDate}</span>
                      <span aria-hidden="true">·</span>
                      <span>{ms.timeSlot}</span>
                      <span aria-hidden="true">·</span>
                      <span>Priority: {ms.priority.toUpperCase()}</span>
                      <span aria-hidden="true">·</span>
                      <span>Owner: {ms.owner}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCycleStatus(ms.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                      isCompleted
                        ? highContrast
                          ? 'border-emerald-400 text-emerald-300'
                          : 'border-emerald-700/30 bg-emerald-50 text-emerald-900'
                        : isInProgress
                        ? highContrast
                          ? 'border-amber-400 text-amber-300'
                          : 'border-amber-700/30 bg-amber-50 text-amber-900'
                        : highContrast
                        ? 'border-slate-600 text-slate-300'
                        : 'border-slate-200 bg-slate-100 text-slate-700'
                    }`}
                  >
                    {ms.status === 'completed'
                      ? 'Completed'
                      : ms.status === 'in_progress'
                      ? 'In Progress'
                      : 'Upcoming'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Milestone Form */}
      <form
        onSubmit={handleAddMilestone}
        className="mt-6 pt-5 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-end gap-3"
      >
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="new-ms-title" className="block text-xs font-medium mb-1">
            Add Run-Sheet Milestone
          </label>
          <input
            id="new-ms-title"
            type="text"
            placeholder="e.g., Conduct Final Accessibility & Sound Walkthrough"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className={`w-full px-3 py-2 text-xs rounded-lg border ${
              highContrast
                ? 'bg-slate-950 border-slate-600 text-white'
                : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          />
        </div>

        <div className="w-28">
          <label htmlFor="new-ms-days" className="block text-xs font-medium mb-1">
            Days Before
          </label>
          <input
            id="new-ms-days"
            type="number"
            min={0}
            max={365}
            value={newDaysBefore}
            onChange={(e) => setNewDaysBefore(e.target.value)}
            className={`w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg border ${
              highContrast
                ? 'bg-slate-950 border-slate-600 text-white'
                : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          />
        </div>

        <div className="w-28">
          <label htmlFor="new-ms-time" className="block text-xs font-medium mb-1">
            Time Slot
          </label>
          <input
            id="new-ms-time"
            type="text"
            value={newTimeSlot}
            onChange={(e) => setNewTimeSlot(e.target.value)}
            className={`w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg border ${
              highContrast
                ? 'bg-slate-950 border-slate-600 text-white'
                : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          />
        </div>

        <div className="w-32">
          <label htmlFor="new-ms-prio" className="block text-xs font-medium mb-1">
            Priority
          </label>
          <select
            id="new-ms-prio"
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value as MilestonePriority)}
            className={`w-full px-2.5 py-2 text-xs rounded-lg border ${
              highContrast
                ? 'bg-slate-950 border-slate-600 text-white'
                : 'bg-slate-50 border-slate-300 text-slate-900'
            }`}
          >
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="standard">Standard</option>
          </select>
        </div>

        <div className="w-36">
          <label htmlFor="new-ms-owner" className="block text-xs font-medium mb-1">
            Owner
          </label>
          <input
            id="new-ms-owner"
            type="text"
            value={newOwner}
            onChange={(e) => setNewOwner(e.target.value)}
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
          <span>Add Milestone</span>
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
