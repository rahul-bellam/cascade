import React from 'react';
import { CodeEditor } from '../learn/CodeEditor';
import { MetricsDashboard } from './MetricsDashboard';
import { constraintApi } from '../../lib/api';

const USER_ID = 'demo-user';

export function ConstraintSession({ archetype = 'rate-limiter' }: { archetype?: string }) {
  const [sid, setSid] = React.useState<string | null>(null);
  const [name, setName] = React.useState('');
  const [level, setLevel] = React.useState<any>(null);
  const [origin, setOrigin] = React.useState<any>(null);
  const [code, setCode] = React.useState('');
  const [metrics, setMetrics] = React.useState<any>(null);
  const [cleared, setCleared] = React.useState<number[]>([]);
  const [done, setDone] = React.useState<any>(null);
  const [hints, setHints] = React.useState<string[]>([]);
  const [hintLevel, setHintLevel] = React.useState(0);
  const [toolkit, setToolkit] = React.useState<any[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const begin = async () => {
    setErr(null); setMetrics(null); setCleared([]); setDone(null); setHints([]); setHintLevel(0);
    try {
      const r = await constraintApi.start(archetype, USER_ID);
      setSid(r.session_id); setName(r.name); setLevel(r.current); setOrigin(r.origin);
      setCode(r.origin?.origin_code || '');
      setToolkit(r.current?.suggested_toolkit || []);
    } catch (e: any) { setErr(String(e.message || e)); }
  };
  React.useEffect(() => { begin(); /* eslint-disable-next-line */ }, [archetype]);

  const submit = async () => {
    if (!sid) return;
    setBusy(true); setErr(null);
    try {
      const r = await constraintApi.submit(sid, code);
      setMetrics({ ...r.metrics, passed: r.passed });
      if (r.passed) {
        setCleared((c) => [...c, level.level]);
        if (r.all_levels_complete) {
          setDone({ score: r.score });
        } else if (r.next) {
          setLevel(r.next); setHints([]); setHintLevel(0);
          setToolkit(r.next.suggested_toolkit || []);
          setMetrics(null);
        }
      }
    } catch (e: any) { setErr(String(e.message || e)); }
    finally { setBusy(false); }
  };

  const revealHint = async () => {
    if (!sid) return;
    const next = Math.min(hintLevel + 1, level?.hint_count || 3);
    setHintLevel(next);
    try { const r = await constraintApi.hint(sid, next); setHints(r.hints || []); }
    catch (e: any) { setErr(String(e.message || e)); }
  };

  const insertSnippet = (snip: any) => {
    setCode((c) => `# from your Toolkit: ${snip.toolkit_key}\n${snip.code}\n\n${c}`);
  };

  return (
    <div className="p-4 text-white">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold">🔓 Constraint Unlock — {name || archetype}</h1>
        <button onClick={begin} className="text-sm px-3 py-1 bg-slate-700 rounded hover:bg-slate-600">Restart</button>
      </div>
      {err && <div className="bg-red-950/50 text-red-200 p-3 rounded mb-3 text-sm">Backend error: {err}<br/>Start the constraint-engine on :8094.</div>}

      {/* level progress */}
      <div className="flex gap-2 mb-4">
        {origin && <span className="px-2 py-1 rounded text-xs bg-slate-700">Origin ✓</span>}
        {[1, 2, 3].map((n) => (
          <span key={n} className={`px-2 py-1 rounded text-xs ${cleared.includes(n) ? 'bg-green-700' : level?.level === n ? 'bg-cascade-600' : 'bg-slate-800'}`}>
            L{n} {cleared.includes(n) ? '✓' : ''}
          </span>
        ))}
      </div>

      {done ? (
        <div className="bg-green-900/40 border border-green-600 rounded-xl p-8 text-center">
          <div className="text-5xl mb-2">🏆</div>
          <div className="text-2xl font-bold mb-1">Monolith scaled to production!</div>
          <div className="text-slate-300">All {origin ? 3 : ''} constraints survived · Score <b>{done.score}</b></div>
          <button onClick={begin} className="mt-4 px-4 py-2 bg-cascade-500 hover:bg-cascade-600 rounded">Run again</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-12rem)]">
          {/* left: problem + toolkit */}
          <div className="flex flex-col gap-3 overflow-y-auto">
            {level && (
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                <div className="text-xs text-amber-400 mb-1">CONSTRAINT · LEVEL {level.level}</div>
                <div className="font-semibold mb-1">{level.title}</div>
                <p className="text-sm text-slate-300 mb-2">{level.impact}</p>
                <div className="text-xs text-slate-400">target {level.target_rps} rps · p99 ≤ {level.latency_sla_ms}ms · errors ≤ {level.error_sla_pct}%</div>
              </div>
            )}
            {toolkit.length > 0 && (
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                <div className="text-xs text-cascade-200 mb-2">🧰 Your Toolkit (from Learn)</div>
                {toolkit.map((t, i) => (
                  <button key={i} onClick={() => insertSnippet(t)}
                    className={`block w-full text-left text-sm px-2 py-1 rounded mb-1 ${t.relevant ? 'bg-cascade-900/60 hover:bg-cascade-800' : 'bg-slate-800 hover:bg-slate-700'}`}>
                    {t.relevant ? '⭐ ' : ''}{t.toolkit_key} <span className="text-slate-500 text-xs">insert →</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={revealHint} disabled={hintLevel >= (level?.hint_count || 0)}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm disabled:opacity-40">
                💡 Hint ({hintLevel}/{level?.hint_count || 0})
              </button>
            </div>
            {hints.length > 0 && (
              <div className="bg-amber-950/40 border border-amber-800 rounded p-2 text-amber-200 text-sm space-y-1">
                {hints.map((h, i) => <div key={i}>💡 {h}</div>)}
              </div>
            )}
          </div>

          {/* middle: editor */}
          <div className="flex flex-col bg-[#1e1e1e] rounded-xl overflow-hidden border border-slate-700">
            <div className="flex-1 min-h-[200px]"><CodeEditor value={code} onChange={setCode} language="python" /></div>
            <div className="p-2 bg-slate-800">
              <button onClick={submit} disabled={busy}
                className="px-4 py-2 bg-cascade-500 hover:bg-cascade-600 rounded font-medium disabled:opacity-50">
                {busy ? 'Simulating load…' : '▶ Apply Fix & Run Load Test'}
              </button>
            </div>
          </div>

          {/* right: metrics */}
          <MetricsDashboard metrics={metrics} level={level} />
        </div>
      )}
    </div>
  );
}
