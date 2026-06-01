import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { learnApi } from '../../lib/api';

export default function LearnIndex() {
  const [lessons, setLessons] = React.useState<any[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    learnApi.list().then((d) => setLessons(d.lessons || [])).catch((e) => setErr(String(e.message || e)));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-cascade-900 to-cascade-700 text-white p-8">
      <Head><title>Learn — Cascade</title></Head>
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-cascade-200 text-sm">← Home</Link>
        <h1 className="text-4xl font-bold mt-2 mb-6">📖 Learn</h1>
        {err && <div className="bg-red-950/50 text-red-200 p-3 rounded mb-4 text-sm">Backend not reachable: {err}<br/>Start the learn-engine on :8093.</div>}
        <div className="space-y-3">
          {lessons.map((l) => (
            <Link key={l.slug} href={`/learn/${l.slug}`}
              className="block bg-white/10 hover:bg-white/20 rounded-xl p-5 transition">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xl font-semibold">{l.title}</div>
                  <div className="text-cascade-200 text-sm">
                    ~{l.estimated_minutes} min
                    {l.prerequisite_slugs?.length ? ` · needs: ${l.prerequisite_slugs.join(', ')}` : ''}
                  </div>
                </div>
                <span className="text-2xl">→</span>
              </div>
            </Link>
          ))}
          {!lessons.length && !err && <div className="text-cascade-200">Loading lessons…</div>}
        </div>
      </div>
    </div>
  );
}
