'use client';

import { useEffect, useState } from 'react';
import { Bell, Plus, X } from 'lucide-react';

const ALERT_TYPES = [
  { value: 'fan_card_increase', label: "Fan card demand increases by X%", unit: '%' },
  { value: 'membership_increase', label: 'Membership demand increases by X%', unit: '%' },
  { value: 'meet_greet_threshold', label: 'Meet & greet demand exceeds X', unit: '' },
  { value: 'unanswered_increase', label: 'Unanswered requests increase', unit: '' },
  { value: 'score_threshold', label: 'Fan Demand Score exceeds X', unit: '' },
];

const STATUS_COLORS: Record<string, string> = {
  active: 'text-accent-soft bg-accent/15',
  triggered: 'text-warning bg-warning/15',
  disabled: 'text-muted bg-white/5',
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [celebrities, setCelebrities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [celebrityId, setCelebrityId] = useState('');
  const [alertType, setAlertType] = useState(ALERT_TYPES[0].value);
  const [threshold, setThreshold] = useState('20');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchAlerts() {
    setLoading(true);
    try {
      const res = await fetch('/api/alerts');
      const json = await res.json();
      setAlerts(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCelebrities() {
    const res = await fetch('/api/celebrities?limit=100');
    const json = await res.json();
    setCelebrities(json.data ?? []);
  }

  useEffect(() => {
    fetchAlerts();
    fetchCelebrities();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        celebrityId: celebrityId || undefined,
        alertType,
        thresholdValue: Number(threshold),
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? 'Failed to create alert');
      return;
    }

    setShowForm(false);
    setCelebrityId('');
    setThreshold('20');
    fetchAlerts();
  }

  async function toggleStatus(alertId: string, currentStatus: string) {
    const newStatus = currentStatus === 'disabled' ? 'active' : 'disabled';
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: newStatus } : a))
    );
    await fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId, status: newStatus }),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-accent-soft" />
          <div>
            <h1 className="text-xl font-semibold text-white">Alerts</h1>
            <p className="text-sm text-muted">Configurable thresholds on fan-demand signals</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-glow transition hover:bg-accent-glow"
        >
          <Plus className="h-4 w-4" />
          New Alert
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="glass-card space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs text-muted">Celebrity</label>
              <select
                value={celebrityId}
                onChange={(e) => setCelebrityId(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent"
              >
                <option value="">Select a celebrity...</option>
                {celebrities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.canonical_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-muted">Trigger</label>
              <select
                value={alertType}
                onChange={(e) => setAlertType(e.target.value)}
                className="w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent"
              >
                {ALERT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-muted">Threshold Value</label>
            <input
              type="number"
              min={0}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              required
              className="w-full max-w-xs rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent"
            />
          </div>

          {error && <p className="text-sm text-negative">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-glow disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Alert'}
          </button>
        </form>
      )}

      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Alert</th>
              <th className="px-4 py-3">Celebrity</th>
              <th className="px-4 py-3">Trigger</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  Loading alerts...
                </td>
              </tr>
            ) : alerts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  No alerts configured yet.
                </td>
              </tr>
            ) : (
              alerts.map((alert) => {
                const typeInfo = ALERT_TYPES.find((t) => t.value === alert.alert_type);
                return (
                  <tr key={alert.id}>
                    <td className="px-4 py-3 text-white">
                      {typeInfo?.label.replace('X', String(alert.threshold_value)) ?? alert.alert_type}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {alert.celebrities?.canonical_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {alert.threshold_value}
                      {typeInfo?.unit}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(alert.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[alert.status]}`}
                      >
                        {alert.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => toggleStatus(alert.id, alert.status)}
                        className="text-muted transition hover:text-white"
                        title={alert.status === 'disabled' ? 'Re-enable' : 'Disable'}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
