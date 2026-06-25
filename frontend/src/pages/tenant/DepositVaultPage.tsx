import React, { useState, useEffect } from 'react';
import {
  Lock, Shield, Home, Clock, AlertCircle,
  CheckCircle2, ArrowRight, TrendingUp,
} from 'lucide-react';
import { tenantApi } from '../../lib/api';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface DepositVaultPageProps {
  onBack: () => void;
}

export default function DepositVaultPage({ onBack }: DepositVaultPageProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [liveInterest, setLiveInterest] = useState<number>(0);

  useEffect(() => {
    tenantApi.get('/api/tenant/deposit')
      .then(r => {
        setData(r.data.data);
        if (r.data.data?.accrued_interest) {
          setLiveInterest(r.data.data.accrued_interest);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (data?.accrued_interest) {
      const depositAmount = data?.total_deposit_held || 0;
      const apy = data?.apy_rate || 0.05;
      const incrementPerSecond = (depositAmount * apy) / (365 * 24 * 3600);
      
      if (incrementPerSecond > 0) {
        const interval = setInterval(() => {
          setLiveInterest(prev => prev + incrementPerSecond);
        }, 100); // Tick every 100ms for ultra-smooth effect
        return () => clearInterval(interval);
      }
    }
  }, [data]);

  const handleDispute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeReason.trim()) { toast.error('Please describe the dispute.'); return; }
    toast.success('Dispute raised. TenantOS mediator will contact you within 24 hours.');
    setShowDisputeModal(false);
    setDisputeReason('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  const lease = data?.active_lease || null;
  const depositAmount = data?.total_deposit_held || lease?.security_deposit || 0;
  const monthlyRent = lease?.monthly_rent || 0;
  const depositMonths = data?.deposit_months || (monthlyRent > 0 ? Math.round(depositAmount / monthlyRent) : 2);
  const fmt = (n: number) => n.toLocaleString('en-IN');

  const timelineSteps = [
    {
      key: 'received', label: 'Deposit received',
      date: lease?.start_date ? new Date(lease.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Pending',
      done: !!lease,
    },
    { key: 'verified', label: 'Landlord verified', date: lease ? 'Completed' : 'Pending', done: !!lease },
    { key: 'active', label: 'Lease active', date: lease?.status === 'active' ? 'Active' : 'Pending', done: lease?.status === 'active' },
    { key: 'notice', label: 'Move-out notice', date: 'Pending', done: false },
    { key: 'inspection', label: 'Property inspection', date: 'Pending', done: false },
    {
      key: 'refund', label: 'Deposit refunded',
      date: data?.estimated_refund_date
        ? new Date(data.estimated_refund_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Pending',
      done: false,
    },
  ];
  const projectedYield = (lease?.start_date && lease?.end_date && data?.apy_rate) 
    ? depositAmount * data.apy_rate * (Math.max(0, new Date(lease.end_date).getTime() - new Date(lease.start_date).getTime()) / (1000 * 60 * 60 * 24)) / 365
    : 0;
  const estimatedTotalRefund = depositAmount + projectedYield;

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
          Deposit Vault
        </span>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-8 space-y-5">

        {/* Vault card */}
        <div
          className="rounded-xl p-6 relative overflow-hidden animate-fade-up"
          style={{
            background: 'linear-gradient(135deg, #0F1117 0%, #0a0f1e 100%)',
            border: '1px solid rgba(61,123,255,0.3)',
            boxShadow: '0 16px 48px rgba(61,123,255,0.1)',
          }}
        >
          <div
            aria-hidden
            style={{
              position: 'absolute', top: -40, right: -40, width: 200, height: 200,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(61,123,255,0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: 'linear-gradient(90deg, var(--primary), transparent)',
            }}
          />

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--primary-dim)' }}
                >
                  <Lock className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--ink-dim)' }}>
                  Secured Escrow
                </span>
              </div>
              {depositAmount > 0 ? (
                <>
                  <div
                    style={{
                      fontFamily: 'Syne, Inter, sans-serif', fontWeight: 800,
                      fontSize: '2.25rem', letterSpacing: '-0.04em', color: 'var(--ink)',
                      lineHeight: 1,
                    }}
                  >
                    &#8377;{fmt(depositAmount)}
                  </div>
                  <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>
                    Security deposit in vault &middot; {depositMonths} month{depositMonths !== 1 ? 's' : ''} rent
                  </p>
                  {liveInterest > 0 && (
                    <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg w-max animate-fade-in shadow-sm" style={{ background: 'rgba(0, 212, 160, 0.08)', border: '1px solid rgba(0, 212, 160, 0.2)' }}>
                      <TrendingUp className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                      <span className="text-sm font-semibold" style={{ color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
                        + &#8377;{liveInterest.toFixed(6)} <span className="text-xs opacity-80 font-normal">earned at {(data?.apy_rate * 100).toFixed(1)}% APY</span>
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ color: 'var(--ink-dim)', fontSize: '1rem', fontWeight: 500 }}>
                  No active deposit
                </div>
              )}
            </div>
            <div
              className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5"
              style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)' }}
              />
              Protected
            </div>
          </div>

          <div
            className="mt-5 pt-4 grid grid-cols-2 gap-4 text-xs"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div>
              <p style={{ color: 'var(--ink-dim)' }}>Property</p>
              <p className="font-medium mt-0.5" style={{ color: 'var(--ink)' }}>
                {lease?.unit?.property?.name || '—'}{lease?.unit?.unit_number ? ` · ${lease.unit.unit_number}` : ''}
              </p>
            </div>
            <div>
              <p style={{ color: 'var(--ink-dim)' }}>Landlord</p>
              <p className="font-medium mt-0.5" style={{ color: 'var(--ink)' }}>
                {lease?.unit?.property?.landlord?.name || '—'}
              </p>
            </div>
            <div>
              <p style={{ color: 'var(--ink-dim)' }}>Lease start</p>
              <p className="font-medium mt-0.5" style={{ color: 'var(--ink)' }}>
                {lease?.start_date
                  ? new Date(lease.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'}
              </p>
            </div>
            <div>
              <p style={{ color: 'var(--ink-dim)' }}>Lease end</p>
              <p className="font-medium mt-0.5" style={{ color: 'var(--ink)' }}>
                {lease?.end_date
                  ? new Date(lease.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'}
              </p>
            </div>
            {projectedYield > 0 && (
              <>
                <div>
                  <p style={{ color: 'var(--ink-dim)' }}>Yield (At end)</p>
                  <p className="font-medium mt-0.5" style={{ color: 'var(--accent)' }}>
                    + &#8377;{fmt(Math.round(projectedYield))}
                  </p>
                </div>
                <div>
                  <p style={{ color: 'var(--ink-dim)' }}>Est. Total Refund</p>
                  <p className="font-medium mt-0.5" style={{ color: 'var(--ink)' }}>
                    &#8377;{fmt(Math.round(estimatedTotalRefund))}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* No lease state */}
        {!lease && (
          <div
            className="rounded-xl p-5 flex items-start gap-3 animate-fade-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--ink-dim)' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>No active lease</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-dim)' }}>
                Your deposit vault will be active once you have a confirmed lease through TenantOS.
              </p>
            </div>
          </div>
        )}

        {/* How vault works */}
        <div
          className="rounded-xl p-4 flex items-start gap-3 animate-fade-up delay-50"
          style={{ background: 'var(--primary-dim)', border: '1px solid rgba(61,123,255,0.15)' }}
        >
          <Shield className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--ink)' }}>
            Your deposit is held in a regulated escrow account by TenantOS. It is{' '}
            <strong>never accessible to your landlord</strong> during the lease.
            On lease end, it is refunded within 7 working days after inspection clearance.
          </p>
        </div>

        {/* Refund timeline */}
        <div className="card p-5 space-y-5 animate-fade-up delay-100">
          <h2 className="text-sm font-semibold" style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)' }}>
            Refund Timeline
          </h2>
          <div className="relative">
            <div
              style={{
                position: 'absolute', left: 11, top: 0, bottom: 0,
                width: 2, background: 'var(--border)',
              }}
            />
            <div className="space-y-4">
              {timelineSteps.map((step, i) => (
                <div
                  key={step.key}
                  className="flex items-start gap-4 animate-fade-up"
                  style={{ animationDelay: `${100 + i * 80}ms` }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 relative z-10"
                    style={{
                      background: step.done ? 'var(--accent)' : 'var(--border)',
                      boxShadow: step.done ? '0 0 8px rgba(0,212,160,0.4)' : 'none',
                      transition: 'background 0.3s, box-shadow 0.3s',
                    }}
                  >
                    {step.done
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                      : <Clock className="w-3 h-3" style={{ color: 'var(--ink-dim)' }} />
                    }
                  </div>
                  <div className="pt-0.5">
                    <p className="text-sm font-medium" style={{ color: step.done ? 'var(--ink)' : 'var(--ink-dim)' }}>
                      {step.label}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ink-dim)' }}>
                      {step.date}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Past leases */}
        {data?.past_leases?.length > 0 && (
          <div className="card p-5 space-y-3 animate-fade-up delay-150">
            <h2 className="text-sm font-semibold" style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)' }}>
              Past Deposits
            </h2>
            <div className="space-y-2">
              {data.past_leases.map((pl: any, i: number) => (
                <div
                  key={pl.id || i}
                  className="flex items-center justify-between py-2 text-sm"
                  style={{ borderBottom: i < data.past_leases.length - 1 ? '1px solid var(--border)' : 'none' }}
                >
                  <div>
                    <p style={{ color: 'var(--ink)' }}>
                      {pl.unit?.property?.name || 'Property'} &middot; {pl.unit?.unit_number || '—'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>
                      {pl.start_date ? new Date(pl.start_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}
                      {' – '}
                      {pl.end_date ? new Date(pl.end_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold" style={{ color: 'var(--ink)' }}>&#8377;{fmt(pl.security_deposit || 0)}</p>
                    <p className="text-xs" style={{ color: 'var(--accent)' }}>Refunded</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Raise dispute */}
        {lease && (
          <button
            onClick={() => setShowDisputeModal(true)}
            className="w-full flex items-center justify-between p-4 rounded-lg transition-all animate-fade-up delay-200"
            style={{ background: 'var(--danger-dim)', border: '1px solid rgba(255,77,109,0.2)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,77,109,0.15)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--danger-dim)'; }}
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-4 h-4" style={{ color: 'var(--danger)' }} />
              <div className="text-left">
                <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>Raise a Deposit Dispute</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--ink-dim)' }}>
                  If landlord refuses to return your deposit
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 shrink-0" style={{ color: 'var(--danger)' }} />
          </button>
        )}
      </div>

      {/* Dispute modal */}
      {showDisputeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowDisputeModal(false); }}
        >
          <div
            className="w-full max-w-md p-6 space-y-5 animate-modal-pop"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}
          >
            <div>
              <h3 style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 700, fontSize: '1.125rem', color: 'var(--ink)' }}>
                Raise Deposit Dispute
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--ink-dim)' }}>
                A TenantOS mediator will review and contact both parties within 24 hours.
              </p>
            </div>
            <form onSubmit={handleDispute} className="space-y-4">
              <div>
                <label className="input-label">Describe the issue</label>
                <textarea
                  value={disputeReason}
                  onChange={e => setDisputeReason(e.target.value)}
                  placeholder="e.g. Landlord has not returned deposit despite lease ending 30 days ago..."
                  rows={4}
                  className="input resize-none"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowDisputeModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-danger flex-1">
                  Submit Dispute
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
