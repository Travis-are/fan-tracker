export default function DemandBar({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-medium text-white">
          {value === null ? 'INSUFFICIENT DATA' : `${value}%`}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: value === null ? '0%' : `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}
