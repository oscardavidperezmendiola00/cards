// pages/api/client/card/upload.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '@/lib/db';
import fs from 'fs';
import path from 'path';

// Mantener desactivado para multipart/form-data
export const config = { api: { bodyParser: false } } as const;

/* -------- Tipos de formidable -------- */
import type {
  Options as FormidableOptions,
  Fields as FormidableFields,
  Files as FormidableFiles,
  File as FormidableFile,
  IncomingForm,
} from 'formidable';

type ApiData =
  | { ok: true; url: string; side: 'front' | 'back' }
  | { ok: false; error: string };

async function loadFormidable(): Promise<(opts?: FormidableOptions) => IncomingForm> {
  const mod = (await import('formidable')) as
    | { default: (opts?: FormidableOptions) => IncomingForm }
    | ((opts?: FormidableOptions) => IncomingForm);
  return (typeof mod === 'function' ? mod : mod.default) as (opts?: FormidableOptions) => IncomingForm;
}

function pickFirstFile(files: FormidableFiles, fieldName = 'file'): FormidableFile | null {
  const raw = files[fieldName];
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}

async function parseForm(
  req: NextApiRequest
): Promise<{ fields: FormidableFields; files: FormidableFiles }> {
  const formidable = await loadFormidable();
  const form = formidable({ multiples: false, maxFileSize: 20 * 1024 * 1024 }); // 20 MB
  return await new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => (err ? reject(err) : resolve({ fields, files })));
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiData>
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    return;
  }

  const supabase = getSupabaseAdmin();

  try {
    const { fields, files } = await parseForm(req);

    const slug = String(fields.slug ?? '').trim();
    const pin = String(fields.pin ?? '').trim();
    const side = (String(fields.side ?? 'front').trim() as 'front' | 'back');

    if (!slug || !pin) {
      res.status(400).json({ ok: false, error: 'slug/pin requeridos' });
      return;
    }
    if (!['front', 'back'].includes(side)) {
      res.status(400).json({ ok: false, error: 'side inválido' });
      return;
    }

    // 1) Validar PIN
    const { data: pinRow, error: e1 } = await supabase
      .from('profiles')
      .select('id, edit_pin')
      .eq('slug', slug)
      .single();

    if (e1 || !pinRow) {
      res.status(404).json({ ok: false, error: 'perfil no encontrado' });
      return;
    }
    if (String(pinRow.edit_pin ?? '') !== pin) {
      res.status(403).json({ ok: false, error: 'PIN inválido' });
      return;
    }

    // 2) Archivo
    const file = pickFirstFile(files, 'file');
    if (!file || !file.filepath) {
      res.status(400).json({ ok: false, error: 'archivo requerido (campo "file")' });
      return;
    }

    const buf = await fs.promises.readFile(file.filepath);
    const ext = (path.extname(file.originalFilename ?? '').toLowerCase() || '.png').replace(/[^.\w]/g, '') || '.png';
    const filename = `${side}${ext}`;
    const objectKey = `card-designs/${pinRow.id}/${filename}`;

    // 3) Subida a Storage (bucket: card-designs)
    const { error: e2 } = await supabase.storage
      .from('card-designs')
      .upload(objectKey, buf, {
        upsert: true,
        contentType: file.mimetype || 'image/png',
      });

    if (e2) {
      res.status(400).json({ ok: false, error: e2.message });
      return;
    }

    // 4) URL pública
    const { data: pub } = supabase.storage.from('card-designs').getPublicUrl(objectKey);
    res.status(200).json({ ok: true, url: pub.publicUrl, side });
    return;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'upload error';
    res.status(400).json({ ok: false, error: msg });
    return;
  }
}
