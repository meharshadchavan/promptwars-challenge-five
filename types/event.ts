/**
 * Strict TypeScript domain definitions for Fête & Folio Celebration & Event Planner.
 * Enforces type safety across Budget, Timeline, Vendor, Idea Studio, Accessibility, and Diagnostics modules.
 */

export type EventCategoryType = 'wedding' | 'birthday' | 'community';

export type CurrencyCode = 'USD' | 'INR' | 'EUR' | 'GBP';

export type DietaryTag =
  | 'Wheelchair Accessible'
  | 'Sensory-Friendly'
  | 'Jain'
  | 'Vegan'
  | 'Halal'
  | 'Gluten-Free'
  | 'Kosher'
  | 'Nut-Free';

export type MilestonePriority = 'critical' | 'high' | 'standard';
export type MilestoneStatus = 'completed' | 'in_progress' | 'upcoming';

export type VendorStatus = 'researching' | 'shortlisted' | 'contracted' | 'paid';

export interface BudgetCategoryItem {
  id: string;
  name: string;
  percentage: number; // Must sum to 100% across all categories
  plannedAmount: number; // Computed in base currency (USD) or active currency
  actualSpent: number;
  isContingency?: boolean; // 5-10% mandatory emergency buffer
  notes: string;
}

export interface TimelineMilestone {
  id: string;
  title: string;
  description: string;
  daysBeforeEvent: number; // Used for realistic scheduling relative to event date
  dueDate: string; // ISO YYYY-MM-DD
  timeSlot: string; // e.g. "09:00 AM"
  category: string;
  priority: MilestonePriority;
  status: MilestoneStatus;
  owner: string;
}

export interface VendorChecklistItem {
  id: string;
  category: string;
  vendorName: string;
  status: VendorStatus;
  estimatedCost: number;
  amountPaid: number;
  contactEmail: string;
  vettingQuestions: string[];
  inclusivityNotes: string;
}

export interface ColorSwatch {
  name: string;
  hex: string;
  usage: string;
}

export interface MenuCourse {
  courseType: string;
  dishName: string;
  description: string;
  dietaryTags: string[];
  perPersonEstimate: number;
}

export interface PersonalizedActivity {
  id: string;
  title: string;
  timing: string;
  description: string;
  accessibilityAdaptation: string;
  estimatedCost: number;
}

export interface PersonalizedIdeas {
  themeName: string;
  themeConcept: string;
  culturalNuanceSummary: string;
  budgetTierNote: string;
  colorPalette: ColorSwatch[];
  curatedMenu: MenuCourse[];
  signatureActivities: PersonalizedActivity[];
}

export interface EventContextInput {
  id: string;
  eventType: EventCategoryType;
  eventName: string;
  eventDate: string; // YYYY-MM-DD
  guestCount: number;
  totalBudget: number; // Stored in active currency units
  currency: CurrencyCode;
  location: string;
  culturalContext: string;
  inclusivityTags: DietaryTag[];
  customPrompt: string;
}

export interface EventPlanBlueprint {
  context: EventContextInput;
  budgetBreakdown: BudgetCategoryItem[];
  timeline: TimelineMilestone[];
  vendors: VendorChecklistItem[];
  ideas: PersonalizedIdeas;
  generatedAt: string;
  source: 'ai' | 'cache' | 'deterministic_fallback';
  cacheHash: string;
  latencyMs?: number;
}

export interface AccessibilitySettings {
  highContrast: boolean;
  fontScale: 'normal' | 'large' | 'xlarge';
  currency: CurrencyCode;
}

export interface DiagnosticAssertionResult {
  id: string;
  suite: string;
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  durationMs: number;
}

export interface DiagnosticSuiteReport {
  timestamp: string;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  totalDurationMs: number;
  results: DiagnosticAssertionResult[];
}
