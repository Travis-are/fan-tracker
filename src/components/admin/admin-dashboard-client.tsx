'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, Database, Activity, Users, AlertCircle, RefreshCw } from 'lucide-react';

export default function AdminDashboardClient() {
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningJob, setRunningJob] = useState(false);
  const [jobMessage, setJobMessage] = useState<string | null>(null);

  async function fetchAll() {
    setLoading(true);
    const [statsRes, logsRes, usersRes] = await Promise.all([
      fetch('/api/admin/stats'),
      fetch('/api/admin/logs?limit=20'),
      fetch('/api/admin/users'),
    ]);
    setStats((await statsRes.json()).data);
    setLogs((await logsRes.json()).data ?? []);
    setUsers((await usersRes.json()).data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchAll();
  }, []);

  async function triggerRecompute() {
    setRunningJob(true);
    setJobMessage(null);
    try {
      const res = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setJobMessage('Analytics recomputation completed.');
        fetchAll();
      } else {
        setJobMessage('Recomputation failed — check error logs below.');
      }
    } finally {
      setRunningJob(false);
    }
  }

  async function updateUserRole(userId: string, role: 'member' | 'admin') {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    });
  }

  if (loading || !stats) {
    return <div className="py-16 text-center text-sm text-muted">Loading admin panel...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-accent-soft" />
          <div>
            <h1 className="text-xl font-semibold text-white">Admin Panel</h1>
            <p className="text-sm text-muted">System configuration, data sources, and users</p>
          </div>
        </div>
        <button
          onClick={triggerRecompute}
          disabled={runningJob}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-glow transition hover:bg-accent-glow disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${runningJob ? 'animate-spin' : ''}`} />
          {runningJob ? 'Running...' : 'Recompute Analytics'}
        </button>
      </div>

      {jobMessage && (
        <div className="glass-card p-3 text-sm text-accent-soft">{jobMessage}</div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="glass-card p-5">
          <span className="text-xs uppercase text-muted">Celebrities</span>
          <div className="mt-2 text-2xl font-semibold text-white">{stats.totalCelebrities}</div>
        </div>
        <div className="glass-card p-5">
          <span className="text-xs uppercase text-muted">Discussions</span>
          <div className="mt-2 text-2xl font-semibold text-white">{stats.totalDiscussions}</div>
        </div>
        <div className="glass-card p-5">
          <span className="text-xs uppercase text-muted">Users</span>
          <div className="mt-2 text-2xl font-semibold text-white">{stats.totalUsers}</div>
        </div>
        <div className="glass-card p-5">
          <span className="text-xs uppercase text-muted">Errors (7d)</span>
          <div className="mt-2 text-2xl font-semibold text-negative">
            {stats.errorLogCountLast7Days}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Database className="h-4 w-4 text-accent-soft" />
            <h2 className="text-sm font-semibold text-white">System Status</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">Mode</span>
              <span className={stats.demoMode ? 'text-warning' : 'text-positive'}>
                {stats.demoMode ? 'DEMO MODE' : 'LIVE MODE'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Gemini AI Provider</span>
              <span className={stats.aiProvider.configured ? 'text-positive' : 'text-negative'}>
                {stats.aiProvider.configured ? 'Connected' : 'Not Configured'}
              </span>
            </div>
            {stats.dataSources.map((ds: any) => (
              <div key={ds.id} className="flex items-center justify-between">
                <span className="text-muted">
                  {ds.social_platforms?.display_name ?? 'Unknown'} ({ds.source_type})
                </span>
                <span
                  className={
                    ds.status === 'active'
                      ? 'text-positive'
                      : ds.status === 'error'
                      ? 'text-negative'
                      : 'text-muted'
                  }
                >
                  {ds.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent-soft" />
            <h2 className="text-sm font-semibold text-white">Recent Ingestion Jobs</h2>
          </div>
          <div className="space-y-2 text-sm">
            {stats.recentIngestionJobs.length === 0 ? (
              <p className="text-muted">No ingestion jobs have run yet.</p>
            ) : (
              stats.recentIngestionJobs.map((job: any) => (
                <div key={job.id} className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-muted">
                    {job.items_created}/{job.items_processed} created
                  </span>
                  <span
                    className={
                      job.status === 'completed'
                        ? 'text-positive'
                        : job.status === 'failed'
                        ? 'text-negative'
                        : 'text-warning'
                    }
                  >
                    {job.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-accent-soft" />
          <h2 className="text-sm font-semibold text-white">User Management</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted">
            <tr>
              <th className="py-2">Email</th>
              <th className="py-2">Role</th>
              <th className="py-2">Joined</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="py-2 text-white">{u.email}</td>
                <td className="py-2 capitalize text-muted">{u.role}</td>
                <td className="py-2 text-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => updateUserRole(u.id, u.role === 'admin' ? 'member' : 'admin')}
                    className="text-xs text-accent-soft hover:underline"
                  >
                    {u.role === 'admin' ? 'Demote to Member' : 'Promote to Admin'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="glass-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-accent-soft" />
          <h2 className="text-sm font-semibold text-white">Error Logs</h2>
        </div>
        <div className="space-y-2 text-sm">
          {logs.filter((l) => l.level === 'error').length === 0 ? (
            <p className="text-muted">No errors logged.</p>
          ) : (
            logs
              .filter((l) => l.level === 'error')
              .map((log) => (
                <div key={log.id} className="rounded-lg border border-negative/20 bg-negative/5 p-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-negative">{log.source}</span>
                    <span className="text-muted">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-white/80">{log.message}</p>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
