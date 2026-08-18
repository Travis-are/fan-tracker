'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

export default function AiSummaryCard({ celebrityId }: { celebrityId: string }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSummary() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/celebrities/${celebrityId}/summary`);
        if (!res.ok) throw new Error('Failed to load summary');
        const json = await res.json();
        if (!cancelled) setSummary(json.data.summary);
      } catch {
        if (!cancelled) setError('AI summary is temporarily unavailable.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSummary();
    return () => {
      cancelled = true;
    };
  }, [celebrityId]);

  return (
    <div className="glass-card border-accent/20 p-5">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent-soft" />
        <h2 className="text-sm font-semibold text-white">AI-Generated Analysis</h2>
        <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-accent-soft">
          AI Inference
        </span>
      </div>

      {loading && <p className="text-sm text-muted">Generating summary from available data...</p>}
      {error && <p className="text-sm text-negative">{error}</p>}
      {!loading && !error && summary && <p className="text-sm text-white/90">{summary}</p>}

      <p className="mt-3 text-[11px] text-muted">
        This summary is AI-generated analysis based on measured public discussion data. It is not
        a verified fact and should be interpreted as an intelligence signal, not a claim of ground
        truth.
      </p>
    </div>
  );
}
