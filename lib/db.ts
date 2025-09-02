// lib/db.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE;

  if (!url) throw new Error('Missing env NEXT_PUBLIC_SUPABASE_URL');
  if (!key) throw new Error('Missing env SUPABASE_SERVICE_ROLE');

  client = createClient(url, key);
  return client;
}
