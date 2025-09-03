import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { isAdminFromSsr } from '@/lib/auth';
import StackedBars, { type DayRow } from '@/components/StackedBars';
import PieActions, { type Slice } from '@/components/PieActions';

type Totals = {
  view?: number;
  'btn:whatsapp'?: number;
  'btn:email'?: number;
  'btn:phone'?: number;
  'btn:site'?: number;
};

type ApiStats = {
  ok?: boolean;
  totals?: Totals;
  // La API podría devolver "series" con claves libres; aquí lo tipamos de forma segura:
  series?: Array<Record<string, string | number>>;
  error?: string;
};

const ACTION_KEYS = ['view', 'btn:whatsapp', 'btn:email', 'btn:phone', 'btn:site'] as const;

function fmt(n: number | undefined) {
  return (n ?? 0).toLocaleString();
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState<Totals>({});
  const [series, setSeries] = useState<Array<Record<string, string | number>>>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Ajusta esta ruta si tu endpoint se llama distinto
        const r = await fetch('/api/admin/stats');
        const j: ApiStats = await r.json();
        if (!mounted) return;
        if (!r.ok || !j.ok) {
          // Si no existe el endpoint, deja datos vacíos
          setTotals({});
          setSeries([]);
        } else {
          setTotals(j.totals || {});
          setSeries(Array.isArray(j.series) ? j.series : []);
        }
      } catch {
        if (!mounted) return;
        setTotals({});
        setSeries([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // --- FIX: normaliza series a DayRow[] (con 'date' obligatorio) ---
  const seriesNorm: DayRow[] = useMemo(() => {
    const raw = series ?? [];
    return raw
      .map((r) => {
        const date =
          String((r.date ?? r.d ?? r.day ?? r.fecha ?? '')).trim();
        const row: DayRow = {
          date,
          view: Number(r['view'] ?? 0),
          'btn:whatsapp': Number(r['btn:whatsapp'] ?? 0),
          'btn:email': Number(r['btn:email'] ?? 0),
          'btn:phone': Number(r['btn:phone'] ?? 0),
          'btn:site': Number(r['btn:site'] ?? 0),
        };
        return row;
      })
      .filter((row) => row.date.length > 0);
  }, [series]);

  // Pie: totales por acción → slices
  const pieData: Slice[] = useMemo(() => {
    return ACTION_KEYS.map((k) => ({
      name: k,
      value: Number(totals[k] ?? 0),
    })).filter((s) => s.value > 0);
  }, [totals]);

  const totalViews = Number(totals.view ?? 0);
  const totalClicks =
    Number(totals['btn:whatsapp'] ?? 0) +
    Number(totals['btn:email'] ?? 0) +
    Number(totals['btn:phone'] ?? 0) +
    Number(totals['btn:site'] ?? 0);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard Trafika</h1>
          <p className="text-sm opacity-70">Resumen de actividad y accesos rápidos</p>
        </div>
        <nav className="flex gap-3 text-sm">
          <Link href="/" className="px-3 py-2 rounded bg-white/5 border border-white/10 hover:bg-white/10 transition">
            Inicio
          </Link>
          <Link href="/admin/profiles" className="px-3 py-2 rounded bg-emerald-500 text-slate-900 font-medium hover:brightness-95 transition">
            Perfiles
          </Link>
          <Link href="/api/admin/logout" className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 transition">
            Salir
          </Link>
        </nav>
      </header>

      {/* KPIs */}
      <section className="grid md:grid-cols-3 gap-4 mb-6">
        <article className="rounded-2xl p-5 bg-white/[0.03] border border-white/10">
          <div className="text-sm opacity-75">Vistas</div>
          <div className="mt-1 text-3xl font-semibold">{fmt(totalViews)}</div>
        </article>
        <article className="rounded-2xl p-5 bg-white/[0.03] border border-white/10">
          <div className="text-sm opacity-75">Clics</div>
          <div className="mt-1 text-3xl font-semibold">{fmt(totalClicks)}</div>
        </article>
        <article className="rounded-2xl p-5 bg-white/[0.03] border border-white/10">
          <div className="text-sm opacity-75">Acciones destacadas</div>
          <div className="mt-2 flex gap-2 text-xs">
            <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300">
              WA {fmt(totals['btn:whatsapp'])}
            </span>
            <span className="px-2 py-1 rounded bg-sky-500/20 text-sky-300">
              Email {fmt(totals['btn:email'])}
            </span>
            <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300">
              Llamar {fmt(totals['btn:phone'])}
            </span>
            <span className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300">
              Sitio {fmt(totals['btn:site'])}
            </span>
          </div>
        </article>
      </section>

      {/* Series por día */}
      <section className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/10">
            <div className="mb-2 text-sm opacity-80">Actividad (últimos días)</div>
            {loading ? (
              <div className="opacity-70 text-sm">Cargando…</div>
            ) : seriesNorm.length === 0 ? (
              <div className="opacity-70 text-sm">Aún no hay datos.</div>
            ) : (
              <StackedBars data={seriesNorm} />
            )}
          </div>
        </div>

        {/* Distribución por acción */}
        <div>
          <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/10">
            <div className="mb-2 text-sm opacity-80">Distribución por acción</div>
            {loading ? (
              <div className="opacity-70 text-sm">Cargando…</div>
            ) : pieData.length === 0 ? (
              <div className="opacity-70 text-sm">Sin clics aún.</div>
            ) : (
              <PieActions data={pieData} />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  if (!isAdminFromSsr(ctx.req)) {
    return { redirect: { destination: '/admin/login', permanent: false } };
  }
  return { props: {} };
};
