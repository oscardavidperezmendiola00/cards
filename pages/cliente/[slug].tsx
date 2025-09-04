import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { DayRow } from '@/components/StackedBars'; // <- tipo del gráfico

// Charts solo en cliente
const StackedBars = dynamic(() => import('@/components/StackedBars'), { ssr: false });
const PieActions  = dynamic(() => import('@/components/PieActions'),  { ssr: false });

type Theme = { primary: string; accent: string; bg: string; text: string };
type Socials = { site?: string } | null;

type Profile = {
  id: string;
  slug: string;
  name: string;
  headline?: string;
  company?: string;
  avatar_url?: string;
  whatsapp?: string;
  email?: string;
  phone?: string;
  socials_json?: Socials;
  theme?: Theme;
};

type Stats = {
  ok: true;
  profiles: number;
  clicks: number;
  clicks7d: number;
  byDay: Record<string, Record<string, number>>;
  totals: Record<string, number>;
};

const ACTION_KEYS = ['view', 'btn:whatsapp', 'btn:email', 'btn:phone', 'btn:site'] as const;
type ActionKey = (typeof ACTION_KEYS)[number];

// --- SIN any: builder intermedio con claves seguras y "total" opcional
type RowBuild = { date: string } & Partial<Record<ActionKey, number>> & { total?: number };

// makeSeries ahora devuelve exactamente DayRow[], sin usar `any`
function makeSeries(byDay: Stats['byDay']): DayRow[] {
  const days = Object.keys(byDay).sort();

  return days.map((d) => {
    const m = byDay[d] || {};

    // construimos las entradas tipadas para las acciones
    const actionEntries = ACTION_KEYS.map((k) => [k, Number(m[k] ?? 0)] as const);
    const actionsObj: Partial<Record<ActionKey, number>> = Object.fromEntries(actionEntries);

    const total = ACTION_KEYS.reduce((acc, k) => acc + Number(m[k] ?? 0), 0);

    // row intermedio con tipos estrictos (incluye total por si lo usas en otro lado)
    const rowBuild: RowBuild = { date: d, ...actionsObj, total };

    // adaptamos al tipo que espera el componente (no any)
    const { date, ...rest } = rowBuild;
    const dayRow: DayRow = { date, ...(rest as Record<string, number>) };

    return dayRow;
  });
}

type ProfilePatch = {
  name: string;
  headline?: string | null;
  company?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  socials_site?: string | null;
};

type UpdateRequest = {
  slug: string;
  pin: string;
  patch: ProfilePatch;
};

export default function ClienteSlug() {
  const router = useRouter();
  const { slug, pin } = router.query as { slug?: string; pin?: string };

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const [form, setForm] = useState<ProfilePatch>({
    name: '',
    headline: null,
    company: null,
    email: null,
    whatsapp: null,
    phone: null,
    avatar_url: null,
    socials_site: null,
  });

  // Cargar perfil + stats
  useEffect(() => {
    if (!slug) return;
    void (async () => {
      const rp = await fetch(`/api/client/profile?slug=${encodeURIComponent(slug)}`);
      const jp: { ok?: boolean; data?: Profile } = await rp.json();
      if (jp?.data) {
        setProfile(jp.data);
        setForm({
          name: jp.data.name ?? '',
          headline: jp.data.headline ?? null,
          company: jp.data.company ?? null,
          email: jp.data.email ?? null,
          whatsapp: jp.data.whatsapp ?? null,
          phone: jp.data.phone ?? null,
          avatar_url: jp.data.avatar_url ?? null,
          socials_site: jp.data.socials_json?.site ?? null,
        });
      } else {
        setProfile(null);
      }

      const rs = await fetch(`/api/client/stats?slug=${encodeURIComponent(slug)}`);
      const js: Stats = await rs.json();
      setStats(js);
    })();
  }, [slug]);

  // ⬇️ Tipado correcto para el gráfico (DayRow[])
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

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!slug) return;

    const body: UpdateRequest = {
      slug: String(slug),
      pin: String(pin ?? ''),
      patch: {
        name: form.name ?? '',
        headline: form.headline ?? null,
        company: form.company ?? null,
        email: form.email ?? null,
        whatsapp: form.whatsapp ?? null,
        phone: form.phone ?? null,
        avatar_url: form.avatar_url ?? null,
        socials_site: form.socials_site ?? null,
      },
    };

    const r = await fetch('/api/client/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j: { ok?: boolean; error?: string } = await r.json();

    if (r.ok && j.ok) {
      alert('Guardado');
      setEditOpen(false);
      // recargar perfil
      const rp = await fetch(`/api/client/profile?slug=${encodeURIComponent(String(slug))}`);
      const jp: { ok?: boolean; data?: Profile } = await rp.json();
      setProfile(jp.data || null);
    } else {
      alert(j.error || 'No se pudo guardar (¿PIN correcto?)');
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <header className="max-w-5xl mx-auto flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Cliente</h1>
          <p className="text-sm opacity-70">Slug: <code>{slug}</code></p>
        </div>
        <nav className="flex gap-4 text-sm opacity-80">
          <Link href="/" className="hover:underline underline-offset-2">Inicio</Link>
          <Link href="/admin/login" className="hover:underline underline-offset-2">Admin</Link>
        </nav>
      </header>

      <div className="max-w-5xl mx-auto grid lg:grid-cols-5 gap-6">
        {/* Gráficas */}
        <section className="lg:col-span-3 bg-black/40 rounded-2xl p-5">
          <h2 className="font-medium">Actividad (últimos 14 días)</h2>
          <div className="mt-4" style={{ width: '100%', height: 320 }}>
            {series.length ? <StackedBars data={series} /> : <div className="opacity-70 text-sm">Sin datos.</div>}
          </div>

          <h3 className="font-medium mt-8">Distribución por acción</h3>
          <div className="mt-4" style={{ width: '100%', height: 260 }}>
            {pieData.length ? <PieActions data={pieData} /> : <div className="opacity-70 text-sm">Sin datos.</div>}
          </div>
        </section>

        {/* Preview + acciones */}
        <section className="lg:col-span-2 bg-black/40 rounded-2xl p-5">
          <h2 className="font-medium mb-3">Vista previa</h2>

          {!profile ? (
            <div className="opacity-70 text-sm">Cargando perfil…</div>
          ) : (
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <div className="p-5 bg-slate-900">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-white/10 relative">
                    {profile.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt={profile.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold">{profile.name}</div>
                    {profile.company && <div className="text-sm opacity-80">{profile.company}</div>}
                    {profile.headline && <div className="text-xs opacity-70">{profile.headline}</div>}
                  </div>
                </div>
              </div>
              <div className="p-5 bg-slate-950 border-t border-white/10">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {profile.whatsapp && <a className="px-3 py-2 rounded bg-emerald-500 text-slate-900 text-center" href={`https://wa.me/${profile.whatsapp}`} target="_blank" rel="noreferrer">WhatsApp</a>}
                  {profile.email && <a className="px-3 py-2 rounded bg-slate-800 text-center" href={`mailto:${profile.email}`}>Email</a>}
                  {profile.phone && <a className="px-3 py-2 rounded bg-slate-800 text-center" href={`tel:${profile.phone}`}>Llamar</a>}
                  {profile.socials_json?.site && <a className="px-3 py-2 rounded bg-slate-800 text-center" href={profile.socials_json.site} target="_blank" rel="noreferrer">Sitio</a>}
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={`/p/${slug || ''}`} target="_blank" className="px-4 py-2 rounded-lg bg-emerald-600 text-slate-900 font-medium">
              Ver tarjeta
            </Link>
            <button
              className="px-4 py-2 rounded-lg bg-slate-700"
              onClick={() => setEditOpen(true)}
              disabled={!pin}
              title={pin ? 'Editar mis datos' : 'Agrega ?pin=XXXX en la URL para editar'}
            >
              Editar
            </button>
          </div>

          {!pin && (
            <p className="text-xs opacity-70 mt-2">
              Para editar necesitas el <b>PIN</b>. Vuelve a <Link href="/cliente" className="underline">/cliente</Link> y entra con tu slug + PIN.
            </p>
          )}
        </section>
      </div>

      {/* Modal edición */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center p-4 z-50">
          <div className="w-full max-w-lg bg-slate-950 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Editar datos</h3>
              <button onClick={() => setEditOpen(false)} className="opacity-70 hover:opacity-100">✕</button>
            </div>
            <form onSubmit={onSave} className="grid md:grid-cols-2 gap-3">
              <input className="p-3 rounded bg-slate-900 border border-slate-700" placeholder="Nombre"
                value={form.name} onChange={e=>setForm(f=>({ ...f, name: e.target.value }))} required />
              <input className="p-3 rounded bg-slate-900 border border-slate-700" placeholder="Puesto / headline"
                value={form.headline ?? ''} onChange={e=>setForm(f=>({ ...f, headline: e.target.value || null }))} />
              <input className="p-3 rounded bg-slate-900 border border-slate-700" placeholder="Empresa"
                value={form.company ?? ''} onChange={e=>setForm(f=>({ ...f, company: e.target.value || null }))} />
              <input className="p-3 rounded bg-slate-900 border border-slate-700" placeholder="Email"
                value={form.email ?? ''} onChange={e=>setForm(f=>({ ...f, email: e.target.value || null }))} />
              <input className="p-3 rounded bg-slate-900 border border-slate-700" placeholder="WhatsApp (521...)"
                value={form.whatsapp ?? ''} onChange={e=>setForm(f=>({ ...f, whatsapp: e.target.value || null }))} />
              <input className="p-3 rounded bg-slate-900 border border-slate-700" placeholder="Teléfono"
                value={form.phone ?? ''} onChange={e=>setForm(f=>({ ...f, phone: e.target.value || null }))} />
              <input className="p-3 rounded bg-slate-900 border border-slate-700 md:col-span-2" placeholder="Avatar URL"
                value={form.avatar_url ?? ''} onChange={e=>setForm(f=>({ ...f, avatar_url: e.target.value || null }))} />
              <input className="p-3 rounded bg-slate-900 border border-slate-700 md:col-span-2" placeholder="Sitio web (https://...)"
                value={form.socials_site ?? ''} onChange={e=>setForm(f=>({ ...f, socials_site: e.target.value || null }))} />
              <div className="md:col-span-2 flex gap-3">
                <button className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-900 font-medium" disabled={!pin}>Guardar</button>
                <button type="button" className="px-4 py-2 rounded-lg bg-slate-700" onClick={()=>setEditOpen(false)}>Cancelar</button>
              </div>
            </form>
            {!pin && <p className="text-xs opacity-70 mt-2">Edición requiere PIN en la URL (ej. <code>?pin=1234</code>).</p>}
          </div>
        </div>
      )}
    </main>
  );
}
