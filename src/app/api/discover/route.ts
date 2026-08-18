import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const querySchema = z.object({
  filter: z
    .enum([
      'fan_card',
      'membership',
      'meet_greet',
      'complaints',
      'unanswered',
      'growth',
      'score',
    ])
    .default('score'),
  limit: z.coerce.number().min(1).max(50).default(12),
});

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    filter: searchParams.get('filter') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
  }

  const { filter, limit } = parsed.data;

  // Pull celebrities joined with their latest demand_metrics row.
  // Supabase doesn't do "latest per group" joins natively, so we fetch
  // celebrities + a reasonably-bounded recent metrics set and reduce in code.
  const { data: celebrities, error: celebError } = await supabase
    .from('celebrities')
    .select('*')
    .limit(200);

  if (celebError) {
    return NextResponse.json({ error: 'Failed to fetch celebrities' }, { status: 500 });
  }

  const celebrityIds = (celebrities ?? []).map((c) => c.id);

  const { data: metricsRows } = await supabase
    .from('demand_metrics')
    .select('*')
    .in('celebrity_id', celebrityIds)
    .order('period_end', { ascending: false });

  const latestMetricsByCelebrity = new Map<string, (typeof metricsRows)[number]>();
  for (const row of metricsRows ?? []) {
    if (!latestMetricsByCelebrity.has(row.celebrity_id)) {
      latestMetricsByCelebrity.set(row.celebrity_id, row);
    }
  }

  const enriched = (celebrities ?? []).map((c) => {
    const metrics = latestMetricsByCelebrity.get(c.id);
    return {
      ...c,
      fan_card_pct: metrics?.fan_card_pct ?? null,
      membership_pct: metrics?.membership_pct ?? null,
      meet_greet_pct: metrics?.meet_greet_pct ?? null,
      unanswered_pct: metrics?.unanswered_pct ?? null,
      complaint_pct: metrics?.complaint_pct ?? null,
      complaint_count: metrics?.complaint_count ?? 0,
      unanswered_count: metrics?.unanswered_count ?? 0,
    };
  });

  const sortFns: Record<string, (a: typeof enriched[number], b: typeof enriched[number]) => number> = {
    fan_card: (a, b) => (b.fan_card_pct ?? -1) - (a.fan_card_pct ?? -1),
    membership: (a, b) => (b.membership_pct ?? -1) - (a.membership_pct ?? -1),
    meet_greet: (a, b) => (b.meet_greet_pct ?? -1) - (a.meet_greet_pct ?? -1),
    complaints: (a, b) => b.complaint_count - a.complaint_count,
    unanswered: (a, b) => b.unanswered_count - a.unanswered_count,
    growth: (a, b) => (b.trend === 'up' ? 1 : 0) - (a.trend === 'up' ? 1 : 0),
    score: (a, b) => b.fan_demand_score - a.fan_demand_score,
  };

  const sorted = [...enriched].sort(sortFns[filter]).slice(0, limit);

  return NextResponse.json({ data: sorted, filter });
}
