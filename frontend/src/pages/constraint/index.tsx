import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ConstraintSession } from '../../components/constraint/ConstraintSession';

export default function ConstraintPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900">
      <Head><title>Constraint Unlock — Cascade</title></Head>
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <Link href="/" className="text-cascade-200 text-sm">← Home</Link>
      </div>
      <ConstraintSession archetype="rate-limiter" />
    </div>
  );
}
