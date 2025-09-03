import Image from 'next/image';

type Link = { label: string; href: string; action?: string };
type Theme = { primary: string; accent: string; bg: string; text: string };

export default function ProfileCard({
  name, headline, avatar_url, company, links, theme
}: {
  name: string; headline?: string; avatar_url?: string; company?: string;
  links: Link[]; theme: Theme;
}) {
  function trackAction(action?: string) {
    if (!action) return;
    const slug =
      typeof window !== 'undefined'
        ? (window.location.pathname.split('/').pop() || '')
        : '';

    const payload = {
      action,
      slug,
      ref: typeof document !== 'undefined' ? document.referrer : null,
      ua: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    };

    // Enviar como JSON (compatible con Vercel) usando Beacon
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });

    // sendBeacon no bloquea la navegación del <a>
    const ok =
      typeof navigator !== 'undefined' &&
      'sendBeacon' in navigator &&
      navigator.sendBeacon('/api/track', blob);

    // Fallback para navegadores sin Beacon
    if (!ok) {
      void fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
         style={{ background: theme.bg, color: theme.text }}>
      <div className="w-full max-w-md rounded-2xl p-6 shadow-xl"
           style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)'}}>
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-28 h-28 rounded-full overflow-hidden ring-2 ring-white/10 relative">
            {avatar_url ? (
              <Image
                src={avatar_url}
                alt={name}
                fill
                className="object-cover"
                unoptimized
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full bg-white/5" />
            )}
          </div>
          <h1 className="text-2xl font-semibold">{name}</h1>
          {company && <p className="text-sm opacity-80">{company}</p>}
          {headline && <p className="text-sm opacity-80">{headline}</p>}
        </div>

        <div className="mt-6 space-y-3">
          {links.map((l, i) => (
            <a
              key={i}
              href={l.href}
              onClick={() => trackAction(l.action)}
              className="block w-full text-center rounded-xl py-3 font-medium"
              style={{ background: theme.accent, color: '#0b0f19' }}
              target="_blank"
              rel="noreferrer"
            >
              {l.label}
            </a>
          ))}
          <a
            className="block w-full text-center rounded-xl py-3 font-medium border"
            style={{ borderColor: theme.text }}
            href={`/api/vcard/${typeof window==='undefined'?'':window.location.pathname.split('/').pop()}`}
          >
            Download vCard
          </a>
        </div>

        <p className="text-xs opacity-60 mt-6">Powered by Trafika</p>
      </div>
    </div>
  );
}
