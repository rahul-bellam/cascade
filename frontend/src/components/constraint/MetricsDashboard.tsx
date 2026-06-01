import React from 'react';

type Metrics = {
  p50_latency: number; p99_latency: number; error_rate: number;
  throughput: number; cpu_pct: number; passed?: boolean; failure_reason?: string;
};

function Gauge({ label, value, max, sla, unit, invert = true }:
  { label: string; value: number; max: number; sla?: number; unit: string; invert?: boolean }) {
  const pct = Math.min(100, (value / max) * 100);
  const overSla = sla != null && value > sla;
  const color = overSla ? '#ef4444' : pct > 80 ? '#f59e0b' : '#22c55e';
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-300">{label}</span>
        <span style={{ color }} className="font-mono">
          {value}{unit}{sla != null ? <span className="text-slate-500"> / SLA {sla}{unit}</span> : null}
        </span>
      </div>
      <div className="h-2 bg-slate-800 rounded overflow-hidden">
        <div style={{ width: `${pct}%`, background: color }} className="h-full transition-all duration-500" />
      </div>
    </div>
  );
}

export function MetricsDashboard({ metrics, level }: { metrics: Metrics | null; level: any }) {
  return (
    <div className="bg-slate-900 rounded-xl p-5 border border-slate-700">
      <h3 className="font-semibold mb-1 text-white">📊 Live Metrics</h3>
      <div className="text-xs text-slate-400 mb-4">
        {level?.target_rps ? `target ${level.target_rps} rps` : 'run a fix to simulate load'}
      </div>
      {!metrics ? (
        <div className="text-slate-500 text-sm py-8 text-center">
          No simulation yet.<br />Apply a fix to see latency, errors & CPU.
        </div>
      ) : (
        <>
          <Gauge label="p50 latency" value={metrics.p50_latency} max={Math.max(500, (level?.latency_sla_ms || 200) * 2)} unit="ms" />
          <Gauge label="p99 latency" value={metrics.p99_latency} max={Math.max(500, (level?.latency_sla_ms || 200) * 2)} sla={level?.latency_sla_ms} unit="ms" />
          <Gauge label="error rate" value={metrics.error_rate} max={100} sla={level?.error_sla_pct} unit="%" />
          <Gauge label="CPU" value={metrics.cpu_pct} max={100} sla={95} unit="%" />
          <div className="flex justify-between text-xs mt-2 text-slate-300">
            <span>throughput</span><span className="font-mono">{metrics.throughput} rps</span>
          </div>
          <div className={`mt-4 p-2 rounded text-sm text-center font-medium ${metrics.passed ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
            {metrics.passed ? '✅ SLA met — level cleared' : `❌ ${metrics.failure_reason || 'SLA not met'}`}
          </div>
        </>
      )}
    </div>
  );
}
