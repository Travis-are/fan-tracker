'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';

export default function WatchlistButton({ celebrityId }: { celebrityId: string }) {
  const [watching, setWatching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkStatus() {
      try {
        const res = await fetch('/api/watchlist');
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) {
          setWatching(
            (json.data ?? []).some((w: any) => w.celebrity?.id === celebrityId)
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    checkStatus();
    return () => {
      cancelled = true;
    };
  }, [celebrityId]);

  async function toggle() {
    setPending(true);
    try {
      if (watching) {
        await fetch('/api/watchlist', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ celebrityId }),
        });
        setWatching(false);
      } else {
        await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ celebrityId }),
        });
        setWatching(true);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading || pending}
      className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
        watching
          ? 'border-accent bg-accent/15 text-accent-soft'
          : 'border-border text-muted hover:border-accent/50 hover:text-white'
      }`}
    >
      <Star className={`h-4 w-4 ${watching ? 'fill-accent-soft' : ''}`} />
      {watching ? 'Watchlisted' : 'Add to Watchlist'}
    </button>
  );
}
