import React from 'react';

type Metrics = {
  p50_latency: number; p99_latency: number; error_rate: number;
  throughput: number; cpu_pct: number; passed?: boolean; failure_reason?: string;
};

function Gauge({ label, value, max, sla, unit, invert = true }:
  { label: string; value: number; max: number; sla?: number; unit: string; invert?: boolean }) {
  const pct = Math.min(100, (value / max) * 100);
  const overSla = sla != null && value > sla;
  const color = overSla ? '#ff3333' : pct > 80 ? '#ff3333' : '#00ff41';
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1 font-mono">
        <span className="text-[#c0c0c0]">{label}</span>
        <span style={{ color }} className="font-mono">
          {value}{unit}{sla != null ? <span className="text-[#c0c0c0]"> / {sla}{unit}</span> : null}
        </span>
      </div>
      <div className="h-1.5 bg-[#0a0a0a] border border-[#1a1a1a]">
        <div style={{ width: `${pct}%`, background: color }} className="h-full transition-all duration-500" />
      </div>
    </div>
  );
}

export function MetricsDashboard({ metrics, level }: { metrics: Metrics | null; level: any }) {
  return (
    <div className="border border-[#1a1a1a] p-4">
      <h3 className="font-semibold mb-1 text-[#00ff41] text-sm font-mono">$ live_metrics</h3>
      <div className="text-xs text-[#c0c0c0] mb-4 font-mono">
        {level?.target_rps ? `target ${level.target_rps} rps` : 'run a fix to simulate load'}
      </div>
      {!metrics ? (
        <div className="text-[#c0c0c0] text-sm py-8 text-center font-mono">
          $ no_simulation<br/>apply a fix to see metrics
        </div>
      ) : (
        <>
          <Gauge label="p50_latency" value={metrics.p50_latency} max={Math.max(500, (level?.latency_sla_ms || 200) * 2)} unit="ms" />
          <Gauge label="p99_latency" value={metrics.p99_latency} max={Math.max(500, (level?.latency_sla_ms || 200) * 2)} sla={level?.latency_sla_ms} unit="ms" />
          <Gauge label="error_rate" value={metrics.error_rate} max={100} sla={level?.error_sla_pct} unit="%" />
          <Gauge label="cpu" value={metrics.cpu_pct} max={100} sla={95} unit="%" />
          <div className="flex justify-between text-xs mt-2 text-[#c0c0c0] font-mono">
            <span>throughput</span><span className="font-mono text-[#00ff41]">{metrics.throughput} rps</span>
          </div>
          <div className={`mt-4 p-2 text-sm text-center font-mono border ${metrics.passed ? 'border-[#00ff41] text-[#00ff41]' : 'border-[#ff3333] text-[#ff3333]'}`}>
            {metrics.passed ? '$ sla_met — level_cleared' : `> ${metrics.failure_reason || 'sla_not_met'}`}
          </div>
        </>
      )}
    </div>
  );
}
