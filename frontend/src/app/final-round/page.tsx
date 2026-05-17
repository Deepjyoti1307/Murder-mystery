'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useUser } from "@clerk/nextjs";
import { API_BASE_URL } from '@/lib/api';

const BATCH_ID = 10; // Final Round is batch_id=10 in DB (separate from Batch 3)

/* ── Styles ── */
const styles = {
  sectionHeader: { color: '#DC143C', fontFamily: 'var(--font-nosifer), sans-serif', fontSize: '1.1rem', letterSpacing: '0.25em', textTransform: 'uppercase' as const, borderBottom: '1px solid rgba(139,0,0,0.3)', paddingBottom: '0.85rem', marginTop: '3rem', marginBottom: '1.25rem' } as React.CSSProperties,
  subHeader: { color: '#DC143C', fontSize: '0.95rem', letterSpacing: '0.3em', textTransform: 'uppercase' as const, fontWeight: 700, marginTop: '2.25rem', marginBottom: '1rem' } as React.CSSProperties,
  narrative: { color: 'rgba(227,190,184,0.9)', lineHeight: 2.1, fontSize: '1.05rem', textAlign: 'justify' as const, marginBottom: '1.25rem' } as React.CSSProperties,
  bullet: { color: 'rgba(227,190,184,0.9)', lineHeight: 2, fontSize: '1.05rem', paddingLeft: '1.25rem', position: 'relative' as const, marginBottom: '0.65rem', display: 'flex', gap: '0.85rem', alignItems: 'flex-start' } as React.CSSProperties,
  bold: { color: '#e2e2e2', fontWeight: 700 },
};

function parseBold(text: string): React.ReactNode[] {
  const parts = text.split(/\*{2,4}(.*?)\*{2,4}/g);
  return parts.map((p, i) => i % 2 === 1 ? <span key={i} style={styles.bold}>{p}</span> : p);
}

function StoryRenderer({ content }: { content: string }) {
  if (!content) return null;
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }

    if (/^##\s+/.test(line)) {
      const text = line.replace(/^#+\s*/, '');
      elements.push(<div key={i} style={styles.sectionHeader}>{text}</div>);
      i++; continue;
    }
    if (/^###\s+/.test(line)) {
      const text = line.replace(/^#+\s*/, '');
      elements.push(<div key={i} style={styles.subHeader}>{text}</div>);
      i++; continue;
    }
    if (line.startsWith('•')) {
      elements.push(
        <div key={i} style={styles.bullet}>
          <span style={{ color: '#DC143C', flexShrink: 0 }}>▸</span>
          <span>{parseBold(line.replace(/^•\s*/, ''))}</span>
        </div>
      );
      i++; continue;
    }
    if (/^— END OF/i.test(line)) {
      elements.push(
        <div key={i} style={{ textAlign: 'center', color: '#DC143C', letterSpacing: '0.3em', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, padding: '0.75rem 0', borderTop: '2px solid rgba(139,0,0,0.3)', marginTop: '2.5rem' }}>
          {line}
        </div>
      );
      i++; continue;
    }

    const paraLines: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(##|###|•|— END)/i.test(lines[i].trim())) {
      paraLines.push(lines[i].trim());
      i++;
    }
    elements.push(<p key={`p-${i}`} style={styles.narrative}>{parseBold(paraLines.join(' '))}</p>);
  }

  return <div>{elements}</div>;
}

/* ── Riddle Modal ── */
function RiddleModal({ onClose, onSolve }: { onClose: () => void; onSolve: () => void }) {
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const RIDDLE = `ত্রিনয়ন ও ত্রিনয়ন এট্টু জিরো`;

  const CORRECT_ANSWER = '39039820';

  const handleSubmit = () => {
    const cleaned = answer.trim();
    if (cleaned === CORRECT_ANSWER) {
      onSolve();
    } else {
      setError('INCORRECT. ANALYSE THE EVIDENCE AGAIN.');
      setShake(true);
      setTimeout(() => setShake(false), 600);
      setAnswer('');
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={onClose} />
      <div className={`relative bg-zinc-950 border-2 border-blood-red/60 w-full max-w-xl shadow-[0_0_80px_rgba(220,20,60,0.35)] ${shake ? '' : ''}`}
        style={shake ? { animation: 'shake 0.3s ease-in-out' } : {}}>

        {/* Top accent */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-crimson-glare to-transparent" />

        {/* Scanline overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.8) 0px, rgba(255,255,255,0.8) 1px, transparent 1px, transparent 4px)' }} />

        <div className="p-8 md:p-10">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-blood-red animate-pulse" />
            <div className="text-xs text-blood-red font-bold tracking-[0.4em] uppercase">Encrypted Cipher Unlocked</div>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-widest uppercase mb-8">Solve The Riddle</h2>

          {/* Riddle box */}
          <div className="bg-black/70 border border-blood-red/20 px-8 py-7 mb-8 relative">
            <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-blood-red/40" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-blood-red/40" />
            <p className="font-mono text-xl md:text-2xl text-amber-200/90 leading-relaxed tracking-wide">
              {RIDDLE}
            </p>
          </div>

          <div className="space-y-4">
            <input
              ref={inputRef}
              type="text"
              value={answer}
              onChange={e => { setAnswer(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Type your answer..."
              className="w-full bg-zinc-900/80 border border-white/15 focus:border-blood-red text-white text-lg px-5 py-4 outline-none tracking-widest placeholder:text-white/20 transition-all rounded-sm"
            />
            {error && (
              <div className="text-blood-red text-sm font-bold tracking-widest animate-pulse">{error}</div>
            )}
            <div className="flex gap-3 pt-1">
              <button
                onClick={onClose}
                className="flex-1 py-3.5 border border-white/10 text-white/40 hover:text-white text-sm font-bold uppercase tracking-widest transition-all rounded-full"
              >
                Close
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-3.5 bg-blood-red hover:bg-crimson-glare text-white text-sm font-bold uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(220,20,60,0.4)] rounded-full"
              >
                Submit Answer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Weapon Reveal Modal ── */
function WeaponRevealModal({ onClose }: { onClose: () => void }) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/98 backdrop-blur-lg" />
      <div className="relative w-full max-w-xl text-center">

        {/* Blood drips */}
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex gap-5">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="w-1 bg-blood-red rounded-b-full animate-pulse"
              style={{ height: `${10 + i * 7}px`, animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>

        <div className={`transition-all duration-700 ${revealed ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <div className="text-sm text-blood-red font-bold tracking-[0.5em] uppercase mb-4 animate-pulse">
            🔴 CASE CLOSED — EVIDENCE CONFIRMED
          </div>

          <div className="border-2 border-blood-red/60 bg-zinc-950/90 p-10 md:p-14 shadow-[0_0_100px_rgba(220,20,60,0.5)]"
            style={{ backgroundImage: 'radial-gradient(ellipse at center, rgba(139,0,0,0.15) 0%, transparent 70%)' }}>

            <div className="text-sm text-white/40 tracking-[0.4em] uppercase mb-6">Murder Weapon Identified</div>

            <div className="text-7xl mb-6" style={{ filter: 'drop-shadow(0 0 20px rgba(220,20,60,0.7))' }}>☠</div>

            <div className="text-4xl md:text-5xl font-bold text-blood-red tracking-[0.3em] uppercase mb-3 font-mono"
              style={{ textShadow: '0 0 40px rgba(220,20,60,0.9)' }}>
              A VIAL OF<br/>ARSENIC TRIOXIDE
            </div>

            <div className="w-20 h-px bg-blood-red/40 mx-auto my-6" />

            <div className="text-base md:text-lg text-amber-200/75 leading-relaxed">
              The toxicology report confirmed traces of <strong>Arsenic Trioxide (As₂O₃)</strong> in the professor's teacup — a colourless, odourless poison that mimics natural illness. Silent, invisible, leaving no wound. The truth was in the cup all along.
            </div>

          </div>

          <button
            onClick={onClose}
            className="mt-8 px-12 py-4 border-2 border-blood-red text-blood-red hover:bg-blood-red hover:text-white text-sm font-bold uppercase tracking-widest transition-all rounded-full"
          >
            Close Investigation
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function FinalRoundPage() {
  const { user } = useUser();
  const [story, setStory] = useState('');
  const [loading, setLoading] = useState(true);
  const [teamInfo, setTeamInfo] = useState<{team_name:string;team_id:string;leader_name:string;phone_number:string;college_name:string} | null>(null);

  // Modal states
  const [showRiddle, setShowRiddle] = useState(false);
  const [showWeapon, setShowWeapon] = useState(false);

  // Hidden button: visible after scrolling 60% of page
  const [hiddenVisible, setHiddenVisible] = useState(false);
  const hiddenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    const fetchStory = async () => {
      try {
        await fetch(`${API_BASE_URL}/api/batch/${BATCH_ID}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clerk_id: user?.id })
        });
        const res = await fetch(`${API_BASE_URL}/api/story/${BATCH_ID}`);
        const data = await res.json();
        if (res.ok) setStory(data.content);

        // Fetch team info for solver recording
        const teamsRes = await fetch(`${API_BASE_URL}/api/admin/teams?clerk_id=ACCESS_GRANTED_2026`);
        if (teamsRes.ok) {
          const allTeams = await teamsRes.json();
          const myTeam = allTeams.find((t: any) => t.clerk_id === user?.id && t.batch_id === BATCH_ID);
          if (myTeam) setTeamInfo(myTeam);
        }
      } catch (err) {
        console.error("Failed to load dossier.");
      } finally {
        setLoading(false);
      }
    };

    fetchStory();
  }, [user]);

  // Intersection observer for hidden button
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setHiddenVisible(true); },
      { threshold: 0.3 }
    );
    if (hiddenRef.current) observer.observe(hiddenRef.current);
    return () => observer.disconnect();
  }, [loading]);

  const handleSolve = async () => {
    setShowRiddle(false);
    // Record this team as a solver in the DB
    if (user && teamInfo) {
      try {
        await fetch(`${API_BASE_URL}/api/final-round/solved`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clerk_id: user.id,
            team_name: teamInfo.team_name,
            team_id: teamInfo.team_id,
            leader_name: teamInfo.leader_name,
            phone_number: teamInfo.phone_number,
            college_name: teamInfo.college_name,
          })
        });
      } catch (e) { /* silent fail — don't block reveal */ }
    }
    setTimeout(() => setShowWeapon(true), 300);
  };

  if (loading) return (
    <div className="bg-void-black min-h-screen flex items-center justify-center">
      <div className="text-crimson-glare animate-pulse font-headline-xl text-2xl tracking-widest">DECRYPTING FINAL DOSSIER...</div>
    </div>
  );

  return (
    <div className="bg-void-black min-h-screen text-on-surface selection:bg-crimson-glare selection:text-white pb-32">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-void-black/90 backdrop-blur-md border-b-2 border-blood-red/30 py-4 px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-4 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col items-center md:items-start">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-blood-red rounded-full animate-pulse" />
            <span className="text-blood-red text-[10px] font-bold tracking-[0.5em] uppercase">FINAL ROUND — CLASSIFIED</span>
          </div>
          <h1 className="font-headline-xl text-lg md:text-2xl text-on-surface tracking-widest uppercase">
            DEAD ON CAMPUS — RCCIIT
          </h1>
          <p className="text-crimson-glare/60 font-body-sm uppercase tracking-widest text-[10px]">
            Operative: {user?.firstName || 'UNKNOWN'}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-blood-red/10 border border-blood-red/20 rounded-full px-4 py-2">
          <div className="w-2 h-2 rounded-full bg-blood-red animate-pulse" />
          <span className="text-blood-red/70 text-[10px] font-bold tracking-[0.4em] uppercase">No Time Limit</span>
        </div>
      </header>

      {/* Main Dossier */}
      <main className="max-w-4xl mx-auto mt-8 md:mt-16 px-4 md:px-8 pb-16">
        <div className="bg-zinc-900/30 border border-blood-red/10 p-6 md:p-16 lg:p-20 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-blood-red/30" />
          <div className="absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 border-blood-red/30" />
          <div className="absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 border-blood-red/30" />
          <div className="absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 border-blood-red/30" />

          <div className="flex items-center gap-4 mb-10 md:mb-14 border-b border-blood-red/20 pb-8">
            <div className="w-12 md:w-16 h-1 bg-blood-red" />
            <h2 className="font-headline-xl text-3xl md:text-5xl text-on-surface tracking-[0.2em] uppercase">Eyes Only</h2>
          </div>

          <StoryRenderer content={story} />

          {/* ── Hidden Clue Section — appears after scrolling ── */}
          <div ref={hiddenRef} className="mt-20">
            <div className={`transition-all duration-1000 ${hiddenVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="border border-dashed border-blood-red/25 p-10 text-center bg-black/50">
                <div className="text-xs text-white/20 tracking-[0.5em] uppercase mb-5">
                  ████████ CLASSIFIED DATA ████████
                </div>
                <div className="text-sm text-amber-200/40 font-mono mb-8 leading-relaxed">
                  The tea cup was analysed. The scattered papers held one final note. A cipher, encoded in plain sight.<br />
                  <span className="text-white/20">If you know where to look, you will find the answer.</span>
                </div>
                <button
                  onClick={() => setShowRiddle(true)}
                  className="group relative px-10 py-4 border border-blood-red/30 text-blood-red/50 hover:text-blood-red hover:border-blood-red text-sm font-bold uppercase tracking-[0.4em] transition-all duration-500 hover:shadow-[0_0_25px_rgba(220,20,60,0.35)] rounded-full"
                >
                  <span className="opacity-30 group-hover:opacity-100 transition-opacity duration-500">
                    ⬡ Access Cipher ⬡
                  </span>
                </button>
                <div className="text-xs text-white/10 tracking-widest uppercase mt-5">
                  Authorisation required — proceed with caution
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-blood-red/10 flex justify-between items-end opacity-40">
            <div className="font-body-sm text-[10px] uppercase tracking-widest">TechTrix 2026 // Classified Archive</div>
            <div className="text-right">
              <p className="text-[8px] uppercase tracking-tighter">Authorized by</p>
              <p className="font-headline-md text-sm">ARCHIVIST PRIME</p>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {showRiddle && (
        <RiddleModal
          onClose={() => setShowRiddle(false)}
          onSolve={handleSolve}
        />
      )}
      {showWeapon && (
        <WeaponRevealModal onClose={() => setShowWeapon(false)} />
      )}

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}
