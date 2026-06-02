// pages/api/client/profile.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '@/lib/db';

type ApiData<T = unknown> = { ok: boolean; error?: string; data?: T };

type PublicProfile = {
  id: string;
  slug: string;
  name: string;
  headline: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  avatar_url: string | null;
  socials_json: { site?: string } | null;
  theme: { primary: string; accent: string; bg: string; text: string } | null;
};

type ProfilePatch = {
  name: string;
  headline?: string | null;
  company?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  socials_site?: string | null;
};

type UpdateBody = {
  slug?: string;
  pin?: string;
  patch?: ProfilePatch;
};

type PinRow = { id: string; edit_pin: string | null };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiData>
): Promise<void> {
  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    const { slug } = req.query as { slug?: string };
    if (!slug?.trim()) {
      res.status(400).json({ ok: false, error: 'slug required' });
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, slug, name, headline, company, phone, email, whatsapp, avatar_url, socials_json, theme')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      res.status(404).json({ ok: false, error: error?.message ?? 'not found' });
      return;
    }

    res.status(200).json({ ok: true, data: data as PublicProfile });
    return;
  }

  if (req.method === 'PUT') {
    const { slug, pin, patch } = (req.body ?? {}) as UpdateBody;

    if (!slug?.trim() || !pin?.trim()) {
      res.status(400).json({ ok: false, error: 'slug and pin required' });
      return;
    }

    const { data: row, error: e1 } = await supabase
      .from('profiles')
      .select('id, edit_pin')
      .eq('slug', slug)
      .single();

    if (e1 || !row) {
      res.status(404).json({ ok: false, error: 'profile not found' });
      return;
    }

    const pinRow = row as PinRow;
    if (!pinRow.edit_pin || pinRow.edit_pin !== pin) {
      res.status(403).json({ ok: false, error: 'invalid pin' });
      return;
    }

    const basePatch: {
      name?: string;
      headline?: string | null;
      company?: string | null;
      email?: string | null;
      whatsapp?: string | null;
      phone?: string | null;
      avatar_url?: string | null;
      socials_json?: { site: string } | null;
    } = {};

    if (patch) {
      basePatch.name = patch.name;
      basePatch.headline = patch.headline ?? null;
      basePatch.company = patch.company ?? null;
      basePatch.email = patch.email ?? null;
      basePatch.whatsapp = patch.whatsapp ?? null;
      basePatch.phone = patch.phone ?? null;
      basePatch.avatar_url = patch.avatar_url ?? null;
      if (Object.prototype.hasOwnProperty.call(patch, 'socials_site')) {
        basePatch.socials_json = patch.socials_site ? { site: patch.socials_site } : null;
      }
    }

    const cleanPatch = Object.fromEntries(
      Object.entries(basePatch).filter(([, v]) => v !== undefined)
    ) as typeof basePatch;

    if (Object.keys(cleanPatch).length === 0) {
      res.status(400).json({ ok: false, error: 'empty patch' });
      return;
    }

    const { error: e2 } = await supabase.from('profiles').update(cleanPatch).eq('id', pinRow.id);

    if (e2) {
      res.status(400).json({ ok: false, error: e2.message });
      return;
    }

    res.status(200).json({ ok: true });
    return;
  }

  res.setHeader('Allow', 'GET, PUT');
  res.status(405).end();
}
