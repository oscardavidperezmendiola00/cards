// components/card/templates.ts
import { TinyColor } from '@ctrl/tinycolor';
import type { Side, ImageLayer, TextLayer, QrLayer } from './state';

// Capas insertables sin 'id'
type InsertableLayer =
  | Omit<ImageLayer, 'id'>
  | Omit<TextLayer, 'id'>
  | Omit<QrLayer, 'id'>;

export type Template = {
  id: string;
  name: string;
  previewSvg: (brand: string, w: number, h: number) => string;
  apply: (opts: {
    side: Side;
    slug: string;
    addLayer: (l: InsertableLayer) => void;
    W: number;
    H: number;
  }) => void;
};

function svgUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/* ----------------------- PLANTILLAS ----------------------- */

export const templates: Template[] = [
  // 1) Minimal Pro
  {
    id: 'minimal-pro',
    name: 'Minimal Pro',
    previewSvg: (_brand, w, h) => {
      const pad = 14;
      return `
        <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
          <defs>
            <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="rgba(0,0,0,0.45)"/>
            </filter>
          </defs>
          <rect x="0" y="0" width="${w}" height="${h}" fill="#0b0f19"/>
          <rect x="${pad}" y="${pad}" width="${w-2*pad}" height="${h-2*pad}"
                rx="12" ry="12" fill="#111827" stroke="rgba(255,255,255,.08)" filter="url(#s)"/>
          <text x="${pad*2}" y="${h/2-6}" font-family="Poppins" font-weight="700"
                font-size="18" fill="#fff">Nombre Apellido</text>
          <text x="${pad*2}" y="${h/2+18}" font-family="Inter" font-size="12" fill="#cbd5e1">Cargo • Empresa</text>
        </svg>
      `;
    },
    apply: ({ side, slug, addLayer, W, H }) => {
      const pad = 20;

      const bg: Omit<ImageLayer,'id'> = {
        type: 'image', side,
        src: svgUrl(`
          <svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}'>
            <rect x='0' y='0' width='${W}' height='${H}' fill='#0b0f19'/>
            <rect x='${pad}' y='${pad}' width='${W-2*pad}' height='${H-2*pad}' rx='12' ry='12'
                  fill='#111827' stroke='rgba(255,255,255,.08)'/>
          </svg>
        `),
        x:0, y:0, w:W, h:H, rotation:0, visible:true
      };

      const title: Omit<TextLayer,'id'> = {
        type:'text', side, text:'Nombre Apellido',
        x: pad*2, y: H/2 - 10, w: W - pad*3, h: 48,
        fontFamily:'Poppins', fontSize:28, fontStyle:'bold',
        fill:'#ffffff', align:'left', rotation:0, visible:true
      };

      const sub: Omit<TextLayer,'id'> = {
        type:'text', side, text:'Cargo • Empresa',
        x: pad*2, y: H/2 + 26, w: W - pad*3, h: 40,
        fontFamily:'Inter', fontSize:18,
        fill:'#cbd5e1', align:'left', rotation:0, visible:true
      };

      const qr: Omit<QrLayer,'id'> = {
        type:'qr', side, value:`${window.location.origin}/p/${slug}`,
        x: W - 20 - 92, y: H - 20 - 92, w: 92, h: 92,
        rotation:0, visible:true, fg:'#0b0f19', bg:'#ffffff'
      };

      addLayer(bg); addLayer(title); addLayer(sub); addLayer(qr);
    },
  },

  // 2) Split diagonal
  {
    id: 'diagonal-split',
    name: 'Split diagonal',
    previewSvg: (brand, w, h) => {
      const b = new TinyColor(brand);
      const c1 = b.clone().brighten(8).toHexString();
      const c2 = b.clone().darken(18).toHexString();
      return `
        <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="${c1}"/>
              <stop offset="1" stop-color="${c2}"/>
            </linearGradient>
          </defs>
          <rect width="${w}" height="${h}" fill="#0b0f19"/>
          <path d="M0,${h*0.65} L${w},${h*0.35} L${w},${h} L0,${h} Z" fill="url(#g)"/>
          <text x="20" y="${h/2}" font-family="Poppins" font-size="18" fill="#fff" font-weight="700">Nombre</text>
        </svg>
      `;
    },
    apply: ({ side, slug, addLayer, W, H }) => {
      const b = new TinyColor('#00E5A0');
      const c1 = b.clone().brighten(8).toHexString();
      const c2 = b.clone().darken(18).toHexString();

      const bg: Omit<ImageLayer,'id'> = {
        type:'image', side,
        src: svgUrl(`
          <svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}'>
            <defs>
              <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
                <stop offset='0' stop-color='${c1}'/>
                <stop offset='1' stop-color='${c2}'/>
              </linearGradient>
            </defs>
            <rect width='${W}' height='${H}' fill='#0b0f19'/>
            <path d='M0,${H*0.65} L${W},${H*0.35} L${W},${H} L0,${H} Z' fill='url(#g)'/>
          </svg>
        `),
        x:0,y:0,w:W,h:H,rotation:0,visible:true
      };

      const name: Omit<TextLayer,'id'> = {
        type:'text', side, text:'Nombre Apellido',
        x: 24, y: H/2 - 16, w: W - 48, h: 52,
        fontFamily:'Poppins', fontSize:30, fontStyle:'bold',
        fill:'#ffffff', align:'left', rotation:0, visible:true
      };

      const handle: Omit<TextLayer,'id'> = {
        type:'text', side, text:'@usuario • empresa.com',
        x: 24, y: H/2 + 22, w: W - 48, h: 40,
        fontFamily:'Inter', fontSize:16, fill:'#e5e7eb',
        align:'left', rotation:0, visible:true
      };

      const qr: Omit<QrLayer,'id'> = {
        type:'qr', side, value:`${window.location.origin}/p/${slug}`,
        x: W - 24 - 96, y: 24, w: 96, h: 96,
        rotation:0, visible:true, fg:'#0b0f19', bg:'#ffffff'
      };

      addLayer(bg); addLayer(name); addLayer(handle); addLayer(qr);
    },
  },

  // 3) Vidrio + ondas
  {
    id: 'waves-glass',
    name: 'Vidrio + ondas',
    previewSvg: (brand, w, h) => {
      const b = new TinyColor(brand).setAlpha(0.8);
      const glass = 'rgba(255,255,255,0.12)';
      return `
        <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
          <rect width="${w}" height="${h}" fill="#0b0f19"/>
          <path d="M0 ${h*0.7} C ${w*0.25} ${h*0.6}, ${w*0.75} ${h*0.85}, ${w} ${h*0.7} L ${w} ${h} L 0 ${h} Z"
                fill="${b.toRgbString()}"/>
          <rect x="${w*0.08}" y="${h*0.18}" rx="12" width="${w*0.6}" height="${h*0.28}" fill="${glass}" />
        </svg>
      `;
    },
    apply: ({ side, slug, addLayer, W, H }) => {
      const brand = new TinyColor('#00E5A0').setAlpha(0.85).toRgbString();
      const glass = 'rgba(255,255,255,0.12)';

      const bg: Omit<ImageLayer,'id'> = {
        type: 'image', side,
        src: svgUrl(`
          <svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}'>
            <rect width='${W}' height='${H}' fill='#0b0f19'/>
            <path d='M0 ${H*0.7} C ${W*0.25} ${H*0.6}, ${W*0.75} ${H*0.85}, ${W} ${H*0.7} L ${W} ${H} L 0 ${H} Z'
                  fill='${brand}'/>
            <rect x='${W*0.08}' y='${H*0.18}' rx='12' width='${W*0.6}' height='${H*0.28}' fill='${glass}' />
          </svg>
        `),
        x:0,y:0,w:W,h:H,rotation:0,visible:true
      };

      const name: Omit<TextLayer,'id'> = {
        type:'text', side, text:'Nombre Apellido',
        x: W*0.1, y: H*0.22, w: W*0.52, h: 48,
        fontFamily:'Poppins', fontSize:26, fontStyle:'bold',
        fill:'#ffffff', align:'left', rotation:0, visible:true
      };

      const role: Omit<TextLayer,'id'> = {
        type:'text', side, text:'Cargo • Empresa',
        x: W*0.1, y: H*0.22 + 34, w: W*0.52, h: 36,
        fontFamily:'Inter', fontSize:16, fill:'#e5e7eb',
        align:'left', rotation:0, visible:true
      };

      const qr: Omit<QrLayer,'id'> = {
        type:'qr', side, value:`${window.location.origin}/p/${slug}`,
        x: W - 24 - 96, y: H - 24 - 96, w: 96, h: 96,
        rotation:0, visible:true, fg:'#0b0f19', bg:'#ffffff'
      };

      addLayer(bg); addLayer(name); addLayer(role); addLayer(qr);
    },
  },

  // 4) Esquina acento
  {
    id: 'corner-accent',
    name: 'Esquina acento',
    previewSvg: (brand, w, h) => {
      const c = new TinyColor(brand).darken(10).toHexString();
      return `
        <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
          <rect width="${w}" height="${h}" fill="#0b0f19"/>
          <path d="M${w} 0 L ${w} ${h*0.36} L ${w*0.64} 0 Z" fill="${c}"/>
          <text x="${w*0.08}" y="${h*0.5}" font-family="Poppins" font-size="18" fill="#fff" font-weight="700">Nombre</text>
        </svg>
      `;
    },
    apply: ({ side, slug, addLayer, W, H }) => {
      const c = new TinyColor('#00E5A0').darken(10).toHexString();

      const bg: Omit<ImageLayer,'id'> = {
        type:'image', side,
        src: svgUrl(`
          <svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}'>
            <rect width='${W}' height='${H}' fill='#0b0f19'/>
            <path d='M${W} 0 L ${W} ${H*0.36} L ${W*0.64} 0 Z' fill='${c}'/>
          </svg>
        `),
        x:0,y:0,w:W,h:H,rotation:0,visible:true
      };

      const name: Omit<TextLayer,'id'> = {
        type:'text', side, text:'Nombre Apellido',
        x: 24, y: H/2 - 14, w: W*0.56, h: 54,
        fontFamily:'Poppins', fontSize:30, fontStyle:'bold',
        fill:'#ffffff', align:'left', rotation:0, visible:true
      };

      const qr: Omit<QrLayer,'id'> = {
        type:'qr', side, value:`${window.location.origin}/p/${slug}`,
        x: 24, y: H - 24 - 92, w: 92, h: 92,
        rotation:0, visible:true, fg:'#0b0f19', bg:'#ffffff'
      };

      const handle: Omit<TextLayer,'id'> = {
        type:'text', side, text:'@usuario',
        x: 24 + 100, y: H - 24 - 24, w: W*0.6, h: 24,
        fontFamily:'Inter', fontSize:16, fill:'#e5e7eb',
        align:'left', rotation:0, visible:true
      };

      addLayer(bg); addLayer(name); addLayer(qr); addLayer(handle);
    },
  },
];

/* --------------------- Thumbnails helper --------------------- */

export function templateThumb(t: Template, brand: string, W: number, H: number) {
  return svgUrl(t.previewSvg(brand, W, H));
}
