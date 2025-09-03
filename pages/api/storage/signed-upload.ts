import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '@/lib/db';

type Body = {
  slug?: string;
  ext?: string; // extensión sugerida (jpg, png, webp, etc.)
};

/** Crypto mínimo para tipar sin usar 'any' */
interface MinimalCrypto {
  randomUUID?: () => string;
  getRandomValues?: (array: Uint8Array) => Uint8Array;
}

/** UUID v4 con fallbacks: randomUUID -> getRandomValues -> Math.random */
function safeUUID(): string {
  const g = typeof globalThis !== 'undefined' ? (globalThis as unknown as { crypto?: MinimalCrypto }) : undefined;
  const c = g?.crypto;

  if (c?.randomUUID) {
    return c.randomUUID();
  }

  if (c?.getRandomValues) {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // Fallback no-criptográfico (suficiente para nombre de archivo)
  const rnd = (n: number) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const variant = (8 + Math.floor(Math.random() * 4)).toString(16); // 8..b
  return `${rnd(8)}-${rnd(4)}-4${rnd(3)}-${variant}${rnd(3)}-${rnd(12)}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const supabase = getSupabaseAdmin(); // usa SERVICE ROLE (lado servidor)
  const raw = typeof req.body === 'string' ? (JSON.parse(req.body) as Body) : (req.body as Body);

  const safeBase =
    (raw.slug || 'profile').replace(/[^a-z0-9-_]/gi, '').toLowerCase() || 'profile';

  // Sanitiza extensión (solo alfanumérica) y por defecto 'jpg'
  const extension =
    (raw.ext || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';

  const filename = `${safeBase}-${safeUUID()}.${extension}`;
  const path = raw.slug ? `${safeBase}/${filename}` : filename;

  // Crea URL firmada para subida (duración por defecto ~2h)
  const { data, error } = await supabase.storage.from('avatars').createSignedUploadUrl(path);
  if (error || !data) {
    return res
      .status(400)
      .json({ ok: false, error: error?.message || 'cannot sign url' });
  }

  // URL pública para mostrar el avatar después
  const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);

  return res.json({
    ok: true,
    path,
    token: data.token,
    signedUrl: data.signedUrl,
    publicUrl: pub.publicUrl,
  });
}
