import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { aiProvider } from '@/lib/ai';
import { z } from 'zod';

const paramsSchema = z.object({ id: z.string().uuid() });

// Cache summaries for 6 hours per celebrity so we don't burn Gemini calls on every page view.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: 'Invalid celebrity id' }, { status: 400 });
  }
  const { id } = parsedParams.data;

  const db = createAdminClient();

  // --- Check for a recent cached summary first ---
  const { data: cached } = await db
    .from('ai_analysis')
    .select('ai_output, created_at')
    .eq('celebrity_id', id)
    .eq('analysis_type', 'summary')
    .is('discussion_id', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached && Date.now() - new Date(cached.created_at).getTime() < CACHE_TTL_MS) {
    return NextResponse.json({
      data: cached.ai_output,
      cached: true,
    });
  }

  // --- Pull the real computed metrics this summary must be grounded in ---
  const { data: celebrity } = await supabase
    .from('celebrities')
    .select('canonical_name, total_discussions, trend')
    .eq('id', id)
    .single();

  if (!celebrity) {
    return NextResponse.json({ error: 'Celebrity not found' }, { status: 404 });
  }

  const { data: latestMetrics } = await supabase
    .from('demand_metrics')
    .select('fan_card_pct, membership_pct, meet_greet_pct, unanswered_pct')
    .eq('celebrity_id', id)
    .order('period_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestMetrics || celebrity.total_discussions < 5) {
    return NextResponse.json({
      data: {
        summary:
          'Not enough public discussion data has been collected yet to generate a reliable AI summary for this public figure.',
        isAiGenerated: true,
      },
      cached: false,
    });
  }

  try {
    const summary = await aiProvider.generateCelebritySummary({
      name: celebrity.canonical_name,
      totalDiscussions: celebrity.total_discussions,
      fanCardPct: latestMetrics.fan_card_pct,
      membershipPct: latestMetrics.membership_pct,
      meetGreetPct: latestMetrics.meet_greet_pct,
      unansweredPct: latestMetrics.unanswered_pct,
      trend: celebrity.trend as 'up' | 'down' | 'stable',
    });

    await db.from('ai_analysis').insert({
      celebrity_id: id,
      discussion_id: null,
      analysis_type: 'summary',
      model_name: aiProvider.name,
      ai_output: summary as unknown as Record<string, unknown>,
      is_inference: true,
    } as any);

    return NextResponse.json({ data: summary, cached: false });
  } catch (err) {
    await db.from('system_logs').insert({
      level: 'error',
      source: 'celebrity_summary',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 502 });
  }
}
