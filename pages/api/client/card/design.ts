// pages/api/client/card/design.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '@/lib/db';

type ApiData<T = unknown> = { ok: boolean; error?: string; data?: T };

type ProfileIdRow = { id: string; edit_pin?: string | null };
type CardDesign = {
  id: string;
  profile_id: string;
  title: string | null;
  specs: Record<string, unknown> | null;
  front_url: string | null;
  back_url: string | null;
  preview_url: string | null;
  created_at?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiData>
): Promise<void> {
  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    const { slug } = req.query as { slug?: string };

    if (!slug) {
      res.status(400).json({ ok: false, error: 'slug requerido' });
      return;
    }

    const { data: prof, error: e0 } = await supabase
      .from('profiles')
      .select('id')
      .eq('slug', slug)
      .single();

    if (e0 || !prof) {
      res.status(404).json({ ok: false, error: 'perfil no encontrado' });
      return;
    }

    const { data, error } = await supabase
      .from('card_designs')
      .select('*')
      .eq('profile_id', (prof as ProfileIdRow).id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      res.status(400).json({ ok: false, error: error.message });
      return;
    }

    const first = (data as CardDesign[] | null)?.[0] ?? null;
    res.status(200).json({ ok: true, data: first });
    return;
  }

  if (req.method === 'POST') {
    const {
      slug,
      pin,
      front_url,
      back_url,
      title,
      specs,
      preview_url,
    } = (req.body ?? {}) as {
      slug?: string;
      pin?: string | number;
      front_url?: string | null;
      back_url?: string | null;
      title?: string | null;
      specs?: Record<string, unknown> | null;
      preview_url?: string | null;
    };

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

    if (String((pinRow as ProfileIdRow).edit_pin ?? '') !== String(pin)) {
      res.status(403).json({ ok: false, error: 'PIN inválido' });
      return;
    }

    const payload = {
      profile_id: (pinRow as ProfileIdRow).id,
      title: title ?? null,
      specs: specs ?? {},
      front_url: front_url ?? null,
      back_url: back_url ?? null,
      preview_url: preview_url ?? null,
    };

    const { data, error } = await supabase
      .from('card_designs')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      res.status(400).json({ ok: false, error: error.message });
      return;
    }

    res.status(201).json({ ok: true, data: data as CardDesign });
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).end();
}

export const config = { api: { bodyParser: true } };
