import React, { useState, useEffect, useRef } from 'react';
import { Phone, ArrowRight, ArrowLeft, Building2, Search, ShieldCheck, IndianRupee, Mail, Lock, Loader2, Eye, EyeOff, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';

interface TenantLoginPageProps {
  onLogin: () => void;
  onBack: () => void;
  onBrowse: () => void;
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

export default function TenantLoginPage({ onLogin, onBack, onBrowse }: TenantLoginPageProps) {
  const [authMode, setAuthMode] = useState<'password' | 'otp'>('password');
  const [step, setStep] = useState<'identifier' | 'otp' | 'register' | 'forgot-password'>('identifier');
  
  // Fields
  const [identifier, setIdentifier] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resetSubmitted, setResetSubmitted] = useState(false);

  useEffect(() => {
    let interval: number;
    if (timer > 0) {
      interval = setInterval(() => setTimer((p) => p - 1), 1000) as unknown as number;
    }
    return () => clearInterval(interval);
  }, [timer]);

  /* ── Tenant: Password Login ─────────────────────────────────────────── */
  const handleLoginPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return toast.error('Enter your email/phone and password');
    setLoading(true);
    try {
      const res = await api.post('/api/auth/tenant/login', { identifier, password });
      const { accessToken, tenant } = res.data.data;
      
      localStorage.setItem('tenantAccessToken', accessToken);
      localStorage.setItem('tenant', JSON.stringify(tenant));
      
      toast.success(`Welcome back, ${tenant.name.split(' ')[0]}!`);
      onLogin();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message
               || err?.response?.data?.message
               || 'Login failed. Please try again.';
      toast.error(msg, { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  /* ── Tenant: OTP Login ──────────────────────────────────────────────── */
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = phone.trim();
    if (!/^\+91\d{10}$/.test(clean) && !/^\d{10}$/.test(clean)) {
      toast.error('Please enter a valid 10-digit phone number.');
      return;
    }
    
    setLoading(true);
    try {
      const formattedPhone = clean.startsWith('+91') ? clean : `+91${clean}`;
      setPhone(formattedPhone);
      
      const res = await api.post('/api/auth/tenant/request-otp', { phone: formattedPhone });
      if (res.data.data.otp) {
        toast.success(`Dev Mode OTP: ${res.data.data.otp}`, { duration: 6000 });
      } else {
        toast.success(`OTP sent to ${formattedPhone}`);
      }
      setStep('otp');
      setTimer(60);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setStep('register');
      } else {
        toast.error(err?.response?.data?.error?.message || 'Failed to send OTP.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      toast.error('Enter the 6-digit OTP.');
      return;
    }
    
    setLoading(true);
    try {
      const res = await api.post('/api/auth/tenant/verify-otp', { phone, otp });
      const { accessToken, tenant } = res.data.data;
      
      localStorage.setItem('tenantAccessToken', accessToken);
      localStorage.setItem('tenant', JSON.stringify(tenant));
      
      toast.success(`Welcome back, ${tenant.name.split(' ')[0]}!`);
      onLogin();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Tenant: Register ───────────────────────────────────────────────── */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Name is required');
    if (!/^\+91[6-9]\d{9}$/.test(phone)) return toast.error('Enter a valid 10-digit Indian mobile number');
    
    setLoading(true);
    try {
      await api.post('/api/auth/tenant/register', { phone, name, email, password: password || undefined });
      toast.success('Account created! Requesting OTP to verify number...');
      
      const res = await api.post('/api/auth/tenant/request-otp', { phone });
      if (res.data.data.otp) {
        toast.success(`Dev Mode OTP: ${res.data.data.otp}`, { duration: 6000 });
      }
      setStep('otp');
      setTimer(60);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  /* ── Tenant: Forgot Password ────────────────────────────────────────── */
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/auth/tenant/forgot-password', { email });
      setResetSubmitted(true);
      toast.success('Reset link sent!');
    } catch (err) {
      toast.error('Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 p-10"
        style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{ background: 'var(--primary)', boxShadow: '0 0 10px var(--primary-glow)' }}
          >
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span
            style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--ink)' }}
          >
            TenantOS
          </span>
        </div>

        <div className="space-y-8">
          <div>
            <h2
              className="text-2xl font-bold leading-snug"
              style={{ color: 'var(--ink)', fontFamily: 'Syne, Inter, sans-serif', letterSpacing: '-0.03em' }}
            >
              Find your perfect home.<br />
              <span className="font-normal text-xl" style={{ color: 'var(--ink-dim)' }}>Verified listings, zero brokerage.</span>
            </h2>
          </div>

          <div className="space-y-4">
            {[
              { icon: Search, title: 'Browse verified listings', desc: 'Every property listed by a verified landlord using TenantOS.' },
              { icon: ShieldCheck, title: 'Aadhaar-backed KYC', desc: 'One-time verification unlocks all applications and lease signing.' },
              { icon: IndianRupee, title: 'Pay rent via UPI', desc: 'Settle rent through Google Pay, PhonePe or Paytm. Get receipts instantly.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-3">
                <div
                  className="p-2 rounded-lg h-fit shrink-0"
                  style={{ background: 'rgba(232,234,240,0.06)' }}
                >
                  <Icon className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{title}</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--ink-dim)' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs" style={{ color: 'var(--ink-dim)', opacity: 0.5 }}>
          © {new Date().getFullYear()} TenantOS India
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        <button
          onClick={onBack}
          className="absolute top-6 left-6 btn-ghost text-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        <div className="w-full max-w-sm space-y-6">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center"
              style={{ background: 'var(--primary)', boxShadow: '0 0 10px var(--primary-glow)' }}
            >
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span
              style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--ink)' }}
            >
              TenantOS
            </span>
          </div>

          {step !== 'register' && (
            <div>
              <h1
                className="text-xl font-semibold"
                style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)' }}
              >
                Sign in as Tenant
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>
                New here?{' '}
                <button
                  onClick={onBrowse}
                  className="font-medium transition-colors"
                  style={{ color: 'var(--primary)' }}
                >
                  Browse listings without signing in →
                </button>
              </p>
            </div>
          )}

          <div
            className={step === 'register' ? "" : "rounded-xl p-6"}
            style={step === 'register' ? {} : { background: 'var(--surface)', border: '1px solid var(--border)' }}
          >

            {step === 'forgot-password' ? (
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

                    <button type="submit" className="btn-primary w-full" disabled={loading}>
                      {loading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending link…</>
                        : <>Send reset link <ArrowRight className="w-4 h-4" /></>
                      }
                    </button>
                    
                    <button type="button" onClick={() => setStep('identifier')} className="btn-ghost w-full text-xs mt-2">
                      ← Back to Login
                    </button>
                  </form>
                ) : (
                  <button type="button" onClick={() => { setStep('identifier'); setResetSubmitted(false); }} className="btn-secondary w-full py-2.5 mt-6">
                    Return to Login
                  </button>
                )}
              </>
            ) : step === 'register' ? (
              <>
                <div className="space-y-1">
                  <h1 style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 700, fontSize: '1.375rem', letterSpacing: '-0.025em', color: 'var(--ink)' }}>
                    Create an account
                  </h1>
                  <p className="text-sm" style={{ color: 'var(--ink-dim)' }}>Join TenantOS to manage your rentals</p>
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
                        className="input pl-9"
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
                        className="input pl-9 pr-10"
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
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Registering…</>
                      : <>Create account <ArrowRight className="w-4 h-4" /></>
                    }
                  </button>

                  <div className="text-center text-sm pt-4">
                    <span style={{ color: 'var(--ink-dim)' }}>Already have an account? </span>
                    <button type="button" onClick={() => setStep('identifier')} className="font-medium transition-colors" style={{ color: 'var(--primary)' }}>
                      Sign in
                    </button>
                  </div>
                </form>
              </>
            ) : step === 'otp' ? (
              <form onSubmit={handleVerifyOTP} className="space-y-6 animate-scale-in">
                <div className="space-y-1">
                  <h1 style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 700, fontSize: '1.75rem', letterSpacing: '-0.025em', color: 'var(--ink)' }}>
                    Enter your OTP
                  </h1>
                  <p className="text-sm" style={{ color: 'var(--ink-dim)' }}>
                    Sent to <span style={{ color: 'var(--ink)' }}>{phone}</span>
                  </p>
                </div>

                <OtpInput value={otp} onChange={setOtp} />

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full h-11 text-[0.9375rem]"
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => setStep('identifier')}
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
                      className="font-medium transition-colors"
                      style={{ color: 'var(--primary)' }}
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <>
                <div className="flex rounded-lg p-1 border border-[var(--border)] mb-6" style={{ background: 'var(--bg)' }}>
                  <button
                    type="button"
                    onClick={() => setAuthMode('password')}
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

                {authMode === 'password' ? (
                  <form onSubmit={handleLoginPassword} className="space-y-4 animate-fade-in">
                    <div>
                      <label className="input-label">Email or Phone</label>
                      <input
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="input w-full h-11"
                        placeholder="you@example.com or 9845612378"
                        required
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="input-label mb-0">Password</label>
                        <button type="button" onClick={() => setStep('forgot-password')} className="text-xs transition-colors" style={{ color: 'var(--primary)' }}>
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ink-dim)' }} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="input pl-9 pr-10 h-11" required
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
                    <button type="submit" className="btn-primary w-full justify-center h-11" disabled={loading}>
                      {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : <>Sign in <ArrowRight className="w-4 h-4" /></>}
                    </button>
                    
                    <div className="text-center text-sm pt-4">
                      <span style={{ color: 'var(--ink-dim)' }}>Don't have an account? </span>
                      <button type="button" onClick={() => setStep('register')} className="font-medium transition-colors" style={{ color: 'var(--primary)' }}>
                        Create one
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleSendOTP} className="space-y-4 animate-fade-in">
                    <div>
                      <label className="input-label" style={{ color: 'var(--ink)' }}>Phone Number</label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          <Phone className="w-4 h-4" style={{ color: 'var(--ink-dim)' }} />
                          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>+91</span>
                        </div>
                        <input
                          type="tel"
                          value={phone.replace(/^\+91/, '')}
                          onChange={(e) => setPhone('+91' + e.target.value.replace(/\D/g, ''))}
                          className="input w-full pl-16 h-11"
                          placeholder="Enter 10-digit number"
                          style={{ fontSize: '0.9375rem' }}
                          required
                        />
                      </div>
                    </div>
                    <button type="submit" className="btn-primary w-full justify-center h-11" disabled={loading}>
                      {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending OTP…</> : <>Send OTP <ArrowRight className="w-4 h-4" /></>}
                    </button>
                    
                    <div className="text-center text-sm pt-4">
                      <span style={{ color: 'var(--ink-dim)' }}>Don't have an account? </span>
                      <button type="button" onClick={() => setStep('register')} className="font-medium transition-colors" style={{ color: 'var(--primary)' }}>
                        Create one
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>

          <p className="text-xs text-center leading-relaxed px-2" style={{ color: 'var(--ink-dim)', opacity: 0.6 }}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
