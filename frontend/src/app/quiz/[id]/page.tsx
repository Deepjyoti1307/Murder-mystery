'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useUser } from "@clerk/nextjs";

interface Question {
  id: number;
  text: string;
  options: string[];
  hint_count: number;
}

export default function QuizPage() {
  const { id } = useParams();
  const { user } = useUser();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [feedback, setFeedback] = useState<{msg: string, isCorrect: boolean} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [qHints, setQHints] = useState<string[]>([]);
  const [pendingHintIndex, setPendingHintIndex] = useState<number | null>(null);

  const timestamp = new Date().getTime();

  useEffect(() => {
    const initQuiz = async () => {
      if (!id || !user) return;
      try {
        const qResponse = await fetch(`http://localhost:8000/api/quiz/${id}/questions?t=${timestamp}`, { cache: 'no-store' });
        const qData = await qResponse.json();
        if (qResponse.ok) setQuestions(qData);
      } catch (err) {
        console.error("Terminal Connection Failure.");
      } finally {
        setLoading(false);
      }
    };
    initQuiz();
  }, [id, user]);

  useEffect(() => {
    const fetchHints = async () => {
      if (!user || !questions[currentIdx]) return;
      try {
        const hResponse = await fetch(`http://localhost:8000/api/quiz/${id}/hints/${questions[currentIdx].id}?clerk_id=${user.id}&t=${new Date().getTime()}`, { cache: 'no-store' });
        const hData = await hResponse.json();
        if (hResponse.ok) setQHints(hData.hints || []);
      } catch (err) {}
    };
    fetchHints();
    setSelectedOption('');
    setFeedback(null);
  }, [currentIdx, user, questions]);

  const handleSubmit = async () => {
    if (!selectedOption || !user) return;
    setIsSubmitting(true);
    setFeedback(null);

    let answerPayload = selectedOption;
    if (questions[currentIdx].options && questions[currentIdx].options.length > 0) {
      answerPayload = selectedOption.match(/\(([A-D])\)/)?.[1] || '';
    }

    try {
      const response = await fetch(`http://localhost:8000/api/quiz/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerk_id: user.id,
          question_id: questions[currentIdx].id,
          answer: answerPayload
        })
      });

      const data = await response.json();
      setFeedback({ msg: data.message, isCorrect: data.is_correct });
    } catch (err) {
      setFeedback({ msg: "TRANSMISSION ERROR", isCorrect: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestHint = async () => {
    if (!user || pendingHintIndex === null) return;
    try {
      const response = await fetch(`http://localhost:8000/api/quiz/${id}/hints/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerk_id: user.id,
          question_id: questions[currentIdx].id,
          hint_index: pendingHintIndex
        })
      });
      const data = await response.json();
      if (response.ok) {
        setQHints(prev => [...prev, data.hint]);
        setPendingHintIndex(null);
      }
    } catch (err) {}
  };

  const handleFinish = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`http://localhost:8000/api/quiz/${id}/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clerk_id: user.id })
      });
      if (response.ok) {
        window.location.href = `/results/${id}`;
      }
    } catch (err) {
      console.error("FINISH ERROR");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const prevQuestion = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  if (loading) return (
    <div className="bg-black min-h-screen flex items-center justify-center font-mono text-blood-red tracking-widest uppercase">
      INITIALIZING TERMINAL...
    </div>
  );

  if (questions.length === 0) return (
    <div className="bg-black min-h-screen flex items-center justify-center font-mono text-on-surface-variant uppercase">
      NO EVIDENCE DATA LOADED.
    </div>
  );

  const currentQ = questions[currentIdx];
  const totalHintsAvailable = currentQ.hint_count || 0;

  return (
    <div className="bg-black min-h-screen text-on-surface font-mono selection:bg-blood-red/40 overflow-hidden flex flex-col">
      
      <div className="bg-zinc-900 border-b border-blood-red/30 p-4 flex justify-between items-center shadow-[0_2px_20px_rgba(139,0,0,0.2)]">
        <div className="flex items-center gap-4 text-xs">
          <span className="text-blood-red font-bold animate-pulse">● SYSTEM LIVE</span>
          <div className="w-[1px] h-4 bg-white/10" />
          <span className="text-on-surface-variant/60 tracking-[0.2em] uppercase">Evidence Processor V.2.0</span>
        </div>
        <div className="text-xs text-blood-red font-bold tracking-widest uppercase">
           OPERATIVE // {user?.firstName || 'UNKNOWN'}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-6 md:p-12 flex flex-col items-center">
        <div className="max-w-3xl w-full space-y-8">
          
          <div className="flex items-center gap-2 mb-8">
            {questions.map((_, idx) => (
              <div 
                key={idx} 
                className={`flex-1 h-1 transition-all duration-500 ${idx === currentIdx ? 'bg-blood-red shadow-[0_0_10px_rgba(220,20,60,0.8)]' : idx < currentIdx ? 'bg-blood-red/40' : 'bg-white/5'}`}
              />
            ))}
          </div>

          {/* Question & Hint Buttons Header */}
          <div className="space-y-6">
            <div className="flex justify-between items-start gap-6">
               <div className="flex-1 space-y-4">
                 <span className="text-blood-red text-sm font-bold uppercase tracking-[0.4em]">Question {currentQ.id} of {questions.length}</span>
                 <h2 className="text-2xl md:text-3xl text-on-surface uppercase tracking-widest leading-relaxed">
                   {currentQ.text}
                 </h2>
               </div>

               {/* Tactical Hint Buttons */}
               <div className="flex flex-col gap-3 pt-6 min-w-[60px]">
                  {Array.from({ length: totalHintsAvailable }).map((_, idx) => {
                    const hintNum = idx + 1;
                    const isRevealed = qHints.length >= hintNum;
                    return (
                      <div key={hintNum} className="relative group">
                        <button
                          onClick={() => !isRevealed && setPendingHintIndex(hintNum)}
                          disabled={isRevealed}
                          className={`w-14 h-14 border-2 flex items-center justify-center text-sm font-bold transition-all ${isRevealed ? 'bg-blood-red border-blood-red text-white shadow-[0_0_15px_rgba(220,20,60,0.4)]' : 'border-white/20 text-white/40 hover:border-blood-red hover:text-blood-red'}`}
                        >
                          H{hintNum}
                        </button>
                        
                        {pendingHintIndex === hintNum && (
                          <div className="absolute right-full mr-4 top-0 bg-zinc-900 p-4 z-50 flex flex-col gap-3 items-center shadow-2xl animate-slideLeft border-2 border-blood-red min-w-[140px]">
                             <span className="text-xs text-white font-bold tracking-widest whitespace-nowrap uppercase">REVEAL HINT?</span>
                             <div className="flex gap-2 w-full">
                               <button onClick={handleRequestHint} className="flex-1 bg-blood-red text-white py-3 text-xs font-bold hover:bg-crimson-glare transition-colors">YES</button>
                               <button onClick={() => setPendingHintIndex(null)} className="flex-1 bg-white/10 text-white py-3 text-xs font-bold hover:bg-white/20 transition-colors">NO</button>
                             </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
               </div>
            </div>
          </div>

          {/* Revealed Hint Display */}
          {qHints.length > 0 && (
            <div className="space-y-3 animate-slideUp">
              {qHints.map((hint, idx) => (
                <div key={idx} className="bg-zinc-900/50 border-l-2 border-blood-red p-4 flex gap-4 items-start shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                  <div className="bg-blood-red text-white text-[10px] px-1.5 py-0.5 font-bold shrink-0">H{idx+1}</div>
                  <p className="text-xs text-crimson-glare/90 leading-relaxed tracking-wider uppercase italic">{hint}</p>
                </div>
              ))}
            </div>
          )}

          {/* Options / Terminal Input */}
          <div className="grid grid-cols-1 gap-4 pt-4">
            {currentQ.options && currentQ.options.length > 0 ? (
              currentQ.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedOption(option)}
                  className={`p-6 border-2 text-left transition-all group relative overflow-hidden ${selectedOption === option ? 'bg-blood-red/10 border-blood-red' : 'bg-white/5 border-white/10 hover:border-white/30'}`}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1 bg-blood-red transition-all duration-300 ${selectedOption === option ? 'opacity-100' : 'opacity-0'}`} />
                  <span className={`text-lg uppercase tracking-widest transition-colors ${selectedOption === option ? 'text-white' : 'text-on-surface-variant group-hover:text-white'}`}>
                    {option}
                  </span>
                </button>
              ))
            ) : (
              <div className="space-y-4">
                <div className="text-[10px] text-blood-red/60 font-bold uppercase tracking-[0.3em] mb-2">Manual Decryption Required:</div>
                <input 
                  type="text"
                  className="w-full bg-zinc-900/80 border-2 border-blood-red/60 text-white p-6 outline-none focus:border-blood-red text-xl font-mono tracking-widest uppercase placeholder-blood-red/30 transition-all shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] focus:shadow-[0_0_20px_rgba(220,20,60,0.2)]"
                  placeholder="TYPE THE DECODED MESSAGE HERE..."
                  value={selectedOption}
                  autoFocus
                  onChange={(e) => setSelectedOption(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmit();
                  }}
                />
                <div className="flex justify-between text-[8px] text-blood-red/40 font-bold px-2">
                  <span>[ SYSTEM WAITING FOR INPUT ]</span>
                  <span>[ PRESS ENTER TO SUBMIT ]</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-8 pt-8">
            {currentIdx === questions.length - 1 ? (
              <button
                onClick={handleFinish}
                disabled={isSubmitting}
                className="w-full max-w-sm bg-green-700 hover:bg-green-600 text-white py-5 font-bold uppercase tracking-[0.3em] shadow-[0_0_30_rgba(34,197,94,0.3)] transition-all active:scale-95 text-lg"
              >
                {isSubmitting ? 'UPLOADING...' : 'FINISH INVESTIGATION'}
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!selectedOption || isSubmitting}
                className="w-full max-w-sm bg-blood-red hover:bg-crimson-glare text-white py-5 font-bold uppercase tracking-[0.3em] shadow-[0_0_30_rgba(139,0,0,0.3)] disabled:opacity-30 transition-all active:scale-95 text-lg"
              >
                {isSubmitting ? 'PROCESSING...' : 'SUBMIT ANALYSIS'}
              </button>
            )}

            {feedback && (
              <div className={`text-center font-bold tracking-widest uppercase animate-slideUp ${feedback.isCorrect ? 'text-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'text-blood-red animate-shake'}`}>
                {feedback.msg}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-12 border-t border-white/10 mt-12 pb-12">
            <button 
              onClick={prevQuestion}
              disabled={currentIdx === 0}
              className="px-8 py-4 bg-zinc-900 border border-white/10 text-on-surface-variant hover:text-white hover:border-white/30 uppercase tracking-[0.2em] font-bold flex items-center gap-3 transition-all disabled:opacity-5 active:scale-95 text-sm"
            >
              ← PREVIOUS
            </button>
            <div className="hidden md:block text-[10px] text-white/10 tracking-[0.5em] uppercase font-bold">
               SECURE DATA CHANNEL
            </div>
            <button 
              onClick={nextQuestion}
              disabled={currentIdx === questions.length - 1}
              className="px-8 py-4 bg-zinc-900 border border-blood-red/40 text-blood-red hover:text-white hover:bg-blood-red hover:border-blood-red uppercase tracking-[0.2em] font-bold flex items-center gap-3 transition-all disabled:opacity-5 active:scale-95 text-sm shadow-[0_0_20px_rgba(139,0,0,0.1)]"
            >
              NEXT TRACK →
            </button>
          </div>

        </div>
      </main>

      <div className="h-2 bg-gradient-to-r from-transparent via-blood-red/20 to-transparent" />
    </div>
  );
}
