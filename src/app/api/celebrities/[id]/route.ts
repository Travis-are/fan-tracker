import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const paramsSchema = z.object({ id: z.string().uuid() });

const querySchema = z.object({
  discussionsLimit: z.coerce.number().min(1).max(100).default(25),
  discussionsOffset: z.coerce.number().min(0).default(0),
});

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

  const { searchParams } = new URL(request.url);
  const parsedQuery = querySchema.safeParse({
    discussionsLimit: searchParams.get('discussionsLimit') ?? undefined,
    discussionsOffset: searchParams.get('discussionsOffset') ?? undefined,
  });
  if (!parsedQuery.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
  }
  const { discussionsLimit, discussionsOffset } = parsedQuery.data;

  // --- Celebrity core record ---
  const { data: celebrity, error: celebError } = await supabase
    .from('celebrities')
    .select('*')
    .eq('id', id)
    .single();

  if (celebError || !celebrity) {
    return NextResponse.json({ error: 'Celebrity not found' }, { status: 404 });
  }

  // --- Latest demand metrics (most recent period) ---
  const { data: latestMetrics } = await supabase
    .from('demand_metrics')
    .select('*')
    .eq('celebrity_id', id)
    .order('period_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  // --- Aliases ---
  const { data: aliases } = await supabase
    .from('celebrity_aliases')
    .select('alias, alias_type, platform')
    .eq('celebrity_id', id);

  // --- Trend history (last 90 points) ---
  const { data: trendHistory } = await supabase
    .from('trend_metrics')
    .select('*')
    .eq('celebrity_id', id)
    .order('metric_date', { ascending: true })
    .limit(90);

  // --- Sentiment breakdown ---
  const { data: discussionIdsRows } = await supabase
    .from('public_discussions')
    .select('id')
    .eq('celebrity_id', id);
  const discussionIds = (discussionIdsRows ?? []).map((d) => d.id);

  let sentimentBreakdown = { positive: 0, neutral: 0, negative: 0, frustrated: 0 };
  if (discussionIds.length > 0) {
    const { data: sentimentRows } = await supabase
      .from('sentiment_analysis')
      .select('sentiment')
      .in('discussion_id', discussionIds);

    for (const row of sentimentRows ?? []) {
      sentimentBreakdown[row.sentiment as keyof typeof sentimentBreakdown]++;
    }
  }

  // --- Complaint breakdown (category counts, complaint-related only) ---
  const complaintCategories = [
    'no_response', 'waiting_for_reply', 'request_unanswered', 'asking_for_response',
    'fan_card_complaint', 'membership_question', 'meet_greet_question',
    'general_frustration', 'general_confusion', 'negative_experience', 'delayed_communication',
  ];
  let complaintBreakdown: Record<string, number> = {};
  if (discussionIds.length > 0) {
    const { data: categoryRows } = await supabase
      .from('discussion_categories')
      .select('category')
      .in('discussion_id', discussionIds)
      .in('category', complaintCategories);

    complaintBreakdown = (categoryRows ?? []).reduce((acc, row) => {
      acc[row.category] = (acc[row.category] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  // --- Recent public discussion feed (paginated) ---
  const { data: discussions, count: discussionsCount } = await supabase
    .from('public_discussions')
    .select(
      'id, source_url, author_handle, content_excerpt, engagement_count, posted_at, is_demo, platform_id, social_platforms(display_name)',
      { count: 'exact' }
    )
    .eq('celebrity_id', id)
    .order('posted_at', { ascending: false })
    .range(discussionsOffset, discussionsOffset + discussionsLimit - 1);

  return NextResponse.json({
    data: {
      celebrity,
      aliases: aliases ?? [],
      latestMetrics: latestMetrics ?? null,
      trendHistory: trendHistory ?? [],
      sentimentBreakdown,
      complaintBreakdown,
      discussions: {
        items: discussions ?? [],
        pagination: {
          total: discussionsCount ?? 0,
          limit: discussionsLimit,
          offset: discussionsOffset,
        },
      },
    },
  });
}
