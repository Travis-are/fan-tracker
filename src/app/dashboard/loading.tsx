export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-48 animate-pulse rounded bg-white/5" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card h-24 animate-pulse" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card h-64 animate-pulse" />
        <div className="glass-card h-64 animate-pulse" />
      </div>
    </div>
  );
}
