// /pages/api/admin/profiles.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '@/lib/db';
import { isAdminFromApi } from '@/lib/auth';

type ApiData<T = unknown> = { ok: boolean; error?: string; data?: T };

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
  edit_pin?: string | null;
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiData>
): Promise<void> {
  if (!isAdminFromApi(req)) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return;
  }

  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    const { search } = req.query as { search?: string };
    const q = supabase
      .from('profiles')
      .select('id, slug, name, headline, company, email, whatsapp, edit_pin')
      .order('created_at', { ascending: false })
      .limit(500);

    const { data, error } = search?.trim() ? await q.ilike('name', `%${search}%`) : await q;
    if (error) {
      res.status(400).json({ ok: false, error: error.message });
      return;
    }

    const rows = (data ?? []) as ListRow[];
    res.status(200).json({ ok: true, data: rows });
    return;
  }

  if (req.method === 'POST') {
    const body = req.body as ProfileRow;

    if (!body.slug?.trim() || !body.name?.trim()) {
      res.status(400).json({ ok: false, error: 'slug y name son requeridos' });
      return;
    }

    const ownerId = await resolveOwnerId(supabase, body.owner_id ?? null);
    if (!ownerId) {
      res.status(400).json({ ok: false, error: 'owner_id no resuelto (configura ADMIN_OWNER_EMAIL)' });
      return;
    }

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
      edit_pin: body.edit_pin ?? null,
    };

    const { error } = await supabase.from('profiles').insert(insertObj);
    if (error) {
      res.status(400).json({ ok: false, error: error.message });
      return;
    }

    res.status(201).json({ ok: true });
    return;
  }

  if (req.method === 'PUT') {
    const body = req.body as ProfileRow;
    if (!body.id) {
      res.status(400).json({ ok: false, error: 'id requerido' });
      return;
    }

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
      edit_pin: body.edit_pin ?? null,
    };

    const cleanPatch = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    ) as Partial<ProfileRow>;

    const { error } = await supabase.from('profiles').update(cleanPatch).eq('id', body.id);
    if (error) {
      res.status(400).json({ ok: false, error: error.message });
      return;
    }

    res.status(200).json({ ok: true });
    return;
  }

  if (req.method === 'DELETE') {
    const { id } = req.query as { id?: string };
    if (!id) {
      res.status(400).json({ ok: false, error: 'id requerido' });
      return;
    }

    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) {
      res.status(400).json({ ok: false, error: error.message });
      return;
    }

    res.status(200).json({ ok: true });
    return;
  }

  res.setHeader('Allow', 'GET, POST, PUT, DELETE');
  res.status(405).end();
}
