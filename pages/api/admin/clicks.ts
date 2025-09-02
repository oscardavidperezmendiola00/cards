import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '@/lib/db';     // cambia a ruta relativa si no usas "@"
import { isAdminFromApi } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isAdminFromApi(req)) return res.status(401).json({ ok:false, error:'unauthorized' });

  const { slug, limit } = req.query as { slug?: string; limit?: string };
  const n = Math.min(Math.max(Number(limit ?? '100'), 1), 500);

  const supabase = getSupabaseAdmin();
  const base = supabase
    .from('clicks')
    .select('ts, action, slug, ref, country, device')
    .order('ts', { ascending: false })
    .limit(n);

  const { data, error } = slug?.trim() ? await base.eq('slug', slug) : await base;
  if (error) return res.status(500).json({ ok:false, error: error.message });

  res.json({ ok:true, data });
}
