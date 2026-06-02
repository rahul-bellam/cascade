import React from 'react';
import Link from 'next/link';
import { Layout } from '../components/layout/Layout';

const MODES = [
  { href: '/learn', name: 'Learn', desc: 'Concepts paired with code. Every lesson adds a reusable pattern to your toolkit.' },
  { href: '/constraint', name: 'Scale', desc: 'Take a working system and survive escalating load, one constraint at a time.' },
  { href: '/cascade', name: 'Cascade', desc: 'Fix one issue; your fix reveals the next. Trace a failure to a stable system.' },
  { href: '/predict', name: 'Predict', desc: 'Reason about what breaks before you touch the code — judgment over recall.' },
  { href: '/refactor', name: 'Refactor', desc: 'Untangle a real legacy codebase. Extract services. Meet the surprise requirement.' },
  { href: '/arena', name: 'Arena', desc: 'A considered duel of designs under load. Thoughtful, not frantic.' },
];

export default function Home() {
  return (
    <Layout>
      {/* Hero — editorial, single column, generous air */}
      <section className="mx-auto max-w-3xl pt-10 pb-20 text-center sm:pt-20">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
          A calm place to build real engineering instinct
        </div>
        <h1 className="font-serif text-4xl font-600 leading-[1.1] tracking-tight sm:text-6xl">
          Learn how systems
          <br /> truly <span className="italic text-accent-700">behave</span> — and
          <br /> how they <span className="italic text-accent-700">break</span>.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted">
          Cascade is a quiet, premium studio for system design. You learn by doing —
          building, scaling, and surviving the consequences of your own decisions —
          without the noise.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/learn"
            className="rounded-full bg-accent-600 px-7 py-3 font-500 text-white shadow-soft transition hover:bg-accent-700">
            Begin learning
          </Link>
          <Link href="/cascade"
            className="rounded-full border border-border bg-surface px-7 py-3 font-500 text-fg transition hover:border-accent-300">
            Explore a cascade
          </Link>
        </div>
      </section>

      {/* Modes — refined cards, lots of whitespace */}
      <section className="border-t border-border pt-16">
        <h2 className="mb-2 text-center font-serif text-2xl font-600">Six ways to practise</h2>
        <p className="mb-10 text-center text-muted">Each mode is a different lens on the same craft.</p>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MODES.map((m, i) => (
            <Link key={m.href} href={m.href}
              className="group rounded-2xl border border-border bg-surface p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
              <div className="mb-3 font-serif text-xs text-accent-600">{String(i + 1).padStart(2, '0')}</div>
              <h3 className="mb-2 font-serif text-xl font-600">{m.name}</h3>
              <p className="text-sm leading-relaxed text-muted">{m.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Quiet differentiator line */}
      <section className="mx-auto mt-20 max-w-2xl border-t border-border pt-12 text-center">
        <p className="font-serif text-2xl font-500 leading-relaxed text-fg">
          “First you learn. Then you break.
          <br /> Then you rebuild. Then you compete.”
        </p>
        <p className="mt-4 text-sm text-muted">
          233+ engineering concerns, each grounded in a real production incident.
        </p>
      </section>

      <footer className="mt-20 border-t border-border py-10 text-center text-sm text-muted">
        Cascade — learn system design, calmly. <span className="text-fg/50">MIT</span>
      </footer>
    </Layout>
  );
}
