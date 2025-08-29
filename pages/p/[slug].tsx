import type { GetServerSideProps } from 'next';
import { supabaseAdmin } from '@/lib/db';
import ProfileCard from '@/components/ProfileCard';

type Profile = {
  slug: string; name: string; headline?: string; company?: string; avatar_url?: string;
  whatsapp?: string; email?: string; phone?: string; socials_json?: Record<string,string>;
  theme?: { primary: string; accent: string; bg: string; text: string };
};

export default function Perfil({ profile }: { profile: Profile | null }) {
  if (!profile) return <div style={{padding:20}}>Perfil no encontrado</div>;
  const theme = profile.theme || { primary:'#111827', accent:'#10b981', bg:'#0b0f19', text:'#e5e7eb' };
  const links = [
    profile.whatsapp ? { label:'WhatsApp', href:`https://wa.me/${profile.whatsapp}`, action:'btn:whatsapp' } : null,
    profile.email    ? { label:'Email',    href:`mailto:${profile.email}`,         action:'btn:email' }    : null,
    profile.phone    ? { label:'Llamar',   href:`tel:${profile.phone}`,            action:'btn:phone' }    : null,
    profile.socials_json?.site ? { label:'Sitio Web', href:profile.socials_json.site, action:'btn:site' } : null,
  ].filter(Boolean) as any[];
  return <ProfileCard name={profile.name} headline={profile.headline} avatar_url={profile.avatar_url}
                      company={profile.company} links={links} theme={theme} />;
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const slug = ctx.params?.slug as string;
  const { data, error } = await supabaseAdmin.from('profiles').select('*').eq('slug', slug).single();

  // tracking de view (no bloquea el render)
  try {
    const origin = `http://${ctx.req.headers.host}`;
    fetch(`${origin}/api/track`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ slug, action:'view',
        ref: ctx.req.headers.referer || null,
        ua: ctx.req.headers['user-agent'] || null })
    }).catch(()=>{});
  } catch {}

  if (error || !data) return { props: { profile: null } };
  return { props: { profile: data } };
};
