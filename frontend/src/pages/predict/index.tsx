import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { PredictSession } from '../../components/predict/PredictSession';

export default function PredictPage() {
  return (
    <div className="min-h-screen bg-black text-[#00ff41]">
      <Head><title>predict — Cascade</title></Head>
      <PredictSession archetype="rate-limiter" />
    </div>
  );
}
