import { LeagueStandings } from '../../components/league/LeagueStandings';
import Head from 'next/head';

export default function LeaguePage() {
  return (
    <>
      <Head>
        <title>League Standings</title>
        <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@300;400;500;600;700&family=Russo+One&display=swap" rel="stylesheet" />
      </Head>
      <LeagueStandings />
    </>
  );
}
