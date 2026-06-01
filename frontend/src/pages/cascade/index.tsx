import React from 'react';
import Head from 'next/head';
import { CascadePlayer } from '../../components/cascade/CascadePlayer';

export default function CascadePage() {
  return (
    <>
      <Head><title>cascade — survive the chain</title></Head>
      <div className="w-full">
        <div className="mb-4 text-xs text-[#006622] font-mono">
          {`> loading failure DAG: rate-limiter`}
        </div>
        <CascadePlayer archetype="rate-limiter" />
      </div>
    </>
  );
}
