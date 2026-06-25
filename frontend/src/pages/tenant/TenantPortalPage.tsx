import React, { useState } from 'react';
import TenantLoginPage from './TenantLoginPage';
import TenantDashboard from './TenantDashboard';
import BrowseOnlyPage from './BrowseOnlyPage';
import MembershipPage from './MembershipPage';
import RentalPassportPage from './RentalPassportPage';
import ReferralPage from './ReferralPage';
import DepositVaultPage from './DepositVaultPage';

type TenantView =
  | 'browse'
  | 'login'
  | 'dashboard'
  | 'membership'
  | 'passport'
  | 'referral'
  | 'deposit';

interface TenantPortalPageProps {
  onBack: () => void;
  initialView?: TenantView;
}

export default function TenantPortalPage({ onBack, initialView }: TenantPortalPageProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('tenantAccessToken'));
  const [view, setView] = useState<TenantView>(() => {
    if (initialView === 'login') return 'login';
    return !!localStorage.getItem('tenantAccessToken') ? 'dashboard' : (initialView || 'browse');
  });
  const [hasNavigated, setHasNavigated] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [highlightPro, setHighlightPro] = useState(false);

  const handleSetView = (newView: TenantView) => {
    setHasNavigated(true);
    setView(newView);
  };

  // ── Membership ────────────────────────────────────────────────────────────
  if (view === 'membership') {
    return (
      <MembershipPage
        onBack={() => handleSetView(isLoggedIn ? 'dashboard' : 'browse')}
        onSuccess={() => handleSetView(isLoggedIn ? 'dashboard' : 'browse')}
        isLoggedIn={isLoggedIn}
        onRequireLogin={() => {
          setPendingAction('membership');
          handleSetView('login');
        }}
      />
    );
  }

  // ── Rental Passport ───────────────────────────────────────────────────────
  if (view === 'passport') {
    return <RentalPassportPage onBack={() => handleSetView('dashboard')} />;
  }

  // ── Referral ──────────────────────────────────────────────────────────────
  if (view === 'referral') {
    return <ReferralPage onBack={() => handleSetView('dashboard')} />;
  }

  // ── Deposit Vault ─────────────────────────────────────────────────────────
  if (view === 'deposit') {
    return <DepositVaultPage onBack={() => handleSetView('dashboard')} />;
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  if (view === 'login') {
    return (
      <TenantLoginPage
        onLogin={() => { 
          setIsLoggedIn(true); 
          if (pendingAction === 'membership') {
            setPendingAction(null);
            setHighlightPro(true);
            handleSetView('dashboard');
          } else {
            handleSetView('dashboard'); 
          }
        }}
        onBack={() => {
          if (initialView === 'login' && !hasNavigated) {
            onBack();
          } else {
            handleSetView('browse');
          }
        }}
        onBrowse={() => handleSetView('browse')}
      />
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  if (view === 'dashboard') {
    return (
      <TenantDashboard
        onLogout={() => { 
          localStorage.removeItem('tenantAccessToken');
          localStorage.removeItem('tenant');
          setIsLoggedIn(false); 
          onBack(); 
        }}
        onBack={onBack}
        onNavigate={(dest: string) => setView(dest as TenantView)}
        highlightPro={highlightPro}
        onDismissHighlight={() => setHighlightPro(false)}
      />
    );
  }

  // ── Browse (default, unauthenticated) ─────────────────────────────────────
  return (
    <BrowseOnlyPage
      onBack={onBack}
      onSignIn={() => setView('login')}
      onUpgrade={() => setView('membership')}
    />
  );
}
