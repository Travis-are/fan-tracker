import { createClient } from '@/lib/supabase/server';
import KpiCard from '@/components/dashboard/kpi-card';
import CelebrityRow from '@/components/dashboard/celebrity-row';
import {
  Users,
  MessageSquare,
  CreditCard,
  Star,
  Handshake,
  AlertTriangle,
  Gauge,
  MailWarning,
} from 'lucide-react';

export default async function DashboardPage() {
  const supabase = createClient();

  const [{ data: celebrities }, { data: recentDiscussions }, { data: latestMetricsRows }] =
    await Promise.all([
      supabase.from('celebrities').select('*').order('fan_demand_score', { ascending: false }).limit(100),
      supabase
        .from('public_discussions')
        .select(
          'id, content_excerpt, posted_at, is_demo, source_url, engagement_count, celebrity_id, celebrities(canonical_name), social_platforms(display_name)'
        )
        .order('posted_at', { ascending: false })
        .limit(8),
      supabase.from('demand_metrics').select('*').order('period_end', { ascending: false }).limit(300),
    ]);

  const allCelebs = celebrities ?? [];
  const totalDiscussions = allCelebs.reduce((sum, c) => sum + c.total_discussions, 0);
  const avgScore =
    allCelebs.length > 0
      ? Math.round(
          (allCelebs.reduce((sum, c) => sum + c.fan_demand_score, 0) / allCelebs.length) * 100
        ) / 100
      : 0;

  // latest metrics per celebrity (first occurrence wins since ordered desc by period_end)
  const latestByCeleb = new Map<string, (typeof latestMetricsRows)[number]>();
  for (const m of latestMetricsRows ?? []) {
    if (!latestByCeleb.has(m.celebrity_id)) latestByCeleb.set(m.celebrity_id, m);
  }
  const metricsList = Array.from(latestByCeleb.values());

  const totalFanCard = metricsList.reduce((sum, m) => sum + (m.fan_card_count ?? 0), 0);
  const totalMembership = metricsList.reduce((sum, m) => sum + (m.membership_count ?? 0), 0);
  const totalMeetGreet = metricsList.reduce((sum, m) => sum + (m.meet_greet_count ?? 0), 0);
  const totalUnanswered = metricsList.reduce((sum, m) => sum + (m.unanswered_count ?? 0), 0);
  const totalComplaints = metricsList.reduce((sum, m) => sum + (m.complaint_count ?? 0), 0);

  const topCelebrities = [...allCelebs].sort((a, b) => b.fan_demand_score - a.fan_demand_score).slice(0, 6);
  const fastestGrowing = [...allCelebs].filter((c) => c.trend === 'up').slice(0, 6);
  const biggestComplaintSources = [...allCelebs]
    .map((c) => ({ ...c, complaintCount: latestByCeleb.get(c.id)?.complaint_count ?? 0 }))
    .sort((a, b) => b.complaintCount - a.complaintCount)
    .slice(0, 6);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Executive Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Public fan-demand intelligence across all tracked public figures
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Celebrities Tracked" value={allCelebs.length} icon={Users} />
        <KpiCard label="Total Discussions" value={totalDiscussions} icon={MessageSquare} />
        <KpiCard label="Fan Card Demand" value={totalFanCard} icon={CreditCard} />
        <KpiCard label="Membership Demand" value={totalMembership} icon={Star} />
        <KpiCard label="Meet & Greet Demand" value={totalMeetGreet} icon={Handshake} />
        <KpiCard label="Unanswered Requests" value={totalUnanswered} icon={MailWarning} />
        <KpiCard label="Complaints" value={totalComplaints} icon={AlertTriangle} />
        <KpiCard label="Avg. Fan Demand Score" value={avgScore} icon={Gauge} suffix="/ 100" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-5">
          <h2 className="mb-3 text-sm font-semibold text-white">Top Celebrities</h2>
          <div className="divide-y divide-white/5">
            {topCelebrities.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No celebrities tracked yet.</p>
            ) : (
              topCelebrities.map((c) => <CelebrityRow key={c.id} celebrity={c} />)
            )}
          </div>
        </div>

        <div className="glass-card p-5">
          <h2 className="mb-3 text-sm font-semibold text-white">Fastest Growing Demand</h2>
          <div className="divide-y divide-white/5">
            {fastestGrowing.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">
                No celebrities currently trending up.
              </p>
            ) : (
              fastestGrowing.map((c) => <CelebrityRow key={c.id} celebrity={c} />)
            )}
          </div>
        </div>

        <div className="glass-card p-5">
          <h2 className="mb-3 text-sm font-semibold text-white">Biggest Complaint Sources</h2>
          <div className="divide-y divide-white/5">
            {biggestComplaintSources.filter((c) => c.complaintCount > 0).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No significant complaints recorded.</p>
            ) : (
              biggestComplaintSources
                .filter((c) => c.complaintCount > 0)
                .map((c) => <CelebrityRow key={c.id} celebrity={c} />)
            )}
          </div>
        </div>

        <div className="glass-card p-5">
          <h2 className="mb-3 text-sm font-semibold text-white">Recent Public Discussions</h2>
          <div className="space-y-3">
            {(recentDiscussions ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">No discussions ingested yet.</p>
            ) : (
              (recentDiscussions ?? []).map((d: any) => (
                <div key={d.id} className="rounded-lg border border-border p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-white">
                      {d.celebrities?.canonical_name ?? 'Unknown'}
                    </span>
                    {d.is_demo && (
                      <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-warning">
                        Demo Data
                      </span>
                    )}
                  </div>
                  <p className="mb-1.5 line-clamp-2 text-xs text-muted">{d.content_excerpt}</p>
                  <div className="flex items-center justify-between text-[11px] text-muted">
                    <span>{d.social_platforms?.display_name ?? 'Unknown platform'}</span>
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
    </div>
  );
}
