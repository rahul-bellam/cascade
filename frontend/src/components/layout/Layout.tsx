import React from 'react';
import Head from 'next/head';
import { Nav } from './Nav';

export function Layout({
  children, title = 'Cascade',
  description = 'A calm, premium portal for learning system design by building, breaking, and scaling real systems.',
  nav = true, full = false,
}: { children: React.ReactNode; title?: string; description?: string; nav?: boolean; full?: boolean }) {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <Head>
        <title>{title === 'Cascade' ? 'Cascade' : `${title} · Cascade`}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <a href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-5 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-accent-600 focus:px-3 focus:py-1.5 focus:text-white">
        Skip to content
      </a>
      {nav && <Nav />}
      <main id="main" className={full ? '' : 'mx-auto max-w-6xl px-5 py-12 sm:px-8'}>{children}</main>
    </div>
  );
}
