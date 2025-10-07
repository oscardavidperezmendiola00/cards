// components/card/AdvancedCardDesigner.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Stage,
  Layer as KLayer,
  Rect,
  Image as KImage,
  Text as KText,
  Group,
  Transformer,
  Line,
} from 'react-konva';
import type Konva from 'konva';
import {
  useEditor,
  type Layer,
  type Side,
  type ImageLayer,
  type TextLayer,
  type QrLayer,
} from './state';
import { TinyColor } from '@ctrl/tinycolor';
import QRCode from 'qrcode';
import { templates, templateThumb } from './templates';
import Image from 'next/image';

/* ===================== Constantes / helpers ===================== */

type Insertable =
  | Omit<ImageLayer, 'id'>
  | Omit<TextLayer, 'id'>
  | Omit<QrLayer, 'id'>;

const MM_TO_PX = 11.811;
const SIZE = { wmm: 85.5, hmm: 54, bleed: 3, safe: 2 };
const CANVAS = {
  w: Math.round(SIZE.wmm * MM_TO_PX),
  h: Math.round(SIZE.hmm * MM_TO_PX),
};
const SAFE = Math.round(SIZE.safe * MM_TO_PX);

const DOCK_H_OPEN = 280;     // alto aproximado del dock expandido
const DOCK_H_CLOSED = 56;    // alto del dock colapsado
const HEADER_H_GUESS = 86;   // alto de la barra superior + márgenes (estimado)

const isImage = (l: Layer): l is ImageLayer => l.type === 'image';
const isText  = (l: Layer): l is TextLayer  => l.type === 'text';
const isQr    = (l: Layer): l is QrLayer    => l.type === 'qr';

/** Carga una imagen HTML y la devuelve lista para usar en Konva */
function useHtmlImage(src?: string): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) {
      setImg(null);
      return;
    }
    const el = new window.Image();
    el.crossOrigin = 'anonymous';

    const onLoad = () => setImg(el);
    el.addEventListener('load', onLoad);
    el.src = src;

    return () => {
      el.removeEventListener('load', onLoad);
    };
  }, [src]);

  return img;
}

/** Genera un dataURL de un QR como <img> listo para Konva */
function useQrImage(value: string, fg = '#000', bg = '#fff'): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const dataUrl = await QRCode.toDataURL(value || ' ', {
          errorCorrectionLevel: 'M',
          margin: 0,
          color: { dark: fg, light: bg },
          scale: 8,
        });
        if (!mounted) return;

        const el = new window.Image();
        const onLoad = () => mounted && setImg(el);
        el.addEventListener('load', onLoad);
        el.src = dataUrl;

        // cleanup del listener
        return () => el.removeEventListener('load', onLoad);
      } catch {
        setImg(null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [value, fg, bg]);

  return img;
}

/* ========================= Componente principal ========================= */

type Props = {
  slug: string;
  pin?: string;
  initialFront?: string | null;
  initialBack?: string | null;
  onSaved?: (payload: { front_url?: string; back_url?: string; preview_url?: string }) => void;
};

export default function AdvancedCardDesigner({
  slug,
  pin = '',
  initialFront,
  initialBack,
  onSaved,
}: Props) {
  const stageRef = useRef<Konva.Stage | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  // UI local
  const [scale, setScale] = useState(1);
  const [fitScale, setFitScale] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [brand, setBrand] = useState('#00E5A0');

  const [showFrame, setShowFrame] = useState(true); // borde de tarjeta
  const [showSafe, setShowSafe]   = useState(false); // área segura

  const [guideX, setGuideX] = useState<number | null>(null);
  const [guideY, setGuideY] = useState<number | null>(null);

  // Dock inferior
  const [dockOpen, setDockOpen] = useState(true);
  const [dockTab, setDockTab] = useState<'plantillas' | 'capas' | 'anadir'>('plantillas');

  const {
    side, setSide,
    layers, selectedId, select,
    addLayer, updateLayer, removeLayer,
    bringToFront, sendToBack,
    undo, redo
  } = useEditor();

  /* ---------- Escala que nunca desborda ---------- */
  const MIN_SCALE = 0.35;
  const MAX_SCALE = Math.min(fitScale * 1.05, 1.25);

  function computeFitScale(): number {
    const host = viewportRef.current;
    if (!host) return 1;

    const pad = 24;
    const box = host.getBoundingClientRect();

    const usableW = Math.max(360, box.width - pad * 2);

    // alto útil: desde top hasta el dock, restando header estimado
    const dockH = dockOpen ? DOCK_H_OPEN : DOCK_H_CLOSED;
    const usableH = Math.max(
      260,
      window.innerHeight - box.top - dockH - pad - HEADER_H_GUESS
    );

    const fitW = usableW / CANVAS.w;
    const fitH = usableH / CANVAS.h;

    return Math.max(MIN_SCALE, Math.min(fitW, fitH));
  }

  useEffect(() => {
    const recalc = () => {
      const f = computeFitScale();
      setFitScale(f);
      setScale(prev => Math.max(MIN_SCALE, Math.min(Math.min(f * 1.05, 1.25), prev)));
    };
    recalc();
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dockOpen]);

  /* ---------- Precarga de fondos existentes ---------- */
  useEffect(() => {
    if (initialFront) {
      addLayer({
        type: 'image', side: 'front', src: initialFront,
        x: 0, y: 0, w: CANVAS.w, h: CANVAS.h, rotation: 0, visible: true,
      } as Insertable);
    }
    if (initialBack) {
      addLayer({
        type: 'image', side: 'back', src: initialBack,
        x: 0, y: 0, w: CANVAS.w, h: CANVAS.h, rotation: 0, visible: true,
      } as Insertable);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFront, initialBack]);

  const activeLayers = useMemo(() => layers.filter(l => l.side === side && l.visible), [layers, side]);
  const selected = useMemo(() => layers.find(l => l.id === selectedId), [layers, selectedId]);

  // Atajos
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (e.metaKey || e.ctrlKey) {
        if (key === 'z') { e.preventDefault(); undo(); }
        if (key === 'y') { e.preventDefault(); redo(); }
      }
      if (e.key === 'Delete' && selectedId) removeLayer(selectedId);
      if (e.key === 'Escape') select(undefined);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, select, removeLayer, undo, redo]);

  /* ---------- Inserción rápida ---------- */
  function addText() {
    addLayer({
      type: 'text', side,
      text: 'Nombre Apellido',
      x: 36, y: CANVAS.h/2 - 8, w: 420, h: 50,
      fontFamily: 'Poppins', fontSize: 30, fontStyle: 'bold',
      fill: '#ffffff', align: 'left', rotation: 0, visible: true,
    } as Insertable);
  }
  function addRole() {
    addLayer({
      type: 'text', side,
      text: 'Cargo / Empresa',
      x: 36, y: CANVAS.h/2 + 30, w: 420, h: 40,
      fontFamily: 'Inter', fontSize: 18,
      fill: '#cbd5e1', align: 'left', rotation: 0, visible: true,
    } as Insertable);
  }
  function addQr() {
    addLayer({
      type: 'qr', side,
      value: `${window.location.origin}/p/${slug}`,
      x: CANVAS.w - 120, y: CANVAS.h - 120, w: 96, h: 96,
      rotation: 0, visible: true, fg: '#000000', bg: '#ffffff',
    } as Insertable);
  }

  /* ---------- Upload de fondo ---------- */
  async function handleUpload(sideSel: Side, file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('slug', slug);
      fd.append('pin', pin);
      fd.append('side', sideSel);
      fd.append('file', file);
      const r = await fetch('/api/client/card/upload', { method: 'POST', body: fd });
      const j: { ok: boolean; url?: string; error?: string } = await r.json();
      if (!j.ok || !j.url) throw new Error(j.error || 'upload failed');

      const bg = layers.find(
        (l) => l.side === sideSel && isImage(l) && l.x === 0 && l.y === 0 && l.w === CANVAS.w && l.h === CANVAS.h
      );
      if (bg && isImage(bg)) updateLayer(bg.id, { src: j.url });
      else addLayer({ type:'image', side: sideSel, src: j.url, x:0,y:0,w:CANVAS.w,h:CANVAS.h, rotation:0, visible:true } as Insertable);
    } finally {
      setUploading(false);
    }
  }

  /* ---------- Plantillas (reemplazar lado) ---------- */
  function clearSideLayers(sideToClear: Side) {
    const s = useEditor.getState();
    s.layers.filter(l => l.side === sideToClear).forEach(l => s.removeLayer(l.id));
  }
  function applyTemplateReplacing(tmplId: string) {
    const tmpl = templates.find(x => x.id === tmplId);
    if (!tmpl) return;
    clearSideLayers(side);
    tmpl.apply({ side, slug, addLayer, W: CANVAS.w, H: CANVAS.h });
  }

  /* ---------- Guardado ---------- */
  async function saveDesign() {
    const dataUrl = stageRef.current?.toDataURL({ pixelRatio: 2 }) ?? null;
    const front = layers.find((l) => l.side === 'front' && isImage(l) && l.x === 0 && l.y === 0);
    const back  = layers.find((l) => l.side === 'back'  && isImage(l) && l.x === 0 && l.y === 0);

    const body = {
      slug, pin,
      front_url: front && isImage(front) ? front.src : null,
      back_url:  back  && isImage(back)  ? back.src  : null,
      title: 'Diseño principal',
      specs: { size_mm: { w: SIZE.wmm, h: SIZE.hmm }, bleed_mm: SIZE.bleed, safe_mm: SIZE.safe, dpi: 300 },
      preview_url: dataUrl,
    };

    const r = await fetch('/api/client/card/design', {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)
    });
    const j: { ok: boolean; error?: string } = await r.json();
    if (!j.ok) throw new Error(j.error || 'save failed');
    onSaved?.({ front_url: body.front_url ?? undefined, back_url: body.back_url ?? undefined, preview_url: dataUrl ?? undefined });
  }

  /* ---------- Snapping con guías ---------- */
  const SNAP = 6;
  const targetsX = [0, SAFE, CANVAS.w / 2, CANVAS.w - SAFE, CANVAS.w];
  const targetsY = [0, SAFE, CANVAS.h / 2, CANVAS.h - SAFE, CANVAS.h];

  function near(v: number, t: number) { return Math.abs(v - t) <= SNAP; }
  function snapPoint(x: number, y: number, w: number, h: number) {
    const cx = x + w / 2, cy = y + h / 2;
    let nx = x, ny = y, gx: number | null = null, gy: number | null = null;
    for (const t of targetsX) {
      if (near(x, t))       { nx = t;     gx = t; }
      if (near(x + w, t))   { nx = t - w; gx = t; }
      if (near(cx, t))      { nx = t - w / 2; gx = t; }
    }
    for (const t of targetsY) {
      if (near(y, t))       { ny = t;     gy = t; }
      if (near(y + h, t))   { ny = t - h; gy = t; }
      if (near(cy, t))      { ny = t - h / 2; gy = t; }
    }
    return { x: nx, y: ny, gx, gy };
  }

  // Helpers zoom UI
  const zoomPct = Math.round(scale * 100);
  const minPct = Math.round(MIN_SCALE * 100);
  const maxPct = Math.round(MAX_SCALE * 100);
  const zoomTo  = (pct: number) => setScale(Math.max(MIN_SCALE, Math.min(MAX_SCALE, pct / 100)));
  const zoomFit = () => setScale(fitScale);

  /* ============================ Render ============================ */

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-white/10 bg-slate-900/40">
        <div className="flex items-center gap-2">
          <button
            className={`px-3 py-1 rounded ${side === 'front' ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800'}`}
            onClick={() => setSide('front')}
          >
            Parte delantera
          </button>
          <button
            className={`px-3 py-1 rounded ${side === 'back' ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800'}`}
            onClick={() => setSide('back')}
          >
            Parte trasera
          </button>

          {/* Undo/Redo */}
          <div className="ml-2 flex gap-2">
            <button className="px-3 py-1 rounded bg-slate-800" onClick={undo} title="Deshacer (⌘/Ctrl+Z)">Deshacer</button>
            <button className="px-3 py-1 rounded bg-slate-800" onClick={redo} title="Rehacer (⌘/Ctrl+Y)">Rehacer</button>
          </div>

          {/* toggles de guías */}
          <label className="ml-3 flex items-center gap-2 text-xs opacity-80">
            <input type="checkbox" checked={showFrame} onChange={(e) => setShowFrame(e.currentTarget.checked)} />
            Guía de borde
          </label>
          <label className="ml-2 flex items-center gap-2 text-xs opacity-80">
            <input type="checkbox" checked={showSafe} onChange={(e) => setShowSafe(e.currentTarget.checked)} />
            Área segura
          </label>
        </div>

        <div className="flex items-center gap-2">
          <label className="px-3 py-1 rounded bg-slate-800 cursor-pointer">
            {uploading ? 'Subiendo…' : 'Fondo (subir)'}
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.currentTarget.files?.[0]; if (f) void handleUpload(side, f); }} />
          </label>
          <button className="px-3 py-1 rounded bg-emerald-500 text-slate-900" onClick={() => void saveDesign()}>
            Guardar
          </button>
        </div>
      </div>

      {/* Viewport: asegura que el Stage no se salga al hacer zoom */}
      <div className="relative px-6 pt-6 pb-2">
        <div
          ref={viewportRef}
          className="relative mx-auto flex items-center justify-center rounded-2xl border border-white/10 bg-slate-950/70 overflow-hidden"
          style={{ maxWidth: 1000, minHeight: CANVAS.h * 0.6 }}
        >
          <Stage
            ref={stageRef}
            width={CANVAS.w * scale}
            height={CANVAS.h * scale}
            scaleX={scale}
            scaleY={scale}
            className="rounded"
            style={{ background: '#0b0f19', display: 'block', boxShadow: '0 30px 90px rgba(0,0,0,.35)' }}
            onMouseDown={(e) => {
              const stage = e.target.getStage();
              if (stage && e.target === stage) {
                useEditor.getState().select(undefined);
                setGuideX(null);
                setGuideY(null);
              }
            }}
          >
            <KLayer>
              {/* Borde de tarjeta minimalista */}
              {showFrame && (
                <Group listening={false}>
                  <Rect
                    x={0} y={0} width={CANVAS.w} height={CANVAS.h}
                    cornerRadius={Math.round(3 * MM_TO_PX)}
                    stroke="rgba(255,255,255,.28)" strokeWidth={2}
                  />
                </Group>
              )}

              {/* Área segura opcional */}
              {showSafe && (
                <Rect
                  x={SAFE} y={SAFE}
                  width={CANVAS.w - 2 * SAFE} height={CANVAS.h - 2 * SAFE}
                  stroke="rgba(56,189,248,.8)" strokeWidth={1.5} dash={[8, 6]}
                />
              )}

              {/* Capas */}
              {activeLayers.map((l) => (
                <LayerNode
                  key={l.id}
                  layer={l}
                  onDragMoveSnap={(x, y, w, h) => {
                    const { x: sx, y: sy, gx, gy } = snapPoint(x, y, w, h);
                    setGuideX(gx);
                    setGuideY(gy);
                    return { x: sx, y: sy };
                  }}
                  onDragEndClearGuides={() => { setGuideX(null); setGuideY(null); }}
                />
              ))}

              {/* Guías de snapping */}
              {guideX !== null && (
                <Line points={[guideX, 0, guideX, CANVAS.h]} stroke="rgba(16,185,129,.85)" strokeWidth={1.5} dash={[6, 4]} listening={false} />
              )}
              {guideY !== null && (
                <Line points={[0, guideY, CANVAS.w, guideY]} stroke="rgba(16,185,129,.85)" strokeWidth={1.5} dash={[6, 4]} listening={false} />
              )}
            </KLayer>
          </Stage>

          {/* Zoom control (siempre dentro del viewport) */}
          <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-xl bg-slate-800/90 px-3 py-2 shadow-xl">
            <button
              className="px-2 py-1 rounded bg-slate-700 disabled:opacity-40"
              onClick={() => zoomTo(zoomPct - 10)}
              disabled={zoomPct <= minPct}
            >
              -
            </button>
            <input
              type="range"
              min={minPct}
              max={maxPct}
              value={zoomPct}
              onChange={(e) => zoomTo(Number(e.currentTarget.value))}
              style={{ width: 140 }}
            />
            <button
              className="px-2 py-1 rounded bg-slate-700 disabled:opacity-40"
              onClick={() => zoomTo(zoomPct + 10)}
              disabled={zoomPct >= maxPct}
            >
              +
            </button>
            <button className="ml-2 px-2 py-1 rounded bg-emerald-500 text-slate-900 text-xs" onClick={zoomFit}>
              Ajustar
            </button>
            <span className="text-xs opacity-80 w-10 text-right">{zoomPct}%</span>
          </div>
        </div>
      </div>

      {/* Dock inferior tipo Tapni */}
      <div className={`fixed left-0 right-0 bottom-0 z-40 transition-transform ${dockOpen ? 'translate-y-0' : 'translate-y-[calc(100%-48px)]'}`}>
        <div className="mx-auto max-w-7xl">
          {/* Tab bar */}
          <div className="mx-4 rounded-t-xl bg-slate-900/80 border-x border-t border-white/10 backdrop-blur">
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex gap-2">
                {(['plantillas','capas','anadir'] as const).map((tab) => (
                  <button
                    key={tab}
                    className={`px-3 py-1 rounded ${dockTab === tab ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800'}`}
                    onClick={() => setDockTab(tab)}
                  >
                    {tab === 'plantillas' ? 'Plantillas' : tab === 'capas' ? 'Capas' : 'Añadir'}
                  </button>
                ))}
              </div>
              <button
                className="px-3 py-1 rounded bg-slate-800"
                title={dockOpen ? 'Minimizar' : 'Expandir'}
                onClick={() => setDockOpen((v) => !v)}
              >
                {dockOpen ? '↓' : '↑'}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="mx-4 rounded-b-xl bg-slate-900/80 border-x border-b border-white/10 backdrop-blur">
            <div className="p-4">
              {dockTab === 'plantillas' && (
                <div className="space-y-4">
                  {/* Color de marca */}
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={brand}
                      onChange={(e) => setBrand(new TinyColor(e.currentTarget.value).toHexString())}
                    />
                    <input
                      className="w-48 p-2 rounded bg-slate-900 border border-slate-700"
                      value={brand}
                      onChange={(e) => setBrand(new TinyColor(e.currentTarget.value).toHexString())}
                    />
                    <span className="text-sm opacity-70">Reemplazan el lado</span>
                  </div>

                  {/* Thumbs (con next/image para evitar el warning) */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {templates.map((t) => {
                      const thumb = templateThumb(t, brand, 360, 220);
                      return (
                        <div key={t.id} className="rounded-lg overflow-hidden border border-white/10 bg-slate-900/60 hover:border-emerald-500/60 transition">
                          <Image
                            src={thumb}
                            alt={t.name}
                            width={360}
                            height={220}
                            unoptimized
                            className="w-full h-28 object-cover"
                          />
                          <div className="flex items-center justify-between p-2">
                            <div className="text-sm">{t.name}</div>
                            <button className="text-xs px-2 py-1 rounded bg-emerald-500 text-slate-900" onClick={() => applyTemplateReplacing(t.id)}>
                              Usar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {dockTab === 'capas' && (
                <div className="space-y-2">
                  {activeLayers.length === 0 && <p className="text-sm opacity-70">No hay capas en este lado.</p>}
                  {activeLayers.map((l) => (
                    <div
                      key={l.id}
                      className={`flex items-center justify-between rounded border border-white/10 px-2 py-1 ${selectedId === l.id ? 'bg-white/5' : ''}`}
                    >
                      <button className="text-left truncate" onClick={() => select(l.id)}>
                        {l.type === 'image' ? 'Imagen' : l.type === 'text' ? 'Texto' : 'QR'} · {l.id.slice(0, 6)}
                      </button>
                      <div className="flex gap-2">
                        <button className="text-xs px-2 py-0.5 rounded bg-slate-800" onClick={() => bringToFront(l.id)}>Front</button>
                        <button className="text-xs px-2 py-0.5 rounded bg-slate-800" onClick={() => sendToBack(l.id)}>Back</button>
                        <button className="text-xs px-2 py-0.5 rounded bg-rose-600" onClick={() => removeLayer(l.id)}>Del</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {dockTab === 'anadir' && (
                <div className="flex flex-wrap gap-2">
                  <button className="px-3 py-1 rounded bg-slate-800" onClick={addText}>Texto (Nombre)</button>
                  <button className="px-3 py-1 rounded bg-slate-800" onClick={addRole}>Texto (Puesto)</button>
                  <button className="px-3 py-1 rounded bg-slate-800" onClick={addQr}>QR /p/{slug}</button>
                </div>
              )}

              {selected && (
                <div className="mt-4">
                  <Inspector selected={selected as ImageLayer | TextLayer | QrLayer} updateLayer={updateLayer} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================== Inspector tipado ================== */

function Inspector({
  selected,
  updateLayer,
}: {
  selected: ImageLayer | TextLayer | QrLayer;
  updateLayer: (id: string, patch: Partial<Layer>) => void;
}) {
  const isTextL = (l: Layer): l is TextLayer => l.type === 'text';
  const isQrL   = (l: Layer): l is QrLayer   => l.type === 'qr';
  const isImgL  = (l: Layer): l is ImageLayer => l.type === 'image';

  const w = selected.w, h = selected.h;

  return (
    <div className="rounded-xl border border-white/10 p-3 bg-slate-950">
      <h3 className="font-medium mb-3">Inspector</h3>

      {/* Alineación rápida */}
      <div className="flex flex-wrap gap-2 mb-3">
        <button className="px-2 py-1 rounded bg-slate-800 text-xs" onClick={() => updateLayer(selected.id, { x: SAFE })}>⬅ borde</button>
        <button className="px-2 py-1 rounded bg-slate-800 text-xs" onClick={() => updateLayer(selected.id, { x: CANVAS.w / 2 - w / 2 })}>↔ centro X</button>
        <button className="px-2 py-1 rounded bg-slate-800 text-xs" onClick={() => updateLayer(selected.id, { x: CANVAS.w - SAFE - w })}>➡ borde</button>
        <button className="px-2 py-1 rounded bg-slate-800 text-xs" onClick={() => updateLayer(selected.id, { y: SAFE })}>⬆ borde</button>
        <button className="px-2 py-1 rounded bg-slate-800 text-xs" onClick={() => updateLayer(selected.id, { y: CANVAS.h / 2 - h / 2 })}>↕ centro Y</button>
        <button className="px-2 py-1 rounded bg-slate-800 text-xs" onClick={() => updateLayer(selected.id, { y: CANVAS.h - SAFE - h })}>⬇ borde</button>
      </div>

      {isTextL(selected) && (
        <div className="space-y-3">
          <label className="block text-sm opacity-80">Texto</label>
          <input
            className="w-full p-2 rounded bg-slate-900 border border-slate-700"
            value={selected.text}
            onChange={(e) => updateLayer(selected.id, { text: e.currentTarget.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              className="p-2 rounded bg-slate-900 border border-slate-700"
              value={selected.fontFamily || 'Inter'}
              onChange={(e) => updateLayer(selected.id, { fontFamily: e.currentTarget.value })}
            >
              <option value="Inter">Inter</option>
              <option value="Poppins">Poppins</option>
              <option value="system-ui">System UI</option>
            </select>
            <input
              type="number" min={8} max={72}
              className="p-2 rounded bg-slate-900 border border-slate-700"
              value={selected.fontSize}
              onChange={(e) => updateLayer(selected.id, { fontSize: Math.max(8, Number(e.currentTarget.value || 12)) })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input type="color" value={selected.fill || '#ffffff'} onChange={(e) => updateLayer(selected.id, { fill: e.currentTarget.value })} />
            <div className="flex gap-1">
              {(['left','center','right'] as const).map(a => (
                <button key={a}
                  className={`px-2 py-1 rounded text-sm ${selected.align === a ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800'}`}
                  onClick={() => updateLayer(selected.id, { align: a })}>
                  {a}
                </button>
              ))}
            </div>
            <button
              className={`ml-auto px-2 py-1 rounded text-sm ${selected.fontStyle === 'bold' ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800'}`}
              onClick={() => updateLayer(selected.id, { fontStyle: selected.fontStyle === 'bold' ? undefined : 'bold' })}
            >
              Bold
            </button>
          </div>
        </div>
      )}

      {isQrL(selected) && (
        <div className="space-y-3">
          <label className="block text-sm opacity-80">URL/Texto del QR</label>
          <input
            className="w-full p-2 rounded bg-slate-900 border border-slate-700"
            value={selected.value}
            onChange={(e) => updateLayer(selected.id, { value: e.currentTarget.value })}
          />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm opacity-80">Fg</span>
              <input type="color" value={selected.fg || '#000000'} onChange={(e) => updateLayer(selected.id, { fg: e.currentTarget.value })} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm opacity-80">Bg</span>
              <input type="color" value={selected.bg || '#ffffff'} onChange={(e) => updateLayer(selected.id, { bg: e.currentTarget.value })} />
            </div>
          </div>
        </div>
      )}

      {isImgL(selected) && (
        <div className="space-y-2">
          <label className="block text-sm opacity-80">Imagen</label>
          <label className="px-3 py-1 rounded bg-slate-800 cursor-pointer inline-block">
            Reemplazar…
            <input type="file" accept="image/*" className="hidden" />
          </label>
        </div>
      )}
    </div>
  );
}

/* ================== Nodos con snapping ================== */

function LayerNode({
  layer,
  onDragMoveSnap,
  onDragEndClearGuides,
}: {
  layer: Layer;
  onDragMoveSnap: (x: number, y: number, w: number, h: number) => { x: number; y: number };
  onDragEndClearGuides: () => void;
}) {
  if (isImage(layer))
    return <ImageNode layer={layer} onDragMoveSnap={onDragMoveSnap} onDragEndClearGuides={onDragEndClearGuides} />;
  if (isText(layer))
    return <TextNode  layer={layer} onDragMoveSnap={onDragMoveSnap} onDragEndClearGuides={onDragEndClearGuides} />;
  if (isQr(layer))
    return <QrNode    layer={layer} onDragMoveSnap={onDragMoveSnap} onDragEndClearGuides={onDragEndClearGuides} />;
  return null;
}

function ImageNode({
  layer,
  onDragMoveSnap,
  onDragEndClearGuides,
}: {
  layer: ImageLayer;
  onDragMoveSnap: (x: number, y: number, w: number, h: number) => { x: number; y: number };
  onDragEndClearGuides: () => void;
}) {
  const select = useEditor((s) => s.select);
  const selectedId = useEditor((s) => s.selectedId);
  const updateLayer = useEditor((s) => s.updateLayer);
  const trRef = useRef<Konva.Transformer | null>(null);
  const shapeRef = useRef<Konva.Image | null>(null);
  const isSelected = selectedId === layer.id;
  const img = useHtmlImage(layer.src);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <KImage
        ref={shapeRef as unknown as React.RefObject<Konva.Image>}
        image={img ?? undefined}
        x={layer.x} y={layer.y}
        width={layer.w} height={layer.h}
        rotation={layer.rotation}
        onClick={() => select(layer.id)}
        draggable
        onDragMove={(e) => {
          const n = e.target;
          const pos = onDragMoveSnap(n.x(), n.y(), layer.w, layer.h);
          n.x(pos.x); n.y(pos.y);
        }}
        onDragEnd={(e) => {
          const pos = onDragMoveSnap(e.target.x(), e.target.y(), layer.w, layer.h);
          updateLayer(layer.id, { x: pos.x, y: pos.y });
          onDragEndClearGuides();
        }}
        onTransformEnd={() => {
          const node = shapeRef.current; if (!node) return;
          const sx = node.scaleX(); const sy = node.scaleY(); node.scaleX(1); node.scaleY(1);
          updateLayer(layer.id, {
            x: node.x(), y: node.y(),
            w: Math.max(10, node.width() * sx),
            h: Math.max(10, node.height() * sy),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && <Transformer ref={trRef as unknown as React.RefObject<Konva.Transformer>} rotateEnabled />}
    </>
  );
}

function TextNode({
  layer,
  onDragMoveSnap,
  onDragEndClearGuides,
}: {
  layer: TextLayer;
  onDragMoveSnap: (x: number, y: number, w: number, h: number) => { x: number; y: number };
  onDragEndClearGuides: () => void;
}) {
  const select = useEditor((s) => s.select);
  const selectedId = useEditor((s) => s.selectedId);
  const updateLayer = useEditor((s) => s.updateLayer);
  const trRef = useRef<Konva.Transformer | null>(null);
  const shapeRef = useRef<Konva.Text | null>(null);
  const isSelected = selectedId === layer.id;

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <KText
        ref={shapeRef as unknown as React.RefObject<Konva.Text>}
        text={layer.text}
        x={layer.x} y={layer.y}
        width={layer.w}
        fontSize={layer.fontSize}
        fontFamily={layer.fontFamily}
        fill={layer.fill}
        align={layer.align}
        rotation={layer.rotation}
        onDblClick={() => {
          const newTxt = prompt('Texto', layer.text) ?? layer.text;
          updateLayer(layer.id, { text: newTxt });
        }}
        onClick={() => select(layer.id)}
        draggable
        onDragMove={(e) => {
          const n = e.target;
          const pos = onDragMoveSnap(n.x(), n.y(), layer.w, layer.h);
          n.x(pos.x); n.y(pos.y);
        }}
        onDragEnd={(e) => {
          const pos = onDragMoveSnap(e.target.x(), e.target.y(), layer.w, layer.h);
          updateLayer(layer.id, { x: pos.x, y: pos.y });
          onDragEndClearGuides();
        }}
        onTransformEnd={() => {
          const node = shapeRef.current; if (!node) return;
          const sx = node.scaleX(); node.scaleX(1);
          updateLayer(layer.id, {
            x: node.x(), y: node.y(),
            w: Math.max(50, node.width() * sx),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef as unknown as React.RefObject<Konva.Transformer>}
          rotateEnabled
          enabledAnchors={['middle-left', 'middle-right']}
        />
      )}
    </>
  );
}

function QrNode({
  layer,
  onDragMoveSnap,
  onDragEndClearGuides,
}: {
  layer: QrLayer;
  onDragMoveSnap: (x: number, y: number, w: number, h: number) => { x: number; y: number };
  onDragEndClearGuides: () => void;
}) {
  const select = useEditor((s) => s.select);
  const selectedId = useEditor((s) => s.selectedId);
  const updateLayer = useEditor((s) => s.updateLayer);
  const trRef = useRef<Konva.Transformer | null>(null);
  const shapeRef = useRef<Konva.Image | null>(null);
  const isSelected = selectedId === layer.id;
  const img = useQrImage(layer.value, layer.fg, layer.bg);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <KImage
        ref={shapeRef as unknown as React.RefObject<Konva.Image>}
        image={img ?? undefined}
        x={layer.x} y={layer.y}
        width={layer.w} height={layer.h}
        rotation={layer.rotation}
        onClick={() => select(layer.id)}
        draggable
        onDragMove={(e) => {
          const n = e.target;
          const pos = onDragMoveSnap(n.x(), n.y(), layer.w, layer.h);
          n.x(pos.x); n.y(pos.y);
        }}
        onDragEnd={(e) => {
          const pos = onDragMoveSnap(e.target.x(), e.target.y(), layer.w, layer.h);
          updateLayer(layer.id, { x: pos.x, y: pos.y });
          onDragEndClearGuides();
        }}
        onTransformEnd={() => {
          const node = shapeRef.current; if (!node) return;
          const sx = node.scaleX(); const sy = node.scaleY(); node.scaleX(1); node.scaleY(1);
          updateLayer(layer.id, {
            x: node.x(), y: node.y(),
            w: Math.max(40, node.width() * sx),
            h: Math.max(40, node.height() * sy),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && <Transformer ref={trRef as unknown as React.RefObject<Konva.Transformer>} rotateEnabled />}
    </>
  );
}
