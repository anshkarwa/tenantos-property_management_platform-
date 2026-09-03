import React, { useState } from 'react';
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';

export default function AdminLoginPage() {
  const { adminLogin } = useAdmin();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await adminLogin(email, password);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--bg)' }}
    >
      {/* Background glow */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(255,77,109,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div className="w-full max-w-sm relative">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'var(--danger-dim)',
              border: '1px solid rgba(255,77,109,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 24px rgba(255,77,109,0.15)',
            }}
          >
            <Shield className="w-6 h-6" style={{ color: 'var(--danger)' }} />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ background: 'var(--danger-dim)', color: 'var(--danger)', border: '1px solid rgba(255,77,109,0.2)' }}
          >
            Admin Access
          </div>
          <h1
            style={{
              fontFamily: 'Syne, Inter, sans-serif',
              fontWeight: 800,
              fontSize: '1.5rem',
              letterSpacing: '-0.03em',
              color: 'var(--ink)',
            }}
          >
            TenantOS Console
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>
            Restricted access. Authorised personnel only.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="p-6 rounded-xl space-y-4"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          {error && (
            <div
              className="flex items-center gap-2 p-3 rounded-lg text-xs"
              style={{ background: 'var(--danger-dim)', color: 'var(--danger)', border: '1px solid rgba(255,77,109,0.2)' }}
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="input-label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="admin@tenantos.in"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="input-label">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className="input pr-10"
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--ink-dim)' }}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-150"
            style={{
              background: loading ? 'var(--danger-dim)' : 'var(--danger)',
              color: loading ? 'var(--danger)' : '#fff',
              border: loading ? '1px solid rgba(255,77,109,0.3)' : 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Authenticating…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs mt-5" style={{ color: 'var(--ink-dim)' }}>
          This page is not indexed or linked anywhere.
        </p>
      </div>
    </div>
  );
}
