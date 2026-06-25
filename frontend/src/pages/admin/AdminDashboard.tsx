import React, { useState } from 'react';
import {
  LayoutDashboard, Users, Building2, FileText,
  IndianRupee, Wrench, Shield, LogOut, ChevronRight,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import AdminOverview     from './sections/AdminOverview';
import AdminLandlords    from './sections/AdminLandlords';
import AdminTenants      from './sections/AdminTenants';
import AdminProperties   from './sections/AdminProperties';
import AdminLeases       from './sections/AdminLeases';
import AdminPayments     from './sections/AdminPayments';
import AdminMaintenance  from './sections/AdminMaintenance';

type Section = 'overview' | 'landlords' | 'tenants' | 'properties' | 'leases' | 'payments' | 'maintenance';

const navItems: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'overview',    label: 'Overview',    icon: LayoutDashboard },
  { id: 'landlords',   label: 'Landlords',   icon: Building2 },
  { id: 'tenants',     label: 'Tenants',     icon: Users },
  { id: 'properties',  label: 'Properties',  icon: Building2 },
  { id: 'leases',      label: 'Leases',      icon: FileText },
  { id: 'payments',    label: 'Payments',    icon: IndianRupee },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
];

export default function AdminDashboard() {
  const { admin, adminLogout } = useAdmin();
  const [active, setActive]   = useState<Section>('overview');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const renderSection = () => {
    switch (active) {
      case 'overview':    return <AdminOverview />;
      case 'landlords':   return <AdminLandlords />;
      case 'tenants':     return <AdminTenants />;
      case 'properties':  return <AdminProperties />;
      case 'leases':      return <AdminLeases />;
      case 'payments':    return <AdminPayments />;
      case 'maintenance': return <AdminMaintenance />;
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
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        {renderSection()}
      </main>

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
