import type {
  CurrencyCode,
  DietaryTag,
  EventCategoryType,
  EventContextInput,
  EventPlanBlueprint,
} from '../types/event.ts';

/**
 * Currency conversion rates relative to USD (base 1.0) and locale symbols.
 */
export const CURRENCY_CONFIG: Record<
  CurrencyCode,
  { symbol: string; label: string; rateFromUSD: number; locale: string }
> = {
  USD: { symbol: '$', label: 'USD $', rateFromUSD: 1, locale: 'en-US' },
  INR: { symbol: '₹', label: 'INR ₹', rateFromUSD: 83.5, locale: 'en-IN' },
  EUR: { symbol: '€', label: 'EUR €', rateFromUSD: 0.92, locale: 'de-DE' },
  GBP: { symbol: '£', label: 'GBP £', rateFromUSD: 0.79, locale: 'en-GB' },
};

/**
 * Supported inclusivity, dietary, and accessibility tags.
 */
export const INCLUSIVITY_TAGS: DietaryTag[] = [
  'Wheelchair Accessible',
  'Sensory-Friendly',
  'Jain',
  'Vegan',
  'Halal',
  'Gluten-Free',
  'Kosher',
  'Nut-Free',
];

/**
 * Event Category metadata for UI switching.
 */
export const EVENT_CATEGORIES: Array<{
  id: EventCategoryType;
  label: string;
  tagline: string;
  defaultContingencyPct: number;
}> = [
  {
    id: 'wedding',
    label: 'Weddings & Unions',
    tagline: 'Multi-ceremony hospitality, bespoke florals, and precision run-sheets',
    defaultContingencyPct: 8,
  },
  {
    id: 'birthday',
    label: 'Milestone Birthdays',
    tagline: 'Experiential dining, curated entertainment, and celebratory keepsakes',
    defaultContingencyPct: 7,
  },
  {
    id: 'community',
    label: 'Community & Cultural Galas',
    tagline: 'Accessible public staging, civic permits, and inclusive crowd catering',
    defaultContingencyPct: 10,
  },
];

/**
 * Curated starter presets for Weddings, Birthdays, and Community Events.
 */
export const EVENT_PRESETS: Record<EventCategoryType, EventContextInput> = {
  wedding: {
    id: 'preset-wedding-royal',
    eventType: 'wedding',
    eventName: 'Aarav & Meera — Courtyard Heritage Wedding',
    eventDate: '2027-02-14',
    guestCount: 220,
    totalBudget: 45000,
    currency: 'USD',
    location: 'Udaipur & Jaipur Style Botanical Conservatory',
    culturalContext:
      'Cross-cultural South Asian & Mediterranean twilight ceremony with Sangeet welcome dinner and unplugged acoustic vows.',
    inclusivityTags: ['Wheelchair Accessible', 'Jain', 'Vegan', 'Gluten-Free'],
    customPrompt:
      'Prioritize live folk string quartet, zero-waste floral installations, step-free mandap ramp access, and dedicated Jain & Vegan tasting stations.',
  },
  birthday: {
    id: 'preset-birthday-milestone',
    eventType: 'birthday',
    eventName: 'Elena’s 40th Solstice Conservatory Soirée',
    eventDate: '2026-12-19',
    guestCount: 75,
    totalBudget: 12000,
    currency: 'USD',
    location: 'Glasshouse Atrium & Rooftop Terrace',
    culturalContext:
      'Intimate architectural dinner party with botanical mocktail/cocktail alchemy, vinyl listening lounge, and tactile Polaroid guestbook.',
    inclusivityTags: ['Sensory-Friendly', 'Vegan', 'Gluten-Free', 'Nut-Free'],
    customPrompt:
      'Include a quiet acoustic lounge zone with warm dimmable lighting for sensory comfort, interactive dessert grazing table, and custom vinyl pressing station.',
  },
  community: {
    id: 'preset-community-festival',
    eventType: 'community',
    eventName: 'Autumn Lantern & Neighborhood Harvest Commons',
    eventDate: '2026-11-28',
    guestCount: 450,
    totalBudget: 25000,
    currency: 'USD',
    location: 'Civic Botanical Plaza & Amphitheater',
    culturalContext:
      'Multigenerational neighborhood celebration featuring local artisan booths, youth mural workshops, and multicultural community kitchens.',
    inclusivityTags: ['Wheelchair Accessible', 'Sensory-Friendly', 'Halal', 'Vegan'],
    customPrompt:
      'Ensure ADA-compliant pathways, ASL stage interpretation, sensory decompression tent, municipal permit buffer, and zero single-use plastics.',
  },
};

/**
 * Complete deterministic initial blueprint for immediate zero-latency hydration.
 */
export const INITIAL_WEDDING_BLUEPRINT: EventPlanBlueprint = {
  context: EVENT_PRESETS.wedding,
  generatedAt: '2026-10-20T11:00:00.000Z',
  source: 'deterministic_fallback',
  cacheHash: 'fnf_preset_wedding_v1',
  latencyMs: 0,
  budgetBreakdown: [
    {
      id: 'cat-venue',
      name: 'Venue, Mandap & Step-Free Staging',
      percentage: 28,
      plannedAmount: 12600,
      actualSpent: 12200,
      notes: 'Includes heritage courtyard rental, acoustic tenting, and ADA ramp integration.',
    },
    {
      id: 'cat-catering',
      name: 'Inclusive Culinary & Jain/Vegan Stations',
      percentage: 30,
      plannedAmount: 13500,
      actualSpent: 13850,
      notes: 'Separate prep surfaces for strict Jain compliance, vegan mezze, and botanical pairings.',
    },
    {
      id: 'cat-decor',
      name: 'Sustainable Florals & Warm Lighting',
      percentage: 14,
      plannedAmount: 6300,
      actualSpent: 5900,
      notes: 'Potted marigold and olive trees donated to local community gardens post-event.',
    },
    {
      id: 'cat-music',
      name: 'Folk Quartet, Sound & AV Production',
      percentage: 10,
      plannedAmount: 4500,
      actualSpent: 4500,
      notes: 'Directional line-array speakers to keep decibels comfortable for elderly guests.',
    },
    {
      id: 'cat-photo',
      name: 'Documentary Photo & Cinema Folio',
      percentage: 10,
      plannedAmount: 4500,
      actualSpent: 4200,
      notes: 'Dual photographers covering Sangeet and twilight ceremony.',
    },
    {
      id: 'cat-contingency',
      name: 'Emergency Contingency Buffer',
      percentage: 8,
      plannedAmount: 3600,
      actualSpent: 950,
      isContingency: true,
      notes: 'Locked 8% reserve for weather backup tenting, overtime transport, and last-minute guest additions.',
    },
  ],
  timeline: [
    {
      id: 'ms-1',
      title: 'Lock Heritage Venue & Step-Free Accessibility Audit',
      description: 'Execute venue contract and verify ramp gradients, accessible restrooms, and quiet lounge rooms.',
      daysBeforeEvent: 110,
      dueDate: '2026-10-27',
      timeSlot: '10:00 AM',
      category: 'Venue & Logistics',
      priority: 'critical',
      status: 'completed',
      owner: 'Lead Planner',
    },
    {
      id: 'ms-2',
      title: 'Finalize Jain, Vegan & Gluten-Free Culinary Tasting',
      description: 'Approve separated kitchen prep workflows and allergen labeling cards with Executive Chef.',
      daysBeforeEvent: 75,
      dueDate: '2026-12-01',
      timeSlot: '02:30 PM',
      category: 'Catering',
      priority: 'critical',
      status: 'in_progress',
      owner: 'Culinary Director',
    },
    {
      id: 'ms-3',
      title: 'Confirm Acoustic Quartet & Decibel Zoning Plan',
      description: 'Establish sound check schedule and low-decibel conversational seating zones for elders.',
      daysBeforeEvent: 45,
      dueDate: '2026-12-31',
      timeSlot: '11:00 AM',
      category: 'Production',
      priority: 'high',
      status: 'upcoming',
      owner: 'AV Lead',
    },
    {
      id: 'ms-4',
      title: 'Issue Digital Run-Sheet & Dietary Seating Matrix',
      description: 'Distribute table assignments with color-coded dietary markers to catering captain.',
      daysBeforeEvent: 14,
      dueDate: '2027-01-31',
      timeSlot: '04:00 PM',
      category: 'Hospitality',
      priority: 'high',
      status: 'upcoming',
      owner: 'Guest Concierge',
    },
    {
      id: 'ms-5',
      title: 'Rehearsal Walkthrough & Contingency Weather Briefing',
      description: 'Full bridal party and vendor run-through on site with rain-canopy standby check.',
      daysBeforeEvent: 1,
      dueDate: '2027-02-13',
      timeSlot: '05:00 PM',
      category: 'Operations',
      priority: 'critical',
      status: 'upcoming',
      owner: 'All Heads',
    },
  ],
  vendors: [
    {
      id: 'vnd-1',
      category: 'Venue & Staging',
      vendorName: 'Glasshouse & Heritage Conservatory',
      status: 'contracted',
      estimatedCost: 12600,
      amountPaid: 8500,
      contactEmail: 'events@conservatoryfolio.example.com',
      inclusivityNotes: 'Zero-step entry from drop-off loop; 3 ADA restrooms on main level.',
      vettingQuestions: [
        'Are all ceremony and dining levels accessible without temporary lifts?',
        'What is the hard curfew and hourly overtime fee if ceremonies run 30 minutes late?',
        'Is an on-site backup generator included in the base rental contract?',
      ],
    },
    {
      id: 'vnd-2',
      category: 'Culinary & Beverage',
      vendorName: 'Saffron & Olive Artisanal Kitchens',
      status: 'shortlisted',
      estimatedCost: 13500,
      amountPaid: 4000,
      contactEmail: 'tasting@saffronolive.example.com',
      inclusivityNotes: 'Dedicated root-free Jain line and 100% gluten-free pastry station.',
      vettingQuestions: [
        'How do you prevent cross-contamination between strict Jain, Vegan, and standard prep lines?',
        'Do you provide clear allergen and dietary typography at every buffet and family-style platter?',
        'What happens to unserved surplus trays at the end of the night?',
      ],
    },
    {
      id: 'vnd-3',
      category: 'Floral & Scenography',
      vendorName: 'Botanica Verdant Studio',
      status: 'contracted',
      estimatedCost: 6300,
      amountPaid: 6300,
      contactEmail: 'studio@botanicaverdant.example.com',
      inclusivityNotes: 'Uses foam-free mechanics and low-pollen blooms for allergy-sensitive guests.',
      vettingQuestions: [
        'Can you guarantee 100% floral-foam-free mechanics and living potted trees?',
        'Are any selected blooms heavily fragranced or high-pollen for sensitive guests?',
        'Is post-event breakdown and donation transport included in the quote?',
      ],
    },
    {
      id: 'vnd-4',
      category: 'Sound & Live Music',
      vendorName: 'Lumina Strings & Acoustic Design',
      status: 'researching',
      estimatedCost: 4500,
      amountPaid: 0,
      contactEmail: 'booking@luminastrings.example.com',
      inclusivityNotes: 'Includes inductive hearing-loop transmitter for speeches and vows.',
      vettingQuestions: [
        'Can you provide an assistive listening / hearing-loop feed for ceremony microphones?',
        'How do you calibrate speaker arrays so dining tables remain under 72 dB?',
        'What is your backup equipment protocol if a wireless lapel mic experiences interference?',
      ],
    },
  ],
  ideas: {
    themeName: 'Sunlit Terracotta & Cypress Heritage',
    themeConcept:
      'An architectural blend of warm sandstone textiles, living olive and marigold groves, and acoustic candlelit courtyards designed for unhurried cross-cultural conversation.',
    culturalNuanceSummary:
      'Honors South Asian sacred fire and floral garland traditions alongside Mediterranean long-table hospitality, with step-free mandap seating so elders participate without stairs.',
    budgetTierNote:
      'Calibrated strictly for a $45,000 cap ($204/guest across 220 guests) with an 8% ($3,600) protected contingency reserve.',
    colorPalette: [
      { name: 'Warm Travertine', hex: '#F4EFE6', usage: 'Linen drapery & stationery canvas' },
      { name: 'Jaipur Terracotta', hex: '#B85D3B', usage: 'Ceremonial textiles & stoneware' },
      { name: 'Cypress Grove', hex: '#2D4A3E', usage: 'Foliage structures & menu typography' },
      { name: 'Burnished Brass', hex: '#C59B27', usage: 'Candle vessels & table numerals' },
    ],
    curatedMenu: [
      {
        courseType: 'Welcome Botanical Aperitif',
        dishName: 'Kokum, Pomegranate & Rosewater Spritz',
        description: 'Chilled botanical infusion served with charred pistachio and seed crisps.',
        dietaryTags: ['Jain', 'Vegan', 'Gluten-Free'],
        perPersonEstimate: 14,
      },
      {
        courseType: 'First Course',
        dishName: 'Charred Artichoke & Saffron Paneer / Tofu Tikka Carpaccio',
        description: 'Served on banana-leaf ceramic plates with mint-coriander emulsion (no onion/garlic option).',
        dietaryTags: ['Jain', 'Vegan', 'Gluten-Free'],
        perPersonEstimate: 26,
      },
      {
        courseType: 'Main Feast',
        dishName: 'Slow-Braised Jackfruit & Wild Mushroom Briyani + Herb Polenta',
        description: 'Accompanied by smoked dal bukhara, pomegranate raita, and gluten-free jowar flatbreads.',
        dietaryTags: ['Vegan', 'Gluten-Free', 'Jain'],
        perPersonEstimate: 48,
      },
      {
        courseType: 'Finale',
        dishName: 'Cardamom Poached Pear & Pistachio Kulfi Tartlet',
        description: 'Cashew-milk kulfi over almond-date crust with edible silver leaf.',
        dietaryTags: ['Vegan', 'Gluten-Free', 'Jain'],
        perPersonEstimate: 18,
      },
    ],
    signatureActivities: [
      {
        id: 'act-1',
        title: 'Living Herb & Marigold Garland Bar',
        timing: '04:30 PM — Welcome Hour',
        description:
          'Guests weave custom rosemary, mogra, and marigold wrist corsages with local floral artisans at seated accessible worktables.',
        accessibilityAdaptation: 'Seated 30-inch knee-clearance tables with fragrance-free foliage lane.',
        estimatedCost: 950,
      },
      {
        id: 'act-2',
        title: 'Bilingual Storyteller & Acoustic Vow Exchange',
        timing: '05:45 PM — Twilight Courtyard',
        description:
          'Ceremony milestones printed in large-type booklets and projected on subtle matte linen screens for deaf and hard-of-hearing guests.',
        accessibilityAdaptation: 'Live captioning display + step-free mandap ramp access.',
        estimatedCost: 1200,
      },
      {
        id: 'act-3',
        title: 'Midnight Chai, Kahwa & Vinyl Listening Salon',
        timing: '09:30 PM — Glasshouse Lounge',
        description:
          'A low-decibel acoustic sanctuary away from the main dance floor where elders and sensory-sensitive guests enjoy spiced teas.',
        accessibilityAdaptation: 'Capped at 65 dB with warm dimmable Edison lighting and plush seating.',
        estimatedCost: 1100,
      },
    ],
  },
};
