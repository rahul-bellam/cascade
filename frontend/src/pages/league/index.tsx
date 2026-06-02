import React from 'react';
import { Layout } from '../../components/layout/Layout';
import { LeagueStandings } from '../../components/league/LeagueStandings';

export default function LeaguePage() {
  return (
    <Layout title="League" description="Weekly seasons, divisions, promotion and relegation." full>
      <LeagueStandings />
    </Layout>
  );
}
