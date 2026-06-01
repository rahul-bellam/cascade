import React from 'react';
import { IconAlert, IconBolt, IconShield } from './icons';

const MAP: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  critical: { color: 'border-[#ff3333] text-[#ff3333] bg-[#ff3333]/10', icon: <IconBolt width={13} height={13} />, label: 'critical' },
  high: { color: 'border-[#ff3333] text-[#ff3333] bg-[#ff3333]/5', icon: <IconAlert width={13} height={13} />, label: 'high' },
  medium: { color: 'border-[#006622] text-[#006622] bg-[#006622]/10', icon: <IconAlert width={13} height={13} />, label: 'medium' },
  low: { color: 'border-[#1a1a1a] text-slate-600 bg-black', icon: <IconShield width={13} height={13} />, label: 'low' },
};

export function SeverityBadge({ severity }: { severity?: string }) {
  const m = MAP[severity || 'low'] || MAP.low;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono border ${m.color}`}
      role="status" aria-label={`severity: ${m.label}`}>
      {m.icon}{m.label}
    </span>
  );
}
