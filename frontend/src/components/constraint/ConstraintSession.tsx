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
  React.useEffect(() => { begin(); }, [archetype]);

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
    <div className="p-4 text-accent-700">
      <div className="flex items-center justify-between mb-3 border-b border-border pb-3">
        <h1 className="text-lg font-bold ">Constraint Unlock — {name || archetype}</h1>
        <button onClick={begin} className="text-sm px-3 py-1 border border-border text-muted hover:bg-surface-2 hover:text-white bg-transparent ">restart</button>
      </div>
      {err && <div className="border border-danger bg-danger/10 text-danger p-3 mb-3 text-sm ">Error: {err}</div>}

      <div className="flex gap-2 mb-4">
        {origin && <span className="px-2 py-1 text-xs border border-border text-muted ">origin ✓</span>}
        {[1, 2, 3].map((n) => (
          <span key={n} className={`px-2 py-1 text-xs border  ${cleared.includes(n) ? 'border-accent-500 text-accent-700' : level?.level === n ? 'border-accent-500 text-accent-700 bg-accent-600/10' : 'border-border text-muted'}`}>
            l{n} {cleared.includes(n) ? '✓' : ''}
          </span>
        ))}
      </div>

      {done ? (
        <div className="border border-accent-500 p-8 text-center">
          <div className="text-xl font-bold mb-1 text-accent-700 ">Constraint unlock complete</div>
          <div className="text-muted  text-sm">all constraints survived · score <b className="text-accent-700">{done.score}</b></div>
          <button onClick={begin} className="mt-4 px-4 py-2 border border-accent-500 text-accent-700 bg-transparent hover:bg-accent-600 hover:text-white ">Restart</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-12rem)]">
          <div className="flex flex-col gap-3 overflow-y-auto">
            {level && (
              <div className="border border-border p-4">
                <div className="text-xs text-muted mb-1 ">Constraint · level {level.level}</div>
                <div className="font-semibold mb-1 text-accent-700  text-sm">{level.title}</div>
                <p className="text-xs text-muted mb-2 ">{level.impact}</p>
                <div className="text-xs text-muted ">target {level.target_rps} rps · p99 ≤ {level.latency_sla_ms}ms · errors ≤ {level.error_sla_pct}%</div>
              </div>
            )}
            {toolkit.length > 0 && (
              <div className="border border-border p-4">
                <div className="text-xs text-muted mb-2 "># toolkit (from learn)</div>
                {toolkit.map((t, i) => (
                  <button key={i} onClick={() => insertSnippet(t)}
                    className={`block w-full text-left text-xs px-2 py-1 mb-1 border  ${t.relevant ? 'border-accent-500 text-accent-700 bg-accent-600/10' : 'border-border text-muted hover:border-border'}`}>
                    {t.relevant ? '> ' : '  '}{t.toolkit_key}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={revealHint} disabled={hintLevel >= (level?.hint_count || 0)}
                className="px-3 py-2 border border-border text-muted hover:bg-surface-2 hover:text-white text-xs  disabled:opacity-30 bg-transparent">
                Hint ({hintLevel}/{level?.hint_count || 0})
              </button>
            </div>
            {hints.length > 0 && (
              <div className="border border-border p-2 text-muted text-xs  space-y-1">
                {hints.map((h, i) => <div key={i}>&gt; {h}</div>)}
              </div>
            )}
          </div>

          <div className="flex flex-col bg-bg border border-border overflow-hidden">
            <div className="flex-1 min-h-[200px]"><CodeEditor value={code} onChange={setCode} language="python" /></div>
            <div className="p-2 border-t border-border">
              <button onClick={submit} disabled={busy}
                className="px-4 py-2 border border-accent-500 text-accent-700 bg-transparent hover:bg-accent-600 hover:text-white text-sm  disabled:opacity-30">
                {busy ? 'Simulating…' : 'Apply fix && load_test'}
              </button>
            </div>
          </div>

          <MetricsDashboard metrics={metrics} level={level} />
        </div>
      )}
    </div>
  );
}
