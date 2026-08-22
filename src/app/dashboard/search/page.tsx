'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search as SearchIcon } from 'lucide-react';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    celebrities: any[];
    platforms: any[];
    complaintTypes: any[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length === 0) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setResults(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => runSearch(query), 350);
    return () => clearTimeout(timeout);
  }, [query, runSearch]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <SearchIcon className="h-5 w-5 text-accent-soft" />
        <h1 className="text-xl font-semibold text-white">Search</h1>
      </div>

      <input
        autoFocus
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search celebrities, usernames, platforms, complaint types..."
        className="w-full max-w-xl rounded-lg border border-border bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-accent"
      />

      {loading && <p className="text-sm text-muted">Searching...</p>}

      {results && !loading && (
        <div className="space-y-8">
          {results.celebrities.length > 0 && (
            <div>
              <h2 className="mb-3 text-xs uppercase tracking-wide text-muted">Celebrities</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {results.celebrities.map((c) => (
                  <Link
                    key={c.id}
                    href={`/dashboard/celebrities/${c.id}`}
                    className="glass-card flex items-center justify-between p-4 transition hover:border-accent/40"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{c.canonical_name}</p>
                      <p className="text-xs capitalize text-muted">{c.category}</p>
                    </div>
                    {c.is_demo && (
                      <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-warning">
                        Demo
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {results.platforms.length > 0 && (
            <div>
              <h2 className="mb-3 text-xs uppercase tracking-wide text-muted">Platforms</h2>
              <div className="flex flex-wrap gap-2">
                {results.platforms.map((p) => (
                  <span
                    key={p.id}
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-muted"
                  >
                    {p.display_name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {results.complaintTypes.length > 0 && (
            <div>
              <h2 className="mb-3 text-xs uppercase tracking-wide text-muted">Complaint Types</h2>
              <div className="flex flex-wrap gap-2">
                {results.complaintTypes.map((c) => (
                  <span
                    key={c.value}
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-muted"
                  >
                    {c.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {results.celebrities.length === 0 &&
            results.platforms.length === 0 &&
            results.complaintTypes.length === 0 && (
              <p className="text-sm text-muted">No results found for &quot;{query}&quot;.</p>
            )}
        </div>
      )}
    </div>
  );
}
