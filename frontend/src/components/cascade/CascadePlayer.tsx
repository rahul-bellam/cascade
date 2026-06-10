import React, { useEffect, useMemo, useState } from 'react';
import { cascadeApi } from '../../lib/api';
import ReactFlow, {
  Background, Controls, MarkerType, Node, Edge, Handle, Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { SeverityBadge } from '../ui/SeverityBadge';
import { IconBolt, IconLightbulb, IconToolbox, IconShield, IconSkull, IconSpinner, IconCheck, IconRefresh } from '../ui/icons';
import { FailureViz } from './FailureViz';

const USER_ID = 'demo-user';

const SEV_COLORS: Record<string, string> = {
  critical: 'bg-bg border border-danger text-danger',
  high: 'bg-bg border border-danger text-danger',
  medium: 'bg-bg border border-border text-muted',
  low: 'bg-bg border border-border text-muted',
};

const DagNode = ({ data }: any) => {
  const isActive = data.isActive;
  const isVisited = data.isVisited;
  const isTerminal = data.type === 'terminal';
  const outcome = data.outcome;

  let borderColor = 'border-border';
  if (isActive) borderColor = 'border-accent-500';
  else if (isTerminal) {
    if (outcome === 'survived') borderColor = 'border-accent-500 bg-bg';
    else borderColor = 'border-danger bg-bg';
  } else if (isVisited) borderColor = 'border-border';

  return (
    <div className={`px-4 py-3 border bg-bg text-accent-700 min-w-[200px] max-w-[250px] ${borderColor} transition-all duration-300 `}>
      <Handle type="target" position={Position.Top} className="!bg-surface-2" />
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] text-muted truncate">{data.id}</span>
        {data.severity && (
          <span className={`text-[10px] px-1.5 py-0.5 uppercase font-bold ${SEV_COLORS[data.severity] || 'border border-border text-muted'}`}>
            {data.severity}
          </span>
        )}
      </div>
      <div className="text-xs leading-relaxed text-muted">{data.description}</div>
      <Handle type="source" position={Position.Bottom} className="!bg-surface-2" />
    </div>
  );
};

const nodeTypes = { custom: DagNode };

export function CascadePlayer({ archetype = 'rate-limiter' }: { archetype?: string }) {
  const [sid, setSid] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [node, setNode] = useState<any>(null);
  const [chain, setChain] = useState<any[]>([]);
  const [fix, setFix] = useState('');
  const [hints, setHints] = useState<any[]>([]);
  const [hintLevel, setHintLevel] = useState(0);
  const [done, setDone] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [rawDag, setRawDag] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  // reasoning-first gate
  const [reasonMode, setReasonMode] = useState(true);
  const [diagnosis, setDiagnosis] = useState('');
  const [tradeoffs, setTradeoffs] = useState('');
  const [foresight, setForesight] = useState('');
  const [insight, setInsight] = useState<any>(null);   // {diagnosis_score,...,unlocked,process_hint}
  const [scoring, setScoring] = useState(false);
  const [reasonedCount, setReasonedCount] = useState(0);

  const begin = async () => {
    setErr(null); setChain([]); setDone(null); setHints([]); setHintLevel(0); setSummary(null);
    try {
      const r = await cascadeApi.start(archetype, USER_ID);
      setSid(r.session_id); setName(r.name); setNode(r.current);
      const d = await cascadeApi.dag(r.session_id);
      setRawDag(d);
    } catch (e: any) { setErr(String(e.message || e)); }
  };

  useEffect(() => { begin(); }, [archetype]);

  const fetchSummary = async (sessionId: string) => {
    try {
      const s = await cascadeApi.summary(sessionId);
      setSummary(s);
    } catch (e) { /* ignore */ }
  };

  const submitFix = async () => {
    if (!sid || !fix.trim()) return;
    setBusy(true); setErr(null);
    try {
      const r = await cascadeApi.fix(sid, fix);
      // brief "you fixed it" beat: flash the current viz to recovering before the next failure
      setRecovering(true);
      await new Promise((res) => setTimeout(res, 900));
      setRecovering(false);
      setChain((c) => [...c, { from: node, fix, to: r.next, reason: r.edge_reason, reasoned: insight?.unlocked }]);
      if (insight?.unlocked) setReasonedCount((n) => n + 1);
      setFix(''); setHints([]); setHintLevel(0);
      setDiagnosis(''); setTradeoffs(''); setForesight(''); setInsight(null);
      setNode(r.next);
      if (r.status !== 'active') {
        setDone({ status: r.status, score: r.score });
        fetchSummary(sid);
      }
    } catch (e: any) { setErr(String(e.message || e)); }
    finally { setBusy(false); }
  };

  const submitReasoning = async () => {
    if (!sid) return;
    setScoring(true); setErr(null);
    try {
      const r = await cascadeApi.insight(sid, diagnosis, tradeoffs, foresight);
      setInsight(r);
    } catch (e: any) { setErr(String(e.message || e)); }
    finally { setScoring(false); }
  };

  const revealHint = async () => {
    if (!sid) return;
    const next = Math.min(hintLevel + 1, node?.hint_count || 3);
    setHintLevel(next);
    try { const r = await cascadeApi.hint(sid, next); setHints(r.hints || []); }
    catch (e: any) { setErr(String(e.message || e)); }
  };

  const { nodes: rfNodes, edges: rfEdges } = useMemo(() => {
    if (!rawDag) return { nodes: [], edges: [] };

    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 80 });
    g.setDefaultEdgeLabel(() => ({}));

    const pathNodeIds = new Set(chain.map(c => c.from.node_id));
    if (node) pathNodeIds.add(node.node_id);

    rawDag.nodes.forEach((n: any) => {
      g.setNode(n.id, { width: 250, height: 120 });
    });

    const edges: Edge[] = [];
    rawDag.nodes.forEach((n: any) => {
      if (n.transitions) {
        n.transitions.forEach((t: any, idx: number) => {
          g.setEdge(n.id, t.to);

          const isTaken = chain.some(c => c.from.node_id === n.id && c.to.node_id === t.to);

          edges.push({
            id: `e-${n.id}-${t.to}-${idx}`,
            source: n.id,
            target: t.to,
            animated: isTaken,
            style: {
              stroke: isTaken ? '#3d7d6c' : '#e6e0d6',
              strokeWidth: isTaken ? 3 : 1,
              opacity: isTaken ? 1 : 0.4,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: isTaken ? '#3d7d6c' : '#e6e0d6',
            },
          });
        });
      }
    });

    dagre.layout(g);

    const nodes: Node[] = rawDag.nodes.map((n: any) => {
      const nodeWithPosition = g.node(n.id);
      const isActive = node?.node_id === n.id;
      const isVisited = pathNodeIds.has(n.id);

      return {
        id: n.id,
        type: 'custom',
        position: {
          x: nodeWithPosition.x - 125,
          y: nodeWithPosition.y - 60,
        },
        data: {
          ...n,
          isActive,
          isVisited,
        },
      };
    });

    return { nodes, edges };
  }, [rawDag, chain, node]);

  return (
    <div className="flex flex-col bg-bg text-accent-700 " style={{ height: 'calc(100vh - 8rem)' }}>
      <header className="flex-none px-6 py-3 border-b border-border flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-bold flex items-center gap-2">
            <IconBolt width={14} height={14} className="text-accent-700" /> Cascade
          </h1>
          <span className="text-xs border border-border px-2 py-0.5 text-muted">
            {name || archetype}
          </span>
        </div>
        <button onClick={begin} className="text-xs px-3 py-1 border border-border text-muted hover:bg-surface-2 hover:text-white bg-transparent">restart</button>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="w-[450px] flex-none border-r border-border bg-bg flex flex-col overflow-y-auto">
          {err && (
            <div className="m-4 border border-danger bg-danger/10 text-danger p-3 text-sm">Error: {err}</div>
          )}

          {node && !done && (
            <div className="p-6 flex flex-col gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs uppercase text-muted tracking-wider">Current issue</h2>
                  <SeverityBadge severity={node.severity || node.type} />
                </div>

                <div className="bg-bg border border-border p-4">
                  <p className="text-sm leading-relaxed text-muted">{node.description}</p>
                </div>

                {!node.is_terminal && node.type !== 'terminal' && (
                  <FailureViz category={node.category} severity={node.severity}
                    state={recovering ? 'recovering' : 'failing'} />
                )}

                <div className="flex gap-2">
                  <span className="text-[10px] px-2 py-1 border border-border text-muted">id: {node.node_id}</span>
                  {node.category && (
                    <span className="text-[10px] px-2 py-1 border border-border text-muted">cat: {node.category}</span>
                  )}
                </div>
              </div>

              {node.suggested_toolkit?.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-xs uppercase text-muted tracking-wider flex items-center gap-2">
                    <IconToolbox width={12} height={12} /> From your toolkit
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {node.suggested_toolkit.map((t: any, i: number) => (
                      <button
                        key={i}
                        onClick={() => setFix((f) => (f ? f + ' ' : '') + t.toolkit_key.replace(/_/g, ' '))}
                        className={`text-xs px-3 py-1.5 border transition-colors  ${
                          t.relevant
                            ? 'border-accent-500 text-accent-700 bg-accent-600/10'
                            : 'border-border text-muted hover:border-border'
                        }`}
                        title={t.code}
                      >
                        {t.relevant ? '> ' : '  '}{t.toolkit_key}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3 flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs uppercase text-muted tracking-wider">
                    {reasonMode && node.has_reasoning ? 'Reason, then fix' : 'Submit fix'}
                  </h2>
                  {node.has_reasoning && (
                    <label className="flex items-center gap-1.5 text-[11px] text-muted cursor-pointer select-none">
                      <input type="checkbox" checked={reasonMode}
                        onChange={(e) => { setReasonMode(e.target.checked); setInsight(null); }}
                        className="accent-[color:var(--accent-600,#2f6457)]" />
                      Reason-first
                    </label>
                  )}
                </div>

                {/* reasoning gate */}
                {reasonMode && node.has_reasoning && !insight?.unlocked && (
                  <div className="space-y-2 rounded-xl border border-border bg-bg p-3">
                    <p className="text-xs text-muted">
                      Before you touch the fix, reason about it. An AI scores your thinking against the
                      real failure model.
                    </p>
                    <ReasonField label="What's actually failing & why" value={diagnosis} onChange={setDiagnosis}
                      score={insight?.diagnosis_score} />
                    <ReasonField label="What's the trade-off of your fix" value={tradeoffs} onChange={setTradeoffs}
                      score={insight?.tradeoff_score} />
                    <ReasonField label="What new failure might it cause" value={foresight} onChange={setForesight}
                      score={insight?.foresight_score} />
                    {insight?.process_hint && (
                      <div className="flex items-start gap-2 rounded-lg border border-border bg-surface-2 p-2 text-xs text-muted">
                        <IconLightbulb width={13} height={13} className="mt-0.5 shrink-0 text-accent-700" />
                        {insight.process_hint}
                      </div>
                    )}
                    <button onClick={submitReasoning}
                      disabled={scoring || !diagnosis.trim()}
                      className="w-full rounded-full bg-accent-600 px-4 py-2 text-sm font-500 text-white transition hover:bg-accent-700 disabled:opacity-40">
                      {scoring ? 'Scoring your reasoning…' : insight ? 'Re-check reasoning' : 'Check my reasoning'}
                    </button>
                  </div>
                )}

                {/* unlocked confirmation */}
                {reasonMode && node.has_reasoning && insight?.unlocked && (
                  <div className="flex items-center gap-2 rounded-lg border border-accent-500 bg-accent-100 p-2 text-xs text-accent-700">
                    <IconCheck width={14} height={14} /> Reasoning accepted ({Math.round((insight.total || 0) * 100)}%). Now apply your fix.
                  </div>
                )}

                {/* fix box — locked until reasoning passes (when reason-first is on) */}
                <textarea
                  value={fix}
                  onChange={(e) => setFix(e.target.value)}
                  placeholder={reasonMode && node.has_reasoning && !insight?.unlocked ? 'Unlock by reasoning above first…' : 'Describe your fix…'}
                  disabled={reasonMode && node.has_reasoning && !insight?.unlocked}
                  className="w-full h-28 p-3 bg-bg border border-border text-sm text-fg outline-none focus:border-accent-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                />

                <div className="flex gap-2">
                  <button
                    onClick={submitFix}
                    disabled={busy || !fix.trim() || (reasonMode && node.has_reasoning && !insight?.unlocked)}
                    className="flex-1 rounded-full bg-accent-600 px-4 py-2 text-sm font-500 text-white transition hover:bg-accent-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {busy ? <span className="inline-flex items-center gap-1.5"><IconSpinner width={14} height={14} /> Evaluating…</span> : 'Apply fix'}
                  </button>
                  <button
                    onClick={revealHint}
                    disabled={hintLevel >= (node.hint_count || 0)}
                    className="rounded-full border border-border px-4 py-2 text-xs text-muted transition hover:bg-surface-2 hover:text-fg disabled:opacity-30"
                  >
                    Hint ({hintLevel}/{node.hint_count || 0})
                  </button>
                </div>
              </div>

              {hints.length > 0 && (
                <div className="space-y-2 border border-border p-4">
                  {hints.map((h, i) => (
                    <div key={i} className="text-xs flex gap-2 text-muted ">
                      <span className="text-muted">&gt;</span>
                      <span>{h.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="p-6 border-t border-border bg-bg flex-1 overflow-y-auto">
            <h2 className="text-xs uppercase text-muted tracking-wider mb-4">Chain log</h2>
            {chain.length === 0 && !done && (
              <div className="text-xs text-muted italic">no actions yet.</div>
            )}
            <div className="space-y-4">
              {chain.map((c, i) => (
                <div key={i} className="relative pl-4 border-l-2 border-border pb-4 last:pb-0">
                  <div className="absolute w-2 h-2 bg-accent-600 -left-[5px] top-1"></div>
                  <div className="text-[10px] text-muted mb-1 ">step {i + 1}</div>
                  <div className="text-xs text-muted mb-2">{c.from.description}</div>
                  <div className="border border-border p-2 text-xs  text-accent-700">
                    &gt; {c.fix}
                  </div>
                  <div className="text-[10px] text-muted mt-2 flex items-center gap-1 ">
                    <span>{'->'}</span> {c.to.node_id}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 bg-bg relative">
          {rawDag ? (
            <ReactFlow
              nodes={rfNodes}
              edges={rfEdges}
              nodeTypes={nodeTypes}
              fitView
              proOptions={{ hideAttribution: true }}
              className="bg-bg"
            >
              <Background color="#fffdfa" gap={16} />
              <Controls className="!bg-bg !border-border !text-muted [&_button]:!text-muted [&_button:hover]:!text-accent-700" />
            </ReactFlow>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted ">
              loading DAG...
            </div>
          )}

          {done && summary && (
            <Outcome done={done} summary={summary} name={name} onRestart={begin} />
          )}
        </div>
      </main>
    </div>
  );
}

/* ---- celebratory end-of-run screen ---- */
function rankFor(depth: number, survived: boolean): { title: string; note: string } {
  if (!survived) return { title: 'System Down', note: 'The chain won this time.' };
  if (depth >= 6) return { title: 'Principal Firefighter', note: 'You saw failures before they happened.' };
  if (depth >= 4) return { title: 'Staff Responder', note: 'Deep survival under pressure.' };
  if (depth >= 2) return { title: 'On-call Engineer', note: 'Solid incident instincts.' };
  return { title: 'First Responder', note: 'You made it out.' };
}

function Outcome({ done, summary, name, onRestart }:
  { done: any; summary: any; name: string; onRestart: () => void }) {
  const survived = done.status === 'survived';
  const rank = rankFor(summary.depth, survived);
  const [score, setScore] = React.useState(0);
  const [copied, setCopied] = React.useState(false);

  // count-up score
  React.useEffect(() => {
    const target = summary.score || 0;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setScore(target); return; }
    const start = performance.now(); let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 900);
      setScore(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [summary.score]);

  const shareText = `I survived ${summary.depth} cascading failure${summary.depth === 1 ? '' : 's'} in the ${name} cascade on Cascade — rank: ${rank.title} (${summary.score} pts).`;
  const share = async () => {
    try { await navigator.clipboard.writeText(shareText); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-bg/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg animate-fade-in-up rounded-2xl border border-border bg-surface p-8 shadow-lift">
        <div className="text-center">
          <div className={`mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full ${survived ? 'bg-accent-100 text-accent-700' : 'bg-danger/10 text-danger'}`}>
            {survived ? <IconShield width={30} height={30} /> : <IconSkull width={30} height={30} />}
          </div>
          <div className="mb-1 text-xs uppercase tracking-[0.18em] text-muted">{survived ? 'You survived' : 'You went down'}</div>
          <h2 className="font-serif text-3xl font-600">{rank.title}</h2>
          <p className="mt-1 text-sm text-muted">{rank.note}</p>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <Stat label="Score" value={score} accent />
            <Stat label="Depth" value={summary.depth} />
            <Stat label="Hints" value={summary.hints_used} />
          </div>
        </div>

        {/* post-mortem timeline */}
        <div className="mt-6 max-h-52 overflow-y-auto rounded-xl border border-border bg-bg p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted">
            <IconCheck width={13} height={13} /> Post-mortem
          </h3>
          <ol className="space-y-2.5">
            {summary.path.map((p: any, i: number) => (
              <li key={i} className="text-xs">
                <span className="font-mono text-muted">{String(i + 1).padStart(2, '0')}</span>{' '}
                <span className="text-fg">{p.problem}</span>
                <div className="ml-5 text-accent-700">↳ {p.your_fix}</div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button onClick={onRestart}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-accent-600 px-5 py-2.5 font-500 text-white transition hover:bg-accent-700">
            <IconRefresh width={15} height={15} /> Run again
          </button>
          <button onClick={share}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-5 py-2.5 font-500 text-fg transition hover:border-accent-300">
            {copied ? 'Copied!' : 'Share result'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-bg py-3 text-center">
      <div className={`font-serif text-2xl font-600 tabular-nums ${accent ? 'text-accent-700' : 'text-fg'}`}>{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
    </div>
  );
}

/* a labeled reasoning input with an optional per-axis score pill */
function ReasonField({ label, value, onChange, score }:
  { label: string; value: string; onChange: (v: string) => void; score?: number }) {
  const pct = score != null ? Math.round(score * 100) : null;
  const tone = pct == null ? '' : pct >= 50 ? 'text-accent-700' : pct >= 30 ? 'text-warn' : 'text-danger';
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] text-muted">{label}</span>
        {pct != null && <span className={`text-[11px] font-mono ${tone}`}>{pct}%</span>}
      </div>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2}
        className="w-full resize-none rounded-lg border border-border bg-surface p-2 text-xs text-fg outline-none focus:border-accent-400" />
    </div>
  );
}
