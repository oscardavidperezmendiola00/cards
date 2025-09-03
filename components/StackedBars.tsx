import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useMemo } from 'react';

export type DayRow = {
  date: string;           // YYYY-MM-DD
  view?: number;
  'btn:whatsapp'?: number;
  'btn:email'?: number;
  'btn:phone'?: number;
  'btn:site'?: number;
};

export type StackedBarsProps = {
  data: DayRow[];
  height?: number;
  title?: string;
};

const COLOR = {
  view: '#94A3B8',          // slate-400 (neutral)
  'btn:whatsapp': '#10B981',// emerald-500
  'btn:email':   '#60A5FA', // blue-400
  'btn:phone':   '#F59E0B', // amber-500
  'btn:site':    '#22D3EE', // cyan-400
} as const;

// Claves métricas válidas (excluye "date")
type MetricKey = Exclude<keyof DayRow, 'date'>;
const METRICS: readonly MetricKey[] = [
  'view',
  'btn:whatsapp',
  'btn:email',
  'btn:phone',
  'btn:site',
];

function TinyTitle({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <div className="text-sm mb-2" style={{ color: '#E2E8F0' }}>
      {children}
    </div>
  );
}

const tooltipStyle: React.CSSProperties = {
  background: '#0B1220',
  border: '1px solid #334155',
  color: '#E2E8F0',
  borderRadius: 10,
  padding: '8px 10px',
};

export default function StackedBars({ data, height = 260, title }: StackedBarsProps) {
  // Solo incluimos las series que tienen algún valor en los datos
  const keys = useMemo<MetricKey[]>(
    () => METRICS.filter((k) => data.some((d) => (d[k] ?? 0) > 0)),
    [data]
  );

  // Evita SSR layout warnings
  if (typeof window === 'undefined') {
    return (
      <div style={{ height }}>
        <TinyTitle>{title}</TinyTitle>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-3 md:p-4"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <TinyTitle>{title}</TinyTitle>

      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          {/* Gradientes para dar vida a cada serie */}
          <defs>
            {keys.map((k) => (
              <linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLOR[k]} stopOpacity={0.95} />
                <stop offset="100%" stopColor={COLOR[k]} stopOpacity={0.75} />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.6} />
          <XAxis dataKey="date" stroke="#CBD5E1" tickMargin={6} tick={{ fontSize: 12 }} />
          <YAxis stroke="#CBD5E1" tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend
            wrapperStyle={{ color: '#E2E8F0', fontSize: 12 }}
            iconType="circle"
            verticalAlign="bottom"
            height={24}
          />

          {keys.map((k) => (
            <Bar
              key={k}
              dataKey={k}
              stackId="a"
              radius={[4, 4, 0, 0]}
              fill={`url(#g-${k})`}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
