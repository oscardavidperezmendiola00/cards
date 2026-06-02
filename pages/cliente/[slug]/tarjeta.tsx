// pages/cliente/[slug]/tarjeta.tsx
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

// 🔁 Paso 3: cargar el editor de tarjetas solo en cliente (Konva no va en SSR)
const CardDesigner = dynamic(
  () => import('@/components/card/AdvancedCardDesigner'),
  { ssr: false }
);

type Finish = 'mate' | 'brillante' | 'satinado';

type Address = Record<string, unknown>;

type Shipping = {
  name?: string;
  phone?: string;
  email?: string;
  address?: Address;
};

type Order = {
  quantity: number;
  finish: Finish;
  corner_radius: number;
  shipping: Shipping;
  notes?: string;
};

type Design = {
  id?: string;
  front_url?: string | null;
  back_url?: string | null;
  preview_url?: string | null;
};

type ApiOk<T> = { ok: true; data: T };
type ApiErr = { ok: false; error: string };
type ApiResp<T> = ApiOk<T> | ApiErr;

function asString(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] ?? '' : v ?? '';
}

export default function TarjetaFisicaPage() {
  const router = useRouter();

  const slug = useMemo(() => asString(router.query.slug), [router.query.slug]);
  const pin  = useMemo(() => asString(router.query.pin),  [router.query.pin]);

  const [design, setDesign] = useState<Design | null>(null);
  const [order, setOrder] = useState<Order>({
    quantity: 1,
    finish: 'mate',
    corner_radius: 3,
    shipping: { name: '', phone: '', email: '', address: { country: 'MX' } },
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const r = await fetch(`/api/client/card/design?slug=${encodeURIComponent(slug)}`);
      const j: ApiResp<Design | null> = await r.json();
      if (j.ok) setDesign(j.data);
    })();
  }, [slug]);

  async function submitOrder() {
    if (!slug) return;
    setLoading(true);
    setOkMsg(null);

    const r = await fetch('/api/client/card/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug,
        pin,
        design_id: design?.id ?? null,
        ...order,
      }),
    });

    const j: ApiResp<unknown> = await r.json();
    setLoading(false);
    if (!j.ok) {
      alert(j.error || 'Error al crear pedido');
      return;
    }
    setOkMsg('Pedido enviado. Te contactaremos para el pago y la producción.');
  }

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-1">Tarjeta física personalizada</h1>
      <p className="opacity-80 mb-6">
        Crea tu diseño (frente y reverso) y realiza tu pedido. El chip NFC apuntará a tu URL pública{' '}
        <code>/p/{slug}</code>.
      </p>

      {!slug ? (
        <div>Cargando…</div>
      ) : (
        <>
          <CardDesigner
            slug={slug}
            pin={pin}
            initialFront={design?.front_url ?? undefined}
            initialBack={design?.back_url ?? undefined}
            onSaved={(d) => setDesign((prev) => ({ ...(prev ?? {}), ...d }))}
          />

          <section className="mt-6 rounded-xl border border-white/10 p-4">
            <h2 className="text-lg font-medium mb-3">Pedido</h2>

            <div className="grid md:grid-cols-3 gap-4">
              {/* Cantidad */}
              <div>
                <label className="block text-sm opacity-80 mb-1">Cantidad</label>
                <input
                  type="number"
                  min={1}
                  className="w-full p-3 rounded bg-slate-900 border border-slate-700"
                  value={order.quantity}
                  onChange={(e) => {
                    const v = e.currentTarget.value;
                    const n = Math.max(1, Number(v || 1));
                    setOrder((o) => ({ ...o, quantity: n }));
                  }}
                />
              </div>

              {/* Acabado */}
              <div>
                <label className="block text-sm opacity-80 mb-1">Acabado</label>
                <select
                  className="w-full p-3 rounded bg-slate-900 border border-slate-700"
                  value={order.finish}
                  onChange={(e) => {
                    const v = e.currentTarget.value as Finish;
                    setOrder((o) => ({ ...o, finish: v }));
                  }}
                >
                  <option value="mate">Mate</option>
                  <option value="brillante">Brillante</option>
                  <option value="satinado">Satinado</option>
                </select>
              </div>

              {/* Esquinas (mm) */}
              <div>
                <label className="block text-sm opacity-80 mb-1">Esquinas (mm)</label>
                <input
                  type="number"
                  min={0}
                  max={6}
                  className="w-full p-3 rounded bg-slate-900 border border-slate-700"
                  value={order.corner_radius}
                  onChange={(e) => {
                    const v = e.currentTarget.value;
                    const n = Number(v === '' ? '3' : v);
                    const clamped = Math.max(0, Math.min(6, isNaN(n) ? 3 : n));
                    setOrder((o) => ({ ...o, corner_radius: clamped }));
                  }}
                />
              </div>
            </div>

            <h3 className="font-medium mt-5 mb-2">Envío</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Nombre */}
              <input
                className="p-3 rounded bg-slate-900 border border-slate-700"
                placeholder="Nombre completo"
                value={order.shipping.name ?? ''}
                onChange={(e) => {
                  const v = e.currentTarget.value;
                  setOrder((o) => ({ ...o, shipping: { ...o.shipping, name: v } }));
                }}
              />
              {/* Teléfono */}
              <input
                className="p-3 rounded bg-slate-900 border border-slate-700"
                placeholder="Teléfono"
                value={order.shipping.phone ?? ''}
                onChange={(e) => {
                  const v = e.currentTarget.value;
                  setOrder((o) => ({ ...o, shipping: { ...o.shipping, phone: v } }));
                }}
              />
              {/* Email */}
              <input
                className="p-3 rounded bg-slate-900 border border-slate-700 md:col-span-2"
                placeholder="Email"
                value={order.shipping.email ?? ''}
                onChange={(e) => {
                  const v = e.currentTarget.value;
                  setOrder((o) => ({ ...o, shipping: { ...o.shipping, email: v } }));
                }}
              />
              {/* Dirección 1 */}
              <input
                className="p-3 rounded bg-slate-900 border border-slate-700 md:col-span-2"
                placeholder="Dirección (línea 1)"
                onChange={(e) => {
                  const v = e.currentTarget.value;
                  setOrder((o) => ({
                    ...o,
                    shipping: {
                      ...o.shipping,
                      address: { ...(o.shipping.address || {}), line1: v },
                    },
                  }));
                }}
              />
              {/* Ciudad/Estado/CP */}
              <div className="grid grid-cols-3 gap-3 md:col-span-2">
                <input
                  className="p-3 rounded bg-slate-900 border border-slate-700"
                  placeholder="Ciudad"
                  onChange={(e) => {
                    const v = e.currentTarget.value;
                    setOrder((o) => ({
                      ...o,
                      shipping: {
                        ...o.shipping,
                        address: { ...(o.shipping.address || {}), city: v },
                      },
                    }));
                  }}
                />
                <input
                  className="p-3 rounded bg-slate-900 border border-slate-700"
                  placeholder="Estado"
                  onChange={(e) => {
                    const v = e.currentTarget.value;
                    setOrder((o) => ({
                      ...o,
                      shipping: {
                        ...o.shipping,
                        address: { ...(o.shipping.address || {}), state: v },
                      },
                    }));
                  }}
                />
                <input
                  className="p-3 rounded bg-slate-900 border border-slate-700"
                  placeholder="C.P."
                  onChange={(e) => {
                    const v = e.currentTarget.value;
                    setOrder((o) => ({
                      ...o,
                      shipping: {
                        ...o.shipping,
                        address: { ...(o.shipping.address || {}), zip: v },
                      },
                    }));
                  }}
                />
              </div>
              {/* Notas */}
              <textarea
                className="p-3 rounded bg-slate-900 border border-slate-700 md:col-span-2"
                placeholder="Notas (opcional)"
                onChange={(e) => {
                  const v = e.currentTarget.value;
                  setOrder((o) => ({ ...o, notes: v }));
                }}
              />
            </div>

            <div className="mt-4 flex gap-3">
              <button
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-900 font-medium"
                onClick={submitOrder}
              >
                {loading ? 'Enviando…' : 'Enviar pedido'}
              </button>
            </div>
            {okMsg && <p className="text-sm mt-3 text-emerald-400">{okMsg}</p>}
          </section>
        </>
      )}
    </main>
  );
}
