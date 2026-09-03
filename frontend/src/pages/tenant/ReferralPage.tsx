import React, { useState, useEffect } from 'react';
import {
  Share2, Copy, Gift, Check,
  Home, MessageCircle, Lock, Star,
} from 'lucide-react';
import { tenantApi } from '../../lib/api';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReferralPageProps {
  onBack: () => void;
}

const TIERS = [
  { count: 1,  reward: 200,  label: 'First referral' },
  { count: 3,  reward: 600,  label: '3 landlords' },
  { count: 5,  reward: 1200, label: '5 landlords' },
  { count: 10, reward: 3000, label: '10 landlords' },
];

export default function ReferralPage({ onBack }: ReferralPageProps) {
  const [data, setData] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [trackPhone, setTrackPhone] = useState('');
  const [tracking, setTracking] = useState(false);
  const [showTrack, setShowTrack] = useState(false);

  const load = () => {
    Promise.all([
      tenantApi.get('/api/tenant/me'),
      tenantApi.get('/api/tenant/referral').catch(() => ({ data: { data: null } })),
    ])
      .then(([meRes, refRes]) => {
        setProfile(meRes.data.data);
        setData(refRes.data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackPhone) return;
    setTracking(true);
    try {
      await tenantApi.post('/api/tenant/referral/track', { phone: trackPhone });
      toast.success('Referral tracked!');
      setTrackPhone('');
      setShowTrack(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Could not track referral');
    } finally {
      setTracking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  const isPro = profile?.membership_tier === 'pro' || profile?.membership_tier === 'yearly';

  if (!isPro) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <header className="sticky top-0 z-30 px-5 py-3.5 flex items-center gap-3"
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <button onClick={onBack} className="btn-icon"><Home className="w-4 h-4" /></button>
          <span style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--ink)' }}>
            Refer a Landlord
          </span>
        </header>
        <div className="max-w-md mx-auto px-5 py-16 flex flex-col items-center text-center gap-5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center relative"
            style={{ background: 'var(--primary-dim)', border: '2px solid rgba(61,123,255,0.2)' }}>
            <Gift className="w-7 h-7" style={{ color: 'var(--primary)' }} />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <Lock className="w-3 h-3" style={{ color: 'var(--ink-dim)' }} />
            </div>
          </div>
          <div>
            <h2 style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.03em', color: 'var(--ink)' }}>
              Pro Members Only
            </h2>
            <p className="text-sm mt-2" style={{ color: 'var(--ink-dim)', lineHeight: 1.6 }}>
              The referral programme is exclusively available to TenantOS Pro members. Upgrade to start earning ₹200 per landlord you refer.
            </p>
          </div>
          <div className="w-full rounded-xl p-4 space-y-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {['Earn ₹200 per verified landlord referral', 'Bonus tiers up to ₹3,000', 'Real-time referral tracking dashboard'].map(b => (
              <div key={b} className="flex items-center gap-2 text-sm text-left" style={{ color: 'var(--ink-dim)' }}>
                <Star className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--primary)' }} />
                {b}
              </div>
            ))}
          </div>
          <button onClick={onBack} className="btn-primary w-full justify-center">
            Upgrade to Pro
          </button>
        </div>
      </div>
    );
  }

  const referralCode = data?.referral_code || '—';
  const referralLink = `https://tenantos.in/join?ref=${referralCode}`;
  const referralCount = data?.total_referred || 0;
  const rewardsEarned = data?.rewards_earned || 0;
  const verifiedCount = data?.verified_count || 0;
  const referrals: any[] = data?.referrals || [];

  const nextTier = TIERS.find(t => t.count > referralCount);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink).then(() => toast.success('Referral link copied!'));
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(
      `Hey! I've been using TenantOS to manage my properties — it's amazing.\n\nSign up with my link and get started: ${referralLink}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

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
        <span style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--ink)' }}>
          Refer a Landlord
        </span>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-8 space-y-6">

        {/* Hero */}
        <div
          className="rounded-xl p-6 text-center space-y-4 relative overflow-hidden animate-fade-up"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div
            aria-hidden
            style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,212,160,0.08) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          <div
            className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
            style={{ background: 'var(--accent-dim)', border: '2px solid rgba(0,212,160,0.3)' }}
          >
            <Gift className="w-7 h-7" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.03em', color: 'var(--ink)' }}>
              Earn &#8377;200 per landlord
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>
              Refer landlords to TenantOS. When they verify their first property, you both win.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: referralCount, label: 'Referred', color: 'var(--primary)' },
              { value: verifiedCount, label: 'Verified', color: 'var(--accent)' },
              { value: `₹${rewardsEarned}`, label: 'Earned', color: 'var(--warning)' },
            ].map(s => (
              <div key={s.label} className="rounded-lg py-3" style={{ background: 'var(--bg)' }}>
                <div style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 700, fontSize: '1.25rem', color: s.color }}>
                  {s.value}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--ink-dim)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Wallet balance card */}
        <div className="rounded-xl p-5 animate-fade-up delay-75"
          style={{ background: 'linear-gradient(135deg, #1a2744 0%, #1e3a5f 100%)', border: '1px solid rgba(61,123,255,0.25)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.55)' }}>
                TenantOS Wallet Balance
              </p>
              <p style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 800, fontSize: '2rem', color: '#fff', letterSpacing: '-0.03em', marginTop: 4 }}>
                ₹{rewardsEarned}
              </p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {verifiedCount} verified {verifiedCount === 1 ? 'referral' : 'referrals'} · ₹200 each
              </p>
            </div>
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <Gift className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.8)' }} />
            </div>
          </div>
          {rewardsEarned > 0 && (
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                💡 Use your wallet credits to renew Pro membership or get rent cashback
              </p>
            </div>
          )}
        </div>

        {/* Referral link */}
        <div className="card p-5 space-y-3 animate-fade-up delay-100">
          <h2 className="text-sm font-semibold" style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)' }}>
            Your Referral Link
          </h2>
          <div className="flex items-center gap-2">
            <div
              className="flex-1 px-3 py-2 rounded-lg text-xs font-mono truncate"
              style={{ background: 'var(--bg)', color: 'var(--ink-dim)', border: '1px solid var(--border)' }}
            >
              {referralLink}
            </div>
            <button onClick={handleCopy} className="btn-secondary py-2 px-3 text-xs shrink-0 flex items-center gap-1.5">
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
          </div>

          <div
            className="py-2 px-3 rounded-lg text-xs font-semibold text-center"
            style={{ background: 'var(--primary-dim)', color: 'var(--primary)', border: '1px solid rgba(61,123,255,0.15)' }}
          >
            Code: {referralCode}
          </div>

          <button
            onClick={handleWhatsApp}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{ background: '#25D366', color: '#fff' }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
          >
            <MessageCircle className="w-4 h-4" /> Share via WhatsApp
          </button>
        </div>

        {/* Reward tiers */}
        <div className="card p-5 space-y-4 animate-fade-up delay-150">
          <h2 className="text-sm font-semibold" style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)' }}>
            Reward Tiers
          </h2>
          <div className="space-y-2">
            {TIERS.map(tier => {
              const achieved = referralCount >= tier.count;
              const isNext = nextTier?.count === tier.count;
              return (
                <div
                  key={tier.count}
                  className="flex items-center gap-3 p-3 rounded-lg transition-all"
                  style={{
                    background: achieved ? 'var(--accent-dim)' : isNext ? 'var(--primary-dim)' : 'var(--bg)',
                    border: `1px solid ${achieved ? 'rgba(0,212,160,0.25)' : isNext ? 'rgba(61,123,255,0.2)' : 'var(--border)'}`,
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                    style={{
                      background: achieved ? 'var(--accent)' : isNext ? 'var(--primary)' : 'var(--border)',
                      color: achieved || isNext ? '#fff' : 'var(--ink-dim)',
                    }}
                  >
                    {achieved ? <Check className="w-4 h-4" /> : tier.count}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{tier.label}</p>
                    <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>
                      {achieved
                        ? 'Achieved!'
                        : isNext
                        ? `${tier.count - referralCount} more to unlock`
                        : `${tier.count} verified landlords`}
                    </p>
                  </div>
                  <div className="text-sm font-bold" style={{ fontFamily: 'Syne, Inter, sans-serif', color: achieved ? 'var(--accent)' : 'var(--ink-dim)' }}>
                    &#8377;{tier.reward}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Referral history */}
        <div className="card p-5 space-y-3 animate-fade-up delay-200">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)' }}>
              Referral History
            </h2>
            <button
              onClick={() => setShowTrack(v => !v)}
              className="btn-secondary py-1 px-3 text-xs"
            >
              + Track Referral
            </button>
          </div>

          {/* Quick track form */}
          {showTrack && (
            <form onSubmit={handleTrack} className="flex gap-2 p-3 rounded-lg" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <input
                type="tel" value={trackPhone}
                onChange={e => setTrackPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="Landlord's phone number" className="input flex-1 py-1.5 text-xs"
                maxLength={10} required
              />
              <button type="submit" disabled={tracking} className="btn-primary py-1.5 px-3 text-xs shrink-0">
                {tracking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Track'}
              </button>
            </form>
          )}

          {referrals.length === 0 ? (
            <div className="py-8 text-center rounded-lg" style={{ background: 'var(--bg)', border: '1px dashed var(--border)' }}>
              <Share2 className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--ink-dim)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--ink-dim)' }}>No referrals tracked yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--ink-dim)' }}>Share your link or click "+ Track Referral" above</p>
            </div>
          ) : (
            <div className="space-y-2">
              {referrals.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                      {r.referred?.name || r.referred_phone || 'Unknown'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ink-dim)' }}>
                      {new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={r.status === 'rewarded' ? 'badge-success' : r.status === 'signed_up' ? 'badge-primary' : 'badge-neutral'}>
                    {r.status === 'rewarded' ? `+₹${r.reward_amount}` : r.status === 'signed_up' ? 'Signed up' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* How it works */}
        <div
          className="rounded-xl p-5 space-y-4 animate-fade-up delay-250"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <h2 className="text-sm font-semibold" style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)' }}>
            How it works
          </h2>
          {[
            { step: '1', text: 'Share your unique referral link with a landlord you know' },
            { step: '2', text: 'They sign up and list at least one verified property on TenantOS' },
            { step: '3', text: 'You earn ₹200 credited to your TenantOS wallet instantly' },
            { step: '4', text: 'Use wallet credits to renew membership or get rent cashback' },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-start gap-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                style={{ background: 'var(--primary-dim)', color: 'var(--primary)' }}
              >
                {step}
              </div>
              <p className="text-sm" style={{ color: 'var(--ink-dim)' }}>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
