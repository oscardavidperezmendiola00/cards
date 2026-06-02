// components/CardDesigner.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import NextImage from 'next/image';

type Props = {
  slug: string;
  pin?: string;
  initialFront?: string | null;
  initialBack?: string | null;
  onSaved?: (payload: { front_url?: string; back_url?: string; preview_url?: string }) => void;
};

type ApiError = { error?: string };

const MM_TO_PX = 11.811; // 300 DPI aprox (solo para preview en canvas)
const SIZE = { wmm: 85.5, hmm: 54, bleed: 3, safe: 2 }; // CR80

export default function CardDesigner({ slug, pin = '', initialFront, initialBack, onSaved }: Props) {
  const [frontUrl, setFrontUrl] = useState<string | undefined>(initialFront ?? undefined);
  const [backUrl,  setBackUrl ] = useState<string | undefined>(initialBack ?? undefined);
  const [nameTxt,  setNameTxt ] = useState('');
  const [roleTxt,  setRoleTxt ] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Medidas en px (memoizadas)
  const px = useMemo(
    () => ({
      w: Math.round(SIZE.wmm * MM_TO_PX),
      h: Math.round(SIZE.hmm * MM_TO_PX),
      bleed: Math.round(SIZE.bleed * MM_TO_PX),
      safe: Math.round(SIZE.safe * MM_TO_PX),
    }),
    []
  );

  useEffect(() => {
    void renderCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frontUrl, nameTxt, roleTxt]);

  async function renderCanvas() {
    const c = canvasRef.current;
    if (!c) return;
    c.width = px.w;
    c.height = px.h;

    const ctx = c.getContext('2d');
    if (!ctx) return;

    // Fondo
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, px.w, px.h);

    // Guías
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, px.w, px.h); // bleed

    ctx.strokeStyle = 'rgba(0,200,255,.45)';
    ctx.strokeRect(px.safe, px.safe, px.w - 2 * px.safe, px.h - 2 * px.safe); // safe

    // Imagen del frente (si hay)
    if (frontUrl) {
      try { await drawImage(ctx, frontUrl, px.w, px.h); } catch { /* ignorar */ }
    }

    // Overlay de texto (opcional)
    if (nameTxt) {
      ctx.font = 'bold 42px system-ui, sans-serif';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.fillText(nameTxt, px.safe * 1.2, px.h / 2);
    }
    if (roleTxt) {
      ctx.font = 'normal 28px system-ui, sans-serif';
      ctx.fillStyle = '#ddd';
      ctx.fillText(roleTxt, px.safe * 1.2, px.h / 2 + 40);
    }
  }

  function drawImage(
    ctx: CanvasRenderingContext2D,
    src: string,
    w: number,
    h: number
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // usar el constructor global, NO el componente NextImage
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { ctx.drawImage(img, 0, 0, w, h); resolve(); };
      img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
      img.src = src;
    });
  }

  async function upload(side: 'front' | 'back', file: File) {
    const fd = new FormData();
    fd.append('slug', slug);
    fd.append('pin', pin || '');
    fd.append('side', side);
    fd.append('file', file);

    const r = await fetch('/api/client/card/upload', { method: 'POST', body: fd });
    if (!r.ok) {
      const t = await safeJson(r);
      throw new Error((t && t.error) || `upload failed (${r.status})`);
    }
    const j = (await r.json()) as { ok: boolean; url?: string; error?: string };
    if (!j.ok || !j.url) throw new Error(j.error || 'upload failed');

    if (side === 'front') setFrontUrl(j.url);
    else setBackUrl(j.url);
  }

  async function saveDesign() {
    const preview_url = canvasRef.current?.toDataURL('image/png') || null;

    const r = await fetch('/api/client/card/design', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug,
        pin,
        front_url: frontUrl ?? null,
        back_url: backUrl ?? null,
        title: 'Diseño principal',
        specs: {
          size_mm: { w: SIZE.wmm, h: SIZE.hmm },
          bleed_mm: SIZE.bleed,
          safe_mm: SIZE.safe,
          dpi: 300,
        },
        preview_url,
      }),
    });

    if (!r.ok) {
      const t = await safeJson(r);
      throw new Error((t && t.error) || `save failed (${r.status})`);
    }
    const j = (await r.json()) as { ok: boolean; error?: string };
    if (!j.ok) throw new Error(j.error || 'save failed');

    onSaved?.({
      front_url: frontUrl,
      back_url: backUrl,
      preview_url: preview_url ?? undefined,
    });
  }

  async function safeJson(r: Response): Promise<ApiError | null> {
    try { return (await r.json()) as ApiError; } catch { return null; }
  }

  return (
    <div className="rounded-xl border border-white/10 p-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm opacity-80 mb-2">Frente</p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              if (f) void upload('front', f);
            }}
          />
          {frontUrl && (
            <div className="relative mt-3 h-56 w-full">
              <NextImage
                src={frontUrl}
                alt="Frente"
                fill
                className="rounded border border-white/10 object-contain"
                unoptimized
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          )}
        </div>

        <div>
          <p className="text-sm opacity-80 mb-2">Reverso</p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              if (f) void upload('back', f);
            }}
          />
          {backUrl && (
            <div className="relative mt-3 h-56 w-full">
              <NextImage
                src={backUrl}
                alt="Reverso"
                fill
                className="rounded border border-white/10 object-contain"
                unoptimized
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <div>
          <label className="block text-sm opacity-80 mb-1">Nombre (overlay opcional)</label>
          <input
            className="w-full p-3 rounded bg-slate-900 border border-slate-700"
            value={nameTxt}
            onChange={(e) => setNameTxt(e.target.value)}
          />
          <label className="block text-sm opacity-80 mt-3 mb-1">Cargo (overlay opcional)</label>
          <input
            className="w-full p-3 rounded bg-slate-900 border border-slate-700"
            value={roleTxt}
            onChange={(e) => setRoleTxt(e.target.value)}
          />
        </div>

        <div>
          <p className="text-sm opacity-80 mb-2">Vista previa (guías: borde = bleed, azul = safe)</p>
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: 'auto', background: '#111', borderRadius: 12 }}
          />
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <button
          className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-900 font-medium"
          onClick={() => { void saveDesign(); }}
        >
          Guardar diseño
        </button>
      </div>
    </div>
  );
}
