// pages/admin/designs.tsx
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { isAdminFromSsr } from '@/lib/auth';
import type { GetServerSideProps } from 'next';

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

type ApiRespErrObj = { ok?: false; error?: string; message?: string };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

const isCardDesign = (v: unknown): v is CardDesign => {
  if (!isRecord(v)) return false;
  return (
    ('id' in v || 'title' in v || 'profile_id' in v) &&
    (!('id' in v) || v.id === null || typeof v.id === 'string') &&
    (!('title' in v) || v.title === null || typeof v.title === 'string')
  );
};

const isCardDesignArray = (v: unknown): v is CardDesign[] =>
  Array.isArray(v) && v.every(isCardDesign);

/** Extrae los diseños aceptando múltiples shapes habituales. Lanza Error si encuentra mensaje de error. */
function extractDesigns(body: unknown): CardDesign[] {
  // 1) Array directo
  if (isCardDesignArray(body)) return body;

  if (isRecord(body)) {
    // 2) Propiedades típicas a nivel raíz
    const topKeys = ['data', 'designs', 'items', 'results', 'rows', 'cards'] as const;
    for (const k of topKeys) {
      const val = body[k as keyof typeof body];
      if (isCardDesignArray(val)) return val;
      // 3) Anidado en data: { data: { designs: [] } ... }
      if (isRecord(val)) {
        for (const kk of topKeys) {
          const nested = val[kk as keyof typeof val];
          if (isCardDesignArray(nested)) return nested;
        }
      }
    }

    // 4) Mensaje de error común
    const msg =
      (typeof (body as ApiRespErrObj).error === 'string' && (body as ApiRespErrObj).error) ||
      (typeof (body as ApiRespErrObj).message === 'string' && (body as ApiRespErrObj).message);
    if (msg) throw new Error(msg);
  }

  throw new Error('Respuesta inesperada del API /api/admin/card-designs');
}

const isHttpUrl = (u: string | null | undefined) =>
  typeof u === 'string' && /^(https?:)?\/\//i.test(u.trim());

const isDataUrl = (u: string | null | undefined) =>
  typeof u === 'string' && u.trim().toLowerCase().startsWith('data:');

function openAsset(url: string) {
  try {
    if (isHttpUrl(url)) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (isDataUrl(url)) {
      const [header, dataPart = ''] = url.split(',', 2);
      const isBase64 = /;base64/i.test(header);
      const mimeMatch = /^data:([^;]+)/i.exec(header);
      const mime = (mimeMatch && mimeMatch[1]) || 'application/octet-stream';
      const bytesStr = isBase64 ? atob(dataPart) : decodeURIComponent(dataPart);
      const buf = new Uint8Array(bytesStr.length);
      for (let i = 0; i < bytesStr.length; i++) buf[i] = bytesStr.charCodeAt(i);
      const blob = new Blob([buf], { type: mime });
      const objUrl = URL.createObjectURL(blob);
      window.open(objUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(objUrl), 30000);
      return;
    }
    alert('Formato de URL no soportado para abrir en nueva pestaña.');
  } catch {
    alert('No se pudo abrir el recurso.');
  }
}

/** Acepta string|null y abre si es string no vacío (evita que TS se queje en onClick) */
function handleOpen(u: string | null) {
  if (typeof u === 'string' && u.length > 0) {
    openAsset(u);
  }
}

export default function AdminDesignsPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [designs, setDesigns] = useState<CardDesign[]>([]);
  const [q, setQ] = useState<string>('');
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErrMsg(null);
      try {
        const r = await fetch('/api/admin/card-designs', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!r.ok) {
          const txt = await r.text().catch(() => '');
          // 401/403 se muestran claros
          if (r.status === 401 || r.status === 403) {
            throw new Error('No autorizado para ver diseños.');
          }
          throw new Error(`HTTP ${r.status} ${r.statusText}${txt ? ` – ${txt}` : ''}`);
        }

        const body: unknown = await r.json();
        const rows = extractDesigns(body);
        setDesigns(rows);
      } catch (err) {
        setErrMsg(err instanceof Error ? err.message : 'Error al cargar diseños');
        setDesigns([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return designs;
    return designs.filter((d) => {
      const idStr = d.id ?? '';
      const titleStr = d.title ?? '';
      const profStr = d.profile_id ?? '';
      return (
        titleStr.toLowerCase().includes(term) ||
        idStr.toLowerCase().includes(term) ||
        profStr.toLowerCase().includes(term)
      );
    });
  }, [q, designs]);

  return (
    <>
      <Head><title>Admin · Diseños</title></Head>
      <main className="mx-auto max-w-7xl p-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Diseños de tarjetas</h1>
          <nav className="flex gap-4 text-sm opacity-90">
            <Link href="/admin" className="underline-offset-2 hover:underline">Dashboard</Link>
            <Link href="/admin/profiles" className="underline-offset-2 hover:underline">Perfiles</Link>
            <Link href="/admin/orders" className="underline-offset-2 hover:underline">Pedidos</Link>
            <Link href="/admin/designs" className="underline-offset-2 hover:underline font-medium text-indigo-700">Diseños</Link>
            <Link href="/api/admin/logout" className="underline-offset-2 hover:underline">Salir</Link>
          </nav>
        </header>

        <div className="mb-4 flex items-center gap-2">
          <input
            value={q}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setQ(e.currentTarget.value)}
            placeholder="Buscar por título, id o profile_id…"
            className="w-80 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-sm text-slate-600">{filtered.length} resultados</span>
        </div>

        {errMsg && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errMsg}
          </div>
        )}

        {loading ? (
          <div className="text-slate-600">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="text-slate-600">Sin resultados.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((d, idx) => (
              <article
                key={d.id ?? `idx-${idx}`}
                className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
              >
                <div className="aspect-[16/10] bg-slate-100">
                  {typeof d.preview_url === 'string' && d.preview_url ? (
                    <img
                      src={d.preview_url}
                      alt={d.title ?? 'Preview'}
                      className="w-full h-full object-cover pointer-events-none select-none"
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-slate-400 text-sm">
                      Sin preview
                    </div>
                  )}
                </div>

                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium truncate text-slate-800">
                      {d.title || 'Sin título'}
                    </h3>
                    <span className="text-xs text-slate-500">
                      {(d.id || '').slice(0, 8) || '—'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-700">
                    Perfil: <span className="font-mono">{d.profile_id ?? '–'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {typeof d.front_url === 'string' && d.front_url && (
                      <button
                        type="button"
                        onClick={() => handleOpen(d.front_url)}
                        className="text-xs rounded bg-sky-200 text-sky-900 border border-sky-300 px-2 py-1 hover:bg-sky-300"
                      >
                        Frente
                      </button>
                    )}
                    {typeof d.back_url === 'string' && d.back_url && (
                      <button
                        type="button"
                        onClick={() => handleOpen(d.back_url)}
                        className="text-xs rounded bg-sky-200 text-sky-900 border border-sky-300 px-2 py-1 hover:bg-sky-300"
                      >
                        Reverso
                      </button>
                    )}
                    {typeof d.preview_url === 'string' && d.preview_url && (
                      <button
                        type="button"
                        onClick={() => handleOpen(d.preview_url)}
                        className="ml-auto text-xs rounded bg-indigo-200 text-indigo-900 border border-indigo-300 px-2 py-1 hover:bg-indigo-300"
                      >
                        Preview
                      </button>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500">
                    {d.created_at ? new Date(d.created_at).toLocaleString() : ''}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  if (!isAdminFromSsr({ headers: ctx.req.headers })) {
    return { redirect: { destination: '/admin/login', permanent: false } };
  }
  return { props: {} };
};
