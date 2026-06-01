import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { refactorApi } from '../../lib/api';

const ForceGraph2D = dynamic(() => import('react-force-graph').then((m) => m.ForceGraph2D), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full text-[#c0c0c0] font-mono text-sm">loading graph...</div>,
});

const Monaco = dynamic(() => import('@monaco-editor/react').then((m) => m.default), {
  ssr: false,
  loading: () => <div className="p-3 text-[#c0c0c0] text-sm font-mono">loading editor...</div>,
});

export function CodebaseExplorer({ codebase = "payment-monolith" }: { codebase?: string }) {
  const [sid, setSid] = useState<string | null>(null);
  const [depGraph, setDepGraph] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 600 });

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
      });
    }
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const startRes = await refactorApi.start(codebase, "demo-user");
        setSid(startRes.session_id);
        const deps = await refactorApi.deps(startRes.session_id);
        setDepGraph(deps);
        if (deps.nodes && deps.nodes.length > 0) {
          const first = deps.nodes[0].id;
          handleFileSelect(startRes.session_id, first);
        }
      } catch (err: any) {
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [codebase]);

  const handleFileSelect = async (sessionId: string, path: string) => {
    setSelectedFile(path);
    try {
      const res = await refactorApi.file(sessionId, path);
      setFileContent(res.content);
    } catch (err) {
      setFileContent('// Error loading file');
    }
  };

  const handleNodeClick = useCallback((node: any) => {
    if (sid) handleFileSelect(sid, node.id);
  }, [sid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-[#c0c0c0] font-mono">
        <div className="animate-pulse">$ analyzing codebase...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-[#ff3333] font-mono">
        &gt; failed: {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-black text-[#00ff41] font-mono" style={{ height: 'calc(100vh - 8rem)' }}>
      <header className="flex-none px-6 py-3 border-b border-[#1a1a1a] flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-bold">$ refactor_explorer</h1>
          <span className="text-xs border border-[#1a1a1a] px-2 py-0.5 text-[#c0c0c0]">{codebase}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-[#c0c0c0]">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-[#ff3333] inline-block"></span> high coupling
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-[#00ff41] inline-block"></span> standard
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-[#ff3333] inline-block"></span> selected
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="w-64 flex-none border-r border-[#1a1a1a] flex flex-col overflow-y-auto">
          <div className="p-3 text-xs text-[#c0c0c0] border-b border-[#1a1a1a]">$ files</div>
          <div className="py-1">
            {depGraph?.files && Object.keys(depGraph.files).sort().map(path => {
              const info = depGraph.files[path];
              const isSelected = selectedFile === path;
              const hasHighCoupling = info.imports.length > 5 || info.global_vars.length > 0;

              return (
                <div
                  key={path}
                  onClick={() => sid && handleFileSelect(sid, path)}
                  className={`px-3 py-1.5 cursor-pointer text-xs border-l-2 flex justify-between items-center transition-colors
                    ${isSelected
                      ? 'border-[#ff3333] bg-[#ff3333]/10 text-[#00ff41]'
                      : 'border-transparent text-[#c0c0c0] hover:text-[#00ff41] hover:border-[#c0c0c0]'
                    }`}
                >
                  <span className="truncate">{path}</span>
                  {hasHighCoupling && <span className="w-1.5 h-1.5 bg-[#ff3333] inline-block flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 border-r border-[#1a1a1a] bg-black relative" ref={containerRef}>
          <div className="absolute top-3 left-3 z-10 border border-[#1a1a1a] bg-black/90 p-3 text-xs text-[#c0c0c0] pointer-events-none font-mono">
            <div className="font-bold text-[#00ff41] mb-1">$ metrics</div>
            <div>files: {depGraph?.metrics?.total_files}</div>
            <div>functions: {depGraph?.metrics?.total_functions}</div>
            <div>global_state_refs: {depGraph?.metrics?.total_global_state}</div>
            {depGraph?.metrics?.god_functions?.length > 0 && (
              <div className="mt-1 text-[#ff3333]">
                &gt; god_functions: {depGraph.metrics.god_functions.join(', ')}
              </div>
            )}
          </div>

          {depGraph && (
            <ForceGraph2D
              ref={graphRef}
              width={dimensions.width}
              height={dimensions.height}
              graphData={depGraph}
              nodeId="id"
              nodeLabel="name"
              nodeColor={n => n.id === selectedFile ? '#ff3333' : (n.high_coupling ? '#00ff41' : '#c0c0c0')}
              nodeRelSize={4}
              linkColor={() => '#1a1a1a'}
              linkDirectionalArrowLength={3.5}
              linkDirectionalArrowRelPos={1}
              onNodeClick={handleNodeClick}
              backgroundColor="#000000"
            />
          )}
        </div>

        <div className="flex-1 flex flex-col min-w-[500px]">
          <div className="flex-none px-4 py-2 border-b border-[#1a1a1a] text-xs text-[#c0c0c0] flex justify-between items-center">
            <span className="font-bold truncate text-[#00ff41]">$ {selectedFile || 'no_file'}</span>
            <span className="px-2 py-0.5 border border-[#1a1a1a] text-[#c0c0c0]">python</span>
          </div>
          <div className="flex-1 border-t border-[#1a1a1a]">
            <Monaco
              language="python"
              theme="hc-black"
              value={fileContent}
              onChange={(v: any) => setFileContent(v || '')}
              options={{
                minimap: { enabled: true },
                fontFamily: 'JetBrains Mono',
                fontSize: 13,
                lineHeight: 22,
                padding: { top: 12 },
                readOnly: false,
                scrollBeyondLastLine: false,
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
