import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '@/lib/db';
import { isAdminFromApi } from '@/lib/auth';

type ProfileInput = {
  id?: string; owner_id?: string; slug: string; name: string;
  headline?: string; company?: string; phone?: string; email?: string; whatsapp?: string;
  avatar_url?: string; socials_json?: Record<string, string>;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isAdminFromApi(req)) return res.status(401).json({ ok:false, error:'unauthorized' });
  const supabase = getSupabaseAdmin();

  if (req.method === 'POST') {
    const body = req.body as ProfileInput;
    if (!body.owner_id || !body.slug || !body.name)
      return res.status(400).json({ ok:false, error:'owner_id, slug y name son requeridos' });
    const { error } = await supabase.from('profiles').insert(body);
    if (error) return res.status(400).json({ ok:false, error: error.message });
    return res.json({ ok:true });
  }

  if (req.method === 'PUT') {
    const body = req.body as ProfileInput;
    if (!body.id) return res.status(400).json({ ok:false, error:'id requerido' });
    const { id, ...patch } = body;
    const { error } = await supabase.from('profiles').update(patch).eq('id', id);
    if (error) return res.status(400).json({ ok:false, error: error.message });
    return res.json({ ok:true });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query as { id?: string };
    if (!id) return res.status(400).json({ ok:false, error:'id requerido' });
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) return res.status(400).json({ ok:false, error: error.message });
    return res.json({ ok:true });
  }

  // GET: listado rápido
  const { search } = req.query as { search?: string };
  const q = supabase.from('profiles').select('id, slug, name, headline, company, email, whatsapp').order('created_at', { ascending: false }).limit(200);
  const { data, error } = search?.trim()
    ? await q.ilike('name', `%${search}%`)
    : await q;
  if (error) return res.status(400).json({ ok:false, error: error.message });
  res.json({ ok:true, data });
}
