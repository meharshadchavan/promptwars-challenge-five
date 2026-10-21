import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type {
  BudgetCategoryItem,
  CurrencyCode,
  EventContextInput,
  EventPlanBlueprint,
  TimelineMilestone,
  VendorChecklistItem,
} from '../types/event.ts';
import { CURRENCY_CONFIG, EVENT_PRESETS, INITIAL_WEDDING_BLUEPRINT } from './constants.ts';

/**
 * Merges Tailwind CSS classes deterministically.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Sanitizes untrusted user input against XSS (<script>, HTML tags, event handlers, control chars)
 * and neutralizes prompt-injection override phrases.
 */
export function sanitizeUserInput(rawInput: string, maxLength = 600): string {
  if (!rawInput || typeof rawInput !== 'string') {
    return '';
  }

  let cleaned = rawInput
    // Remove <script>...</script> blocks completely
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove inline event handlers like onerror=, onclick=, onload=
    .replace(/\bon\w+\s*=\s*(['"][^'"]*['"]|[^\s>]+)/gi, '')
    // Remove javascript: or data:text/html protocols
    .replace(/(?:javascript|data:text\/html)\s*:/gi, '')
    // Strip all remaining HTML tags
    .replace(/<\/?[^>]+(>|$)/g, '')
    // Strip ASCII control characters except standard whitespace (\n, \r, \t)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Prevent XML delimiter breakout from <user_event_context>
    .replace(/<\/?user_event_context>/gi, '')
    .replace(/<\/?system_instruction>/gi, '');

  // Neutralize common prompt injection override commands so they are treated as inert text
  cleaned = cleaned.replace(
    /ignore\s+(all\s+)?(previous|prior|above|system)\s+(instructions|prompts|rules)/gi,
    '[filtered-override-attempt]'
  );

  return cleaned.trim().slice(0, maxLength);
}

/**
 * Wraps sanitized user context inside strict XML delimiters for prompt injection defense.
 */
export function buildIsolatedUserPrompt(context: EventContextInput): string {
  const safeName = sanitizeUserInput(context.eventName, 120);
  const safeLocation = sanitizeUserInput(context.location, 120);
  const safeCultural = sanitizeUserInput(context.culturalContext, 300);
  const safeCustom = sanitizeUserInput(context.customPrompt, 400);
  const safeTags = context.inclusivityTags.map((t) => sanitizeUserInput(t, 40)).join(', ');

  return [
    '<user_event_context>',
    `  <event_type>${context.eventType}</event_type>`,
    `  <event_name>${safeName}</event_name>`,
    `  <event_date>${ sanitizeUserInput(context.eventDate, 20) }</event_date>`,
    `  <guest_count>${Math.max(1, Math.min(100000, Math.round(context.guestCount || 50)))}</guest_count>`,
    `  <total_budget_cap>${Math.max(100, Math.round(context.totalBudget || 5000))}</total_budget_cap>`,
    `  <currency>${context.currency}</currency>`,
    `  <location>${safeLocation}</location>`,
    `  <cultural_context>${safeCultural}</cultural_context>`,
    `  <inclusivity_and_dietary_tags>${safeTags}</inclusivity_and_dietary_tags>`,
    `  <custom_notes>${safeCustom}</custom_notes>`,
    '</user_event_context>',
  ].join('\n');
}

/**
 * Computes a fast, deterministic FNV-1a 32-bit hex hash from an EventContextInput
 * for O(1) cache lookups in memory and localStorage.
 */
export function computeDeterministicHash(context: EventContextInput): string {
  const canonical = JSON.stringify({
    t: context.eventType,
    n: sanitizeUserInput(context.eventName).toLowerCase(),
    d: context.eventDate,
    g: Math.round(context.guestCount),
    b: Math.round(context.totalBudget),
    c: sanitizeUserInput(context.culturalContext).toLowerCase(),
    i: [...context.inclusivityTags].sort(),
    p: sanitizeUserInput(context.customPrompt).toLowerCase(),
  });

  let hash = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnf_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

/**
 * Normalizes and rebalances budget categories so that:
 * 1. Contingency buffer is strictly clamped between 5% and 10%.
 * 2. All category percentages sum to exactly 100%.
 * 3. Planned amounts never exceed totalBudget and handle zero-budget edge cases without NaN/Infinity.
 */
export function normalizeBudgetAllocations(
  categories: BudgetCategoryItem[],
  totalBudget: number,
  lockedCategoryId?: string,
  newLockedPercentage?: number
): BudgetCategoryItem[] {
  const safeBudget = Number.isFinite(totalBudget) && totalBudget > 0 ? totalBudget : 0;
  if (!categories || categories.length === 0) {
    return [
      {
        id: 'cat-default-main',
        name: 'Core Event Operations',
        percentage: 92,
        plannedAmount: Math.round(safeBudget * 0.92),
        actualSpent: 0,
        notes: 'Primary event allocation',
      },
      {
        id: 'cat-contingency',
        name: 'Emergency Contingency Buffer',
        percentage: 8,
        plannedAmount: Math.round(safeBudget * 0.08),
        actualSpent: 0,
        isContingency: true,
        notes: 'Mandatory 5-10% reserve',
      },
    ];
  }

  const working = categories.map((item) => ({
    ...item,
    percentage: Number.isFinite(item.percentage) ? Math.max(1, item.percentage) : 10,
  }));

  // Ensure a contingency category exists and stays within [5, 10]%
  let contingencyIdx = working.findIndex(
    (c) => c.isContingency || /contingency|buffer|emergency/i.test(c.name)
  );
  if (contingencyIdx === -1) {
    working.push({
      id: 'cat-contingency',
      name: 'Emergency Contingency Buffer',
      percentage: 8,
      plannedAmount: 0,
      actualSpent: 0,
      isContingency: true,
      notes: 'Mandatory 5–10% emergency contingency buffer.',
    });
    contingencyIdx = working.length - 1;
  } else {
    working[contingencyIdx].isContingency = true;
  }

  // If the user adjusted a specific category, apply that first
  if (lockedCategoryId && typeof newLockedPercentage === 'number' && Number.isFinite(newLockedPercentage)) {
    const targetIdx = working.findIndex((c) => c.id === lockedCategoryId);
    if (targetIdx !== -1) {
      if (working[targetIdx].isContingency) {
        working[targetIdx].percentage = Math.min(10, Math.max(5, Math.round(newLockedPercentage)));
      } else {
        working[targetIdx].percentage = Math.min(85, Math.max(2, Math.round(newLockedPercentage)));
      }
    }
  }

  // Clamp contingency strictly to [5%, 10%]
  working[contingencyIdx].percentage = Math.min(
    10,
    Math.max(5, Math.round(working[contingencyIdx].percentage))
  );

  const contingencyPct = working[contingencyIdx].percentage;
  const lockedIdx = lockedCategoryId ? working.findIndex((c) => c.id === lockedCategoryId) : -1;

  // Adjustable indices are non-contingency and non-locked
  const adjustableIndices = working
    .map((_, idx) => idx)
    .filter((idx) => idx !== contingencyIdx && idx !== lockedIdx);

  if (adjustableIndices.length > 0) {
    const fixedSum =
      contingencyPct + (lockedIdx !== -1 && lockedIdx !== contingencyIdx ? working[lockedIdx].percentage : 0);
    const remainingTarget = Math.max(adjustableIndices.length, 100 - fixedSum);

    // If locked category pushed fixedSum > 100 - adjustableIndices.length, clamp locked category
    if (lockedIdx !== -1 && lockedIdx !== contingencyIdx && fixedSum > 100 - adjustableIndices.length) {
      working[lockedIdx].percentage = Math.max(2, 100 - contingencyPct - adjustableIndices.length);
    }

    const effectiveFixedSum =
      contingencyPct + (lockedIdx !== -1 && lockedIdx !== contingencyIdx ? working[lockedIdx].percentage : 0);
    const poolToDistribute = Math.max(0, 100 - effectiveFixedSum);

    const currentAdjustableSum = adjustableIndices.reduce((acc, idx) => acc + working[idx].percentage, 0);

    let runningSum = effectiveFixedSum;
    adjustableIndices.forEach((idx, pos) => {
      if (pos === adjustableIndices.length - 1) {
        working[idx].percentage = Math.max(1, 100 - runningSum);
      } else {
        const ratio =
          currentAdjustableSum > 0
            ? working[idx].percentage / currentAdjustableSum
            : 1 / adjustableIndices.length;
        const share = Math.max(1, Math.round(poolToDistribute * ratio));
        working[idx].percentage = share;
        runningSum += share;
      }
    });
  }

  // Final pass to guarantee exact 100% sum and exact totalBudget alignment
  const totalPct = working.reduce((acc, c) => acc + c.percentage, 0);
  if (totalPct !== 100) {
    const fallbackIdx = working.findIndex((_, idx) => idx !== contingencyIdx);
    if (fallbackIdx !== -1) {
      working[fallbackIdx].percentage += 100 - totalPct;
    }
  }

  let runningPlanned = 0;
  return working.map((item, idx) => {
    const isLast = idx === working.length - 1;
    const plannedAmount =
      safeBudget === 0
        ? 0
        : isLast
        ? Math.max(0, Math.round(safeBudget - runningPlanned))
        : Math.round((safeBudget * item.percentage) / 100);
    runningPlanned += plannedAmount;

    return {
      ...item,
      plannedAmount,
      actualSpent: Number.isFinite(item.actualSpent) ? Math.max(0, Math.round(item.actualSpent)) : 0,
    };
  });
}

/**
 * Computes budget summary metrics safely without zero-division errors.
 */
export function calculateBudgetSummary(categories: BudgetCategoryItem[], totalBudget: number) {
  const safeBudget = Number.isFinite(totalBudget) && totalBudget > 0 ? totalBudget : 0;
  const totalPlanned = categories.reduce((sum, c) => sum + (c.plannedAmount || 0), 0);
  const totalActual = categories.reduce((sum, c) => sum + (c.actualSpent || 0), 0);
  const percentageSum = categories.reduce((sum, c) => sum + (c.percentage || 0), 0);
  const contingencyItem = categories.find((c) => c.isContingency);
  const contingencyPct = contingencyItem ? contingencyItem.percentage : 0;

  const varianceAmount = safeBudget - totalActual;
  const utilizationPct = safeBudget > 0 ? Number(((totalActual / safeBudget) * 100).toFixed(1)) : 0;
  const variancePct = safeBudget > 0 ? Number(((varianceAmount / safeBudget) * 100).toFixed(1)) : 0;

  return {
    totalBudget: safeBudget,
    totalPlanned,
    totalActual,
    percentageSum,
    contingencyPct,
    varianceAmount,
    utilizationPct,
    variancePct,
    isOverBudget: totalActual > safeBudget,
    isValidAllocation: percentageSum === 100 && contingencyPct >= 5 && contingencyPct <= 10,
  };
}

/**
 * Converts a USD base amount into the target currency and formats it with tabular-friendly numerals.
 */
export function formatCurrencyAmount(
  amountInUSD: number,
  currency: CurrencyCode,
  convertFromUSD = true
): string {
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD;
  const safeVal = Number.isFinite(amountInUSD) ? amountInUSD : 0;
  const converted = convertFromUSD ? safeVal * config.rateFromUSD : safeVal;

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Math.round(converted));
}

/**
 * Calculates days remaining between reference date and event date, and sorts milestones chronologically.
 */
export function sortAndCalibrateTimeline(
  milestones: TimelineMilestone[],
  eventDateStr: string,
  referenceDateStr = '2026-10-20'
): TimelineMilestone[] {
  const eventTime = Date.parse(eventDateStr);
  const refTime = Date.parse(referenceDateStr);
  const validEventTime = Number.isFinite(eventTime) ? eventTime : refTime + 60 * 86400000;
  const totalDaysAvailable = Math.max(
    1,
    Math.round((validEventTime - (Number.isFinite(refTime) ? refTime : Date.now())) / 86400000)
  );

  return [...milestones]
    .map((m) => {
      // Scale daysBeforeEvent realistically so it never exceeds totalDaysAvailable
      const scaledDaysBefore = Math.min(totalDaysAvailable, Math.max(0, Math.round(m.daysBeforeEvent)));
      const dueTime = validEventTime - scaledDaysBefore * 86400000;
      const dueDate = new Date(dueTime).toISOString().slice(0, 10);
      return {
        ...m,
        daysBeforeEvent: scaledDaysBefore,
        dueDate,
      };
    })
    .sort((a, b) => b.daysBeforeEvent - a.daysBeforeEvent);
}

/**
 * Generates an RFC 5545 compliant .ics calendar string for all timeline milestones.
 */
export function generateICalendarFile(blueprint: EventPlanBlueprint): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fete & Folio//Celebration Event Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const ms of blueprint.timeline) {
    const cleanDate = ms.dueDate.replace(/-/g, '');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${ms.id}@feteandfolio.app`,
      `DTSTAMP:20261020T120000Z`,
      `DTSTART;VALUE=DATE:${cleanDate}`,
      `SUMMARY:${sanitizeUserInput(ms.title, 100)} (${sanitizeUserInput(blueprint.context.eventName, 60)})`,
      `DESCRIPTION:${sanitizeUserInput(ms.description, 200)} [Priority: ${ms.priority.toUpperCase()}]`,
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Generates a CSV export string for the active budget breakdown.
 */
export function generateBudgetCSV(
  categories: BudgetCategoryItem[],
  currency: CurrencyCode
): string {
  const rate = CURRENCY_CONFIG[currency]?.rateFromUSD ?? 1;
  const headers = [
    'Category',
    'Allocation (%)',
    `Planned (${currency})`,
    `Actual Spent (${currency})`,
    `Variance (${currency})`,
    'Contingency Buffer',
    'Notes',
  ];

  const rows = categories.map((c) => {
    const planned = Math.round(c.plannedAmount * rate);
    const actual = Math.round(c.actualSpent * rate);
    const variance = planned - actual;
    return [
      `"${c.name.replace(/"/g, '""')}"`,
      c.percentage.toString(),
      planned.toString(),
      actual.toString(),
      variance.toString(),
      c.isContingency ? 'YES' : 'NO',
      `"${(c.notes || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Validates and repairs an untrusted JSON object into a strict EventPlanBlueprint.
 * Returns null if critical fields cannot be recovered.
 */
export function validateAndRepairBlueprint(
  raw: unknown,
  context: EventContextInput
): EventPlanBlueprint | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const candidate = raw as Record<string, unknown>;
  if (!Array.isArray(candidate.budgetBreakdown) || !Array.isArray(candidate.timeline) || !Array.isArray(candidate.vendors)) {
    return null;
  }

  const rawCategories: BudgetCategoryItem[] = candidate.budgetBreakdown
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, idx) => ({
      id: typeof item.id === 'string' && item.id ? item.id : `cat-ai-${idx}`,
      name: sanitizeUserInput(String(item.name || `Category ${idx + 1}`), 80),
      percentage: Number(item.percentage) || 15,
      plannedAmount: Number(item.plannedAmount) || 0,
      actualSpent: Number(item.actualSpent) || 0,
      isContingency: Boolean(item.isContingency) || /contingency|buffer|emergency/i.test(String(item.name || '')),
      notes: sanitizeUserInput(String(item.notes || ''), 180),
    }));

  if (rawCategories.length < 2) {
    return null;
  }

  const normalizedBudget = normalizeBudgetAllocations(rawCategories, context.totalBudget);

  const rawTimeline: TimelineMilestone[] = candidate.timeline
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, idx) => ({
      id: typeof item.id === 'string' && item.id ? item.id : `ms-ai-${idx}`,
      title: sanitizeUserInput(String(item.title || `Milestone ${idx + 1}`), 100),
      description: sanitizeUserInput(String(item.description || ''), 220),
      daysBeforeEvent: Number.isFinite(Number(item.daysBeforeEvent)) ? Number(item.daysBeforeEvent) : (5 - idx) * 10,
      dueDate: typeof item.dueDate === 'string' ? item.dueDate : context.eventDate,
      timeSlot: sanitizeUserInput(String(item.timeSlot || '10:00 AM'), 20),
      category: sanitizeUserInput(String(item.category || 'Operations'), 40),
      priority:
        item.priority === 'critical' || item.priority === 'high' || item.priority === 'standard'
          ? item.priority
          : 'high',
      status:
        item.status === 'completed' || item.status === 'in_progress' || item.status === 'upcoming'
          ? item.status
          : 'upcoming',
      owner: sanitizeUserInput(String(item.owner || 'Event Lead'), 50),
    }));

  const sortedTimeline = sortAndCalibrateTimeline(rawTimeline, context.eventDate);

  const rawVendors: VendorChecklistItem[] = candidate.vendors
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item, idx) => {
      const statusVal =
        item.status === 'researching' ||
        item.status === 'shortlisted' ||
        item.status === 'contracted' ||
        item.status === 'paid'
          ? item.status
          : 'shortlisted';
      return {
        id: typeof item.id === 'string' && item.id ? item.id : `vnd-ai-${idx}`,
        category: sanitizeUserInput(String(item.category || 'Services'), 50),
        vendorName: sanitizeUserInput(String(item.vendorName || `Recommended Partner ${idx + 1}`), 80),
        status: statusVal,
        estimatedCost: Math.max(0, Math.round(Number(item.estimatedCost) || context.totalBudget * 0.15)),
        amountPaid: Math.max(0, Math.round(Number(item.amountPaid) || 0)),
        contactEmail: sanitizeUserInput(String(item.contactEmail || 'concierge@vendor.example.com'), 80),
        inclusivityNotes: sanitizeUserInput(
          String(item.inclusivityNotes || 'Verified for guest accessibility and dietary compliance.'),
          180
        ),
        vettingQuestions: Array.isArray(item.vettingQuestions)
          ? item.vettingQuestions.map((q) => sanitizeUserInput(String(q), 160)).slice(0, 4)
          : [
              'What is your contingency protocol if primary staff or equipment is unavailable?',
              'Are all dietary and accessibility accommodations included without surcharge?',
            ],
      };
    });

  const rawIdeas = (candidate.ideas && typeof candidate.ideas === 'object'
    ? candidate.ideas
    : {}) as Record<string, unknown>;

  const fallbackBlueprint = generateDeterministicFallbackBlueprint(context);

  return {
    context,
    budgetBreakdown: normalizedBudget,
    timeline: sortedTimeline.length > 0 ? sortedTimeline : fallbackBlueprint.timeline,
    vendors: rawVendors.length > 0 ? rawVendors : fallbackBlueprint.vendors,
    ideas: {
      themeName: sanitizeUserInput(String(rawIdeas.themeName || fallbackBlueprint.ideas.themeName), 90),
      themeConcept: sanitizeUserInput(String(rawIdeas.themeConcept || fallbackBlueprint.ideas.themeConcept), 320),
      culturalNuanceSummary: sanitizeUserInput(
        String(rawIdeas.culturalNuanceSummary || fallbackBlueprint.ideas.culturalNuanceSummary),
        320
      ),
      budgetTierNote: sanitizeUserInput(
        String(rawIdeas.budgetTierNote || fallbackBlueprint.ideas.budgetTierNote),
        200
      ),
      colorPalette:
        Array.isArray(rawIdeas.colorPalette) && rawIdeas.colorPalette.length > 0
          ? rawIdeas.colorPalette.slice(0, 5).map((swatch: unknown, i: number) => {
              const s = (swatch && typeof swatch === 'object' ? swatch : {}) as Record<string, unknown>;
              return {
                name: sanitizeUserInput(String(s.name || `Tone ${i + 1}`), 40),
                hex: /^#[0-9A-Fa-f]{6}$/.test(String(s.hex || '')) ? String(s.hex) : '#2D4A3E',
                usage: sanitizeUserInput(String(s.usage || 'Accent surface'), 60),
              };
            })
          : fallbackBlueprint.ideas.colorPalette,
      curatedMenu:
        Array.isArray(rawIdeas.curatedMenu) && rawIdeas.curatedMenu.length > 0
          ? rawIdeas.curatedMenu.slice(0, 5).map((course: unknown, i: number) => {
              const c = (course && typeof course === 'object' ? course : {}) as Record<string, unknown>;
              return {
                courseType: sanitizeUserInput(String(c.courseType || `Course ${i + 1}`), 40),
                dishName: sanitizeUserInput(String(c.dishName || 'Artisanal Seasonal Plate'), 80),
                description: sanitizeUserInput(String(c.description || ''), 180),
                dietaryTags: Array.isArray(c.dietaryTags)
                  ? c.dietaryTags.map((t) => sanitizeUserInput(String(t), 30))
                  : context.inclusivityTags,
                perPersonEstimate: Math.max(5, Math.round(Number(c.perPersonEstimate) || 25)),
              };
            })
          : fallbackBlueprint.ideas.curatedMenu,
      signatureActivities:
        Array.isArray(rawIdeas.signatureActivities) && rawIdeas.signatureActivities.length > 0
          ? rawIdeas.signatureActivities.slice(0, 4).map((act: unknown, i: number) => {
              const a = (act && typeof act === 'object' ? act : {}) as Record<string, unknown>;
              return {
                id: `act-ai-${i}`,
                title: sanitizeUserInput(String(a.title || `Guest Experience ${i + 1}`), 80),
                timing: sanitizeUserInput(String(a.timing || 'Evening Session'), 40),
                description: sanitizeUserInput(String(a.description || ''), 200),
                accessibilityAdaptation: sanitizeUserInput(
                  String(a.accessibilityAdaptation || 'Step-free seating and low-sensory option available.'),
                  160
                ),
                estimatedCost: Math.max(0, Math.round(Number(a.estimatedCost) || 500)),
              };
            })
          : fallbackBlueprint.ideas.signatureActivities,
    },
    generatedAt: new Date().toISOString(),
    source: 'ai',
    cacheHash: computeDeterministicHash(context),
  };
}

/**
 * Offline deterministic fallback generator that produces a rich, realistic,
 * budget-compliant EventPlanBlueprint tailored to the user's event type, budget cap,
 * event date, and inclusivity tags when offline or if the API quota is unavailable.
 */
export function generateDeterministicFallbackBlueprint(
  inputContext?: Partial<EventContextInput>
): EventPlanBlueprint {
  const eventType = inputContext?.eventType || 'wedding';
  const basePreset = EVENT_PRESETS[eventType] || EVENT_PRESETS.wedding;

  const context: EventContextInput = {
    ...basePreset,
    ...inputContext,
    eventName: sanitizeUserInput(inputContext?.eventName || basePreset.eventName, 120),
    location: sanitizeUserInput(inputContext?.location || basePreset.location, 120),
    culturalContext: sanitizeUserInput(inputContext?.culturalContext || basePreset.culturalContext, 300),
    customPrompt: sanitizeUserInput(inputContext?.customPrompt || basePreset.customPrompt, 400),
    guestCount: Math.max(1, Math.round(Number(inputContext?.guestCount ?? basePreset.guestCount))),
    totalBudget: Math.max(100, Math.round(Number(inputContext?.totalBudget ?? basePreset.totalBudget))),
    inclusivityTags:
      inputContext?.inclusivityTags && inputContext.inclusivityTags.length > 0
        ? inputContext.inclusivityTags
        : basePreset.inclusivityTags,
  };

  const hash = computeDeterministicHash(context);
  const perGuestBudget = Math.round(context.totalBudget / Math.max(1, context.guestCount));
  const tagSummary =
    context.inclusivityTags.length > 0
      ? context.inclusivityTags.join(', ')
      : 'Wheelchair Accessible, Vegan, Gluten-Free';

  if (eventType === 'birthday') {
    const budget = normalizeBudgetAllocations(
      [
        {
          id: 'bday-venue',
          name: 'Private Atrium Venue & Lounge Zoning',
          percentage: 26,
          plannedAmount: 0,
          actualSpent: Math.round(context.totalBudget * 0.24),
          notes: 'Includes step-free conservatory access and sensory-friendly acoustic lounge.',
        },
        {
          id: 'bday-culinary',
          name: `Tasting Menu & Botanical Bar (${tagSummary})`,
          percentage: 34,
          plannedAmount: 0,
          actualSpent: Math.round(context.totalBudget * 0.31),
          notes: 'Multi-course grazing stations with dedicated allergen-free prep.',
        },
        {
          id: 'bday-music',
          name: 'Vinyl Salon, Lighting & Experiential Entertainment',
          percentage: 16,
          plannedAmount: 0,
          actualSpent: Math.round(context.totalBudget * 0.14),
          notes: 'Warm dimmable architectural uplighting and vinyl listening booth.',
        },
        {
          id: 'bday-decor',
          name: 'Bespoke Table Scenography & Keepsake Print Studio',
          percentage: 16,
          plannedAmount: 0,
          actualSpent: Math.round(context.totalBudget * 0.12),
          notes: 'Tactile letterpress menus and custom portrait folio.',
        },
        {
          id: 'cat-contingency',
          name: 'Emergency Contingency Buffer',
          percentage: 8,
          plannedAmount: 0,
          actualSpent: 0,
          isContingency: true,
          notes: 'Protected 8% buffer for guest count variance and late-night transport.',
        },
      ],
      context.totalBudget
    );

    return {
      context,
      budgetBreakdown: budget,
      timeline: sortAndCalibrateTimeline(
        [
          {
            id: 'bday-ms-1',
            title: 'Reserve Glasshouse Atrium & Acoustic Decibel Zoning',
            description: 'Confirm private terrace layout and quiet sensory lounge seating.',
            daysBeforeEvent: 45,
            dueDate: context.eventDate,
            timeSlot: '11:00 AM',
            category: 'Venue',
            priority: 'critical',
            status: 'completed',
            owner: 'Host Lead',
          },
          {
            id: 'bday-ms-2',
            title: `Approve Inclusive Menu & Zero-Proof Alchemy (${tagSummary})`,
            description: 'Finalize dish allergen typography and nut-free/vegan dessert tiers.',
            daysBeforeEvent: 21,
            dueDate: context.eventDate,
            timeSlot: '03:00 PM',
            category: 'Culinary',
            priority: 'critical',
            status: 'in_progress',
            owner: 'Catering Chef',
          },
          {
            id: 'bday-ms-3',
            title: 'Curate Vinyl Setlist & Tactile Guestbook Station',
            description: 'Deliver curated LP crates and instant medium-format film cameras.',
            daysBeforeEvent: 7,
            dueDate: context.eventDate,
            timeSlot: '05:00 PM',
            category: 'Experience',
            priority: 'high',
            status: 'upcoming',
            owner: 'Creative Producer',
          },
        ],
        context.eventDate
      ),
      vendors: [
        {
          id: 'bday-vnd-1',
          category: 'Venue & Lounge',
          vendorName: 'Solstice Conservatory & Terrace',
          status: 'contracted',
          estimatedCost: Math.round(context.totalBudget * 0.26),
          amountPaid: Math.round(context.totalBudget * 0.15),
          contactEmail: 'concierge@solsticeatrium.example.com',
          inclusivityNotes: `Compliant with ${tagSummary}; dimmable warm lighting throughout.`,
          vettingQuestions: [
            'Is there a dedicated quiet room adjacent to the main dining atrium?',
            'Are elevator and step-free entries unlocked for the entire evening?',
          ],
        },
        {
          id: 'bday-vnd-2',
          category: 'Culinary & Mixology',
          vendorName: 'Verdure & Wildflower Table',
          status: 'shortlisted',
          estimatedCost: Math.round(context.totalBudget * 0.34),
          amountPaid: Math.round(context.totalBudget * 0.1),
          contactEmail: 'chefs@verduretable.example.com',
          inclusivityNotes: `100% nut-free kitchen with labeled ${tagSummary} tasting plates.`,
          vettingQuestions: [
            'Can every cocktail be poured as an equally complex botanical zero-proof pairing?',
            'How are allergen-free courses plated and served to avoid mix-ups?',
          ],
        },
      ],
      ideas: {
        themeName: 'Midnight Botanical & Analog Vinyl Salon',
        themeConcept:
          'An intimate candlelit conservatory evening pairing tactile analog music, botanical gastronomy, and warm conversation zones.',
        culturalNuanceSummary: `Tailored for ${context.culturalContext} with explicit adaptations for ${tagSummary}.`,
        budgetTierNote: `Engineered for a $${context.totalBudget.toLocaleString()} cap (~$${perGuestBudget}/guest for ${context.guestCount} guests) with an 8% contingency reserve.`,
        colorPalette: [
          { name: 'Deep Espresso', hex: '#1E1B18', usage: 'Vinyl lounge & menu folio covers' },
          { name: 'Botanical Sage', hex: '#4A6B5D', usage: 'Glasshouse foliage & table runners' },
          { name: 'Warm Amber', hex: '#D48C46', usage: 'Candlelight & glassware accents' },
          { name: 'Alabaster Paper', hex: '#F6F3EC', usage: 'Tactile letterpress place cards' },
        ],
        curatedMenu: [
          {
            courseType: 'Welcome Pour',
            dishName: 'Smoked Rosemary & Yuzu Botanical Elixir',
            description: 'Zero-proof distillate with charred citrus peel and sea-salt olive crisps.',
            dietaryTags: context.inclusivityTags,
            perPersonEstimate: Math.max(10, Math.round(perGuestBudget * 0.1)),
          },
          {
            courseType: 'Shared Table',
            dishName: 'Truffle Polenta Medallions & Roasted Heirloom Squash',
            description: 'Finished with crispy sage, pomegranate molasses, and toasted pumpkin seeds.',
            dietaryTags: context.inclusivityTags,
            perPersonEstimate: Math.max(22, Math.round(perGuestBudget * 0.28)),
          },
        ],
        signatureActivities: [
          {
            id: 'bday-act-1',
            title: 'Curated Vinyl Request & Liner-Note Dedication Wall',
            timing: '07:30 PM — Lounge Hour',
            description:
              'Guests select records from milestone years of the guest of honor and inscribe custom sleeve notes.',
            accessibilityAdaptation: 'Accessible 32-inch browsing racks and acoustic headphone listening pods.',
            estimatedCost: Math.round(context.totalBudget * 0.05),
          },
        ],
      },
      generatedAt: new Date().toISOString(),
      source: 'deterministic_fallback',
      cacheHash: hash,
      latencyMs: 0,
    };
  }

  if (eventType === 'community') {
    const budget = normalizeBudgetAllocations(
      [
        {
          id: 'comm-staging',
          name: 'Civic Permits, ADA Staging & Wayfinding',
          percentage: 27,
          plannedAmount: 0,
          actualSpent: Math.round(context.totalBudget * 0.25),
          notes: 'Includes municipal park permits, wheelchair ramps, and clear high-contrast signage.',
        },
        {
          id: 'comm-catering',
          name: `Community Kitchens & Zero-Waste Refreshments (${tagSummary})`,
          percentage: 31,
          plannedAmount: 0,
          actualSpent: Math.round(context.totalBudget * 0.28),
          notes: 'Compostable serviceware and clearly labeled Halal, Vegan, and allergen-safe booths.',
        },
        {
          id: 'comm-av',
          name: 'PA System, ASL Interpretation & Sensory Tent',
          percentage: 18,
          plannedAmount: 0,
          actualSpent: Math.round(context.totalBudget * 0.16),
          notes: 'Dedicated ASL interpreters on main stage and calm decompression tent.',
        },
        {
          id: 'comm-workshops',
          name: 'Artisan Booths & Youth Cultural Workshops',
          percentage: 14,
          plannedAmount: 0,
          actualSpent: Math.round(context.totalBudget * 0.12),
          notes: 'Supplies for collaborative neighborhood lantern and mural making.',
        },
        {
          id: 'cat-contingency',
          name: 'Emergency Contingency Buffer',
          percentage: 10,
          plannedAmount: 0,
          actualSpent: 0,
          isContingency: true,
          notes: 'Mandatory 10% civic safety, first-aid, and weather tenting reserve.',
        },
      ],
      context.totalBudget
    );

    return {
      context,
      budgetBreakdown: budget,
      timeline: sortAndCalibrateTimeline(
        [
          {
            id: 'comm-ms-1',
            title: 'Submit Municipal Park Permit & ADA Mobility Map',
            description: 'File civic assembly permit, first-aid station map, and step-free route layout.',
            daysBeforeEvent: 35,
            dueDate: context.eventDate,
            timeSlot: '09:00 AM',
            category: 'Civic & Safety',
            priority: 'critical',
            status: 'completed',
            owner: 'Civic Liaison',
          },
          {
            id: 'comm-ms-2',
            title: `Confirm Multicultural Food Vendors & ${tagSummary} Audits`,
            description: 'Verify health permits, compostable packaging, and dietary labeling.',
            daysBeforeEvent: 18,
            dueDate: context.eventDate,
            timeSlot: '01:00 PM',
            category: 'Community Vendors',
            priority: 'critical',
            status: 'in_progress',
            owner: 'Vendor Coordinator',
          },
          {
            id: 'comm-ms-3',
            title: 'Stage ASL Interpreter Briefing & Sensory Tent Setup',
            description: 'Check sightlines for ASL stage zone and stock sensory tent with noise-reducing headsets.',
            daysBeforeEvent: 3,
            dueDate: context.eventDate,
            timeSlot: '10:00 AM',
            category: 'Accessibility',
            priority: 'high',
            status: 'upcoming',
            owner: 'Inclusion Lead',
          },
        ],
        context.eventDate
      ),
      vendors: [
        {
          id: 'comm-vnd-1',
          category: 'Staging & Accessibility',
          vendorName: 'CivicStage & Mobility Solutions',
          status: 'contracted',
          estimatedCost: Math.round(context.totalBudget * 0.27),
          amountPaid: Math.round(context.totalBudget * 0.2),
          contactEmail: 'ops@civicstage.example.com',
          inclusivityNotes: 'Provides ADA stage ramps, cable matting, and sensory sanctuary tent.',
          vettingQuestions: [
            'Do all ground cable ramps meet ADA wheelchair slope specifications?',
            'What is the wind-load rating on the community pavilion canopies?',
          ],
        },
        {
          id: 'comm-vnd-2',
          category: 'Community Catering Collective',
          vendorName: 'Commons Harvest Kitchens',
          status: 'shortlisted',
          estimatedCost: Math.round(context.totalBudget * 0.31),
          amountPaid: Math.round(context.totalBudget * 0.1),
          contactEmail: 'collective@commonsharvest.example.com',
          inclusivityNotes: `Certified ${tagSummary} stalls with pictographic ingredient boards.`,
          vettingQuestions: [
            'How do you maintain high-throughput service for 450+ neighbors without plastic waste?',
            'Are Halal and Vegan prep stations physically separated with dedicated utensils?',
          ],
        },
      ],
      ideas: {
        themeName: 'Lanterns on the Commons: A Multicultural Harvest',
        themeConcept:
          'An open-air civic festival uniting neighborhood artisans, multigenerational storytelling, and zero-waste community dining tables.',
        culturalNuanceSummary: `Designed for ${context.culturalContext} with universal access (${tagSummary}).`,
        budgetTierNote: `Allocated strictly within $${context.totalBudget.toLocaleString()} (~$${perGuestBudget}/attendee across ${context.guestCount} attendees) with a 10% safety contingency.`,
        colorPalette: [
          { name: 'Harvest Ochre', hex: '#C87D28', usage: 'Wayfinding banners & lantern canopies' },
          { name: 'Civic Pine', hex: '#1F4E43', usage: 'Stage backdrop & volunteer aprons' },
          { name: 'Warm Sand', hex: '#F3EFE6', usage: 'Accessible map kiosks & signage' },
          { name: 'Indigo Dusk', hex: '#283655', usage: 'Evening amphitheater lighting' },
        ],
        curatedMenu: [
          {
            courseType: 'Street Commons Bowl',
            dishName: 'Spiced Chickpea, Roasted Sweet Potato & Tahini Harvest Bowl',
            description: 'Served in compostable palm-leaf bowls with herb flatbread.',
            dietaryTags: context.inclusivityTags,
            perPersonEstimate: Math.max(8, Math.round(perGuestBudget * 0.25)),
          },
          {
            courseType: 'Warm Beverage Station',
            dishName: 'Mulled Apple Cider & Cardamom Oat Karak Chai',
            description: 'Simmered in copper urns with cinnamon and star anise.',
            dietaryTags: context.inclusivityTags,
            perPersonEstimate: Math.max(4, Math.round(perGuestBudget * 0.1)),
          },
        ],
        signatureActivities: [
          {
            id: 'comm-act-1',
            title: 'Intergenerational Paper Lantern & Story Weaving Workshop',
            timing: '04:00 PM — Plaza Tent',
            description:
              'Neighbors and youth craft illuminated bamboo-paper lanterns inscribed with family heritage stories.',
            accessibilityAdaptation: 'ASL-interpreted instructions, tactile templates, and wheelchair-height benches.',
            estimatedCost: Math.round(context.totalBudget * 0.06),
          },
        ],
      },
      generatedAt: new Date().toISOString(),
      source: 'deterministic_fallback',
      cacheHash: hash,
      latencyMs: 0,
    };
  }

  // Default: Wedding blueprint calibrated to the user's exact totalBudget and eventDate
  const rebalancedWeddingBudget = normalizeBudgetAllocations(
    INITIAL_WEDDING_BLUEPRINT.budgetBreakdown.map((c) => ({
      ...c,
      actualSpent: Math.round((context.totalBudget * c.percentage * 0.85) / 100),
    })),
    context.totalBudget
  );

  return {
    ...INITIAL_WEDDING_BLUEPRINT,
    context,
    budgetBreakdown: rebalancedWeddingBudget,
    timeline: sortAndCalibrateTimeline(INITIAL_WEDDING_BLUEPRINT.timeline, context.eventDate),
    cacheHash: hash,
    generatedAt: new Date().toISOString(),
  };
}
