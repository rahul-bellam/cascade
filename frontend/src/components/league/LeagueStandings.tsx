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
      <div className="min-h-screen bg-[#0F0F23] flex items-center justify-center font-['Chakra_Petch',sans-serif]">
        <div className="text-[#A78BFA] text-2xl tracking-widest animate-pulse drop-shadow-[0_0_8px_#A78BFA]">
          LOADING_STANDINGS...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0F0F23] flex flex-col items-center justify-center font-['Chakra_Petch',sans-serif]">
        <div className="text-[#EF4444] text-xl mb-4 font-bold tracking-widest uppercase">
          SYSTEM_ERROR
        </div>
        <div className="text-[#E2E8F0]">{error}</div>
      </div>
    );
  }

  if (!season) {
    return (
      <div className="min-h-screen bg-[#0F0F23] flex items-center justify-center font-['Chakra_Petch',sans-serif]">
        <div className="text-[#E2E8F0] text-xl opacity-50 tracking-widest">
          NO_ACTIVE_SEASON_FOUND
        </div>
      </div>
    );
  }

  const daysLeft = Math.max(0, Math.floor((new Date(season.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="min-h-screen bg-[#0F0F23] text-[#E2E8F0] font-['Chakra_Petch',sans-serif] p-8 relative overflow-hidden">
      
      {/* Background CRT Effects */}
      <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-50"></div>

      <div className="max-w-5xl mx-auto relative z-10">
        
        {/* Season Header */}
        <header className="mb-12 border-b border-[#4C1D95] pb-6 relative">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-[#A78BFA] text-sm tracking-[0.3em] uppercase mb-2">Current Season</h3>
              <h1 className="text-5xl font-bold text-[#FFFFFF] tracking-wider" style={{ textShadow: '0 0 10px #7C3AED' }}>
                {season.name}
              </h1>
            </div>
            <div className="text-right">
              <div className="text-[#F43F5E] text-2xl font-bold tracking-widest" style={{ textShadow: '0 0 8px #F43F5E' }}>
                {daysLeft} DAYS LEFT
              </div>
              <div className="text-[#A78BFA] text-xs uppercase tracking-widest mt-1">
                UNTIL ROSTER LOCK
              </div>
            </div>
          </div>
        </header>

        {/* Division Selector */}
        <div className="flex gap-4 mb-8">
          {DIVISIONS.map(div => (
            <button
              key={div}
              onClick={() => setDivision(div)}
              className={`px-8 py-3 font-bold uppercase tracking-widest transition-all duration-300 ${
                division === div 
                  ? 'bg-[#7C3AED] text-[#FFFFFF] shadow-[0_0_15px_#7C3AED] border border-[#A78BFA]' 
                  : 'bg-[#27273B] text-[#A78BFA] hover:bg-[#4C1D95]/50 border border-transparent'
              } skew-x-[-10deg]`}
            >
              <div className="skew-x-[10deg]">{div} Division</div>
            </button>
          ))}
        </div>

        {/* Leaderboard Table */}
        <div className="bg-[#1a1a2e] border border-[#4C1D95] rounded-xl overflow-hidden shadow-[0_0_30px_rgba(124,58,237,0.15)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#27273B] border-b border-[#4C1D95] text-xs uppercase tracking-[0.2em] text-[#A78BFA]">
                <th className="p-4 w-20 text-center">Rank</th>
                <th className="p-4">Player</th>
                <th className="p-4 w-32">ELO</th>
                <th className="p-4 w-32">W/L</th>
                <th className="p-4 w-32">Points</th>
                <th className="p-4 w-32 text-center">Trend</th>
              </tr>
            </thead>
            <tbody>
              {standings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#A78BFA] opacity-50 tracking-widest uppercase">
                    No active players in this division
                  </td>
                </tr>
              ) : (
                standings.map((user, idx) => (
                  <tr 
                    key={user.user_id} 
                    className={`border-b border-[#4C1D95]/30 hover:bg-[#7C3AED]/10 transition-colors ${
                      idx < 3 ? 'bg-[#7C3AED]/5' : ''
                    }`}
                  >
                    <td className="p-4 text-center font-bold">
                      <span className={`${
                        idx === 0 ? 'text-[#F43F5E] drop-shadow-[0_0_8px_#F43F5E] text-2xl' : 
                        idx === 1 ? 'text-[#A78BFA] text-xl' : 
                        idx === 2 ? 'text-[#7C3AED] text-lg' : 'text-[#E2E8F0]/50'
                      }`}>
                        {user.rank}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-[#FFFFFF] tracking-wide">
                      {user.user_id}
                    </td>
                    <td className="p-4 font-mono text-[#A78BFA]">{user.elo}</td>
                    <td className="p-4 font-mono text-[#E2E8F0]/70">
                      <span className="text-[#22C55E]">{user.wins}</span> - <span className="text-[#EF4444]">{user.losses}</span>
                    </td>
                    <td className="p-4 font-mono text-[#FFFFFF] font-bold text-lg">{user.points}</td>
                    <td className="p-4 text-center">
                      {user.trend === 'promoted' && <span className="text-[#22C55E] tracking-widest text-xs uppercase drop-shadow-[0_0_5px_#22C55E]">↑ Promoted</span>}
                      {user.trend === 'relegated' && <span className="text-[#EF4444] tracking-widest text-xs uppercase drop-shadow-[0_0_5px_#EF4444]">↓ Relegated</span>}
                      {user.trend === 'same' && <span className="text-[#E2E8F0]/30">—</span>}
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
