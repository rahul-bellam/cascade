import { useTheme } from '../../lib/theme';
import React, { useState, useEffect } from 'react';
import useWebSocket from 'react-use-websocket';
import MonacoEditor from '@monaco-editor/react';

export function ArenaDuel({ userId }: { userId: string }) {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const [phase, setPhase] = useState('matchmaking');
  const [timeLeft, setTimeLeft] = useState(0);
  const [code, setCode] = useState('# Type your design code here\n');
  const [opponentProgress, setOpponentProgress] = useState('Waiting...');
  const [scores, setScores] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [duelId, setDuelId] = useState<string | null>(null);
  
  // Directly connect to the FastAPI WebSocket port for local dev
  const WS_URL = process.env.NEXT_PUBLIC_ARENA_WS_URL || 'ws://localhost:8096/arena/queue';
  
  const { sendMessage, lastMessage } = useWebSocket(`${WS_URL}?user_id=${userId}`, {
    shouldReconnect: () => true,
  });

  useEffect(() => {
    if (lastMessage !== null) {
      try {
        const msg = JSON.parse(lastMessage.data);
        switch (msg.type) {
          case 'match_found':
            setDuelId(msg.duel_id);
            setPhase('match_found');
            break;
          case 'phase_change':
            setPhase(msg.data);
            break;
          case 'timer':
            setTimeLeft(msg.seconds);
            break;
          case 'opponent_progress':
            setOpponentProgress(msg.data);
            break;
          case 'simulation_tick':
            setMetrics(msg.data);
            break;
          case 'scores':
            setScores(msg.data);
            break;
          case 'waiting_for_match':
            setPhase('matchmaking');
            break;
          case 'duel_complete':
            setPhase('complete');
            break;
        }
      } catch (e) {
        console.error("Failed to parse WS message", e);
      }
    }
  }, [lastMessage]);

  const submitCode = () => {
    sendMessage(JSON.stringify({ type: 'submit', code }));
  };

  const handleCodeChange = (v: string | undefined) => {
    setCode(v || '');
    sendMessage(JSON.stringify({ type: 'code_update', length: v?.length }));
  };

  if (phase === 'matchmaking') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-bg text-fg ">
        <div className="animate-pulse flex items-center gap-3 text-2xl font-bold">
           Looking for Opponent...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-bg text-fg ">
      
      {/* Header */}
      <header className="flex-none px-6 py-4 border-b border-border bg-surface flex justify-between items-center shadow z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <span className="text-accent-700">⚡</span> Arena Duel
          </h1>
          <span className="text-xs bg-surface-2 px-3 py-1 rounded text-fg border border-border uppercase font-bold">
            Phase: {phase}
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm font-bold">
          {timeLeft > 0 && <span>Time: {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>}
          <span>Duel ID: <span className="opacity-50 text-xs">{duelId?.slice(0,8)}...</span></span>
        </div>
      </header>

      {/* Main layout */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Player's side (Code Editor) */}
        <div className="flex-1 flex flex-col border-r border-border bg-surface">
          <div className="flex-none px-4 py-2 border-b border-border bg-bg text-xs font-bold flex justify-between items-center">
            <span className="text-accent-700">Your Design</span>
            <button 
              onClick={submitCode}
              disabled={phase !== 'code' && phase !== 'design'}
              className="px-4 py-1.5 bg-accent-600 hover:bg-accent-600/90 text-white rounded font-bold transition-colors disabled:opacity-50"
            >
              Commit Design
            </button>
          </div>
          <div className="flex-1">
            <MonacoEditor
              language="python"
              theme={dark ? "vs-dark" : "light"}
              value={code}
              onChange={handleCodeChange}
              options={{ 
                minimap: { enabled: false },
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 14,
                padding: { top: 16 },
              }}
            />
          </div>
        </div>

        {/* Opponent & Simulation side */}
        <div className="w-80 flex-none bg-bg flex flex-col relative border-l border-border">
          
          <div className="p-4 border-b border-border bg-surface">
            <h2 className="text-xs uppercase tracking-widest text-accent-700 font-bold mb-2">Opponent Status</h2>
            <div className={`p-3 rounded border text-sm font-bold flex items-center gap-2 ${opponentProgress === 'submitted' ? 'bg-danger/10 border-danger text-danger' : 'bg-accent-100 border-accent-300 text-accent-700'}`}>
              {opponentProgress === 'submitted' ? '✅ Submitted' : '⏳ Coding...'}
            </div>
          </div>

          <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
            {phase === 'simulation' || phase === 'scoring' || phase === 'complete' ? (
              <div className="space-y-4">
                <h2 className="text-xs uppercase tracking-widest text-accent-700 font-bold">Live Telemetry</h2>
                {metrics ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-surface p-3 rounded border border-border shadow-sm">
                      <div className="text-[10px] uppercase text-muted">p50 Latency</div>
                      <div className="text-xl font-bold">{metrics.p50}ms</div>
                    </div>
                    <div className="bg-surface p-3 rounded border border-border shadow-sm">
                      <div className="text-[10px] uppercase text-muted">p99 Latency</div>
                      <div className="text-xl font-bold">{metrics.p99}ms</div>
                    </div>
                    <div className="bg-surface p-3 rounded border border-border shadow-sm col-span-2">
                      <div className="text-[10px] uppercase text-accent-700">Throughput</div>
                      <div className="text-xl font-bold text-accent-700">{metrics.rps} req/s</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm opacity-50 italic animate-pulse">Waiting for telemetry...</div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm opacity-50 text-center italic p-4">
                Telemetry will appear during the simulation phase.
              </div>
            )}
          </div>
          
          {/* Scores Overlay */}
          {scores && (
            <div className="absolute inset-0 bg-surface/90 backdrop-blur border-t border-border p-6 flex flex-col justify-center shadow-lift z-20">
              <h2 className="text-2xl font-bold text-center mb-6 text-accent-700">🎉 Results</h2>
              <div className="space-y-4">
                <div className="bg-accent-600 text-white p-4 rounded shadow">
                  <div className="text-xs uppercase opacity-80">Your Score</div>
                  <div className="text-3xl font-bold">{scores[userId]}</div>
                </div>
                <div className="bg-surface-2 text-white p-4 rounded shadow opacity-80">
                  <div className="text-xs uppercase opacity-80">Opponent Score</div>
                  <div className="text-2xl font-bold">
                    {Object.entries(scores).find(([k]) => k !== userId)?.[1] as number}
                  </div>
                </div>
              </div>
              <div className="mt-8 text-center text-xs opacity-70">
                Awaiting next match...
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
