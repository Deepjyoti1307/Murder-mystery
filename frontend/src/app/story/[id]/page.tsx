'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from "@clerk/nextjs";
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/api';

/* ── Inline styles for evidence blocks ── */
const styles = {
  emailCard: { background: 'rgba(139,0,0,0.06)', border: '1px solid rgba(139,0,0,0.25)', borderLeft: '4px solid #8B0000', padding: '1.5rem', marginTop: '0.5rem', marginBottom: '0.5rem' } as React.CSSProperties,
  emailHeader: { fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: '#aa8984', marginBottom: '0.25rem' },
  emailHeaderVal: { color: '#e3beb8', fontFamily: 'var(--font-courier-prime), monospace' },
  emailBody: { color: '#e3beb8', lineHeight: 1.8, marginTop: '1rem', whiteSpace: 'pre-wrap' as const, fontStyle: 'italic' },
  smsContainer: { padding: '1rem 0', marginTop: '0.5rem', marginBottom: '0.5rem' } as React.CSSProperties,
  smsBubbleL: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0 12px 12px 12px', padding: '0.6rem 1rem', maxWidth: '85%', marginBottom: '0.6rem' } as React.CSSProperties,
  smsBubbleR: { background: 'rgba(139,0,0,0.15)', border: '1px solid rgba(139,0,0,0.3)', borderRadius: '12px 0 12px 12px', padding: '0.6rem 1rem', maxWidth: '85%', marginLeft: 'auto', marginBottom: '0.6rem' } as React.CSSProperties,
  smsName: { fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#DC143C', fontWeight: 700, marginBottom: '0.15rem' },
  smsText: { color: '#e2e2e2', fontSize: '0.85rem', lineHeight: 1.6 },
  witnessBox: { background: 'rgba(255,255,255,0.03)', borderLeft: '3px solid #aa8984', padding: '1.25rem 1.5rem', fontStyle: 'italic', color: '#e3beb8', lineHeight: 1.9, marginTop: '0.5rem', marginBottom: '0.5rem' } as React.CSSProperties,
  sectionHeader: { color: '#DC143C', fontFamily: 'var(--font-nosifer), sans-serif', fontSize: '0.9rem', letterSpacing: '0.25em', textTransform: 'uppercase' as const, borderBottom: '1px solid rgba(139,0,0,0.3)', paddingBottom: '0.75rem', marginTop: '2.5rem', marginBottom: '1rem' } as React.CSSProperties,
  dayHeader: { color: '#e2e2e2', fontFamily: 'var(--font-nosifer), sans-serif', fontSize: '1.1rem', letterSpacing: '0.2em', textTransform: 'uppercase' as const, borderBottom: '2px solid rgba(139,0,0,0.5)', paddingBottom: '0.75rem', marginTop: '3rem', marginBottom: '1.25rem' } as React.CSSProperties,
  subHeader: { color: '#DC143C', fontSize: '0.75rem', letterSpacing: '0.3em', textTransform: 'uppercase' as const, fontWeight: 700, marginTop: '2rem', marginBottom: '0.5rem' } as React.CSSProperties,
  narrative: { color: 'rgba(227,190,184,0.85)', lineHeight: 2, textAlign: 'justify' as const, marginBottom: '1rem' } as React.CSSProperties,
  bullet: { color: 'rgba(227,190,184,0.85)', lineHeight: 1.9, paddingLeft: '1.25rem', position: 'relative' as const, marginBottom: '0.5rem' } as React.CSSProperties,
  bulletDot: { position: 'absolute' as const, left: 0, color: '#DC143C' },
  bold: { color: '#e2e2e2', fontWeight: 700 },
  stamp: { display: 'inline-block', border: '2px solid rgba(139,0,0,0.4)', padding: '0.15rem 0.6rem', fontSize: '0.6rem', letterSpacing: '0.2em', color: '#DC143C', transform: 'rotate(-2deg)', marginLeft: '0.5rem' } as React.CSSProperties,
};

/* ── Parse bold markdown into spans ── */
function parseBold(text: string): React.ReactNode[] {
  const parts = text.split(/\*{2,4}(.*?)\*{2,4}/g);
  return parts.map((p, i) => i % 2 === 1 ? <span key={i} style={styles.bold}>{p}</span> : p);
}

/* ── Smart Story Renderer ── */
function StoryRenderer({ content }: { content: string }) {
  if (!content) return null;
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }

    // ── DAY HEADERS: ## [DAY X] ──
    if (/^##\s*\[DAY\s*\d+\]/i.test(line)) {
      const text = line.replace(/^#+\s*/, '').replace(/##\s*/g, '');
      elements.push(<div key={i} style={styles.dayHeader}>{text}</div>);
      i++; continue;
    }

    // ── INTERCEPTED EMAIL ──
    if (/INTERCEPTED EMAIL/i.test(line)) {
      const title = line.replace(/^#+\s*/, '');
      const emailLines: string[] = [];
      i++;
      while (i < lines.length && !(lines[i].trim().startsWith('##') || lines[i].trim().startsWith('###')) && !(i > 0 && lines[i].trim() === '' && i + 1 < lines.length && /^##/.test(lines[i+1].trim()))) {
        emailLines.push(lines[i]); i++;
        if (i < lines.length && lines[i].trim() === '' && i + 1 < lines.length && (/^##|^###/.test(lines[i+1].trim()))) break;
      }
      const from = emailLines.find(l => /\*\*FROM:\*\*/i.test(l))?.replace(/.*\*\*FROM:\*\*\s*/i, '').trim();
      const to = emailLines.find(l => /\*\*TO:\*\*/i.test(l))?.replace(/.*\*\*TO:\*\*\s*/i, '').trim();
      const subj = emailLines.find(l => /SUBJECT/i.test(l))?.replace(/.*SUBJECT:\*{0,4}\s*/i, '').trim();
      const bodyStart = emailLines.findIndex(l => !/\*\*(FROM|TO):\*\*/i.test(l) && !/SUBJECT/i.test(l) && l.trim());
      const body = bodyStart >= 0 ? emailLines.slice(bodyStart).map(l => l.trim()).join('\n') : '';
      elements.push(
        <div key={`email-${i}`}>
          <div style={styles.subHeader}>📧 {title} <span style={styles.stamp}>INTERCEPTED</span></div>
          <div style={styles.emailCard}>
            {from && <div style={styles.emailHeader}>From: <span style={styles.emailHeaderVal}>{from}</span></div>}
            {to && <div style={styles.emailHeader}>To: <span style={styles.emailHeaderVal}>{to}</span></div>}
            {subj && <div style={styles.emailHeader}>Subject: <span style={{...styles.emailHeaderVal, color: '#DC143C'}}>{subj}</span></div>}
            {body && <div style={styles.emailBody}>{parseBold(body)}</div>}
          </div>
        </div>
      );
      continue;
    }

    // ── INTERCEPTED SMS ──
    if (/INTERCEPTED SMS/i.test(line)) {
      const title = line.replace(/^#+\s*/, '');
      const msgs: {name: string; time: string; text: string}[] = [];
      i++;
      while (i < lines.length) {
        const smsLine = lines[i].trim();
        if (!smsLine) { i++; if (i < lines.length && /^##/.test(lines[i]?.trim())) break; continue; }
        if (/^##/.test(smsLine)) break;
        const m = smsLine.match(/^\*\s*(.+?)\s*\((\d{2}:\d{2})\):\*\s*(.*)/);
        if (m) { msgs.push({ name: m[1], time: m[2], text: m[3] }); }
        else if (msgs.length > 0) { msgs[msgs.length - 1].text += ' ' + smsLine; }
        i++;
      }
      elements.push(
        <div key={`sms-${i}`}>
          <div style={styles.subHeader}>💬 {title} <span style={styles.stamp}>INTERCEPTED</span></div>
          <div style={styles.smsContainer}>
            {msgs.map((msg, mi) => (
              <div key={mi} style={mi % 2 === 0 ? styles.smsBubbleL : styles.smsBubbleR}>
                <div style={styles.smsName}>{msg.name} — {msg.time}</div>
                <div style={styles.smsText}>{parseBold(msg.text)}</div>
              </div>
            ))}
          </div>
        </div>
      );
      continue;
    }

    // ── EYEWITNESS / STATEMENT blocks ──
    if (/^(##\s*)?(EYEWITNESS|STATEMENT|RECOVERED EVIDENCE)/i.test(line)) {
      const title = line.replace(/^#+\s*/, '');
      const bodyLines: string[] = [];
      i++;
      while (i < lines.length) {
        const wl = lines[i].trim();
        if (/^##/.test(wl)) break;
        if (wl) bodyLines.push(wl);
        i++;
      }
      const icon = /STATEMENT/.test(title) ? '🗣️' : /RECOVERED/.test(title) ? '🔍' : '👁️';
      elements.push(
        <div key={`witness-${i}`}>
          <div style={styles.subHeader}>{icon} {title}</div>
          <div style={styles.witnessBox}>{parseBold(bodyLines.join(' ').replace(/"/g, '"').replace(/"/g, '"'))}</div>
        </div>
      );
      continue;
    }

    // ── CCTV / FIELD LOG ──
    if (/CCTV|FIELD LOG/i.test(line) && /^##/.test(line)) {
      const title = line.replace(/^#+\s*/, '');
      const items: string[] = [];
      i++;
      while (i < lines.length) {
        const cl = lines[i].trim();
        if (/^##/.test(cl)) break;
        if (cl.startsWith('•')) items.push(cl.replace(/^•\s*/, ''));
        else if (cl) items.push(cl);
        i++;
      }
      elements.push(
        <div key={`cctv-${i}`}>
          <div style={styles.subHeader}>📹 {title}</div>
          <div style={{ padding: '0.5rem 0' }}>
            {items.map((item, ii) => (
              <div key={ii} style={{...styles.bullet, display: 'flex', gap: '0.5rem', alignItems: 'flex-start'}}>
                <span style={{ color: '#DC143C', flexShrink: 0 }}>▸</span>
                <span>{parseBold(item)}</span>
              </div>
            ))}
          </div>
        </div>
      );
      continue;
    }

    // ── COURIER NOTE / DESK NOTE ──
    if (/COURIER NOTE|NOTE FOUND/i.test(line)) {
      const title = line.replace(/^#+\s*/, '');
      const noteLines: string[] = [];
      i++;
      while (i < lines.length) {
        const nl = lines[i].trim();
        if (/^##/.test(nl)) break;
        if (nl) noteLines.push(nl);
        i++;
      }
      elements.push(
        <div key={`note-${i}`}>
          <div style={styles.subHeader}>📝 {title}</div>
          <div style={{ background: 'rgba(210,201,177,0.08)', border: '1px dashed rgba(210,201,177,0.3)', padding: '1.25rem', fontFamily: 'var(--font-courier-prime), monospace', color: '#D2C9B1', textAlign: 'center', letterSpacing: '0.15em', fontSize: '0.9rem', lineHeight: 2 }}>
            {noteLines.map((nl, ni) => <div key={ni}>{nl}</div>)}
          </div>
        </div>
      );
      continue;
    }

    // ── Section headers (## PREFACE, ## BASELINE, ## YOUR TASK, etc) ──
    if (/^##\s+/.test(line)) {
      const text = line.replace(/^#+\s*/, '').replace(/##\s*/g, '');
      elements.push(<div key={i} style={styles.sectionHeader}>{text}</div>);
      i++; continue;
    }

    // ── Sub-headers (### ...) ──
    if (/^###\s+/.test(line)) {
      const text = line.replace(/^#+\s*/, '');
      elements.push(<div key={i} style={styles.subHeader}>{text}</div>);
      i++; continue;
    }

    // ── Bullet points ──
    if (line.startsWith('•')) {
      elements.push(
        <div key={i} style={styles.bullet}>
          <span style={styles.bulletDot}>▸</span>
          {parseBold(line.replace(/^•\s*/, ''))}
        </div>
      );
      i++; continue;
    }

    // ── Numbered items (1. 2. 3.) ──
    if (/^\d+\.\s*$/.test(line)) {
      const num = line.replace('.', '').trim();
      i++;
      const nextLine = i < lines.length ? lines[i].trim() : '';
      elements.push(
        <div key={i} style={{...styles.bullet, display: 'flex', gap: '0.5rem'}}>
          <span style={{ color: '#DC143C', fontWeight: 700 }}>{num}.</span>
          <span>{parseBold(nextLine)}</span>
        </div>
      );
      i++; continue;
    }

    // ── Classification / header stamps ──
    if (/^OFFICIAL|^EYES ONLY|^FILE CLASSIFICATION|— END OF/i.test(line)) {
      elements.push(
        <div key={i} style={{ textAlign: 'center', color: '#DC143C', letterSpacing: '0.3em', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, padding: '0.5rem 0', borderTop: /END OF/.test(line) ? '2px solid rgba(139,0,0,0.3)' : 'none', marginTop: /END OF/.test(line) ? '2rem' : '0' }}>
          {line}
        </div>
      );
      i++; continue;
    }

    // ── Default narrative paragraph ──
    const paraLines: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(##|###|\*\s|•|\d+\.\s*$|OFFICIAL|EYES ONLY|INTERCEPTED|EYEWITNESS|STATEMENT|RECOVERED|CCTV|COURIER|NOTE FOUND|— END)/i.test(lines[i].trim())) {
      paraLines.push(lines[i].trim());
      i++;
    }
    elements.push(<p key={`p-${i}`} style={styles.narrative}>{parseBold(paraLines.join(' '))}</p>);
  }

  return <div>{elements}</div>;
}

export default function StoryPage() {
  const { id } = useParams();
  const { user } = useUser();
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(5400); // 90 minutes in seconds
  const [story, setStory] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchStory = async () => {
      try {
        // Start the timer on backend
        await fetch(`${API_BASE_URL}/api/batch/${id}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clerk_id: user?.id })
        });

        const response = await fetch(`${API_BASE_URL}/api/story/${id}`);
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

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [id, user]);

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

      <header className="sticky top-0 z-50 bg-void-black/90 backdrop-blur-md border-b-2 border-blood-red/30 py-4 px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-4 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <h1 className="font-headline-xl text-lg md:text-2xl text-on-surface tracking-widest uppercase">
            Case Dossier // Batch 0{id}
          </h1>
          <p className="text-crimson-glare/60 font-body-sm uppercase tracking-widest text-[10px] md:text-xs">
            Operative: {user?.firstName || 'UNKNOWN'}
          </p>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          <div className="flex flex-col items-center md:items-end">
            <span className="text-[8px] md:text-[10px] text-crimson-glare font-bold tracking-widest uppercase mb-0 md:mb-1">Time Remaining</span>
            <span className={`font-headline-xl text-xl md:text-3xl tracking-tighter ${timeLeft < 300 ? 'text-red-600 animate-pulse' : 'text-crimson-glare'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <button
            onClick={openQuiz}
            className="hidden md:block bg-blood-red hover:bg-crimson-glare text-white px-6 py-3 font-headline-xl text-sm uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(139,0,0,0.4)] active:scale-95"
          >
            Open Evidence Terminal
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto mt-8 md:mt-16 px-4 md:px-8 leading-relaxed">
        <div className="bg-zinc-900/30 border border-blood-red/10 p-6 md:p-20 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blood-red/30" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-blood-red/30" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-blood-red/30" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blood-red/30" />

          <div className="flex items-center gap-4 mb-8 md:mb-12 border-b border-blood-red/20 pb-8">
            <div className="w-12 md:w-16 h-1 bg-blood-red" />
            <h2 className="font-headline-xl text-2xl md:text-4xl text-on-surface tracking-[0.2em] uppercase">Eyes Only</h2>
          </div>

          <StoryRenderer content={story} />

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
