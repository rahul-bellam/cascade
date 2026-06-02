import React from 'react';
import { Layout } from '../../components/layout/Layout';
import { ConstraintSession } from '../../components/constraint/ConstraintSession';

export default function ConstraintPage() {
  return (
    <Layout title="Scale" description="Survive escalating constraints on a working system." full>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <ConstraintSession archetype="rate-limiter" />
      </div>
    </Layout>
  );
}
