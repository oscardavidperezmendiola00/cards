// pages/cliente/[slug].tsx
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
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
  series?: Array<Record<string, string | number>>;
  error?: string;
};

type PublicProfile = {
  id: string;
  slug: string;
  name: string;
  headline: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  avatar_url: string | null;
  socials_json: { site?: string } | null;
  theme: { primary: string; accent: string; bg: string; text: string } | null;
};

type ApiProfile = { ok?: boolean; data?: PublicProfile; error?: string };

const ACTION_KEYS = ['view', 'btn:whatsapp', 'btn:email', 'btn:phone', 'btn:site'] as const;

function fmt(n: number | undefined) {
  return (n ?? 0).toLocaleString();
}

export default function ClientePorSlug() {
  const router = useRouter();
  const slug = typeof router.query.slug === 'string' ? router.query.slug : '';

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [totals, setTotals] = useState<Totals>({});
  const [series, setSeries] = useState<Array<Record<string, string | number>>>([]);

  // Carga perfil público
  useEffect(() => {
    if (!slug) return;
    let mounted = true;
    (async () => {
      try {
        const r = await fetch(`/api/client/profile?slug=${encodeURIComponent(slug)}`);
        const j: ApiProfile = await r.json();
        if (!mounted) return;
        setProfile(j.ok ? (j.data ?? null) : null);
      } catch {
        if (!mounted) return;
        setProfile(null);
      } finally {
        if (mounted) setLoadingProfile(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [slug]);

  // Carga stats del cliente
  useEffect(() => {
    if (!slug) return;
    let mounted = true;
    (async () => {
      try {
        const r = await fetch(`/api/client/stats?slug=${encodeURIComponent(slug)}&days=14`);
        const j: ApiStats = await r.json();
        if (!mounted) return;
        if (j.ok) {
          setTotals(j.totals || {});
          setSeries(Array.isArray(j.series) ? j.series : []);
        } else {
          setTotals({});
          setSeries([]);
        }
      } catch {
        if (!mounted) return;
        setTotals({});
        setSeries([]);
      } finally {
        if (mounted) setLoadingStats(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [slug]);

  // --- FIX: normaliza series a DayRow[] (con 'date' obligatorio) ---
  const seriesNorm: DayRow[] = useMemo(() => {
    const raw = series ?? [];
    return raw
      .map((r) => {
        const date = String((r.date ?? r.d ?? r.day ?? r.fecha ?? '')).trim();
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

  // Pie: totales por acción
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
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">
          Cliente: {profile?.name || slug || '…'}
        </h1>
        {profile?.company ? (
          <p className="text-sm opacity-70">{profile.company}</p>
        ) : null}
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
          <div className="text-sm opacity-75">WhatsApp · Email · Tel · Sitio</div>
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

      {/* Gráficas */}
      <section className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded-2xl p-4 bg-white/[0.03] border border-white/10">
          <div className="mb-2 text-sm opacity-80">Actividad (últimos 14 días)</div>
          <div className="mt-2" style={{ width: '100%', height: 320 }}>
            {loadingStats ? (
              <div className="opacity-70 text-sm">Cargando…</div>
            ) : seriesNorm.length ? (
              <StackedBars data={seriesNorm} />
            ) : (
              <div className="opacity-70 text-sm">Sin datos.</div>
            )}
          </div>
        </div>

        <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/10">
          <div className="mb-2 text-sm opacity-80">Distribución por acción</div>
          <div className="mt-2" style={{ width: '100%', height: 320 }}>
            {loadingStats ? (
              <div className="opacity-70 text-sm">Cargando…</div>
            ) : pieData.length ? (
              <PieActions data={pieData} />
            ) : (
              <div className="opacity-70 text-sm">Sin clics aún.</div>
            )}
          </div>
        </div>
      </section>

      {/* Info del perfil (resumen) */}
      <section className="mt-8 rounded-2xl p-5 bg-white/[0.02] border border-white/10">
        {loadingProfile ? (
          <div className="opacity-70 text-sm">Cargando perfil…</div>
        ) : !profile ? (
          <div className="opacity-70 text-sm">Perfil no encontrado.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm opacity-70">Nombre</div>
              <div className="text-lg">{profile.name}</div>
              {profile.headline && (
                <>
                  <div className="mt-3 text-sm opacity-70">Headline</div>
                  <div>{profile.headline}</div>
                </>
              )}
              {profile.email && (
                <>
                  <div className="mt-3 text-sm opacity-70">Email</div>
                  <div>{profile.email}</div>
                </>
              )}
              {profile.whatsapp && (
                <>
                  <div className="mt-3 text-sm opacity-70">WhatsApp</div>
                  <div>{profile.whatsapp}</div>
                </>
              )}
              {profile.socials_json?.site && (
                <>
                  <div className="mt-3 text-sm opacity-70">Sitio</div>
                  <div className="truncate">{profile.socials_json.site}</div>
                </>
              )}
            </div>
            <div className="text-sm opacity-70">
              Vista previa, edición y acceso a la tarjeta están disponibles en otras secciones (según tu flujo).
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
