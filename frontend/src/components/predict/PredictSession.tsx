import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { predictApi } from '../../lib/api';

const Monaco = dynamic(() => import('@monaco-editor/react').then((m) => m.default), {
  ssr: false,
  loading: () => <div className="p-3 text-muted text-sm ">loading editor...</div>,
});

const USER_ID = 'demo-user';

type Phase = 'start' | 'predict' | 'insight' | 'implement' | 'result' | 'complete';

const PHASE_MAP: Record<Phase, { label: string; color: string }> = {
  start: { label: 'Start', color: 'text-muted' },
  predict: { label: 'Predict', color: 'text-accent-700' },
  insight: { label: 'Reason', color: 'text-accent-700' },
  implement: { label: 'Implement', color: 'text-danger' },
  result: { label: 'Result', color: 'text-accent-700' },
  complete: { label: 'Complete', color: 'text-accent-700' },
};

export function PredictSession({ archetype = 'rate-limiter' }: { archetype?: string }) {
  const [sid, setSid] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('start');
  const [name, setName] = useState('');
  const [node, setNode] = useState<any>(null);
  const [expectedFailures, setExpectedFailures] = useState<string[]>([]);

  const [prediction, setPrediction] = useState('');
  const [predictionResult, setPredictionResult] = useState<any>(null);

  const [diagnosis, setDiagnosis] = useState('');
  const [tradeoffs, setTradeoffs] = useState('');
  const [foresight, setForesight] = useState('');
  const [insightResult, setInsightResult] = useState<any>(null);

  const [fix, setFix] = useState('');
  const [fixResult, setFixResult] = useState<any>(null);

  const [round, setRound] = useState(1);
  const [depth, setDepth] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const begin = async () => {
    setLoading(true); setError(null);
    try {
      const r = await predictApi.start(archetype, USER_ID);
      setSid(r.session_id);
      setName(r.name);
      setNode(r.current);
      setExpectedFailures(r.expected_failures || []);
      setPhase('predict');
      setRound(1); setDepth(0);
      setPrediction(''); setPredictionResult(null);
      setDiagnosis(''); setTradeoffs(''); setForesight('');
      setInsightResult(null); setFix(''); setFixResult(null);
    } catch (e: any) {
      setError(String(e.message || e));
    } finally { setLoading(false); }
  };

  useEffect(() => { begin(); }, [archetype]);

  const submitPrediction = async () => {
    if (!sid || !prediction.trim()) return;
    setLoading(true); setError(null);
    try {
      const r = await predictApi.predict(sid, prediction);
      setPredictionResult(r);
      setPhase('insight');
    } catch (e: any) { setError(String(e.message || e)); }
    finally { setLoading(false); }
  };

  const submitInsight = async () => {
    if (!sid) return;
    setLoading(true); setError(null);
    try {
      const r = await predictApi.insight(sid, diagnosis, tradeoffs, foresight);
      setInsightResult(r);
      setPhase('implement');
    } catch (e: any) { setError(String(e.message || e)); }
    finally { setLoading(false); }
  };

  const submitFix = async () => {
    if (!sid) return;
    setLoading(true); setError(null);
    try {
      const r = await predictApi.fix(sid, fix);
      setFixResult(r);
      setDepth(r.depth || 0);
      if (r.phase === 'complete') {
        setPhase('complete'); setNode(null);
      } else {
        setPhase('result');
        setRound(r.round || round + 1);
        setPrediction(''); setPredictionResult(null);
        setDiagnosis(''); setTradeoffs(''); setForesight('');
        setInsightResult(null); setFix(''); setFixResult(null);
        if (r.actual_description) {
          setNode({ description: r.actual_description, node_id: r.to_node });
        }
      }
    } catch (e: any) { setError(String(e.message || e)); }
    finally { setLoading(false); }
  };

  const nextRound = async () => {
    if (!sid) return;
    setLoading(true); setError(null);
    try {
      const r = await predictApi.current(sid);
      setNode(r.current);
      setExpectedFailures(r.expected_failures || []);
      setPhase('predict');
    } catch (e: any) { setError(String(e.message || e)); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-bg text-accent-700">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
          <div>
            <h1 className="text-lg font-bold tracking-wide">Predict & resolve</h1>
            <p className="text-sm text-muted">{name || archetype} — round {round} (depth {depth})</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2 text-xs ">
              {(Object.entries(PHASE_MAP) as [Phase, typeof PHASE_MAP['predict']][]).map(([p, ps]) => {
                const isActive = phase === p;
                return (
                  <span key={p} className={`px-2 py-1 border ${isActive ? 'border-accent-500 ' + ps.color + ' bg-accent-600/10' : 'border-border text-muted'}`}>
                    {ps.label}
                  </span>
                );
              })}
            </div>
            <button onClick={begin} className="text-xs px-3 py-1 border border-border text-muted hover:bg-surface-2 hover:text-white">restart</button>
          </div>
        </div>

        {error && <div className="border border-danger bg-danger/10 text-danger p-3 mb-3 text-sm ">Error: {error}</div>}
        {loading && <div className="text-center py-12 text-muted animate-pulse ">&gt; processing...</div>}

        {node && phase !== 'complete' && (
          <div className="border border-border p-4 mb-4">
            <div className="text-xs text-muted mb-1 ">System state</div>
            <div className="text-sm  text-muted">{node.description}</div>
            {node.severity && (
              <span className={`inline-block mt-2 text-xs px-2 py-0.5 border  ${
                node.severity === 'critical' ? 'border-danger text-danger bg-danger/10' :
                node.severity === 'high' ? 'border-danger text-danger' :
                'border-border text-muted'
              }`}>
                {node.severity}
              </span>
            )}
          </div>
        )}

        {phase === 'predict' && (
          <div className="border border-border p-4">
            <h2 className="text-sm font-bold text-accent-700 mb-2 ">Predict the failure</h2>
            <p className="text-xs text-muted mb-3 ">Based on the system state, describe the failure you expect.</p>
            {expectedFailures.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-muted mb-1 "># clues</div>
                <ul className="text-xs text-muted space-y-1 ">
                  {expectedFailures.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-accent-700">$</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <textarea
              className="w-full bg-bg border border-border p-3 text-sm  text-accent-700 placeholder-[#78716c] outline-none focus:border-accent-500"
              rows={3}
              placeholder="describe the failure..."
              value={prediction}
              onChange={(e) => setPrediction(e.target.value)}
            />
            <button
              className="mt-3 px-4 py-2 border border-accent-500 text-accent-700 bg-transparent hover:bg-accent-600 hover:text-white text-sm  disabled:opacity-30"
              disabled={loading || !prediction.trim()}
              onClick={submitPrediction}
            >
              Submit_prediction
            </button>
          </div>
        )}

        {phase === 'insight' && (
          <div className="space-y-4">
            {predictionResult && (
              <div className="border border-border p-4 mb-4">
                <div className="text-xs text-muted mb-1 ">Prediction score</div>
                <div className="text-2xl font-bold text-accent-700 ">{predictionResult.prediction_score}%</div>
                <div className="text-xs text-muted mt-1 ">best match: {predictionResult.best_match}</div>
                {predictionResult.candidates && predictionResult.candidates.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-muted mb-1 "># reachable failures</div>
                    {predictionResult.candidates.map((c: any, i: number) => (
                      <div key={i} className="text-xs text-muted  flex justify-between">
                        <span>{c.node_id}: {c.description}</span>
                        <span className="text-accent-700">{c.score}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="border border-border p-4">
              <h2 className="text-sm font-bold text-accent-700 mb-2 ">Explain your reasoning</h2>
              <p className="text-xs text-muted mb-3 ">Diagnose root cause, describe tradeoffs, anticipate downstream risks.</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted block mb-1 "># diagnosis — root cause</label>
                  <textarea className="w-full bg-bg border border-border p-2 text-sm  text-accent-700 placeholder-[#78716c] outline-none focus:border-accent-500" rows={2} placeholder="e.g. no persistence on rate limit counters..." value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted block mb-1 "># tradeoffs — cost of fix</label>
                  <textarea className="w-full bg-bg border border-border p-2 text-sm  text-accent-700 placeholder-[#78716c] outline-none focus:border-accent-500" rows={2} placeholder="e.g. adds latency, operational overhead..." value={tradeoffs} onChange={(e) => setTradeoffs(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted block mb-1 "># foresight — new failure from fix</label>
                  <textarea className="w-full bg-bg border border-border p-2 text-sm  text-accent-700 placeholder-[#78716c] outline-none focus:border-accent-500" rows={2} placeholder="e.g. redis becomes SPOF..." value={foresight} onChange={(e) => setForesight(e.target.value)} />
                </div>
              </div>
              <button className="mt-3 px-4 py-2 border border-accent-500 text-accent-700 bg-transparent hover:bg-accent-600 hover:text-white text-sm  disabled:opacity-30" disabled={loading} onClick={submitInsight}>
                Submit_reasoning
              </button>
            </div>
          </div>
        )}

        {phase === 'implement' && (
          <div className="space-y-4">
            {insightResult && (
              <div className="border border-border p-4 mb-4">
                <div className="text-xs text-muted mb-1 ">Insight scores</div>
                <div className="flex gap-4 text-sm  text-accent-700">
                  <span>diagnosis: <strong>{insightResult.insight_score?.diagnosis_score ?? '—'}</strong></span>
                  <span>tradeoffs: <strong>{insightResult.insight_score?.tradeoff_score ?? '—'}</strong></span>
                  <span>foresight: <strong>{insightResult.insight_score?.foresight_score ?? '—'}</strong></span>
                  <span>total: <strong>{insightResult.insight_score?.total ?? '—'}</strong></span>
                </div>
                {insightResult.insight_score?.unlocked === false && (
                  <div className="text-xs text-muted mt-1 ">hint: {insightResult.insight_score?.process_hint}</div>
                )}
              </div>
            )}
            <div className="border border-border p-4">
              <h2 className="text-sm font-bold text-danger mb-2 ">Implement the fix</h2>
              <p className="text-xs text-muted mb-3 ">Write the fix.</p>
              <div className="border border-border">
                <Monaco
                  height="200px"
                  language="python"
                  theme="hc-black"
                  value={fix}
                  onChange={(v: any) => setFix(v || '')}
                  options={{ minimap: { enabled: false }, fontSize: 13, lineNumbers: 'off', fontFamily: 'JetBrains Mono' }}
                />
              </div>
              <button className="mt-3 px-4 py-2 border border-danger text-danger bg-transparent hover:bg-danger hover:text-white text-sm  disabled:opacity-30" disabled={loading} onClick={submitFix}>
                Submit fix
              </button>
            </div>
          </div>
        )}

        {phase === 'result' && fixResult && (
          <div className="space-y-4">
            <div className="border border-border p-4">
              <h2 className="text-sm font-bold text-accent-700 mb-2 ">Round result</h2>
              <div className="grid grid-cols-2 gap-4 text-sm ">
                <div>
                  <div className="text-xs text-muted">prediction_accuracy</div>
                  <div className="text-xl font-bold text-accent-700">{fixResult.prediction_accuracy}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted">predicted</div>
                  <div className="text-sm text-muted">{fixResult.predicted_description || fixResult.predicted_node || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted">actual_failure</div>
                  <div className="text-sm text-muted">{fixResult.actual_description}</div>
                </div>
                <div>
                  <div className="text-xs text-muted">status</div>
                  <div className={`text-sm ${fixResult.status === 'survived' ? 'text-accent-700' : fixResult.status === 'failed' ? 'text-danger' : 'text-muted'}`}>
                    {fixResult.status}
                  </div>
                </div>
              </div>
            </div>
            <button className="px-4 py-2 border border-accent-500 text-accent-700 bg-transparent hover:bg-accent-600 hover:text-white text-sm " onClick={nextRound}>
              Continue
            </button>
          </div>
        )}

        {phase === 'complete' && fixResult && (
          <div className="border border-accent-500 p-8 text-center">
            <h2 className="text-lg font-bold text-accent-700 mb-2 ">Session complete</h2>
            <p className="text-muted mb-4  text-sm">reached terminal state after {depth} rounds.</p>
            <div className="text-sm text-muted mb-6 ">
              <div>status: <span className={fixResult.status === 'survived' ? 'text-accent-700' : 'text-danger'}>{fixResult.status}</span></div>
              <div>final_node: {fixResult.to_node}</div>
              <div>description: {fixResult.actual_description}</div>
            </div>
            <button className="px-6 py-3 border border-accent-500 text-accent-700 bg-transparent hover:bg-accent-600 hover:text-white " onClick={begin}>
              Restart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
