import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '@/lib/db';

function safeFilename(s: string) {
  return (s || 'contact').replace(/[^\w.-]+/g, '-').slice(0, 64);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const slug = req.query.slug as string;

  try {
    const supabase = getSupabaseAdmin(); // ✅ crear el cliente aquí
    const { data: p, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) return res.status(500).end(error.message);
    if (!p) return res.status(404).end('Not found');

    const vcf = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${p.name}`,
      p.company ? `ORG:${p.company}` : '',
      p.phone ? `TEL;TYPE=CELL:${p.phone}` : '',
      p.email ? `EMAIL;TYPE=INTERNET:${p.email}` : '',
      'END:VCARD',
    ]
      .filter(Boolean)
      .join('\n');

    res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename(slug)}.vcf"`);
    res.status(200).send(vcf);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).end(msg);
  }
}
