// pages/admin/orders.tsx
import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { isAdminFromSsr } from '@/lib/auth';
import { useEffect, useState } from 'react';
import NextImage from 'next/image';

type Finish = 'mate' | 'brillante' | 'satinado';
type OrderStatus =
  | 'submitted'
  | 'paid'
  | 'in_production'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

type ProfileLite = {
  slug?: string | null;
  name?: string | null;
  email?: string | null;
  whatsapp?: string | null;
};

type CardDesignLite = {
  preview_url?: string | null;
};

type OrderRow = {
  id: string;
  profile_id: string;
  design_id?: string | null;
  quantity: number;
  finish: Finish;
  corner_radius: number;
  notes?: string | null;
  shipping_name?: string | null;
  shipping_phone?: string | null;
  shipping_email?: string | null;
  shipping_address?: Record<string, unknown> | null;
  status: OrderStatus;
  created_at?: string;
  updated_at?: string;
  profiles?: ProfileLite | null;
  card_designs?: CardDesignLite | null;
};

type ApiOk<T> = { ok: true; data: T };
type ApiErr = { ok: false; error: string };
type ApiResp<T> = ApiOk<T> | ApiErr;

export default function AdminOrders() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErrMsg(null);
      try {
        const r = await fetch('/api/admin/order', { cache: 'no-store' });
        if (!r.ok) {
          const txt = await r.text().catch(() => '');
          throw new Error(`HTTP ${r.status} ${r.statusText}${txt ? ` – ${txt}` : ''}`);
        }
        const j: ApiResp<OrderRow[]> = await r.json();
        if (j.ok) {
          setRows(j.data || []);
        } else {
          setErrMsg(j.error || 'Error al cargar pedidos.');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al cargar pedidos.';
        setErrMsg(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function updateStatus(id: string, status: OrderStatus) {
    try {
      const r = await fetch('/api/admin/order', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!r.ok) {
        const txt = await r.text().catch(() => '');
        throw new Error(`HTTP ${r.status} ${r.statusText}${txt ? ` – ${txt}` : ''}`);
      }
      const j: ApiResp<unknown> = await r.json();
      if (!j.ok) {
        alert(j.error || 'Error al actualizar estatus');
        return;
      }
      setRows((rs) => rs.map((x) => (x.id === id ? { ...x, status } : x)));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar estatus';
      alert(msg);
    }
  }

  if (loading) return <div style={{ padding: 24 }}>Cargando…</div>;

  return (
    <main className="max-w-6xl mx-auto p-6">
      {/* Header / Nav Admin */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Pedidos de tarjetas físicas</h1>
        <nav className="flex gap-4 text-sm opacity-90">
          <Link href="/admin" className="underline-offset-2 hover:underline">Dashboard</Link>
          <Link href="/admin/profiles" className="underline-offset-2 hover:underline">Perfiles</Link>
          <Link href="/admin/orders" className="underline-offset-2 hover:underline font-medium">Pedidos</Link>
          <Link href="/admin/designs" className="underline-offset-2 hover:underline">Diseños</Link>
          <Link href="/api/admin/logout" className="underline-offset-2 hover:underline">Salir</Link>
        </nav>
      </header>

      {errMsg ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm">
          {errMsg}
        </div>
      ) : null}

      <div className="grid gap-3">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-white/10 p-6 text-sm opacity-80">
            No hay pedidos por ahora.
          </div>
        ) : (
          rows.map((o) => (
            <div key={o.id} className="rounded-xl border border-white/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">
                    {o.profiles?.name}{' '}
                    <span className="opacity-70">(@{o.profiles?.slug})</span>
                  </div>
                  <div className="text-sm opacity-80">
                    Cant: {o.quantity} | Acabado: {o.finish} | Esquinas: {o.corner_radius}mm | Estatus: <b>{o.status}</b>
                  </div>
                  {o.notes ? (
                    <div className="mt-1 text-xs opacity-70">Notas: {o.notes}</div>
                  ) : null}
                  {o.shipping_name || o.shipping_address ? (
                    <div className="mt-1 text-xs opacity-70">
                      Envío:{' '}
                      {[o.shipping_name, o.shipping_phone, o.shipping_email].filter(Boolean).join(' · ')}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  {(
                    ['submitted','paid','in_production','shipped','delivered','cancelled'] as OrderStatus[]
                  ).map((s) => (
                    <button
                      key={s}
                      className={`px-3 py-1 rounded border text-sm transition
                        ${s === o.status ? 'bg-emerald-600/20 border-emerald-600/50' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
                      onClick={() => updateStatus(o.id, s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {o.card_designs?.preview_url && (
                <div className="relative mt-3 h-40 w-full">
                  <NextImage
                    src={o.card_designs.preview_url || ''}
                    alt="preview"
                    fill
                    className="rounded border border-white/10 object-contain"
                    unoptimized
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  if (!isAdminFromSsr({ headers: ctx.req.headers })) {
    return { redirect: { destination: '/admin/login', permanent: false } };
  }
  return { props: {} };
};
