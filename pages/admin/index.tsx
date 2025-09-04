import type { GetServerSideProps } from 'next';
import { isAdminFromSsr } from '@/lib/auth';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { DayRow } from '@/components/StackedBars';

// Carga charts solo en cliente (sin SSR)
const StackedBars = dynamic(() => import('@/components/StackedBars'), { ssr: false });
const PieActions  = dynamic(() => import('@/components/PieActions'),  { ssr: false });

type Stats = {
  ok: true;
  profiles: number;
  clicks: number;
  clicks7d: number;
  byDay: Record<string, Record<string, number>>;
  totals: Record<string, number>;
};

type Row = { id: string; slug: string; name: string };

const ACTION_KEYS = ['view', 'btn:whatsapp', 'btn:email', 'btn:phone', 'btn:site'] as const;
type ActionKey = (typeof ACTION_KEYS)[number];

type ClickItem = {
  ts?: string | null;
  created_at?: string | null;
  action: ActionKey | string;
  slug?: string | null;
};

export default function AdminDashboard() {
  const [profiles, setProfiles] = useState<Row[]>([]);
  const [slug, setSlug] = useState<string>('ALL');
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<ClickItem[]>([]); // 👈 sin any

  // cargar lista de perfiles
  useEffect(() => {
    fetch('/api/admin/profiles')
      .then((r) => r.json())
      .then((j) => setProfiles(j.data || []))
      .catch(() => setProfiles([]));
  }, []);

  // cargar stats y últimos clics según filtro
  useEffect(() => {
    const qs = slug === 'ALL' ? '' : `?slug=${encodeURIComponent(slug)}`;
    fetch(`/api/stats${qs}`)
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats(null));

    fetch(`/api/admin/clicks${qs}&limit=100`)
      .then((r) => r.json() as Promise<{ data?: ClickItem[] }>) // 👈 tipado de la respuesta
      .then((j) => setRecent(j.data ?? []))
      .catch(() => setRecent([]));
  }, [slug]);

  // Serie tipada para el gráfico
  const series = useMemo<DayRow[]>(
    () => (stats ? makeSeries(stats.byDay) : []),
    [stats]
  );

  const pieData = useMemo(() => {
    if (!stats) return [];
    return Object.keys(stats.totals)
      .map((name) => ({ name, value: stats.totals[name] ?? 0 }))
      .filter((d) => d.value > 0);
  }, [stats]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <nav className="flex gap-4 text-sm opacity-80">
          <Link href="/admin/profiles" className="underline-offset-2 hover:underline">Perfiles</Link>
          <Link href="/api/admin/logout" className="underline-offset-2 hover:underline">Salir</Link>
        </nav>
      </header>

      {/* Filtro */}
      <section className="bg-black/40 p-4 rounded-xl mb-6 flex items-center gap-3">
        <label className="text-sm opacity-80">Ver estadísticas de:</label>
        <select
          className="bg-black/50 border border-white/10 rounded-md px-2 py-1"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        >
          <option value="ALL">Todos</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.slug}>{p.name || p.slug}</option>
          ))}
        </select>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Kpi title="Perfiles" value={stats?.profiles ?? '…'} />
        <Kpi title="Clicks totales" value={stats?.clicks ?? '…'} />
        <Kpi title="Vistas últimos 7 días" value={stats?.clicks7d ?? '…'} />
      </section>

      {/* Barras apiladas */}
      <section className="mt-8 bg-black/40 p-4 rounded-xl">
        <h2 className="font-medium">Actividad por día</h2>
        <div className="mt-4" style={{ width: '100%', height: 340 }}>
          {series.length === 0 ? (
            <div className="opacity-70 text-sm">Sin datos.</div>
          ) : (
            <StackedBars data={series} />
          )}
        </div>
      </section>

      {/* Pie por acción */}
      <section className="mt-8 bg-black/40 p-4 rounded-xl">
        <h2 className="font-medium">Distribución por acción</h2>
        <div className="mt-4" style={{ width: '100%', height: 280 }}>
          {pieData.length === 0 ? (
            <div className="opacity-70 text-sm">Sin datos.</div>
          ) : (
            <PieActions data={pieData} />
          )}
        </div>
      </section>

      {/* Últimos clics */}
      <section className="mt-8 bg-black/40 p-4 rounded-xl">
        <h2 className="font-medium mb-3">Últimos clics</h2>
        <ul className="text-sm space-y-2 max-h-[420px] overflow-auto pr-2">
          {recent.map((r, i) => (
            <li key={i} className="opacity-80">
              <span className="opacity-60">
                {(r.ts ?? r.created_at ?? '').slice(0, 19).replace('T', ' ')}
              </span>
              {' — '}
              <span className="font-mono">{r.action}</span>
              {r.slug ? <> — <code className="opacity-90">{r.slug}</code></> : null}
            </li>
          ))}
          {recent.length === 0 && <li className="opacity-70">Sin registros.</li>}
        </ul>
      </section>
    </main>
  );
}

// 🔧 Generador tipado para el gráfico
function makeSeries(byDay: Stats['byDay']): DayRow[] {
  const days = Object.keys(byDay).sort();
  return days.map((d) => {
    const m = byDay[d] || {};
    const row: DayRow = { date: d };
    for (const k of ACTION_KEYS) {
      // asignación por clave conocida

      row[k] = Number(m[k] ?? 0);
    }
    return row;
  });
}

function Kpi({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-black/40 p-4">
      <div className="text-sm opacity-70">{title}</div>
      <div className="text-2xl font-semibold mt-2">{value}</div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  if (!isAdminFromSsr(ctx.req)) {
    return { redirect: { destination: '/admin/login', permanent: false } };
  }
  return { props: {} };
};
