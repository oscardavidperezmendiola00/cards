import type { NextApiRequest, NextApiResponse } from 'next';
import { clearAdminCookie } from '@/lib/auth';

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  clearAdminCookie(res);
  res.redirect('/admin/login');
}
