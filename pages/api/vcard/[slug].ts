import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const slug = req.query.slug as string;
  const { data: p } = await supabaseAdmin.from('profiles').select('*').eq('slug', slug).single();
  if (!p) return res.status(404).end('Not found');

  const vcf = [
    'BEGIN:VCARD','VERSION:3.0',
    `FN:${p.name}`,
    p.company ? `ORG:${p.company}` : '',
    p.phone ? `TEL;TYPE=CELL:${p.phone}` : '',
    p.email ? `EMAIL;TYPE=INTERNET:${p.email}` : '',
    'END:VCARD'
  ].filter(Boolean).join('\n');

  res.setHeader('Content-Type','text/vcard; charset=utf-8');
  res.setHeader('Content-Disposition',`attachment; filename="${slug}.vcf"`);
  res.send(vcf);
}
