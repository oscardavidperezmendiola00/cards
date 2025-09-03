import { useRef, useState } from 'react';
import Image from 'next/image';
import { getSupabaseBrowser } from '@/lib/supabasePublic';

type Props = {
  value?: string | null;
  slugHint?: string;
  onUploaded: (publicUrl: string) => void;
};

export default function AvatarUploader({ value, slugHint, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const supa = getSupabaseBrowser(); // solo para uploadToSignedUrl

  async function handleFiles(files: FileList | null): Promise<void> {
    if (!files || !files[0]) return;
    const file = files[0];
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();

    setUploading(true);
    try {
      // 1) Pide URL firmada al servidor
      const r = await fetch('/api/storage/signed-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: slugHint || 'profile', ext }),
      });
      const j = (await r.json()) as { ok?: boolean; token?: string; path?: string; publicUrl?: string; error?: string };
      if (!r.ok || !j.ok || !j.token || !j.path || !j.publicUrl) {
        throw new Error(j.error || 'No se pudo firmar la subida');
      }

      // 2) Sube el archivo al Signed URL
      const { error: upErr } = await supa.storage
        .from('avatars')
        .uploadToSignedUrl(j.path, j.token, file, { upsert: false, contentType: file.type, cacheControl: '3600' });
      if (upErr) throw new Error(upErr.message);

      // 3) Listo: notifica URL pública
      onUploaded(j.publicUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo subir la imagen';
      alert(msg);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="px-3 py-2 rounded bg-emerald-600 text-slate-900 font-medium hover:brightness-95 disabled:opacity-60"
          disabled={uploading}
        >
          {uploading ? 'Subiendo…' : 'Subir imagen'}
        </button>
        {value ? <span className="text-xs opacity-75 truncate max-w-[16rem]">{value}</span> : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {value ? (
        <div className="w-24 h-24 relative rounded-full overflow-hidden border border-white/10">
          <Image src={value} alt="Avatar" fill className="object-cover" unoptimized />
        </div>
      ) : null}
    </div>
  );
}
