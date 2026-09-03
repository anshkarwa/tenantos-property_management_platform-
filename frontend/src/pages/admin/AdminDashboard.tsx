import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Users, Building2, FileText,
  IndianRupee, Wrench, Shield, LogOut, ChevronRight,
  Bell, ShieldAlert, Clock,
} from 'lucide-react';
import { useAdmin, adminApi } from '../../context/AdminContext';
import AdminOverview     from './sections/AdminOverview';
import AdminLandlords    from './sections/AdminLandlords';
import AdminTenants      from './sections/AdminTenants';
import AdminProperties   from './sections/AdminProperties';
import AdminLeases       from './sections/AdminLeases';
import AdminPayments     from './sections/AdminPayments';
import AdminMaintenance  from './sections/AdminMaintenance';
import AdminKYCReview    from './sections/AdminKYCReview';

type Section = 'overview' | 'landlords' | 'tenants' | 'properties' | 'leases' | 'payments' | 'maintenance' | 'kyc';

const navItems: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'overview',    label: 'Overview',    icon: LayoutDashboard },
  { id: 'landlords',   label: 'Landlords',   icon: Building2 },
  { id: 'tenants',     label: 'Tenants',     icon: Users },
  { id: 'properties',  label: 'Properties',  icon: Building2 },
  { id: 'leases',      label: 'Leases',      icon: FileText },
  { id: 'payments',    label: 'Payments',    icon: IndianRupee },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'kyc',         label: 'KYC Review',  icon: Shield },
];

interface PendingCounts {
  kyc: number;
  police: number;
}

export default function AdminDashboard() {
  const { admin, adminLogout } = useAdmin();
  const [active, setActive]   = useState<Section>('overview');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [pending, setPending] = useState<PendingCounts>({ kyc: 0, police: 0 });
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchPending = async () => {
    try {
      const [kycRes, policeRes] = await Promise.all([
        adminApi.get('/api/admin/kyc-reviews'),
        adminApi.get('/api/admin/police-reviews'),
      ]);
      setPending({
        kyc:    (kycRes.data.data   || []).length,
        police: (policeRes.data.data || []).length,
      });
    } catch {
      // silently ignore — admin may not be logged in yet
    }
  };

  // Poll every 60 s
  useEffect(() => {
    fetchPending();
    const id = setInterval(fetchPending, 60_000);
    return () => clearInterval(id);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const totalPending = pending.kyc + pending.police;

  const renderSection = () => {
    switch (active) {
      case 'overview':    return <AdminOverview />;
      case 'landlords':   return <AdminLandlords />;
      case 'tenants':     return <AdminTenants />;
      case 'properties':  return <AdminProperties />;
      case 'leases':      return <AdminLeases />;
      case 'payments':    return <AdminPayments />;
      case 'maintenance': return <AdminMaintenance />;
      case 'kyc':         return <AdminKYCReview />;
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside
        className="w-56 shrink-0 flex flex-col"
        style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
      >
        {/* Logo */}
        <div
          className="px-4 py-4 flex items-center gap-2.5"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'var(--danger-dim)',
              border: '1px solid rgba(255,77,109,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 10px rgba(255,77,109,0.2)',
            }}
          >
            <Shield className="w-3.5 h-3.5" style={{ color: 'var(--danger)' }} />
          </div>
          <div>
            <div
              style={{
                fontFamily: 'Syne, Inter, sans-serif',
                fontWeight: 700, fontSize: '0.8125rem',
                color: 'var(--ink)', letterSpacing: '-0.02em', lineHeight: 1.2,
              }}
            >
              TenantOS
            </div>
            <div
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--danger)', fontSize: '0.5625rem' }}
            >
              Admin Console
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2.5 flex flex-col gap-0.5">
          {navItems.map(({ id, label, icon: Icon }) => {
            const isActive = active === id;
            const isKyc    = id === 'kyc';
            const badge    = isKyc ? totalPending : 0;
            return (
              <button
                key={id}
                onClick={() => setActive(id)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium w-full text-left transition-all duration-150"
                style={{
                  background: isActive ? 'var(--danger-dim)' : 'transparent',
                  color:      isActive ? 'var(--danger)'     : 'var(--ink-dim)',
                  border:     isActive ? '1px solid rgba(255,77,109,0.2)' : '1px solid transparent',
                }}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
                {badge > 0 && !isActive && (
                  <span
                    className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse"
                    style={{ background: 'var(--danger)', color: '#fff', minWidth: 18, textAlign: 'center' }}
                  >
                    {badge}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
              </button>
            );
          })}
        </nav>

        {/* Admin user + logout */}
        <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="px-3 py-2 mb-1">
            <div className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>
              {admin?.name}
            </div>
            <div className="text-xs" style={{ color: 'var(--ink-dim)' }}>
              {admin?.email}
            </div>
          </div>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-sm font-medium transition-all duration-150"
            style={{ color: 'var(--ink-dim)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--danger-dim)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-dim)';
            }}
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Top bar with notification bell ─────────────────────────────── */}
        <header
          className="flex items-center justify-end px-6 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
        >
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotif(v => !v)}
              className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-150"
              style={{
                background: showNotif ? 'var(--danger-dim)' : 'transparent',
                border: '1px solid',
                borderColor: showNotif ? 'rgba(255,77,109,0.3)' : 'var(--border)',
                color: totalPending > 0 ? 'var(--danger)' : 'var(--ink-dim)',
              }}
              title="Pending review notifications"
            >
              <Bell className={`w-4 h-4 ${totalPending > 0 ? 'animate-[wiggle_1s_ease-in-out_infinite]' : ''}`} />
              {totalPending > 0 && (
                <span
                  className="absolute -top-1 -right-1 flex items-center justify-center text-[10px] font-bold rounded-full"
                  style={{
                    background: 'var(--danger)', color: '#fff',
                    minWidth: 16, height: 16, padding: '0 3px',
                  }}
                >
                  {totalPending}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {showNotif && (
              <div
                className="absolute right-0 mt-2 w-72 rounded-xl shadow-2xl z-50 overflow-hidden animate-scale-in"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', transformOrigin: 'top right' }}
              >
                <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                  <p className="text-xs font-bold" style={{ color: 'var(--ink)' }}>Pending Reviews</p>
                  {totalPending === 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                      All clear ✓
                    </span>
                  )}
                </div>

                <div className="p-2 space-y-1.5">
                  {/* KYC row */}
                  <button
                    onClick={() => { setActive('kyc'); setShowNotif(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all"
                    style={{ background: pending.kyc > 0 ? 'rgba(255,77,109,0.06)' : 'transparent' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,77,109,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = pending.kyc > 0 ? 'rgba(255,77,109,0.06)' : 'transparent')}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: pending.kyc > 0 ? 'rgba(255,77,109,0.1)' : 'var(--border)' }}
                    >
                      <Shield className="w-4 h-4" style={{ color: pending.kyc > 0 ? 'var(--danger)' : 'var(--ink-dim)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>Aadhaar KYC</p>
                      <p className="text-[10px] mt-0.5" style={{ color: pending.kyc > 0 ? 'var(--danger)' : 'var(--ink-dim)' }}>
                        {pending.kyc > 0 ? `${pending.kyc} pending · verify within 24 hrs` : 'No pending submissions'}
                      </p>
                    </div>
                    {pending.kyc > 0 && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: 'var(--danger)', color: '#fff' }}
                      >
                        {pending.kyc}
                      </span>
                    )}
                  </button>

                  {/* Police row */}
                  <button
                    onClick={() => { setActive('kyc'); setShowNotif(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all"
                    style={{ background: pending.police > 0 ? 'rgba(245,158,11,0.06)' : 'transparent' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,158,11,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = pending.police > 0 ? 'rgba(245,158,11,0.06)' : 'transparent')}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: pending.police > 0 ? 'rgba(245,158,11,0.1)' : 'var(--border)' }}
                    >
                      <ShieldAlert className="w-4 h-4" style={{ color: pending.police > 0 ? '#f59e0b' : 'var(--ink-dim)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>Police Verification</p>
                      <p className="text-[10px] mt-0.5" style={{ color: pending.police > 0 ? '#f59e0b' : 'var(--ink-dim)' }}>
                        {pending.police > 0 ? `${pending.police} pending · process within 7 days` : 'No pending requests'}
                      </p>
                    </div>
                    {pending.police > 0 && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: '#f59e0b', color: '#fff' }}
                      >
                        {pending.police}
                      </span>
                    )}
                  </button>
                </div>

                {totalPending > 0 && (
                  <div className="px-3 pb-3">
                    <button
                      onClick={() => { setActive('kyc'); setShowNotif(false); }}
                      className="w-full py-2 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: 'var(--danger)', color: '#fff' }}
                    >
                      Go to KYC Review →
                    </button>
                  </div>
                )}

                <div className="px-4 py-2 flex items-center gap-1.5" style={{ borderTop: '1px solid var(--border)' }}>
                  <Clock className="w-3 h-3" style={{ color: 'var(--ink-dim)' }} />
                  <p className="text-[10px]" style={{ color: 'var(--ink-dim)' }}>Auto-refreshes every 60 seconds</p>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {renderSection()}
        </main>
      </div>

      {/* ── Logout Confirm Modal ────────────────────────────────────────── */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in" onClick={() => setShowLogoutConfirm(false)}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-sm overflow-hidden shadow-xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-[rgba(239,68,68,0.1)] flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-6 h-6 text-[var(--danger)]" />
              </div>
              <h3 className="text-lg font-bold text-[var(--ink)] mb-2">Sign Out</h3>
              <p className="text-sm text-[var(--ink-dim)]">Are you sure you want to sign out of the Admin Console?</p>
            </div>
            <div className="flex border-t border-[var(--border)]">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 p-3 text-sm font-medium text-[var(--ink-dim)] hover:bg-[rgba(232,234,240,0.05)] transition-colors"
              >
                Cancel
              </button>
              <div className="w-[1px] bg-[var(--border)]" />
              <button
                onClick={adminLogout}
                className="flex-1 p-3 text-sm font-bold text-[var(--danger)] hover:bg-[rgba(239,68,68,0.05)] transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

