"use client";

import React, { useEffect, useMemo, useState } from "react";
import { UserButton, useAuth, useUser } from "@clerk/nextjs";
import { API_BASE_URL } from "@/lib/api";

interface UserRow {
  clerk_id: string;
  name: string;
  email: string;
  assigned_batch?: string | null;
  batch_id?: number;
  status: string;
  score: number;
  time_consumed?: number | null;
}

interface Batch {
  batch_id: number;
  is_locked: boolean;
  story_content?: string;
}

interface Question {
  id: number;
  text: string;
  options: string[];
  correct: string;
  question_type?: string;
  hints?: string[];
}

interface AdminLog {
  admin_id: string;
  action: string;
  target_id?: string;
  payload?: Record<string, unknown>;
  timestamp: string;
}

export default function AdminDashboard() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"participants" | "batches" | "content" | "audit">("participants");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminLog[]>([]);
  const [selectedBatch, setSelectedBatch] = useState(1);
  const [codewordInput, setCodewordInput] = useState("");
  const [storyInput, setStoryInput] = useState("");
  const [questionForm, setQuestionForm] = useState({
    questionId: 1,
    text: "",
    options: "",
    correct: "",
    questionType: "mcq",
    hints: "",
  });

  const batchOptions = useMemo(() => [1, 2, 3], []);

  const getAuthHeaders = async () => {
    const token = await getToken();
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      "X-Dev-Clerk-Id": token ? "" : user?.id || "",
    };
  };

  const fetchCoreData = async () => {
    if (!user) return;
    const headers = await getAuthHeaders();
    const [usersRes, batchesRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/admin/users`, { headers }),
      fetch(`${API_BASE_URL}/api/admin/batches`, { headers }),
    ]);
    if (usersRes.ok) {
      const usersData = await usersRes.json();
      setUsers(Array.isArray(usersData) ? usersData : []);
    }
    if (batchesRes.ok) {
      const batchData = await batchesRes.json();
      const normalizedBatches = Array.isArray(batchData) ? batchData : [];
      setBatches(normalizedBatches);
      const currentBatch = normalizedBatches.find((b: Batch) => b.batch_id === selectedBatch);
      if (currentBatch?.story_content) setStoryInput(currentBatch.story_content);
    }
  };

  const fetchQuestions = async (batchId: number) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/admin/questions/${batchId}`, { headers });
    if (res.ok) {
      const questionsData = await res.json();
      setQuestions(Array.isArray(questionsData) ? questionsData : []);
    }
  };

  const fetchAudit = async () => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/admin/audit`, { headers });
    if (res.ok) {
      const auditData = await res.json();
      setAuditLogs(Array.isArray(auditData) ? auditData : []);
    }
  };

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      try {
        const headers = await getAuthHeaders();
        const checkRes = await fetch(`${API_BASE_URL}/api/admin/check`, { headers });
        const checkData = await checkRes.json();
        if (checkData.is_admin) {
          setIsAdmin(true);
          await fetchCoreData();
          await fetchQuestions(selectedBatch);
          await fetchAudit();
        }
      } finally {
        setLoading(false);
      }
    };

    init();
    const interval = setInterval(() => {
      fetchCoreData();
      fetchAudit();
    }, 5000);
    return () => clearInterval(interval);
  }, [user, selectedBatch, getToken]);

  const toggleBatch = async (batchId: number, isLocked: boolean) => {
    const headers = await getAuthHeaders();
    await fetch(`${API_BASE_URL}/api/admin/batch/${batchId}/lock`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ is_locked: !isLocked }),
    });
    fetchCoreData();
  };

  const assignBatch = async (clerkId: string, batchId: number) => {
    const headers = await getAuthHeaders();
    await fetch(`${API_BASE_URL}/api/admin/user/${clerkId}/assign`, {
      method: "POST",
      headers,
      body: JSON.stringify({ batch_id: batchId }),
    });
    fetchCoreData();
  };

  const resetTeam = async (clerkId: string, batchId?: number) => {
    if (!batchId) return;
    if (!confirm("RESET THIS PARTICIPANT'S PROGRESS?")) return;
    const headers = await getAuthHeaders();
    await fetch(`${API_BASE_URL}/api/admin/teams/${clerkId}/reset?batch_id=${batchId}`, {
      method: "POST",
      headers,
    });
    fetchCoreData();
  };

  const updateCodeword = async () => {
    const headers = await getAuthHeaders();
    await fetch(`${API_BASE_URL}/api/admin/batch/${selectedBatch}/codeword`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ codeword: codewordInput }),
    });
    setCodewordInput("");
  };

  const updateStory = async () => {
    const headers = await getAuthHeaders();
    await fetch(`${API_BASE_URL}/api/admin/story/${selectedBatch}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ story_content: storyInput }),
    });
  };

  const createOrUpdateQuestion = async () => {
    const headers = await getAuthHeaders();
    const payload = {
      batch_id: selectedBatch,
      question_id: Number(questionForm.questionId),
      text: questionForm.text,
      options: questionForm.options.split("\n").filter((line) => line.trim()),
      correct: questionForm.correct,
      question_type: questionForm.questionType,
      hints: questionForm.hints.split("\n").filter((line) => line.trim()),
    };
    await fetch(`${API_BASE_URL}/api/admin/questions`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    fetchQuestions(selectedBatch);
  };

  const deleteQuestion = async (questionId: number) => {
    const headers = await getAuthHeaders();
    await fetch(`${API_BASE_URL}/api/admin/questions/${questionId}?batch_id=${selectedBatch}`, {
      method: "DELETE",
      headers,
    });
    fetchQuestions(selectedBatch);
  };

  const exportCsv = async () => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/admin/export`, { headers });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "results.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center font-mono text-blood-red text-xs tracking-[0.5em] uppercase">
        AUTHENTICATING ADMIN ACCESS...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="bg-black min-h-screen flex flex-col items-center justify-center font-mono p-12 text-center space-y-6">
        <div className="text-blood-red text-6xl font-bold animate-pulse">403</div>
        <div className="text-white text-xl tracking-[0.4em] uppercase">UNAUTHORIZED ACCESS DETECTED</div>
        <div className="text-on-surface-variant/40 text-xs uppercase tracking-widest max-w-md">
          This terminal is restricted to authorized TechTrix organizers. Your credentials have been logged.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-void-black min-h-screen text-on-surface font-mono p-6 md:p-12 selection:bg-blood-red/40">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-blood-red rounded-full animate-pulse" />
            <span className="text-blood-red text-xs font-bold tracking-[0.5em] uppercase">CENTRAL INTELLIGENCE COMMAND</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-widest uppercase">ADMIN DASHBOARD</h1>
        </div>

        <div className="flex gap-4 items-center">
          <button onClick={exportCsv} className="px-6 py-4 bg-blood-red/20 border border-blood-red text-white text-xs uppercase tracking-widest hover:bg-blood-red transition-all">
            Export CSV
          </button>
          <UserButton appearance={{ elements: { userButtonAvatarBox: "w-10 h-10 border-2 border-blood-red" } }} />
        </div>
      </div>

      <div className="flex gap-4 border-b border-white/10 mb-8">
        {[
          { key: "participants", label: "PARTICIPANTS" },
          { key: "batches", label: "BATCH CONTROL" },
          { key: "content", label: "CONTENT" },
          { key: "audit", label: "AUDIT" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`pb-4 px-6 text-xs font-bold tracking-[0.3em] uppercase transition-all ${activeTab === tab.key ? "text-blood-red border-b-2 border-blood-red" : "text-on-surface-variant/40 hover:text-white"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "participants" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-on-surface-variant/40 text-xs tracking-[0.2em] uppercase font-bold">
                <th className="py-6 px-4">NAME</th>
                <th className="py-6 px-4">EMAIL</th>
                <th className="py-6 px-4">BATCH</th>
                <th className="py-6 px-4">STATUS</th>
                <th className="py-6 px-4">SCORE</th>
                <th className="py-6 px-4">TIME</th>
                <th className="py-6 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((participant) => (
                <tr key={`${participant.clerk_id}-${participant.batch_id ?? "none"}`} className="hover:bg-white/5 transition-colors group">
                  <td className="py-6 px-4 text-white uppercase tracking-widest">{participant.name}</td>
                  <td className="py-6 px-4 text-xs text-on-surface-variant/60 uppercase tracking-widest">{participant.email}</td>
                  <td className="py-6 px-4">
                    <select
                      value={participant.assigned_batch || ""}
                      onChange={(event) => assignBatch(participant.clerk_id, Number(event.target.value))}
                      className="bg-black border border-white/10 text-white text-xs uppercase tracking-widest p-2"
                    >
                      <option value="">UNASSIGNED</option>
                      {batchOptions.map((batchId) => (
                        <option key={batchId} value={batchId}>BATCH {batchId}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-6 px-4 text-xs uppercase tracking-widest text-blood-red">
                    {participant.status.replace("_", " ")}
                  </td>
                  <td className="py-6 px-4 text-white text-sm font-bold">{participant.score}</td>
                  <td className="py-6 px-4 text-white text-xs">
                    {participant.time_consumed ? `${participant.time_consumed}s` : "--"}
                  </td>
                  <td className="py-6 px-4 text-right">
                    <button
                      onClick={() => resetTeam(participant.clerk_id, participant.batch_id)}
                      className="p-3 bg-zinc-900 border border-white/10 text-white/40 hover:text-blood-red hover:border-blood-red transition-all"
                    >
                      RESET
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "batches" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {batches.map((batch) => (
            <div key={batch.batch_id} className="bg-zinc-900/50 border border-white/5 p-10 space-y-8 group hover:border-blood-red/40 transition-all">
              <div className="space-y-2">
                <span className="text-xs text-on-surface-variant/40 font-bold uppercase tracking-[0.2em]">OPERATIONAL BATCH</span>
                <h3 className="text-4xl font-bold text-white">BATCH {batch.batch_id}</h3>
              </div>
              <button
                onClick={() => toggleBatch(batch.batch_id, batch.is_locked)}
                className={`w-full py-5 font-bold uppercase tracking-[0.2em] text-sm transition-all border-2 ${batch.is_locked ? "bg-blood-red text-white border-blood-red hover:bg-crimson-glare" : "border-white/10 text-on-surface-variant hover:border-white/40"}`}
              >
                {batch.is_locked ? "UNLOCK BATCH" : "LOCK BATCH"}
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === "content" && (
        <div className="space-y-10">
          <div className="flex items-center gap-4">
            <select
              value={selectedBatch}
              onChange={(event) => {
                const next = Number(event.target.value);
                setSelectedBatch(next);
                fetchQuestions(next);
              }}
              className="bg-black border border-blood-red text-white text-xs uppercase tracking-widest p-3"
            >
              {batchOptions.map((batchId) => (
                <option key={batchId} value={batchId}>BATCH {batchId}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-[0.4em] text-blood-red">CODEWORD</h3>
              <input
                value={codewordInput}
                onChange={(event) => setCodewordInput(event.target.value)}
                className="w-full bg-black border border-blood-red/40 text-white p-4 uppercase tracking-widest"
                placeholder="NEW CODEWORD"
              />
              <button onClick={updateCodeword} className="w-full bg-blood-red text-white py-3 uppercase tracking-widest text-xs">Update Codeword</button>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-[0.4em] text-blood-red">STORY</h3>
              <textarea
                value={storyInput}
                onChange={(event) => setStoryInput(event.target.value)}
                className="w-full min-h-[200px] bg-black border border-blood-red/40 text-white p-4"
              />
              <button onClick={updateStory} className="w-full bg-blood-red text-white py-3 uppercase tracking-widest text-xs">Update Story</button>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-[0.4em] text-blood-red">QUESTION MANAGER</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <input
                  type="number"
                  value={questionForm.questionId}
                  onChange={(event) => setQuestionForm((prev) => ({ ...prev, questionId: Number(event.target.value) }))}
                  className="w-full bg-black border border-white/10 text-white p-3"
                  placeholder="Question ID"
                />
                <textarea
                  value={questionForm.text}
                  onChange={(event) => setQuestionForm((prev) => ({ ...prev, text: event.target.value }))}
                  className="w-full min-h-[120px] bg-black border border-white/10 text-white p-3"
                  placeholder="Question text"
                />
                <textarea
                  value={questionForm.options}
                  onChange={(event) => setQuestionForm((prev) => ({ ...prev, options: event.target.value }))}
                  className="w-full min-h-[120px] bg-black border border-white/10 text-white p-3"
                  placeholder="Options (one per line)"
                />
                <input
                  value={questionForm.correct}
                  onChange={(event) => setQuestionForm((prev) => ({ ...prev, correct: event.target.value }))}
                  className="w-full bg-black border border-white/10 text-white p-3"
                  placeholder="Correct answer"
                />
                <input
                  value={questionForm.questionType}
                  onChange={(event) => setQuestionForm((prev) => ({ ...prev, questionType: event.target.value }))}
                  className="w-full bg-black border border-white/10 text-white p-3"
                  placeholder="Question type"
                />
                <textarea
                  value={questionForm.hints}
                  onChange={(event) => setQuestionForm((prev) => ({ ...prev, hints: event.target.value }))}
                  className="w-full min-h-[120px] bg-black border border-white/10 text-white p-3"
                  placeholder="Hints (one per line)"
                />
                <button onClick={createOrUpdateQuestion} className="w-full bg-blood-red text-white py-3 uppercase tracking-widest text-xs">Save Question</button>
              </div>

              <div className="space-y-4">
                {questions.map((question) => (
                  <div key={question.id} className="bg-zinc-900/50 border border-white/5 p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs uppercase tracking-widest text-blood-red">Q{question.id}</span>
                      <button onClick={() => deleteQuestion(question.id)} className="text-[10px] text-blood-red uppercase tracking-widest">Delete</button>
                    </div>
                    <div className="text-white text-sm line-clamp-2">{question.text}</div>
                    <div className="text-xs text-on-surface-variant/60">Answer: {question.correct}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "audit" && (
        <div className="space-y-4">
          {auditLogs.map((log) => (
            <div key={`${log.admin_id}-${log.timestamp}`} className="bg-zinc-900/50 border border-white/5 p-4 text-xs uppercase tracking-widest">
              <div className="text-blood-red">{log.action}</div>
              <div className="text-white/60">{log.target_id || "-"}</div>
              <div className="text-white/40">{new Date(log.timestamp).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
