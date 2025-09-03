import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '@/lib/db';

type TrackBody = {
  slug?: string;
  action?: string;
  ref?: string | null;
  ua?: string | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const supabase = getSupabaseAdmin();

  let body: TrackBody = {};
  try {
    // Si Vercel ya parseó JSON, vendrá como objeto;
    // si llega texto (por algún proxy), lo intentamos parsear.
    if (typeof req.body === 'string') {
      body = JSON.parse(req.body);
    } else {
      body = req.body as TrackBody;
    }
  } catch {
    return res.status(400).json({ ok: false, error: 'invalid body' });
  }

  const slug = body.slug?.trim();
  const action = body.action?.trim() || 'view';
  if (!slug) return res.status(400).json({ ok: false, error: 'slug required' });

  const { error } = await supabase.from('clicks').insert({
    slug,
    action,
    ref: body.ref || null,
    ua: body.ua || null,
    // ts se asigna con DEFAULT now() en la tabla
  });

  if (error) return res.status(400).json({ ok: false, error: error.message });
  return res.json({ ok: true });
}
