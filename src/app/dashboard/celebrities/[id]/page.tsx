import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TrendChart from '@/components/charts/trend-chart';
import SentimentChart from '@/components/charts/sentiment-chart';
import DemandBar from '@/components/dashboard/demand-bar';
import AiSummaryCard from '@/components/dashboard/ai-summary-card';
import WatchlistButton from '@/components/dashboard/watchlist-button';

const COMPLAINT_LABELS: Record<string, string> = {
  no_response: 'No Response',
  waiting_for_reply: 'Waiting for Reply',
  request_unanswered: 'Request Unanswered',
  asking_for_response: 'Asking for Response',
  fan_card_complaint: 'Fan Card Issue',
  membership_question: 'Membership Issue',
  meet_greet_question: 'Meet & Greet Request',
  general_frustration: 'General Frustration',
  general_confusion: 'General Confusion',
  negative_experience: 'Negative Experience',
  delayed_communication: 'Delayed Communication',
};

export default async function CelebrityDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: celebrity } = await supabase
    .from('celebrities')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!celebrity) notFound();

  const { data: latestMetrics } = await supabase
    .from('demand_metrics')
    .select('*')
    .eq('celebrity_id', params.id)
    .order('period_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: trendHistory } = await supabase
    .from('trend_metrics')
    .select('*')
    .eq('celebrity_id', params.id)
    .order('metric_date', { ascending: true })
    .limit(90);

  const { data: discussionIdsRows } = await supabase
    .from('public_discussions')
    .select('id')
    .eq('celebrity_id', params.id);
  const discussionIds = (discussionIdsRows ?? []).map((d) => d.id);

  let sentimentBreakdown = { positive: 0, neutral: 0, negative: 0, frustrated: 0 };
  let complaintBreakdown: Record<string, number> = {};

  if (discussionIds.length > 0) {
    const { data: sentimentRows } = await supabase
      .from('sentiment_analysis')
      .select('sentiment')
      .in('discussion_id', discussionIds);
    for (const row of sentimentRows ?? []) {
      sentimentBreakdown[row.sentiment as keyof typeof sentimentBreakdown]++;
    }

    const { data: categoryRows } = await supabase
      .from('discussion_categories')
      .select('category')
      .in('discussion_id', discussionIds)
      .in('category', Object.keys(COMPLAINT_LABELS));
    complaintBreakdown = (categoryRows ?? []).reduce((acc, row) => {
      acc[row.category] = (acc[row.category] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  const { data: discussions } = await supabase
    .from('public_discussions')
    .select(
      'id, source_url, author_handle, content_excerpt, engagement_count, posted_at, is_demo, social_platforms(display_name)'
    )
    .eq('celebrity_id', params.id)
    .order('posted_at', { ascending: false })
    .limit(25);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-white">{celebrity.canonical_name}</h1>
            {celebrity.is_demo && (
              <span className="rounded bg-warning/15 px-2 py-0.5 text-[10px] font-medium uppercase text-warning">
                Demo Data
              </span>
            )}
          </div>
          <p className="mt-1 text-sm capitalize text-muted">
            {celebrity.category} · {celebrity.verification_status}
            {celebrity.country ? ` · ${celebrity.country}` : ''}
          </p>
        </div>
        <WatchlistButton celebrityId={celebrity.id} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="glass-card p-5">
          <span className="text-xs uppercase tracking-wide text-muted">Fan Demand Score</span>
          <div className="mt-2 text-3xl font-semibold text-white">{celebrity.fan_demand_score}</div>
          <span className="text-xs capitalize text-accent-soft">{celebrity.score_level.replace('_', ' ')}</span>
        </div>
        <div className="glass-card p-5">
          <span className="text-xs uppercase tracking-wide text-muted">Total Discussions</span>
          <div className="mt-2 text-3xl font-semibold text-white">{celebrity.total_discussions}</div>
        </div>
        <div className="glass-card p-5">
          <span className="text-xs uppercase tracking-wide text-muted">Trend</span>
          <div className="mt-2 text-3xl font-semibold capitalize text-white">{celebrity.trend}</div>
        </div>
        <div className="glass-card p-5">
          <span className="text-xs uppercase tracking-wide text-muted">Complaint Volume</span>
          <div className="mt-2 text-3xl font-semibold text-white">
            {latestMetrics?.complaint_count ?? 0}
          </div>
        </div>
      </div>

      <AiSummaryCard celebrityId={celebrity.id} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass-card p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-white">Demand Timeline</h2>
          <TrendChart data={trendHistory ?? []} />
        </div>
        <div className="glass-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">Sentiment Breakdown</h2>
          <SentimentChart breakdown={sentimentBreakdown} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">Demand Breakdown</h2>
          <div className="space-y-4">
            <DemandBar label="Fan Card Demand" value={latestMetrics?.fan_card_pct ?? null} />
            <DemandBar label="Membership Demand" value={latestMetrics?.membership_pct ?? null} />
            <DemandBar label="Meet & Greet Demand" value={latestMetrics?.meet_greet_pct ?? null} />
          </div>
        </div>

        <div className="glass-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">Complaint Breakdown</h2>
          {Object.keys(complaintBreakdown).length === 0 ? (
            <p className="text-sm text-muted">No complaint-related discussions recorded.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(complaintBreakdown).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between text-sm">
                  <span className="text-muted">{COMPLAINT_LABELS[category] ?? category}</span>
                  <span className="font-medium text-white">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="glass-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-white">Public Discussion Feed</h2>
        <div className="space-y-3">
          {(discussions ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No public discussions ingested yet.</p>
          ) : (
            (discussions ?? []).map((d: any) => (
              <div key={d.id} className="rounded-lg border border-border p-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs text-muted">
                    {d.social_platforms?.display_name ?? 'Unknown platform'} ·{' '}
                    {d.posted_at ? new Date(d.posted_at).toLocaleDateString() : 'Unknown date'}
                  </span>
                  {d.is_demo && (
                    <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-warning">
                      Demo Data
                    </span>
                  )}
                </div>
                <p className="mb-1.5 text-sm text-white/90">{d.content_excerpt}</p>
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>{d.engagement_count} engagement</span>
                  {d.source_url && (
                    <a
                      href={d.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-soft hover:underline"
                    >
                      View source
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
