import React from 'react';
import Head from 'next/head';
import { PredictSession } from '../../components/predict/PredictSession';

export default function PredictPage() {
  return (
    <div className="min-h-screen bg-black text-green-500">
      <Head><title>predict — Cascade</title></Head>
      <PredictSession archetype="rate-limiter" />
    </div>
  );
}
