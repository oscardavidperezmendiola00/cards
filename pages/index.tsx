import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [slug, setSlug] = useState('');

  function onGoClient(e: React.FormEvent) {
    e.preventDefault();
    if (!slug.trim()) return;
    router.push(`/cliente/${encodeURIComponent(slug.trim())}`);
  }

  return (
    <>
      <Head>
        <title>Trafika — Tarjetas digitales NFC/QR con métricas</title>
        <meta
          name="description"
          content="Trafika: perfiles digitales con NFC/QR, métricas en tiempo real y vCard. Comparte con un toque. Administra, mide y crece."
        />
      </Head>

      <main className="relative min-h-screen bg-slate-950 text-slate-100 overflow-hidden">
        {/* Backdrop gradient orbs */}
        <div className="pointer-events-none absolute -top-48 -left-40 h-[38rem] w-[38rem] rounded-full bg-gradient-to-tr from-emerald-400/15 via-teal-400/10 to-cyan-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-48 -right-40 h-[38rem] w-[38rem] rounded-full bg-gradient-to-tl from-cyan-400/15 via-sky-400/10 to-emerald-400/15 blur-3xl" />

        {/* Navbar */}
        <header className="relative z-10 max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" aria-label="Trafika inicio" className="group flex items-center gap-2">
            <LogoMark />
            <span className="text-xl font-semibold tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                Trafika
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/cliente"
              className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition"
            >
              Soy cliente
            </Link>
            <Link
              href="/admin/login"
              className="px-3 py-2 rounded-lg bg-emerald-500 text-slate-900 font-medium hover:brightness-95 transition"
            >
              Ir a Admin
            </Link>
          </nav>
        </header>

        {/* Hero */}
        <section className="relative z-10 max-w-7xl mx-auto px-6 pt-10 pb-20 md:pb-28">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                Nuevo: métricas por acción en tiempo real
              </div>
              <h1 className="mt-4 text-4xl md:text-6xl font-semibold leading-tight">
                La tarjeta digital de{' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                  Trafika
                </span>
                : comparte con un toque, mide cada acción
              </h1>
              <p className="mt-4 text-base md:text-lg opacity-80">
                NFC o QR. Perfil elegante, vCard instantánea y panel con estadísticas. Todo listo en minutos.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/admin/login"
                  className="px-5 py-3 rounded-xl bg-emerald-500 text-slate-900 font-medium hover:brightness-95 transition"
                >
                  Empezar ahora (Admin)
                </Link>
                <Link
                  href="/cliente"
                  className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition"
                >
                  Soy cliente
                </Link>
              </div>

              {/* Buscador directo por slug */}
              <form onSubmit={onGoClient} className="mt-6 flex w-full max-w-md gap-2">
                <input
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-white/10 outline-none focus:border-emerald-400/50 transition"
                  placeholder="Ingresa tu slug (ej. oscar27)"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  aria-label="Buscar perfil por slug"
                />
                <button
                  className="px-4 py-3 rounded-xl bg-emerald-500 text-slate-900 font-medium hover:brightness-95 transition"
                  aria-label="Ir a perfil del cliente"
                >
                  Ir
                </button>
              </form>

              {/* Chips */}
              <div className="mt-6 flex flex-wrap gap-2 text-xs opacity-75">
                {['NFC / QR', 'Métricas por acción', 'vCard', 'Privado y seguro', 'Marca personalizable'].map(
                  (t) => (
                    <span
                      key={t}
                      className="px-3 py-1 rounded-full bg-white/5 border border-white/10 hover:border-emerald-400/40 transition"
                    >
                      {t}
                    </span>
                  )
                )}
              </div>
            </div>

            {/* Tarjeta demo (glass card) */}
            <div className="lg:justify-self-end">
              <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur">
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-full bg-white/10 overflow-hidden grid place-items-center">
                    <span className="text-2xl">👤</span>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">Nombre Apellido</div>
                    <div className="text-sm opacity-70">Puesto · Empresa</div>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
                  <button className="px-3 py-2 rounded-lg bg-emerald-500 text-slate-900 font-medium hover:brightness-95 transition">
                    WhatsApp
                  </button>
                  <button className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition">
                    Email
                  </button>
                  <button className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition">
                    Llamar
                  </button>
                  <button className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition">
                    Sitio
                  </button>
                </div>
                <div className="mt-4 text-xs opacity-60">Vista ilustrativa de la tarjeta Trafika</div>
              </div>
            </div>
          </div>
        </section>

        {/* Value props */}
        <section className="relative z-10 max-w-7xl mx-auto px-6 pb-12">
          <div className="grid md:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <article
                key={f.title}
                className="rounded-2xl p-5 bg-white/[0.03] border border-white/10 hover:border-emerald-400/30 hover:bg-white/[0.04] transition"
              >
                <div className="text-2xl">{f.icon}</div>
                <h3 className="mt-3 font-medium">{f.title}</h3>
                <p className="mt-1 text-sm opacity-80">{f.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="relative z-10 max-w-7xl mx-auto px-6 py-10">
          <h2 className="text-xl font-semibold">¿Cómo funciona Trafika?</h2>
          <div className="mt-4 grid md:grid-cols-3 gap-4">
            {STEPS.map((s, i) => (
              <article key={s.title} className="rounded-2xl p-5 bg-white/[0.02] border border-white/10">
                <div className="text-xs uppercase tracking-wide text-emerald-300/90">Paso {i + 1}</div>
                <h3 className="mt-1 font-medium">{s.title}</h3>
                <p className="mt-1 text-sm opacity-80">{s.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Mini stats strip */}
        <section className="relative z-10 max-w-7xl mx-auto px-6 pb-12">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 p-6 md:p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                ['< 5 min', 'para tu primer perfil'],
                ['100%', 'compatible iOS/Android'],
                ['vCard', 'un toque para guardar'],
                ['Métricas', 'vistas y clics'],
              ].map(([big, small]) => (
                <div key={big}>
                  <div className="text-2xl md:text-3xl font-semibold">{big}</div>
                  <div className="text-xs opacity-80 mt-1">{small}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="relative z-10 max-w-7xl mx-auto px-6 pb-16">
          <h2 className="text-xl font-semibold">Preguntas frecuentes</h2>
          <div className="mt-4 grid md:grid-cols-2 gap-4">
            {FAQ.map((f) => (
              <details
                key={f.q}
                className="rounded-2xl p-5 bg-white/[0.03] border border-white/10 open:bg-white/[0.05] transition"
              >
                <summary className="cursor-pointer list-none font-medium">
                  <span className="align-middle">{f.q}</span>
                </summary>
                <p className="mt-2 text-sm opacity-80">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className="relative z-10 max-w-7xl mx-auto px-6 pb-20">
          <div className="rounded-3xl p-8 md:p-10 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-white/10">
            <div className="grid md:grid-cols-2 gap-6 items-center">
              <div>
                <h3 className="text-2xl font-semibold">Impulsa tu networking con Trafika</h3>
                <p className="mt-2 opacity-80">
                  Lanza tu tarjeta digital, compártela con un toque y entiende qué funciona con métricas claras.
                </p>
              </div>
              <div className="flex flex-wrap md:justify-end gap-3">
                <Link
                  href="/admin/login"
                  className="px-5 py-3 rounded-xl bg-emerald-500 text-slate-900 font-medium hover:brightness-95 transition"
                >
                  Ir al panel
                </Link>
                <Link
                  href="/cliente"
                  className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
                >
                  Soy cliente
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative z-10 border-t border-white/10 bg-black/20">
          <div className="max-w-7xl mx-auto px-6 py-8 text-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="opacity-75">© {new Date().getFullYear()} Trafika. Todos los derechos reservados.</div>
            <div className="flex items-center gap-4 opacity-85">
              <Link href="/cliente" className="hover:underline underline-offset-2">
                Área de cliente
              </Link>
              <Link href="/admin/login" className="hover:underline underline-offset-2">
                Admin
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}

/** Marca compacta de Trafika (SVG) */
function LogoMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" className="text-emerald-400">
      <defs>
        <linearGradient id="trafika-g" x1="0" x2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#trafika-g)" opacity="0.25" />
      <path
        d="M7 13h4v4h2v-4h4v-2h-4V7h-2v4H7v2z"
        fill="url(#trafika-g)"
        stroke="transparent"
      />
    </svg>
  );
}

const FEATURES = [
  {
    title: 'NFC / QR sin fricción',
    desc: 'Comparte con un toque o un escaneo. Funciona en iOS y Android modernos.',
    icon: '📡',
  },
  {
    title: 'Métricas accionables',
    desc: 'Vistas y clics por botón (WhatsApp, Email, Teléfono, Sitio) para optimizar tu perfil.',
    icon: '📊',
  },
  {
    title: 'vCard instantánea',
    desc: 'Guarda el contacto en el teléfono sin pasos extra: un tap y listo.',
    icon: '🪪',
  },
  {
    title: 'Edición sencilla',
    desc: 'Actualiza nombre, puesto, empresa, avatar y enlaces al instante.',
    icon: '✏️',
  },
  {
    title: 'Rendimiento y seguridad',
    desc: 'Vercel + Supabase con HTTPS. Privacidad para tus datos.',
    icon: '⚡️',
  },
  {
    title: 'Marca Trafika',
    desc: 'Visual pulido, colores personalizables y componentes reutilizables.',
    icon: '🎨',
  },
] as const;

const STEPS = [
  {
    title: 'Crea tu perfil',
    desc: 'Desde el panel Admin, genera el slug y define tu información básica.',
  },
  {
    title: 'Vincula tu NFC/QR',
    desc: 'Graba la URL del perfil o imprime el QR. Pruébalo en tu teléfono.',
  },
  {
    title: 'Comparte y mide',
    desc: 'Monitorea vistas y clics por acción y ajusta tu perfil para convertir mejor.',
  },
] as const;

const FAQ = [
  {
    q: '¿Necesito una app para usar Trafika?',
    a: 'No. El perfil funciona en navegador móvil. Para NFC, basta con un teléfono compatible; para QR, cualquier cámara moderna.',
  },
  {
    q: '¿Se puede personalizar a la marca?',
    a: 'Sí. Puedes ajustar colores y contenido. También soporta avatar y enlaces personalizados.',
  },
  {
    q: '¿Qué datos se miden?',
    a: 'Vistas del perfil y clics por acción (WhatsApp, Email, Teléfono, Sitio) con desglose por día.',
  },
  {
    q: '¿Puedo exportar contactos?',
    a: 'Los visitantes pueden descargar la vCard de tu perfil. Desde Admin puedes gestionar perfiles y datos.',
  },
] as const;
