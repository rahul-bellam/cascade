import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Layout } from '../../components/layout/Layout';
import { Skeleton } from '../../components/ui/Skeleton';
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
    <Layout title={lesson?.title || 'Lesson'} full>
      <div className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-4 sm:px-8">
          <Link href="/learn" className="text-sm text-muted transition hover:text-fg">← Lessons</Link>
          {lesson?.title && <span className="font-serif text-sm font-500">{lesson.title}</span>}
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
        {err && <div role="alert" className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">Error: {err}</div>}
        {lesson ? <LessonPlayer lesson={lesson} /> : !err && <div className="max-w-md"><Skeleton className="h-40 w-full" /></div>}
      </div>
    </Layout>
  );
}
