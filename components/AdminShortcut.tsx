// components/AdminShortcut.tsx
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AdminShortcut() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/admin/is-admin');
        const j = await r.json();
        if (!cancelled) setShow(Boolean(j?.isAdmin));
      } catch {
        // silencio: si falla, simplemente no mostramos el botón
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <Link
        href="/admin"
        className="group inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-slate-900 shadow-lg hover:bg-emerald-400 transition"
        title="Panel de administración"
      >
        {/* ícono simple */}
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <path d="M12 2l4 4-4 4-4-4 4-4zm-7 9h14v9H5v-9z"/>
        </svg>
        <span className="text-sm font-medium">Admin</span>
      </Link>
    </div>
  );
}
