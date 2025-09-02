import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '@/lib/db';         // si NO usas alias "@", cambia a ruta relativa
import { isAdminFromApi } from '@/lib/auth';

type ByDay = Record<string, Record<string, number>>;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isAdminFromApi(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });

  const { slug } = req.query as { slug?: string };
  const supabase = getSupabaseAdmin();

  const now = Date.now();
  const from14d = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();
  const from7d  = new Date(now -  7 * 24 * 60 * 60 * 1000).toISOString();

  // KPIs
  const [profilesCount, clicksAll, clicks7] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('clicks').select('id', { count: 'exact', head: true }),
    supabase.from('clicks').select('id', { count: 'exact', head: true }).gte('ts', from7d),
  ]);

  // Serie últimos 14 días (+ totales por acción)
  const base = supabase
    .from('clicks')
    .select('ts, action, slug')
    .gte('ts', from14d)
    .order('ts', { ascending: true })
    .limit(5000);

  const { data: rows, error } = slug?.trim() ? await base.eq('slug', slug) : await base;
  if (error) return res.status(500).json({ ok:false, error: error.message });

  const byDay: ByDay = {};
  const totals: Record<string, number> = {};

  for (const r of rows ?? []) {
    const day = new Date(r.ts as unknown as string).toISOString().slice(0, 10);
    const action = (r.action as string) || 'view';
    byDay[day] ??= {};
    byDay[day][action] = (byDay[day][action] ?? 0) + 1;
    totals[action] = (totals[action] ?? 0) + 1;
  }

  res.json({
    ok: true,
    profiles: profilesCount.count ?? 0,
    clicks: clicksAll.count ?? 0,
    clicks7d: clicks7.count ?? 0,
    byDay,
    totals,
  });
}
