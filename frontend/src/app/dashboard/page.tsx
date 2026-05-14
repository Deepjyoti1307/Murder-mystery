"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { UserButton, useAuth, useUser } from "@clerk/nextjs";
import { API_BASE_URL } from "@/lib/api";

const Scene = dynamic(() => import("../../components/Scene"), { ssr: false });

type BatchStatus = {
  batch_id: number;
  is_locked: boolean;
  status: "not_started" | "in_progress" | "completed";
  entry_timestamp: string | null;
  server_time: string;
};

const QUIZ_LIMIT_SECONDS = 90 * 60;

export default function Dashboard() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
  const [assignedBatch, setAssignedBatch] = useState<number | null>(null);
  const [batchStatus, setBatchStatus] = useState<Record<number, BatchStatus>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    teamName: "",
    leaderName: "",
    phoneNumber: "",
    collegeName: "",
    accessCode: "",
  });
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  const batches = useMemo(() => [1, 2, 3], []);

  const getAuthHeaders = async () => {
    const token = await getToken();
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      "X-Dev-Clerk-Id": token ? "" : user?.id || "",
    };
  };

  useEffect(() => {
    if (!user) return;

    const registerAndLoad = async () => {
      try {
        const headers = await getAuthHeaders();
        await fetch(`${API_BASE_URL}/api/user/register`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            clerk_id: user.id,
            email: user.primaryEmailAddress?.emailAddress || "",
            name: user.fullName || user.firstName || "UNKNOWN",
          }),
        });

        const meRes = await fetch(`${API_BASE_URL}/api/user/me`, {
          headers,
        });
        if (meRes.ok) {
          const me = await meRes.json();
          setAssignedBatch(me.assigned_batch ? Number(me.assigned_batch) : null);
        }

        const statusResponses = await Promise.all(
          batches.map((batchId) =>
            fetch(`${API_BASE_URL}/api/batch/${batchId}/status`, { headers })
          )
        );
        const statusData = await Promise.all(statusResponses.map((res) => res.json()));
        const nextStatus: Record<number, BatchStatus> = {};
        statusData.forEach((status) => {
          if (status.batch_id) nextStatus[status.batch_id] = status;
        });
        setBatchStatus(nextStatus);
      } catch (err) {
        setError("COMMUNICATION FAILURE. TERMINAL OFFLINE.");
      }
    };

    registerAndLoad();
    const interval = setInterval(registerAndLoad, 5000);
    return () => clearInterval(interval);
  }, [user, batches, getToken]);

  useEffect(() => {
    const assignedStatus = assignedBatch ? batchStatus[assignedBatch] : null;
    if (!assignedStatus || !assignedStatus.entry_timestamp) {
      setTimeLeft(null);
      return;
    }
    const serverTime = new Date(assignedStatus.server_time).getTime();
    const entryTime = new Date(assignedStatus.entry_timestamp).getTime();
    const elapsed = Math.floor((serverTime - entryTime) / 1000);
    const initial = Math.max(0, QUIZ_LIMIT_SECONDS - elapsed);
    setTimeLeft(initial);
  }, [assignedBatch, batchStatus]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev !== null ? Math.max(0, prev - 1) : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "--:--:--";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleBatchClick = (batchNumber: number) => {
    const status = batchStatus[batchNumber];
    if (!status || status.is_locked) return;
    if (assignedBatch && assignedBatch !== batchNumber) return;

    if (status.status === "in_progress") {
      router.push(`/story/${batchNumber}`);
      return;
    }
    if (status.status === "completed") {
      router.push(`/results/${batchNumber}`);
      return;
    }
    setSelectedBatch(batchNumber);
    setIsModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsPending(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/batch/${selectedBatch}/enter`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          team_name: formData.teamName,
          leader_name: formData.leaderName,
          phone_number: formData.phoneNumber,
          college_name: formData.collegeName,
          access_code: formData.accessCode,
          clerk_id: user?.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push(`/story/${selectedBatch}`);
      } else {
        const errorMsg = typeof data.detail === "string"
          ? data.detail
          : Array.isArray(data.detail)
            ? data.detail[0]?.msg
            : "AUTHORIZATION DENIED. CHECK YOUR CODE.";
        setError(errorMsg);
      }
    } catch (err) {
      setError("COMMUNICATION FAILURE. TERMINAL OFFLINE.");
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
              <div className="h-4 w-[1px] bg-blood-red/20"></div>
              <p className="text-on-surface-variant/40 font-body-sm uppercase tracking-widest">
                {user?.primaryEmailAddress?.emailAddress || "NO EMAIL"}
              </p>
              <div className="h-4 w-[1px] bg-blood-red/20"></div>
              <p className="text-crimson-glare font-body-sm uppercase tracking-widest font-bold">
                Batch {assignedBatch || "UNASSIGNED"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="flex items-center gap-6">
              <span className="font-headline-md text-crimson-glare animate-pulse tracking-widest">
                T-MINUS: {formatTime(timeLeft)}
              </span>
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
            {batches.map((batchNumber) => {
              const status = batchStatus[batchNumber];
              const isLocked = status?.is_locked ?? true;
              const isAssigned = !assignedBatch || assignedBatch === batchNumber;
              const isDisabled = isLocked || !isAssigned;
              const progress = status?.status || "not_started";

              return (
                <button
                  key={batchNumber}
                  onClick={() => handleBatchClick(batchNumber)}
                  disabled={isDisabled}
                  className={`group relative bg-void-black/60 border-2 p-1 transition-all duration-500 shadow-[0_0_20px_rgba(0,0,0,0.3)] text-left ${isAssigned ? "border-blood-red/30 hover:border-crimson-glare" : "border-white/10 opacity-40"} ${isDisabled ? "cursor-not-allowed" : ""}`}
                >
                  <div className={`absolute top-4 right-4 border text-[10px] px-3 py-1 uppercase font-bold tracking-widest ${isLocked ? "bg-blood-red/10 border-blood-red/40 text-blood-red" : "bg-green-500/10 border-green-500/40 text-green-400"}`}>
                    {isLocked ? "Locked" : "Unlocked"}
                  </div>
                  <div className="absolute top-4 left-4 border border-white/10 text-white/60 text-[10px] px-3 py-1 uppercase font-bold tracking-widest">
                    {progress.replace("_", " ")}
                  </div>
                  <div className="p-8 space-y-8 flex flex-col items-center">
                    <h3 className="font-headline-xl text-3xl text-on-surface uppercase tracking-widest w-full text-center">Batch {batchNumber}</h3>
                    <div className="relative py-12 text-center w-full">
                      <span className={`material-symbols-outlined text-8xl transition-colors duration-500 ${isLocked ? "text-on-surface-variant/20" : "text-green-400"}`}>lock</span>
                    </div>
                    <p className="font-body-md text-on-surface-variant/60 text-center leading-relaxed h-20">
                      {batchNumber === 1 && "Initial evidence collection regarding the Sector 4 anomaly."}
                      {batchNumber === 2 && "Secondary evidence compartment. Access restricted pending completion of Batch 1 analysis."}
                      {batchNumber === 3 && "Final evidence repository. High-level encryption applied."}
                    </p>
                    <div className={`w-full border-2 py-4 font-headline-xl text-xl uppercase tracking-widest transition-all duration-300 text-center ${isLocked ? "bg-blood-red/20 border-blood-red text-white" : "bg-green-500/20 border-green-500 text-white"}`}>
                      {progress === "completed" ? "View Results" : progress === "in_progress" ? "Resume" : "Unlock Access"}
                    </div>
                  </div>
                </button>
              );
            })}
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
