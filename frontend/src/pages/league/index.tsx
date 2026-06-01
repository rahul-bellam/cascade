import { LeagueStandings } from '../../components/league/LeagueStandings';
import Head from 'next/head';

export default function LeaguePage() {
  return (
    <>
      <Head>
        <title>league — Cascade</title>
      </Head>
      <LeagueStandings />
    </>
  );
}
