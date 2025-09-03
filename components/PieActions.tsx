import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from 'recharts';

export type Slice = { name: string; value: number };

export type PieActionsProps = {
  data: Slice[];         // [{ name: 'btn:whatsapp', value: 10 }, ...]
  height?: number;
  title?: string;
};

const COLOR = {
  view: '#94A3B8',          // slate-400
  'btn:whatsapp': '#10B981',// emerald-500
  'btn:email': '#60A5FA',   // blue-400
  'btn:phone': '#F59E0B',   // amber-500
  'btn:site': '#22D3EE',    // cyan-400
} as const;

const LABELS: Record<string, string> = {
  view: 'Vistas',
  'btn:whatsapp': 'WhatsApp',
  'btn:email': 'Email',
  'btn:phone': 'Llamar',
  'btn:site': 'Sitio Web',
};

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

export default function PieActions({ data, height = 260, title }: PieActionsProps) {
  if (typeof window === 'undefined') {
    return (
      <div style={{ height }}>
        <TinyTitle>{title}</TinyTitle>
      </div>
    );
  }

  // Normaliza etiquetas bonitas
  const norm = data.map((d) => ({
    ...d,
    name: LABELS[d.name] ?? d.name,
  }));

  return (
    <div className="rounded-2xl p-3 md:p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <TinyTitle>{title}</TinyTitle>

      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={norm}
            dataKey="value"
            nameKey="name"
            innerRadius={70}
            outerRadius={100}
            stroke="#0B1220"
            strokeWidth={2}
            paddingAngle={2}
          >
            {norm.map((entry) => {
              // Busca color por clave original (usamos etiquetas mapeadas para mostrar)
              const originalKey =
                Object.keys(LABELS).find((k) => LABELS[k] === entry.name) || entry.name;
              const color = (COLOR as Record<string, string>)[originalKey] || '#64748B';
              return <Cell key={entry.name} fill={color} />;
            })}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend
            wrapperStyle={{ color: '#E2E8F0', fontSize: 12 }}
            iconType="circle"
            verticalAlign="bottom"
            height={24}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
