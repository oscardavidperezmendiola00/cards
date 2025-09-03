// lib/supabasePublic.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente de Supabase para el NAVEGADOR (usa la ANON KEY).
 * Úsalo para subir archivos a buckets públicos (p. ej. avatars).
 * No uses la Service Role key en el cliente.
 */
let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error(
      'Faltan variables públicas de Supabase: NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  // En frontend no necesitamos manejo de sesión
  browserClient = createClient(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return browserClient;
}

/** Helper opcional para obtener URL pública de un archivo */
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = getSupabaseBrowser().storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
