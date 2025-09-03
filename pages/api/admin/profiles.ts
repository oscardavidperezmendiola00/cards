import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '@/lib/db';
import { isAdminFromApi } from '@/lib/auth';

type SocialsJson = { site?: string } | null;

type ProfileRow = {
  id?: string;
  owner_id?: string | null;
  slug: string;
  name: string;
  headline?: string | null;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  avatar_url?: string | null;
  socials_json?: SocialsJson;
  edit_pin?: string | null; // PIN de edición (opcional)
};

type ListRow = {
  id: string;
  slug: string;
  name: string;
  headline: string | null;
  company: string | null;
  email: string | null;
  whatsapp: string | null;
  edit_pin: string | null;
};

type OwnerRow = { id: string; email?: string | null; name?: string | null };

async function resolveOwnerId(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  owner_id?: string | null
): Promise<string | null> {
  if (owner_id) return owner_id;

  const email = process.env.ADMIN_OWNER_EMAIL;
  if (!email) return null;

  // sin genéricos; casteamos el resultado
  const { data: owner } = await supabase
    .from('owners')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if ((owner as OwnerRow | null)?.id) return (owner as OwnerRow).id;

  const { data: created, error } = await supabase
    .from('owners')
    .insert({ email, name: 'Admin' })
    .select('id')
    .single();

  if (error || !(created as OwnerRow | null)?.id) return null;
  return (created as OwnerRow).id;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isAdminFromApi(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });

  const supabase = getSupabaseAdmin();

  // GET: listado (incluye edit_pin para vista de admin)
  if (req.method === 'GET') {
    const { search } = req.query as { search?: string };
    const q = supabase
      .from('profiles')
      .select('id, slug, name, headline, company, email, whatsapp, edit_pin')
      .order('created_at', { ascending: false })
      .limit(500);

    const { data, error } = search?.trim() ? await q.ilike('name', `%${search}%`) : await q;
    if (error) return res.status(400).json({ ok: false, error: error.message });

    const rows = (data ?? []) as ListRow[];
    return res.json({ ok: true, data: rows });
  }

  // POST: crear perfil
  if (req.method === 'POST') {
    const body = req.body as ProfileRow;

    if (!body.slug?.trim() || !body.name?.trim()) {
      return res.status(400).json({ ok: false, error: 'slug y name son requeridos' });
    }

    const ownerId = await resolveOwnerId(supabase, body.owner_id ?? null);
    if (!ownerId) return res.status(400).json({ ok: false, error: 'owner_id no resuelto (configura ADMIN_OWNER_EMAIL)' });

    const insertObj: ProfileRow = {
      owner_id: ownerId,
      slug: body.slug.trim(),
      name: body.name.trim(),
      headline: body.headline ?? null,
      company: body.company ?? null,
      phone: body.phone ?? null,
      email: body.email ?? null,
      whatsapp: body.whatsapp ?? null,
      avatar_url: body.avatar_url ?? null,
      socials_json: body.socials_json ?? null,
      edit_pin: body.edit_pin ?? null, // permite crear con PIN
    };

    const { error } = await supabase.from('profiles').insert(insertObj);
    if (error) return res.status(400).json({ ok: false, error: error.message });

    return res.json({ ok: true });
  }

  // PUT: actualizar perfil (incluye set/quitar PIN)
  if (req.method === 'PUT') {
    const body = req.body as ProfileRow;
    if (!body.id) return res.status(400).json({ ok: false, error: 'id requerido' });

    const patch: Partial<ProfileRow> = {
      slug: body.slug?.trim(),
      name: body.name?.trim(),
      headline: body.headline ?? null,
      company: body.company ?? null,
      phone: body.phone ?? null,
      email: body.email ?? null,
      whatsapp: body.whatsapp ?? null,
      avatar_url: body.avatar_url ?? null,
      socials_json: body.socials_json ?? null,
      edit_pin: body.edit_pin ?? null, // set/quitar PIN
    };

    // Filtra solo propiedades definidas (sin usar `any`)
    const cleanPatch = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    ) as Partial<ProfileRow>;

    const { error } = await supabase.from('profiles').update(cleanPatch).eq('id', body.id);
    if (error) return res.status(400).json({ ok: false, error: error.message });

    return res.json({ ok: true });
  }

  // DELETE: eliminar perfil
  if (req.method === 'DELETE') {
    const { id } = req.query as { id?: string };
    if (!id) return res.status(400).json({ ok: false, error: 'id requerido' });

    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) return res.status(400).json({ ok: false, error: error.message });

    return res.json({ ok: true });
  }

  return res.status(405).end();
}
