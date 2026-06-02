// pages/api/admin/is-admin.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
// Si tienes tipos generados por Supabase, importa Database y tipa el cliente:
// import type { Database } from '@/lib/supabase.types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // const supabase = createPagesServerClient<Database>({ req, res });
  const supabase = createPagesServerClient({ req, res });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(200).json({ ok: true, isAdmin: false });

  const { data, error } = await supabase
    .from('owners')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    // En caso de RLS o error, regresamos false por seguridad
    return res.status(200).json({ ok: true, isAdmin: false });
  }

  return res.status(200).json({ ok: true, isAdmin: !!data?.is_admin });
}
