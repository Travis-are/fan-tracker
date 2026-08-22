import { NextResponse } from 'next/server';
import { runIngestionPipeline } from '@/lib/ingestion/orchestrator';
import { createAdminClient } from '@/lib/supabase/admin';
import { countCategoriesFromRows, calculateDemandPercentages } from '@/lib/analytics/metrics';
import { calculateFanDemandScore } from '@/lib/analytics/score';
import { evaluateAlerts } from '@/lib/alerts/evaluate';

// Re-implements the per-celebrity recompute inline (mirrors File 31's logic)
// so the cron job doesn't need to make an authenticated HTTP call to its own
// /api/analytics route — it talks to the DB directly via the admin client.
async function recomputeAllCelebrities(db: ReturnType<typeof createAdminClient>) {
  const { data: celebrities } = await db.from('celebrities').select('id');
  let recomputed = 0;

  for (const c of celebrities ?? []) {
    const { data: discussions } = await db
      .from('public_discussions')
      .select('id, posted_at')
      .eq('celebrity_id', c.id);

    const discussionIds = (discussions ?? []).map((d) => d.id);
    if (discussionIds.length === 0) continue;

    const { data: categoryRows } = await db
      .from('discussion_categories')
      .select('category, discussion_id')
      .in('discussion_id', discussionIds);

    const counts = countCategoriesFromRows(categoryRows ?? [], discussionIds.length);
    const percentages = calculateDemandPercentages(counts);

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
      discussionVolume: discussionIds.length,
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
      celebrity_id: c.id,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      total_discussions: discussionIds.length,
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
        celebrity_id: c.id,
        metric_date: new Date().toISOString().slice(0, 10),
        fan_card_demand: counts.fanCardCount,
        membership_demand: counts.membershipCount,
        meet_greet_demand: counts.meetGreetCount,
        complaints: counts.complaintCount,
        unanswered_requests: counts.unansweredCount,
        total_volume: discussionIds.length,
        fan_demand_score: scoreBreakdown.score,
      },
      { onConflict: 'celebrity_id,metric_date' }
    );

    const trend: 'up' | 'down' | 'stable' =
      growthRatePct > 5 ? 'up' : growthRatePct < -5 ? 'down' : 'stable';

    await db
      .from('celebrities')
      .update({
        fan_demand_score: scoreBreakdown.score,
        score_level: scoreBreakdown.level,
        total_discussions: discussionIds.length,
        trend,
        updated_at: new Date().toISOString(),
      })
      .eq('id', c.id);

    recomputed++;
  }

  return recomputed;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createAdminClient();

  try {
    const ingestionResult = await runIngestionPipeline();
    const recomputedCount = await recomputeAllCelebrities(db);
    const alertResult = await evaluateAlerts();

    await db.from('system_logs').insert({
      level: 'info',
      source: 'cron',
      message: 'Scheduled cron run completed successfully',
      metadata: { ingestionResult, recomputedCount, alertResult },
    });

    return NextResponse.json({
      data: { ingestionResult, recomputedCount, alertResult },
    });
  } catch (err) {
    await db.from('system_logs').insert({
      level: 'error',
      source: 'cron',
      message: err instanceof Error ? err.message : 'Unknown cron error',
    });
    return NextResponse.json({ error: 'Cron run failed' }, { status: 500 });
  }
}
