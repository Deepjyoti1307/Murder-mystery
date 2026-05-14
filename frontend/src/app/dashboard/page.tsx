'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { UserButton, useUser } from "@clerk/nextjs";

const Scene = dynamic(() => import('../../components/Scene'), { ssr: false });

export default function Dashboard() {
  const { user } = useUser();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    teamName: '',
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
      const response = await fetch(`http://localhost:8000/api/batch/${selectedBatch}/enter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          team_name: formData.teamName,
          leader_name: formData.leaderName,
          phone_number: formData.phoneNumber,
          college_name: formData.collegeName,
          access_code: formData.accessCode,
          clerk_id: user?.id
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Success! Redirect to the story section
        router.push(`/story/${selectedBatch}`);
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
        <header className="sticky top-0 z-30 bg-void-black/90 backdrop-blur-xl border-b-2 border-blood-red/20 py-4 px-8 flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="font-headline-xl text-3xl text-on-surface tracking-[0.3em] uppercase drop-shadow-hazard-glow">
              Investigation Hub
            </h1>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-on-surface-variant/40 font-body-sm uppercase tracking-widest">
                Sector 4 // Anomaly-77
              </p>
              <div className="h-4 w-[1px] bg-blood-red/20"></div>
              <p className="text-crimson-glare font-body-sm uppercase tracking-widest font-bold">
                Operative {user?.firstName?.toUpperCase() || 'UNKNOWN'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="flex items-center gap-6">
              <span className="font-headline-md text-crimson-glare animate-pulse tracking-widest">T-MINUS: 04:12:59</span>
              <div className="h-8 w-[2px] bg-blood-red/20"></div>
              <UserButton appearance={{ elements: { userButtonAvatarBox: "w-10 h-10 border-2 border-blood-red shadow-[0_0_10px_rgba(139,0,0,0.5)]" } }} />
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-8 lg:p-12 space-y-12 max-w-7xl mx-auto w-full">
          {/* Welcome Intro */}
          <div className="space-y-4 text-center md:text-left">
            <h2 className="font-headline-xl text-5xl text-on-surface uppercase tracking-widest opacity-90">
              Classified Archive
            </h2>
            <p className="font-body-lg text-on-surface-variant/60 max-w-2xl leading-relaxed mx-auto md:mx-0">
              Select an assigned evidence batch to proceed. Access is strictly compartmentalized based on current investigation progress and clearance verification.
            </p>
          </div>

          {/* Batches Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Batch 1 */}
            <button 
              onClick={() => handleBatchClick(1)}
              className="group relative bg-void-black/60 border-2 border-blood-red/30 p-1 hover:border-crimson-glare transition-all duration-500 shadow-[0_0_20px_rgba(0,0,0,0.3)] text-left"
            >
              <div className="absolute top-4 right-4 bg-blood-red/10 border border-blood-red/40 text-blood-red text-[10px] px-3 py-1 uppercase font-bold tracking-widest">
                Locked
              </div>
              <div className="p-8 space-y-8 flex flex-col items-center">
                <h3 className="font-headline-xl text-3xl text-on-surface uppercase tracking-widest w-full">Batch 1</h3>
                <div className="relative py-12">
                  <span className="material-symbols-outlined text-8xl text-on-surface-variant/20 group-hover:text-blood-red/40 transition-colors duration-500">lock</span>
                </div>
                <p className="font-body-md text-on-surface-variant/60 text-center leading-relaxed">
                  Initial evidence collection regarding the Sector 4 anomaly. Contains crime scene photography, witness transcripts, and preliminary autopsy reports.
                </p>
                <div className="w-full bg-blood-red/20 border-2 border-blood-red group-hover:bg-blood-red text-white py-4 font-headline-xl text-xl uppercase tracking-widest transition-all duration-300 text-center">
                  Unlock Access
                </div>
              </div>
            </button>

            {/* Batch 2 */}
            <button 
              onClick={() => handleBatchClick(2)}
              className="group relative bg-void-black/60 border-2 border-blood-red/30 p-1 hover:border-crimson-glare transition-all duration-500 shadow-[0_0_20px_rgba(0,0,0,0.3)] text-left"
            >
              <div className="absolute top-4 right-4 bg-blood-red/10 border border-blood-red/40 text-blood-red text-[10px] px-3 py-1 uppercase font-bold tracking-widest">
                Locked
              </div>
              <div className="p-8 space-y-8 flex flex-col items-center">
                <h3 className="font-headline-xl text-3xl text-on-surface uppercase tracking-widest w-full text-center">Batch 2</h3>
                <div className="relative py-12 text-center w-full">
                  <span className="material-symbols-outlined text-8xl text-on-surface-variant/20 group-hover:text-blood-red/40 transition-colors duration-500">lock</span>
                </div>
                <p className="font-body-md text-on-surface-variant/60 text-center leading-relaxed h-20">
                  Secondary evidence compartment. Access restricted pending completion of Batch 1 analysis.
                </p>
                <div className="w-full bg-blood-red/20 border-2 border-blood-red group-hover:bg-blood-red text-white py-4 font-headline-xl text-xl uppercase tracking-widest transition-all duration-300 text-center">
                  Unlock Access
                </div>
              </div>
            </button>

            {/* Batch 3 */}
            <button 
              onClick={() => handleBatchClick(3)}
              className="group relative bg-void-black/60 border-2 border-blood-red/30 p-1 hover:border-crimson-glare transition-all duration-500 shadow-[0_0_20px_rgba(0,0,0,0.3)] text-left"
            >
              <div className="absolute top-4 right-4 bg-blood-red/10 border border-blood-red/40 text-blood-red text-[10px] px-3 py-1 uppercase font-bold tracking-widest">
                Locked
              </div>
              <div className="p-8 space-y-8 flex flex-col items-center">
                <h3 className="font-headline-xl text-3xl text-on-surface uppercase tracking-widest w-full text-center">Batch 3</h3>
                <div className="relative py-12 text-center w-full">
                  <span className="material-symbols-outlined text-8xl text-on-surface-variant/20 group-hover:text-blood-red/40 transition-colors duration-500">lock</span>
                </div>
                <p className="font-body-md text-on-surface-variant/60 text-center leading-relaxed h-20">
                  Final evidence repository. High-level encryption applied. Requires maximum clearance for access.
                </p>
                <div className="w-full bg-blood-red/20 border-2 border-blood-red group-hover:bg-blood-red text-white py-4 font-headline-xl text-xl uppercase tracking-widest transition-all duration-300 text-center">
                  Unlock Access
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
                <h2 className="font-headline-xl text-4xl md:text-5xl text-on-surface tracking-widest uppercase">Access Request</h2>
                <p className="text-crimson-glare font-body-md uppercase mt-2 tracking-[0.2em]">Batch 0{selectedBatch} // Security Protocol 9</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-on-surface/40 hover:text-white transition-colors">
                <span className="material-symbols-outlined text-3xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3">
                <label className="block text-xs md:text-sm text-on-surface-variant/60 uppercase tracking-[0.3em] font-bold ml-1">Team Name</label>
                <input required name="teamName" value={formData.teamName} onChange={handleInputChange} className="w-full bg-black/40 border-2 border-blood-red/30 p-5 font-body-lg text-xl text-white focus:border-crimson-glare outline-none transition-all placeholder:text-white/10 uppercase tracking-widest" placeholder="ENTER IDENTIFIER..." />
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
                <input required name="accessCode" value={formData.accessCode} onChange={handleInputChange} type="password" className="w-full bg-blood-red/5 border-2 border-blood-red/50 p-6 font-headline-xl text-4xl text-crimson-glare focus:border-crimson-glare outline-none transition-all placeholder:text-blood-red/20 text-center tracking-[0.5em]" placeholder="********" />
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
