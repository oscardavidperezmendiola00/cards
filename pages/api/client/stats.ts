import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '@/lib/db';

type ByDay = Record<string, Record<string, number>>;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query as { slug?: string };
  if (!slug?.trim()) return res.status(400).json({ ok:false, error:'slug required' });

  const supabase = getSupabaseAdmin();

  const now = Date.now();
  const from14d = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();
  const from7d  = new Date(now -  7 * 24 * 60 * 60 * 1000).toISOString();

  const [clicksAll, clicks7] = await Promise.all([
    supabase.from('clicks').select('id', { count: 'exact', head: true }).eq('slug', slug),
    supabase.from('clicks').select('id', { count: 'exact', head: true }).eq('slug', slug).gte('ts', from7d),
  ]);

  const { data: rows } = await supabase
    .from('clicks')
    .select('ts, action, slug')
    .eq('slug', slug)
    .gte('ts', from14d)
    .order('ts', { ascending: true })
    .limit(5000);

  const byDay: ByDay = {};
  const totals: Record<string, number> = {};
  for (const r of rows ?? []) {
    const day = new Date(r.ts as unknown as string).toISOString().slice(0, 10);
    const action = (r.action as string) || 'view';
    byDay[day] ??= {};
    byDay[day][action] = (byDay[day][action] ?? 0) + 1;
    totals[action] = (totals[action] ?? 0) + 1;
  }

  res.json({ ok:true, profiles: 1, clicks: clicksAll.count ?? 0, clicks7d: clicks7.count ?? 0, byDay, totals });
}
