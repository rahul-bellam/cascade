import React from 'react';
import dynamic from 'next/dynamic';

const Monaco = dynamic(() => import('@monaco-editor/react').then((m) => m.default), {
  ssr: false,
  loading: () => <div className="p-3 text-slate-500 text-sm">Loading editor…</div>,
});

export function CodeEditor({
  value, onChange, language = 'python',
}: { value: string; onChange: (v: string) => void; language?: string }) {
  // Monaco loads its worker from a CDN; if that fails (e.g. sandboxed preview),
  // we still want an editable surface. We render Monaco but keep a textarea
  // fallback toggle for environments without network.
  const [useFallback, setUseFallback] = React.useState(false);

  if (useFallback) {
    return (
      <textarea
        className="w-full h-full font-mono text-sm p-3 bg-[#1e1e1e] text-slate-100 outline-none resize-none"
        value={value}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <div className="h-full relative">
      <button
        onClick={() => setUseFallback(true)}
        className="absolute z-10 right-2 top-2 text-[10px] px-2 py-0.5 bg-slate-700/80 text-slate-200 rounded"
        title="Switch to plain editor (no network)"
      >
        plain
      </button>
      <Monaco
        height="100%"
        language={language}
        theme="vs-dark"
        value={value}
        onChange={(v) => onChange(v || '')}
        options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false }}
      />
    </div>
  );
}
