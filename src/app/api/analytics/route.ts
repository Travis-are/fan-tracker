import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { countCategoriesFromRows, calculateDemandPercentages } from '@/lib/analytics/metrics';
import { calculateFanDemandScore } from '@/lib/analytics/score';
import { z } from 'zod';

const bodySchema = z.object({
  celebrityId: z.string().uuid().optional(), // omit to recompute for all celebrities
});

async function recomputeForCelebrity(
  db: ReturnType<typeof createAdminClient>,
  celebrityId: string
) {
  const { data: discussions } = await db
    .from('public_discussions')
    .select('id, posted_at')
    .eq('celebrity_id', celebrityId);

  const discussionIds = (discussions ?? []).map((d) => d.id);
  const totalDiscussions = discussionIds.length;

  if (totalDiscussions === 0) {
    return { celebrityId, skipped: true };
  }

  const { data: categoryRows } = await db
    .from('discussion_categories')
    .select('category, discussion_id')
    .in('discussion_id', discussionIds);

  const counts = countCategoriesFromRows(categoryRows ?? [], totalDiscussions);
  const percentages = calculateDemandPercentages(counts);

  // growth rate: compare discussions in last 30 days vs the 30 days before that
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const recentCount = (discussions ?? []).filter(
    (d) => d.posted_at && now - new Date(d.posted_at).getTime() <= 30 * day
  ).length;
  const priorCount = (discussions ?? []).filter(
    (d) =>
      d.posted_at &&
      now - new Date(d.posted_at).getTime() > 30 * day &&
      now - new Date(d.posted_at).getTime() <= 60 * day
  ).length;
  const growthRatePct =
    priorCount > 0 ? Math.round(((recentCount - priorCount) / priorCount) * 10000) / 100 : 0;

  const scoreBreakdown = calculateFanDemandScore({
    discussionVolume: totalDiscussions,
    fanCardRequests: counts.fanCardCount,
    membershipRequests: counts.membershipCount,
    meetGreetRequests: counts.meetGreetCount,
    unansweredRequests: counts.unansweredCount,
    complaints: counts.complaintCount,
    growthRatePct,
  });

  const periodEnd = new Date();
  const periodStart = new Date(now - 30 * day);

  await db.from('demand_metrics').insert({
    celebrity_id: celebrityId,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    total_discussions: totalDiscussions,
    fan_card_count: counts.fanCardCount,
    membership_count: counts.membershipCount,
    meet_greet_count: counts.meetGreetCount,
    unanswered_count: counts.unansweredCount,
    complaint_count: counts.complaintCount,
    fan_card_pct: percentages.fanCardPct === 'INSUFFICIENT_DATA' ? null : percentages.fanCardPct,
    membership_pct:
      percentages.membershipPct === 'INSUFFICIENT_DATA' ? null : percentages.membershipPct,
    meet_greet_pct:
      percentages.meetGreetPct === 'INSUFFICIENT_DATA' ? null : percentages.meetGreetPct,
    unanswered_pct:
      percentages.unansweredPct === 'INSUFFICIENT_DATA' ? null : percentages.unansweredPct,
    complaint_pct:
      percentages.complaintPct === 'INSUFFICIENT_DATA' ? null : percentages.complaintPct,
  } as any);

  await db.from('trend_metrics').upsert(
    {
      celebrity_id: celebrityId,
      metric_date: new Date().toISOString().slice(0, 10),
      fan_card_demand: counts.fanCardCount,
      membership_demand: counts.membershipCount,
      meet_greet_demand: counts.meetGreetCount,
      complaints: counts.complaintCount,
      unanswered_requests: counts.unansweredCount,
      total_volume: totalDiscussions,
      fan_demand_score: scoreBreakdown.score,
  } as any,
    { onConflict: 'celebrity_id,metric_date' }
  );

  const trend: 'up' | 'down' | 'stable' =
    growthRatePct > 5 ? 'up' : growthRatePct < -5 ? 'down' : 'stable';

  await db
    .from('celebrities')
    .update({
      fan_demand_score: scoreBreakdown.score,
      score_level: scoreBreakdown.level,
      total_discussions: totalDiscussions,
      trend,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', celebrityId);

  return {
    celebrityId,
    score: scoreBreakdown.score,
    level: scoreBreakdown.level,
    percentages,
    growthRatePct,
  };
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const db = createAdminClient();

  try {
    if (parsed.data.celebrityId) {
      const result = await recomputeForCelebrity(db, parsed.data.celebrityId);
      return NextResponse.json({ data: result });
    }

    const { data: celebrities } = await db.from('celebrities').select('id');
    const results = [];
    for (const c of celebrities ?? []) {
      results.push(await recomputeForCelebrity(db, c.id));
    }

    return NextResponse.json({ data: results });
  } catch (err) {
    await db.from('system_logs').insert({
      level: 'error',
      source: 'analytics_recompute',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Analytics recomputation failed' }, { status: 500 });
  }
}
