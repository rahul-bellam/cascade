import React from 'react';
import Head from 'next/head';
import { ConstraintSession } from '../../components/constraint/ConstraintSession';

export default function ConstraintPage() {
  return (
    <div className="min-h-screen bg-black text-green-500">
      <Head><title>constraint — Cascade</title></Head>
      <ConstraintSession archetype="rate-limiter" />
    </div>
  );
}
