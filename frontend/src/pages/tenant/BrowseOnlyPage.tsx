import React, { useState, useMemo } from 'react';
import {
  Search, MapPin, Maximize2, CheckCircle2, Building2,
  X, ArrowRight, Home, User, Zap, Car, Wifi,
  Shield, Dumbbell, Wind, Droplets, Star, Lock,
  BadgeCheck,
} from 'lucide-react';
// Types inline — no mock data
type UnitType = 'studio' | '1bhk' | '2bhk' | '3bhk' | 'pg' | string;
type Furnishing = 'furnished' | 'semi' | 'unfurnished' | string;
interface Listing {
  id: string; property_name: string; locality: string; city: string;
  unit_type: string; furnishing: string; monthly_rent: number;
  security_deposit: number; area_sqft: number; floor: number;
  available_from: string; amenities: Record<string, boolean>;
  tags: string[]; description: string; photo_urls: string[];
}
const CITIES = ['All Cities'];
const UNIT_TYPES = [
  {value:'all',label:'All Types'},{value:'1bhk',label:'1BHK'},{value:'2bhk',label:'2BHK'},
  {value:'3bhk',label:'3BHK'},{value:'studio',label:'Studio'},{value:'pg',label:'PG/Room'},
];
const FURNISHING_OPTIONS = [
  {value:'all',label:'Any'},{value:'furnished',label:'Furnished'},
  {value:'semi',label:'Semi-Furnished'},{value:'unfurnished',label:'Unfurnished'},
];
import { formatINR } from '../../utils/format';
import { api } from '../../lib/api';

interface BrowseOnlyPageProps {
  onBack: () => void;
  onSignIn: () => void;
  onUpgrade: () => void;
}

function formatUnitType(t: UnitType | string) {
  if (t === 'pg') return 'PG / Room';
  if (t === 'studio') return 'Studio';
  return (t as string).toUpperCase();
}
function formatFurnishing(f: Furnishing | string) {
  if (f === 'semi') return 'Semi-Furnished';
  if (f === 'furnished') return 'Furnished';
  return 'Unfurnished';
}
function formatAvailability(date: string | null) {
  if (!date) return 'Available Now';
  const d = new Date(date);
  if (isNaN(d.getTime()) || d <= new Date()) return 'Available Now';
  return `From ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
}

/* ── Amenity icons map ─────────────────────────────────────────────────── */
const AMENITY_ICONS: Record<string, React.ElementType> = {
  parking: Car, lift: Building2, generator: Zap,
  security: Shield, gym: Dumbbell, wifi: Wifi,
  ac: Wind, water_24h: Droplets,
};

/* ── Listing card ───────────────────────────────────────────────────────── */
function ListingCard({
  listing: l,
  onClick,
  index,
}: {
  listing: Listing;
  onClick: () => void;
  index: number;
}) {
  const availableNow = !l.available_from || new Date(l.available_from) <= new Date();
  const amenities = l.amenities || {};
  const topAmenities = Object.entries(amenities).filter(([, v]) => v).slice(0, 4);

  return (
    <button
      onClick={onClick}
      className="text-left w-full group"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
        transition: 'transform 0.15s, border-color 0.15s, box-shadow 0.15s',
        animation: 'fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both',
        animationDelay: `${index * 50}ms`,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.transform = 'translateY(-3px)';
        el.style.borderColor = 'rgba(232,234,240,0.15)';
        el.style.boxShadow = '0 12px 32px rgba(0,0,0,0.4)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.transform = '';
        el.style.borderColor = 'var(--border)';
        el.style.boxShadow = '';
      }}
    >
      {/* Photo or gradient placeholder */}
      <div
        style={{
          height: 140,
          background: `linear-gradient(135deg,
            hsl(${(index * 47) % 360}, 25%, 12%) 0%,
            hsl(${(index * 47 + 60) % 360}, 20%, 8%) 100%)`,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {l.photo_urls?.[0] ? (
          <img
            src={l.photo_urls[0]}
            alt={l.property_name}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Building2
            style={{
              width: 32,
              height: 32,
              color: `hsl(${(index * 47) % 360}, 40%, 50%)`,
              opacity: 0.5,
            }}
          />
        )}
        {/* Zero brokerage badge */}
        <div
          style={{
            position: 'absolute',
            top: 8, left: 8,
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 8px', borderRadius: 4,
            background: 'var(--accent)',
            fontSize: '0.625rem', fontWeight: 700, color: '#000', letterSpacing: '0.02em',
          }}
        >
          <Zap style={{ width: 9, height: 9 }} /> ZERO BROKERAGE
        </div>
        {/* Availability pill */}
        <div
          style={{
            position: 'absolute', top: 8, right: 8,
            padding: '3px 8px', borderRadius: 4,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            fontSize: '0.625rem', fontWeight: 600,
            color: availableNow ? 'var(--accent)' : 'var(--ink-dim)',
          }}
        >
          {formatAvailability(l.available_from)}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              <span
                className="text-xs px-2 py-0.5 rounded font-semibold"
                style={{ background: 'var(--primary-dim)', color: 'var(--primary)' }}
              >
                {formatUnitType(l.unit_type)}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded font-medium"
                style={{ background: 'var(--surface)', color: 'var(--ink-dim)', border: '1px solid var(--border)' }}
              >
                {formatFurnishing(l.furnishing)}
              </span>
            </div>
            <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--ink)' }}>
              {l.property_name}
            </p>
            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--ink-dim)' }}>
              <MapPin style={{ width: 10, height: 10, flexShrink: 0 }} />
              {l.locality}, {l.city}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)' }}>
              {formatINR(l.monthly_rent)}
            </p>
            <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>/month</p>
          </div>
        </div>

        {/* Quick facts */}
        <div
          className="flex items-center justify-between text-xs"
          style={{ color: 'var(--ink-dim)', borderTop: '1px solid var(--border)', paddingTop: 8 }}
        >
          <span className="flex items-center gap-1">
            <Maximize2 style={{ width: 10, height: 10 }} /> {l.area_sqft || '—'} sq.ft
          </span>
          <span>Floor {l.floor ?? '—'}</span>
          <span>Dep: {formatINR(l.security_deposit)}</span>
        </div>

        {/* Amenity icons */}
        {topAmenities.length > 0 && (
          <div className="flex items-center gap-1.5">
            {topAmenities.map(([key]) => {
              const Icon = AMENITY_ICONS[key] ?? Building2;
              return (
                <div
                  key={key}
                  className="w-6 h-6 rounded flex items-center justify-center"
                  title={key.replace(/_/g, ' ')}
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                >
                  <Icon style={{ width: 10, height: 10, color: 'var(--ink-dim)' }} />
                </div>
              );
            })}
            {Object.values(amenities).filter(Boolean).length > 4 && (
              <span className="text-xs" style={{ color: 'var(--ink-dim)' }}>
                +{Object.values(amenities).filter(Boolean).length - 4}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

/* ── Listing detail panel ───────────────────────────────────────────────── */
function ListingDetail({
  listing: l, onBack, onSignIn, onUpgrade,
}: {
  listing: Listing;
  onBack: () => void;
  onSignIn: () => void;
  onUpgrade: () => void;
}) {
  const availableNow = !l.available_from || new Date(l.available_from) <= new Date();
  const photos = l.photo_urls?.length ? l.photo_urls : [];
  const [activePhoto, setActivePhoto] = React.useState(0);
  const amenities = l.amenities || {};

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5 animate-fade-up">
      <button onClick={onBack} className="btn-ghost text-sm">
        ← Back to listings
      </button>

      {/* Photo carousel */}
      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {/* Main photo */}
        <div
          style={{
            height: 360,
            background: `linear-gradient(135deg, hsl(${(l.id.charCodeAt(0) * 47) % 360}, 25%, 12%) 0%, hsl(${((l.id.charCodeAt(0) * 47) + 60) % 360}, 20%, 8%) 100%)`,
            position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {photos.length > 0 ? (
            <img
              src={photos[activePhoto]}
              alt={l.property_name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
            />
          ) : (
            <Building2 style={{ width: 48, height: 48, color: 'rgba(255,255,255,0.1)' }} />
          )}
          {/* Badges */}
          <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: 'var(--accent)', fontSize: '0.6875rem', fontWeight: 700, color: '#000' }}>
            <Zap style={{ width: 10, height: 10 }} /> ZERO BROKERAGE
          </div>
          <div style={{ position: 'absolute', bottom: 12, right: 12, padding: '4px 10px', borderRadius: 6, background: availableNow ? 'var(--accent-dim)' : 'rgba(0,0,0,0.6)', fontSize: '0.6875rem', fontWeight: 600, color: availableNow ? 'var(--accent)' : 'var(--ink-dim)', border: `1px solid ${availableNow ? 'rgba(0,212,160,0.3)' : 'var(--border)'}`, backdropFilter: 'blur(8px)' }}>
            {formatAvailability(l.available_from)}
          </div>
          {/* Prev / Next arrows */}
          {photos.length > 1 && (
            <>
              <button
                onClick={() => setActivePhoto(i => (i - 1 + photos.length) % photos.length)}
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >‹</button>
              <button
                onClick={() => setActivePhoto(i => (i + 1) % photos.length)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >›</button>
              {/* Dot indicators */}
              <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
                {photos.map((_, i) => (
                  <button key={i} onClick={() => setActivePhoto(i)} style={{ width: i === activePhoto ? 18 : 6, height: 6, borderRadius: 3, background: i === activePhoto ? '#fff' : 'rgba(255,255,255,0.4)', border: 'none', cursor: 'pointer', transition: 'width 0.2s, background 0.2s', padding: 0 }} />
                ))}
              </div>
            </>
          )}
        </div>
        {/* Thumbnail strip */}
        {photos.length > 1 && (
          <div style={{ display: 'flex', gap: 4, padding: 6, background: 'var(--surface)' }}>
            {photos.map((url, i) => (
              <button
                key={i}
                onClick={() => setActivePhoto(i)}
                style={{ width: 64, height: 48, borderRadius: 6, overflow: 'hidden', flexShrink: 0, border: `2px solid ${i === activePhoto ? 'var(--primary)' : 'transparent'}`, padding: 0, cursor: 'pointer', transition: 'border-color 0.15s' }}
              >
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Title row */}
      <div className="flex flex-wrap gap-2 mb-2">
        <span className="badge-info">{formatUnitType(l.unit_type)}</span>
        <span className="badge-neutral">{formatFurnishing(l.furnishing)}</span>
        {(l.tags || []).slice(0, 2).map(t => <span key={t} className="badge-neutral">{t}</span>)}
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1
            style={{
              fontFamily: 'Syne, Inter, sans-serif', fontWeight: 700,
              fontSize: '1.25rem', letterSpacing: '-0.025em', color: 'var(--ink)',
            }}
          >
            {l.property_name}
          </h1>
          <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--ink-dim)' }}>
            <MapPin style={{ width: 11, height: 11, flexShrink: 0 }} />
            {l.locality}, {l.city}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 800, fontSize: '1.375rem', color: 'var(--ink)' }}>
            {formatINR(l.monthly_rent)}
            <span className="text-xs font-normal" style={{ color: 'var(--ink-dim)' }}>/mo</span>
          </p>
          <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>Deposit: {formatINR(l.security_deposit)}</p>
        </div>
      </div>

      {/* Membership CTA gate */}
      <div
        className="rounded-xl p-5 space-y-3 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(61,123,255,0.12) 0%, rgba(0,212,160,0.06) 100%)',
          border: '1px solid rgba(61,123,255,0.25)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'var(--primary-dim)' }}
          >
            <Lock style={{ width: 18, height: 18, color: 'var(--primary)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              Express interest in this property
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ink-dim)' }}>
              TenantOS Pro members can directly contact the landlord and skip the broker queue.
              Save{' '}
              <strong style={{ color: 'var(--accent)' }}>
                {formatINR(l.monthly_rent * 2)}
              </strong>{' '}
              in brokerage for just ₹999/year.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onUpgrade} className="btn-primary flex-1 justify-center py-2.5">
            <Zap style={{ width: 14, height: 14 }} /> Get Pro — ₹999/yr
          </button>
          <button onClick={onSignIn} className="btn-secondary px-3 py-2.5 text-xs">
            Sign In
          </button>
        </div>
      </div>

      {/* Quick facts */}
      <div className="card p-4 grid grid-cols-2 gap-3">
        {[
          { label: 'Type', value: formatUnitType(l.unit_type) },
          { label: 'Area', value: l.area_sqft ? `${l.area_sqft} sq.ft` : '—' },
          { label: 'Floor', value: l.floor != null ? `Floor ${l.floor}` : '—' },
          { label: 'Available', value: formatAvailability(l.available_from) },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>{label}</p>
            <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--ink)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Description */}
      {l.description && (
        <div className="card p-4 space-y-2">
          <h3 className="text-sm font-semibold" style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)' }}>
            About this place
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-dim)' }}>{l.description}</p>
        </div>
      )}

      {/* Amenities */}
      {Object.keys(amenities).length > 0 && (
        <div className="card p-4 space-y-3">
          <h3 className="text-sm font-semibold" style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)' }}>
            Amenities
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(amenities).map(([key, val]) => {
              const Icon = AMENITY_ICONS[key] ?? Building2;
              return (
                <div
                  key={key}
                  className="flex items-center gap-2 text-xs"
                  style={{ color: val ? 'var(--ink)' : 'var(--ink-dim)', opacity: val ? 1 : 0.4 }}
                >
                  <Icon style={{ width: 12, height: 12, flexShrink: 0 }} />
                  {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  {val && <CheckCircle2 style={{ width: 10, height: 10, color: 'var(--accent)', marginLeft: 'auto' }} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom CTA */}
      <button onClick={onUpgrade} className="btn-primary w-full justify-center py-3">
        <Zap style={{ width: 14, height: 14 }} />
        Get Pro Membership &amp; Express Interest
        <ArrowRight style={{ width: 16, height: 16 }} />
      </button>
    </div>
  );
}

export default function BrowseOnlyPage({ onBack, onSignIn, onUpgrade }: BrowseOnlyPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedType, setSelectedType] = useState<UnitType | 'all'>('all');
  const [selectedFurnishing, setSelectedFurnishing] = useState<Furnishing | 'all'>('all');
  const [maxRent, setMaxRent] = useState(100000);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchListings = async () => {
      try {
        const res = await api.get('/api/public/listings');
        const fetched = res.data.data.map((u: any) => ({
          id: u.id,
          property_name: u.property.name,
          locality: u.property.address_line1,
          city: u.property.city,
          unit_type: u.unit_type || 'apartment',
          furnishing: u.furnishing || 'semi',
          monthly_rent: u.monthly_rent,
          security_deposit: u.security_deposit,
          area_sqft: u.area_sqft || 0,
          floor: u.floor || 0,
          available_from: u.available_from || null,
          amenities: (u.property.amenities && typeof u.property.amenities === 'object' && !Array.isArray(u.property.amenities))
            ? u.property.amenities
            : {},
          tags: ['Verified', 'Zero Brokerage'],
          photo_urls: u.photo_urls || [],
          description: u.description || `A beautiful unit in ${u.property.address_line1 || ''}, ${u.property.city}. Zero brokerage.`,
        }));
        setListings(fetched);
      } catch (err) {
        console.error('Failed to load listings', err);
      } finally {
        setLoading(false);
      }
    };
    fetchListings();

    const el = document.getElementById('browse-scroll');
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 20);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll to top when entering detail view
  React.useEffect(() => {
    if (selectedListing) {
      const el = document.getElementById('browse-scroll');
      if (el) el.scrollTop = 0;
    }
  }, [selectedListing]);

  const filtered = useMemo(() => listings.filter(l => {
    if (selectedCity !== 'All Cities' && l.city !== selectedCity) return false;
    if (selectedType !== 'all' && l.unit_type !== selectedType) return false;
    if (selectedFurnishing !== 'all' && l.furnishing !== selectedFurnishing) return false;
    if (l.monthly_rent > maxRent) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (l.locality || '').toLowerCase().includes(q) || l.city.toLowerCase().includes(q) || l.property_name.toLowerCase().includes(q);
    }
    return true;
  }), [listings, searchQuery, selectedCity, selectedType, selectedFurnishing, maxRent]);

  const clearFilters = () => {
    setSelectedCity('All Cities'); setSelectedType('all');
    setSelectedFurnishing('all'); setMaxRent(100000); setSearchQuery('');
  };
  const hasFilters = selectedCity !== 'All Cities' || selectedType !== 'all' || selectedFurnishing !== 'all' || maxRent !== 100000 || searchQuery;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 px-5 py-3.5 flex items-center justify-between transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(8,9,12,0.9)' : 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
        }}
      >
        <div className="flex items-center gap-2">
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary)', boxShadow: '0 0 10px var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 800, fontSize: 14, color: '#fff' }}>T</span>
          </div>
          <span style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            TenantOS
          </span>
          <span style={{ color: 'var(--border)', margin: '0 4px' }}>·</span>
          <span className="text-xs" style={{ color: 'var(--ink-dim)' }}>Find a Home</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="btn-ghost text-xs hidden sm:flex">
            <Home style={{ width: 14, height: 14 }} /> Home
          </button>
          <button onClick={onSignIn} className="btn-secondary py-1.5 px-3 text-xs">
            <User style={{ width: 12, height: 12 }} /> Sign In
          </button>
          <button onClick={onUpgrade} className="btn-primary py-1.5 px-3 text-xs">
            <Zap style={{ width: 12, height: 12 }} /> Get Pro
          </button>
        </div>
      </header>

      {/* Zero-brokerage nudge banner */}
      <div
        style={{
          background: 'var(--accent-dim)',
          borderBottom: '1px solid rgba(0,212,160,0.2)',
          padding: '10px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}
      >
        <p className="text-xs" style={{ color: 'var(--ink)' }}>
          <span className="font-semibold" style={{ color: 'var(--accent)' }}>Zero brokerage</span>
          {' '}— All listings here are direct from landlords. No broker fees. Get Pro access for just{' '}
          <strong>₹999/year</strong>.
        </p>
        <button
          onClick={onUpgrade}
          className="text-xs font-semibold flex items-center gap-1 shrink-0"
          style={{ color: 'var(--accent)' }}
        >
          Upgrade <ArrowRight style={{ width: 12, height: 12 }} />
        </button>
      </div>

      {/* Main scroll area */}
      <div id="browse-scroll" className="flex-1 overflow-y-auto">
        {selectedListing ? (
          <ListingDetail
            listing={selectedListing}
            onBack={() => setSelectedListing(null)}
            onSignIn={() => { setSelectedListing(null); onSignIn(); }}
            onUpgrade={() => { setSelectedListing(null); onUpgrade(); }}
          />
        ) : (
          <>
            {/* Search + filters */}
            <div
              className="px-5 py-5"
              style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
            >
              <div className="max-w-4xl mx-auto space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 700, fontSize: '1rem', color: 'var(--ink)' }}>
                      Find your next home
                    </h1>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ink-dim)' }}>
                      {filtered.length} verified zero-brokerage listings
                    </p>
                  </div>
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
                  >
                    <Zap style={{ width: 10, height: 10, display: 'inline', marginRight: 4 }} />
                    {filtered.length} listings
                  </span>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ink-dim)' }} />
                  <input
                    type="text"
                    placeholder="Search by city, locality, or property name..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="input pl-9"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--ink-dim)' }}
                    >
                      <X style={{ width: 14, height: 14 }} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                  <select
                    value={selectedCity}
                    onChange={e => setSelectedCity(e.target.value)}
                    className="input py-2 px-3 text-xs w-full sm:w-auto"
                  >
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select
                    value={selectedType}
                    onChange={e => setSelectedType(e.target.value as UnitType | 'all')}
                    className="input py-2 px-3 text-xs w-full sm:w-auto"
                  >
                    {UNIT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <select
                    value={selectedFurnishing}
                    onChange={e => setSelectedFurnishing(e.target.value as Furnishing | 'all')}
                    className="input py-2 px-3 text-xs w-full sm:w-auto"
                  >
                    {FURNISHING_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                  <select
                    value={maxRent}
                    onChange={e => setMaxRent(Number(e.target.value))}
                    className="input py-2 px-3 text-xs w-full sm:w-auto"
                  >
                    {[10000, 15000, 20000, 30000, 40000, 50000, 75000, 100000].map(v => (
                      <option key={v} value={v}>
                        Max {v >= 100000 ? 'Any' : `₹${v / 1000}k`}
                      </option>
                    ))}
                  </select>
                  {hasFilters && (
                    <button
                      onClick={clearFilters}
                      className="col-span-2 sm:col-span-1 text-xs font-medium text-left transition-colors"
                      style={{ color: 'var(--primary)' }}
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Listings grid */}
            <div className="max-w-6xl mx-auto px-5 py-6">
              {loading ? (
                <div className="text-center py-20 space-y-3">
                  <div className="w-8 h-8 rounded-full border-2 border-transparent border-t-[var(--primary)] border-r-[var(--primary)] animate-spin mx-auto" />
                  <p className="font-medium" style={{ color: 'var(--ink-dim)' }}>Loading listings...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-20 space-y-3">
                  <Building2 style={{ width: 40, height: 40, color: 'var(--border)', margin: '0 auto' }} />
                  <p className="font-medium" style={{ color: 'var(--ink-dim)' }}>No listings match your filters</p>
                  <button onClick={clearFilters} className="btn-secondary text-xs">Clear filters</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filtered.map((l, i) => (
                    <ListingCard
                      key={l.id}
                      listing={l}
                      onClick={() => setSelectedListing(l)}
                      index={i}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
