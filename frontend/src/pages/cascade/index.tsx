import React from 'react';
import { Layout } from '../../components/layout/Layout';
import { CascadePlayer } from '../../components/cascade/CascadePlayer';
import { cascadeApi } from '../../lib/api';

type Arch = { slug: string; name: string };

export default function CascadePage() {
  const [archetypes, setArchetypes] = React.useState<Arch[]>([]);
  const [selected, setSelected] = React.useState<string | null>(null);

  React.useEffect(() => {
    cascadeApi.archetypes()
      .then((d: any) => setArchetypes(d.archetypes || []))
      .catch(() => setArchetypes([
        { slug: 'rate-limiter', name: 'Rate Limiter' },
        { slug: 'url-shortener', name: 'URL Shortener' },
        { slug: 'notification-system', name: 'Notification System' },
      ]));
  }, []);

  if (!selected) {
    return (
      <Layout title="Cascade" description="Fix one issue; your fix reveals the next. Survive the chain.">
        <div className="mx-auto max-w-3xl py-10">
          <div className="mb-2 text-xs font-500 uppercase tracking-[0.18em] text-accent-600">Mode · Cascade</div>
          <h1 className="font-serif text-3xl font-600 sm:text-4xl">Choose a system to survive</h1>
          <p className="mt-2 max-w-xl text-muted">
            Each system has its own chain of real-world failures. Fix one issue — your fix reveals the next.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {archetypes.map((a) => (
              <button key={a.slug} onClick={() => setSelected(a.slug)}
                className="group rounded-2xl border border-border bg-surface p-6 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
                <h3 className="font-serif text-xl font-600">{a.name}</h3>
                <p className="mt-1 text-sm text-muted">{descFor(a.slug)}</p>
                <span className="mt-3 inline-block text-sm text-accent-700 opacity-0 transition group-hover:opacity-100">Begin →</span>
              </button>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Cascade" description="Survive the chain of failures." full>
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
        <button onClick={() => setSelected(null)} className="mb-3 text-sm text-muted transition hover:text-fg">← Choose another system</button>
        <CascadePlayer archetype={selected} />
      </div>
    </Layout>
  );
}

function descFor(slug: string): string {
  const m: Record<string, string> = {
    'rate-limiter': 'In-memory counters → Redis → atomicity → multi-region drift.',
    'url-shortener': 'ID collisions, read overload, cache stampede, hot keys, abuse.',
    'notification-system': 'Inline sends → queues → poison messages → retry storms → provider failover.',
  };
  return m[slug] || 'A chain of real production failure modes.';
}
