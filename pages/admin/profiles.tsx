import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { isAdminFromSsr } from '@/lib/auth';
import AvatarUploader from '@/components/AvatarUploader';

type Row = {
  id: string;
  slug: string;
  name: string;
  headline: string | null;
  company: string | null;
  email: string | null;
  whatsapp: string | null;
  edit_pin: string | null;
};

type FormState = {
  id?: string;
  slug: string;
  name: string;
  headline?: string | null;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  avatar_url?: string | null;
  socials_site?: string | null;
  edit_pin?: string | null;
};

type AdminProfilePayload = {
  id?: string;
  slug: string;
  name: string;
  headline?: string | null;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  avatar_url?: string | null;
  socials_json?: { site?: string } | null;
  edit_pin?: string | null;
};

type ApiListResponse = { ok?: boolean; data?: Row[]; error?: string };
type ApiOk = { ok?: boolean; error?: string };

function genPin(len = 6) {
  let s = '';
  for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10).toString();
  return s;
}

export default function AdminProfiles() {
  const [list, setList] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const empty: FormState = { slug: '', name: '', edit_pin: null };
  const [form, setForm] = useState<FormState>(empty);
  const [editing, setEditing] = useState<boolean>(false); // false = crear, true = editar

  // Carga memoizada (evita warnings de exhaustive-deps)
  const load = useCallback(async (term: string) => {
    setLoading(true);
    const r = await fetch(`/api/admin/profiles${term ? `?search=${encodeURIComponent(term)}` : ''}`);
    const j: ApiListResponse = await r.json();
    setList(j.data || []);
    setLoading(false);
  }, []);

  // Primera carga inmediata
  useEffect(() => { void load(''); }, [load]);

  // Debounce de búsqueda
  useEffect(() => {
    const t: ReturnType<typeof setTimeout> = setTimeout(() => {
      void load(search);
    }, 350);
    return () => clearTimeout(t);
  }, [search, load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const payload: AdminProfilePayload = {
      id: form.id,
      slug: form.slug,
      name: form.name,
      headline: form.headline ?? null,
      company: form.company ?? null,
      phone: form.phone ?? null,
      email: form.email ?? null,
      whatsapp: form.whatsapp ?? null,
      avatar_url: form.avatar_url ?? null,
      socials_json: form.socials_site ? { site: form.socials_site } : null,
      edit_pin: form.edit_pin ?? null,
    };

    const method: 'POST' | 'PUT' = editing ? 'PUT' : 'POST';
    const r = await fetch('/api/admin/profiles', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const j: ApiOk = await r.json();
    if (!r.ok || !j.ok) {
      alert(j.error || 'Error guardando');
      return;
    }
    alert(editing ? 'Perfil actualizado' : 'Perfil creado');
    setForm(empty);
    setEditing(false);
    void load(search);
  }

  async function onEdit(r: Row) {
    setEditing(true);
    setForm({
      id: r.id,
      slug: r.slug,
      name: r.name,
      headline: r.headline,
      company: r.company,
      email: r.email,
      whatsapp: r.whatsapp,
      edit_pin: r.edit_pin,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function onDelete(id: string) {
    if (!confirm('¿Eliminar perfil?')) return;
    const r = await fetch(`/api/admin/profiles?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const j: ApiOk = await r.json();
    if (!r.ok || !j.ok) {
      alert(j.error || 'No se pudo eliminar');
      return;
    }
    void load(search);
  }

  const rows = useMemo(() => list, [list]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Perfiles</h1>
        <nav className="flex gap-4 text-sm opacity-80">
          <Link href="/admin" className="hover:underline underline-offset-2">Dashboard</Link>
          <Link href="/api/admin/logout" className="hover:underline underline-offset-2">Salir</Link>
        </nav>
      </header>

      {/* Formulario crear/editar */}
      <section className="bg-black/40 p-5 rounded-2xl mb-6">
        <h2 className="font-medium mb-3">{editing ? 'Editar perfil' : 'Crear perfil'}</h2>
        <form onSubmit={onSubmit} className="grid md:grid-cols-3 gap-3">
          <input className="p-3 rounded bg-slate-900 border border-slate-700" placeholder="Slug" value={form.slug} onChange={e=>setForm(f=>({ ...f, slug: e.target.value }))} required />
          <input className="p-3 rounded bg-slate-900 border border-slate-700 md:col-span-2" placeholder="Nombre" value={form.name} onChange={e=>setForm(f=>({ ...f, name: e.target.value }))} required />
          <input className="p-3 rounded bg-slate-900 border border-slate-700" placeholder="Puesto / headline" value={form.headline ?? ''} onChange={e=>setForm(f=>({ ...f, headline: e.target.value || null }))} />
          <input className="p-3 rounded bg-slate-900 border border-slate-700" placeholder="Empresa" value={form.company ?? ''} onChange={e=>setForm(f=>({ ...f, company: e.target.value || null }))} />
          <input className="p-3 rounded bg-slate-900 border border-slate-700" placeholder="Email" value={form.email ?? ''} onChange={e=>setForm(f=>({ ...f, email: e.target.value || null }))} />
          <input className="p-3 rounded bg-slate-900 border border-slate-700" placeholder="WhatsApp (521...)" value={form.whatsapp ?? ''} onChange={e=>setForm(f=>({ ...f, whatsapp: e.target.value || null }))} />

          {/* Campo Avatar URL + Uploader */}
          <div className="md:col-span-2 grid gap-2">
            <input
              className="p-3 rounded bg-slate-900 border border-slate-700"
              placeholder="Avatar URL (opcional)"
              value={form.avatar_url ?? ''}
              onChange={e=>setForm(f=>({ ...f, avatar_url: e.target.value || null }))}
            />
            <div className="text-xs opacity-70">o sube un archivo desde tu computadora:</div>
            <AvatarUploader
              value={form.avatar_url ?? ''}
              slugHint={form.slug || 'tmp'}
              onUploaded={(url) => setForm((f) => ({ ...f, avatar_url: url }))}
            />
          </div>

          <input className="p-3 rounded bg-slate-900 border border-slate-700 md:col-span-2" placeholder="Sitio (https://...)" value={form.socials_site ?? ''} onChange={e=>setForm(f=>({ ...f, socials_site: e.target.value || null }))} />

          {/* Control de PIN */}
          <div className="flex gap-2 items-center">
            <input
              className="flex-1 p-3 rounded bg-slate-900 border border-slate-700"
              placeholder="PIN (opcional, 4-8 dígitos)"
              value={form.edit_pin ?? ''}
              onChange={e => setForm(f => ({ ...f, edit_pin: e.target.value.replace(/\D/g, '').slice(0, 8) || null }))}
            />
            <button
              type="button"
              className="px-3 py-2 rounded bg-emerald-600 text-slate-900"
              onClick={() => setForm(f => ({ ...f, edit_pin: genPin(6) }))}
            >
              Generar
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded bg-slate-700"
              onClick={() => setForm(f => ({ ...f, edit_pin: null }))}
              title="Quitar PIN"
            >
              Quitar
            </button>
          </div>

          <div className="md:col-span-3 flex gap-3 mt-1">
            <button className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-900 font-medium">{editing ? 'Guardar cambios' : 'Crear'}</button>
            {editing && (
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-slate-700"
                onClick={() => { setForm(empty); setEditing(false); }}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Buscador */}
      <section className="bg-black/40 p-4 rounded-2xl mb-4">
        <input
          className="w-full p-3 rounded bg-slate-900 border border-slate-700"
          placeholder="Buscar por nombre…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </section>

      {/* Tabla */}
      <section className="bg-black/40 p-4 rounded-2xl overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-left opacity-70">
            <tr>
              <th className="p-2">Nombre</th>
              <th className="p-2">Slug</th>
              <th className="p-2">Email</th>
              <th className="p-2">WhatsApp</th>
              <th className="p-2">PIN</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-3">Cargando…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="p-3 opacity-70">Sin resultados</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="border-t border-slate-800">
                <td className="p-2">{r.name}</td>
                <td className="p-2">{r.slug}</td>
                <td className="p-2">{r.email ?? '-'}</td>
                <td className="p-2">{r.whatsapp ?? '-'}</td>
                <td className="p-2">
                  {r.edit_pin ? (
                    <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300">Asignado</span>
                  ) : (
                    <span className="opacity-60">—</span>
                  )}
                </td>
                <td className="p-2 flex gap-2">
                  <Link href={`/p/${r.slug}`} target="_blank" className="px-3 py-1 rounded bg-emerald-600 text-slate-900">Ver</Link>
                  <button className="px-3 py-1 rounded bg-slate-700" onClick={() => onEdit(r)}>Editar</button>
                  <button className="px-3 py-1 rounded bg-red-600" onClick={() => onDelete(r.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
