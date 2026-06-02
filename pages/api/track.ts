// pages/api/track.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '@/lib/db';

type ApiData = { ok: boolean; error?: string };

type TrackBody = {
  slug?: string;
  action?: string;
  ref?: string | null;
  ua?: string | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiData>
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    return;
  }

  const supabase = getSupabaseAdmin();

  let body: TrackBody = {};
  try {
    body = typeof req.body === 'string' ? (JSON.parse(req.body) as TrackBody) : ((req.body ?? {}) as TrackBody);
  } catch {
    res.status(400).json({ ok: false, error: 'invalid body' });
    return;
  }

  const slug = body.slug?.trim();
  const action = body.action?.trim() || 'view';

  if (!slug) {
    res.status(400).json({ ok: false, error: 'slug required' });
    return;
  }

  const { error } = await supabase.from('clicks').insert({
    slug,
    action,
    ref: body.ref ?? null,
    ua: body.ua ?? null,
  });

  if (error) {
    res.status(400).json({ ok: false, error: error.message });
    return;
  }

  res.status(200).json({ ok: true });
}
