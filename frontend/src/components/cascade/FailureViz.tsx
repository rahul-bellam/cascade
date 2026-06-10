import React from 'react';

/**
 * FailureViz — a small, animated dramatization of the *current* failure.
 * Turns each DAG node from a paragraph ("Redis crashes, 50k requests bypass")
 * into a live mini-incident you can watch. Category drives the metaphor.
 * Pure SVG + CSS; theme-aware (uses currentColor + tokens); reduced-motion safe.
 *
 * state: 'failing' (the issue is live) | 'recovering' (a good fix was applied)
 */
type VizState = 'failing' | 'recovering';

const META: Record<string, { label: string; unit: string; metric: string }> = {
  data_loss:           { label: 'Counters retained', unit: '%', metric: 'integrity' },
  availability:        { label: 'Requests blocked',  unit: '%', metric: 'enforcement' },
  consistency:         { label: 'Limit accuracy',    unit: '%', metric: 'accuracy' },
  resource_exhaustion: { label: 'Memory used',       unit: '%', metric: 'memory' },
  scalability:         { label: 'CPU load',          unit: '%', metric: 'cpu' },
  performance:         { label: 'p99 latency',       unit: 'ms', metric: 'latency' },
  cost:                { label: 'Monthly cost',      unit: '/mo', metric: 'cost' },
  security:            { label: 'Malicious blocked',  unit: '%', metric: 'safety' },
  default:             { label: 'System health',     unit: '%', metric: 'health' },
};

export function FailureViz({ category, severity, state = 'failing' }:
  { category?: string; severity?: string; state?: VizState }) {
  const meta = META[category || 'default'] || META.default;
  const recovering = state === 'recovering';
  const danger = '#a8443a';
  const ok = '#3d7d6c';
  const stroke = recovering ? ok : danger;

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.15em] text-muted">Live system</span>
        <span className={`inline-flex items-center gap-1.5 text-xs font-500 ${recovering ? 'text-[color:var(--ok)]' : 'text-[color:var(--bad)]'}`}
          style={{ ['--ok' as any]: ok, ['--bad' as any]: danger }}>
          <span className="relative flex h-2 w-2">
            {!recovering && <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: danger }} />}
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: stroke }} />
          </span>
          {recovering ? 'recovering' : 'failing'}
        </span>
      </div>

      <Scene category={category} recovering={recovering} stroke={stroke} ok={ok} danger={danger} />

      <Gauge meta={meta} recovering={recovering} ok={ok} danger={danger} />
    </div>
  );
}

/* ---- the animated scene, per category ---- */
function Scene({ category, recovering, stroke, ok, danger }:
  { category?: string; recovering: boolean; stroke: string; ok: string; danger: string }) {
  const W = 360, H = 130;
  const muted = 'rgb(var(--muted))';
  const border = 'rgb(var(--border))';
  const fg = 'rgb(var(--fg))';

  // shared: a row of "request" dots flowing left->right toward a service box
  const Requests = ({ blocked }: { blocked: boolean }) => (
    <g>
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={i} r="3.5" cy={H / 2}
          fill={blocked && !recovering ? danger : ok}
          opacity="0.9">
          {!recovering ? (
            <animate attributeName="cx" from="8" to={blocked ? '300' : '150'}
              dur={`${1.1 + i * 0.18}s`} repeatCount="indefinite" />
          ) : (
            <animate attributeName="cx" from="8" to="150" dur={`${1.3 + i * 0.2}s`} repeatCount="indefinite" />
          )}
        </circle>
      ))}
    </g>
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img"
      aria-label={`Visualization of ${category || 'system'} ${recovering ? 'recovering' : 'failing'}`}>
      {/* the service box (center-right) */}
      <rect x="150" y={H / 2 - 26} width="86" height="52" rx="8"
        fill="rgb(var(--surface-2))" stroke={recovering ? ok : stroke} strokeWidth="2">
        {!recovering && (category === 'availability' || category === 'scalability') && (
          <animate attributeName="opacity" values="1;0.35;1" dur="0.9s" repeatCount="indefinite" />
        )}
      </rect>
      <text x="193" y={H / 2 + 4} textAnchor="middle" fontSize="11" fontFamily="Jost, sans-serif" fill={fg}>
        {category === 'data_loss' ? 'counter' : category === 'resource_exhaustion' ? 'redis' :
         category === 'cost' ? 'cluster' : category === 'consistency' ? 'region' : 'service'}
      </text>

      {/* category-specific overlays */}
      {category === 'availability' && (
        <>
          <Requests blocked />
          {!recovering && <text x="300" y={H / 2 - 14} textAnchor="middle" fontSize="9" fill={danger}>bypass →</text>}
          {!recovering && <line x1="193" y1={H / 2 - 26} x2="193" y2={H / 2 + 26} stroke={danger} strokeWidth="2">
            <animate attributeName="opacity" values="1;0;1" dur="0.7s" repeatCount="indefinite" /></line>}
        </>
      )}

      {category === 'resource_exhaustion' && (
        <>
          <rect x="20" y="20" width="110" height="90" rx="6" fill="none" stroke={border} />
          <rect x="20" width="110" rx="6" fill={recovering ? ok : danger} opacity="0.7"
            y={recovering ? 70 : 26} height={recovering ? 40 : 84}>
            {!recovering && <animate attributeName="height" values="40;88;72;90" dur="1.6s" repeatCount="indefinite" />}
          </rect>
          <line x1="20" y1="44" x2="130" y2="44" stroke={danger} strokeDasharray="4 3" />
          <text x="134" y="47" fontSize="8" fill={danger}>maxmem</text>
          <Requests blocked={false} />
        </>
      )}

      {category === 'scalability' && (
        <>
          {/* CPU bar pinned */}
          <rect x="250" y="24" width="90" height="14" rx="3" fill="none" stroke={border} />
          <rect x="250" y="24" height="14" rx="3" fill={recovering ? ok : danger}
            width={recovering ? 50 : 90}>
            {!recovering && <animate attributeName="width" values="86;90;88;90" dur="0.8s" repeatCount="indefinite" />}
          </rect>
          <text x="250" y="52" fontSize="8" fill={muted}>CPU {recovering ? '55%' : '100%'}</text>
          <Requests blocked={!recovering} />
        </>
      )}

      {category === 'consistency' && (
        <>
          {/* two regions diverging */}
          <rect x="40" y="30" width="70" height="40" rx="6" fill="rgb(var(--surface-2))" stroke={recovering ? ok : danger} />
          <rect x="250" y="60" width="70" height="40" rx="6" fill="rgb(var(--surface-2))" stroke={recovering ? ok : danger} />
          <text x="75" y="54" textAnchor="middle" fontSize="10" fill={fg}>100</text>
          <text x="285" y="84" textAnchor="middle" fontSize="10" fill={recovering ? ok : danger}>{recovering ? '100' : '190'}</text>
          <line x1="110" y1="50" x2="250" y2="80" stroke={recovering ? ok : danger} strokeDasharray={recovering ? '0' : '5 4'} strokeWidth="1.5" />
          {!recovering && <text x="180" y="58" textAnchor="middle" fontSize="8" fill={danger}>drift</text>}
        </>
      )}

      {category === 'data_loss' && (
        <>
          <Requests blocked={false} />
          {!recovering && [0, 1, 2].map((i) => (
            <text key={i} x="193" fontSize="11" fill={danger} textAnchor="middle" y="40">
              ↓{/* counters draining away */}
              <animate attributeName="y" from="40" to="120" dur={`${1 + i * 0.3}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" from="1" to="0" dur={`${1 + i * 0.3}s`} repeatCount="indefinite" />
            </text>
          ))}
        </>
      )}

      {category === 'performance' && (
        <>
          {/* slow-crawling packets */}
          {[0, 1, 2].map((i) => (
            <circle key={i} r="3.5" cy={H / 2} fill={recovering ? ok : danger}>
              <animate attributeName="cx" from="8" to="320" dur={recovering ? '1.1s' : '3.2s'} begin={`${i * 0.5}s`} repeatCount="indefinite" />
            </circle>
          ))}
          <text x="320" y={H / 2 - 12} textAnchor="end" fontSize="9" fill={muted}>{recovering ? 'fast' : '+50ms'}</text>
        </>
      )}

      {category === 'cost' && (
        <>
          <Requests blocked={false} />
          <text x="193" y="32" textAnchor="middle" fontSize="13" fill={recovering ? ok : danger} fontFamily="Fraunces, serif">
            {recovering ? '$1.8k' : '$4.3k'}
            {!recovering && <animate attributeName="opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite" />}
          </text>
        </>
      )}

      {category === 'security' && (
        <>
          {[0,1,2,3].map((i) => (
            <circle key={i} r="3.5" cy={H / 2 + (i % 2 ? 10 : -10)} fill={recovering ? ok : danger}>
              <animate attributeName="cx" from="8" to={recovering ? '150' : '300'} dur={`${1.2 + i * 0.2}s`} repeatCount="indefinite" />
            </circle>
          ))}
          <text x="193" y={H / 2 - 32} textAnchor="middle" fontSize="9" fill={recovering ? ok : danger}>
            {recovering ? 'spam filtered' : 'spam / malware'}
          </text>
        </>
      )}
      {(!category || !['availability','resource_exhaustion','scalability','consistency','data_loss','performance','cost','security'].includes(category)) && (
        <Requests blocked={!recovering} />
      )}
    </svg>
  );
}

/* ---- the live metric gauge: a value that *climbs* as the incident unfolds ---- */
function Gauge({ meta, recovering, ok, danger }:
  { meta: { label: string; unit: string }; recovering: boolean; ok: string; danger: string }) {
  const target = recovering ? 14 : 92;            // % of the bar
  const color = recovering ? ok : danger;
  const [val, setVal] = React.useState(recovering ? 14 : 30);

  React.useEffect(() => {
    // animate toward target with a little jitter so it feels like a live feed
    let raf = 0;
    const reduce = typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setVal(target); return; }
    const start = performance.now();
    const from = recovering ? 92 : 25;
    const dur = recovering ? 700 : 1400;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const jitter = p < 1 && !recovering ? (Math.random() - 0.5) * 4 : 0;
      setVal(Math.max(0, Math.min(100, from + (target - from) * eased + jitter)));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setVal(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [recovering, target]);

  // present the number in the metric's own units
  const display = meta.unit === 'ms'
    ? `${Math.round((recovering ? 6 : 380) * (val / 92))}ms`
    : meta.unit === '/mo'
    ? `$${(recovering ? 1.8 : 4.3 * (val / 92)).toFixed(1)}k`
    : `${Math.round(val)}%`;

  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted">{meta.label}</span>
        <span className="font-mono font-500 tabular-nums" style={{ color }}>
          {display} · {recovering ? 'healthy' : 'critical'}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full" style={{ width: `${val}%`, background: color }} />
      </div>
    </div>
  );
}
