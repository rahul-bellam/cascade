import React from 'react';
import dynamic from 'next/dynamic';
import { Layout } from '../../components/layout/Layout';

const CodebaseExplorer = dynamic(
  () => import('../../components/refactor/CodebaseExplorer').then((m) => m.CodebaseExplorer),
  { ssr: false },
);

export default function RefactorPage() {
  return (
    <Layout title="Refactor" description="Reverse-engineer a legacy codebase. Extract services." full>
      <CodebaseExplorer codebase="payment-monolith" />
    </Layout>
  );
}
