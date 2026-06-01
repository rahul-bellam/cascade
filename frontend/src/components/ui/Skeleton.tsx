import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse border border-[#1a1a1a] bg-black/70 ${className}`} aria-hidden="true" />;
}

export function CascadeSkeleton() {
  return (
    <div className="space-y-3 text-[#c0c0c0]" aria-busy="true" aria-label="Loading">
      <div className="text-xs font-mono text-[#c0c0c0] animate-pulse">$ loading...</div>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
