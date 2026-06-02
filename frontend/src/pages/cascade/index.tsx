import React from 'react';
import { Layout } from '../../components/layout/Layout';
import { CascadePlayer } from '../../components/cascade/CascadePlayer';

export default function CascadePage() {
  return (
    <Layout title="Cascade" description="Fix one issue; your fix reveals the next. Survive the chain." full>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <CascadePlayer archetype="rate-limiter" />
      </div>
    </Layout>
  );
}
