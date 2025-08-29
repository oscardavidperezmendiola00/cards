import type { GetServerSideProps } from 'next';
import ProfileCard from '@/components/ProfileCard';
import { supabaseAdmin } from '@/lib/db';

type Theme = { primary: string; accent: string; bg: string; text: string };
type Socials = { site?: string } | null;

type Profile = {
  slug: string;
  name: string;
  headline?: string;
  company?: string;
  avatar_url?: string;
  whatsapp?: string;
  email?: string;
  phone?: string;
  socials_json?: Socials;
  theme?: Theme;
};

type Link = { label: string; href: string; action?: string };

export default function Perfil({ profile }: { profile: Profile | null }) {
  if (!profile) return <div style={{ padding: 20 }}>Perfil no encontrado</div>;

  const theme: Theme =
    profile.theme ?? { primary: '#111827', accent: '#10b981', bg: '#0b0f19', text: '#e5e7eb' };

  const linksRaw: Array<Link | null> = [
    profile.whatsapp
      ? { label: 'WhatsApp', href: `https://wa.me/${profile.whatsapp}`, action: 'btn:whatsapp' }
      : null,
    profile.email ? { label: 'Email', href: `mailto:${profile.email}`, action: 'btn:email' } : null,
    profile.phone ? { label: 'Llamar', href: `tel:${profile.phone}`, action: 'btn:phone' } : null,
    profile.socials_json?.site
      ? { label: 'Sitio Web', href: profile.socials_json.site, action: 'btn:site' }
      : null,
  ];

  // Type guard para filtrar nulos sin usar "any"
  const links: Link[] = linksRaw.filter((l): l is Link => l !== null);

  return (
    <ProfileCard
      name={profile.name}
      headline={profile.headline}
      avatar_url={profile.avatar_url}
      company={profile.company}
      links={links}
      theme={theme}
    />
  );
}

export const getServerSideProps: GetServerSideProps<{ profile: Profile | null }> = async (ctx) => {
  const slug = ctx.params?.slug as string;

  // Cargar perfil por slug
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('slug', slug)
    .single<Profile>();

  // Tracking "view" (no bloquea el render)
  try {
    // Tomamos protocolo de header (Vercel lo envía); en local usamos http
    const xfProto = ctx.req.headers['x-forwarded-proto'];
    const proto = Array.isArray(xfProto) ? xfProto[0] : xfProto || 'http';
    const host = ctx.req.headers.host || 'localhost:3000';
    const origin = `${proto}://${host}`;

    // fire-and-forget
    fetch(`${origin}/api/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug,
        action: 'view',
        ref: ctx.req.headers.referer || null,
        ua: ctx.req.headers['user-agent'] || null,
      }),
    }).catch(() => {});
  } catch {
    // noop
  }

  if (error || !data) return { props: { profile: null } };
  return { props: { profile: data } };
};
