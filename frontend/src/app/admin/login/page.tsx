'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Terminal } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

export default function AdminLoginPage() {
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/login?secret=${secret}`, {
        method: 'POST'
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('admin_auth_token', data.token);
        router.push('/admin');
      } else {
        setError('UNAUTHORIZED: INVALID ACCESS KEY');
      }
    } catch (err) {
      setError('COMMUNICATION FAILURE');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-black min-h-screen flex items-center justify-center font-mono p-6">
      <div className="max-w-md w-full space-y-12 animate-fadeIn">
        
        {/* Visual Header */}
        <div className="text-center space-y-4">
          <div className="inline-block p-6 bg-blood-red/10 border border-blood-red/20 rounded-full animate-pulse">
            <Shield size={48} className="text-blood-red" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-white tracking-[0.3em] uppercase">SYSTEM ACCESS</h1>
            <p className="text-on-surface-variant/40 text-[10px] uppercase tracking-widest">Authorized Personnel Only</p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-8">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center text-on-surface-variant/40 group-focus-within:text-blood-red transition-colors">
              <Lock size={18} />
            </div>
            <input 
              type="password"
              placeholder="ENTER ENCRYPTION KEY"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="w-full bg-zinc-900/50 border border-white/10 p-5 pl-12 text-white placeholder:text-white/10 focus:border-blood-red focus:outline-none transition-all uppercase tracking-[0.2em] text-sm"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-blood-red/10 border-l-4 border-blood-red p-4 text-blood-red text-[10px] font-bold uppercase tracking-widest flex items-center gap-3">
              <Terminal size={14} />
              {error}
            </div>
          )}

          <button 
            disabled={loading}
            className="w-full py-5 bg-blood-red text-white font-bold uppercase tracking-[0.4em] text-xs hover:bg-crimson-glare transition-all disabled:opacity-50 flex items-center justify-center gap-4"
          >
            {loading ? 'AUTHENTICATING...' : 'AUTHORIZE ENTRY'}
          </button>
        </form>

        {/* Footer Info */}
        <div className="text-center space-y-2 pt-8">
          <div className="w-12 h-[1px] bg-white/10 mx-auto" />
          <p className="text-[9px] text-on-surface-variant/20 uppercase tracking-[0.5em]">
            TechTrix Intelligence Platform v2.0
          </p>
        </div>
      </div>
    </div>
  );
}
