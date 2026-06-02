import React from 'react';

type Block = { type: string; body?: string; code?: string; language?: string; id?: string };

export function ConceptPanel({ lesson }: { lesson: any }) {
  const blocks: Block[] = lesson?.concept_content || [];
  return (
    <div className="overflow-y-auto p-6 bg-bg text-accent-700 border border-border">
      <h2 className="text-lg font-bold mb-1 ">{lesson.title}</h2>
      <div className="text-xs text-muted mb-4 ">
        ~{lesson.estimated_minutes} min
        {lesson.prerequisite_slugs?.length ? ` · prereqs: ${lesson.prerequisite_slugs.join(', ')}` : ''}
      </div>
      {blocks.map((b, i) => {
        if (b.type === 'text') return <p key={i} className="mb-4 leading-relaxed text-muted text-sm ">{b.body}</p>;
        if (b.type === 'code_block')
          return (
            <pre key={i} className="mb-4 p-3 bg-surface text-sm overflow-x-auto border border-border ">
              <code className="text-accent-700">{b.code}</code>
            </pre>
          );
        if (b.type === 'viz')
          return (
            <div key={i} className="mb-4 p-4 border border-dashed border-border text-muted text-sm ">
              Visualization: <code>{b.id}</code>
            </div>
          );
        return null;
      })}
      <div className="mt-6 p-4 border border-border">
        <div className="font-semibold mb-1 text-accent-700 text-sm ">Your task</div>
        <p className="text-sm text-muted ">{lesson.snippet_prompt}</p>
      </div>
    </div>
  );
}
