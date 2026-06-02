import React from 'react';

export function Card({ className = '', children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-2xl border border-border bg-surface p-6 shadow-soft ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, eyebrow }:
  { title: string; subtitle?: string; eyebrow?: string }) {
  return (
    <div className="mb-8">
      {eyebrow && <div className="mb-2 text-xs font-500 uppercase tracking-[0.18em] text-accent-600">{eyebrow}</div>}
      <h1 className="font-serif text-3xl font-600 tracking-tight sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-2 max-w-2xl text-muted">{subtitle}</p>}
    </div>
  );
}
