// pages/api/admin/orders.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '@/lib/db';
import { isAdminFromApi } from '@/lib/auth';

type ApiData<T = unknown> = { ok: boolean; error?: string; data?: T };

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
    const { data, error } = await supabase
      .from('card_orders')
      .select('*, card_designs(*), profiles(slug,name,email,whatsapp)')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      res.status(400).json({ ok: false, error: error.message });
      return;
    }

    res.status(200).json({ ok: true, data });
    return;
  }

  if (req.method === 'PUT') {
    const { id, status, tracking } = (req.body ?? {}) as {
      id?: string;
      status?: string | null;
      tracking?: string | null;
    };

    if (!id) {
      res.status(400).json({ ok: false, error: 'id requerido' });
      return;
    }

    const { error } = await supabase
      .from('card_orders')
      .update({
        status: status ?? undefined,
        tracking: tracking ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      res.status(400).json({ ok: false, error: error.message });
      return;
    }

    res.status(200).json({ ok: true });
    return;
  }

  res.setHeader('Allow', 'GET, PUT');
  res.status(405).end();
}
