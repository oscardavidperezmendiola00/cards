// pages/api/track.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/db';

const hashIp = (ip?: string | string[] | null) =>
  ip ? crypto.createHash('sha256').update(Array.isArray(ip) ? ip[0] : ip).digest('hex') : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = (req.body || {}) as {
    slug?: string;
    action?: string;
    ref?: string | null;
    ua?: string | null;
    country?: string | null;
    device?: string | null;
  };

  if (!body.slug) return res.status(400).json({ ok: false, error: 'slug required' });

  try {
    const supabase = getSupabaseAdmin();

    const ipHeader = (req.headers['x-forwarded-for'] as string | string[] | undefined) ?? null;
    const ipRaw = ipHeader || (req.socket?.remoteAddress ?? null);
    const ipHash = hashIp(ipRaw);

    const { error } = await supabase.from('clicks').insert({
      slug: body.slug,
      action: body.action || 'view',
      ref: body.ref ?? (req.headers.referer as string) ?? null,
      ua: body.ua ?? (req.headers['user-agent'] as string) ?? null,
      ip_hash: ipHash,
      country: body.country ?? null,
      device: body.device ?? null,
    });

    if (error) return res.status(500).json({ ok: false, error: error.message });
    res.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ ok: false, error: msg });
  }
}
