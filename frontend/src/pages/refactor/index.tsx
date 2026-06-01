import Head from 'next/head';
import dynamic from 'next/dynamic';

const CodebaseExplorer = dynamic(
  () => import('../../components/refactor/CodebaseExplorer').then(mod => mod.CodebaseExplorer),
  { ssr: false }
);

export default function RefactorPage() {
  return (
    <>
      <Head>
        <title>refactor — Cascade</title>
      </Head>
      <CodebaseExplorer codebase="payment-monolith" />
    </>
  );
}
