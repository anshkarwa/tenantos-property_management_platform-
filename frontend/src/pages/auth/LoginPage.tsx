import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, ArrowRight, ArrowLeft, Shield, Mail, Lock, Loader2, Eye, EyeOff, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';

interface LoginPageProps {
  onLogin: () => void;
  onBackToHome: () => void;
  initialView?: 'login' | 'register';
}

/* ── 6-box OTP input ───────────────────────────────────────────────────── */
function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  const handleChange = (i: number, char: string) => {
    const digit = char.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = digit;
    onChange(next.join(''));
    if (digit && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      const next = [...digits]; next[i - 1] = '';
      onChange(next.join(''));
      inputs.current[i - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) inputs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted.padEnd(6, '').slice(0, 6));
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center my-6">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={el => { inputs.current[i] = el; }}
          type="text" inputMode="numeric" maxLength={1} value={digit}
          autoFocus={i === 0}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          aria-label={`OTP digit ${i + 1}`}
          style={{
            width: 48, height: 56, textAlign: 'center',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '1.5rem', fontWeight: 700,
            color: 'var(--ink)', background: 'transparent',
            border: `1.5px solid ${digit ? 'var(--primary)' : 'var(--border)'}`,
            borderRadius: 8, outline: 'none', caretColor: 'var(--primary)',
            transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.1s',
            transform: digit ? 'scale(1.04)' : 'scale(1)',
            boxShadow: digit ? '0 0 0 3px rgba(61,123,255,0.15)' : 'none',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(61,123,255,0.15)'; }}
          onBlur={e => { if (!digit) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}}
        />
      ))}
    </div>
  );
}

const stats = [
  { value: '₹15Cr+', label: 'Rent Processed' },
  { value: '10K+',   label: 'Units Managed' },
  { value: '99.2%',  label: 'On-Time Payments' },
];

export default function LoginPage({ onLogin, onBackToHome, initialView = 'login' }: LoginPageProps) {
  const { t } = useTranslation();
  const { login, loginOTP, loading: authLoading } = useAuth();

  const [view, setView] = useState<'login' | 'forgot-password' | 'register'>(initialView);
  const [authMode, setAuthMode] = useState<'password' | 'otp'>('password');
  
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSubmitted, setResetSubmitted] = useState(false);

  // Password / Register state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpStep, setOtpStep] = useState<'phone' | 'verify'>('phone');
  const [timer, setTimer] = useState(0);
  const [localLoading, setLocalLoading] = useState(false);

  const loading = authLoading || localLoading;

  useEffect(() => {
    let interval: number;
    if (timer > 0) {
      interval = setInterval(() => setTimer(p => p - 1), 1000) as unknown as number;
    }
    return () => clearInterval(interval);
  }, [timer]);

  /* ── Landlord: password login ────────────────────────────────────── */
  const handleLandlordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await login(email, password);
    if (ok) onLogin();
  };

  /* ── Landlord: OTP login ─────────────────────────────────────────── */
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = phone.trim();
    if (!/^\+91\d{10}$/.test(clean) && !/^\d{10}$/.test(clean)) {
      toast.error('Please enter a valid 10-digit phone number (e.g. +919845612378).');
      return;
    }
    
    setLocalLoading(true);
    try {
      const formattedPhone = clean.startsWith('+91') ? clean : `+91${clean}`;
      setPhone(formattedPhone);
      
      const res = await api.post('/api/auth/landlord/request-otp', { phone: formattedPhone });
      if (res.data.data.otp) {
        toast.success(`Dev Mode OTP: ${res.data.data.otp}`, { duration: 6000 });
      } else {
        toast.success(`OTP sent to ${formattedPhone}`);
      }
      setOtpStep('verify');
      setTimer(60);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to request OTP');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      toast.error('Enter the 6-digit OTP.');
      return;
    }
    
    const ok = await loginOTP(phone, otp);
    if (ok) onLogin();
  };

  /* ── Landlord: Register ─────────────────────────────────────────── */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    
    let formattedPhone = phone.trim();
    if (formattedPhone.length === 10 && !formattedPhone.startsWith('+91')) {
      formattedPhone = '+91' + formattedPhone;
    }
    
    setLocalLoading(true);
    try {
      await api.post('/api/auth/landlord/register', {
        name,
        phone: formattedPhone,
        email,
        password
      });
      
      const ok = await login(email, password);
      if (ok) onLogin();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create account');
    } finally {
      setLocalLoading(false);
    }
  };

  /* ── Landlord: Forgot Password ────────────────────────────────────── */
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      await api.post('/api/auth/landlord/forgot-password', { email });
      setResetSubmitted(true);
      toast.success('Reset link sent!');
    } catch (err) {
      toast.error('Failed to request password reset.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* ── Left brand panel ─────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 p-10"
        style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}
      >
        <div aria-hidden style={{ position: 'absolute', top: '-80px', left: '-80px', width: '320px', height: '320px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(61,123,255,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div aria-hidden style={{ position: 'absolute', bottom: '-60px', right: '-60px', width: '240px', height: '240px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,160,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="flex items-center gap-2.5 animate-fade-up">
          <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--primary)', boxShadow: '0 0 16px var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 800, fontSize: 17, color: '#fff' }}>T</span>
          </div>
          <span style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', letterSpacing: '-0.02em' }}>TenantOS</span>
        </div>

        <div className="space-y-5 animate-fade-up delay-100">
          <h2 style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 800, fontSize: '2rem', lineHeight: 1.15, letterSpacing: '-0.03em', color: 'var(--ink)' }}>
            Property management,{' '}
            <span style={{ color: 'var(--primary)' }}>finally</span>{' '}
            built for India.
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-dim)' }}>
            UPI rent collection, Aadhaar KYC, digital leases and WhatsApp notifications — everything in one place.
          </p>
          <div className="space-y-3 pt-2">
            {stats.map((s, i) => (
              <div key={s.label} className="flex items-center gap-3 animate-fade-up" style={{ animationDelay: `${200 + i * 80}ms` }}>
                <span style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 700, fontSize: '1.125rem', color: 'var(--ink)' }}>{s.value}</span>
                <span className="text-xs" style={{ color: 'var(--ink-dim)', paddingTop: 2, borderLeft: '1px solid var(--border)', paddingLeft: 10 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs animate-fade-up delay-300" style={{ color: 'var(--ink-dim)', lineHeight: 1.6 }}>
          Compliant with IT Act 2000, DPDP Act 2023 &amp; UIDAI Guidelines.
        </p>
      </div>

      {/* ── Right: form panel ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        <button onClick={onBackToHome} className="btn-secondary py-1.5 px-3 text-xs absolute top-6 left-6">
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
            <div className="space-y-6 animate-fade-up" key={view}>
              {view === 'login' ? (
                <>
                  <div className="space-y-1">
                    <h1 style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 700, fontSize: '1.375rem', letterSpacing: '-0.025em', color: 'var(--ink)' }}>
                      Welcome back
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--ink-dim)' }}>Sign in to your landlord dashboard</p>
                  </div>

                  <div className="flex rounded-lg p-1 border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
                    <button
                      type="button"
                      onClick={() => { setAuthMode('password'); setOtpStep('phone'); }}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${authMode === 'password' ? 'bg-[var(--surface)] shadow-sm' : ''}`}
                      style={{ color: authMode === 'password' ? 'var(--ink)' : 'var(--ink-dim)' }}
                    >
                      Password
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('otp')}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${authMode === 'otp' ? 'bg-[var(--surface)] shadow-sm' : ''}`}
                      style={{ color: authMode === 'otp' ? 'var(--ink)' : 'var(--ink-dim)' }}
                    >
                      OTP
                    </button>
                  </div>

                  {authMode === 'password' && (
                    <form onSubmit={handleLandlordLogin} className="space-y-4 animate-fade-in">
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
                        <div className="flex items-center justify-between mb-1.5">
                          <label htmlFor="password" className="input-label mb-0">Password</label>
                          <button type="button" onClick={() => setView('forgot-password')} className="text-xs transition-colors" style={{ color: 'var(--primary)' }}>
                            Forgot password?
                          </button>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ink-dim)' }} />
                          <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="input pl-9 pr-10" required
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
                      </div>

                      <button type="submit" className="btn-primary w-full" disabled={loading}>
                        {loading
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                          : <>Sign in <ArrowRight className="w-4 h-4" /></>
                        }
                      </button>
                    </form>
                  )}

                  {authMode === 'otp' && otpStep === 'phone' && (
                    <form onSubmit={handleRequestOTP} className="space-y-4 animate-fade-in">
                      <div>
                        <label className="input-label">Phone Number</label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <Phone className="w-4 h-4" style={{ color: 'var(--ink-dim)' }} />
                            <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>+91</span>
                          </div>
                          <input
                            type="tel"
                            value={phone.replace(/^\+91/, '')}
                            onChange={(e) => setPhone('+91' + e.target.value.replace(/\D/g, ''))}
                            className="input w-full pl-16"
                            placeholder="Enter 10-digit number"
                            required
                          />
                        </div>
                      </div>
                      <button type="submit" className="btn-primary w-full" disabled={loading}>
                        {loading
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending OTP…</>
                          : <>Send OTP <ArrowRight className="w-4 h-4" /></>
                        }
                      </button>
                    </form>
                  )}

                  {authMode === 'otp' && otpStep === 'verify' && (
                    <form onSubmit={handleVerifyOTP} className="space-y-6 animate-fade-in">
                      <div className="space-y-1">
                        <p className="text-sm" style={{ color: 'var(--ink-dim)' }}>
                          Sent to <span style={{ color: 'var(--ink)' }}>{phone}</span>
                        </p>
                      </div>

                      <OtpInput value={otp} onChange={setOtp} />

                      <button type="submit" className="btn-primary w-full" disabled={loading}>
                        {loading ? 'Verifying...' : 'Verify OTP'}
                      </button>

                      <div className="flex items-center justify-between text-sm">
                        <button
                          type="button"
                          onClick={() => setOtpStep('phone')}
                          className="transition-colors"
                          style={{ color: 'var(--ink-dim)' }}
                        >
                          ← Change Number
                        </button>
                        {timer > 0 ? (
                          <span style={{ color: 'var(--ink-dim)' }}>Resend in {timer}s</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { toast.success('OTP resent!'); setTimer(60); }}
                            style={{ color: 'var(--primary)' }}
                          >
                            Resend OTP
                          </button>
                        )}
                      </div>
                    </form>
                  )}

                  <div className="text-center text-sm pt-4">
                    <span style={{ color: 'var(--ink-dim)' }}>Don't have an account? </span>
                    <button type="button" onClick={() => setView('register')} className="font-medium transition-colors" style={{ color: 'var(--primary)' }}>
                      Create one
                    </button>
                  </div>

                </>
              ) : view === 'register' ? (
                <>
                  <div className="space-y-1">
                    <h1 style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 700, fontSize: '1.375rem', letterSpacing: '-0.025em', color: 'var(--ink)' }}>
                      Create an account
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--ink-dim)' }}>Join TenantOS to manage your properties</p>
                  </div>

                  <form onSubmit={handleRegister} className="space-y-4 animate-fade-in mt-6">
                    <div>
                      <label htmlFor="reg-name" className="input-label">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ink-dim)' }} />
                        <input
                          id="reg-name" type="text" value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="John Doe"
                          className="input pl-9" required
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="reg-phone" className="input-label">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ink-dim)' }} />
                        <input
                          id="reg-phone" type="tel" value={phone}
                          onChange={e => setPhone(e.target.value)}
                          placeholder="+91 98XXXXXXXX"
                          className="input pl-9" required
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="reg-email" className="input-label">Email address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ink-dim)' }} />
                        <input
                          id="reg-email" type="email" value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="input pl-9" required
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="reg-password" className="input-label">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ink-dim)' }} />
                        <input
                          id="reg-password"
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

                    <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
                      {loading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
                        : <>Create account <ArrowRight className="w-4 h-4" /></>
                      }
                    </button>

                    <div className="text-center text-sm pt-4">
                      <span style={{ color: 'var(--ink-dim)' }}>Already have an account? </span>
                      <button type="button" onClick={() => setView('login')} className="font-medium transition-colors" style={{ color: 'var(--primary)' }}>
                        Sign in
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <div className="space-y-1 text-center">
                    <h1 style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 700, fontSize: '1.375rem', letterSpacing: '-0.025em', color: 'var(--ink)' }}>
                      Reset your password
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--ink-dim)' }}>
                      {resetSubmitted 
                        ? "If that account exists, we've sent a password reset link to your email."
                        : "Enter your email address and we'll send you a link to reset your password."}
                    </p>
                  </div>

                  {!resetSubmitted ? (
                    <form onSubmit={handleForgotPassword} className="space-y-4 mt-6">
                      <div>
                        <label htmlFor="reset-email" className="input-label">Email address</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ink-dim)' }} />
                          <input
                            id="reset-email" type="email" value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="input pl-9" required
                            autoFocus
                          />
                        </div>
                      </div>

                      <button type="submit" className="btn-primary w-full" disabled={resetLoading}>
                        {resetLoading
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending link…</>
                          : <>Send reset link <ArrowRight className="w-4 h-4" /></>
                        }
                      </button>
                      
                      <button type="button" onClick={() => setView('login')} className="btn-ghost w-full text-xs mt-2">
                        ← Back to Login
                      </button>
                    </form>
                  ) : (
                    <button type="button" onClick={() => { setView('login'); setResetSubmitted(false); }} className="btn-secondary w-full py-2.5 mt-6">
                      Return to Login
                    </button>
                  )}
                </>
              )}
            </div>

          <p className="text-center text-xs mt-8 leading-relaxed" style={{ color: 'var(--ink-dim)' }}>
            {t('auth.terms')}
          </p>
        </div>
      </div>
    </div>
  );
}
