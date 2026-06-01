import { ArenaDuel } from '../../components/arena/ArenaDuel';
import Head from 'next/head';

export default function ArenaPage() {
  // Mock User ID for the MVP
  const userId = `u_${Math.floor(Math.random() * 10000)}`;

  return (
    <>
      <Head>
        <title>Arena Duel</title>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <ArenaDuel userId={userId} />
    </>
  );
}
