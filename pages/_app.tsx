import "@/styles/globals.css";


// pages/_app.tsx
import type { AppProps } from 'next/app';
import AdminShortcut from '@/components/AdminShortcut'; // ajusta la ruta según tu estructura
import '@/styles/globals.css'; // si ya tienes estilos globales

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <AdminShortcut />
    </>
  );
}
