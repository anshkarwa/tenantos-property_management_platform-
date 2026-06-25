import React, { useEffect, useRef, useState } from 'react';
import {
  Share2, Copy, BadgeCheck, ShieldCheck, Star, Home,
  CalendarCheck, TrendingUp, ArrowRight, CheckCircle2, Download, Loader2,
} from 'lucide-react';
import { tenantApi } from '../../lib/api';
import toast from 'react-hot-toast';

interface RentalPassportPageProps {
  onBack: () => void;
}

/* ── Score gauge ────────────────────────────────────────────────────────── */
function ScoreGauge({ score }: { score: number }) {
  const [animated, setAnimated] = useState(0);
  const ref = useRef<SVGCircleElement>(null);
  const r = 52;
  const circ = 2 * Math.PI * r;

  useEffect(() => {
    const start = performance.now();
    const dur = 1200;
    const animate = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimated(Math.round(eased * score));
      if (p < 1) requestAnimationFrame(animate);
    };
    const id = setTimeout(() => requestAnimationFrame(animate), 300);
    return () => clearTimeout(id);
  }, [score]);

  const progress = animated / 100;
  const scoreColor =
    animated >= 80 ? 'var(--accent)' :
    animated >= 60 ? 'var(--primary)' :
    'var(--warning)';

  const label =
    animated >= 80 ? 'Excellent' :
    animated >= 60 ? 'Good' :
    'Fair';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          {/* Track */}
          <circle
            cx="60" cy="60" r={r}
            fill="none"
            stroke="var(--border)"
            strokeWidth="10"
          />
          {/* Progress */}
          <circle
            ref={ref}
            cx="60" cy="60" r={r}
            fill="none"
            stroke={scoreColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - progress)}
            style={{
              transition: 'stroke-dashoffset 0.05s linear, stroke 0.3s',
              filter: `drop-shadow(0 0 6px ${scoreColor})`,
            }}
          />
        </svg>
        {/* Center */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
        >
          <span
            style={{
              fontFamily: 'Syne, Inter, sans-serif',
              fontWeight: 800,
              fontSize: '1.75rem',
              lineHeight: 1,
              color: scoreColor,
            }}
          >
            {animated}
          </span>
          <span className="text-xs mt-0.5" style={{ color: 'var(--ink-dim)' }}>/ 100</span>
        </div>
      </div>
      <div>
        <span
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
          style={{ background: `${scoreColor}20`, color: scoreColor }}
        >
          <Star className="w-3 h-3" /> {label} Tenant
        </span>
      </div>
    </div>
  );
}

/* ── Trust badge ────────────────────────────────────────────────────────── */
function TrustBadge({
  icon: Icon, label, sublabel, color, verified,
}: {
  icon: React.ElementType; label: string; sublabel: string;
  color: string; verified: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg"
      style={{
        background: verified ? `${color}12` : 'var(--surface)',
        border: `1px solid ${verified ? `${color}30` : 'var(--border)'}`,
        opacity: verified ? 1 : 0.5,
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${color}20` }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{label}</p>
        <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>{sublabel}</p>
      </div>
      {verified && (
        <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color }} />
      )}
    </div>
  );
}

export default function RentalPassportPage({ onBack }: RentalPassportPageProps) {
  const [passport, setPassport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const res = await tenantApi.get('/api/tenant/passport/pdf', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TenantOS_Passport_${passport?.name?.replace(/\s+/g, '_') || 'Rental'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Passport downloaded!');
    } catch {
      toast.error('Failed to generate passport PDF');
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    tenantApi.get('/api/tenant/passport')
      .then(r => setPassport(r.data.data))
      .catch(() => toast.error('Failed to load passport'))
      .finally(() => setLoading(false));
  }, []);

  const p = passport;
  const stats = passport?.stats || {};
  const passportUrl = `https://tenantos.in/passport/${passport?.id || ''}`;
  const onTimePercent = stats.total_payments > 0
    ? Math.round((stats.on_time_payments / stats.total_payments) * 100) : 100;

  const handleCopy = () => {
    navigator.clipboard.writeText(passportUrl).then(() => {
      toast.success('Passport link copied!');
    });
  };

  if (loading || !p) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 px-5 py-3.5 flex items-center gap-3"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <button onClick={onBack} className="btn-icon">
          <Home className="w-4 h-4" />
        </button>
        <span
          style={{
            fontFamily: 'Syne, Inter, sans-serif', fontWeight: 700,
            fontSize: '0.9375rem', color: 'var(--ink)', flex: 1,
          }}
        >
          Rental Passport
        </span>
        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="btn-secondary py-1.5 px-3 text-xs"
        >
          {downloading
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
            : <><Download className="w-3.5 h-3.5" /> Download PDF</>
          }
        </button>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-8 space-y-5">
        {/* Passport card */}
        <div
          className="rounded-xl p-6 relative overflow-hidden animate-fade-up"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
          }}
        >
          {/* Top accent line */}
          <div
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
              background: 'linear-gradient(90deg, var(--primary), var(--accent))',
            }}
          />
          {/* Ambient glow */}
          <div
            aria-hidden
            style={{
              position: 'absolute', top: -40, right: -40, width: 200, height: 200,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(61,123,255,0.08) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mt-2">
            {/* Score gauge */}
            <ScoreGauge score={stats.reliability_score || 0} />

            {/* Identity */}
            <div className="flex-1 space-y-3 text-center sm:text-left">
              <div>
                <h1
                  style={{
                    fontFamily: 'Syne, Inter, sans-serif', fontWeight: 800,
                    fontSize: '1.375rem', letterSpacing: '-0.025em', color: 'var(--ink)',
                  }}
                >
                  {p.name}
                </h1>
                <p className="text-sm mt-0.5" style={{ color: 'var(--ink-dim)' }}>
                  {p.profession || '—'} · {p.leases?.[0]?.unit?.property?.city || '—'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                {p.aadhaar_verified && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
                  >
                    <BadgeCheck className="w-3.5 h-3.5" /> Aadhaar Verified
                  </span>
                )}
                {p.membership_tier === 'pro' && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ background: 'var(--primary-dim)', color: 'var(--primary)' }}
                  >
                    <Star className="w-3.5 h-3.5" /> Pro Member
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: `${onTimePercent}%`, label: 'On-time rent', color: 'var(--accent)' },
                  { value: `${stats.total_payments || 0}`, label: 'Months rented', color: 'var(--primary)' },
                  { value: `${stats.total_leases || 0}`, label: 'Properties', color: 'var(--ink)' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <div
                      style={{
                        fontFamily: 'Syne, Inter, sans-serif', fontWeight: 700,
                        fontSize: '1.125rem', color: s.color,
                      }}
                    >
                      {s.value}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--ink-dim)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Share section */}
          <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-xs mb-2" style={{ color: 'var(--ink-dim)' }}>
              Share your passport with landlords to skip the screening queue
            </p>
            <div className="flex items-center gap-2">
              <div
                className="flex-1 px-3 py-2 rounded-lg text-xs font-mono truncate"
                style={{ background: 'var(--bg)', color: 'var(--ink-dim)', border: '1px solid var(--border)' }}
              >
                {passportUrl}
              </div>
              <button onClick={handleCopy} className="btn-secondary py-2 px-3 text-xs shrink-0">
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className="space-y-3 animate-fade-up delay-100">
          <h2
            className="text-sm font-semibold"
            style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)' }}
          >
            Verification Status
          </h2>
          <TrustBadge
            icon={BadgeCheck}
            label="Aadhaar Verified"
            sublabel={p.aadhaar_verified ? 'Verified' : 'Not verified'}
            color="var(--accent)"
            verified={p.aadhaar_verified}
          />
          <TrustBadge
            icon={ShieldCheck}
            label="PAN Linked"
            sublabel={p.pan ?? 'Not linked'}
            color="var(--primary)"
            verified={!!p.pan}
          />
          <TrustBadge
            icon={Star}
            label="TenantOS Pro Member"
            sublabel={`Valid until ${new Date(p.membership_expires_at || '').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`}
            color="var(--warning)"
            verified={p.membership_tier === 'pro'}
          />
        </div>

        {/* Payment history bar */}
        <div className="card p-5 space-y-3 animate-fade-up delay-150">
          <div className="flex items-center justify-between">
            <h2
              className="text-sm font-semibold"
              style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)' }}
            >
              Rent Payment History
            </h2>
            <span className="badge-success">{onTimePercent}% on-time</span>
          </div>

          {/* Month bars */}
          <div className="flex items-end gap-1 h-12">
            {Array.from({ length: 15 }, (_, i) => {
              const paid = i < stats.on_time_payments || 0;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-sm transition-all"
                  style={{
                    height: paid ? '100%' : '40%',
                    background: paid ? 'var(--accent)' : 'var(--border)',
                    opacity: paid ? 1 : 0.5,
                    transition: `height 0.4s cubic-bezier(0.22,1,0.36,1) ${i * 40}ms, background 0.2s`,
                  }}
                />
              );
            })}
          </div>
          <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>
            {stats.on_time_payments || 0} of {stats.total_payments || 0} months paid on time across {stats.total_leases || 0} properties
          </p>
        </div>

        {/* How it helps */}
        <div
          className="rounded-xl p-4 space-y-3 animate-fade-up delay-200"
          style={{ background: 'var(--primary-dim)', border: '1px solid rgba(61,123,255,0.15)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>
            Why share your Rental Passport?
          </p>
          {[
            'Landlords skip manual screening — faster approval',
            'High score tenants get priority over other applicants',
            'Landlords may waive background check requirements',
          ].map(item => (
            <div key={item} className="flex items-start gap-2 text-xs" style={{ color: 'var(--ink)' }}>
              <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
