import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from './context/AuthContext';
import { AdminProvider, useAdmin } from './context/AdminContext';
import AdminLoginPage   from './pages/admin/AdminLoginPage';
import AdminDashboard   from './pages/admin/AdminDashboard';
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  IndianRupee,
  Wrench,
  BarChart3,
  LogOut,
  Menu,
  X,
  CreditCard
} from 'lucide-react';

import LoginPage from './pages/auth/LoginPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import NotificationBell from './components/NotificationBell';
import { CommandPalette } from './components/CommandPalette';
import LandingPage from './pages/landing/LandingPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import PropertiesPage from './pages/properties/PropertiesPage';
import TenantsPage from './pages/tenants/TenantsPage';
import LeasesPage from './pages/leases/LeasesPage';
import RentPage from './pages/rent/RentPage';
import MaintenancePage from './pages/maintenance/MaintenancePage';
import ReportsPage from './pages/reports/ReportsPage';
import TenantPortalPage from './pages/tenant/TenantPortalPage';
import ListingWizardPage from './pages/landlord/ListingWizardPage';
import SubscriptionPage from './pages/landlord/SubscriptionPage';
import ApplicationsPage from './pages/dashboard/ApplicationsPage';

type ViewState = 'landing' | 'login' | 'dashboard' | 'tenant-portal' | 'tenant-login' | 'list-property' | 'register';

/* ── T-monogram logotype ───────────────────────────────────────────────── */
function TenantOSMark({ size = 28 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: 'var(--primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 12px var(--primary-glow)',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontFamily: 'Syne, Inter, sans-serif',
          fontWeight: 800,
          fontSize: size * 0.5,
          color: '#fff',
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}
      >
        T
      </span>
    </div>
  );
}

function AdminGate() {
  const { admin } = useAdmin();
  return admin ? <AdminDashboard /> : <AdminLoginPage />;
}

export default function App() {
  const { t } = useTranslation();
  const location = useLocation();
  const { loggedIn, logout } = useAuth();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Secret admin console — accessible only via /console URL or Shift+Ctrl+A
  if (location.pathname === '/console') {
    return (
      <AdminProvider>
        <AdminGate />
      </AdminProvider>
    );
  }
  const [viewState, setViewState] = useState<ViewState>(() => {
    if (loggedIn) return 'dashboard';
    if (location.pathname === '/') return 'landing';
    return 'landing';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Sync root path back to landing page
  useEffect(() => {
    if (location.pathname === '/') {
      if (loggedIn) {
        setViewState('dashboard');
      } else if (localStorage.getItem('tenantAccessToken')) {
        setViewState('tenant-portal');
      } else {
        setViewState('landing');
      }
    }
  }, [location.pathname, loggedIn]);

  useEffect(() => {
    if (loggedIn && viewState === 'login') {
      setViewState('dashboard');
    } else if (!loggedIn && viewState !== 'landing' && viewState !== 'login' && viewState !== 'tenant-portal' && viewState !== 'tenant-login' && viewState !== 'register') {
      setViewState('landing');
    }
  }, [loggedIn, viewState]);

  const navItems = [
    { path: '/dashboard',   label: t('nav.dashboard'),   icon: LayoutDashboard },
    { path: '/properties',  label: t('nav.properties'),  icon: Building2 },
    { path: '/applications',label: 'Applications',       icon: FileText },
    { path: '/tenants',     label: t('nav.tenants'),     icon: Users },
    { path: '/leases',      label: t('nav.leases'),      icon: FileText },
    { path: '/rent',        label: t('nav.rent'),        icon: IndianRupee },
    { path: '/maintenance', label: t('nav.maintenance'), icon: Wrench },
    { path: '/reports',     label: t('nav.reports'),     icon: BarChart3 },
    { path: '/subscription',label: 'Upgrade',            icon: CreditCard },
  ];

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    setShowLogoutConfirm(false);
    setViewState('landing');
  };

  /* ── Tenant portal ─────────────────────────────────────────────────────── */
  if (viewState === 'tenant-portal') {
    return <TenantPortalPage onBack={() => setViewState('landing')} />;
  }

  if (viewState === 'tenant-login') {
    return <TenantPortalPage onBack={() => setViewState('landing')} initialView="login" />;
  }

  /* ── List property wizard ───────────────────────────────────────────────── */
  if (viewState === 'list-property') {
    return (
      <ListingWizardPage
        onBack={() => setViewState('dashboard')}
        onSuccess={() => setViewState('dashboard')}
      />
    );
  }

  /* ── Password reset (public, no auth required) ─────────────────────────── */
  if (location.pathname === '/reset-password') {
    return <ResetPasswordPage />;
  }

  /* ── Landing ───────────────────────────────────────────────────────────── */
  if (viewState === 'landing') {
    return (
      <LandingPage
        onLandlordLogin={() => setViewState('login')}
        onTenantLogin={() => setViewState('tenant-login')}
      />
    );
  }

  /* ── Landlord login & register ──────────────────────────────────────────── */
  if (viewState === 'login' || viewState === 'register') {
    return (
      <LoginPage
        onLogin={() => setViewState('dashboard')}
        onBackToHome={() => setViewState('landing')}
        initialView={viewState === 'register' ? 'register' : 'login'}
      />
    );
  }

  /* ── Landlord dashboard ─────────────────────────────────────────────────── */
  return (
    <div
      className="min-h-screen flex flex-col md:flex-row animate-fade-in"
      style={{ background: 'var(--bg)' }}
    >
      {/* ── Sidebar — Desktop ──────────────────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col w-60 shrink-0"
        style={{
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 px-4 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <TenantOSMark size={30} />
          <span
            style={{
              fontFamily: 'Syne, Inter, sans-serif',
              fontWeight: 700,
              fontSize: '0.9375rem',
              color: 'var(--ink)',
              letterSpacing: '-0.02em',
              flex: 1,
            }}
          >
            TenantOS
          </span>
          <NotificationBell />
        </div>

        {/* Quick Search Ctrl+K trigger */}
        <div className="px-3 pt-3">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[rgba(232,234,240,0.04)] border border-[var(--border)] text-xs text-[var(--ink-dim)] hover:border-[var(--primary)] hover:text-[var(--ink)] transition-all"
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
              Quick Search...
            </span>
            <kbd className="font-mono bg-[var(--surface)] px-1.5 py-0.5 rounded text-[10px] border border-[var(--border)]">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 p-3 flex-1">
          {navItems.map((item, i) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={isActive ? 'nav-item-active' : 'nav-item'}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* List a property CTA */}
        <div className="px-3 pb-2">
          <button
            onClick={() => setViewState('list-property')}
            className="btn-primary w-full justify-center py-2 text-xs"
          >
            + List a Property
          </button>
        </div>

        {/* Logout */}
        <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-sm font-medium transition-all duration-150"
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
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* ── Mobile Top Header ─────────────────────────────────────────────── */}
      <header
        className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-30"
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <TenantOSMark size={28} />
          <span
            style={{
              fontFamily: 'Syne, Inter, sans-serif',
              fontWeight: 700,
              fontSize: '0.875rem',
              color: 'var(--ink)',
              letterSpacing: '-0.02em',
            }}
          >
            TenantOS
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg transition-all duration-150"
          style={{ color: 'var(--ink-dim)' }}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen
            ? <X className="w-5 h-5" />
            : <Menu className="w-5 h-5" />
          }
        </button>
      </header>

      {/* ── Mobile Drawer ─────────────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 top-[49px] z-20 md:hidden flex flex-col p-3 animate-slide-down"
          style={{ background: 'var(--surface)', backdropFilter: 'blur(16px)' }}
        >
          <nav className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={isActive ? 'nav-item-active' : 'nav-item'}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
            <div className="pt-2 mt-1" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-sm font-medium transition-all duration-150 text-left"
                style={{ color: 'var(--ink-dim)' }}
              >
                <LogOut className="w-4 h-4" />
                {t('nav.logout')}
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main
        className="flex-1 overflow-y-auto p-5 md:p-8 max-w-7xl w-full mx-auto pb-20 md:pb-8"
      >
        <Routes>
          <Route path="/"            element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"   element={<DashboardPage />} />
          <Route path="/properties"  element={<PropertiesPage onListProperty={() => setViewState('list-property')} />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/tenants"     element={<TenantsPage />} />
          <Route path="/leases"      element={<LeasesPage />} />
          <Route path="/rent"        element={<RentPage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/reports"     element={<ReportsPage />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="*"            element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>

      {/* ── Mobile Bottom Nav ─────────────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 md:hidden flex justify-around py-1 z-10"
        style={{
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={isActive ? 'bottom-nav-item-active' : 'bottom-nav-item'}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Logout Confirm Modal ────────────────────────────────────────── */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in" onClick={() => setShowLogoutConfirm(false)}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-sm overflow-hidden shadow-xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-[rgba(239,68,68,0.1)] flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-6 h-6 text-[var(--danger)]" />
              </div>
              <h3 className="text-lg font-bold text-[var(--ink)] mb-2">Sign Out</h3>
              <p className="text-sm text-[var(--ink-dim)]">Are you sure you want to sign out of your account?</p>
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
                onClick={handleLogout}
                className="flex-1 p-3 text-sm font-bold text-[var(--danger)] hover:bg-[rgba(239,68,68,0.05)] transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Command Palette (Ctrl+K) ────────────────────────────────────────── */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  );
}
