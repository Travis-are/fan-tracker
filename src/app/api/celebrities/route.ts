import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const querySchema = z.object({
  sort: z
    .enum(['score', 'fan_card', 'membership', 'meet_greet', 'complaints', 'unanswered', 'growth'])
    .default('score'),
  category: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
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
    sort: searchParams.get('sort') ?? undefined,
    category: searchParams.get('category') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
    offset: searchParams.get('offset') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { sort, category, limit, offset } = parsed.data;

  let query = supabase
    .from('celebrities')
    .select('*', { count: 'exact' })
    .range(offset, offset + limit - 1);

  if (category) {
    query = query.eq('category', category);
  }

  const sortColumnMap: Record<string, string> = {
    score: 'fan_demand_score',
    fan_card: 'fan_demand_score', // refined further once demand_metrics joins are added
    membership: 'fan_demand_score',
    meet_greet: 'fan_demand_score',
    complaints: 'total_discussions',
    unanswered: 'total_discussions',
    growth: 'updated_at',
  };

  query = query.order(sortColumnMap[sort] ?? 'fan_demand_score', { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch celebrities' }, { status: 500 });
  }

  return NextResponse.json({
    data,
    pagination: {
      total: count ?? 0,
      limit,
      offset,
    },
  });
}
