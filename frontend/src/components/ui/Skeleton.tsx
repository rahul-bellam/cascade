import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse border border-border bg-bg/70 ${className}`} aria-hidden="true" />;
}

export function CascadeSkeleton() {
  return (
    <div className="space-y-3 text-muted" aria-busy="true" aria-label="Loading">
      <div className="text-xs  text-muted animate-pulse">Loading…</div>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
