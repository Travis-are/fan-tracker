'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS: Record<string, string> = {
  positive: '#22c55e',
  neutral: '#94a3b8',
  negative: '#f59e0b',
  frustrated: '#ef4444',
};

export default function SentimentChart({
  breakdown,
}: {
  breakdown: { positive: number; neutral: number; negative: number; frustrated: number };
}) {
  const data = Object.entries(breakdown)
    .map(([key, value]) => ({ name: key, value }))
    .filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex h-52 items-center justify-center text-sm text-muted">
        No sentiment data available yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={COLORS[entry.name]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: '#0f1424',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
