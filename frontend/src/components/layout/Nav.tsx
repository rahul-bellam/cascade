import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ThemeToggle } from '../ui/ThemeToggle';

const LINKS = [
  { href: '/learn', label: 'Learn' },
  { href: '/constraint', label: 'Scale' },
  { href: '/cascade', label: 'Cascade' },
  { href: '/predict', label: 'Predict' },
  { href: '/refactor', label: 'Refactor' },
  { href: '/arena', label: 'Arena' },
  { href: '/league', label: 'League' },
];

export function Nav() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const active = (h: string) => router.pathname === h || router.pathname.startsWith(h + '/');

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5 sm:px-8" aria-label="Main">
        <Link href="/" className="font-serif text-xl font-600 tracking-tight text-fg">
          Cascade<span className="text-accent-500">.</span>
        </Link>

        <div className="ml-2 hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                active(l.href) ? 'text-accent-700' : 'text-muted hover:text-fg'
              }`}>
              {l.label}
              {active(l.href) && <span className="mt-1 block h-px w-full bg-accent-500" />}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link href="/login"
            className="rounded-full border border-accent-600 bg-accent-600 px-5 py-1.5 text-sm font-500 text-white transition hover:bg-accent-700">
            Sign in
          </Link>
          <button onClick={() => setOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted md:hidden"
            aria-label="Toggle menu" aria-expanded={open}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              {open ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
            </svg>
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-border bg-surface md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col px-5 py-2">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm ${active(l.href) ? 'text-accent-700' : 'text-muted'}`}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
