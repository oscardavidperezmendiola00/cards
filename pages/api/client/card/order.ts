// pages/api/client/card/order.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '@/lib/db';

type ApiData<T = unknown> = { ok: boolean; error?: string; data?: T };

type FinishKind = 'mate' | 'brillante' | 'satinado';

type Shipping = {
  name?: string;
  phone?: string;
  email?: string;
  address?: Record<string, unknown>;
};

type OrderBody = {
  slug?: string;
  pin?: string;
  design_id?: string | null;
  quantity?: number;
  finish?: FinishKind;
  corner_radius?: number;
  notes?: string | null;
  shipping?: Shipping;
};

type ProfileRow = { id: string; edit_pin?: string | null };

function asString(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiData>
): Promise<void> {
  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    const slug = asString(req.query.slug).trim();
    const pin  = asString(req.query.pin).trim();

    if (!slug || !pin) {
      res.status(400).json({ ok: false, error: 'slug/pin requeridos' });
      return;
    }

    const { data: pinRow, error: e1 } = await supabase
      .from('profiles')
      .select('id, edit_pin')
      .eq('slug', slug)
      .single();

    if (e1 || !pinRow) {
      res.status(404).json({ ok: false, error: 'perfil no encontrado' });
      return;
    }
    if (String((pinRow as ProfileRow).edit_pin ?? '') !== pin) {
      res.status(403).json({ ok: false, error: 'PIN inválido' });
      return;
    }

    const { data, error } = await supabase
      .from('card_orders')
      .select('*')
      .eq('profile_id', (pinRow as ProfileRow).id)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(400).json({ ok: false, error: error.message });
      return;
    }

    res.status(200).json({ ok: true, data });
    return;
  }

  if (req.method === 'POST') {
    const body = (req.body ?? {}) as OrderBody;

    const slug = (body.slug ?? '').trim();
    const pin  = (body.pin  ?? '').trim();

    if (!slug || !pin) {
      res.status(400).json({ ok: false, error: 'slug/pin requeridos' });
      return;
    }

    const { data: pinRow, error: e1 } = await supabase
      .from('profiles')
      .select('id, edit_pin')
      .eq('slug', slug)
      .single();

    if (e1 || !pinRow) {
      res.status(404).json({ ok: false, error: 'perfil no encontrado' });
      return;
    }
    if (String((pinRow as ProfileRow).edit_pin ?? '') !== pin) {
      res.status(403).json({ ok: false, error: 'PIN inválido' });
      return;
    }

    const quantity = Number.isFinite(body.quantity) ? Number(body.quantity) : 1;
    const corner   = Number.isFinite(body.corner_radius) ? Number(body.corner_radius) : 3;
    const finish: FinishKind =
      (['mate', 'brillante', 'satinado'] as const).includes((body.finish as FinishKind) || 'mate')
        ? ((body.finish as FinishKind) || 'mate')
        : 'mate';

    const payload = {
      profile_id: (pinRow as ProfileRow).id,
      design_id: body.design_id ?? null,
      quantity: Math.max(1, quantity),
      finish,
      corner_radius: Math.max(0, Math.min(6, corner)),
      notes: body.notes ?? null,
      shipping_name: body.shipping?.name ?? null,
      shipping_phone: body.shipping?.phone ?? null,
      shipping_email: body.shipping?.email ?? null,
      shipping_address: body.shipping?.address ?? null,
      status: 'submitted' as const,
    };

    const { data, error } = await supabase
      .from('card_orders')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      res.status(400).json({ ok: false, error: error.message });
      return;
    }

    res.status(201).json({ ok: true, data });
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).end();
}

export const config = { api: { bodyParser: true } };
