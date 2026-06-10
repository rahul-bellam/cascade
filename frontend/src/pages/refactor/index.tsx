import React from 'react';
import dynamic from 'next/dynamic';
import { Layout } from '../../components/layout/Layout';
import { refactorApi } from '../../lib/api';

const CodebaseExplorer = dynamic(
  () => import('../../components/refactor/CodebaseExplorer').then((m) => m.CodebaseExplorer),
  { ssr: false },
);

type CB = { slug: string; files: number };

const META: Record<string, { name: string; desc: string }> = {
  'payment-monolith': { name: 'Payment Monolith', desc: 'Auth, payments, ledger & refunds in one file. SQL injection, N+1, no idempotency.' },
  'url-shortener-spaghetti': { name: 'URL Shortener', desc: 'Shorten, redirect, analytics & admin tangled in global state. A god maintenance function.' },
  'notification-monolith': { name: 'Notification Monolith', desc: 'Inline email/SMS/push, no queue, lockstep retries, a god campaign fan-out.' },
};

export default function RefactorPage() {
  const [codebases, setCodebases] = React.useState<CB[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);

  React.useEffect(() => {
    refactorApi.codebases()
      .then((d: any) => setCodebases(d.codebases || []))
      .catch(() => setCodebases(Object.keys(META).map((slug) => ({ slug, files: 0 }))));
  }, []);

  if (selected) {
    return (
      <Layout title="Refactor" description="Reverse-engineer a legacy codebase." full>
        <div className="mx-auto max-w-6xl px-5 pt-4 sm:px-8">
          <button onClick={() => setSelected(null)} className="text-sm text-muted transition hover:text-fg">← Choose another codebase</button>
        </div>
        <CodebaseExplorer codebase={selected} />
      </Layout>
    );
  }

  return (
    <Layout title="Refactor" description="Reverse-engineer a legacy codebase. Extract services.">
      <div className="mx-auto max-w-3xl py-10">
        <div className="mb-2 text-xs font-500 uppercase tracking-[0.18em] text-accent-600">Mode · Blind Refactor</div>
        <h1 className="font-serif text-3xl font-600 sm:text-4xl">Inherit a codebase</h1>
        <p className="mt-2 max-w-xl text-muted">
          A terrible-but-working system. Map its dependencies, find the god objects, and
          plan how you'd untangle it.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {codebases.map((c) => {
            const m = META[c.slug] || { name: c.slug, desc: 'A legacy codebase to untangle.' };
            return (
              <button key={c.slug} onClick={() => setSelected(c.slug)}
                className="group rounded-2xl border border-border bg-surface p-6 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
                <h3 className="font-serif text-xl font-600">{m.name}</h3>
                <p className="mt-1 text-sm text-muted">{m.desc}</p>
                <span className="mt-3 inline-block text-sm text-accent-700 opacity-0 transition group-hover:opacity-100">Open explorer →</span>
              </button>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
