'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useUser } from "@clerk/nextjs";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Trophy, Clock, Target, AlertTriangle } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

interface ResultData {
  team_name: string;
  correct: number;
  wrong: number;
  unanswered: number;
  total: number;
  max_score: number;
  time_taken: string;
  score: number;
}

interface LeaderboardEntry {
  team_name: string;
  college: string;
  score: number;
  duration_str: string;
}

export default function ResultsPage() {
  const { id } = useParams();
  const { user } = useUser();
  const [results, setResults] = useState<ResultData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id || !user) return;
      try {
        const [resResponse, leadResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/quiz/${id}/results?clerk_id=${user.id}`),
          fetch(`${API_BASE_URL}/api/quiz/${id}/leaderboard`)
        ]);

        if (resResponse.ok) setResults(await resResponse.json());
        if (leadResponse.ok) setLeaderboard(await leadResponse.json());
      } catch (err) {
        console.error("DATA FETCH ERROR");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, user]);

  if (loading) return (
    <div className="bg-black min-h-screen flex items-center justify-center font-mono text-blood-red tracking-widest uppercase animate-pulse">
      COMPILING FINAL REPORT...
    </div>
  );

  const chartData = results ? [
    { name: 'CORRECT', value: results.correct, color: '#dc143c' },
    { name: 'INCORRECT', value: results.wrong + results.unanswered, color: '#1a1a1a' }
  ] : [];

  return (
    <div className="bg-void-black min-h-screen text-on-surface font-mono relative overflow-x-hidden selection:bg-blood-red/40">

      {/* Background with Theme Integrity */}
      <div className="fixed inset-0 z-0 bg-cover bg-center opacity-40 pointer-events-none" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCNcx60Jfp1KdmECGFeWD1Wim72Vi6llJHHP3rwVMqMCaB-SAFy8VP7Pt2Es766nwjj8_p2Ft9TGjMgXRccbAW57a0kzkfpyZu8ApmjbBN3PA54lTpJSLb9HW398KFb1WtvGSzw5q5ce2qgpqJPAAG4w9ut3p1BUHkl0FhbVIyC6RhOahSw6q9uzYxJz7bp1hPpdr1WRIGNhGMG_HXr47wmaxa6OXxRP3IOmZZzCxadtWXN22N5Q3Ew5L1ioxiAplPUZJFmiEcyOJq1')" }}>
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
        <div className="absolute inset-0 bg-blood-red/10 mix-blend-multiply" />
      </div>

      <div className="relative z-10 p-6 md:p-12 max-w-6xl mx-auto space-y-12 pb-32">

        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-block px-4 py-1 border border-blood-red/40 bg-blood-red/10 text-blood-red text-[10px] font-bold tracking-[0.5em] uppercase animate-pulse">
            INVESTIGATION CONCLUDED
          </div>
          <h1 className="text-4xl md:text-6xl font-bold uppercase tracking-[0.2em] text-white drop-shadow-[0_0_20px_rgba(220,20,60,0.5)]">
            FINAL PERFORMANCE LOG
          </h1>
          <p className="text-on-surface-variant/60 tracking-widest text-xs">
            TEAM: {results?.team_name || 'UNKNOWN OPERATIVES'} // BATCH ID: {id}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main Scoreboard */}
          <div className="lg:col-span-2 bg-zinc-900/80 border-2 border-blood-red/20 p-8 backdrop-blur-md shadow-2xl relative group overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Trophy size={120} className="text-blood-red" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <div className="space-y-2">
                  <span className="text-[10px] text-blood-red/80 font-bold uppercase tracking-widest">TOTAL SCORE</span>
                  <div className="text-7xl font-bold text-white flex items-baseline gap-2">
                    {results?.score}
                    <span className="text-2xl text-blood-red/40">/ {results?.max_score}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-6 pt-4 border-t border-white/5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[10px] text-on-surface-variant font-bold uppercase">
                      <Clock size={12} className="text-blood-red" />
                      TIME
                    </div>
                    <div className="text-xl font-bold text-white tracking-widest">{results?.time_taken}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[10px] text-on-surface-variant font-bold uppercase">
                      <Target size={12} className="text-green-500" />
                      RESOLVED
                    </div>
                    <div className="text-xl font-bold text-white tracking-widest">{results?.correct} <span className="text-[10px] text-white/40">/ {results?.total}</span></div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[10px] text-on-surface-variant font-bold uppercase">
                      <AlertTriangle size={12} className="text-blood-red" />
                      DEDUCTION
                    </div>
                    <div className="text-xl font-bold text-white tracking-widest">
                      {results ? (results.correct * 5) - results.score : 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart Container */}
              <div className="h-64 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#000', border: '1px solid #dc143c', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs text-white/40 font-bold">ACCURACY</span>
                  <span className="text-2xl font-bold text-white">
                    {results ? Math.round((results.correct / results.total) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tactical Summary */}
          <div className="bg-blood-red/10 border-2 border-blood-red/40 p-8 space-y-6 backdrop-blur-md">
            <h3 className="text-sm font-bold uppercase tracking-[0.4em] text-blood-red border-b border-blood-red/20 pb-4">FIELD REPORT</h3>
            <div className="space-y-6">
              <p className="text-xs text-on-surface-variant leading-relaxed italic uppercase">
                "The analysis submitted by Team {results?.team_name} has been processed through the central mainframe. The decryption accuracy stands at {results ? Math.round((results.correct / results.total) * 100) : 0}%. Evidence recovery is in progress based on these findings."
              </p>
              <div className="pt-4 space-y-4">
                <button
                  onClick={() => window.location.href = '/dashboard'}
                  className="w-full bg-blood-red text-white py-4 font-bold uppercase tracking-widest text-[10px] hover:bg-crimson-glare transition-all shadow-[0_0_20px_rgba(220,20,60,0.3)]"
                >
                  RETURN TO DASHBOARD
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard Section */}
        <div className="space-y-6">
          <div className="flex justify-between items-end border-b-2 border-white/5 pb-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold uppercase tracking-widest text-white">LIVE LEADERBOARD</h2>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">Global Investigative Ranking</p>
            </div>
            <div className="text-[10px] text-blood-red font-bold animate-pulse uppercase tracking-widest">
              SYNCED // REAL-TIME
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-4 px-4 text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">RANK</th>
                  <th className="py-4 px-4 text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">TEAM</th>
                  <th className="py-4 px-4 text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">COLLEGE</th>
                  <th className="py-4 px-4 text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">SCORE</th>
                  <th className="py-4 px-4 text-[10px] text-on-surface-variant uppercase tracking-widest font-bold text-right">TIME</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {leaderboard.map((entry, idx) => (
                  <tr key={idx} className={`group transition-all hover:bg-white/5 ${entry.team_name === results?.team_name ? 'bg-blood-red/10' : ''}`}>
                    <td className="py-6 px-4">
                      <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs ${idx === 0 ? 'bg-blood-red border-blood-red text-white shadow-[0_0_10px_rgba(220,20,60,0.5)]' : 'border-white/10 text-white/40'}`}>
                        {idx + 1}
                      </div>
                    </td>
                    <td className="py-6 px-4">
                      <span className={`text-sm font-bold uppercase tracking-widest ${entry.team_name === results?.team_name ? 'text-blood-red' : 'text-white'}`}>
                        {entry.team_name}
                      </span>
                    </td>
                    <td className="py-6 px-4 text-xs text-on-surface-variant/60 uppercase tracking-widest">
                      {entry.college}
                    </td>
                    <td className="py-6 px-4">
                      <span className="text-sm font-bold text-white">{entry.score}</span>
                      <span className="text-[10px] text-on-surface-variant ml-1">PTS</span>
                    </td>
                    <td className="py-6 px-4 text-right">
                      <span className="text-xs font-mono text-blood-red font-bold">{entry.duration_str}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Footer Decoration */}
      <div className="fixed bottom-0 left-0 w-full h-1 bg-blood-red shadow-[0_0_20px_rgba(220,20,60,0.8)] z-50" />
    </div>
  );
}
