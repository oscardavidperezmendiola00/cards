// app/api/admin/card-designs/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Si tu proyecto está en Edge y te da problemas con cookies, fuerza Node:
// export const runtime = 'nodejs';

export async function GET() {
  // En Next 15, cookies() es async ⇒ usa await. (Si usas Next 14, puedes quitar el await).
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // En route handlers sólo necesitamos leer la cookie de sesión
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // NO declares set/remove aquí: ReadonlyRequestCookies no las tiene
      },
    }
  );

  // Deja que las RLS hagan su trabajo: si el usuario es admin verá todo; si no, sólo lo suyo
  const { data, error } = await supabase
    .from('admin_card_designs')
    .select('*');

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, designs: data ?? [] });
}
