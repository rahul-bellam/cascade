import React, { useState, useEffect } from 'react';
import { leagueApi } from '../../lib/api';

const DIVISIONS = ["Bronze", "Silver", "Gold"];

export function LeagueStandings() {
  const [season, setSeason] = useState<any>(null);
  const [division, setDivision] = useState<string>("Silver");
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeague = async () => {
      try {
        setLoading(true);
        const curSeason = await leagueApi.currentSeason();
        setSeason(curSeason);
        if (curSeason) {
          const st = await leagueApi.standings(curSeason.id, division);
          setStandings(st.standings || []);
        }
      } catch (e: any) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    fetchLeague();
  }, [division]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-[#c0c0c0] font-mono text-lg animate-pulse">$ loading_standings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <div className="text-[#ff3333] font-mono text-lg mb-4">&gt; error: system_error</div>
        <div className="text-[#c0c0c0] font-mono text-sm">{error}</div>
      </div>
    );
  }

  if (!season) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-[#c0c0c0] font-mono text-lg">$ no_active_season</div>
      </div>
    );
  }

  const daysLeft = Math.max(0, Math.floor((new Date(season.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="min-h-screen bg-black text-[#00ff41] font-mono">
      <div className="max-w-5xl mx-auto p-8">
        <header className="mb-8 border-b border-[#1a1a1a] pb-4">
          <div className="flex justify-between items-end">
            <div>
              <div className="text-xs text-[#c0c0c0] mb-1">$ current_season</div>
              <h1 className="text-2xl font-bold text-[#00ff41]">{season.name}</h1>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-[#ff3333]">{daysLeft}d remaining</div>
              <div className="text-xs text-[#c0c0c0]">until roster lock</div>
            </div>
          </div>
        </header>

        <div className="flex gap-2 mb-6">
          {DIVISIONS.map(div => (
            <button
              key={div}
              onClick={() => setDivision(div)}
              className={`px-6 py-2 text-sm font-mono border transition-colors ${
                division === div
                  ? 'border-[#00ff41] text-[#00ff41] bg-[#00ff41]/10'
                  : 'border-[#c0c0c0] text-[#c0c0c0] hover:bg-[#c0c0c0] hover:text-black'
              }`}
            >
              {div}
            </button>
          ))}
        </div>

        <div className="border border-[#1a1a1a] overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#1a1a1a] text-xs text-[#c0c0c0] uppercase tracking-wider">
                <th className="p-3 w-16 text-center">rank</th>
                <th className="p-3">player</th>
                <th className="p-3 w-24">elo</th>
                <th className="p-3 w-24">w/l</th>
                <th className="p-3 w-24">points</th>
                <th className="p-3 w-28 text-center">trend</th>
              </tr>
            </thead>
            <tbody>
              {standings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-[#c0c0c0] text-sm">
                    $ no_players_in_division
                  </td>
                </tr>
              ) : (
                standings.map((user, idx) => (
                  <tr key={user.user_id} className={`border-b border-[#1a1a1a]/50 hover:bg-[#00ff41]/5 transition-colors ${idx < 3 ? 'bg-[#00ff41]/5' : ''}`}>
                    <td className="p-3 text-center font-bold font-mono">
                      <span className={`${idx === 0 ? 'text-[#ff3333] text-lg' : idx === 1 ? 'text-[#00ff41]' : idx === 2 ? 'text-[#c0c0c0]' : 'text-[#c0c0c0]'}`}>
                        {user.rank}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-[#00ff41]">{user.user_id}</td>
                    <td className="p-3 text-[#c0c0c0]">{user.elo}</td>
                    <td className="p-3 text-[#c0c0c0]">
                      <span className="text-[#00ff41]">{user.wins}</span> - <span className="text-[#ff3333]">{user.losses}</span>
                    </td>
                    <td className="p-3 text-[#00ff41] font-bold">{user.points}</td>
                    <td className="p-3 text-center">
                      {user.trend === 'promoted' && <span className="text-[#00ff41] text-xs">↑ promoted</span>}
                      {user.trend === 'relegated' && <span className="text-[#ff3333] text-xs">↓ relegated</span>}
                      {user.trend === 'same' && <span className="text-[#c0c0c0]">—</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
