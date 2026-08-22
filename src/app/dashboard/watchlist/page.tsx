'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star, TrendingUp, TrendingDown, Minus, X } from 'lucide-react';

interface WatchlistItem {
  watchlistId: string;
  addedAt: string;
  celebrity: {
    id: string;
    canonical_name: string;
    category: string;
    fan_demand_score: number;
    score_level: string;
    is_demo: boolean;
  };
  currentScore: number | null;
  previousScore: number | null;
  demandChange: number | null;
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchWatchlist() {
    setLoading(true);
    try {
      const res = await fetch('/api/watchlist');
      const json = await res.json();
      setItems(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWatchlist();
  }, []);

  async function removeItem(celebrityId: string) {
    setItems((prev) => prev.filter((i) => i.celebrity.id !== celebrityId));
    await fetch('/api/watchlist', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ celebrityId }),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Star className="h-5 w-5 text-accent-soft" />
        <div>
          <h1 className="text-xl font-semibold text-white">Watchlist</h1>
          <p className="text-sm text-muted">Public figures you're tracking closely</p>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-muted">Loading watchlist...</div>
      ) : items.length === 0 ? (
        <div className="glass-card py-16 text-center">
          <p className="text-sm text-muted">
            You have not added any celebrities to your watchlist yet.
          </p>
          <Link
            href="/dashboard/discover"
            className="mt-3 inline-block text-sm text-accent-soft hover:underline"
          >
            Discover celebrities to track →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const change = item.demandChange;
            const TrendIcon = change === null ? Minus : change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
            const trendColor =
              change === null ? 'text-muted' : change > 0 ? 'text-positive' : change < 0 ? 'text-negative' : 'text-muted';

            return (
              <div key={item.watchlistId} className="glass-card p-5">
                <div className="mb-3 flex items-start justify-between">
                  <Link
                    href={`/dashboard/celebrities/${item.celebrity.id}`}
                    className="text-sm font-medium text-white hover:text-accent-soft"
                  >
                    {item.celebrity.canonical_name}
                  </Link>
                  <button
                    onClick={() => removeItem(item.celebrity.id)}
                    className="text-muted transition hover:text-negative"
                    aria-label="Remove from watchlist"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {item.celebrity.is_demo && (
                  <span className="mb-2 inline-block rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-warning">
                    Demo Data
                  </span>
                )}

                <p className="mb-3 text-xs capitalize text-muted">{item.celebrity.category}</p>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted">Current Score</span>
                    <div className="text-2xl font-semibold text-white">
                      {item.currentScore ?? '—'}
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
                    <TrendIcon className="h-4 w-4" />
                    {change !== null ? `${change > 0 ? '+' : ''}${change}` : 'No history yet'}
                  </div>
                </div>

                {item.previousScore !== null && (
                  <p className="mt-1 text-[11px] text-muted">Previous: {item.previousScore}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
