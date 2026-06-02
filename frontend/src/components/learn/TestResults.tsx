import React from 'react';

export function TestResults({ result }: { result: any }) {
  if (!result) return null;
  return (
    <div className="p-4 bg-bg text-accent-700 border-t border-border ">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm">
          {result.passed ? 'All tests passed' : 'Some tests failed'}
        </span>
        <span className="text-xs text-muted">
          {result.tests_passed}/{result.tests_total} · score {result.score}
        </span>
      </div>
      <ul className="space-y-1 text-xs">
        {(result.results || []).map((r: any, i: number) => (
          <li key={i} className={r.passed ? 'text-accent-700' : 'text-danger'}>
            {r.passed ? '✓' : '✗'} {r.name}
            {!r.passed && r.output ? <span className="text-muted"> — {r.output}</span> : null}
          </li>
        ))}
      </ul>
      {result.saved_to_toolkit && (
        <div className="mt-3 text-xs text-accent-700 ">
          Saved to toolkit as <code>{result.toolkit_key}</code>
        </div>
      )}
    </div>
  );
}
