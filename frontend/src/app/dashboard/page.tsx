'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { UserButton, useUser } from "@clerk/nextjs";
import { API_BASE_URL } from '@/lib/api';

const Scene = dynamic(() => import('../../components/Scene'), { ssr: false });

export default function Dashboard() {
  const { user } = useUser();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    teamName: '',
    teamId: '',
    leaderName: '',
    phoneNumber: '',
    collegeName: '',
    accessCode: ''
  });
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);

  const CORRECT_CODE = "CRIMSON2026"; // You can change this secret code

  const handleBatchClick = (batchNumber: number) => {
    setSelectedBatch(batchNumber);
    setIsModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsPending(true);

    try {
      // Final Round is displayed as batch 4 in UI but maps to batch_id 10 in DB
      const apiBatchId = selectedBatch === 4 ? 10 : selectedBatch;

      const response = await fetch(`${API_BASE_URL}/api/batch/${apiBatchId}/enter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          team_name: formData.teamName,
          team_id: formData.teamId,
          leader_name: formData.leaderName,
          phone_number: formData.phoneNumber,
          college_name: formData.collegeName,
          access_code: formData.accessCode,
          clerk_id: user?.id
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Final Round goes to its own special page
        if (selectedBatch === 4) {
          router.push(`/final-round`);
        } else if (selectedBatch === 3) {
          router.push(`/story/3`);
        } else {
          router.push(`/story/${selectedBatch}`);
        }

      } else {
        const errorMsg = typeof data.detail === 'string'
          ? data.detail
          : Array.isArray(data.detail)
            ? data.detail[0]?.msg
            : 'AUTHORIZATION DENIED. CHECK YOUR CODE.';
        setError(errorMsg);
      }
    } catch (err) {
      setError('COMMUNICATION FAILURE. TERMINAL OFFLINE.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="bg-void-black text-on-surface font-body-md min-h-screen flex flex-col relative overflow-hidden selection:bg-crimson-glare selection:text-white">

      {/* Background Scene (Subtle) */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
        <Scene />
        <div className="absolute inset-0 bg-void-black/60"></div>
      </div>

      {/* Main Content Area */}
      <main className="relative z-20 flex-1 flex flex-col h-screen overflow-y-auto">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-void-black/90 backdrop-blur-xl border-b-2 border-blood-red/20 py-3 px-4 md:py-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h1 className="font-headline-xl text-xl md:text-3xl text-on-surface tracking-[0.2em] md:tracking-[0.3em] uppercase drop-shadow-hazard-glow">
              Investigation Hub
            </h1>
            <div className="flex items-center gap-2 md:gap-4 mt-1">
              <p className="text-on-surface-variant/40 font-body-sm uppercase tracking-widest text-[9px] md:text-xs">
                Sector 4 // Anomaly-77
              </p>
              <div className="h-3 md:h-4 w-[1px] bg-blood-red/20"></div>
              <p className="text-crimson-glare font-body-sm uppercase tracking-widest font-bold text-[9px] md:text-xs">
                Operative {user?.firstName?.toUpperCase() || 'UNKNOWN'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-8">
            <div className="flex items-center gap-3 md:gap-6">
              <span className="font-headline-md text-crimson-glare animate-pulse tracking-widest text-xs md:text-base">T-MINUS: 04:12:59</span>
              <div className="h-6 md:h-8 w-[2px] bg-blood-red/20"></div>
              <UserButton appearance={{ elements: { userButtonAvatarBox: "w-8 h-8 md:w-10 md:h-10 border-2 border-blood-red shadow-[0_0_10px_rgba(139,0,0,0.5)]" } }} />
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-4 md:p-8 lg:p-12 space-y-8 md:space-y-12 max-w-7xl mx-auto w-full">
          {/* Welcome Intro */}
          <div className="space-y-3 md:space-y-4 text-center md:text-left">
            <div className="flex items-center gap-3 justify-center md:justify-start">
              <div className="w-8 h-[2px] bg-blood-red" />
              <span className="text-[9px] text-blood-red font-bold tracking-[0.5em] uppercase">Clearance Level: Operative</span>
              <div className="w-8 h-[2px] bg-blood-red" />
            </div>
            <h2 className="font-headline-xl text-3xl md:text-5xl text-on-surface uppercase tracking-widest opacity-90">
              Classified Archive
            </h2>
            <p className="font-body-lg text-on-surface-variant/50 max-w-2xl leading-relaxed mx-auto md:mx-0 text-sm md:text-base">
              Select your assigned evidence batch. Access is strictly compartmentalized. Unauthorized entry will be logged.
            </p>
          </div>

          {/* Batches Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 md:gap-6">

            {/* ── Batch Cards 1, 2, 3 ── */}
            {[
              { id: 1, label: 'Batch 1', desc: 'Initial crime scene evidence. Witness transcripts, photography & preliminary autopsy reports.' },
              { id: 2, label: 'Batch 2', desc: 'Secondary evidence compartment. Intercepted communications & surveillance data.' },
              { id: 3, label: 'Batch 3', desc: 'Tertiary archive. Deep case files with restricted forensic analysis documents.' },
            ].map(({ id, label, desc }) => (
              <button
                key={id}
                onClick={() => handleBatchClick(id)}
                className="group relative flex flex-col bg-zinc-950 border border-blood-red/20 hover:border-blood-red/60 transition-all duration-500 text-left overflow-hidden"
                style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 32px rgba(139,0,0,0.25), 0 4px 24px rgba(0,0,0,0.5)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.5)')}
              >
                {/* Top shimmer bar */}
                <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-blood-red/50 to-transparent group-hover:via-crimson-glare/80 transition-all duration-500" />

                {/* Locked badge — pill shaped */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/70 border border-blood-red/25 rounded-full px-3 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blood-red/50" />
                  <span className="text-blood-red/60 text-[9px] font-bold tracking-[0.3em] uppercase">Locked</span>
                </div>

                <div className="flex flex-col flex-1 p-6 md:p-7 gap-5">
                  <div>
                    <div className="text-[9px] text-blood-red/35 tracking-[0.5em] uppercase font-bold mb-1">Evidence Archive</div>
                    <h3 className="font-headline-xl text-2xl md:text-3xl text-white uppercase tracking-widest">{label}</h3>
                  </div>

                  <div className="flex-1 flex items-center justify-center py-8">
                    <div className="relative flex items-center justify-center w-16 h-16">
                      <div className="absolute inset-0 rounded-full bg-blood-red/5 group-hover:bg-blood-red/12 blur-xl scale-[2.5] transition-all duration-700" />
                      <span className="material-symbols-outlined text-5xl text-white/10 group-hover:text-blood-red/35 transition-colors duration-500 relative z-10">lock</span>
                    </div>
                  </div>

                  <p className="text-on-surface-variant/40 text-sm leading-relaxed text-center" style={{ minHeight: '3.5rem' }}>{desc}</p>

                  {/* Pill button */}
                  <div className="w-full bg-blood-red/8 group-hover:bg-blood-red border border-blood-red/30 group-hover:border-blood-red rounded-full py-3 text-blood-red/60 group-hover:text-white text-[11px] font-bold uppercase tracking-[0.35em] transition-all duration-300 text-center">
                    Unlock Access
                  </div>
                </div>
              </button>
            ))}

            {/* ── Final Round Card ── */}
            <button
              onClick={() => handleBatchClick(4)}
              className="group relative flex flex-col bg-zinc-950 border border-blood-red/40 hover:border-crimson-glare text-left overflow-hidden transition-all duration-500"
              style={{ boxShadow: '0 0 20px rgba(139,0,0,0.12)' }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 60px rgba(220,20,60,0.35), 0 0 120px rgba(139,0,0,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 20px rgba(139,0,0,0.12)')}
            >
              {/* Animated top bar */}
              <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-crimson-glare to-transparent" style={{ animation: 'pulse 2s ease-in-out infinite' }} />

              {/* Crimson radial bg */}
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(139,0,0,0.2) 0%, transparent 65%)' }} />

              {/* Scanline texture */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.025]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, white 0px, white 1px, transparent 1px, transparent 4px)' }} />

              {/* TOP SECRET badge */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-crimson-glare/12 border border-crimson-glare/50 rounded-full px-3 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-crimson-glare animate-pulse" />
                <span className="text-crimson-glare text-[9px] font-bold tracking-[0.3em] uppercase">Top Secret</span>
              </div>

              <div className="flex flex-col flex-1 p-6 md:p-7 gap-5 relative z-10">
                <div>
                  <div className="text-[9px] text-crimson-glare/50 tracking-[0.5em] uppercase font-bold mb-1">TechTrix 2026 — Classified</div>
                  <h3 className="font-headline-xl text-2xl md:text-3xl text-crimson-glare uppercase tracking-widest leading-snug" style={{ textShadow: '0 0 25px rgba(220,20,60,0.5)' }}>
                    Final<br/>Round
                  </h3>
                </div>

                {/* Skull with pulsing rings */}
                <div className="flex-1 flex items-center justify-center py-8">
                  <div className="relative flex items-center justify-center w-16 h-16">
                    <div className="absolute w-24 h-24 rounded-full border border-blood-red/20 group-hover:border-blood-red/50 group-hover:scale-110 transition-all duration-700" />
                    <div className="absolute w-32 h-32 rounded-full border border-blood-red/10 group-hover:border-blood-red/25 group-hover:scale-110 transition-all duration-1000" />
                    <div className="absolute inset-0 bg-blood-red/15 group-hover:bg-blood-red/30 blur-2xl rounded-full scale-[3] transition-all duration-700" />
                    <div className="text-4xl relative z-10 group-hover:scale-110 transition-transform duration-500" style={{ filter: 'drop-shadow(0 0 16px rgba(220,20,60,0.8))', opacity: 0.75 }}>☠</div>
                  </div>
                </div>

                <p className="text-crimson-glare/40 group-hover:text-crimson-glare/65 text-sm leading-relaxed text-center transition-colors duration-300" style={{ minHeight: '3.5rem' }}>
                  The final confrontation. One case. Five suspects. Only the sharpest minds enter.
                </p>

                {/* Crimson pill button */}
                <div className="w-full bg-crimson-glare/10 group-hover:bg-crimson-glare border border-crimson-glare/45 group-hover:border-crimson-glare rounded-full py-3 text-crimson-glare group-hover:text-white text-[11px] font-bold uppercase tracking-[0.35em] transition-all duration-300 text-center">
                  Enter Final Round
                </div>
              </div>
            </button>
          </div>


          {/* Return Home Link */}
          <div className="pt-8 border-t border-blood-red/10 flex justify-center">
            <Link href="/" className="text-on-surface-variant/40 hover:text-crimson-glare font-headline-md uppercase tracking-[0.3em] transition-colors flex items-center gap-2 group">
              <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
              Return to Surface
            </Link>
          </div>
        </div>
      </main>

      {/* Authorization Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative z-10 w-full max-w-2xl bg-void-black border-2 border-blood-red p-8 md:p-12 shadow-[0_0_50px_rgba(220,20,60,0.3)] max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-start mb-10 border-b-2 border-blood-red/20 pb-6">
              <div>
            <h2 className="font-headline-xl text-2xl md:text-4xl lg:text-5xl text-on-surface tracking-widest uppercase">Access Request</h2>
                <p className="text-crimson-glare font-body-md uppercase mt-2 tracking-[0.2em]">
                  {selectedBatch === 4 ? 'Final Round' : `Batch 0${selectedBatch}`} // Security Protocol 9
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-on-surface/40 hover:text-white transition-colors">
                <span className="material-symbols-outlined text-3xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="block text-xs md:text-sm text-on-surface-variant/60 uppercase tracking-[0.3em] font-bold ml-1">Team Name</label>
                  <input required name="teamName" value={formData.teamName} onChange={handleInputChange} className="w-full bg-black/40 border-2 border-blood-red/30 p-5 font-body-lg text-xl text-white focus:border-crimson-glare outline-none transition-all placeholder:text-white/10 uppercase tracking-widest" placeholder="NAME..." />
                </div>
                <div className="space-y-3">
                  <label className="block text-xs md:text-sm text-on-surface-variant/60 uppercase tracking-[0.3em] font-bold ml-1">Team ID</label>
                  <input required name="teamId" value={formData.teamId} onChange={handleInputChange} className="w-full bg-black/40 border-2 border-blood-red/30 p-5 font-body-lg text-xl text-white focus:border-crimson-glare outline-none transition-all placeholder:text-white/10 uppercase tracking-widest" placeholder="ID..." />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8">
                <div className="space-y-3">
                  <label className="block text-xs md:text-sm text-on-surface-variant/60 uppercase tracking-[0.3em] font-bold ml-1">Team Leader Name</label>
                  <input required name="leaderName" value={formData.leaderName} onChange={handleInputChange} className="w-full bg-black/40 border-2 border-blood-red/30 p-5 font-body-lg text-xl text-white focus:border-crimson-glare outline-none transition-all placeholder:text-white/10 uppercase tracking-widest" placeholder="FULL NAME..." />
                </div>
                <div className="space-y-3">
                  <label className="block text-xs md:text-sm text-on-surface-variant/60 uppercase tracking-[0.3em] font-bold ml-1">Leader Contact No.</label>
                  <input required name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} className="w-full bg-black/40 border-2 border-blood-red/30 p-5 font-body-lg text-xl text-white focus:border-crimson-glare outline-none transition-all placeholder:text-white/10 uppercase tracking-widest" placeholder="+91..." />
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs md:text-sm text-on-surface-variant/60 uppercase tracking-[0.3em] font-bold ml-1">College / Institution</label>
                <input required name="collegeName" value={formData.collegeName} onChange={handleInputChange} className="w-full bg-black/40 border-2 border-blood-red/30 p-5 font-body-lg text-xl text-white focus:border-crimson-glare outline-none transition-all placeholder:text-white/10 uppercase tracking-widest" placeholder="LOCATION IDENTIFIER..." />
              </div>

              <div className="space-y-4 pt-4 border-t border-blood-red/10">
                <label className="block text-xs md:text-sm text-crimson-glare uppercase tracking-[0.3em] font-bold ml-1">Secret Access Code</label>
                <input required name="accessCode" value={formData.accessCode} onChange={handleInputChange} type="password" className="w-full bg-blood-red/5 border-2 border-blood-red/50 p-4 md:p-6 font-headline-xl text-2xl md:text-4xl text-crimson-glare focus:border-crimson-glare outline-none transition-all placeholder:text-blood-red/20 text-center tracking-[0.3em] md:tracking-[0.5em]" placeholder="********" />
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-4 rounded transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-xl tracking-widest border border-red-500/50 shadow-[0_0_20px_rgba(185,28,28,0.3)]"
                >
                  {isPending ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      VERIFYING CLEARANCE...
                    </>
                  ) : (
                    'AUTHORIZE ACCESS'
                  )}
                </button>
              </div>

              {error && (
                <div className="bg-blood-red/10 border border-blood-red/40 p-4 text-blood-red text-center font-bold text-xs animate-shake">
                  {error}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
