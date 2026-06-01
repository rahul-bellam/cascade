import React from 'react';

export function TestResults({ result }: { result: any }) {
  if (!result) return null;
  return (
    <div className="p-4 bg-black text-[#00ff41] border-t border-[#1a1a1a] font-mono">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm">
          {result.passed ? '$ all_tests_passed' : '> some_tests_failed'}
        </span>
        <span className="text-xs text-[#c0c0c0]">
          {result.tests_passed}/{result.tests_total} · score {result.score}
        </span>
      </div>
      <ul className="space-y-1 text-xs">
        {(result.results || []).map((r: any, i: number) => (
          <li key={i} className={r.passed ? 'text-[#00ff41]' : 'text-[#ff3333]'}>
            {r.passed ? '✓' : '✗'} {r.name}
            {!r.passed && r.output ? <span className="text-[#c0c0c0]"> — {r.output}</span> : null}
          </li>
        ))}
      </ul>
      {result.saved_to_toolkit && (
        <div className="mt-3 text-xs text-[#00ff41] font-mono">
          $ saved to toolkit as <code>{result.toolkit_key}</code>
        </div>
      )}
    </div>
  );
}
