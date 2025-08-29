import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/db';

const hashIp = (ip?: string | string[]) =>
  ip ? crypto.createHash('sha256').update(Array.isArray(ip)?ip[0]:ip).digest('hex') : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { slug, action='view', ref, ua, country, device } = req.body || {};
  if (!slug) return res.status(400).json({ ok:false, error:'slug required' });

  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;
  const { error } = await supabaseAdmin.from('clicks').insert({
    slug, action,
    ref: ref || (req.headers.referer as string) || null,
    ua: ua || (req.headers['user-agent'] as string) || null,
    ip_hash: hashIp(ip),
    country: country || null,
    device: device || null
  });

  if (error) return res.status(500).json({ ok:false, error: error.message });
  res.json({ ok:true });
}
