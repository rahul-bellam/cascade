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
        <title>Refactor Explorer</title>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <CodebaseExplorer codebase="payment-monolith" />
    </>
  );
}
