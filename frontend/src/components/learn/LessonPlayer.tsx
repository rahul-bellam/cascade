import React from 'react';
import { ConceptPanel } from './ConceptPanel';
import { TestResults } from './TestResults';
import { CodeEditor } from './CodeEditor';
import { learnApi } from '../../lib/api';

const USER_ID = 'demo-user';

export function LessonPlayer({ lesson }: { lesson: any }) {
  const [code, setCode] = React.useState<string>(lesson.snippet_starter_code || '');
  const [result, setResult] = React.useState<any>(null);
  const [hints, setHints] = React.useState<any[]>([]);
  const [hintLevel, setHintLevel] = React.useState(0);
  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    setRunning(true); setError(null);
    try {
      const r = await learnApi.submit(lesson.slug, { user_id: USER_ID, code, hints_used: hintLevel });
      setResult(r);
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setRunning(false);
    }
  };

  const revealHint = async () => {
    const next = Math.min(hintLevel + 1, lesson.hint_count || 3);
    setHintLevel(next);
    try {
      const r = await learnApi.hint(lesson.slug, next);
      setHints(r.hints || []);
    } catch (e: any) {
      setError(String(e.message || e));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-4rem)] p-4">
      <ConceptPanel lesson={lesson} />
      <div className="flex flex-col bg-[#1e1e1e] rounded-xl overflow-hidden border border-slate-700">
        <div className="flex-1 min-h-[200px]">
          <CodeEditor value={code} onChange={setCode} language="python" />
        </div>
        <div className="flex gap-2 p-2 bg-slate-800 items-center">
          <button
            onClick={submit}
            disabled={running}
            className="px-4 py-2 bg-cascade-500 hover:bg-cascade-600 text-white rounded font-medium disabled:opacity-50"
          >
            {running ? 'Running…' : '▶ Run & Submit'}
          </button>
          <button
            onClick={revealHint}
            disabled={hintLevel >= (lesson.hint_count || 3)}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm disabled:opacity-40"
          >
            💡 Hint ({hintLevel}/{lesson.hint_count || 3})
          </button>
          <button
            onClick={() => { setCode(lesson.snippet_starter_code || ''); setResult(null); }}
            className="px-3 py-2 text-slate-300 hover:text-white text-sm"
          >
            Reset
          </button>
        </div>
        {hints.length > 0 && (
          <div className="px-4 py-2 bg-amber-950/40 border-t border-amber-800 text-amber-200 text-sm space-y-1">
            {hints.map((h, i) => <div key={i}>💡 L{h.level}: {h.text}</div>)}
          </div>
        )}
        {error && <div className="px-4 py-2 bg-red-950/50 text-red-300 text-sm border-t border-red-800">⚠ {error}</div>}
        <TestResults result={result} />
      </div>
    </div>
  );
}
