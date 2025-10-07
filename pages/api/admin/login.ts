// /pages/api/admin/login.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { setAdminCookie } from '@/lib/auth';

type ApiData = { ok: boolean; error?: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiData>
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    return;
  }

  const { password } = (req.body ?? {}) as { password?: string };

  if (!process.env.ADMIN_PASSWORD) {
    res.status(500).json({ ok: false, error: 'ADMIN_PASSWORD missing' });
    return;
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ ok: false, error: 'Invalid password' });
    return;
  }

  setAdminCookie(res);
  res.status(200).json({ ok: true });
}
