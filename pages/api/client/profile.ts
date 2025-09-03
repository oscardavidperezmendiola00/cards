import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '@/lib/db';

// ---- Tipos de datos que usa el cliente ----
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
  // En el cliente editamos un campo sencillo "site"
  socials_site?: string | null;
};

type UpdateBody = {
  slug?: string;
  pin?: string;
  patch?: ProfilePatch;
};

// Para validar el PIN internamente (no se expone)
type PinRow = { id: string; edit_pin: string | null };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = getSupabaseAdmin();

  // ------- GET: devolver perfil público por slug (sin edit_pin) -------
  if (req.method === 'GET') {
    const { slug } = req.query as { slug?: string };
    if (!slug?.trim()) return res.status(400).json({ ok: false, error: 'slug required' });

    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, slug, name, headline, company, phone, email, whatsapp, avatar_url, socials_json, theme'
      )
      .eq('slug', slug)
      .single();

    if (error || !data) {
      return res.status(404).json({ ok: false, error: error?.message || 'not found' });
    }

    const profile = data as PublicProfile;
    return res.json({ ok: true, data: profile });
  }

  // ------- PUT: editar perfil por slug validando PIN -------
  if (req.method === 'PUT') {
    const { slug, pin, patch } = req.body as UpdateBody;

    if (!slug?.trim() || !pin?.trim()) {
      return res.status(400).json({ ok: false, error: 'slug and pin required' });
    }

    // 1) Verificar PIN
    const { data: row, error: e1 } = await supabase
      .from('profiles')
      .select('id, edit_pin')
      .eq('slug', slug)
      .single();

    if (e1 || !row) return res.status(404).json({ ok: false, error: 'profile not found' });

    const pinRow = row as PinRow;
    if (!pinRow.edit_pin || pinRow.edit_pin !== pin) {
      return res.status(403).json({ ok: false, error: 'invalid pin' });
    }

    // 2) Construir actualización permitida
    const basePatch: {
      name?: string;
      headline?: string | null;
      company?: string | null;
      email?: string | null;
      whatsapp?: string | null;
      phone?: string | null;
      avatar_url?: string | null;
      socials_json?: { site: string } | null; // mapeado desde socials_site
    } = {};

    if (patch) {
      basePatch.name = patch.name; // requerido por el cliente
      basePatch.headline = patch.headline ?? null;
      basePatch.company = patch.company ?? null;
      basePatch.email = patch.email ?? null;
      basePatch.whatsapp = patch.whatsapp ?? null;
      basePatch.phone = patch.phone ?? null;
      basePatch.avatar_url = patch.avatar_url ?? null;

      // Si el cliente envía socials_site:
      if (Object.prototype.hasOwnProperty.call(patch, 'socials_site')) {
        basePatch.socials_json = patch.socials_site ? { site: patch.socials_site } : null;
      }
    }

    // Limpiar undefined para no sobreescribir accidentalmente
    const cleanPatch = Object.fromEntries(
      Object.entries(basePatch).filter(([, v]) => v !== undefined)
    ) as typeof basePatch;

    if (Object.keys(cleanPatch).length === 0) {
      return res.status(400).json({ ok: false, error: 'empty patch' });
    }

    // 3) Actualizar
    const { error: e2 } = await supabase
      .from('profiles')
      .update(cleanPatch)
      .eq('id', pinRow.id);

    if (e2) return res.status(400).json({ ok: false, error: e2.message });

    return res.json({ ok: true });
  }

  // ------- Método no permitido -------
  return res.status(405).end();
}
