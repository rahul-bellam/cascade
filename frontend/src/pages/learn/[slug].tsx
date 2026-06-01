import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { LessonPlayer } from '../../components/learn/LessonPlayer';
import { learnApi } from '../../lib/api';

export default function LessonPage() {
  const router = useRouter();
  const slug = router.query.slug as string;
  const [lesson, setLesson] = React.useState<any>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!slug) return;
    learnApi.get(slug).then(setLesson).catch((e) => setErr(String(e.message || e)));
  }, [slug]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Head><title>{lesson?.title || 'Lesson'} — Cascade</title></Head>
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <Link href="/learn" className="text-cascade-200 text-sm">← Lessons</Link>
        <span className="ml-4 font-semibold">{lesson?.title}</span>
      </div>
      {err && <div className="m-6 bg-red-950/50 text-red-200 p-3 rounded text-sm">Error: {err}</div>}
      {lesson ? <LessonPlayer lesson={lesson} /> : !err && <div className="p-8 text-slate-400">Loading…</div>}
    </div>
  );
}
