import type { NextApiRequest, NextApiResponse } from 'next';
import { setAdminCookie } from '@/lib/auth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { password } = (req.body || {}) as { password?: string };
  if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ ok:false, error:'ADMIN_PASSWORD missing' });
  if (password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ ok:false, error:'Invalid password' });
  setAdminCookie(res);
  res.json({ ok:true });
}
