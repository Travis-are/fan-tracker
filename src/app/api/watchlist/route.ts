import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const postSchema = z.object({ celebrityId: z.string().uuid() });
const deleteSchema = z.object({ celebrityId: z.string().uuid() });

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: watchlistRows, error } = await supabase
    .from('watchlists')
    .select('id, created_at, celebrity_id, celebrities(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 });
  }

  const celebrityIds = (watchlistRows ?? []).map((w) => w.celebrity_id);

  // Pull the two most recent trend_metrics points per celebrity to compute
  // "current score vs previous score" without a separate snapshot table.
  const { data: trendRows } = await supabase
    .from('trend_metrics')
    .select('celebrity_id, metric_date, fan_demand_score')
    .in('celebrity_id', celebrityIds)
    .order('metric_date', { ascending: false });

  const pointsByCelebrity = new Map<string, { metric_date: string; fan_demand_score: number | null }[]>();
  for (const row of trendRows ?? []) {
    const existing = pointsByCelebrity.get(row.celebrity_id) ?? [];
    if (existing.length < 2) {
      existing.push({ metric_date: row.metric_date, fan_demand_score: row.fan_demand_score });
      pointsByCelebrity.set(row.celebrity_id, existing);
    }
  }

  const enriched = (watchlistRows ?? []).map((w) => {
    const points = pointsByCelebrity.get(w.celebrity_id) ?? [];
    const currentScore = points[0]?.fan_demand_score ?? null;
    const previousScore = points[1]?.fan_demand_score ?? null;
    const demandChange =
      currentScore !== null && previousScore !== null
        ? Math.round((currentScore - previousScore) * 100) / 100
        : null;

    return {
      watchlistId: w.id,
      addedAt: w.created_at,
      celebrity: w.celebrities,
      currentScore,
      previousScore,
      demandChange,
    };
  });

  return NextResponse.json({ data: enriched });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { data: celebrity } = await supabase
    .from('celebrities')
    .select('id')
    .eq('id', parsed.data.celebrityId)
    .maybeSingle();

  if (!celebrity) {
    return NextResponse.json({ error: 'Celebrity not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('watchlists')
    .insert({ user_id: user.id, celebrity_id: parsed.data.celebrityId })
    .select('id')
    .single();

  if (error) {
    // unique constraint violation = already watchlisted, treat as idempotent success
    if (error.code === '23505') {
      return NextResponse.json({ data: { alreadyWatchlisted: true } });
    }
    return NextResponse.json({ error: 'Failed to add to watchlist' }, { status: 500 });
  }

  return NextResponse.json({ data: { watchlistId: data.id } }, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { error } = await supabase
    .from('watchlists')
    .delete()
    .eq('user_id', user.id)
    .eq('celebrity_id', parsed.data.celebrityId);

  if (error) {
    return NextResponse.json({ error: 'Failed to remove from watchlist' }, { status: 500 });
  }

  return NextResponse.json({ data: { removed: true } });
}
