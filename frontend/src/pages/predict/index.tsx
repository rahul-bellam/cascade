import React from 'react';
import { Layout } from '../../components/layout/Layout';
import { PredictSession } from '../../components/predict/PredictSession';

export default function PredictPage() {
  return (
    <Layout title="Predict" description="Reason about what breaks before you touch the code." full>
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
        <PredictSession archetype="rate-limiter" />
      </div>
    </Layout>
  );
}
