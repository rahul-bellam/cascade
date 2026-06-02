import React from 'react';
import Link from 'next/link';
import { Layout } from '../../components/layout/Layout';
import { PageHeader } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { learnApi } from '../../lib/api';

export default function LearnPage() {
  const [lessons, setLessons] = React.useState<any[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    learnApi.list()
      .then((d: any) => setLessons(Array.isArray(d) ? d : d.lessons || []))
      .catch((e) => setErr(String(e.message || e)));
  }, []);

  return (
    <Layout title="Learn" description="Concept-and-code lessons. Build your toolkit.">
      <PageHeader eyebrow="Mode · Learn" title="Lessons"
        subtitle="Each lesson pairs a concept with a small implementation. Pass it, and the snippet joins your toolkit." />

      {err && (
        <div role="alert" className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          Couldn’t reach the learn engine: {err}. Start it on :8093.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {lessons === null && !err && [0, 1].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        {lessons?.map((l: any, i: number) => (
          <Link key={l.slug || i} href={`/learn/${l.slug}`}
            className="group rounded-2xl border border-border bg-surface p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="font-serif text-sm text-accent-600">{String(i + 1).padStart(2, '0')}</span>
              <span className="text-xs text-muted">~{l.estimated_minutes ?? 10} min</span>
            </div>
            <h3 className="font-serif text-lg font-600">{l.title}</h3>
            {l.prerequisite_slugs?.length > 0 && (
              <p className="mt-1 text-xs text-muted">Prerequisite: {l.prerequisite_slugs.join(', ')}</p>
            )}
          </Link>
        ))}
        {lessons?.length === 0 && !err && (
          <div className="col-span-full rounded-2xl border border-dashed border-border p-10 text-center text-muted">No lessons yet.</div>
        )}
      </div>
    </Layout>
  );
}
