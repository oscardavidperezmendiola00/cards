// components/card/state.ts
import { create } from 'zustand';
import { nanoid } from 'nanoid';

export type LayerType = 'image' | 'text' | 'qr';
export type Side = 'front' | 'back';

export type BaseLayer = {
  id: string;
  type: LayerType;
  side: Side;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  visible: boolean;
};

export type ImageLayer = BaseLayer & {
  type: 'image';
  src: string;
};

export type TextLayer = BaseLayer & {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  fill: string;
  align: 'left' | 'center' | 'right';
  fontStyle?: 'normal' | 'bold' | 'italic';
};

export type QrLayer = BaseLayer & {
  type: 'qr';
  value: string;
  fg: string;
  bg: string;
};

export type Layer = ImageLayer | TextLayer | QrLayer;

type EditorState = {
  side: Side;
  layers: Layer[];
  selectedId?: string;
  history: Layer[][];
  future: Layer[][];
  setSide: (s: Side) => void;
  addLayer: (l: Omit<Layer, 'id'>) => void;
  updateLayer: (id: string, patch: Partial<Layer>) => void;
  removeLayer: (id: string) => void;
  select: (id?: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  snapshot: () => void;
  undo: () => void;
  redo: () => void;
  setAll: (ls: Layer[]) => void;
};

export const useEditor = create<EditorState>((set, get) => ({
  side: 'front',
  layers: [],
  history: [],
  future: [],
  setSide: (s) => set({ side: s }),
  addLayer: (l) => {
    const withId = { ...l, id: nanoid() } as Layer;
    const layers = [...get().layers, withId];
    set({ layers });
    get().snapshot();
  },
  updateLayer: (id, patch) => {
    const layers = get().layers.map((l) =>
      l.id === id ? ({ ...l, ...patch } as Layer) : l
    );
    set({ layers });
    get().snapshot();
  },
  removeLayer: (id) => {
    const layers = get().layers.filter((l) => l.id !== id);
    set({ layers, selectedId: undefined });
    get().snapshot();
  },
  select: (id) => set({ selectedId: id }),
  bringToFront: (id) => {
    const ls = [...get().layers];
    const i = ls.findIndex((l) => l.id === id);
    if (i < 0) return;
    const [l] = ls.splice(i, 1);
    ls.push(l);
    set({ layers: ls });
    get().snapshot();
  },
  sendToBack: (id) => {
    const ls = [...get().layers];
    const i = ls.findIndex((l) => l.id === id);
    if (i < 0) return;
    const [l] = ls.splice(i, 1);
    ls.unshift(l);
    set({ layers: ls });
    get().snapshot();
  },
  snapshot: () => {
    const { history, layers } = get();
    // guardamos una copia superficial de cada layer
    set({
      history: [...history, layers.map((l) => ({ ...l }))],
      future: [],
    });
  },
  undo: () => {
    const { history, layers, future } = get();
    if (!history.length) return;
    const prev = history[history.length - 1];
    set({
      layers: prev.map((l) => ({ ...l })),
      history: history.slice(0, -1),
      future: [layers, ...future],
    });
  },
  redo: () => {
    const { history, layers, future } = get();
    if (!future.length) return;
    const next = future[0];
    set({
      layers: next.map((l) => ({ ...l })),
      history: [...history, layers],
      future: future.slice(1),
    });
  },
  setAll: (ls) => set({ layers: ls }),
}));
