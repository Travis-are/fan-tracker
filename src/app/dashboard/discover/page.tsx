'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Compass } from 'lucide-react';

const FILTERS = [
  { value: 'score', label: 'Highest Fan Demand Score' },
  { value: 'fan_card', label: 'Highest Fan Card Demand' },
  { value: 'membership', label: 'Highest Membership Demand' },
  { value: 'meet_greet', label: 'Highest Meet & Greet Demand' },
  { value: 'complaints', label: 'Most Complaints' },
  { value: 'unanswered', label: 'Most Unanswered Requests' },
  { value: 'growth', label: 'Fastest Growth' },
];

const LEVEL_COLORS: Record<string, string> = {
  very_low: 'text-muted',
  low: 'text-muted',
  moderate: 'text-warning',
  high: 'text-accent-soft',
  very_high: 'text-positive',
};

export default function DiscoverPage() {
  const [filter, setFilter] = useState('score');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchResults() {
      setLoading(true);
      try {
        const res = await fetch(`/api/discover?filter=${filter}&limit=24`);
        const json = await res.json();
        if (!cancelled) setResults(json.data ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchResults();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Compass className="h-5 w-5 text-accent-soft" />
        <div>
          <h1 className="text-xl font-semibold text-white">Discover Celebrities</h1>
          <p className="text-sm text-muted">
            Automatically surfaced public figures with significant fan-demand signals
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
              filter === f.value
                ? 'bg-accent text-white shadow-glow'
                : 'border border-border text-muted hover:border-accent/50 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-muted">Loading results...</div>
      ) : results.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted">
          No public figures match this filter yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/celebrities/${c.id}`}
              className="glass-card p-5 transition hover:border-accent/40"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-sm font-medium text-accent-soft">
                  {c.canonical_name.charAt(0)}
                </div>
                {c.is_demo && (
                  <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-warning">
                    Demo Data
                  </span>
                )}
              </div>
              <h3 className="text-sm font-medium text-white">{c.canonical_name}</h3>
              <p className="mb-3 text-xs capitalize text-muted">{c.category}</p>

              <div className="flex items-center justify-between">
                <span className={`text-lg font-semibold ${LEVEL_COLORS[c.score_level]}`}>
                  {c.fan_demand_score}
                </span>
                <span className="text-[11px] capitalize text-muted">
                  {c.score_level.replace('_', ' ')}
                </span>
              </div>

              {(filter === 'fan_card' || filter === 'membership' || filter === 'meet_greet') && (
                <div className="mt-2 text-xs text-accent-soft">
                  {filter === 'fan_card' &&
                    (c.fan_card_pct !== null ? `${c.fan_card_pct}% fan card demand` : 'Insufficient data')}
                  {filter === 'membership' &&
                    (c.membership_pct !== null
                      ? `${c.membership_pct}% membership demand`
                      : 'Insufficient data')}
                  {filter === 'meet_greet' &&
                    (c.meet_greet_pct !== null
                      ? `${c.meet_greet_pct}% meet & greet demand`
                      : 'Insufficient data')}
                </div>
              )}

              {(filter === 'complaints' || filter === 'unanswered') && (
                <div className="mt-2 text-xs text-negative">
                  {filter === 'complaints' && `${c.complaint_count} complaints`}
                  {filter === 'unanswered' && `${c.unanswered_count} unanswered requests`}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
