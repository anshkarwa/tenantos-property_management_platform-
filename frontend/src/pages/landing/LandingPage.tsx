import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  FileText,
  Users,
  Wrench,
  Smartphone,
  Check,
  IndianRupee,
  Zap,
  X,
} from 'lucide-react';

interface LandingPageProps {
  onLandlordLogin: () => void;
  onTenantLogin: () => void;
}

/* ── Animated count-up hook ───────────────────────────────────────────── */
function useCountUp(target: number, duration = 1200, prefix = '', suffix = '') {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

/* ── Animated stat ────────────────────────────────────────────────────── */
function AnimatedStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div
        style={{
          fontFamily: 'Syne, Inter, sans-serif',
          fontWeight: 800,
          fontSize: '1.75rem',
          color: 'var(--ink)',
          letterSpacing: '-0.04em',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        className="text-xs uppercase tracking-widest mt-2 font-medium"
        style={{ color: 'var(--ink-dim)' }}
      >
        {label}
      </div>
    </div>
  );
}

/* ── Scroll-reveal wrapper ────────────────────────────────────────────── */
function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.5s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.5s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

import { useAuth } from '../../context/AuthContext';

export default function LandingPage({ onLandlordLogin, onTenantLogin }: LandingPageProps) {
  const { t } = useTranslation();
  const { loggedIn } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [pricingTab, setPricingTab] = useState<'landlord' | 'tenant'>('landlord');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Secret admin shortcut: Shift + Ctrl + A
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && e.ctrlKey && e.key === 'A') {
        window.location.href = '/console';
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const features = [
    {
      icon: CreditCard,
      title: 'UPI-First Rent Collection',
      desc: 'Let tenants pay via Google Pay, PhonePe, or Paytm. Auto-reconciliation maps payments instantly to the right unit.',
      color: 'var(--primary)',
      dim: 'var(--primary-dim)',
    },
    {
      icon: ShieldCheck,
      title: 'Digital Leases & E-Sign',
      desc: 'Generate Model Tenancy Act 2021 compliant rental agreements in minutes and get them signed digitally.',
      color: 'var(--accent)',
      dim: 'var(--accent-dim)',
    },
    {
      icon: MessageSquare,
      title: 'WhatsApp-Native Interface',
      desc: 'Send automated rent reminders, PDF receipts, and collect maintenance requests inside WhatsApp.',
      color: 'var(--accent)',
      dim: 'var(--accent-dim)',
    },
    {
      icon: Sparkles,
      title: 'AI Clause Analysis',
      desc: 'Upload any physical lease PDF. AI scans it to extract key terms and flags potential risk factors.',
      color: 'var(--primary)',
      dim: 'var(--primary-dim)',
    },
    {
      icon: Users,
      title: 'Aadhaar Tenant KYC',
      desc: 'Onboard tenants securely with instant Aadhaar verification. Run background checks before handing over keys.',
      color: 'var(--warning)',
      dim: 'var(--warning-dim)',
    },
    {
      icon: Wrench,
      title: 'Maintenance Desk',
      desc: 'Track complaints, assign vendors, upload repair bills, and manage maintenance budgets in one dashboard.',
      color: 'var(--danger)',
      dim: 'var(--danger-dim)',
    },
  ];

  const pricingPlans = [
    {
      name: 'Starter',
      price: 'Free',
      limit: 'Up to 2 Units',
      features: [
        'Basic tenant registration',
        'Manual rent tracking',
        'Standard lease templates',
        'WhatsApp payment links',
      ],
      cta: 'Get Started Free',
      popular: false,
    },
    {
      name: 'Pro Landlord',
      price: '₹49',
      unit: '/unit/month',
      limit: '3 – 50 Units',
      features: [
        'Everything in Starter',
        'Auto UPI Rent Collection',
        'Instant Aadhaar KYC',
        'Automated WhatsApp reminders',
        'AI Lease Clause Analysis (5/mo)',
        'P&L & TDS reports export',
      ],
      cta: 'Go Pro',
      popular: true,
    },
    {
      name: 'Portfolio',
      price: '₹39',
      unit: '/unit/month',
      limit: '50+ Units / PG Operators',
      features: [
        'Everything in Pro',
        'Priority settlements',
        'Dedicated WhatsApp Bot',
        'Unlimited AI lease parsing',
        'Multi-manager permissions',
        'Custom legal agreements',
      ],
      cta: 'Contact Sales',
      popular: false,
    },
  ];

  const tenantPricingPlans = [
    {
      name: 'FREE',
      price: '₹0',
      limit: 'Browse-only access',
      features: [
        'Browse all listings (read-only)',
        'View property details & amenities',
        'Save up to 3 properties',
      ],
      cta: 'Get Started Free',
      popular: false,
    },
    {
      name: 'PRO MEMBER',
      price: '₹999',
      unit: '/year',
      limit: '',
      subtext: 'vs ₹40,000–₹80,000 in brokerage',
      features: [
        'Access all verified zero-brokerage listings',
        'Express interest in up to 10 properties at once',
        'Rental Passport with score shared with landlords',
        'Direct landlord contact after visit confirmation',
        'AI-matched listing recommendations by email',
        'Deposit Vault — secure escrow for your security deposit',
        'Priority WhatsApp support from TenantOS team',
      ],
      cta: 'Go Pro',
      popular: true,
    },
  ];

  const currentPlans = pricingTab === 'landlord' ? pricingPlans : tenantPricingPlans;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>

      {/* ── NAV ───────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 px-4 py-3 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(8,9,12,0.85)' : 'transparent',
          borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'var(--primary)',
                boxShadow: '0 0 10px var(--primary-glow)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: 'Syne, Inter, sans-serif',
                  fontWeight: 800,
                  fontSize: 14,
                  color: '#fff',
                }}
              >
                T
              </span>
            </div>
            <span
              style={{
                fontFamily: 'Syne, Inter, sans-serif',
                fontWeight: 700,
                fontSize: '0.9375rem',
                color: 'var(--ink)',
                letterSpacing: '-0.02em',
              }}
            >
              TenantOS
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loggedIn ? onLandlordLogin : () => setShowRoleModal(true)}
              className="btn-hero-sm"
            >
              {loggedIn ? 'Go to Dashboard' : 'Get Started'}
              <ArrowRight className="w-3 h-3 btn-hero-arrow" />
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        className="pt-24 pb-20 px-6 relative overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(61,123,255,0.12) 0%, transparent 70%)',
        }}
      >
        {/* Decorative grid */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
            backgroundSize: '64px 64px',
            opacity: 0.3,
            pointerEvents: 'none',
            maskImage: 'radial-gradient(ellipse 60% 50% at 50% 50%, black 30%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 50%, black 30%, transparent 80%)',
          }}
        />

        <div className="max-w-4xl mx-auto text-center relative">
          {/* Label */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-8 animate-fade-up"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--ink-dim)',
            }}
          >
            <Zap className="w-3 h-3" style={{ color: 'var(--accent)' }} />
            India's First AI-Powered Property SaaS
          </div>

          {/* Main headline — Syne, no gradient text */}
          <h1
            className="text-balance mb-6 animate-fade-up delay-100"
            style={{
              fontFamily: 'Syne, Inter, sans-serif',
              fontWeight: 800,
              fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.04em',
              color: 'var(--ink)',
            }}
          >
            Stop chasing rent.{' '}
            <br />
            <span style={{ color: 'var(--primary)' }}>Automate</span> your entire
            <br />
            rental portfolio.
          </h1>

          <p
            className="text-base max-w-xl mx-auto leading-relaxed mb-10 animate-fade-up delay-150"
            style={{ color: 'var(--ink-dim)' }}
          >
            Replace chaotic WhatsApp chats, Excel files, and manual UPI requests.
            Simplify tenant KYC, digital leases, and financial reports.
            Built for modern Indian landlords.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6 animate-fade-up delay-200">
            <button
              onClick={loggedIn ? onLandlordLogin : () => setShowRoleModal(true)}
              className="btn-hero w-full sm:w-auto"
            >
              {loggedIn ? 'Go to Dashboard' : 'Get Started'}
              <ArrowRight className="w-4 h-4 btn-hero-arrow" />
            </button>
          </div>

          {/* Metrics strip */}
          <div
            className="mt-16 pt-8 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto animate-fade-up delay-300"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            {[
              { value: '₹15Cr+', label: 'Rent Processed' },
              { value: '10K+', label: 'Units Managed' },
              { value: '99.2%', label: 'On-Time Payment' },
              { value: '< 2 min', label: 'KYC Verification' },
            ].map(m => (
              <AnimatedStat key={m.label} value={m.value} label={m.label} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section
        className="py-20 px-6"
        style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <div className="max-w-7xl mx-auto">
          <Reveal className="text-center max-w-2xl mx-auto mb-14">
            <h2
              style={{
                fontFamily: 'Syne, Inter, sans-serif',
                fontWeight: 800,
                fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
                letterSpacing: '-0.03em',
                color: 'var(--ink)',
                marginBottom: 12,
              }}
            >
              Complete suite built for Indian real estate
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-dim)' }}>
              Everything you need to run your properties smoothly, comply with the
              Model Tenancy Act, and keep transactions transparent.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <Reveal key={feat.title} delay={i * 60}>
                  <div
                    className="p-5 rounded-lg group cursor-default"
                    style={{
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderLeft: `3px solid ${feat.color}`,
                      transition: 'transform 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.transform = '';
                    }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="p-2 rounded-lg shrink-0"
                        style={{ background: feat.dim }}
                      >
                        <Icon className="w-4 h-4" style={{ color: feat.color }} />
                      </div>
                      <h3
                        className="text-sm font-semibold"
                        style={{ color: 'var(--ink)' }}
                      >
                        {feat.title}
                      </h3>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-dim)' }}>
                      {feat.desc}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── WHATSAPP SECTION ─────────────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-7xl mx-auto">
          <div
            className="p-8 md:p-10 rounded-xl flex flex-col lg:flex-row items-start justify-between gap-10"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <Reveal className="space-y-5 max-w-xl">
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{
                  background: 'var(--accent-dim)',
                  color: 'var(--accent)',
                  border: '1px solid rgba(0,212,160,0.2)',
                }}
              >
                <Smartphone className="w-3.5 h-3.5" />
                WhatsApp-Native Workflow
              </div>

              <h2
                style={{
                  fontFamily: 'Syne, Inter, sans-serif',
                  fontWeight: 800,
                  fontSize: 'clamp(1.375rem, 2.5vw, 2rem)',
                  letterSpacing: '-0.03em',
                  lineHeight: 1.2,
                  color: 'var(--ink)',
                }}
              >
                Tenants pay & communicate directly via WhatsApp
              </h2>

              <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-dim)' }}>
                No need to force tenants to install another app. Reminders are sent
                through verified WhatsApp channels. Tenants click the payment link,
                settle instantly, and download PDF receipts automatically.
              </p>

              <div className="space-y-2.5">
                {[
                  '3-Day & 1-Day automated rent notifications',
                  'Direct ticket submission for maintenance issues',
                  'Digital rent receipt delivery post confirmation',
                ].map(item => (
                  <div key={item} className="flex items-center gap-2.5 text-sm" style={{ color: 'var(--ink)' }}>
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'var(--accent-dim)' }}
                    >
                      <Check className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
            </Reveal>

            {/* WhatsApp mockup */}
            <Reveal delay={120} className="w-full max-w-sm shrink-0">
              <div
                className="rounded-xl p-4 relative overflow-hidden"
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
                }}
              >
                {/* Accent top bar */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: 'var(--accent)',
                    borderRadius: '12px 12px 0 0',
                  }}
                />

                <div className="flex items-center gap-2 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
                  >
                    T
                  </div>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>TenantOS Notifications</div>
                    <div className="text-xs" style={{ color: 'var(--accent)' }}>Verified Business Account</div>
                  </div>
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  <div
                    className="p-3 rounded-lg space-y-2 max-w-[88%]"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                  >
                    <p style={{ color: 'var(--ink)', lineHeight: 1.5 }}>
                      Namaste Amit! Your rent of{' '}
                      <strong style={{ color: 'var(--ink)' }}>₹25,000</strong> for{' '}
                      <strong style={{ color: 'var(--ink)' }}>Sharma Residency A-102</strong> is due on{' '}
                      <strong style={{ color: 'var(--ink)' }}>June 5, 2026</strong>.
                    </p>
                    <button
                      onClick={() => setShowRoleModal(true)}
                      className="w-full py-1.5 text-xs font-semibold rounded-lg transition-all"
                      style={{ background: 'var(--accent)', color: '#000' }}
                    >
                      Pay via UPI
                    </button>
                  </div>

                  <div
                    className="p-3 rounded-lg ml-auto max-w-[80%]"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                  >
                    <p style={{ color: 'var(--ink-dim)' }}>
                      Paid! UPI Ref:{' '}
                      <strong style={{ color: 'var(--ink)' }}>UPI9081237192</strong>
                    </p>
                  </div>

                  <div
                    className="p-3 rounded-lg space-y-2 max-w-[88%]"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                  >
                    <p style={{ color: 'var(--ink)' }}>Payment confirmed! Your digital receipt:</p>
                    <div
                      className="flex items-center gap-2 p-2 rounded-lg"
                      style={{ background: 'var(--bg)' }}
                    >
                      <FileText className="w-5 h-5 shrink-0" style={{ color: 'var(--danger)' }} />
                      <div>
                        <div className="font-medium" style={{ color: 'var(--ink)', fontSize: '0.6875rem' }}>
                          RECEIPT_RC-2026-04.pdf
                        </div>
                        <div style={{ color: 'var(--ink-dim)', fontSize: '0.625rem' }}>230 KB • PDF</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
      <section
        className="py-20 px-6"
        style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <div className="max-w-7xl mx-auto">
          <Reveal className="text-center max-w-2xl mx-auto mb-14">
            <h2
              style={{
                fontFamily: 'Syne, Inter, sans-serif',
                fontWeight: 800,
                fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
                letterSpacing: '-0.03em',
                color: 'var(--ink)',
                marginBottom: 12,
              }}
            >
              Predictable, pay-as-you-grow plans
            </h2>
            <p className="text-sm mb-8" style={{ color: 'var(--ink-dim)' }}>
              No hidden costs. Upgrade, downgrade, or cancel at any time.
            </p>

            <div className="inline-flex rounded-lg p-1 border border-[var(--border)] mb-10" style={{ background: 'var(--bg)' }}>
              <button
                type="button"
                onClick={() => setPricingTab('landlord')}
                className={`px-6 py-2 text-sm font-medium rounded-md transition-all ${pricingTab === 'landlord' ? 'bg-[var(--surface)] shadow-sm' : ''}`}
                style={{ color: pricingTab === 'landlord' ? 'var(--ink)' : 'var(--ink-dim)' }}
              >
                For Landlords
              </button>
              <button
                type="button"
                onClick={() => setPricingTab('tenant')}
                className={`px-6 py-2 text-sm font-medium rounded-md transition-all ${pricingTab === 'tenant' ? 'bg-[var(--surface)] shadow-sm' : ''}`}
                style={{ color: pricingTab === 'tenant' ? 'var(--ink)' : 'var(--ink-dim)' }}
              >
                For Tenants
              </button>
            </div>
          </Reveal>

          <div className={`grid grid-cols-1 md:grid-cols-${currentPlans.length} gap-5 justify-center max-w-5xl mx-auto`}>
            {currentPlans.map((plan, i) => (
              <Reveal key={plan.name} delay={i * 80}>
                <div
                  className="rounded-xl p-7 flex flex-col justify-between gap-7 relative h-full"
                  style={{
                    background: 'var(--bg)',
                    border: `1px solid ${plan.popular ? 'var(--primary)' : 'var(--border)'}`,
                    ...(plan.popular && {
                      boxShadow: '0 0 0 1px rgba(61,123,255,0.3), 0 16px 48px rgba(61,123,255,0.1)',
                    }),
                  }}
                >
                  {plan.popular && (
                    <>
                      {/* Top accent bar */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 24,
                          right: 24,
                          height: 2,
                          background: 'var(--primary)',
                          borderRadius: '0 0 4px 4px',
                        }}
                      />
                      <span
                        className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider"
                        style={{ background: 'var(--primary)', color: '#fff' }}
                      >
                        Most Popular
                      </span>
                    </>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h3
                        className="font-semibold text-sm uppercase tracking-wider"
                        style={{ color: 'var(--primary)', fontFamily: 'Syne, Inter, sans-serif' }}
                      >
                        {plan.name}
                      </h3>
                      {plan.limit && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--ink-dim)' }}>
                          {plan.limit}
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-baseline gap-1">
                        <span
                          style={{
                            fontFamily: 'Syne, Inter, sans-serif',
                            fontWeight: 800,
                            fontSize: '2.5rem',
                            color: 'var(--ink)',
                            letterSpacing: '-0.04em',
                          }}
                        >
                          {plan.price}
                        </span>
                        {plan.unit && (
                          <span className="text-sm font-medium" style={{ color: 'var(--ink-dim)' }}>
                            {plan.unit}
                          </span>
                        )}
                      </div>
                      {(plan as any).subtext && (
                        <p className="text-[13px] mt-1 font-medium" style={{ color: 'var(--accent)' }}>
                          {(plan as any).subtext}
                        </p>
                      )}
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                      <ul className="space-y-2.5">
                        {plan.features.map(feat => (
                          <li key={feat} className="flex items-center gap-2 text-xs" style={{ color: 'var(--ink-dim)' }}>
                            <CheckCircle2
                              className="w-3.5 h-3.5 shrink-0"
                              style={{ color: plan.popular ? 'var(--primary)' : 'var(--accent)' }}
                            />
                            {feat}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <button
                    onClick={pricingTab === 'landlord' ? onLandlordLogin : onTenantLogin}
                    className={plan.popular ? 'btn-primary w-full justify-center py-2.5' : 'btn-secondary w-full justify-center py-2.5'}
                  >
                    {plan.cta}
                  </button>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer
        className="py-12 px-6 mt-20 text-center"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="flex items-center justify-center gap-2.5">
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 800, fontSize: 11, color: '#fff' }}>T</span>
            </div>
            <span
              style={{
                fontFamily: 'Syne, Inter, sans-serif',
                fontWeight: 700,
                fontSize: '0.875rem',
                color: 'var(--ink-dim)',
                letterSpacing: '-0.02em',
              }}
            >
              TenantOS
            </span>
          </div>
          <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>
            © {new Date().getFullYear()} TenantOS India. All rights reserved.
            Compliant with IT Act 2000, DPDP Act 2023 & UIDAI Guidelines.
          </p>
        </div>
      </footer>

      {/* ── ROLE SELECTION MODAL ─────────────────────────────────────────── */}
      {showRoleModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)' }}
          onClick={() => setShowRoleModal(false)}
        >
          <div
            className="relative animate-fade-up text-center"
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setShowRoleModal(false)}
              className="absolute -top-10 right-0 p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--ink-dim)' }}
            >
              <X className="w-5 h-5" />
            </button>

            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--primary)' }}>
              Welcome to TenantOS
            </p>
            <h2
              className="mb-2"
              style={{
                fontFamily: 'Syne, Inter, sans-serif',
                fontWeight: 800,
                fontSize: '1.5rem',
                letterSpacing: '-0.03em',
                color: 'var(--ink)',
              }}
            >
              Who's signing in?
            </h2>
            <p className="text-sm mb-10" style={{ color: 'var(--ink-dim)' }}>
              Choose how you want to use TenantOS.
            </p>

            {/* Profile picker row */}
            <div className="flex items-start justify-center gap-8">
              {/* Tenant */}
              <button
                onClick={onTenantLogin}
                className="group flex flex-col items-center gap-3 outline-none"
              >
                <div
                  className="w-32 h-32 rounded-2xl flex items-center justify-center transition-all duration-200"
                  style={{
                    background: '#0d1526',
                    border: '1.5px solid rgba(61,123,255,0.2)',
                    boxShadow: '0 2px 16px rgba(0,0,0,0.5)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.border = '1.5px solid var(--primary)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 3px rgba(61,123,255,0.12), 0 8px 32px rgba(61,123,255,0.2)';
                    (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.border = '1.5px solid rgba(61,123,255,0.2)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 16px rgba(0,0,0,0.5)';
                    (e.currentTarget as HTMLDivElement).style.transform = '';
                  }}
                >
                  <Users className="w-12 h-12" style={{ color: 'var(--primary)' }} />
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Tenant</div>
                  <div className="text-xs mt-0.5 max-w-[120px]" style={{ color: 'var(--ink-dim)' }}>Find homes & pay rent</div>
                </div>
              </button>

              {/* Landlord */}
              <button
                onClick={onLandlordLogin}
                className="group flex flex-col items-center gap-3 outline-none"
              >
                <div
                  className="w-32 h-32 rounded-2xl flex items-center justify-center transition-all duration-200"
                  style={{
                    background: '#091a15',
                    border: '1.5px solid rgba(0,212,160,0.2)',
                    boxShadow: '0 2px 16px rgba(0,0,0,0.5)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.border = '1.5px solid var(--accent)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 3px rgba(0,212,160,0.1), 0 8px 32px rgba(0,212,160,0.15)';
                    (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.border = '1.5px solid rgba(0,212,160,0.2)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 16px rgba(0,0,0,0.5)';
                    (e.currentTarget as HTMLDivElement).style.transform = '';
                  }}
                >
                  <Building2 className="w-12 h-12" style={{ color: 'var(--accent)' }} />
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Landlord</div>
                  <div className="text-xs mt-0.5 max-w-[120px]" style={{ color: 'var(--ink-dim)' }}>Manage your portfolio</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
