import React from 'react';

type Block = { type: string; body?: string; code?: string; language?: string; id?: string };

export function ConceptPanel({ lesson }: { lesson: any }) {
  const blocks: Block[] = lesson?.concept_content || [];
  return (
    <div className="overflow-y-auto p-6 bg-slate-900 text-slate-100 rounded-xl">
      <h2 className="text-2xl font-bold mb-1">{lesson.title}</h2>
      <div className="text-xs text-slate-400 mb-4">
        ~{lesson.estimated_minutes} min
        {lesson.prerequisite_slugs?.length ? ` · prereqs: ${lesson.prerequisite_slugs.join(', ')}` : ''}
      </div>
      {blocks.map((b, i) => {
        if (b.type === 'text') return <p key={i} className="mb-4 leading-relaxed text-slate-200">{b.body}</p>;
        if (b.type === 'code_block')
          return (
            <pre key={i} className="mb-4 p-3 bg-black/60 rounded-lg text-sm overflow-x-auto border border-slate-700">
              <code>{b.code}</code>
            </pre>
          );
        if (b.type === 'viz')
          return (
            <div key={i} className="mb-4 p-4 bg-slate-800 rounded-lg border border-dashed border-slate-600 text-slate-400 text-sm">
              📊 Interactive visualization: <code>{b.id}</code> (rendered in full app)
            </div>
          );
        return null;
      })}
      <div className="mt-6 p-4 bg-slate-800/60 rounded-lg border border-slate-700">
        <div className="font-semibold mb-1 text-cascade-200">Your task</div>
        <p className="text-sm whitespace-pre-line text-slate-300">{lesson.snippet_prompt}</p>
      </div>
    </div>
  );
}
