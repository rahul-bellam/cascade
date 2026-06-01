import React from 'react';

export function TestResults({ result }: { result: any }) {
  if (!result) return null;
  return (
    <div className="p-4 bg-slate-900 text-slate-100 border-t border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold">
          {result.passed ? '✅ All tests passed' : '❌ Some tests failed'}
        </span>
        <span className="text-sm text-slate-400">
          {result.tests_passed}/{result.tests_total} · score {result.score}
        </span>
      </div>
      <ul className="space-y-1 text-sm">
        {(result.results || []).map((r: any, i: number) => (
          <li key={i} className={r.passed ? 'text-green-400' : 'text-red-400'}>
            {r.passed ? '✓' : '✗'} {r.name}
            {!r.passed && r.output ? <span className="text-slate-500"> — {r.output}</span> : null}
          </li>
        ))}
      </ul>
      {result.saved_to_toolkit && (
        <div className="mt-3 text-sm text-cascade-200">
          🧰 Saved to your Toolkit as <code>{result.toolkit_key}</code>
        </div>
      )}
    </div>
  );
}
