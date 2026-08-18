import 'server-only';

// Fictional public figures for demo mode only. Never presented as real data —
// every row written from this generator gets is_demo = true and the UI must
// always render a "DEMO DATA" badge wherever is_demo is true.
const DEMO_FIGURES = [
  { name: 'Aria Lennox', category: 'musician' as const, country: 'US' },
  { name: 'Marcus Vane', category: 'actor' as const, country: 'UK' },
  { name: 'Kenji Osaka', category: 'athlete' as const, country: 'JP' },
  { name: 'Sofia Reyes-Kim', category: 'influencer' as const, country: 'MX' },
  { name: 'Dante Okafor', category: 'creator' as const, country: 'NG' },
  { name: 'Lucia Ferrante', category: 'musician' as const, country: 'IT' },
  { name: 'Theo Bergström', category: 'athlete' as const, country: 'SE' },
  { name: 'Priya Anand', category: 'influencer' as const, country: 'IN' },
];

const DEMO_CATEGORIES = [
  'fan_card_request', 'fan_card_complaint', 'membership_request', 'vip_membership',
  'meet_greet_want', 'meet_greet_question', 'no_response', 'request_unanswered',
  'general_frustration', 'negative_experience',
] as const;

const DEMO_SENTIMENTS = ['positive', 'neutral', 'negative', 'frustrated'] as const;

const DEMO_TEMPLATES = [
  'Does anyone know how to get {name}\'s fan card? Been trying for weeks.',
  'Still no response from {name}\'s team about the membership I signed up for.',
  'Would love a meet and greet with {name} someday, anyone know if they do those?',
  'Waiting on my {name} VIP membership confirmation, it\'s been 10 days.',
  '{name} never responded to my fan club application, kind of frustrating.',
  'Just got my {name} fan card in the mail, so excited!',
  'Anyone else still waiting to hear back about the {name} meet and greet lottery?',
  'The {name} fan club membership page has been down for me, anyone else?',
];

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface DemoDiscussion {
  celebrityName: string;
  category: (typeof DEMO_CATEGORIES)[number];
  sentiment: (typeof DEMO_SENTIMENTS)[number];
  content: string;
  engagementCount: number;
  postedAt: string;
  authorHandle: string;
}

/** Generates realistic but entirely fictional demo discussions, clearly fictional figures. */
export function generateDemoDiscussions(count = 60): DemoDiscussion[] {
  const results: DemoDiscussion[] = [];

  for (let i = 0; i < count; i++) {
    const figure = pick(DEMO_FIGURES);
    const template = pick(DEMO_TEMPLATES);
    const daysAgo = randomBetween(0, 89);
    const postedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    results.push({
      celebrityName: figure.name,
      category: pick(DEMO_CATEGORIES),
      sentiment: pick(DEMO_SENTIMENTS),
      content: template.replace('{name}', figure.name),
      engagementCount: randomBetween(1, 500),
      postedAt,
      authorHandle: `demo_user_${randomBetween(1000, 9999)}`,
    });
  }

  return results;
}

export function getDemoFigures() {
  return DEMO_FIGURES;
}
