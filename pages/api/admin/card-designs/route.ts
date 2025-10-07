// app/api/admin/card-designs/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type CardSpecs = {
  size_mm?: { w: number; h: number };
  bleed_mm?: number;
  safe_mm?: number;
  dpi?: number;
  [k: string]: unknown;
};

type CardDesign = {
  id: string | null;
  profile_id: string | null;
  title: string | null;
  front_url: string | null;
  back_url: string | null;
  preview_url: string | null;
  specs: CardSpecs | null;
  created_at: string | null;
};

// helpers de narrowing
const asRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

const asStr = (v: unknown): string | null =>
  typeof v === 'string' ? v : null;

const asCardSpecs = (v: unknown): CardSpecs | null =>
  asRecord(v) ? (v as CardSpecs) : null;

export async function GET() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from('card_designs')
    .select('id, profile_id, title, front_url, back_url, preview_url, specs, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const raw: unknown[] = Array.isArray(data) ? data : [];

  const rows: CardDesign[] = raw.map((row): CardDesign => {
    const r = asRecord(row) ? row : {};
    return {
      id: asStr(r.id),
      profile_id: asStr(r.profile_id),
      title: asStr(r.title),
      front_url: asStr(r.front_url),
      back_url: asStr(r.back_url),
      preview_url: asStr(r.preview_url),
      specs: asCardSpecs(r.specs),
      created_at: asStr(r.created_at),
    };
  });

  return NextResponse.json({ data: rows });
}
