import React, { useState } from 'react';
import { Mail, Lock, Phone, User, ArrowRight, ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';

interface RegisterPageProps {
  onRegister: () => void;
  onBackToLogin: () => void;
}

export default function RegisterPage({ onRegister, onBackToLogin }: RegisterPageProps) {
  const { login } = useAuth();

  // Capture referral code from URL (e.g. /register?ref=ABC123 or landing page ?ref=ABC123)
  const urlRef = new URLSearchParams(window.location.search).get('ref') || '';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [referralCode, setReferralCode] = useState(urlRef);

  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    let formattedPhone = phone.trim();
    if (formattedPhone.length === 10 && !formattedPhone.startsWith('+91')) {
      formattedPhone = '+91' + formattedPhone;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/landlord/register', {
        name,
        phone: formattedPhone,
        email,
        password,
        ...(referralCode.trim() && { referral_code: referralCode.trim() }),
      });
      
      // Auto-login after successful registration
      const ok = await login(email, password);
      if (ok) onRegister();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* ── Left form panel ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        <button onClick={onBackToLogin} className="btn-secondary py-1.5 px-3 text-xs absolute top-6 left-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8 animate-fade-up">
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary)', boxShadow: '0 0 12px var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 800, fontSize: 14, color: '#fff' }}>T</span>
          </div>
          <span style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--ink)', letterSpacing: '-0.02em' }}>TenantOS</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="space-y-6 animate-fade-up">
            <div className="space-y-1">
              <h1 style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 700, fontSize: '1.375rem', letterSpacing: '-0.025em', color: 'var(--ink)' }}>
                Create an account
              </h1>
              <p className="text-sm" style={{ color: 'var(--ink-dim)' }}>Join TenantOS to manage your properties</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label htmlFor="name" className="input-label">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ink-dim)' }} />
                  <input
                    id="name" type="text" value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="John Doe"
                    className="input pl-9" required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="input-label">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ink-dim)' }} />
                  <input
                    id="phone" type="tel" value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+91 98XXXXXXXX"
                    className="input pl-9" required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="input-label">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ink-dim)' }} />
                  <input
                    id="email" type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input pl-9" required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="input-label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ink-dim)' }} />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input pl-9 pr-10" required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--ink-dim)' }}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs mt-1.5" style={{ color: 'var(--ink-dim)', opacity: 0.7 }}>
                  Must be at least 8 characters
                </p>
              </div>

              <div>
                <label htmlFor="referral" className="input-label">Referral Code <span style={{ color: 'var(--ink-dim)', fontWeight: 400 }}>(optional)</span></label>
                <input
                  id="referral" type="text" value={referralCode}
                  onChange={e => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ABC123"
                  className="input"
                />
              </div>

              <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
                  : <>Sign up <ArrowRight className="w-4 h-4" /></>
                }
              </button>
              
              <div className="text-center text-sm pt-2">
                <span style={{ color: 'var(--ink-dim)' }}>Already have an account? </span>
                <button type="button" onClick={onBackToLogin} className="font-medium transition-colors" style={{ color: 'var(--primary)' }}>
                  Sign in
                </button>
              </div>
            </form>
          </div>

          <p className="text-center text-xs mt-8 leading-relaxed px-4" style={{ color: 'var(--ink-dim)' }}>
            By creating an account, you agree to the TenantOS Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>

      {/* ── Right brand panel ─────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-center items-center w-[420px] shrink-0 p-10"
        style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}
      >
        <div aria-hidden style={{ position: 'absolute', top: '-80px', right: '-80px', width: '320px', height: '320px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(61,123,255,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        
        <div className="flex flex-col items-center text-center space-y-6 animate-fade-up">
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--primary)', boxShadow: '0 0 24px var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 800, fontSize: 24, color: '#fff' }}>T</span>
          </div>
          
          <div className="space-y-3">
            <h2 style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 800, fontSize: '1.75rem', lineHeight: 1.15, letterSpacing: '-0.03em', color: 'var(--ink)' }}>
              Join thousands of landlords
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-dim)', maxWidth: '280px', margin: '0 auto' }}>
              Create your account in seconds and start managing your properties with the best tools in India.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
