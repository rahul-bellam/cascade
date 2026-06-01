import React from 'react';
import dynamic from 'next/dynamic';

const Monaco = dynamic(() => import('@monaco-editor/react').then((m) => m.default), {
  ssr: false,
  loading: () => <div className="p-3 text-[#006622] text-sm font-mono">loading editor...</div>,
});

export function CodeEditor({
  value, onChange, language = 'python',
}: { value: string; onChange: (v: string) => void; language?: string }) {
  const [useFallback, setUseFallback] = React.useState(false);

  if (useFallback) {
    return (
      <textarea
        className="w-full h-full font-mono text-sm p-3 bg-black text-[#00ff41] outline-none resize-none border-0"
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
        className="absolute z-10 right-2 top-2 text-[10px] px-2 py-0.5 border border-[#1a1a1a] text-slate-600 hover:text-[#00ff41] bg-black"
        title="Switch to plain editor"
      >
        plain
      </button>
      <Monaco
        height="100%"
        language={language}
        theme="hc-black"
        value={value}
        onChange={(v) => onChange(v || '')}
        options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, fontFamily: 'JetBrains Mono' }}
      />
    </div>
  );
}
