import React from 'react';
import { IconAlert, IconBolt, IconShield } from './icons';

// Skill rule (Accessibility #1): never convey meaning by color ALONE.
// Each badge pairs color + an icon + the text label.
const MAP: Record<string, { bg: string; fg: string; icon: React.ReactNode; label: string }> = {
  critical: { bg: 'bg-red-500/15', fg: 'text-red-300', icon: <IconBolt width={13} height={13} />, label: 'Critical' },
  high: { bg: 'bg-orange-500/15', fg: 'text-orange-300', icon: <IconAlert width={13} height={13} />, label: 'High' },
  medium: { bg: 'bg-amber-500/15', fg: 'text-amber-300', icon: <IconAlert width={13} height={13} />, label: 'Medium' },
  low: { bg: 'bg-slate-500/20', fg: 'text-slate-300', icon: <IconShield width={13} height={13} />, label: 'Low' },
};

export function SeverityBadge({ severity }: { severity?: string }) {
  const m = MAP[severity || 'low'] || MAP.low;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${m.bg} ${m.fg}`}
      role="status" aria-label={`Severity: ${m.label}`}>
      {m.icon}{m.label}
    </span>
  );
}
