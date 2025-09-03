import { useRouter } from 'next/router';
import { useState } from 'react';
import Link from 'next/link';

export default function ClienteHome() {
  const [slug, setSlug] = useState('');
  const [pin, setPin] = useState('');
  const router = useRouter();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slug.trim()) return;
    const q = pin.trim() ? `?pin=${encodeURIComponent(pin.trim())}` : '';
    router.push(`/cliente/${encodeURIComponent(slug.trim())}${q}`);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <header className="max-w-3xl mx-auto flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Área de cliente</h1>
        <nav className="text-sm opacity-80">
          <Link href="/" className="hover:underline underline-offset-2">Inicio</Link>
        </nav>
      </header>

      <section className="max-w-md mx-auto bg-black/40 p-6 rounded-2xl">
        <h2 className="font-medium mb-3">Consulta tu perfil</h2>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            className="w-full p-3 rounded-lg bg-slate-900 border border-slate-700"
            placeholder="Tu slug (ej. oscar27)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
          />
          <input
            className="w-full p-3 rounded-lg bg-slate-900 border border-slate-700"
            placeholder="PIN de edición (opcional)"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
          <button className="w-full py-3 rounded-lg bg-emerald-500 text-slate-900 font-medium">
            Continuar
          </button>
        </form>
        <p className="text-xs opacity-70 mt-3">
          * El PIN te permite editar tus datos. Si no lo tienes, podrás ver tus métricas y la vista previa en modo lectura.
        </p>
      </section>
    </main>
  );
}
