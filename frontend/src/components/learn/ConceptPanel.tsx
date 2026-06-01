import React from 'react';

type Block = { type: string; body?: string; code?: string; language?: string; id?: string };

export function ConceptPanel({ lesson }: { lesson: any }) {
  const blocks: Block[] = lesson?.concept_content || [];
  return (
    <div className="overflow-y-auto p-6 bg-black text-[#00ff41] border border-[#1a1a1a]">
      <h2 className="text-lg font-bold mb-1 font-mono">{lesson.title}</h2>
      <div className="text-xs text-slate-600 mb-4 font-mono">
        ~{lesson.estimated_minutes} min
        {lesson.prerequisite_slugs?.length ? ` · prereqs: ${lesson.prerequisite_slugs.join(', ')}` : ''}
      </div>
      {blocks.map((b, i) => {
        if (b.type === 'text') return <p key={i} className="mb-4 leading-relaxed text-slate-500 text-sm font-mono">{b.body}</p>;
        if (b.type === 'code_block')
          return (
            <pre key={i} className="mb-4 p-3 bg-[#0a0a0a] text-sm overflow-x-auto border border-[#1a1a1a] font-mono">
              <code className="text-[#00ff41]">{b.code}</code>
            </pre>
          );
        if (b.type === 'viz')
          return (
            <div key={i} className="mb-4 p-4 border border-dashed border-[#1a1a1a] text-slate-600 text-sm font-mono">
              $ visualization: <code>{b.id}</code>
            </div>
          );
        return null;
      })}
      <div className="mt-6 p-4 border border-[#1a1a1a]">
        <div className="font-semibold mb-1 text-[#00ff41] text-sm font-mono">$ task</div>
        <p className="text-sm text-slate-500 font-mono">{lesson.snippet_prompt}</p>
      </div>
    </div>
  );
}
