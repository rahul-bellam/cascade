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
    <div className="min-h-screen bg-black text-[#00ff41]">
      <Head><title>{lesson?.title || 'Lesson'} — Cascade</title></Head>
      <div className="h-14 flex items-center px-6 border-b border-[#1a1a1a]">
        <Link href="/learn" className="text-[#c0c0c0] hover:text-[#00ff41] text-sm font-mono">← $ lessons</Link>
        <span className="ml-4 text-sm font-mono text-[#00ff41]">{lesson?.title}</span>
      </div>
      {err && <div className="m-6 border border-[#ff3333] bg-[#ff3333]/10 text-[#ff3333] p-3 text-sm font-mono">&gt; error: {err}</div>}
      {lesson ? <LessonPlayer lesson={lesson} /> : !err && <div className="p-8 text-[#c0c0c0] font-mono">$ loading...</div>}
    </div>
  );
}
