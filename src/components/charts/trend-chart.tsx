'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function TrendChart({
  data,
}: {
  data: {
    metric_date: string;
    fan_card_demand: number;
    membership_demand: number;
    meet_greet_demand: number;
    complaints: number;
    unanswered_requests: number;
  }[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted">
        Not enough historical data yet to render a trend chart.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="metric_date"
          stroke="rgba(255,255,255,0.4)"
          fontSize={11}
          tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        />
        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
        <Tooltip
          contentStyle={{
            background: '#0f1424',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="fan_card_demand" name="Fan Card" stroke="#6366f1" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="membership_demand" name="Membership" stroke="#22c55e" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="meet_greet_demand" name="Meet & Greet" stroke="#f59e0b" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="complaints" name="Complaints" stroke="#ef4444" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="unanswered_requests" name="Unanswered" stroke="#94a3b8" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
