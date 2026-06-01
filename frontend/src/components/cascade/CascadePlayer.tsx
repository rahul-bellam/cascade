import React from 'react';
import { cascadeApi } from '../../lib/api';

const USER_ID = 'demo-user';
const SEV: Record<string, string> = {
  critical: 'bg-red-600', high: 'bg-orange-600', medium: 'bg-amber-600', low: 'bg-slate-600',
};

export function CascadePlayer({ archetype = 'rate-limiter' }: { archetype?: string }) {
  const [sid, setSid] = React.useState<string | null>(null);
  const [name, setName] = React.useState('');
  const [node, setNode] = React.useState<any>(null);
  const [chain, setChain] = React.useState<any[]>([]);
  const [fix, setFix] = React.useState('');
  const [hints, setHints] = React.useState<any[]>([]);
  const [hintLevel, setHintLevel] = React.useState(0);
  const [done, setDone] = React.useState<any>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const begin = async () => {
    setErr(null); setChain([]); setDone(null); setHints([]); setHintLevel(0);
    try {
      const r = await cascadeApi.start(archetype, USER_ID);
      setSid(r.session_id); setName(r.name); setNode(r.current);
    } catch (e: any) { setErr(String(e.message || e)); }
  };

  React.useEffect(() => { begin(); /* eslint-disable-next-line */ }, [archetype]);

  const submitFix = async () => {
    if (!sid || !fix.trim()) return;
    setBusy(true); setErr(null);
    try {
      const r = await cascadeApi.fix(sid, fix);
      setChain((c) => [...c, { from: node, fix, to: r.next, reason: r.edge_reason }]);
      setFix(''); setHints([]); setHintLevel(0);
      setNode(r.next);
      if (r.status !== 'active') setDone({ status: r.status, score: r.score });
    } catch (e: any) { setErr(String(e.message || e)); }
    finally { setBusy(false); }
  };

  const revealHint = async () => {
    if (!sid) return;
    const next = Math.min(hintLevel + 1, node?.hint_count || 3);
    setHintLevel(next);
    try { const r = await cascadeApi.hint(sid, next); setHints(r.hints || []); }
    catch (e: any) { setErr(String(e.message || e)); }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">🔗 Cascade — {name || archetype}</h1>
        <button onClick={begin} className="text-sm px-3 py-1 bg-slate-700 rounded hover:bg-slate-600">Restart</button>
      </div>
      {err && <div className="bg-red-950/50 text-red-200 p-3 rounded mb-4 text-sm">Backend error: {err}<br/>Start the cascade-engine on :8090.</div>}

      {/* Chain history */}
      {chain.map((c, i) => (
        <div key={i} className="mb-3 opacity-80">
          <div className="text-xs text-slate-400">Step {i + 1}</div>
          <div className="bg-slate-800 rounded p-3 text-sm">
            <div className="text-slate-300">{c.from.description}</div>
            <div className="mt-1 text-cascade-200">🔧 your fix: <span className="italic">{c.fix}</span></div>
            <div className="mt-1 text-amber-300">↓ triggered → {c.to.node_id}</div>
          </div>
        </div>
      ))}

      {/* Current problem */}
      {node && !done && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2 py-0.5 rounded ${SEV[node.severity] || 'bg-slate-600'}`}>
              {node.severity || node.type}
            </span>
            <span className="text-xs text-slate-400">{node.category}</span>
            <span className="ml-auto text-xs text-slate-500">{node.node_id}</span>
          </div>
          <p className="text-lg mb-4">{node.description}</p>
          {node.suggested_toolkit && node.suggested_toolkit.length > 0 && (
            <div className="mb-3 bg-cascade-900/40 border border-cascade-800 rounded p-2">
              <div className="text-xs text-cascade-200 mb-1">🧰 From your Toolkit (click to use)</div>
              <div className="flex flex-wrap gap-2">
                {node.suggested_toolkit.map((t: any, i: number) => (
                  <button key={i} onClick={() => setFix((f) => (f ? f + ' ' : '') + t.toolkit_key.replace(/_/g, ' '))}
                    className={`text-xs px-2 py-1 rounded ${t.relevant ? 'bg-cascade-700 hover:bg-cascade-600' : 'bg-slate-700 hover:bg-slate-600'}`}
                    title={t.code}>
                    {t.relevant ? '⭐ ' : ''}{t.toolkit_key}
                  </button>
                ))}
              </div>
            </div>
          )}
          <textarea
            value={fix}
            onChange={(e) => setFix(e.target.value)}
            placeholder="Describe your fix… e.g. 'move counters to redis with ttl', 'add redis sentinel', 'use a lua script', 'crdt counters'"
            className="w-full h-24 p-3 rounded bg-slate-800 border border-slate-600 text-sm outline-none focus:border-cascade-500"
          />
          <div className="flex gap-2 mt-2 items-center">
            <button onClick={submitFix} disabled={busy || !fix.trim()}
              className="px-4 py-2 bg-cascade-500 hover:bg-cascade-600 rounded font-medium disabled:opacity-50">
              {busy ? 'Evaluating…' : 'Apply Fix →'}
            </button>
            <button onClick={revealHint} disabled={hintLevel >= (node.hint_count || 0)}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm disabled:opacity-40">
              💡 Hint ({hintLevel}/{node.hint_count || 0})
            </button>
          </div>
          {hints.length > 0 && (
            <div className="mt-3 bg-amber-950/40 border border-amber-800 rounded p-2 text-amber-200 text-sm space-y-1">
              {hints.map((h, i) => <div key={i}>💡 L{h.level}: {h.text}</div>)}
            </div>
          )}
        </div>
      )}

      {/* Terminal */}
      {done && node && (
        <div className={`rounded-xl p-6 text-center ${done.status === 'survived' ? 'bg-green-900/40 border border-green-600' : 'bg-red-900/40 border border-red-600'}`}>
          <div className="text-4xl mb-2">{done.status === 'survived' ? '🏆' : '💀'}</div>
          <div className="text-2xl font-bold mb-1">{done.status === 'survived' ? 'You survived the cascade!' : 'System failed'}</div>
          <p className="text-slate-300 mb-3">{node.description}</p>
          <div className="text-lg">Depth: {chain.length} · Score: <span className="font-bold">{done.score}</span></div>
          <button onClick={begin} className="mt-4 px-4 py-2 bg-cascade-500 hover:bg-cascade-600 rounded">Run again</button>
        </div>
      )}
    </div>
  );
}
