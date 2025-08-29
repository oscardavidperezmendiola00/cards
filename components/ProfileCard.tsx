import Image from 'next/image';
type Link = { label: string; href: string; action?: string };
type Theme = { primary: string; accent: string; bg: string; text: string };

export default function ProfileCard({
  name, headline, avatar_url, company, links, theme
}: {
  name: string; headline?: string; avatar_url?: string; company?: string;
  links: Link[]; theme: Theme;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6"
         style={{ background: theme.bg, color: theme.text }}>
      <div className="w-full max-w-md rounded-2xl p-6 shadow-xl"
           style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)'}}>
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-28 h-28 rounded-full overflow-hidden ring-2 ring-white/10">
            {avatar_url ? <Image src={avatar_url} alt={name} width={112} height={112} /> : <div className="w-full h-full bg-white/5" />}
          </div>
          <h1 className="text-2xl font-semibold">{name}</h1>
          {company && <p className="text-sm opacity-80">{company}</p>}
          {headline && <p className="text-sm opacity-80">{headline}</p>}
        </div>

        <div className="mt-6 space-y-3">
          {links.map((l, i) => (
            <a key={i} href={l.href}
               onClick={() => l.action && navigator.sendBeacon('/api/track', JSON.stringify({
                 action: l.action,
                 slug: typeof window!=='undefined'?window.location.pathname.split('/').pop():undefined,
                 ref: document.referrer
               }))}
               className="block w-full text-center rounded-xl py-3 font-medium"
               style={{ background: theme.accent, color: '#0b0f19' }}>
              {l.label}
            </a>
          ))}
          <a className="block w-full text-center rounded-xl py-3 font-medium border"
             style={{ borderColor: theme.text }}
             href={`/api/vcard/${typeof window==='undefined'?'':window.location.pathname.split('/').pop()}`}>
            Download vCard
          </a>
        </div>

        <p className="text-xs opacity-60 mt-6">Powered by tu-marca</p>
      </div>
    </div>
  );
}
