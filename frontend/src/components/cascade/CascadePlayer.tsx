import React, { useEffect, useMemo, useState } from 'react';
import { cascadeApi } from '../../lib/api';
import ReactFlow, { 
  Background, 
  Controls, 
  MarkerType, 
  Node, 
  Edge,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { SeverityBadge } from '../ui/SeverityBadge';
import { IconBolt, IconLightbulb, IconToolbox, IconShield, IconSkull, IconRefresh, IconSpinner } from '../ui/icons';

const USER_ID = 'demo-user';

const SEV_COLORS: Record<string, string> = {
  critical: 'bg-[#EF4444] text-white', 
  high: 'bg-orange-600 text-white', 
  medium: 'bg-amber-600 text-white', 
  low: 'bg-[#1E293B] text-[#F8FAFC]',
};

// Custom Node for ReactFlow
const DagNode = ({ data }: any) => {
  const isActive = data.isActive;
  const isVisited = data.isVisited;
  const isTerminal = data.type === 'terminal';
  const outcome = data.outcome;
  
  let borderColor = 'border-[#334155]';
  if (isActive) borderColor = 'border-[#22C55E] shadow-[0_0_15px_rgba(34,197,94,0.3)] ring-2 ring-[#22C55E]';
  else if (isTerminal) {
    if (outcome === 'survived') borderColor = 'border-[#22C55E] bg-[#0F172A]';
    else borderColor = 'border-[#EF4444] bg-[#0F172A]';
  } else if (isVisited) borderColor = 'border-slate-500';

  return (
    <div className={`px-4 py-3 rounded-lg border-2 bg-[#0F172A] text-[#F8FAFC] min-w-[200px] max-w-[250px] ${borderColor} transition-all duration-300`}>
      <Handle type="target" position={Position.Top} className="!bg-[#334155]" />
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] font-mono text-[#F8FAFC] opacity-70 truncate">{data.id}</span>
        {data.severity && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${SEV_COLORS[data.severity] || 'bg-[#1E293B]'}`}>
            {data.severity}
          </span>
        )}
      </div>
      <div className="text-xs leading-relaxed">{data.description}</div>
      <Handle type="source" position={Position.Bottom} className="!bg-[#334155]" />
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
      // Fetch DAG for visualization
      const d = await cascadeApi.dag(r.session_id);
      setRawDag(d);
    } catch (e: any) { setErr(String(e.message || e)); }
  };

  useEffect(() => { begin(); /* eslint-disable-next-line */ }, [archetype]);

  const fetchSummary = async (sessionId: string) => {
    try {
      const s = await cascadeApi.summary(sessionId);
      setSummary(s);
    } catch (e) { console.error("Could not fetch summary"); }
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

  // Build ReactFlow Nodes and Edges using Dagre for layout
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
          
          // Check if this transition is part of our taken path
          const isTaken = chain.some(c => c.from.node_id === n.id && c.to.node_id === t.to);

          edges.push({
            id: `e-${n.id}-${t.to}-${idx}`,
            source: n.id,
            target: t.to,
            animated: isTaken,
            style: {
              stroke: isTaken ? '#22C55E' : '#334155',
              strokeWidth: isTaken ? 3 : 1,
              opacity: isTaken ? 1 : 0.4,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: isTaken ? '#22C55E' : '#334155',
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
          isVisited
        },
      };
    });

    return { nodes, edges };
  }, [rawDag, chain, node]);

  return (
    <div className="flex flex-col h-screen bg-[#020617] text-[#F8FAFC] font-['Fira_Sans',sans-serif]">
      {/* Header */}
      <header className="flex-none px-6 py-4 border-b border-[#334155] bg-[#0F172A] flex justify-between items-center shadow-md z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold font-mono tracking-tight flex items-center gap-2">
            <IconBolt width={18} height={18} className="text-success" /> Cascade Engine
          </h1>
          <span className="text-sm bg-[#1A1E2F] px-3 py-1 rounded text-[#F8FAFC] border border-[#334155]">
            {name || archetype}
          </span>
        </div>
        <button onClick={begin} className="text-sm px-4 py-1.5 bg-[#1E293B] border border-[#334155] rounded hover:bg-[#334155] transition-colors font-mono">
          Restart Session
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Panel: Problem & Fix */}
        <div className="w-[450px] flex-none border-r border-[#334155] bg-[#0F172A] flex flex-col z-10 shadow-xl overflow-y-auto">
          {err && (
            <div className="m-4 bg-[#EF4444]/20 border border-[#EF4444] text-[#EF4444] p-3 rounded text-sm">
              Error: {err}
            </div>
          )}

          {node && !done && (
            <div className="p-6 flex flex-col gap-6">
              {/* Problem Statement */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-mono uppercase text-[#F8FAFC]/50 tracking-widest">Current Issue</h2>
                  <SeverityBadge severity={node.severity || node.type} />
                </div>
                
                <div className="bg-[#020617] p-4 rounded-lg border border-[#334155]">
                  <p className="text-sm leading-relaxed">{node.description}</p>
                </div>
                
                <div className="flex gap-2">
                  <span className="text-[10px] font-mono px-2 py-1 bg-[#1A1E2F] rounded text-[#22C55E] border border-[#334155]">
                    ID: {node.node_id}
                  </span>
                  {node.category && (
                    <span className="text-[10px] font-mono px-2 py-1 bg-[#1A1E2F] rounded text-[#F8FAFC] border border-[#334155]">
                      CAT: {node.category}
                    </span>
                  )}
                </div>
              </div>

              {/* Toolkit Suggestions */}
              {node.suggested_toolkit?.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-xs font-mono uppercase text-[#F8FAFC]/50 tracking-widest flex items-center gap-2">
                    <IconToolbox width={13} height={13} /> Toolkit Suggestions
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {node.suggested_toolkit.map((t: any, i: number) => (
                      <button 
                        key={i} 
                        onClick={() => setFix((f) => (f ? f + ' ' : '') + t.toolkit_key.replace(/_/g, ' '))}
                        className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                          t.relevant 
                            ? 'bg-[#22C55E]/10 border-[#22C55E]/50 text-[#22C55E] hover:bg-[#22C55E]/20' 
                            : 'bg-[#1E293B] border-[#334155] text-[#F8FAFC] hover:bg-[#334155]'
                        }`}
                        title={t.code}
                      >
                        {t.relevant && '★ '}{t.toolkit_key}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Fix Input */}
              <div className="space-y-2 flex-1">
                <h2 className="text-xs font-mono uppercase text-[#F8FAFC]/50 tracking-widest">Submit Fix</h2>
                <textarea
                  value={fix}
                  onChange={(e) => setFix(e.target.value)}
                  placeholder="Describe your fix/architecture change..."
                  className="w-full h-32 p-3 rounded-lg bg-[#020617] border border-[#334155] text-sm outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E] font-mono resize-none transition-all"
                />
                
                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={submitFix} 
                    disabled={busy || !fix.trim()}
                    className="flex-1 px-4 py-2 bg-[#22C55E] hover:bg-[#22C55E]/90 text-[#020617] rounded-lg font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {busy ? <span className="inline-flex items-center gap-1.5"><IconSpinner width={14} height={14}/> Evaluating…</span> : 'Apply Fix'}
                  </button>
                  <button 
                    onClick={revealHint} 
                    disabled={hintLevel >= (node.hint_count || 0)}
                    className="px-4 py-2 bg-[#1E293B] border border-[#334155] hover:bg-[#334155] rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
                  >
                    <IconLightbulb width={14} height={14} className="inline mr-1" /> Hint ({hintLevel}/{node.hint_count || 0})
                  </button>
                </div>
              </div>

              {/* Hints */}
              {hints.length > 0 && (
                <div className="space-y-2 mt-4 bg-[#1E293B]/50 p-4 rounded-lg border border-[#334155]">
                  {hints.map((h, i) => (
                    <div key={i} className="text-sm flex gap-2">
                      <IconLightbulb width={14} height={14} className="text-amber-400 mt-0.5 shrink-0" /> 
                      <span className="text-[#F8FAFC]/90">{h.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Chain Reaction Timeline (Bottom of Left Panel) */}
          <div className="p-6 border-t border-[#334155] bg-[#020617] flex-1 overflow-y-auto">
             <h2 className="text-xs font-mono uppercase text-[#F8FAFC]/50 tracking-widest mb-4">Chain Reaction Log</h2>
             {chain.length === 0 && !done && (
               <div className="text-xs text-[#F8FAFC]/40 italic">No actions taken yet.</div>
             )}
             <div className="space-y-4">
              {chain.map((c, i) => (
                <div key={i} className="relative pl-4 border-l-2 border-[#334155] pb-4 last:pb-0">
                  <div className="absolute w-2 h-2 bg-[#22C55E] rounded-full -left-[5px] top-1"></div>
                  <div className="text-[10px] font-mono text-[#F8FAFC]/40 mb-1">STEP {i + 1}</div>
                  <div className="text-xs text-[#F8FAFC]/80 mb-2">{c.from.description}</div>
                  <div className="bg-[#0F172A] border border-[#334155] rounded p-2 text-xs font-mono">
                    <span className="text-[#22C55E]">❯</span> {c.fix}
                  </div>
                  <div className="text-[10px] text-orange-400 mt-2 flex items-center gap-1 font-mono">
                    <span>↳</span> triggered {c.to.node_id}
                  </div>
                </div>
              ))}
             </div>
          </div>
        </div>

        {/* Right Panel: ReactFlow DAG Visualization */}
        <div className="flex-1 bg-[#020617] relative">
          {rawDag ? (
            <ReactFlow
              nodes={rfNodes}
              edges={rfEdges}
              nodeTypes={nodeTypes}
              fitView
              proOptions={{ hideAttribution: true }}
              className="bg-[#020617]"
            >
              <Background color="#1E293B" gap={16} />
              <Controls className="!bg-[#0F172A] !border-[#334155] !text-[#F8FAFC]" />
            </ReactFlow>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-[#F8FAFC]/50 font-mono">
              Loading DAG visualization...
            </div>
          )}

          {/* Post-Mortem Overlay */}
          {done && summary && (
            <div className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-[#0F172A] border border-[#334155] p-8 rounded-xl max-w-2xl w-full shadow-2xl">
                <div className="text-center mb-8">
                  <div className="flex justify-center mb-4">{done.status === 'survived' ? <IconShield width={48} height={48} className="text-success"/> : <IconSkull width={48} height={48} className="text-danger"/>}</div>
                  <h2 className="text-3xl font-bold mb-2">
                    {done.status === 'survived' ? 'System Stabilized' : 'Catastrophic Failure'}
                  </h2>
                  <div className="flex justify-center gap-4 text-sm font-mono text-[#F8FAFC]/60">
                    <span>Score: <strong className="text-[#22C55E] text-lg">{summary.score}</strong></span>
                    <span>Depth: <strong>{summary.depth}</strong></span>
                    <span>Hints: <strong>{summary.hints_used}</strong></span>
                  </div>
                </div>

                <div className="bg-[#020617] border border-[#334155] rounded-lg p-4 mb-6 max-h-64 overflow-y-auto">
                  <h3 className="text-xs font-mono uppercase text-[#F8FAFC]/50 tracking-widest mb-4">Post-Mortem Analysis</h3>
                  <div className="space-y-4">
                    {summary.path.map((p: any, i: number) => (
                      <div key={i} className="text-sm">
                        <div className="text-[10px] text-[#F8FAFC]/40 font-mono mb-1">STEP {p.step}</div>
                        <div className="mb-1"><span className="opacity-50">Issue:</span> {p.problem}</div>
                        <div className="mb-1 font-mono text-[#22C55E]"><span className="opacity-50 text-[#F8FAFC]">Fix:</span> {p.your_fix}</div>
                        <div className="text-orange-400"><span className="opacity-50">Result:</span> {p.led_to_problem}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center">
                  <button onClick={begin} className="px-6 py-3 bg-[#22C55E] text-[#020617] rounded-lg font-bold hover:bg-[#22C55E]/90 transition-colors">
                    Start New Simulation
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
