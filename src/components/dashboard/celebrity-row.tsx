import Link from 'next/link';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const LEVEL_COLORS: Record<string, string> = {
  very_low: 'text-muted',
  low: 'text-muted',
  moderate: 'text-warning',
  high: 'text-accent-soft',
  very_high: 'text-positive',
};

export default function CelebrityRow({
  celebrity,
}: {
  celebrity: {
    id: string;
    canonical_name: string;
    category: string;
    fan_demand_score: number;
    score_level: string;
    trend: 'up' | 'down' | 'stable';
    is_demo: boolean;
  };
}) {
  const TrendIcon =
    celebrity.trend === 'up' ? TrendingUp : celebrity.trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    celebrity.trend === 'up'
      ? 'text-positive'
      : celebrity.trend === 'down'
      ? 'text-negative'
      : 'text-muted';

  return (
    <Link
      href={`/dashboard/celebrities/${celebrity.id}`}
      className="flex items-center justify-between rounded-lg px-3 py-3 transition hover:bg-white/5"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-sm font-medium text-accent-soft">
          {celebrity.canonical_name.charAt(0)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">{celebrity.canonical_name}</span>
            {celebrity.is_demo && (
              <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-warning">
                Demo Data
              </span>
            )}
          </div>
          <span className="text-xs capitalize text-muted">{celebrity.category}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <TrendIcon className={`h-4 w-4 ${trendColor}`} />
        <span className={`text-sm font-semibold ${LEVEL_COLORS[celebrity.score_level]}`}>
          {celebrity.fan_demand_score}
        </span>
      </div>
    </Link>
  );
}
