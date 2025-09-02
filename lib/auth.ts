// lib/auth.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import type { IncomingHttpHeaders } from 'http';

export const ADMIN_COOKIE = 'admin_session';

export function parseCookies(cookieHeader?: string | string[] | null): Record<string, string> {
  const c = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader || '';
  return c.split(';').reduce<Record<string, string>>((acc, part) => {
    const [k, ...v] = part.trim().split('=');
    if (!k) return acc;
    acc[k] = decodeURIComponent(v.join('='));
    return acc;
  }, {});
}

export function isAdminFromApi(req: NextApiRequest): boolean {
  return req.cookies?.[ADMIN_COOKIE] === '1';
}

export function isAdminFromSsr(req: { headers: IncomingHttpHeaders }): boolean {
  const cookies = parseCookies(req.headers.cookie ?? null);
  return cookies[ADMIN_COOKIE] === '1';
}

export function setAdminCookie(res: NextApiResponse) {
  res.setHeader(
    'Set-Cookie',
    `${ADMIN_COOKIE}=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000; ${process.env.VERCEL ? 'Secure; ' : ''}`
  );
}

export function clearAdminCookie(res: NextApiResponse) {
  res.setHeader(
    'Set-Cookie',
    `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; ${process.env.VERCEL ? 'Secure; ' : ''}`
  );
}
