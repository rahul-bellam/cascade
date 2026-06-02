import React from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from '../../lib/theme';

const Monaco = dynamic(() => import('@monaco-editor/react').then((m) => m.default), {
  ssr: false,
  loading: () => <div className="p-3 text-muted text-sm">Loading editor…</div>,
});

export function CodeEditor({
  value, onChange, language = 'python',
}: { value: string; onChange: (v: string) => void; language?: string }) {
  const { theme } = useTheme();
  const [useFallback, setUseFallback] = React.useState(false);

  if (useFallback) {
    return (
      <textarea
        className="h-full w-full resize-none border-0 bg-surface p-3 font-mono text-sm text-fg outline-none"
        value={value}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <div className="relative h-full">
      <button
        onClick={() => setUseFallback(true)}
        className="absolute right-2 top-2 z-10 rounded border border-border bg-surface px-2 py-0.5 text-[10px] text-muted transition hover:text-fg"
        title="Switch to plain editor"
      >
        plain
      </button>
      <Monaco
        height="100%"
        language={language}
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        value={value}
        onChange={(v) => onChange(v || '')}
        options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, fontFamily: "'Fira Code', ui-monospace, monospace" }}
      />
    </div>
  );
}
