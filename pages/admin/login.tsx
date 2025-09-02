import { useState } from 'react';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    const r = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (r.ok) window.location.href = '/admin';
    else setErr('Contraseña inválida');
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-black/40 p-6 rounded-2xl space-y-4">
        <h1 className="text-xl font-semibold">Acceso administrador</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          className="w-full p-3 rounded-lg bg-slate-900 border border-slate-700"
        />
        {err && <p className="text-red-400 text-sm">{err}</p>}
        <button className="w-full py-3 rounded-lg bg-emerald-500 text-slate-900 font-medium">Entrar</button>
      </form>
    </main>
  );
}
