import React, { useState, useEffect } from 'react';
import {
  Check, Zap, Shield, Star, ArrowRight, X,
  IndianRupee, Smartphone, Clock, BadgeCheck, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface MembershipPageProps {
  onBack: () => void;
  onSuccess: () => void;
  isLoggedIn?: boolean;
  onRequireLogin?: () => void;
}

/* ── Savings calculator ─────────────────────────────────────────────────── */
function SavingsCalculator() {
  const [rent, setRent] = useState(25000);
  const brokerage = rent * 2;
  const tenantOSFee = 999;
  const savings = brokerage - tenantOSFee;

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{ background: 'var(--primary-dim)', border: '1px solid rgba(61,123,255,0.2)' }}
    >
      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--primary)' }}>
        <Sparkles className="w-4 h-4" /> Your Brokerage Savings Calculator
      </div>
      <div>
        <label className="input-label">Your expected monthly rent</label>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: 'var(--ink-dim)' }}>₹</span>
          <input
            type="range"
            min={5000}
            max={100000}
            step={1000}
            value={rent}
            onChange={e => setRent(Number(e.target.value))}
            className="flex-1 accent-blue-500"
            style={{ accentColor: 'var(--primary)' }}
          />
          <span
            className="text-sm font-bold tabular-nums w-20 text-right"
            style={{ color: 'var(--ink)', fontFamily: 'Syne, Inter, sans-serif' }}
          >
            ₹{(rent / 1000).toFixed(0)}k/mo
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: 'Broker asks', value: `₹${(brokerage / 1000).toFixed(0)}k`, color: 'var(--danger)' },
          { label: 'TenantOS fee', value: '₹999', color: 'var(--primary)' },
          { label: 'You save', value: `₹${(savings / 1000).toFixed(0)}k+`, color: 'var(--accent)' },
        ].map(s => (
          <div key={s.label} className="rounded-lg py-3 px-2" style={{ background: 'rgba(0,0,0,0.2)' }}>
            <div
              className="text-xl font-bold tabular-nums"
              style={{ fontFamily: 'Syne, Inter, sans-serif', color: s.color }}
            >
              {s.value}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--ink-dim)' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Animated score counter ─────────────────────────────────────────────── */
function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 800;
    const animate = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(e * value));
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return <>{prefix}{count.toLocaleString('en-IN')}{suffix}</>;
}

const MEMBER_PERKS = [
  'Access all verified zero-brokerage listings',
  'Express interest in up to 10 properties at once',
  'Rental Passport with score shared with landlords',
  'Direct landlord contact after visit confirmation',
  'AI-matched listing recommendations by email',
  'Deposit Vault — secure escrow for your security deposit',
  'Priority WhatsApp support from TenantOS team',
];

const FREE_PERKS = [
  'Browse all listings (read-only)',
  'View property details & amenities',
  'Save up to 3 properties',
];

import { useCreateMembershipOrder, useVerifyMembership } from '../../hooks/useApi';
import { tenantApi } from '../../lib/api';

// Ensure typescript knows about window.Razorpay
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function MembershipPage({ onBack, onSuccess, isLoggedIn = false, onRequireLogin }: MembershipPageProps) {
  const [step, setStep] = useState<'plans' | 'processing' | 'success'>('plans');
  const [loading, setLoading] = useState(false);
  const [tenantProfile, setTenantProfile] = useState<{ name: string; phone: string; email: string | null } | null>(null);

  useEffect(() => {
    if (isLoggedIn) {
      tenantApi.get('/api/tenant/me').then(r => setTenantProfile(r.data.data)).catch(() => {});
    }
  }, [isLoggedIn]);

  const createOrder = useCreateMembershipOrder();
  const verifyMembership = useVerifyMembership();

  const handlePay = async (planId: string) => {
    if (!isLoggedIn) {
      if (onRequireLogin) onRequireLogin();
      return;
    }

    setLoading(true);

    try {
      // 1. Create Order
      const { order_id, amount, currency, is_mock } = await createOrder.mutateAsync({ plan_id: planId });

      // If mock mode (no real keys)
      if (is_mock) {
        setStep('processing');
        setTimeout(() => {
          verifyMembership.mutate({
            plan_id: planId,
            razorpay_order_id: order_id,
            razorpay_payment_id: 'mock_pay_999',
            razorpay_signature: 'mock_sig',
          }, {
            onSuccess: () => setStep('success'),
            onError: () => { setStep('plans'); setLoading(false); }
          });
        }, 1500);
        return;
      }

      // 2. Open Razorpay Checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount,
        currency,
        name: 'TenantOS',
        description: `Pro Membership`,
        order_id,
        handler: async function (response: any) {
          setStep('processing');
          // 3. Verify Payment
          try {
            await verifyMembership.mutateAsync({
              plan_id: planId,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
            setStep('success');
          } catch (err) {
            setStep('plans');
            setLoading(false);
          }
        },
        prefill: {
          name: tenantProfile?.name || '',
          email: tenantProfile?.email || '',
          contact: tenantProfile?.phone?.replace('+91', '') || '',
        },
        theme: {
          color: '#6366f1',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function () {
        setLoading(false);
      });
      rzp.open();
    } catch (error) {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
        <div className="text-center space-y-6 max-w-sm animate-scale-in">
          {/* Success ring */}
          <div className="relative mx-auto w-24 h-24">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{
                background: 'var(--accent-dim)',
                border: '3px solid var(--accent)',
                boxShadow: '0 0 32px rgba(0,212,160,0.4)',
              }}
            >
              <Check className="w-10 h-10" style={{ color: 'var(--accent)' }} />
            </div>
            <div
              className="absolute -top-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center animate-scale-in"
              style={{ background: 'var(--primary)', animationDelay: '200ms' }}
            >
              <BadgeCheck className="w-4 h-4 text-white" />
            </div>
          </div>

          <div className="space-y-2">
            <h1
              style={{
                fontFamily: 'Syne, Inter, sans-serif',
                fontWeight: 800,
                fontSize: '1.75rem',
                letterSpacing: '-0.03em',
                color: 'var(--ink)',
              }}
            >
              You're a Member!
            </h1>
            <p className="text-sm" style={{ color: 'var(--ink-dim)' }}>
              Welcome to TenantOS. You now have full access to all zero-brokerage listings.
            </p>
          </div>

          <div
            className="rounded-xl p-4 text-sm space-y-2"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex justify-between">
              <span style={{ color: 'var(--ink-dim)' }}>Membership valid until</span>
              <span className="font-semibold" style={{ color: 'var(--ink)' }}>June 2027</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--ink-dim)' }}>Listings unlocked</span>
              <span className="font-semibold" style={{ color: 'var(--accent)' }}>10 available near you</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--ink-dim)' }}>Brokerage saved</span>
              <span className="font-semibold" style={{ color: 'var(--accent)' }}>Up to ₹50,000+</span>
            </div>
          </div>

          <button onClick={onSuccess} className="btn-primary w-full justify-center py-3">
            Browse Listings <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
        <div className="p-10 flex flex-col items-center gap-4 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
          <div>
            <p className="font-bold text-base text-[var(--ink)]">Securely verifying payment...</p>
            <p className="text-sm text-[var(--ink-dim)] mt-1">Please do not close this window</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Plan selection screen ────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 px-5 py-3.5 flex items-center justify-between"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <div
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'var(--primary)',
              boxShadow: '0 0 10px var(--primary-glow)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 800, fontSize: 14, color: '#fff' }}>T</span>
          </div>
          <span style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--ink)' }}>
            TenantOS Membership
          </span>
        </div>
        <button onClick={onBack} className="btn-icon">
          <X className="w-4 h-4" />
        </button>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-10 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3 animate-fade-up">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(0,212,160,0.2)' }}
          >
            <Zap className="w-3.5 h-3.5" /> Zero Brokerage. One Small Fee.
          </div>
          <h1
            style={{
              fontFamily: 'Syne, Inter, sans-serif',
              fontWeight: 800,
              fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
              letterSpacing: '-0.04em',
              lineHeight: 1.1,
              color: 'var(--ink)',
            }}
          >
            Save up to{' '}
            <span style={{ color: 'var(--accent)' }}>₹<AnimatedNumber value={80000} /></span>
            <br />in brokerage fees
          </h1>
          <p className="text-sm max-w-lg mx-auto" style={{ color: 'var(--ink-dim)' }}>
            Traditional brokers charge 2 months rent. TenantOS charges ₹999/year.
            That's it. Get unlimited access to verified, broker-free listings.
          </p>
        </div>

        {/* Savings calculator */}
        <div className="animate-fade-up delay-100">
          <SavingsCalculator />
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-up delay-200">
          {/* Free */}
          <div className="card p-6 space-y-5 flex flex-col">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-dim)' }}>
                Free
              </p>
              <div
                className="text-3xl font-bold mt-1"
                style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)' }}
              >
                ₹0
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--ink-dim)' }}>Browse-only access</p>
            </div>
            <ul className="space-y-2.5 flex-1">
              {FREE_PERKS.map(p => (
                <li key={p} className="flex items-start gap-2 text-xs" style={{ color: 'var(--ink-dim)' }}>
                  <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--ink-dim)' }} />
                  {p}
                </li>
              ))}
            </ul>
            <button onClick={onBack} className="btn-secondary w-full justify-center py-2.5">
              Continue Browsing
            </button>
          </div>

          {/* Pro */}
          <div
            className="p-6 rounded-xl space-y-5 flex flex-col relative"
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--primary)',
              boxShadow: '0 0 0 1px rgba(61,123,255,0.2), 0 16px 48px rgba(61,123,255,0.12)',
            }}
          >
            <div
              style={{
                position: 'absolute', top: 0, left: 24, right: 24,
                height: 2, background: 'var(--primary)', borderRadius: '0 0 4px 4px',
              }}
            />
            <span
              className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider"
              style={{ background: 'var(--primary)', color: '#fff' }}
            >
              Most Popular
            </span>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
                Pro Member
              </p>
              <div className="flex items-baseline gap-1 mt-1">
                <span
                  className="text-3xl font-bold"
                  style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)' }}
                >
                  ₹999
                </span>
                <span className="text-sm" style={{ color: 'var(--ink-dim)' }}>/year</span>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--accent)' }}>
                vs ₹40,000–₹80,000 in brokerage
              </p>
            </div>

            <ul className="space-y-2.5 flex-1">
              {MEMBER_PERKS.map(p => (
                <li key={p} className="flex items-start gap-2 text-xs" style={{ color: 'var(--ink)' }}>
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: 'var(--accent-dim)' }}
                  >
                    <Check className="w-2.5 h-2.5" style={{ color: 'var(--accent)' }} />
                  </div>
                  {p}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handlePay('yearly_999')}
              disabled={loading}
              className="btn-primary w-full justify-center py-3"
              style={loading ? { opacity: 0.7 } : {}}
            >
              {loading ? 'Processing...' : <>Get Pro Membership <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        </div>

        {/* Trust strip */}
        <div
          className="flex flex-wrap items-center justify-center gap-6 py-4 text-xs animate-fade-up delay-300"
          style={{ color: 'var(--ink-dim)' }}
        >
          {[
            { icon: Shield, text: 'Secured by Razorpay' },
            { icon: BadgeCheck, text: '100% refund within 7 days' },
            { icon: Star, text: '4.8★ rated by 2,400+ members' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
              {text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
