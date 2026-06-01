import type { AppProps } from 'next/app';
import Link from 'next/link';
import { useRouter } from 'next/router';
import '../styles/globals.css';

const NAV = [
  { href: '/learn', label: 'learn' },
  { href: '/predict', label: 'predict' },
  { href: '/constraint', label: 'scale' },
  { href: '/cascade', label: 'cascade' },
  { href: '/arena', label: 'arena' },
  { href: '/league', label: 'league' },
  { href: '/refactor', label: 'refactor' },
];

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isHome = router.pathname === '/';

  if (isHome) return <Component {...pageProps} />;

  return (
    <div className="min-h-screen bg-black text-[#00ff41]">
      <header className="h-12 flex items-center px-6 border-b border-[#1a1a1a]">
        <Link href="/" className="text-[#00ff41] hover:text-[#00cc33] mr-6 text-sm">
          cascade@~$
        </Link>
        <nav className="flex gap-5 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`hover:text-[#00cc33] transition-colors ${
                router.pathname.startsWith(n.href) ? 'text-[#00ff41] underline underline-offset-4 decoration-[#00ff41]' : 'text-[#006622]'
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto">
          <Link href="/login" className="text-sm border border-[#1a1a1a] px-3 py-1 hover:border-[#00ff41] transition-colors">
            login
          </Link>
        </div>
      </header>
      <main className="p-6 max-w-6xl mx-auto">
        <Component {...pageProps} />
      </main>
      <footer className="h-10 flex items-center justify-center border-t border-[#1a1a1a] text-[#004d1a] text-xs">
        cascade v1.0 — [system design terminal]
      </footer>
    </div>
  );
}
