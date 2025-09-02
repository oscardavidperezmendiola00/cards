import type { GetServerSideProps } from 'next';
import { isAdminFromSsr } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/db';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';


type Row = {
  id: string;
  slug: string;
  name: string;
  headline?: string;
  company?: string;
  email?: string;
  whatsapp?: string;
};

export default function Profiles({ ownerId }: { ownerId: string }) {
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const [form, setForm] = useState<
    Row & { phone?: string; avatar_url?: string; socials_site?: string }
  >({
    id: '',
    slug: '',
    name: '',
    headline: '',
    company: '',
    email: '',
    whatsapp: '',
  });

  async function load(s?: string) {
    setLoading(true);
    const r = await fetch(`/api/admin/profiles${s ? `?search=${encodeURIComponent(s)}` : ''}`);
    const j = await r.json();
    setList(j.data || []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      owner_id: ownerId,
      slug: form.slug.trim(),
      name: form.name.trim(),
      headline: form.headline || undefined,
      company: form.company || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      whatsapp: form.whatsapp || undefined,
      avatar_url: form.avatar_url || undefined,
      socials_json: form.socials_site ? { site: form.socials_site } : undefined,
    };
    const r = await fetch('/api/admin/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      setForm({
        id: '',
        slug: '',
        name: '',
        headline: '',
        company: '',
        email: '',
        whatsapp: '',
      });
      await load();
    }
  }

  async function onUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.id) return;
    const body = {
      id: form.id,
      slug: form.slug,
      name: form.name,
      headline: form.headline || null,
      company: form.company || null,
      email: form.email || null,
      whatsapp: form.whatsapp || null,
    };
    await fetch('/api/admin/profiles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    await load(search);
  }

  async function onDelete(id: string) {
    if (!confirm('¿Eliminar perfil?')) return;
    await fetch(`/api/admin/profiles?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    await load(search);
  }

  const isEditing = useMemo(() => !!form.id, [form.id]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Perfiles</h1>
        <nav className="flex gap-4 text-sm opacity-80">
  <Link href="/admin" className="underline-offset-2 hover:underline">Dashboard</Link>
  <Link href="/api/admin/logout" className="underline-offset-2 hover:underline">Salir</Link>
</nav>
      </header>

      <section className="bg-black/40 p-4 rounded-xl mb-6">
        <h2 className="font-medium mb-3">{isEditing ? 'Editar' : 'Crear'} perfil</h2>
        <form className="grid md:grid-cols-3 gap-3" onSubmit={isEditing ? onUpdate : onCreate}>
          <input
            className="p-3 rounded-lg bg-slate-900 border border-slate-700"
            placeholder="slug"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            required={!isEditing}
          />
          <input
            className="p-3 rounded-lg bg-slate-900 border border-slate-700"
            placeholder="name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <input
            className="p-3 rounded-lg bg-slate-900 border border-slate-700"
            placeholder="headline"
            value={form.headline || ''}
            onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
          />
          <input
            className="p-3 rounded-lg bg-slate-900 border border-slate-700"
            placeholder="company"
            value={form.company || ''}
            onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
          />
          <input
            className="p-3 rounded-lg bg-slate-900 border border-slate-700"
            placeholder="email"
            value={form.email || ''}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <input
            className="p-3 rounded-lg bg-slate-900 border border-slate-700"
            placeholder="whatsapp (521...)"
            value={form.whatsapp || ''}
            onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
          />
          {!isEditing && (
            <>
              <input
                className="p-3 rounded-lg bg-slate-900 border border-slate-700"
                placeholder="phone"
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
              <input
                className="p-3 rounded-lg bg-slate-900 border border-slate-700"
                placeholder="avatar_url (opcional)"
                onChange={(e) => setForm((f) => ({ ...f, avatar_url: e.target.value }))}
              />
              <input
                className="p-3 rounded-lg bg-slate-900 border border-slate-700"
                placeholder="site (opcional)"
                onChange={(e) => setForm((f) => ({ ...f, socials_site: e.target.value }))}
              />
            </>
          )}
          <div className="md:col-span-3 flex gap-3">
            <button className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-900 font-medium">
              {isEditing ? 'Guardar' : 'Crear'}
            </button>
            {isEditing && (
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-slate-700"
                onClick={() =>
                  setForm({
                    id: '',
                    slug: '',
                    name: '',
                    headline: '',
                    company: '',
                    email: '',
                    whatsapp: '',
                  })
                }
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="bg-black/40 p-4 rounded-xl">
        <div className="flex items-center gap-3 mb-3">
          <input
            className="flex-1 p-3 rounded-lg bg-slate-900 border border-slate-700"
            placeholder="Buscar por nombre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="px-4 py-2 rounded-lg bg-slate-700" onClick={() => load(search)}>
            Buscar
          </button>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left opacity-70">
              <tr>
                <th>Nombre</th>
                <th>Slug</th>
                <th>Empresa</th>
                <th>Email</th>
                <th>WhatsApp</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-3 opacity-70">
                    Cargando…
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-3 opacity-70">
                    Sin resultados
                  </td>
                </tr>
              ) : (
                list.map((r) => (
                  <tr key={r.id} className="border-t border-slate-800">
                    <td className="p-2">{r.name}</td>
                    <td className="p-2">{r.slug}</td>
                    <td className="p-2">{r.company || '-'}</td>
                    <td className="p-2">{r.email || '-'}</td>
                    <td className="p-2">{r.whatsapp || '-'}</td>
                    <td className="p-2 text-right">
                      <button
                        className="px-3 py-1 rounded bg-slate-700 mr-2"
                        onClick={() => setForm({ ...r })}
                      >
                        Editar
                      </button>
                      <a
                        className="px-3 py-1 rounded bg-emerald-600 mr-2"
                        href={`/p/${r.slug}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Ver
                      </a>
                      <button className="px-3 py-1 rounded bg-red-600" onClick={() => onDelete(r.id)}>
                        Borrar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps<{ ownerId: string }> = async (ctx) => {
  if (!isAdminFromSsr(ctx.req)) {
    return { redirect: { destination: '/admin/login', permanent: false } };
  }

  // Resuelve/crea el owner a partir de ADMIN_OWNER_EMAIL
  const email = process.env.ADMIN_OWNER_EMAIL ?? 'you@tumarca.com';
  const supabase = getSupabaseAdmin();

  // intenta leerlo
  const { data: existing } = await supabase
    .from('owners')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  let ownerId = existing?.id as string | undefined;

  // si no existe, lo crea
  if (!ownerId) {
    const { data: created } = await supabase
      .from('owners')
      .insert({ email })
      .select('id')
      .single();
    ownerId = created?.id as string;
  }

  return { props: { ownerId: ownerId! } };
};
