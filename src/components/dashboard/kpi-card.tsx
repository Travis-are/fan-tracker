import { LucideIcon } from 'lucide-react';

export default function KpiCard({
  label,
  value,
  icon: Icon,
  suffix,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  suffix?: string;
}) {
  return (
    <div className="glass-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
        <Icon className="h-4 w-4 text-accent-soft" />
      </div>
      <div className="text-2xl font-semibold text-white">
        {value}
        {suffix && <span className="ml-1 text-sm text-muted">{suffix}</span>}
      </div>
    </div>
  );
}
