import React from 'react';

type Metrics = {
  p50_latency: number; p99_latency: number; error_rate: number;
  throughput: number; cpu_pct: number; passed?: boolean; failure_reason?: string;
};

const DANGER = '#a8443a';
const OK = '#3d7d6c';

// Count a value up from 0 over `dur` ms with easing + tiny live jitter while ramping.
function useCountUp(target: number, dur = 1100, jitter = true) {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setV(target); return; }
    let raf = 0; const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const j = jitter && p < 1 ? (Math.random() - 0.5) * target * 0.06 : 0;
      setV(Math.max(0, target * eased + j));
      if (p < 1) raf = requestAnimationFrame(tick); else setV(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, dur, jitter]);
  return v;
}

function Gauge({ label, value, max, sla, unit, decimals = 0 }:
  { label: string; value: number; max: number; sla?: number; unit: string; decimals?: number }) {
  const shown = useCountUp(value);
  const pct = Math.min(100, (shown / max) * 100);
  const overSla = sla != null && value > sla;
  const color = overSla ? DANGER : pct > 80 ? DANGER : OK;
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums font-mono" style={{ color }}>
          {shown.toFixed(decimals)}{unit}
          {sla != null ? <span className="text-muted"> / {sla}{unit}</span> : null}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full border border-border bg-surface">
        <div style={{ width: `${pct}%`, background: color }} className="h-full" />
      </div>
    </div>
  );
}

export function MetricsDashboard({ metrics, level }: { metrics: Metrics | null; level: any }) {
  // brief "running load test" phase when new metrics arrive, for drama
  const [phase, setPhase] = React.useState<'idle' | 'running' | 'done'>('idle');
  React.useEffect(() => {
    if (!metrics) { setPhase('idle'); return; }
    setPhase('running');
    const id = setTimeout(() => setPhase('done'), 1200);
    return () => clearTimeout(id);
  }, [metrics]);

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-600 text-accent-700">Live metrics</h3>
        {phase === 'running' && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted">
            <span className="h-2 w-2 animate-ping rounded-full bg-accent-500" /> running load test…
          </span>
        )}
      </div>
      <div className="mb-4 text-xs text-muted">
        {level?.target_rps ? `target ${level.target_rps.toLocaleString()} rps` : 'apply a fix to simulate load'}
      </div>

      {!metrics ? (
        <div className="py-10 text-center text-sm text-muted">
          No simulation yet.<br />Apply a fix to run a load test.
        </div>
      ) : (
        <div key={`${metrics.p99_latency}-${metrics.error_rate}-${metrics.cpu_pct}`}>
          <Gauge label="p50 latency" value={metrics.p50_latency} max={Math.max(500, (level?.latency_sla_ms || 200) * 2)} unit="ms" />
          <Gauge label="p99 latency" value={metrics.p99_latency} max={Math.max(500, (level?.latency_sla_ms || 200) * 2)} sla={level?.latency_sla_ms} unit="ms" />
          <Gauge label="error rate" value={metrics.error_rate} max={100} sla={level?.error_sla_pct} unit="%" decimals={1} />
          <Gauge label="CPU" value={metrics.cpu_pct} max={100} sla={95} unit="%" />
          <div className="mt-2 flex justify-between text-xs text-muted">
            <span>throughput</span>
            <span className="tabular-nums font-mono text-accent-700">{metrics.throughput.toLocaleString()} rps</span>
          </div>
          {phase === 'done' && (
            <div className={`mt-4 animate-fade-in-up rounded-xl border p-2.5 text-center text-sm ${
              metrics.passed ? 'border-accent-500 bg-accent-100 text-accent-700' : 'border-danger bg-danger/10 text-danger'}`}>
              {metrics.passed ? '✓ SLA met — level cleared' : (metrics.failure_reason || 'SLA not met')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
