import React from 'react';
// Skill rule (Feedback/Performance): skeleton screens for >300ms loads, not frozen UI.
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-surface-2/70 ${className}`} aria-hidden="true" />;
}
export function CascadeSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
