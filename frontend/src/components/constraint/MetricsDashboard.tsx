import React from 'react';

type Metrics = {
  p50_latency: number; p99_latency: number; error_rate: number;
  throughput: number; cpu_pct: number; passed?: boolean; failure_reason?: string;
};

function Gauge({ label, value, max, sla, unit, invert = true }:
  { label: string; value: number; max: number; sla?: number; unit: string; invert?: boolean }) {
  const pct = Math.min(100, (value / max) * 100);
  const overSla = sla != null && value > sla;
  const color = overSla ? '#a8443a' : pct > 80 ? '#a8443a' : '#3d7d6c';
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1 ">
        <span className="text-muted">{label}</span>
        <span style={{ color }} className="">
          {value}{unit}{sla != null ? <span className="text-muted"> / {sla}{unit}</span> : null}
        </span>
      </div>
      <div className="h-1.5 bg-surface border border-border">
        <div style={{ width: `${pct}%`, background: color }} className="h-full transition-all duration-500" />
      </div>
    </div>
  );
}

export function MetricsDashboard({ metrics, level }: { metrics: Metrics | null; level: any }) {
  return (
    <div className="border border-border p-4">
      <h3 className="font-semibold mb-1 text-accent-700 text-sm ">Live metrics</h3>
      <div className="text-xs text-muted mb-4 ">
        {level?.target_rps ? `target ${level.target_rps} rps` : 'run a fix to simulate load'}
      </div>
      {!metrics ? (
        <div className="text-muted text-sm py-8 text-center ">
          No simulation yet<br/>apply a fix to see metrics
        </div>
      ) : (
        <>
          <Gauge label="p50_latency" value={metrics.p50_latency} max={Math.max(500, (level?.latency_sla_ms || 200) * 2)} unit="ms" />
          <Gauge label="p99_latency" value={metrics.p99_latency} max={Math.max(500, (level?.latency_sla_ms || 200) * 2)} sla={level?.latency_sla_ms} unit="ms" />
          <Gauge label="error_rate" value={metrics.error_rate} max={100} sla={level?.error_sla_pct} unit="%" />
          <Gauge label="cpu" value={metrics.cpu_pct} max={100} sla={95} unit="%" />
          <div className="flex justify-between text-xs mt-2 text-muted ">
            <span>throughput</span><span className=" text-accent-700">{metrics.throughput} rps</span>
          </div>
          <div className={`mt-4 p-2 text-sm text-center  border ${metrics.passed ? 'border-accent-500 text-accent-700' : 'border-danger text-danger'}`}>
            {metrics.passed ? 'SLA met — level cleared' : `${metrics.failure_reason || 'SLA not met'}`}
          </div>
        </>
      )}
    </div>
  );
}
