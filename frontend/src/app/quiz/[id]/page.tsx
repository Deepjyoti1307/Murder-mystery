"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { API_BASE_URL } from "@/lib/api";

interface Question {
  id: number;
  text: string;
  options: string[];
  hint_count: number;
  question_type: string;
}

export default function QuizPage() {
  const { id } = useParams();
  const { user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [qHints, setQHints] = useState<string[]>([]);
  const [pendingHintIndex, setPendingHintIndex] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [autoSubmitted, setAutoSubmitted] = useState(false);

  const getAuthHeaders = async () => {
    const token = await getToken();
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      "X-Dev-Clerk-Id": token ? "" : user?.id || "",
    };
  };

  useEffect(() => {
    const initQuiz = async () => {
      if (!id || !user) return;
      try {
        const headers = await getAuthHeaders();
        const qResponse = await fetch(`${API_BASE_URL}/api/quiz/${id}/questions`, { headers, cache: "no-store" });
        const data = await qResponse.json();

        if (qResponse.ok) {
          setQuestions(data.questions);
          if (data.is_completed) {
            router.replace(`/results/${id}`);
            return;
          }
          if (typeof data.time_left === "number") {
            setTimeLeft(data.time_left);
          }
        }
      } catch (err) {
        console.error("Terminal Connection Failure.");
      } finally {
        setLoading(false);
      }
    };
    initQuiz();
  }, [id, user, getToken, router]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      if (!autoSubmitted) {
        setAutoSubmitted(true);
        handleFinalSubmit(true);
      }
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev !== null ? Math.max(0, prev - 1) : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, autoSubmitted]);

  useEffect(() => {
    const fetchHints = async () => {
      if (!user || !questions[currentIdx]) return;
      try {
        const headers = await getAuthHeaders();
        const hResponse = await fetch(`${API_BASE_URL}/api/quiz/${id}/hints/${questions[currentIdx].id}`, { headers, cache: "no-store" });
        const hData = await hResponse.json();
        if (hResponse.ok) setQHints(hData.hints || []);
      } catch (err) {
        setQHints([]);
      }
    };
    fetchHints();
  }, [currentIdx, user, questions, id, getToken]);

  const currentQ = questions[currentIdx];
  const selectedOption = currentQ ? answers[currentQ.id] || "" : "";
  const totalHintsAvailable = currentQ?.hint_count || 0;

  const handleSelect = (value: string) => {
    if (!currentQ) return;
    setAnswers((prev) => ({ ...prev, [currentQ.id]: value }));
  };

  const handleRequestHint = async () => {
    if (!user || pendingHintIndex === null || !currentQ) return;
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/quiz/${id}/hints/reveal`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          clerk_id: user.id,
          question_id: currentQ.id,
          hint_index: pendingHintIndex,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setQHints((prev) => [...prev, data.hint]);
        setPendingHintIndex(null);
      }
    } catch (err) {
      setPendingHintIndex(null);
    }
  };

  const handleFinalSubmit = async (isAuto = false) => {
    if (!user || !currentQ || isSubmitting) return;
    if (!isAuto) {
      const confirmSubmit = window.confirm("SUBMIT ALL ANSWERS NOW?");
      if (!confirmSubmit) return;
    }

    setIsSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const payload = {
        clerk_id: user.id,
        answers: questions.map((q) => ({
          question_id: q.id,
          answer: answers[q.id] || "",
        })),
      };
      const response = await fetch(`${API_BASE_URL}/api/quiz/${id}/submit`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (response.ok || response.status === 409) {
        router.replace(`/results/${id}`);
      }
    } catch (err) {
      console.error("SUBMIT ERROR");
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

  if (loading) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center font-mono text-blood-red tracking-widest uppercase">
        INITIALIZING TERMINAL...
      </div>
    );
  }

  if (questions.length === 0 || !currentQ) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center font-mono text-on-surface-variant uppercase">
        NO EVIDENCE DATA LOADED.
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen text-on-surface font-mono selection:bg-blood-red/40 overflow-hidden flex flex-col">
      <div className="bg-zinc-900 border-b border-blood-red/30 p-4 flex flex-col md:flex-row justify-between items-center gap-2 shadow-[0_2px_20px_rgba(139,0,0,0.2)]">
        <div className="flex items-center gap-2 md:gap-4 text-[10px] md:text-xs">
          <span className="text-blood-red font-bold animate-pulse shrink-0">● SYSTEM LIVE</span>
          <div className="w-[1px] h-4 bg-white/10" />
          <span className="text-on-surface-variant/60 tracking-[0.2em] uppercase hidden sm:inline">Evidence Processor V.2.0</span>
          <div className="w-[1px] h-4 bg-white/10 hidden sm:block" />
          {timeLeft !== null && (
            <div className={`font-bold tracking-widest whitespace-nowrap ${timeLeft < 300 ? "text-blood-red animate-pulse" : "text-white"}`}>
              TIME: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
            </div>
          )}
        </div>
        <div className="text-[10px] md:text-xs text-blood-red font-bold tracking-widest uppercase">
          OPERATIVE // {user?.firstName || "UNKNOWN"}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-12 flex flex-col items-center">
        <div className="max-w-3xl w-full space-y-6 md:space-y-8">
          <div className="flex items-center gap-1.5 md:gap-2 mb-4 md:mb-8">
            {questions.map((_, idx) => (
              <div
                key={idx}
                className={`flex-1 h-1 transition-all duration-500 ${idx === currentIdx ? "bg-blood-red shadow-[0_0_10px_rgba(220,20,60,0.8)]" : idx < currentIdx ? "bg-blood-red/40" : "bg-white/5"}`}
              />
            ))}
          </div>

          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 md:gap-6">
              <div className="flex-1 space-y-4">
                <span className="text-blood-red text-xs font-bold uppercase tracking-[0.4em]">Question {currentQ.id} of {questions.length}</span>
                <h2 className="text-xl md:text-3xl text-on-surface uppercase tracking-widest leading-relaxed">
                  {currentQ.text}
                </h2>
              </div>

              <div className="flex flex-row md:flex-col gap-3 pt-2 md:pt-6 min-w-[60px] w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                {Array.from({ length: totalHintsAvailable }).map((_, idx) => {
                  const hintNum = idx + 1;
                  const isRevealed = qHints.length >= hintNum;
                  return (
                    <div key={hintNum} className="relative group">
                      <button
                        onClick={() => !isRevealed && setPendingHintIndex(hintNum)}
                        disabled={isRevealed}
                        className={`w-14 h-14 border-2 flex items-center justify-center text-sm font-bold transition-all ${isRevealed ? "bg-blood-red border-blood-red text-white shadow-[0_0_15px_rgba(220,20,60,0.4)]" : "border-white/20 text-white/40 hover:border-blood-red hover:text-blood-red"}`}
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
                  );
                })}
              </div>
            </div>
          </div>

          {qHints.length > 0 && (
            <div className="space-y-3 animate-slideUp">
              {qHints.map((hint, idx) => (
                <div key={idx} className="bg-zinc-900/50 border-l-2 border-blood-red p-4 flex gap-4 items-start shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                  <div className="bg-blood-red text-white text-[10px] px-1.5 py-0.5 font-bold shrink-0">H{idx + 1}</div>
                  <p className="text-xs text-crimson-glare/90 leading-relaxed tracking-wider uppercase italic">{hint}</p>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 pt-4">
            {currentQ.options && currentQ.options.length > 0 ? (
              currentQ.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelect(option)}
                  className={`p-6 border-2 text-left transition-all group relative overflow-hidden ${selectedOption === option ? "bg-blood-red/10 border-blood-red" : "bg-white/5 border-white/10 hover:border-white/30"}`}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1 bg-blood-red transition-all duration-300 ${selectedOption === option ? "opacity-100" : "opacity-0"}`} />
                  <span className={`text-lg uppercase tracking-widest transition-colors ${selectedOption === option ? "text-white" : "text-on-surface-variant group-hover:text-white"}`}>
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
                  onChange={(e) => handleSelect(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleFinalSubmit();
                  }}
                />
                <div className="flex justify-between text-[8px] text-blood-red/40 font-bold px-2">
                  <span>[ SYSTEM WAITING FOR INPUT ]</span>
                  <span>[ PRESS ENTER TO SUBMIT ]</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-4 pt-6">
            <button
              onClick={prevQuestion}
              disabled={currentIdx === 0}
              className="flex-1 bg-white/5 border border-white/10 text-white py-4 uppercase tracking-widest text-xs hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={nextQuestion}
              disabled={currentIdx === questions.length - 1}
              className="flex-1 bg-white/5 border border-white/10 text-white py-4 uppercase tracking-widest text-xs hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
            <button
              onClick={() => handleFinalSubmit(false)}
              disabled={isSubmitting}
              className="flex-1 bg-blood-red text-white py-4 uppercase tracking-widest text-xs hover:bg-crimson-glare disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Submitting..." : "Submit Answers"}
            </button>
          </div>
        </div>
      </main>

      <div className="h-2 bg-gradient-to-r from-transparent via-blood-red/20 to-transparent" />
    </div>
  );
}
