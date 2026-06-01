import React, { useEffect, useMemo, useState } from 'react';
import { cascadeApi } from '../../lib/api';
import ReactFlow, {
  Background, Controls, MarkerType, Node, Edge, Handle, Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { SeverityBadge } from '../ui/SeverityBadge';
import { IconBolt, IconLightbulb, IconToolbox, IconShield, IconSkull, IconRefresh, IconSpinner } from '../ui/icons';

const USER_ID = 'demo-user';

const SEV_COLORS: Record<string, string> = {
  critical: 'bg-black border border-[#ff3333] text-[#ff3333]',
  high: 'bg-black border border-[#ff3333] text-[#ff3333]',
  medium: 'bg-black border border-[#006622] text-[#006622]',
  low: 'bg-black border border-[#1a1a1a] text-slate-600',
};

const DagNode = ({ data }: any) => {
  const isActive = data.isActive;
  const isVisited = data.isVisited;
  const isTerminal = data.type === 'terminal';
  const outcome = data.outcome;

  let borderColor = 'border-[#1a1a1a]';
  if (isActive) borderColor = 'border-[#00ff41]';
  else if (isTerminal) {
    if (outcome === 'survived') borderColor = 'border-[#00ff41] bg-black';
    else borderColor = 'border-[#ff3333] bg-black';
  } else if (isVisited) borderColor = 'border-slate-700';

  return (
    <div className={`px-4 py-3 border bg-black text-[#00ff41] min-w-[200px] max-w-[250px] ${borderColor} transition-all duration-300 font-mono`}>
      <Handle type="target" position={Position.Top} className="!bg-[#1a1a1a]" />
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] text-slate-600 truncate">{data.id}</span>
        {data.severity && (
          <span className={`text-[10px] px-1.5 py-0.5 uppercase font-bold ${SEV_COLORS[data.severity] || 'border border-[#1a1a1a] text-slate-600'}`}>
            {data.severity}
          </span>
        )}
      </div>
      <div className="text-xs leading-relaxed text-slate-500">{data.description}</div>
      <Handle type="source" position={Position.Bottom} className="!bg-[#1a1a1a]" />
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
  const [rawDag, setRawDag] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);

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
      setChain((c) => [...c, { from: node, fix, to: r.next, reason: r.edge_reason }]);
      setFix(''); setHints([]); setHintLevel(0);
      setNode(r.next);
      if (r.status !== 'active') {
        setDone({ status: r.status, score: r.score });
        fetchSummary(sid);
      }
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
              stroke: isTaken ? '#00ff41' : '#1a1a1a',
              strokeWidth: isTaken ? 3 : 1,
              opacity: isTaken ? 1 : 0.4,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: isTaken ? '#00ff41' : '#1a1a1a',
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
    <div className="flex flex-col bg-black text-[#00ff41] font-mono" style={{ height: 'calc(100vh - 8rem)' }}>
      <header className="flex-none px-6 py-3 border-b border-[#1a1a1a] flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-bold flex items-center gap-2">
            <IconBolt width={14} height={14} className="text-[#00ff41]" /> $ cascade_engine
          </h1>
          <span className="text-xs border border-[#1a1a1a] px-2 py-0.5 text-slate-600">
            {name || archetype}
          </span>
        </div>
        <button onClick={begin} className="text-xs px-3 py-1 border border-[#1a1a1a] text-slate-500 hover:text-[#00ff41] hover:border-[#00ff41] bg-transparent">restart</button>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="w-[450px] flex-none border-r border-[#1a1a1a] bg-black flex flex-col overflow-y-auto">
          {err && (
            <div className="m-4 border border-[#ff3333] bg-[#ff3333]/10 text-[#ff3333] p-3 text-sm">&gt; error: {err}</div>
          )}

          {node && !done && (
            <div className="p-6 flex flex-col gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs uppercase text-slate-600 tracking-wider">$ current_issue</h2>
                  <SeverityBadge severity={node.severity || node.type} />
                </div>

                <div className="bg-black border border-[#1a1a1a] p-4">
                  <p className="text-sm leading-relaxed text-slate-500">{node.description}</p>
                </div>

                <div className="flex gap-2">
                  <span className="text-[10px] px-2 py-1 border border-[#1a1a1a] text-slate-600">id: {node.node_id}</span>
                  {node.category && (
                    <span className="text-[10px] px-2 py-1 border border-[#1a1a1a] text-slate-600">cat: {node.category}</span>
                  )}
                </div>
              </div>

              {node.suggested_toolkit?.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-xs uppercase text-slate-600 tracking-wider flex items-center gap-2">
                    <IconToolbox width={12} height={12} /> $ toolkit
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {node.suggested_toolkit.map((t: any, i: number) => (
                      <button
                        key={i}
                        onClick={() => setFix((f) => (f ? f + ' ' : '') + t.toolkit_key.replace(/_/g, ' '))}
                        className={`text-xs px-3 py-1.5 border transition-colors font-mono ${
                          t.relevant
                            ? 'border-[#00ff41] text-[#00ff41] bg-[#00ff41]/10'
                            : 'border-[#1a1a1a] text-slate-600 hover:border-slate-700'
                        }`}
                        title={t.code}
                      >
                        {t.relevant ? '> ' : '  '}{t.toolkit_key}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2 flex-1">
                <h2 className="text-xs uppercase text-slate-600 tracking-wider">$ submit_fix</h2>
                <textarea
                  value={fix}
                  onChange={(e) => setFix(e.target.value)}
                  placeholder="describe your fix..."
                  className="w-full h-32 p-3 bg-black border border-[#1a1a1a] text-sm text-[#00ff41] outline-none focus:border-[#00ff41] font-mono resize-none"
                />

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={submitFix}
                    disabled={busy || !fix.trim()}
                    className="flex-1 px-4 py-2 border border-[#00ff41] text-[#00ff41] bg-transparent hover:bg-[#00ff41]/10 text-sm font-mono disabled:opacity-30"
                  >
                    {busy ? <span className="inline-flex items-center gap-1.5"><IconSpinner width={14} height={14} /> evaluating...</span> : '$ apply_fix'}
                  </button>
                  <button
                    onClick={revealHint}
                    disabled={hintLevel >= (node.hint_count || 0)}
                    className="px-4 py-2 border border-[#1a1a1a] text-slate-500 hover:text-[#00ff41] hover:border-[#00ff41] text-xs font-mono disabled:opacity-30 bg-transparent"
                  >
                    $ hint ({hintLevel}/{node.hint_count || 0})
                  </button>
                </div>
              </div>

              {hints.length > 0 && (
                <div className="space-y-2 border border-[#1a1a1a] p-4">
                  {hints.map((h, i) => (
                    <div key={i} className="text-xs flex gap-2 text-slate-500 font-mono">
                      <span className="text-slate-600">&gt;</span>
                      <span>{h.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="p-6 border-t border-[#1a1a1a] bg-black flex-1 overflow-y-auto">
            <h2 className="text-xs uppercase text-slate-600 tracking-wider mb-4">$ chain_log</h2>
            {chain.length === 0 && !done && (
              <div className="text-xs text-slate-700 italic">no actions yet.</div>
            )}
            <div className="space-y-4">
              {chain.map((c, i) => (
                <div key={i} className="relative pl-4 border-l-2 border-[#1a1a1a] pb-4 last:pb-0">
                  <div className="absolute w-2 h-2 bg-[#00ff41] -left-[5px] top-1"></div>
                  <div className="text-[10px] text-slate-600 mb-1 font-mono">step {i + 1}</div>
                  <div className="text-xs text-slate-500 mb-2">{c.from.description}</div>
                  <div className="border border-[#1a1a1a] p-2 text-xs font-mono text-[#00ff41]">
                    &gt; {c.fix}
                  </div>
                  <div className="text-[10px] text-slate-600 mt-2 flex items-center gap-1 font-mono">
                    <span>{'->'}</span> {c.to.node_id}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 bg-black relative">
          {rawDag ? (
            <ReactFlow
              nodes={rfNodes}
              edges={rfEdges}
              nodeTypes={nodeTypes}
              fitView
              proOptions={{ hideAttribution: true }}
              className="bg-black"
            >
              <Background color="#0a0a0a" gap={16} />
              <Controls className="!bg-black !border-[#1a1a1a] !text-[#00ff41] [&_button]:!text-slate-600 [&_button:hover]:!text-[#00ff41]" />
            </ReactFlow>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-slate-700 font-mono">
              loading DAG...
            </div>
          )}

          {done && summary && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="bg-black border border-[#1a1a1a] p-8 max-w-2xl w-full">
                <div className="text-center mb-8">
                  <div className="flex justify-center mb-4">{done.status === 'survived' ? <IconShield width={40} height={40} className="text-[#00ff41]" /> : <IconSkull width={40} height={40} className="text-[#ff3333]" />}</div>
                  <h2 className="text-xl font-bold mb-2 font-mono">
                    {done.status === 'survived' ? '$ system_stabilized' : '> catastrophic_failure'}
                  </h2>
                  <div className="flex justify-center gap-4 text-xs font-mono text-slate-600">
                    <span>score: <strong className="text-[#00ff41]">{summary.score}</strong></span>
                    <span>depth: <strong>{summary.depth}</strong></span>
                    <span>hints: <strong>{summary.hints_used}</strong></span>
                  </div>
                </div>

                <div className="border border-[#1a1a1a] p-4 mb-6 max-h-64 overflow-y-auto">
                  <h3 className="text-xs uppercase text-slate-600 tracking-wider mb-4 font-mono">$ postmortem</h3>
                  <div className="space-y-4">
                    {summary.path.map((p: any, i: number) => (
                      <div key={i} className="text-xs font-mono">
                        <div className="text-[10px] text-slate-700 mb-1">step {p.step}</div>
                        <div className="mb-1 text-slate-500">issue: {p.problem}</div>
                        <div className="mb-1 text-[#00ff41]">fix: {p.your_fix}</div>
                        <div className="text-slate-600">result: {p.led_to_problem}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center">
                  <button onClick={begin} className="px-6 py-3 border border-[#00ff41] text-[#00ff41] bg-transparent hover:bg-[#00ff41]/10 font-mono">$ new_simulation</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
