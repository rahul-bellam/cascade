import type { AppProps } from 'next/app';
import Head from 'next/head';
import '../styles/globals.css';
import { NO_FLASH_SCRIPT } from '../lib/theme';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        {/* set theme class before paint to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
