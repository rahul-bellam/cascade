import React from 'react';
import { Layout } from '../../components/layout/Layout';
import { ArenaDuel } from '../../components/arena/ArenaDuel';

export default function ArenaPage() {
  const userId = React.useMemo(() => `u_${Math.floor(Math.random() * 10000)}`, []);
  return (
    <Layout title="Arena" description="A considered duel of designs under load." full>
      <ArenaDuel userId={userId} />
    </Layout>
  );
}
