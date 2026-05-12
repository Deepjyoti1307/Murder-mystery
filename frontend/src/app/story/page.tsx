'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const Scene = dynamic(() => import('../../components/Scene'), { ssr: false });

export default function StoryPage() {
  const [displayText, setDisplayText] = useState('');
  const fullText = `[ CLASSIFIED BRIEFING // EYES ONLY ]

DATE: MAY 13, 2026
LOCATION: SECTOR 4 // TECHTRIX ARCHIVE
SUBJECT: OPERATION CRIMSON ARCHIVE

The truth is never simple. It's messy, it's hidden, and in this case... it's buried in blood.

Forty-eight hours ago, the Sector 4 vault was breached. No alarms were triggered. No digital footprints were left behind. Only a single physical artifact remained at the scene: a vintage typewriter, still warm to the touch, with a single line repeated across the page...

"The Archive remembers everything."

Your team has been selected for this extraction because you see the patterns others miss. You have 4 hours to decrypt the evidence, profile the suspects, and locate the source of the anomaly before the system initiates a total data purge.

Failure is not an option. The Archive is watching.

GOOD LUCK, OPERATIVES.`;

  useEffect(() => {
    let currentIdx = 0;
    const interval = setInterval(() => {
      setDisplayText(fullText.slice(0, currentIdx));
      currentIdx++;
      if (currentIdx > fullText.length) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-void-black text-on-surface font-mono min-h-screen flex flex-col relative overflow-hidden selection:bg-crimson-glare selection:text-white">
      
      {/* Background Scene (Subtle) */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <Scene />
        <div className="absolute inset-0 bg-void-black/80"></div>
      </div>

      <main className="relative z-20 flex-1 flex flex-col items-center justify-center p-8 md:p-16">
        <div className="max-w-4xl w-full bg-black/60 border-l-4 border-blood-red p-8 md:p-12 shadow-[0_0_50px_rgba(220,20,60,0.2)]">
          <div className="flex items-center gap-4 mb-8 border-b border-blood-red/20 pb-4">
            <span className="w-3 h-3 bg-blood-red rounded-full animate-pulse"></span>
            <h1 className="text-crimson-glare text-xl tracking-[0.5em] uppercase">Incoming Transmission...</h1>
          </div>

          <pre className="whitespace-pre-wrap text-on-surface-variant font-mono text-sm md:text-lg leading-relaxed mb-12 min-h-[400px]">
            {displayText}
            <span className="w-2 h-5 bg-crimson-glare inline-block ml-1 animate-pulse align-middle"></span>
          </pre>

          <div className="flex flex-col md:flex-row gap-6">
            <Link href="/dashboard" className="flex-1 border-2 border-blood-red/40 hover:border-crimson-glare text-on-surface/60 hover:text-white py-4 text-center tracking-[0.3em] uppercase transition-all group flex items-center justify-center gap-2">
              <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
              Back to Hub
            </Link>
            <button className="flex-[2] bg-blood-red text-white py-4 tracking-[0.5em] uppercase font-bold shadow-[0_0_20px_rgba(220,20,60,0.4)] hover:shadow-[0_0_40px_rgba(220,20,60,0.6)] transition-all flex items-center justify-center gap-4 group">
              Begin Extraction
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">terminal</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-[10px] text-white/20 uppercase tracking-[0.5em]">
          End of Transmission // Encryption Level: Black
        </div>
      </main>
    </div>
  );
}
