import type { GetServerSideProps } from 'next';
import { isAdminFromSsr } from '@/lib/auth';        // cambia a ruta relativa si no usas "@"
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

// Carga cliente de los charts (sin SSR)
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

function makeSeries(byDay: Stats['byDay']) {
  const days = Object.keys(byDay).sort();
  return days.map(d => {
    const m = byDay[d] || {};
    const obj: Record<string, number | string> = { date: d };
    let total = 0;
    for (const k of ACTION_KEYS) {
      const v = m[k] ?? 0;
      obj[k] = v;
      total += v;
    }
    obj.total = total;
    return obj;
  });
}

export default function AdminHome() {
  const [profiles, setProfiles] = useState<Row[]>([]);
  const [slug, setSlug] = useState<string>('ALL');
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Array<{ ts: string; action: string; slug: string; ref: string | null; country: string | null; device: string | null }>>([]);

  // cargar lista de perfiles
  useEffect(() => {
    fetch('/api/admin/profiles')
      .then(r => r.json())
      .then(j => setProfiles(j.data || []))
      .catch(() => setProfiles([]));
  }, []);

  // cargar stats y últimos clics según filtro
  useEffect(() => {
    const qs = slug === 'ALL' ? '' : `?slug=${encodeURIComponent(slug)}`;
    fetch(`/api/stats${qs}`).then(r => r.json()).then(setStats).catch(()=>setStats(null));
    fetch(`/api/admin/clicks${qs}&limit=100`).then(r => r.json()).then(j => setRecent(j.data || [])).catch(()=>setRecent([]));
  }, [slug]);

  const series = useMemo(() => (stats ? makeSeries(stats.byDay) : []), [stats]);

  const pieData = useMemo(() => {
    if (!stats) return [];
    return Object.keys(stats.totals)
      .map(name => ({ name, value: stats.totals[name] ?? 0 }))
      .filter(d => d.value > 0);
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
          className="p-2 rounded bg-slate-900 border border-slate-700"
          value={slug}
          onChange={e => setSlug(e.target.value)}
        >
          <option value="ALL">Todos</option>
          {profiles.map(p => (
            <option key={p.id} value={p.slug}>{p.name} — {p.slug}</option>
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
            <div className="opacity-70 text-sm">Aún no hay datos.</div>
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
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left opacity-70">
              <tr><th>Fecha</th><th>Slug</th><th>Acción</th><th>País</th><th>Dispositivo</th><th>Ref</th></tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr><td colSpan={6} className="p-3 opacity-70">Sin registros</td></tr>
              ) : recent.map((r, i) => (
                <tr key={i} className="border-t border-slate-800">
                  <td className="p-2">{new Date(r.ts).toLocaleString()}</td>
                  <td className="p-2">{r.slug}</td>
                  <td className="p-2">{r.action}</td>
                  <td className="p-2">{r.country ?? '-'}</td>
                  <td className="p-2">{r.device ?? '-'}</td>
                  <td className="p-2 max-w-[340px] truncate" title={r.ref ?? ''}>{r.ref ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
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
