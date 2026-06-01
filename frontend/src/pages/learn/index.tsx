import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { learnApi } from '../../lib/api';

export default function LearnPage() {
  const [lessons, setLessons] = React.useState<any[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    learnApi.list()
      .then((data) => setLessons(Array.isArray(data) ? data : data.lessons || []))
      .catch((e) => setErr(String(e.message || e)));
  }, []);

  return (
    <div>
      <Head><title>learn — Cascade</title></Head>
      <h1 className="text-lg font-bold mb-1 font-mono">$ cat /lessons</h1>
      <p className="text-[#c0c0c0] text-xs mb-6 font-mono">found {lessons.length} lessons</p>
      {err && <div className="border border-[#ff3333] text-[#ff3333] p-3 mb-6 text-sm font-mono">&gt; error: {err}</div>}
      {lessons.length === 0 && !err && (
        <div className="text-[#c0c0c0] text-sm font-mono">$ no lessons yet</div>
      )}
      <ul className="space-y-3">
        {lessons.map((l, i) => (
          <li key={l.slug || i}>
            <Link href={`/learn/${l.slug}`}
              className="block border border-[#1a1a1a] p-4 hover:border-[#c0c0c0] transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-[#c0c0c0] text-xs font-mono">[{i + 1}]</span>
                <span className="text-[#00ff41] font-bold text-sm font-mono">{l.title}</span>
                {l.estimated_minutes && (
                  <span className="text-[#c0c0c0] text-xs font-mono ml-auto">~{l.estimated_minutes}min</span>
                )}
              </div>
              {l.subtitle && <div className="text-[#c0c0c0] text-xs mt-1 font-mono">{l.subtitle}</div>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
