import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search, Home, FileText, IndianRupee, Wrench, User,
  LogOut, Building2, MapPin, Maximize2, Calendar,
  CheckCircle2, AlertTriangle, X, ArrowRight, Download,
  Plus, Car, Zap, Shield, Dumbbell, Wifi, AirVent,
  Droplets, Phone, ShieldCheck, ShieldAlert, Menu,
  Star, Lock, Gift, Sparkles, Loader2,
} from 'lucide-react';
import { tenantApi } from '../../lib/api';
import { formatINR, formatDate } from '../../utils/format';
import toast from 'react-hot-toast';
import RentPaymentFlow from './RentPaymentFlow';
import RentReceipts from './RentReceipts';
import TokenPaymentFlow from './TokenPaymentFlow';

// ── Types ────────────────────────────────────────────────────────────────────
interface TenantProfile {
  id: string; name: string; phone: string; email: string | null;
  aadhaar_verified: boolean; pan: string | null; profession: string | null;
  police_verification_status: string; created_at: string;
  active_lease: ActiveLease | null;
}
interface ActiveLease {
  id: string; start_date: string; end_date: string;
  monthly_rent: number; security_deposit: number;
  rent_due_day: number; status: string;
  unit: {
    id: string; unit_number: string; unit_type: string;
    property: { id: string; name: string; city: string; landlord: { name: string; phone: string } };
  };
}
interface RealListing {
  id: string; unit_number: string; unit_type: string; furnishing: string;
  monthly_rent: number; security_deposit: number;
  area_sqft: number | null; floor: number | null;
  available_from: string | null; tags: string[]; description: string | null;
  preferred_tenant: string[]; photo_urls: string[];
  property: { name: string; city: string; state: string; address_line1: string; amenities: Record<string, boolean> };
}
interface TenantApplication {
  id: string; status: string; visit_date: string | null; created_at: string;
  unit: {
    unit_number: string; unit_type: string; monthly_rent: number;
    property: { name: string; city: string; address_line1: string };
  };
  message?: string;
}
interface Payment {
  id: string; due_date: string; amount_due: number; amount_paid: number | null;
  status: string; paid_at: string | null; payment_method: string | null;
  receipt_number: string | null; is_overdue: boolean; notes?: string;
}
interface MaintRequest {
  id: string; title: string; description: string | null;
  category: string; priority: string; status: string;
  created_at: string; resolved_at: string | null;
  unit: { unit_number: string };
  vendor: { name: string; phone: string; rating: number | null } | null;
}

type Section = 'browse' | 'applications' | 'lease' | 'maintenance' | 'profile';

interface TenantDashboardProps {
  onLogout: () => void;
  onBack: () => void;
  onNavigate?: (dest: string) => void;
  highlightPro?: boolean;
  onDismissHighlight?: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatUnitType(t: string) {
  if (t === 'pg') return 'PG / Room';
  if (t === 'studio') return 'Studio';
  return t.toUpperCase();
}
function formatFurnishing(f: string) {
  if (f === 'semi') return 'Semi-Furnished';
  if (f === 'furnished') return 'Furnished';
  return 'Unfurnished';
}
function formatAvailability(date: string | null) {
  if (!date) return 'Available Now';
  const d = new Date(date);
  if (d <= new Date()) return 'Available Now';
  return `From ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
}
function monthLabel(due_date: string) {
  return new Date(due_date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

const AMENITY_ICONS: Record<string, { icon: React.FC<any>; label: string }> = {
  parking:   { icon: Car,       label: 'Parking' },
  lift:      { icon: Building2, label: 'Lift' },
  generator: { icon: Zap,       label: 'Power Backup' },
  security:  { icon: Shield,    label: '24hr Security' },
  gym:       { icon: Dumbbell,  label: 'Gym' },
  wifi:      { icon: Wifi,      label: 'WiFi' },
  ac:        { icon: AirVent,   label: 'AC' },
  water_24h: { icon: Droplets,  label: '24hr Water' },
};

const APP_STATUS: Record<string, { label: string; className: string }> = {
  pending:   { label: 'Pending',         className: 'badge-neutral' },
  viewed:    { label: 'Viewed',          className: 'badge-info' },
  scheduled: { label: 'Visit Scheduled', className: 'badge-success' },
  rejected:  { label: 'Not Selected',    className: 'badge-danger' },
  accepted:  { label: 'Accepted',        className: 'badge-success' },
};

const MAINT_STATUS: Record<string, { label: string; cls: string }> = {
  open:         { label: 'Open',         cls: 'badge-danger' },
  acknowledged: { label: 'Acknowledged', cls: 'badge-warning' },
  in_progress:  { label: 'In Progress',  cls: 'badge-warning' },
  resolved:     { label: 'Resolved',     cls: 'badge-success' },
};

// ── Skeleton helpers ─────────────────────────────────────────────────────────
function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-3">
      <div className="h-4 w-40 skeleton rounded" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-3 skeleton rounded ${i === lines - 1 ? 'w-3/4' : 'w-full'}`} />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TenantDashboard({ onLogout, onBack, onNavigate, highlightPro, onDismissHighlight }: TenantDashboardProps) {
  const [section, setSection] = useState<Section>('browse');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [profile, setProfile] = useState<TenantProfile | null>(null);

  const refreshProfile = () => {
    tenantApi.get('/api/tenant/me')
      .then(r => setProfile(r.data.data))
      .catch(() => {});
  };

  useEffect(() => { refreshProfile(); }, []);

  const initials = profile ? profile.name.split(' ').map((n: string) => n[0]).join('') : '…';
  const city = profile?.active_lease?.unit.property.city || '';

  const navItems: { id: Section; label: string; icon: React.FC<any> }[] = [
    { id: 'browse',       label: 'Browse Listings', icon: Search },
    { id: 'applications', label: 'My Applications', icon: FileText },
    { id: 'lease',        label: 'Lease & Rent',    icon: IndianRupee },
    { id: 'maintenance',  label: 'Maintenance',      icon: Wrench },
    { id: 'profile',      label: 'Profile & KYC',   icon: User },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-[var(--bg)] border-r border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2 px-4 py-4 border-b border-[var(--border)]">
          <div className="w-7 h-7 rounded-md bg-[var(--primary)] flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-[var(--ink)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--ink)] leading-none">TenantOS</p>
            <p className="text-[10px] text-[var(--ink-dim)] mt-0.5">Tenant Portal</p>
          </div>
        </div>

        <div className="px-3 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5 px-2 py-2 bg-[var(--surface)] rounded-lg">
            <div className="w-7 h-7 rounded-md bg-[rgba(232,234,240,0.1)] flex items-center justify-center text-xs font-semibold text-[var(--ink-dim)] shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--ink)] truncate">{profile?.name || '—'}</p>
              <p className="text-[10px] text-[var(--ink-dim)] truncate">{city || 'Tenant'}</p>
            </div>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 p-3 flex-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setSection(id)}
              className={section === id ? 'nav-item-active w-full text-left' : 'nav-item w-full text-left'}>
              <Icon className="w-4 h-4 shrink-0" />{label}
            </button>
          ))}

          <div className="my-2 border-t border-[var(--border)] mx-1" />

          {onNavigate && [
            { label: 'Rental Passport', icon: Star,     dest: 'passport' },
            { label: 'Deposit Vault',   icon: Lock,     dest: 'deposit' },
            { label: 'Refer a Landlord',icon: Gift,     dest: 'referral' },
            { label: 'Upgrade to Pro',  icon: Sparkles, dest: 'membership' },
          ].map(({ label, icon: Icon, dest }) => (
            <button key={dest} onClick={() => onNavigate(dest)}
              className="nav-item w-full text-left">
              <Icon className="w-4 h-4 shrink-0" />{label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-[var(--border)] space-y-1">
          <button onClick={() => setShowLogoutConfirm(true)} className="flex items-center gap-2.5 px-3 py-2 w-full rounded-md text-sm font-medium text-[var(--ink-dim)] hover:bg-[rgba(232,234,240,0.06)] hover:text-[var(--danger)] transition-colors">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden sticky top-0 z-30 bg-[var(--bg)] border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[var(--primary)] flex items-center justify-center">
            <Building2 className="w-4 h-4 text-[var(--ink)]" />
          </div>
          <span className="text-sm font-semibold text-[var(--ink)]">{navItems.find(n => n.id === section)?.label ?? 'Portal'}</span>
        </div>
        <button onClick={() => setMobileNavOpen(true)} className="btn-icon"><Menu className="w-5 h-5" /></button>
      </header>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 bg-black/70 md:hidden animate-fade-in" onClick={() => setMobileNavOpen(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-[var(--bg)] border-l border-[var(--border)] p-4 flex flex-col gap-4 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--ink)]">Navigation</span>
              <button onClick={() => setMobileNavOpen(false)} className="btn-icon"><X className="w-4 h-4" /></button>
            </div>
            <nav className="flex flex-col gap-0.5">
              {navItems.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => { setSection(id); setMobileNavOpen(false); }}
                  className={section === id ? 'nav-item-active w-full text-left' : 'nav-item w-full text-left'}>
                  <Icon className="w-4 h-4 shrink-0" />{label}
                </button>
              ))}

              <div className="my-2 border-t border-[var(--border)] mx-1" />

              {onNavigate && [
                { label: 'Rental Passport', icon: Star,     dest: 'passport' },
                { label: 'Deposit Vault',   icon: Lock,     dest: 'deposit' },
                { label: 'Refer a Landlord',icon: Gift,     dest: 'referral' },
                { label: 'Upgrade to Pro',  icon: Sparkles, dest: 'membership' },
              ].map(({ label, icon: Icon, dest }) => (
                <button key={dest} onClick={() => { setMobileNavOpen(false); onNavigate(dest); }}
                  className="nav-item w-full text-left">
                  <Icon className="w-4 h-4 shrink-0" />{label}
                </button>
              ))}
            </nav>
            <div className="mt-auto border-t border-[var(--border)] pt-3 space-y-1">
              <button onClick={() => setShowLogoutConfirm(true)} className="flex items-center gap-2.5 px-3 py-2 w-full rounded-md text-sm text-[var(--ink-dim)] hover:bg-[rgba(232,234,240,0.06)] hover:text-[var(--danger)] transition-colors">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 overflow-y-auto relative pb-16 md:pb-0">
        {highlightPro && (
          <div className="absolute top-4 inset-x-4 md:top-8 md:inset-x-8 z-10 animate-fade-in">
            <div className="bg-[var(--surface)] border-[1.5px] border-[var(--primary)] rounded-xl p-4 shadow-[0_8px_30px_rgba(61,123,255,0.15)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-[rgba(61,123,255,0.1)] flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-[var(--primary)]" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--ink)]">Complete your Pro Upgrade</h3>
                  <p className="text-sm text-[var(--ink-dim)] mt-0.5">Unlock zero-deposit rentals and direct landlord chat.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button onClick={onDismissHighlight} className="text-xs font-medium text-[var(--ink-dim)] hover:text-[var(--ink)]">Dismiss</button>
                <button onClick={() => onNavigate && onNavigate('membership')} className="btn-primary animate-pulse-slow">
                  Upgrade Now <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
        <div className={highlightPro ? 'pt-28' : ''}>
          {section === 'browse'       && <BrowseSection profile={profile} />}
          {section === 'applications' && <ApplicationsSection />}
          {section === 'lease'        && <LeaseSection profile={profile} />}
          {section === 'maintenance'  && <MaintenanceSection profile={profile} />}
          {section === 'profile'      && <ProfileSection profile={profile} onProfileUpdate={refreshProfile} />}
        </div>
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
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = section === item.id;
          const shortLabel = item.id === 'browse' ? 'Browse' : item.id === 'applications' ? 'Apps' : item.id === 'lease' ? 'Lease' : item.id === 'maintenance' ? 'Repairs' : 'Profile';
          return (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={isActive ? 'bottom-nav-item-active' : 'bottom-nav-item'}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{shortLabel}</span>
            </button>
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
                onClick={onLogout}
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

function PhotoCarousel({ photos, name }: { photos: string[]; name: string }) {
  const [active, setActive] = useState(0);
  return (
    <div className="rounded-xl overflow-hidden border border-[var(--border)]">
      <div className="relative" style={{ height: 340 }}>
        <img src={photos[active]} alt={name} className="w-full h-full object-cover object-center" />
        {photos.length > 1 && (
          <>
            <button onClick={() => setActive(i => (i - 1 + photos.length) % photos.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-white text-lg"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.15)' }}>‹</button>
            <button onClick={() => setActive(i => (i + 1) % photos.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-white text-lg"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.15)' }}>›</button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {photos.map((_, i) => (
                <button key={i} onClick={() => setActive(i)}
                  style={{ width: i === active ? 18 : 6, height: 6, borderRadius: 3, background: i === active ? '#fff' : 'rgba(255,255,255,0.4)', border: 'none', cursor: 'pointer', transition: 'width 0.2s', padding: 0 }} />
              ))}
            </div>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <div className="flex gap-1.5 p-2" style={{ background: 'var(--surface)' }}>
          {photos.map((url, i) => (
            <button key={i} onClick={() => setActive(i)}
              style={{ width: 60, height: 44, borderRadius: 6, overflow: 'hidden', flexShrink: 0, border: `2px solid ${i === active ? 'var(--primary)' : 'transparent'}`, padding: 0, cursor: 'pointer' }}>
              <img src={url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION: Browse Listings
// ══════════════════════════════════════════════════════════════════════════════
function BrowseSection({ profile }: { profile: TenantProfile | null }) {
  const [listings, setListings] = useState<RealListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedFurnishing, setSelectedFurnishing] = useState('all');
  const [maxRent, setMaxRent] = useState(100000);
  const [selected, setSelected] = useState<RealListing | null>(null);
  const [showInterest, setShowInterest] = useState(false);
  const [iName, setIName] = useState('');
  const [iPhone, setIPhone] = useState('');
  const [iMsg, setIMsg] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    tenantApi.get('/api/public/listings')
      .then(r => setListings(r.data.data || []))
      .catch(() => toast.error('Failed to load listings'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (profile) { setIName(profile.name); setIPhone(profile.phone); }
  }, [profile]);

  const cities = useMemo(() => ['All Cities', ...Array.from(new Set(listings.map(l => l.property.city))).sort()], [listings]);

  const filtered = useMemo(() => listings.filter(l => {
    if (selectedCity !== 'All Cities' && l.property.city !== selectedCity) return false;
    if (selectedType !== 'all' && l.unit_type !== selectedType) return false;
    if (selectedFurnishing !== 'all' && l.furnishing !== selectedFurnishing) return false;
    if (l.monthly_rent > maxRent) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!l.property.address_line1?.toLowerCase().includes(q) &&
          !l.property.city.toLowerCase().includes(q) &&
          !l.property.name.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [listings, searchQuery, selectedCity, selectedType, selectedFurnishing, maxRent]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setApplying(true);
    try {
      await tenantApi.post('/api/tenant/apply', { unit_id: selected.id, message: iMsg });
      toast.success('Application submitted! The landlord will contact you within 24 hours.');
      setShowInterest(false); setIMsg('');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to submit application');
    } finally {
      setApplying(false);
    }
  };

  const clearFilters = () => { setSelectedCity('All Cities'); setSelectedType('all'); setSelectedFurnishing('all'); setMaxRent(100000); setSearchQuery(''); };
  const hasFilters = selectedCity !== 'All Cities' || selectedType !== 'all' || selectedFurnishing !== 'all' || maxRent !== 100000 || searchQuery;

  if (selected) {
    const l = selected;
    const activeAmenities = Object.entries(l.property.amenities || {}).filter(([, v]) => v).map(([k]) => AMENITY_ICONS[k]).filter(Boolean);
    const detailPhotos = l.photo_urls?.length ? l.photo_urls : [];
    return (
      <div className="p-5 md:p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
        <button onClick={() => { setSelected(null); setShowInterest(false); }} className="btn-ghost text-sm">← Back to listings</button>

        {/* Photo carousel */}
        {detailPhotos.length > 0 && (
          <PhotoCarousel photos={detailPhotos} name={l.property.name} />
        )}

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span className="badge-info">{formatUnitType(l.unit_type)}</span>
              <span className="badge-neutral">{formatFurnishing(l.furnishing)}</span>
              {(l.tags || []).map(t => <span key={t} className="badge-neutral">{t}</span>)}
            </div>
            <h1 className="text-xl font-semibold text-[var(--ink)]">{l.property.name} — {l.unit_number}</h1>
            <p className="text-sm text-[var(--ink-dim)] mt-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 shrink-0" />{l.property.address_line1}, {l.property.city}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-bold text-[var(--ink)]">{formatINR(l.monthly_rent)}<span className="text-sm font-normal text-[var(--ink-dim)]">/mo</span></p>
            <p className="text-xs text-[var(--ink-dim)] mt-0.5">Deposit: {formatINR(l.security_deposit)}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-4 order-first lg:order-last lg:self-start lg:sticky lg:top-6">
            <div className="grid grid-cols-3 gap-2 text-xs sm:block sm:space-y-1.5">
              <div className="sm:flex sm:justify-between"><span className="text-[var(--ink-dim)] block sm:inline">Rent</span><span className="font-semibold text-[var(--ink)]">{formatINR(l.monthly_rent)}</span></div>
              <div className="sm:flex sm:justify-between"><span className="text-[var(--ink-dim)] block sm:inline">Deposit</span><span className="text-[var(--ink-dim)]">{formatINR(l.security_deposit)}</span></div>
              <div className="sm:flex sm:justify-between"><span className="text-[var(--ink-dim)] block sm:inline">From</span><span className="text-[var(--ink-dim)]">{formatAvailability(l.available_from)}</span></div>
            </div>
            <div className="divider" />
            {!showInterest ? (
              <button onClick={() => setShowInterest(true)} className="btn-primary w-full justify-center">
                Express Interest <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <form onSubmit={handleApply} className="space-y-3">
                <p className="text-xs font-semibold text-[var(--ink)]">Your Details</p>
                <div><label className="input-label">Name</label><input type="text" value={iName} onChange={e => setIName(e.target.value)} className="input" required /></div>
                <div><label className="input-label">Phone</label><input type="tel" value={iPhone} onChange={e => setIPhone(e.target.value)} className="input" required /></div>
                <div><label className="input-label">Message (optional)</label><textarea value={iMsg} onChange={e => setIMsg(e.target.value)} placeholder="Move-in date, questions..." className="input min-h-[60px]" /></div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowInterest(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={applying} className="btn-primary flex-1 justify-center">{applying ? 'Sending…' : 'Send'}</button>
                </div>
              </form>
            )}
            <p className="text-[11px] text-[var(--ink-dim)] text-center">Aadhaar KYC required before lease signing</p>
          </div>
          <div className="lg:col-span-2 space-y-4 order-last lg:order-first">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 grid grid-cols-2 gap-4">
              {[
                { label: 'Type', value: formatUnitType(l.unit_type) },
                { label: 'Area', value: l.area_sqft ? `${l.area_sqft} sq.ft` : '—' },
                { label: 'Floor', value: l.floor != null ? `Floor ${l.floor}` : '—' },
                { label: 'Available', value: formatAvailability(l.available_from) },
              ].map(({ label, value }) => (
                <div key={label}><p className="text-xs text-[var(--ink-dim)]">{label}</p><p className="text-sm font-medium text-[var(--ink)] mt-0.5">{value}</p></div>
              ))}
            </div>
            {l.description && (
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-2">
                <h3 className="text-sm font-semibold text-[var(--ink)]">About this place</h3>
                <p className="text-sm text-[var(--ink-dim)] leading-relaxed">{l.description}</p>
              </div>
            )}
            {activeAmenities.length > 0 && (
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-[var(--ink)]">Amenities</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {activeAmenities.map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-2 text-xs text-[var(--ink-dim)]">
                      <div className="p-1.5 bg-[rgba(232,234,240,0.06)] rounded-md"><Icon className="w-3.5 h-3.5 text-[var(--primary)]" /></div>{label}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(l.preferred_tenant || []).length > 0 && (
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-2">
                <h3 className="text-sm font-semibold text-[var(--ink)]">Preferred Tenants</h3>
                <div className="flex flex-wrap gap-2">{(l.preferred_tenant || []).map(p => <span key={p} className="badge-neutral">{p}</span>)}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="bg-[var(--surface)] border-b border-[var(--border)] px-5 py-5">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[var(--ink)]">Browse Listings</h2>
              <p className="text-xs text-[var(--ink-dim)] mt-0.5">Verified properties listed by landlords on TenantOS</p>
            </div>
            <span className="badge-info">{loading ? '…' : `${filtered.length} listings`}</span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ink-dim)]" />
            <input type="text" placeholder="Search by city, locality, or property..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input pl-9" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-dim)] hover:text-[var(--ink)]"><X className="w-4 h-4" /></button>}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} className="input py-2 px-3 text-xs w-full sm:w-auto">
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={selectedType} onChange={e => setSelectedType(e.target.value)} className="input py-2 px-3 text-xs w-full sm:w-auto">
              {[{value:'all',label:'All Types'},{value:'1bhk',label:'1BHK'},{value:'2bhk',label:'2BHK'},{value:'3bhk',label:'3BHK'},{value:'studio',label:'Studio'},{value:'pg',label:'PG/Room'}].map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={selectedFurnishing} onChange={e => setSelectedFurnishing(e.target.value)} className="input py-2 px-3 text-xs w-full sm:w-auto">
              {[{value:'all',label:'Any Furnishing'},{value:'furnished',label:'Furnished'},{value:'semi',label:'Semi-Furnished'},{value:'unfurnished',label:'Unfurnished'}].map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <select value={maxRent} onChange={e => setMaxRent(Number(e.target.value))} className="input py-2 px-3 text-xs w-full sm:w-auto">
              {[10000,15000,20000,30000,40000,50000,75000,100000].map(v => <option key={v} value={v}>Max ₹{v >= 100000 ? 'Any' : (v/1000)+'k'}</option>)}
            </select>
            {hasFilters && <button onClick={clearFilters} className="col-span-2 sm:col-span-1 text-xs text-[var(--primary)] font-medium transition-colors text-left">Clear all</button>}
          </div>
        </div>
      </div>

      <div className="p-5 md:p-8 max-w-6xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-3" style={{ animationDelay: `${i*60}ms` }}>
                <div className="w-full h-32 skeleton rounded-lg" />
                <div className="h-4 w-2/3 skeleton rounded" />
                <div className="h-3 w-1/2 skeleton rounded" />
                <div className="h-3 w-full skeleton rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <Search className="w-10 h-10 text-[var(--ink-dim)] mx-auto animate-float-y" />
            <p className="text-[var(--ink-dim)] font-medium">No listings match your filters</p>
            {hasFilters && <button onClick={clearFilters} className="btn-secondary text-xs">Clear filters</button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((l, i) => (
              <button key={l.id} onClick={() => setSelected(l)}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-left flex flex-col gap-3 card-interactive w-full group animate-fade-up"
                style={{ animationDelay: `${i * 40}ms` }}>
                <div className="w-full h-32 rounded-lg overflow-hidden border border-[var(--border)]" style={{ background: 'rgba(232,234,240,0.06)' }}>
                  {l.photo_urls?.[0] ? (
                    <img src={l.photo_urls[0]} alt={l.property.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-[var(--ink-dim)]" />
                    </div>
                  )}
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex gap-1.5 mb-1 flex-wrap">
                      <span className="badge-info text-[11px]">{formatUnitType(l.unit_type)}</span>
                      <span className="badge-neutral text-[11px]">{formatFurnishing(l.furnishing)}</span>
                    </div>
                    <p className="font-medium text-[var(--ink)] text-sm leading-snug group-hover:text-[var(--primary)] transition-colors truncate">{l.property.name}</p>
                    <p className="text-xs text-[var(--ink-dim)] mt-0.5 flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 shrink-0" />{l.property.city}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-[var(--ink)] text-sm">{formatINR(l.monthly_rent)}</p>
                    <p className="text-[11px] text-[var(--ink-dim)]">/month</p>
                  </div>
                </div>
                <div className="divider" />
                <div className="flex items-center justify-between text-xs text-[var(--ink-dim)]">
                  {l.area_sqft && <span className="flex items-center gap-1"><Maximize2 className="w-3 h-3" />{l.area_sqft} sq.ft</span>}
                  {l.floor != null && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />Floor {l.floor}</span>}
                  <span className="flex items-center gap-1 text-[var(--accent)]"><CheckCircle2 className="w-3 h-3" />{formatAvailability(l.available_from)}</span>
                </div>
                {(l?.tags?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(l?.tags ?? []).slice(0, 3).map(tag => <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-[rgba(232,234,240,0.06)] text-[var(--ink-dim)] rounded">{tag}</span>)}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION: My Applications
// ══════════════════════════════════════════════════════════════════════════════
function ApplicationsSection() {
  const [apps, setApps] = useState<TenantApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePaymentApp, setActivePaymentApp] = useState<any | null>(null);

  useEffect(() => {
    tenantApi.get('/api/tenant/applications')
      .then(r => setApps(r.data.data || []))
      .catch(() => toast.error('Failed to load applications'))
      .finally(() => setLoading(false));
  }, []);

  const handlePayToken = (app: any) => {
    setActivePaymentApp(app);
  };

  const handlePaymentSuccess = () => {
    if (activePaymentApp) {
      setApps(prev => prev.map(a => a.id === activePaymentApp.id ? { ...a, status: 'scheduled' } : a));
    }
    setActivePaymentApp(null);
  };

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-semibold text-[var(--ink)]">My Applications</h2>
        <p className="text-sm text-[var(--ink-dim)] mt-0.5">Track properties you've expressed interest in</p>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} lines={3} />)}</div>
      ) : apps.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <FileText className="w-10 h-10 text-[var(--ink-dim)] mx-auto animate-float-y" />
          <p className="text-[var(--ink-dim)]">No applications yet</p>
          <p className="text-xs text-[var(--ink-dim)]">Browse listings and click "Express Interest" to apply</p>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map((app, i) => {
            const st = APP_STATUS[app.status] || { label: app.status, className: 'badge-neutral' };
            return (
              <div key={app.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-4 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div className="p-2 bg-[rgba(232,234,240,0.06)] rounded-md shrink-0 self-start">
                      <Building2 className="w-4 h-4 text-[var(--ink-dim)]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-[var(--ink)] text-sm">{app.unit.property.name}</p>
                        <span className={`${st.className} badge`}>{st.label}</span>
                      </div>
                      <p className="text-xs text-[var(--ink-dim)] mt-0.5">Property {app.unit.unit_number.replace('Unit ', '')} · {formatUnitType(app.unit.unit_type)} · {app.unit.property.city}</p>
                      <p className="text-xs text-[var(--ink-dim)] mt-0.5">Applied {formatDate(app.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-[var(--ink)] text-sm">{formatINR(app.unit.monthly_rent)}</p>
                    <p className="text-[11px] text-[var(--ink-dim)]">/month</p>
                  </div>
                </div>
                {app.status === 'accepted' && (
                  <div className="border-t border-[var(--border)] pt-4 mt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[rgba(61,123,255,0.04)] p-3 rounded-lg border border-[rgba(61,123,255,0.1)]">
                      <div>
                        <p className="text-sm font-semibold text-[var(--ink)]">Congratulations! You are accepted.</p>
                        <p className="text-xs text-[var(--ink-dim)] mt-0.5">Pay a token amount of ₹5,000 to secure this property before someone else does.</p>
                      </div>
                      <button onClick={() => handlePayToken(app)} className="btn-primary shrink-0">
                        Pay Token (₹5,000)
                      </button>
                    </div>
                  </div>
                )}
                {app.message?.includes('[TOKEN PAID]') && (
                  <div className="border-t border-[var(--border)] pt-4 mt-2">
                    <div className="flex flex-col gap-2 bg-[rgba(34,197,94,0.04)] p-3 rounded-lg border border-[rgba(34,197,94,0.1)]">
                      <p className="text-sm font-semibold text-[#22c55e] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Token Paid • Property Secured!
                      </p>
                      <p className="text-xs text-[var(--ink-dim)]">
                        You have successfully paid the ₹5,000 token amount. The landlord will contact you shortly to finalize the lease agreement.
                      </p>
                    </div>
                  </div>
                )}
                {app.visit_date && !app.message?.includes('[TOKEN PAID]') && (
                  <div className="bg-[rgba(232,234,240,0.06)] border border-[var(--border)] rounded-lg p-3">
                    <p className="text-xs font-medium text-[var(--accent)] flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />Visit scheduled: {formatDate(app.visit_date)}
                    </p>
                    <p className="text-xs text-[var(--ink-dim)] mt-1">Please visit on the confirmed date. Bring your Aadhaar and latest salary slip.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activePaymentApp && (
        <TokenPaymentFlow
          applicationId={activePaymentApp.id}
          amount={5000}
          propertyName={activePaymentApp.unit.property.name}
          onSuccess={handlePaymentSuccess}
          onClose={() => setActivePaymentApp(null)}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION: Lease & Rent
// ══════════════════════════════════════════════════════════════════════════════
function LeaseSection({ profile }: { profile: TenantProfile | null }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentFlow, setShowPaymentFlow] = useState(false);
  const [showReceipts, setShowReceipts] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadReceipt = async (id: string, receiptNum: string) => {
    setDownloadingId(id);
    try {
      const res = await tenantApi.get(`/api/tenant/receipts/${id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Rent_Receipt_${receiptNum}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success('Receipt downloaded!');
    } catch (err) {
      toast.error('Failed to download receipt');
    }
    setDownloadingId(null);
  };

  const lease = profile?.active_lease || null;

  const fetchPayments = useCallback(() => {
    tenantApi.get('/api/tenant/payments')
      .then(r => setPayments(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const upcoming = payments.find(p => p.status === 'pending' || p.status === 'overdue');
  const history = payments.filter(p => p !== upcoming);

  const daysUntilDue = upcoming
    ? Math.ceil((new Date(upcoming.due_date).getTime() - Date.now()) / 86400000)
    : null;

  if (showReceipts) {
    return (
      <div className="p-5 md:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
        <button onClick={() => setShowReceipts(false)} className="btn-secondary mb-4">← Back to Lease</button>
        <RentReceipts onBack={() => setShowReceipts(false)} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-5 md:p-8 max-w-5xl mx-auto space-y-4">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} lines={4} />)}
      </div>
    );
  }

  if (!lease) {
    return (
      <div className="p-5 md:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
        <div><h2 className="text-xl font-semibold text-[var(--ink)]">Lease & Rent</h2></div>
        <div className="text-center py-20 space-y-3">
          <IndianRupee className="w-10 h-10 text-[var(--ink-dim)] mx-auto animate-float-y" />
          <p className="text-[var(--ink-dim)] font-medium">No active lease</p>
          <p className="text-xs text-[var(--ink-dim)]">Browse listings and apply to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div><h2 className="text-xl font-semibold text-[var(--ink)]">Lease & Rent</h2>
        <p className="text-sm text-[var(--ink-dim)] mt-0.5">Your current lease details and payment history</p></div>

      {/* Upcoming due */}
      {loading ? (
        <div className="bg-[var(--surface)] rounded-xl p-5 border border-[var(--border)] flex flex-col sm:flex-row justify-between gap-4">
          <div className="space-y-2">
            <div className="h-3 w-24 skeleton rounded" />
            <div className="h-8 w-32 skeleton rounded" />
            <div className="h-3 w-40 skeleton rounded" />
          </div>
          <div className="h-10 w-32 skeleton rounded-lg" />
        </div>
      ) : upcoming && (
        <div className={`bg-[var(--surface)] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border ${
          daysUntilDue !== null && daysUntilDue <= 3 ? 'border-[rgba(245,158,11,0.5)]' : 'border-[var(--border)]'
        }`}>
          <div>
            <p className="text-xs text-[var(--ink-dim)]">Upcoming Payment</p>
            <p className="text-2xl font-bold text-[var(--ink)] mt-0.5 animate-count-up">{formatINR(upcoming.amount_due)}</p>
            {upcoming.notes && <p className="text-xs text-[var(--primary)] mt-1 font-medium bg-[var(--surface-hover)] inline-block px-2 py-0.5 rounded">{upcoming.notes}</p>}
            <p className="text-xs mt-1">
              {daysUntilDue !== null && daysUntilDue <= 0
                ? <span className="text-[var(--danger)] font-medium badge-urgent-pulse inline-block px-2 py-0.5 rounded-full">Overdue — Due {formatDate(upcoming.due_date)}</span>
                : daysUntilDue !== null && daysUntilDue <= 3
                ? <span className="text-[var(--warning)] font-medium">Due in {daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''} — {formatDate(upcoming.due_date)}</span>
                : <span className="text-[var(--ink-dim)]">Due on {formatDate(upcoming.due_date)}</span>
              }
            </p>
          </div>
          <button onClick={() => setShowPaymentFlow(true)} className="btn-primary shrink-0">
            Pay via UPI <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {showPaymentFlow && upcoming && (
        <RentPaymentFlow
          amount={upcoming.amount_due}
          month={monthLabel(upcoming.due_date)}
          landlordName={lease.unit.property.landlord.name}
          collectionId={upcoming.id}
          onSuccess={() => { setShowPaymentFlow(false); fetchPayments(); toast.success('Payment recorded successfully!'); }}
          onClose={() => setShowPaymentFlow(false)}
        />
      )}

      {/* Lease card */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--ink)]">Active Lease</h3>
          <span className="badge-success">Active</span>
        </div>
        <div className="space-y-0 divide-y divide-[var(--border)] -mx-5">
          {[
            { label: 'Property',         value: lease.unit.property.name },
            { label: 'Unit',             value: `${lease.unit.unit_number} · ${formatUnitType(lease.unit.unit_type)}` },
            { label: 'Monthly Rent',     value: formatINR(lease.monthly_rent) },
            { label: 'Security Deposit', value: formatINR(lease.security_deposit) },
            { label: 'Rent Due Day',     value: `${lease.rent_due_day}th of each month` },
            { label: 'Lease Period',     value: `${formatDate(lease.start_date)} – ${formatDate(lease.end_date)}` },
            { label: 'Landlord',         value: lease.unit.property.landlord.name },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between gap-4 px-5 py-2.5">
              <p className="text-xs text-[var(--ink-dim)] shrink-0">{label}</p>
              <p className="text-xs font-medium text-[var(--ink)] text-right">{value}</p>
            </div>
          ))}
        </div>
        <div className="divider" />
        <div className="flex items-center gap-2">
          <Phone className="w-3.5 h-3.5 text-[var(--ink-dim)]" />
          <span className="text-xs text-[var(--ink-dim)]">Landlord contact: </span>
          <span className="text-xs font-medium text-[var(--ink)]">{lease.unit.property.landlord.phone}</span>
        </div>
      </div>

      {/* Payment history */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--ink)]">Payment History</h3>
          <button onClick={() => setShowReceipts(true)} className="text-xs font-medium" style={{ color: 'var(--primary)' }}>HRA Receipts →</button>
        </div>
        {loading ? (
          <div className="divide-y divide-[var(--border)]">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-4 py-3.5 flex items-center justify-between gap-3">
                <div className="space-y-1.5"><div className="h-3.5 w-24 skeleton rounded" /><div className="h-3 w-32 skeleton rounded" /></div>
                <div className="h-5 w-16 skeleton rounded-full" />
              </div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="px-5 py-8 text-center text-xs text-[var(--ink-dim)]">No payment history yet</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {history.map(r => (
              <div key={r.id} className="px-4 py-3.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--ink)]">{monthLabel(r.due_date)}</p>
                  <p className="text-xs text-[var(--ink-dim)] mt-0.5 truncate">
                    {r.paid_at ? `${formatDate(r.paid_at)} · ${r.payment_method || 'UPI'}` : `Due ${formatDate(r.due_date)}`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-sm font-semibold text-[var(--ink)] tabular-nums">{formatINR(r.amount_due)}</span>
                  <div className="flex items-center gap-2">
                    <span className={r.status === 'paid' || r.status === 'late' ? 'badge-success' : r.status === 'overdue' ? 'badge-danger' : 'badge-warning'}>
                      {r.status === 'paid' ? 'Paid' : r.status === 'late' ? 'Late' : r.status === 'overdue' ? 'Overdue' : 'Pending'}
                    </span>
                    {r.receipt_number && (
                      <button onClick={() => handleDownloadReceipt(r.id, r.receipt_number!)} disabled={downloadingId === r.id} className="btn-icon w-6 h-6" title="Download Receipt">
                        {downloadingId === r.id ? <div className="w-3.5 h-3.5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION: Maintenance
// ══════════════════════════════════════════════════════════════════════════════
function MaintenanceSection({ profile }: { profile: TenantProfile | null }) {
  const [requests, setRequests] = useState<MaintRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [mTitle, setMTitle] = useState('');
  const [mDesc, setMDesc] = useState('');
  const [mCat, setMCat] = useState('plumbing');
  const [mPrio, setMPrio] = useState('medium');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    tenantApi.get('/api/tenant/maintenance')
      .then(r => setRequests(r.data.data || []))
      .catch(() => toast.error('Failed to load maintenance requests'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mTitle || !mDesc) { toast.error('Title and description required.'); return; }
    if (!profile?.active_lease) { toast.error('You need an active lease to submit maintenance requests.'); return; }
    setSubmitting(true);
    try {
      const res = await tenantApi.post('/api/tenant/maintenance', { title: mTitle, description: mDesc, category: mCat, priority: mPrio });
      setRequests(prev => [res.data.data, ...prev]);
      toast.success('Request submitted! Your landlord has been notified.');
      setShowForm(false); setMTitle(''); setMDesc('');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--ink)]">Maintenance</h2>
          <p className="text-sm text-[var(--ink-dim)] mt-0.5">Submit and track repair requests for your unit</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> New Request</button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} lines={3} />)}</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Wrench className="w-10 h-10 text-[var(--ink-dim)] mx-auto animate-float-y" />
          <p className="text-[var(--ink-dim)]">No maintenance requests</p>
          <p className="text-xs text-[var(--ink-dim)]">Click "New Request" if something needs fixing</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req, i) => {
            const st = MAINT_STATUS[req.status] || { label: req.status, cls: 'badge-neutral' };
            return (
              <div key={req.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-3 animate-fade-up" style={{ animationDelay: `${i*60}ms` }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className={`${st.cls} badge`}>{st.label}</span>
                      <span className="badge-neutral uppercase font-mono text-[10px]">{req.category}</span>
                    </div>
                    <p className="font-medium text-[var(--ink)] text-sm">{req.title}</p>
                    <p className="text-xs text-[var(--ink-dim)] mt-0.5">Reported {formatDate(req.created_at)}</p>
                  </div>
                  <span className={`badge ${req.priority === 'urgent' ? 'badge-danger' : req.priority === 'high' ? 'bg-[var(--warning-dim)] text-[var(--warning)]' : 'badge-neutral'} uppercase font-mono shrink-0`}>
                    {req.priority}
                  </span>
                </div>
                {req.description && <p className="text-xs text-[var(--ink-dim)] leading-relaxed">{req.description}</p>}
                {req.vendor && (
                  <div className="bg-[rgba(232,234,240,0.06)] border border-[var(--border)] rounded-lg p-3">
                    <p className="text-xs text-[var(--ink-dim)] font-medium mb-0.5">Vendor assigned</p>
                    <p className="text-xs text-[var(--ink)]">{req.vendor.name} · {req.vendor.phone}</p>
                  </div>
                )}
                {req.resolved_at && (
                  <p className="text-xs text-[var(--accent)] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Resolved {formatDate(req.resolved_at)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl w-full max-w-md p-6 space-y-5 relative animate-modal-pop">
            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-[var(--ink-dim)] hover:text-[var(--ink)] transition-colors"><X className="w-5 h-5" /></button>
            <div>
              <h2 className="text-base font-semibold text-[var(--ink)]">New Maintenance Request</h2>
              <p className="text-xs text-[var(--ink-dim)] mt-0.5">Your landlord will be notified immediately</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="input-label">Issue Title</label><input type="text" value={mTitle} onChange={e => setMTitle(e.target.value)} placeholder="e.g. Water leaking from ceiling" className="input" required /></div>
              <div><label className="input-label">Description</label><textarea value={mDesc} onChange={e => setMDesc(e.target.value)} placeholder="Describe the issue in detail..." className="input min-h-[80px]" required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Category</label>
                  <select value={mCat} onChange={e => setMCat(e.target.value)} className="input">
                    <option value="plumbing">Plumbing</option>
                    <option value="electrical">Electrical</option>
                    <option value="appliance">Appliance</option>
                    <option value="structural">Structural</option>
                    <option value="pest">Pest Control</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="carpentry">Carpentry</option>
                    <option value="painting">Painting</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Priority</label>
                  <select value={mPrio} onChange={e => setMPrio(e.target.value)} className="input">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">{submitting ? 'Submitting…' : 'Submit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION: Profile & KYC
// ══════════════════════════════════════════════════════════════════════════════
function ProfileSection({ profile, onProfileUpdate }: { profile: TenantProfile | null; onProfileUpdate?: () => void }) {
  // KYC modal state
  const [showKyc, setShowKyc]                   = useState(false);
  const [kycStep, setKycStep]                   = useState<1 | 2>(1);
  const [aadhaarLast4, setAadhaarLast4]         = useState('');
  const [kycFile, setKycFile]                   = useState<File | null>(null);
  const [kycUploading, setKycUploading]         = useState(false);
  const [kycSubmitting, setKycSubmitting]       = useState(false);
  const [kycDone, setKycDone]                   = useState(false);

  // Police verification form state
  const [showPolice, setShowPolice]             = useState(false);
  const [pAddr1, setPAddr1]                     = useState('');
  const [pAddr2, setPAddr2]                     = useState('');
  const [pCity, setPCity]                       = useState('');
  const [pState, setPState]                     = useState('');
  const [pPin, setPPin]                         = useState('');
  const [policeFile, setPoliceFile]             = useState<File | null>(null);
  const [policeUploading, setPoliceUploading]   = useState(false);
  const [policeSubmitting, setPoliceSubmitting] = useState(false);
  const [policeDone, setPoliceDone]             = useState(false);

  if (!profile) {
    return (
      <div className="p-5 md:p-8 max-w-5xl mx-auto space-y-4">
        {Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} lines={6} />)}
      </div>
    );
  }

  const policeStatus = profile.police_verification_status;

  const kycSteps = [
    { label: 'Phone Verified', done: true },
    { label: 'Basic Profile',  done: true },
    { label: 'Aadhaar KYC',   done: profile.aadhaar_verified },
    { label: 'PAN Linked',     done: !!profile.pan },
  ];

  // Upload file to Supabase via existing endpoint
  const uploadDoc = async (file: File, docType: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docType);
    const res = await tenantApi.post('/api/upload/tenant-doc', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.url as string;
  };

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycFile) { toast.error('Please select a document photo'); return; }
    setKycSubmitting(true);
    try {
      setKycUploading(true);
      const url = await uploadDoc(kycFile, 'aadhaar');
      setKycUploading(false);
      await tenantApi.post('/api/tenant/kyc/submit', {
        aadhaar_last4: aadhaarLast4,
        document_url: url,
        doc_type: 'aadhaar',
      });
      setKycDone(true);
      toast.success('Aadhaar submitted! Verification in 24 hours.');
      onProfileUpdate?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Submission failed');
    } finally {
      setKycSubmitting(false);
      setKycUploading(false);
    }
  };

  const handlePoliceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPoliceSubmitting(true);
    try {
      let docUrl: string | undefined;
      if (policeFile) {
        setPoliceUploading(true);
        docUrl = await uploadDoc(policeFile, 'police_verification');
        setPoliceUploading(false);
      }
      await tenantApi.post('/api/tenant/police-verification/submit', {
        address_line1: pAddr1, address_line2: pAddr2,
        city: pCity, state: pState, pincode: pPin,
        ...(docUrl ? { document_url: docUrl } : {}),
      });
      setPoliceDone(true);
      toast.success('Police verification submitted! Processing in 7–10 days.');
      onProfileUpdate?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Submission failed');
    } finally {
      setPoliceSubmitting(false);
      setPoliceUploading(false);
    }
  };

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-semibold text-[var(--ink)]">Profile & KYC</h2>
        <p className="text-sm text-[var(--ink-dim)] mt-0.5">Your identity verification and account details</p>
      </div>

      {/* Verification steps */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--ink)]">Verification Status</h3>
          <span className={profile.aadhaar_verified ? 'badge-success' : 'badge-warning'}>
            {profile.aadhaar_verified ? 'Fully Verified' : 'Incomplete'}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kycSteps.map(step => (
            <div key={step.label} className={`flex flex-col items-center gap-2 p-3 rounded-lg border text-center ${step.done ? 'bg-[var(--accent-dim)] border-[rgba(0,212,160,0.2)]' : 'bg-[rgba(232,234,240,0.06)] border-[var(--border)]'}`}>
              {step.done ? <ShieldCheck className="w-5 h-5 text-[var(--accent)]" /> : <ShieldAlert className="w-5 h-5 text-[var(--warning)]" />}
              <span className="text-xs font-medium text-[var(--ink)]">{step.label}</span>
              <span className={`text-[10px] ${step.done ? 'text-[var(--accent)]' : 'text-[var(--ink-dim)]'}`}>{step.done ? 'Done' : 'Pending'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Account details */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[var(--ink)]">Account Details</h3>
        <div className="space-y-0 divide-y divide-[var(--border)] -mx-5">
          {[
            { label: 'Name',       value: profile.name },
            { label: 'Phone',      value: profile.phone },
            { label: 'Email',      value: profile.email || '—' },
            { label: 'Profession', value: profile.profession || '—' },
            { label: 'PAN',        value: profile.pan || '—' },
            { label: 'Member Since', value: formatDate(profile.created_at) },
            {
              label: 'Police Verification',
              value: policeStatus === 'verified' ? 'Verified' : policeStatus === 'pending' ? 'Under Review' : 'Not Submitted',
            },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between gap-4 px-5 py-2.5">
              <p className="text-xs text-[var(--ink-dim)] shrink-0">{label}</p>
              <p className="text-xs font-medium text-[var(--ink)] text-right">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Aadhaar KYC action card */}
      {!profile.aadhaar_verified && (
        <div className="bg-[var(--surface)] border border-[rgba(245,158,11,0.3)] rounded-xl p-5 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[var(--warning)] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--ink)]">Aadhaar Verification Pending</h3>
              <p className="text-xs text-[var(--ink-dim)] mt-0.5">Upload a photo of your Aadhaar card. Our team verifies within 24 hours.</p>
            </div>
          </div>
          <button className="btn-primary w-full justify-center" onClick={() => { setShowKyc(true); setKycStep(1); setKycDone(false); }}>
            Start Aadhaar KYC
          </button>
        </div>
      )}

      {/* Police verification action card */}
      {policeStatus === 'not_started' && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-3">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-[var(--primary)] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--ink)]">Police Verification</h3>
              <p className="text-xs text-[var(--ink-dim)] mt-0.5">Required by most landlords. Submit your current address — we coordinate with local authorities. Takes 7–10 working days.</p>
            </div>
          </div>
          <button className="btn-secondary w-full justify-center" onClick={() => { setShowPolice(true); setPoliceDone(false); }}>
            Submit Police Verification
          </button>
        </div>
      )}
      {policeStatus === 'pending' && (
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'var(--primary-dim)', border: '1px solid rgba(61,123,255,0.2)' }}>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: 'var(--primary)' }} />
          <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>Police verification is <strong style={{ color: 'var(--ink)' }}>under review</strong>. Processing takes 7–10 working days.</p>
        </div>
      )}

      {/* ── Aadhaar KYC Modal ───────────────────────────────────────────────── */}
      {showKyc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowKyc(false); }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-5 relative animate-scale-in"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
            <button onClick={() => setShowKyc(false)} className="btn-icon absolute top-4 right-4"><X className="w-4 h-4" /></button>

            {kycDone ? (
              <div className="text-center py-4 space-y-3">
                <CheckCircle2 className="w-12 h-12 mx-auto text-[var(--accent)]" />
                <h3 className="text-base font-bold text-[var(--ink)]">Documents Submitted!</h3>
                <p className="text-sm text-[var(--ink-dim)]">Our team will verify your Aadhaar within 24 hours. You'll be notified once approved.</p>
                <button className="btn-primary w-full justify-center mt-2" onClick={() => setShowKyc(false)}>Done</button>
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-base font-bold text-[var(--ink)]" style={{ fontFamily: 'Syne, Inter, sans-serif' }}>Aadhaar KYC</h2>
                  <p className="text-xs text-[var(--ink-dim)] mt-1">Manual upload — our team reviews within 24 hours</p>
                  <div className="flex gap-2 mt-3">
                    {[1, 2].map(s => (
                      <div key={s} className="flex-1 h-1 rounded-full" style={{ background: kycStep >= s ? 'var(--primary)' : 'var(--border)' }} />
                    ))}
                  </div>
                </div>

                {kycStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="input-label">Last 4 digits of Aadhaar</label>
                      <input
                        type="text" maxLength={4} inputMode="numeric"
                        value={aadhaarLast4} onChange={e => setAadhaarLast4(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 1234" className="input"
                      />
                      <p className="text-[11px] text-[var(--ink-dim)] mt-1">We store only the last 4 digits for security</p>
                    </div>
                    <button className="btn-primary w-full justify-center" onClick={() => setKycStep(2)}>
                      Next — Upload Document
                    </button>
                  </div>
                )}

                {kycStep === 2 && (
                  <form onSubmit={handleKycSubmit} className="space-y-4">
                    <div>
                      <label className="input-label">Upload Aadhaar Card Photo</label>
                      <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl cursor-pointer transition-all"
                        style={{ border: '2px dashed var(--border)', background: kycFile ? 'var(--accent-dim)' : 'transparent' }}>
                        <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden"
                          onChange={e => setKycFile(e.target.files?.[0] || null)} />
                        {kycFile ? (
                          <><CheckCircle2 className="w-6 h-6 text-[var(--accent)]" /><span className="text-xs text-[var(--ink)] font-medium">{kycFile.name}</span></>
                        ) : (
                          <><Download className="w-6 h-6 text-[var(--ink-dim)]" /><span className="text-xs text-[var(--ink-dim)]">Click to upload front of Aadhaar card</span><span className="text-[11px] text-[var(--ink-dim)]">JPG, PNG, PDF — max 5MB</span></>
                        )}
                      </label>
                    </div>
                    <div className="flex gap-3">
                      <button type="button" className="btn-secondary flex-1" onClick={() => setKycStep(1)}>Back</button>
                      <button type="submit" disabled={!kycFile || kycSubmitting} className="btn-primary flex-1 justify-center">
                        {kycSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />{kycUploading ? 'Uploading…' : 'Submitting…'}</> : 'Submit KYC'}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Police Verification Modal ───────────────────────────────────────── */}
      {showPolice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowPolice(false); }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-5 relative animate-scale-in overflow-y-auto"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)', maxHeight: '90vh' }}>
            <button onClick={() => setShowPolice(false)} className="btn-icon absolute top-4 right-4"><X className="w-4 h-4" /></button>

            {policeDone ? (
              <div className="text-center py-4 space-y-3">
                <CheckCircle2 className="w-12 h-12 mx-auto text-[var(--accent)]" />
                <h3 className="text-base font-bold text-[var(--ink)]">Request Submitted!</h3>
                <p className="text-sm text-[var(--ink-dim)]">Police verification typically takes 7–10 working days. You'll see the status update here.</p>
                <button className="btn-primary w-full justify-center mt-2" onClick={() => setShowPolice(false)}>Done</button>
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-base font-bold text-[var(--ink)]" style={{ fontFamily: 'Syne, Inter, sans-serif' }}>Police Verification</h2>
                  <p className="text-xs text-[var(--ink-dim)] mt-1">Enter your current residential address as it appears on your ID proof</p>
                </div>
                <form onSubmit={handlePoliceSubmit} className="space-y-3">
                  <div>
                    <label className="input-label">Address Line 1</label>
                    <input type="text" value={pAddr1} onChange={e => setPAddr1(e.target.value)} placeholder="House/Flat No., Street" className="input" required />
                  </div>
                  <div>
                    <label className="input-label">Address Line 2 (optional)</label>
                    <input type="text" value={pAddr2} onChange={e => setPAddr2(e.target.value)} placeholder="Landmark, Area" className="input" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="input-label">City</label>
                      <input type="text" value={pCity} onChange={e => setPCity(e.target.value)} placeholder="Bangalore" className="input" required />
                    </div>
                    <div>
                      <label className="input-label">State</label>
                      <input type="text" value={pState} onChange={e => setPState(e.target.value)} placeholder="Karnataka" className="input" required />
                    </div>
                  </div>
                  <div>
                    <label className="input-label">Pincode</label>
                    <input type="text" value={pPin} onChange={e => setPPin(e.target.value.replace(/\D/g, ''))} placeholder="560001" maxLength={6} className="input" required />
                  </div>
                  <div>
                    <label className="input-label">Upload ID Proof (optional)</label>
                    <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all"
                      style={{ border: '1px dashed var(--border)', background: policeFile ? 'var(--primary-dim)' : 'transparent' }}>
                      <input type="file" accept="image/jpeg,image/png,application/pdf" className="hidden"
                        onChange={e => setPoliceFile(e.target.files?.[0] || null)} />
                      <Download className="w-4 h-4 shrink-0 text-[var(--ink-dim)]" />
                      <span className="text-xs text-[var(--ink-dim)]">{policeFile ? policeFile.name : 'Attach Aadhaar / Voter ID / Passport'}</span>
                    </label>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button type="button" className="btn-secondary flex-1" onClick={() => setShowPolice(false)}>Cancel</button>
                    <button type="submit" disabled={policeSubmitting} className="btn-primary flex-1 justify-center">
                      {policeSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />{policeUploading ? 'Uploading…' : 'Submitting…'}</> : 'Submit Request'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
