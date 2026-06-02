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
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-muted  text-lg animate-pulse">Loading standings…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center">
        <div className="text-danger  text-lg mb-4">Error: system_error</div>
        <div className="text-muted  text-sm">{error}</div>
      </div>
    );
  }

  if (!season) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-muted  text-lg">No active season</div>
      </div>
    );
  }

  const daysLeft = Math.max(0, Math.floor((new Date(season.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="min-h-screen bg-bg text-accent-700 ">
      <div className="max-w-5xl mx-auto p-8">
        <header className="mb-8 border-b border-border pb-4">
          <div className="flex justify-between items-end">
            <div>
              <div className="text-xs text-muted mb-1">Current season</div>
              <h1 className="text-2xl font-bold text-accent-700">{season.name}</h1>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-danger">{daysLeft}d remaining</div>
              <div className="text-xs text-muted">until roster lock</div>
            </div>
          </div>
        </header>

        <div className="flex gap-2 mb-6">
          {DIVISIONS.map(div => (
            <button
              key={div}
              onClick={() => setDivision(div)}
              className={`px-6 py-2 text-sm  border transition-colors ${
                division === div
                  ? 'border-accent-500 text-accent-700 bg-accent-600/10'
                  : 'border-border text-muted hover:bg-surface-2 hover:text-white'
              }`}
            >
              {div}
            </button>
          ))}
        </div>

        <div className="border border-border overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-xs text-muted uppercase tracking-wider">
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
                  <td colSpan={6} className="p-6 text-center text-muted text-sm">
                    No players in this division
                  </td>
                </tr>
              ) : (
                standings.map((user, idx) => (
                  <tr key={user.user_id} className={`border-b border-border/50 hover:bg-accent-600/5 transition-colors ${idx < 3 ? 'bg-accent-600/5' : ''}`}>
                    <td className="p-3 text-center font-bold ">
                      <span className={`${idx === 0 ? 'text-danger text-lg' : idx === 1 ? 'text-accent-700' : idx === 2 ? 'text-muted' : 'text-muted'}`}>
                        {user.rank}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-accent-700">{user.user_id}</td>
                    <td className="p-3 text-muted">{user.elo}</td>
                    <td className="p-3 text-muted">
                      <span className="text-accent-700">{user.wins}</span> - <span className="text-danger">{user.losses}</span>
                    </td>
                    <td className="p-3 text-accent-700 font-bold">{user.points}</td>
                    <td className="p-3 text-center">
                      {user.trend === 'promoted' && <span className="text-accent-700 text-xs">↑ promoted</span>}
                      {user.trend === 'relegated' && <span className="text-danger text-xs">↓ relegated</span>}
                      {user.trend === 'same' && <span className="text-muted">—</span>}
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
