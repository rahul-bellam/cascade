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
    <>
      <Head><title>learn — cascade</title></Head>
      <div className="max-w-3xl">
        <h1 className="text-lg font-medium mb-1 text-[#00ff41]">$ cat /lessons</h1>
        <p className="text-xs text-[#006622] mb-6">available lessons · {lessons.length} total</p>

        {err && (
          <div className="border border-[#ff3333] bg-[#1a0000] p-3 mb-4 text-xs text-[#ff3333]">
            {`> error: backend unreachable (${err})`}
            <br />
            {`> hint: start learn-engine on :8093`}
          </div>
        )}

        <div className="space-y-px">
          {lessons.map((l, i) => (
            <Link key={l.slug} href={`/learn/${l.slug}`}
              className="block border border-[#1a1a1a] bg-black hover:bg-[#0a0a0a] p-4 transition-colors group">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-[#00ff41] group-hover:text-[#00cc33]">
                    [{i + 1}] {l.title}
                  </div>
                  <div className="text-xs text-[#006622] mt-1">
                    ~{l.estimated_minutes} min
                    {l.prerequisite_slugs?.length ? ` · deps: ${l.prerequisite_slugs.join(', ')}` : ''}
                  </div>
                </div>
                <span className="text-[#004d1a] group-hover:text-[#00ff41] text-sm">→</span>
              </div>
            </Link>
          ))}
          {!lessons.length && !err && (
            <div className="text-xs text-[#006622]">
              {`> loading lesson catalog...`}
              <span className="inline-block w-2 h-3 bg-[#006622] animate-blink ml-1" />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
