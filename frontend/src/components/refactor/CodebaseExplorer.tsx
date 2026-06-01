import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ForceGraph2D } from 'react-force-graph';
import MonacoEditor from '@monaco-editor/react';
import { refactorApi } from '../../lib/api';

export function CodebaseExplorer({ codebase = "payment-monolith" }: { codebase?: string }) {
  const [sid, setSid] = useState<string | null>(null);
  const [depGraph, setDepGraph] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const graphRef = useRef<any>(null);

  // Measure container for ForceGraph responsiveness
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 600 });

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight
      });
    }
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
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
      console.error(err);
      setFileContent('// Error loading file');
    }
  };

  const handleNodeClick = useCallback((node: any) => {
    if (sid) handleFileSelect(sid, node.id);
  }, [sid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0F172A] text-[#F8FAFC] font-['JetBrains_Mono',monospace]">
        <div className="animate-pulse flex items-center gap-3">
          <span className="text-[#22C55E]">⚡</span> Analyzing Codebase...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0F172A] text-[#EF4444] font-['JetBrains_Mono',monospace]">
        Failed to load: {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0F172A] text-[#F8FAFC] font-['JetBrains_Mono',monospace]">
      
      {/* Header */}
      <header className="flex-none px-6 py-4 border-b border-[#475569] bg-[#1E293B] flex justify-between items-center shadow-lg z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <span className="text-[#22C55E]">🔍</span> Refactor Explorer
          </h1>
          <span className="text-xs bg-[#272F42] px-2 py-1 rounded text-[#F8FAFC]/80 border border-[#475569]">
            {codebase}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#EF4444]"></span> High Coupling
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#22C55E]"></span> Standard File
          </div>
        </div>
      </header>

      {/* Main layout */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* File Tree (Left) */}
        <div className="w-64 flex-none border-r border-[#475569] bg-[#1E293B] flex flex-col overflow-y-auto">
          <div className="p-4 text-xs uppercase tracking-widest text-[#F8FAFC]/50 border-b border-[#475569]">
            Project Files
          </div>
          <div className="py-2">
            {depGraph?.files && Object.keys(depGraph.files).sort().map(path => {
              const info = depGraph.files[path];
              const isSelected = selectedFile === path;
              const hasHighCoupling = info.imports.length > 5 || info.global_vars.length > 0;
              
              return (
                <div
                  key={path}
                  onClick={() => sid && handleFileSelect(sid, path)}
                  className={`px-4 py-2 cursor-pointer text-sm transition-colors border-l-2 flex justify-between items-center group
                    ${isSelected 
                      ? 'bg-[#272F42] border-[#22C55E] text-[#22C55E]' 
                      : 'border-transparent text-[#F8FAFC]/80 hover:bg-[#334155] hover:text-[#F8FAFC]'
                    }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="opacity-50 group-hover:opacity-100">📄</span>
                    <span className="truncate">{path}</span>
                  </div>
                  {hasHighCoupling && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" title="High Coupling" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Dependency Graph (Middle) */}
        <div className="flex-1 border-r border-[#475569] bg-[#0F172A] relative" ref={containerRef}>
          <div className="absolute top-4 left-4 z-10 bg-[#1E293B]/80 backdrop-blur border border-[#475569] p-3 rounded text-xs text-[#F8FAFC]/80 shadow-lg pointer-events-none">
            <h3 className="font-bold text-[#F8FAFC] mb-2 uppercase tracking-wider">Metrics</h3>
            <div>Total Files: {depGraph?.metrics?.total_files}</div>
            <div>Functions: {depGraph?.metrics?.total_functions}</div>
            <div>Global State Refs: {depGraph?.metrics?.total_global_state}</div>
            {depGraph?.metrics?.god_functions?.length > 0 && (
              <div className="mt-2 text-[#EF4444]">
                ⚠️ God Functions: {depGraph.metrics.god_functions.join(', ')}
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
              nodeColor={n => n.id === selectedFile ? '#EAB308' : (n.high_coupling ? '#EF4444' : '#22C55E')}
              nodeRelSize={4}
              linkColor={() => '#475569'}
              linkDirectionalArrowLength={3.5}
              linkDirectionalArrowRelPos={1}
              onNodeClick={handleNodeClick}
              backgroundColor="#0F172A"
            />
          )}
        </div>

        {/* Monaco Editor (Right) */}
        <div className="flex-1 flex flex-col min-w-[500px] bg-[#1E293B]">
          <div className="flex-none px-4 py-2 border-b border-[#475569] bg-[#272F42] text-xs text-[#F8FAFC]/70 flex justify-between items-center shadow-inner">
            <span className="font-bold truncate">{selectedFile || 'No file selected'}</span>
            <span className="px-2 py-0.5 bg-[#0F172A] rounded border border-[#475569]">Python</span>
          </div>
          <div className="flex-1">
            <MonacoEditor
              language="python"
              theme="vs-dark"
              value={fileContent}
              onChange={(v) => setFileContent(v || '')}
              options={{ 
                minimap: { enabled: true },
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontSize: 14,
                lineHeight: 24,
                padding: { top: 16 },
                readOnly: false,
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                formatOnPaste: true,
              }}
            />
          </div>
        </div>

      </main>
    </div>
  );
}
