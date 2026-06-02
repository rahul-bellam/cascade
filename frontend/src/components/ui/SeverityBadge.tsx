import React from 'react';
import { IconAlert, IconBolt, IconShield } from './icons';

const MAP: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  critical: { color: 'border-danger text-danger bg-danger/10', icon: <IconBolt width={13} height={13} />, label: 'critical' },
  high: { color: 'border-danger text-danger bg-danger/5', icon: <IconAlert width={13} height={13} />, label: 'high' },
  medium: { color: 'border-border text-muted bg-bg', icon: <IconAlert width={13} height={13} />, label: 'medium' },
  low: { color: 'border-border text-muted bg-bg', icon: <IconShield width={13} height={13} />, label: 'low' },
};

export function SeverityBadge({ severity }: { severity?: string }) {
  const m = MAP[severity || 'low'] || MAP.low;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs  border ${m.color}`}
      role="status" aria-label={`severity: ${m.label}`}>
      {m.icon}{m.label}
    </span>
  );
}
