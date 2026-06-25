import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

function TenantOSMark({ size = 28 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: 'var(--primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 12px var(--primary-glow)',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontFamily: 'Syne, Inter, sans-serif',
          fontWeight: 800,
          fontSize: size * 0.5,
          color: '#fff',
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}
      >
        T
      </span>
    </div>
  );
}

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const token = params.get('token') || '';
  const email = params.get('email') || '';
  const role  = (params.get('role') || 'landlord') as 'landlord' | 'tenant';

  const [password, setPassword]        = useState('');
  const [confirm, setConfirm]          = useState('');
  const [showPw, setShowPw]            = useState(false);
  const [showConfirm, setShowConfirm]  = useState(false);
  const [loading, setLoading]          = useState(false);
  const [done, setDone]                = useState(false);
  const [error, setError]              = useState('');

  // Token/email missing — invalid link
  if (!token || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
        <div
          className="w-full max-w-sm p-8 rounded-2xl text-center space-y-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <XCircle className="w-10 h-10 mx-auto" style={{ color: 'var(--danger)' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--ink)' }}>Invalid link</h2>
          <p className="text-sm" style={{ color: 'var(--ink-dim)' }}>
            This password reset link is missing required parameters. Please request a new one.
          </p>
          <button className="btn-primary w-full justify-center" onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/api/auth/${role}/reset-password`, { email, token, password });
      setDone(true);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'This link has expired or is invalid. Please request a new reset link.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'var(--bg)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8">
        <TenantOSMark size={32} />
        <span
          style={{
            fontFamily: 'Syne, Inter, sans-serif',
            fontWeight: 700,
            fontSize: '1rem',
            color: 'var(--ink)',
            letterSpacing: '-0.02em',
          }}
        >
          TenantOS
        </span>
      </div>

      <div
        className="w-full max-w-sm rounded-2xl p-8 space-y-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {done ? (
          /* ── Success state ── */
          <div className="text-center space-y-4">
            <CheckCircle2 className="w-10 h-10 mx-auto" style={{ color: 'var(--success)' }} />
            <div>
              <h2
                className="text-lg font-bold"
                style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)', letterSpacing: '-0.02em' }}
              >
                Password updated!
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>
                Your password has been changed successfully. You can now log in with your new password.
              </p>
            </div>
            <button
              className="btn-primary w-full justify-center"
              onClick={() => navigate('/')}
            >
              Go to Login
            </button>
          </div>
        ) : (
          /* ── Form ── */
          <>
            <div>
              <h1
                className="text-lg font-bold"
                style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)', letterSpacing: '-0.02em' }}
              >
                Set new password
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>
                Resetting for <span style={{ color: 'var(--ink)' }}>{email}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New password */}
              <div>
                <label className="input-label">New Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="input pr-10"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--ink-dim)' }}
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label className="input-label">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="input pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--ink-dim)' }}
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div
                  className="rounded-lg px-4 py-3 text-sm"
                  style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', color: 'var(--danger)' }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</> : 'Update Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
