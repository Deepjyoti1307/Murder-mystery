'use client';

import React, { useEffect, useState } from 'react';
import { useUser } from "@clerk/nextjs";
import { Lock, Unlock, RotateCcw, Activity, Users, Database, X, Trash2, Plus } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

interface Team {
  clerk_id: string;
  team_name: string;
  team_id?: string;
  leader_name: string;
  college_name: string;
  batch_id: number;
  is_completed: boolean;
  total_score: number;
  current_question: number;
  start_time?: string;
  end_time?: string;
  answers: Array<{
    q_id: number;
    is_correct: boolean;
  }>;
}

interface Batch {
  batch_id: number;
  is_locked: boolean;
  codeword: string;
  story_content: string;
  questions: Array<{
    id: number;
    text: string;
    options: string[];
    correct: string;
    hints: string[];
  }>;
}

export default function AdminDashboard() {
  const { user, isLoaded } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'teams' | 'batches'>('teams');
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      // 1. Check for Secret Key Token first (from /admin/login)
      const authToken = localStorage.getItem('admin_auth_token');
      if (authToken === 'ACCESS_GRANTED_2026') {
        setIsAdmin(true);
        fetchData();
        return;
      }

      // 2. If no token, check Clerk user
      if (!isLoaded) return;
      if (!user) {
        // If Clerk is loaded and no user, we can stop loading
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/check?clerk_id=${user.id}`);
        const data = await res.json();
        if (data.is_admin) {
          setIsAdmin(true);
          fetchData();
        } else {
          setLoading(false);
        }
      } catch (err) {
        setLoading(false);
      }
    };

    checkAdmin();

    let interval: NodeJS.Timeout;
    if (isAdmin) {
      interval = setInterval(fetchData, 5000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [user, isLoaded, isAdmin]);

  const fetchData = async () => {
    // We allow fetching if either Clerk user is admin OR secret token exists
    const identifier = user?.id || localStorage.getItem('admin_auth_token') || "UNAUTHORIZED";
    try {
      const [tRes, bRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/teams?clerk_id=${identifier}`),
        fetch(`${API_BASE_URL}/api/admin/batches?clerk_id=${identifier}`)
      ]);
      const tData = await tRes.json();
      const bData = await bRes.json();
      setTeams(tData);
      setBatches(bData);
    } catch (err) {
      console.error("DATA FETCH ERROR");
    } finally {
      setLoading(false);
    }
  };

  const toggleBatch = async (batchId: number) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/batches/${batchId}/toggle?clerk_id=${user.id}`, {
        method: 'POST'
      });
      if (res.ok) fetchData();
    } catch (err) { }
  };

  const resetTeam = async (teamClerkId: string, batchId: number) => {
    if (!user || !confirm("ARE YOU SURE YOU WANT TO RESET THIS TEAM?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/teams/${teamClerkId}/reset?clerk_id=${user.id}&batch_id=${batchId}`, {
        method: 'POST'
      });
      if (res.ok) fetchData();
    } catch (err) { }
  };

  const saveBatch = async () => {
    if (!user || !editingBatch) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/batches/${editingBatch.batch_id}?clerk_id=${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingBatch)
      });
      if (res.ok) {
        setEditingBatch(null);
        fetchData();
      }
    } catch (err) { }
    finally { setIsSaving(false); }
  };

  if (loading) return (
    <div className="bg-black min-h-screen flex items-center justify-center font-mono text-blood-red text-xs tracking-[0.5em] uppercase">
      AUTHENTICATING ADMIN ACCESS...
    </div>
  );

  if (!isAdmin) return (
    <div className="bg-black min-h-screen flex flex-col items-center justify-center font-mono p-12 text-center space-y-6">
      <div className="text-blood-red text-6xl font-bold animate-pulse">403</div>
      <div className="text-white text-xl tracking-[0.4em] uppercase">UNAUTHORIZED ACCESS DETECTED</div>
      <div className="text-on-surface-variant/40 text-xs uppercase tracking-widest max-w-md">
        This terminal is restricted to authorized TechTrix organizers. Your credentials have been logged.
      </div>
      <a href="/" className="px-8 py-3 border border-white/20 text-white text-xs hover:bg-white/5 transition-all uppercase tracking-widest">
        RETURN TO SURFACE
      </a>
    </div>
  );

  return (
    <div className="bg-void-black min-h-screen text-on-surface font-mono p-6 md:p-12 selection:bg-blood-red/40">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-blood-red rounded-full animate-pulse" />
            <span className="text-blood-red text-xs font-bold tracking-[0.5em] uppercase">CENTRAL INTELLIGENCE COMMAND</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-widest uppercase">ADMIN DASHBOARD</h1>
        </div>

        <div className="flex gap-4">
          <div className="px-6 py-4 bg-zinc-900/50 border border-white/5 flex flex-col items-end">
            <span className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest">ACTIVE TEAMS</span>
            <span className="text-2xl font-bold text-blood-red">{teams.filter(t => !t.is_completed).length}</span>
          </div>
          <div className="px-6 py-4 bg-zinc-900/50 border border-white/5 flex flex-col items-end">
            <span className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest">COMPLETED</span>
            <span className="text-2xl font-bold text-green-500">{teams.filter(t => t.is_completed).length}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/10 mb-8">
        <button
          onClick={() => setActiveTab('teams')}
          className={`pb-4 px-6 text-xs font-bold tracking-[0.3em] uppercase transition-all ${activeTab === 'teams' ? 'text-blood-red border-b-2 border-blood-red' : 'text-on-surface-variant/40 hover:text-white'}`}
        >
          TEAM OPERATIONS
        </button>
        <button
          onClick={() => setActiveTab('batches')}
          className={`pb-4 px-6 text-xs font-bold tracking-[0.3em] uppercase transition-all ${activeTab === 'batches' ? 'text-blood-red border-b-2 border-blood-red' : 'text-on-surface-variant/40 hover:text-white'}`}
        >
          BATCH CONTROL
        </button>
      </div>

      {/* Content */}
      <div className="animate-fadeIn">
        {activeTab === 'teams' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-on-surface-variant/40 text-xs tracking-[0.2em] uppercase font-bold">
                  <th className="py-6 px-4">TEAM / ID</th>
                  <th className="py-6 px-4">COLLEGE</th>
                  <th className="py-6 px-4">STATUS</th>
                  <th className="py-6 px-4">PROGRESS</th>
                  <th className="py-6 px-4">ACCURACY</th>
                  <th className="py-6 px-4">TIME TAKEN</th>
                  <th className="py-6 px-4">SCORE</th>
                  <th className="py-6 px-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {teams.sort((a, b) => b.total_score - a.total_score).map((team) => {
                  const correct = team.answers.filter(a => a.is_correct).length;
                  const incorrect = team.answers.filter(a => !a.is_correct).length;

                  let durationStr = "---";
                  if (team.start_time && team.end_time) {
                    let diff = (new Date(team.end_time).getTime() - new Date(team.start_time).getTime()) / 1000;
                    const maxSeconds = 90 * 60;
                    if (diff > maxSeconds) diff = maxSeconds;
                    durationStr = `${Math.floor(diff / 60)}m ${Math.floor(diff % 60)}s`;
                  } else if (team.start_time) {
                    durationStr = "IN PROGRESS";
                  }

                  return (
                    <tr key={team.clerk_id} className="hover:bg-white/5 transition-colors group">
                      <td className="py-8 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-white text-xl font-bold tracking-widest uppercase">{team.team_name}</span>
                          <span className="text-[10px] text-blood-red font-mono uppercase tracking-widest">{team.team_id || "NO ID"}</span>
                        </div>
                      </td>
                      <td className="py-8 px-4">
                        <span className="text-xs text-on-surface-variant/60 uppercase">{team.college_name}</span>
                      </td>
                      <td className="py-8 px-4">
                        <span className={`text-xs px-3 py-1.5 font-bold rounded-sm tracking-widest uppercase ${team.is_completed ? 'bg-green-500/10 text-green-500' : 'bg-blood-red/10 text-blood-red animate-pulse'}`}>
                          {team.is_completed ? 'MISSION COMPLETE' : 'IN FIELD'}
                        </span>
                      </td>
                      <td className="py-8 px-4 font-bold text-on-surface-variant/60 text-sm tracking-widest">
                        Q{team.current_question}
                      </td>
                      <td className="py-8 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-green-500 text-sm font-bold">✓ {correct}</span>
                          <span className="text-blood-red text-sm font-bold">✗ {incorrect}</span>
                        </div>
                      </td>
                      <td className="py-8 px-4 text-white text-sm font-mono tracking-widest">
                        {durationStr}
                      </td>
                      <td className="py-8 px-4 font-bold text-white text-3xl">
                        {team.total_score}
                      </td>
                      <td className="py-8 px-4 text-right">
                        <button
                          onClick={() => resetTeam(team.clerk_id, team.batch_id)}
                          className="p-4 bg-zinc-900 border border-white/10 text-white/40 hover:text-blood-red hover:border-blood-red transition-all"
                          title="RESET TEAM PROGRESS"
                        >
                          <RotateCcw size={20} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-24">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {batches.map((batch) => (
                <div key={batch.batch_id} className="bg-zinc-900/50 border border-white/5 p-10 space-y-8 group hover:border-blood-red/40 transition-all relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-all">
                    <Database size={80} className="text-blood-red" />
                  </div>
                  <div className="flex justify-between items-start relative z-10">
                    <div className="space-y-2">
                      <span className="text-xs text-on-surface-variant/40 font-bold uppercase tracking-[0.2em]">OPERATIONAL BATCH</span>
                      <h3 className="text-4xl font-bold text-white">BATCH {batch.batch_id}</h3>
                    </div>
                    <div className={`p-5 rounded-sm ${batch.is_locked ? 'bg-blood-red/10 text-blood-red' : 'bg-green-500/10 text-green-500'}`}>
                      {batch.is_locked ? <Lock size={32} /> : <Unlock size={32} />}
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 relative z-10 pt-4">
                    <button
                      onClick={() => toggleBatch(batch.batch_id)}
                      className={`w-full py-5 font-bold uppercase tracking-[0.2em] text-sm transition-all border-2 ${batch.is_locked ? 'bg-blood-red text-white border-blood-red hover:bg-crimson-glare shadow-[0_0_20px_rgba(220,20,60,0.3)]' : 'border-white/10 text-on-surface-variant hover:border-white/40'}`}
                    >
                      {batch.is_locked ? 'UNLOCK BATCH' : 'LOCK BATCH'}
                    </button>
                    <button
                      onClick={() => setEditingBatch(batch)}
                      className="w-full py-4 bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest border border-white/10 transition-all"
                    >
                      EDIT BATCH INTEL
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Answer Keys Preview */}
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <Database className="text-blood-red" size={24} />
                <h2 className="text-3xl font-bold text-white tracking-widest uppercase">INTEL DATABASE: ANSWER KEYS</h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {batches.map((batch) => (
                  <div key={`key-${batch.batch_id}`} className="bg-zinc-900/30 border border-white/5 p-8">
                    <h3 className="text-xl font-bold text-blood-red mb-6 tracking-widest uppercase">BATCH {batch.batch_id} KEYS</h3>
                    <div className="space-y-4">
                      {batch.questions?.map((q) => (
                        <div key={q.id} className="flex justify-between items-center p-4 bg-black/40 border border-white/5">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-on-surface-variant/40 font-bold">CASE Q{q.id}</span>
                            <span className="text-sm text-white/80 line-clamp-1 max-w-md">{q.text}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-on-surface-variant/40 font-bold uppercase">CORRECT KEY</span>
                            <span className="text-xl font-bold text-blood-red">{q.correct}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

    {/* Batch Editor Modal */}
      {editingBatch && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setEditingBatch(null)} />
          <div className="relative bg-zinc-900 border-2 border-blood-red w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_0_100px_rgba(220,20,60,0.3)]">
            <div className="p-8 border-b border-white/10 flex justify-between items-center bg-black/40">
              <div className="space-y-1">
                <span className="text-blood-red text-[10px] font-bold tracking-[0.4em] uppercase">SYSTEM OVERRIDE</span>
                <h2 className="text-2xl font-bold text-white uppercase tracking-widest">BATCH {editingBatch.batch_id} // INTEL SYNCHRONIZER</h2>
              </div>
              <button onClick={() => setEditingBatch(null)} className="p-2 text-on-surface-variant hover:text-blood-red transition-colors">
                <X size={32} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-16 custom-scrollbar">
              {/* Batch Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4">
                  <label className="text-[10px] text-blood-red font-bold uppercase tracking-[0.3em]">DECRYPTION KEY (CODEWORD)</label>
                  <input
                    type="text"
                    value={editingBatch.codeword}
                    onChange={(e) => setEditingBatch(prev => prev ? { ...prev, codeword: e.target.value } : null)}
                    className="w-full bg-black/40 border border-white/10 p-5 text-xl font-bold text-white focus:border-blood-red transition-all outline-none"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] text-on-surface-variant/40 font-bold uppercase tracking-[0.3em]">BATCH ID</label>
                  <div className="p-5 bg-white/5 text-xl font-bold text-white/40 border border-white/5 uppercase">
                    B-{editingBatch.batch_id}
                  </div>
                </div>
              </div>

              {/* Story Editor */}
              <div className="space-y-4">
                <label className="text-[10px] text-blood-red font-bold uppercase tracking-[0.3em]">MISSION BRIEFING (STORY)</label>
                <textarea
                  value={editingBatch.story_content}
                  onChange={(e) => setEditingBatch(prev => prev ? { ...prev, story_content: e.target.value } : null)}
                  className="w-full bg-black/40 border border-white/10 p-8 min-h-[300px] text-lg leading-relaxed text-white/80 focus:border-blood-red transition-all outline-none resize-none font-sans"
                />
              </div>

              {/* Questionnaire */}
              <div className="space-y-10">
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-white/5" />
                  <label className="text-lg text-white font-bold uppercase tracking-widest">QUESTIONNAIRE & HINT DATA</label>
                </div>
                
                {editingBatch.questions.map((q, qIdx) => (
                  <div key={q.id} className="bg-black/40 p-8 border border-white/5 space-y-8 relative group hover:border-white/10 transition-all">
                    <div className="absolute -top-3 -left-3 bg-blood-red text-white text-[10px] px-4 py-2 font-bold tracking-widest">Q{q.id}</div>

                    <div className="space-y-4">
                      <label className="text-[10px] text-on-surface-variant/40 font-bold tracking-widest uppercase">CASE QUESTION TEXT</label>
                      <input
                        type="text"
                        value={q.text}
                        onChange={(e) => {
                          const newQs = [...editingBatch.questions];
                          newQs[qIdx].text = e.target.value;
                          setEditingBatch({ ...editingBatch, questions: newQs });
                        }}
                        className="w-full bg-zinc-900 border border-white/5 p-4 text-white focus:border-blood-red outline-none transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Options */}
                      <div className="space-y-4">
                        <label className="text-[10px] text-on-surface-variant/40 font-bold tracking-widest uppercase">INTEL OPTIONS (CSV)</label>
                        <input
                          type="text"
                          value={q.options.join(', ')}
                          onChange={(e) => {
                            const newQs = [...editingBatch.questions];
                            newQs[qIdx].options = e.target.value.split(',').map(s => s.trim());
                            setEditingBatch({ ...editingBatch, questions: newQs });
                          }}
                          className="w-full bg-zinc-900 border border-white/5 p-4 text-white focus:border-blood-red outline-none transition-all"
                        />
                      </div>
                      {/* Correct Answer */}
                      <div className="space-y-4">
                        <label className="text-[10px] text-blood-red font-bold tracking-widest uppercase">CORRECT KEY</label>
                        <input
                          type="text"
                          value={q.correct}
                          onChange={(e) => {
                            const newQs = [...editingBatch.questions];
                            newQs[qIdx].correct = e.target.value;
                            setEditingBatch({ ...editingBatch, questions: newQs });
                          }}
                          className="w-full bg-zinc-900 border border-blood-red p-4 text-white focus:ring-1 focus:ring-blood-red outline-none transition-all font-bold"
                        />
                      </div>
                    </div>

                    {/* Hints Management */}

                    <div className="space-y-4 border-t border-white/5 pt-6">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] text-on-surface-variant/40 font-bold tracking-widest uppercase">HINTS DATABASE (POINTS: -2, -4)</label>
                        <button
                          onClick={() => {
                            setEditingBatch(prev => {
                              if (!prev) return null;
                              const newQs = prev.questions.map((question, idx) => 
                                idx === qIdx ? { ...question, hints: [...question.hints, ""] } : question
                              );
                              return { ...prev, questions: newQs };
                            });
                          }}
                          className="flex items-center gap-2 text-[10px] text-green-500 font-bold uppercase tracking-widest hover:text-green-400 transition-colors"
                        >
                          <Plus size={14} /> ADD HINT
                        </button>
                      </div>

                      
                      <div className="grid grid-cols-1 gap-4">
                        {q.hints.map((hint, hIdx) => (
                          <div key={hIdx} className="flex gap-4 items-center group/hint">
                            <span className="text-[10px] text-blood-red font-bold">#{hIdx + 1}</span>
                            <input
                              type="text"
                              value={hint}
                              onChange={(e) => {
                                const newQs = [...editingBatch.questions];
                                newQs[qIdx].hints[hIdx] = e.target.value;
                                setEditingBatch({ ...editingBatch, questions: newQs });
                              }}
                              className="flex-1 bg-zinc-900/50 border border-white/5 p-3 text-sm text-white/60 focus:text-white transition-all outline-none"
                              placeholder={`Hint ${hIdx + 1}...`}
                            />
                            <button
                              onClick={() => {
                                setEditingBatch(prev => {
                                  if (!prev) return null;
                                  const newQs = prev.questions.map((question, idx) => {
                                    if (idx === qIdx) {
                                      const newHints = question.hints.filter((_, hidx) => hidx !== hIdx);
                                      return { ...question, hints: newHints };
                                    }
                                    return question;
                                  });
                                  return { ...prev, questions: newQs };
                                });
                              }}
                              className="p-2 text-on-surface-variant/20 hover:text-blood-red transition-colors"
                              title="DELETE HINT"
                            >
                              <Trash2 size={16} />
                            </button>

                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-8 md:p-12 border-t border-white/10 bg-black/60 flex flex-col md:flex-row justify-end gap-6 items-center">
               <p className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest mr-auto">Changes will be pushed to the global database immediately upon synchronization.</p>
               <button 
                onClick={() => setEditingBatch(null)}
                className="w-full md:w-auto px-10 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-white transition-all border border-transparent hover:border-white/10"
               >
                ABORT CHANGES
               </button>
               <button 
                onClick={saveBatch}
                disabled={isSaving}
                className="w-full md:w-auto px-16 py-5 bg-blood-red hover:bg-crimson-glare text-white text-[10px] font-bold uppercase tracking-widest shadow-[0_0_30px_rgba(220,20,60,0.5)] transition-all disabled:opacity-50 active:scale-95"
               >
                {isSaving ? 'SYNCHRONIZING DATA...' : 'PUSH TO DATABASE'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
