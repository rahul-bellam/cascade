import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { CascadePlayer } from '../../components/cascade/CascadePlayer';

export default function CascadePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900">
      <Head><title>Cascade — Survive the Chain</title></Head>
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <Link href="/" className="text-cascade-200 text-sm">← Home</Link>
      </div>
      <CascadePlayer archetype="rate-limiter" />
    </div>
  );
}
