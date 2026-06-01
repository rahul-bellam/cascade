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
      <div className="flex flex-col bg-black border border-[#1a1a1a] overflow-hidden">
        <div className="flex-1 min-h-[200px]">
          <CodeEditor value={code} onChange={setCode} language="python" />
        </div>
        <div className="flex gap-2 p-2 border-t border-[#1a1a1a] items-center">
          <button
            onClick={submit}
            disabled={running}
            className="px-4 py-2 border border-[#00ff41] text-[#00ff41] bg-transparent hover:bg-[#00ff41] hover:text-black text-sm font-mono disabled:opacity-30"
          >
            {running ? 'running...' : '$ submit'}
          </button>
          <button
            onClick={revealHint}
            disabled={hintLevel >= (lesson.hint_count || 3)}
            className="px-3 py-2 border border-[#c0c0c0] text-[#c0c0c0] hover:bg-[#c0c0c0] hover:text-black text-xs font-mono disabled:opacity-30 bg-transparent"
          >
            $ hint ({hintLevel}/{lesson.hint_count || 3})
          </button>
          <button
            onClick={() => { setCode(lesson.snippet_starter_code || ''); setResult(null); }}
            className="px-3 py-2 text-[#c0c0c0] hover:text-[#00ff41] text-xs font-mono bg-transparent"
          >
            reset
          </button>
        </div>
        {hints.length > 0 && (
          <div className="px-4 py-2 border-t border-[#1a1a1a] text-[#c0c0c0] text-xs font-mono space-y-1">
            {hints.map((h, i) => <div key={i}>&gt; l{h.level}: {h.text}</div>)}
          </div>
        )}
        {error && <div className="px-4 py-2 border-t border-[#ff3333] text-[#ff3333] text-xs font-mono">&gt; {error}</div>}
        <TestResults result={result} />
      </div>
    </div>
  );
}
