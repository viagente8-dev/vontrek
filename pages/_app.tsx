import type { AppProps } from 'next/app';
import Head from 'next/head';
import { AuthProvider } from '../components/AuthProvider';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Head>
        <title>VONTREK - Tu aventura comienza aquí</title>
        <meta name="description" content="VONTREK - Planifica el viaje de tu vida con IA." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
