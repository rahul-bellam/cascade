import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ConstraintSession } from '../../components/constraint/ConstraintSession';

export default function ConstraintPage() {
  return (
    <div className="min-h-screen bg-black text-[#00ff41]">
      <Head><title>constraint — Cascade</title></Head>
      <ConstraintSession archetype="rate-limiter" />
    </div>
  );
}
