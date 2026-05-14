'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from "@clerk/nextjs";
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

export default function StoryPage() {
  const { id } = useParams();
  const { user } = useUser();
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(5400); // 90 minutes in seconds
  const [story, setStory] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return; // Wait for Clerk to load user

    // 1. Fetch story content from backend
    const fetchStory = async () => {
      try {
        // Start the timer on backend
        await fetch(`http://localhost:8000/api/batch/${id}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clerk_id: user?.id })
        });

        const response = await fetch(`http://localhost:8000/api/story/${id}`);
        const data = await response.json();
        if (response.ok) {
          setStory(data.content);
        }
      } catch (err) {
        console.error("Failed to load dossier.");
      } finally {
        setLoading(false);
      }
    };

    fetchStory();

    // 2. Timer Logic
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [id]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const openQuiz = () => {
    window.open(`/quiz/${id}`, '_blank');
  };

  if (loading) return (
    <div className="bg-void-black min-h-screen flex items-center justify-center">
      <div className="text-crimson-glare animate-pulse font-headline-xl text-2xl tracking-widest">
        DECRYPTING DOSSIER...
      </div>
    </div>
  );

  return (
    <div className="bg-void-black min-h-screen text-on-surface selection:bg-crimson-glare selection:text-white pb-32">
      
      {/* Sticky Tactical Header */}
      <header className="sticky top-0 z-50 bg-void-black/90 backdrop-blur-md border-b-2 border-blood-red/30 py-4 px-8 flex justify-between items-center shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col">
          <h1 className="font-headline-xl text-2xl text-on-surface tracking-widest uppercase">
            Case Dossier // Batch 0{id}
          </h1>
          <p className="text-crimson-glare/60 font-body-sm uppercase tracking-widest text-xs">
            Operative: {user?.firstName || 'UNKNOWN'}
          </p>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-crimson-glare font-bold tracking-widest uppercase mb-1">Time Remaining</span>
            <span className={`font-headline-xl text-3xl tracking-tighter ${timeLeft < 300 ? 'text-red-600 animate-pulse' : 'text-crimson-glare'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <button 
            onClick={openQuiz}
            className="bg-blood-red hover:bg-crimson-glare text-white px-6 py-3 font-headline-xl text-sm uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(139,0,0,0.4)] active:scale-95"
          >
            Open Evidence Terminal
          </button>
        </div>
      </header>

      {/* Story Content */}
      <main className="max-w-4xl mx-auto mt-16 px-8 leading-relaxed">
        <div className="bg-zinc-900/30 border border-blood-red/10 p-12 md:p-20 shadow-2xl relative overflow-hidden">
          {/* Decorative Corner Elements */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blood-red/30" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-blood-red/30" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-blood-red/30" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blood-red/30" />

          <div className="prose prose-invert max-w-none font-body-lg text-on-surface-variant/90 space-y-6">
            <ReactMarkdown
              components={{
                h2: ({node, ...props}) => <h2 className="text-blood-red font-headline-xl text-2xl mt-12 mb-6 border-l-4 border-blood-red pl-4" {...props} />,
                strong: ({node, ...props}) => <strong className="text-on-surface font-bold underline decoration-blood-red/40" {...props} />,
                em: ({node, ...props}) => <em className="text-crimson-glare italic" {...props} />,
                p: ({node, ...props}) => {
                  const content = props.children as string;
                  // Custom styling for intercepted communications
                  if (typeof content === 'string' && (content.startsWith('INTERCEPTED') || content.startsWith('SMS') || content.startsWith('EMAIL'))) {
                    return <div className="bg-black/50 border-l-2 border-crimson-glare p-4 font-mono text-sm my-6 text-crimson-glare/80 shadow-[inset_0_0_10px_rgba(220,20,60,0.1)]">{props.children}</div>;
                  }
                  return <p className="mb-6 leading-relaxed" {...props} />;
                },
                code: ({node, ...props}) => <code className="bg-blood-red/20 text-blood-red px-2 py-0.5 rounded font-mono text-sm" {...props} />
              }}
            >
              {story}
            </ReactMarkdown>
          </div>

          {/* Footer of the Dossier */}
          <div className="mt-20 pt-8 border-t border-blood-red/10 flex justify-between items-end opacity-40">
            <div className="font-body-sm text-[10px] uppercase tracking-widest">
              TechTrix 2026 // Classified Archive
            </div>
            <div className="text-right">
              <p className="text-[8px] uppercase tracking-tighter">Authorized by</p>
              <p className="font-headline-md text-sm">ARCHIVIST PRIME</p>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Action Bar (Mobile only) */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 md:hidden z-50">
        <button 
          onClick={openQuiz}
          className="bg-blood-red text-white px-8 py-4 rounded-full font-headline-xl text-lg uppercase tracking-widest shadow-2xl border-2 border-white/20"
        >
          Open Terminal
        </button>
      </div>

    </div>
  );
}
