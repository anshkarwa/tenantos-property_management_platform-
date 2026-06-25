import React, { useState, useRef } from 'react';
import {
  Building2, Home, IndianRupee, Wifi, Car, Shield,
  Dumbbell, Zap, Droplets, Wind, CheckCircle2, ArrowRight,
  ArrowLeft, Users, Check, X, ImagePlus, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';

interface ListingWizardPageProps {
  onBack: () => void;
  onSuccess: () => void;
}

type UnitType = 'studio' | '1bhk' | '2bhk' | '3bhk' | 'pg';
type Furnishing = 'furnished' | 'semi' | 'unfurnished';

interface WizardState {
  // Step 1 — Property basics
  unitType: UnitType | '';
  floor: string;
  areaSqft: string;
  furnishing: Furnishing | '';
  city: string;
  locality: string;
  address: string;
  // Step 2 — Rent & deposit
  monthlyRent: string;
  securityDeposit: string;
  availableFrom: string;
  // Step 3 — Amenities
  amenities: Record<string, boolean>;
  // Step 4 — Tenant preference
  preferences: string[];
  description: string;
}

const UNIT_TYPES: { value: UnitType; label: string }[] = [
  { value: 'studio', label: 'Studio' },
  { value: '1bhk',   label: '1 BHK' },
  { value: '2bhk',   label: '2 BHK' },
  { value: '3bhk',   label: '3 BHK' },
  { value: 'pg',     label: 'PG / Room' },
];

const FURNISHINGS: { value: Furnishing; label: string; desc: string }[] = [
  { value: 'furnished',   label: 'Furnished',      desc: 'Beds, wardrobes, appliances' },
  { value: 'semi',        label: 'Semi-Furnished',  desc: 'Wardrobes, fans, geysers' },
  { value: 'unfurnished', label: 'Unfurnished',     desc: 'Empty shell, fixtures only' },
];

const AMENITIES = [
  { key: 'parking',   label: 'Parking',       icon: Car },
  { key: 'lift',      label: 'Lift / Elevator', icon: Building2 },
  { key: 'generator', label: 'Power Backup',   icon: Zap },
  { key: 'security',  label: '24hr Security',  icon: Shield },
  { key: 'gym',       label: 'Gym',            icon: Dumbbell },
  { key: 'wifi',      label: 'WiFi Ready',     icon: Wifi },
  { key: 'ac',        label: 'AC Fitted',      icon: Wind },
  { key: 'water_24h', label: '24hr Water',     icon: Droplets },
];

const TENANT_PREFS = [
  'Family', 'Working Professionals', 'Single Professional',
  'Couple', 'Student', 'Female Only', 'Male Only',
  'IT Professionals', 'Senior Executive',
];

const STEP_LABELS = [
  'Property', 'Rent', 'Amenities', 'Preferences', 'Review',
];

const CITIES = ['Bangalore', 'Mumbai', 'Pune', 'Hyderabad', 'Ahmedabad', 'Delhi', 'Chennai', 'Kolkata'];

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function ListingWizardPage({ onBack, onSuccess }: ListingWizardPageProps) {
  const [step, setStep] = useState(1);
  const [published, setPublished] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<WizardState>({
    unitType: '', floor: '', areaSqft: '', furnishing: '',
    city: 'Bangalore', locality: '', address: '',
    monthlyRent: '', securityDeposit: '', availableFrom: '',
    amenities: Object.fromEntries(AMENITIES.map(a => [a.key, false])),
    preferences: [], description: '',
  });

  const set = (key: keyof WizardState, val: any) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const toggleAmenity = (key: string) =>
    setForm(prev => ({ ...prev, amenities: { ...prev.amenities, [key]: !prev.amenities[key] } }));

  const togglePref = (pref: string) =>
    setForm(prev => ({
      ...prev,
      preferences: prev.preferences.includes(pref)
        ? prev.preferences.filter(p => p !== pref)
        : [...prev.preferences, pref],
    }));

  const canProceed = () => {
    if (step === 1) return form.unitType && form.floor && form.areaSqft && form.furnishing && form.city && form.locality;
    if (step === 2) return form.monthlyRent && form.availableFrom;
    if (step === 3) return true;
    if (step === 4) return form.preferences.length > 0;
    return true;
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoUrls.length >= 6) { toast.error('Maximum 6 photos allowed'); return; }
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/api/upload/property-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPhotoUrls(prev => [...prev, res.data.data.url]);
      toast.success('Photo uploaded');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Photo upload failed');
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      // 1. Create property
      const propRes = await api.post('/api/properties', {
        name: `${form.unitType.toUpperCase()} at ${form.locality}`,
        address_line1: form.address || form.locality,
        city: form.city,
        state: 'Maharashtra', // default — can be made a form field later
        pincode: '400001',    // default
        property_type: 'residential',
        total_units: 1,
        amenities: form.amenities,
      });
      const propertyId: string = propRes.data.data.id;

      // 2. Create unit
      await api.post(`/api/properties/${propertyId}/units`, {
        unit_number: 'Unit 1',
        unit_type: form.unitType,
        floor: parseInt(form.floor) || 0,
        area_sqft: parseFloat(form.areaSqft) || undefined,
        monthly_rent: parseFloat(form.monthlyRent),
        security_deposit: parseFloat(form.securityDeposit) || parseFloat(form.monthlyRent) * 3,
        furnishing: form.furnishing,
        amenities: form.amenities,
        status: 'vacant',
        is_published: true,
        photo_urls: photoUrls,
        description: form.description,
        preferred_tenants: form.preferences,
        available_from: form.availableFrom || undefined,
      });

      setPublished(true);
      toast.success('Your listing is live!');
      setTimeout(onSuccess, 2000);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to publish listing');
    } finally {
      setPublishing(false);
    }
  };

  const rent = Number(form.monthlyRent);
  const suggestedDeposit = rent * 3;

  if (published) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
        <div className="text-center space-y-5 max-w-sm animate-scale-in">
          <div
            className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
            style={{ background: 'var(--accent-dim)', border: '3px solid var(--accent)', boxShadow: '0 0 32px rgba(0,212,160,0.4)' }}
          >
            <CheckCircle2 className="w-9 h-9" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h1 style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 800, fontSize: '1.5rem', color: 'var(--ink)', letterSpacing: '-0.03em' }}>
              Listing Published!
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>
              Your property is now visible to thousands of verified tenants on TenantOS.
            </p>
          </div>
          <div className="card p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span style={{ color: 'var(--ink-dim)' }}>Listing ID</span>
              <span className="font-mono font-semibold" style={{ color: 'var(--primary)' }}>LST-{Date.now().toString().slice(-6)}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--ink-dim)' }}>Status</span>
              <span className="badge-success">Live</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--ink-dim)' }}>Brokerage</span>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Zero ✓</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 px-5 py-3.5 flex items-center gap-3"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <button onClick={step === 1 ? onBack : () => setStep(s => s - 1)} className="btn-icon">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <span style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--ink)' }}>
            List Your Property
          </span>
          <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>
            Step {step} of 5 — {STEP_LABELS[step - 1]}
          </p>
        </div>
        <button onClick={onBack} className="btn-icon">
          <X className="w-4 h-4" />
        </button>
      </header>

      {/* Progress bar */}
      <div style={{ background: 'var(--border)', height: 3 }}>
        <div
          style={{
            height: '100%',
            width: `${(step / 5) * 100}%`,
            background: 'var(--primary)',
            boxShadow: '0 0 8px var(--primary-glow)',
            transition: 'width 0.4s cubic-bezier(0.22,1,0.36,1)',
          }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2 py-4 px-5" style={{ borderBottom: '1px solid var(--border)' }}>
        {STEP_LABELS.map((label, i) => {
          const num = i + 1;
          const done = num < step;
          const active = num === step;
          return (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center gap-1">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                  style={{
                    background: done ? 'var(--accent)' : active ? 'var(--primary)' : 'var(--border)',
                    color: done || active ? '#fff' : 'var(--ink-dim)',
                    boxShadow: active ? '0 0 12px var(--primary-glow)' : done ? '0 0 8px rgba(0,212,160,0.3)' : 'none',
                  }}
                >
                  {done ? <Check className="w-3.5 h-3.5" /> : num}
                </div>
                <span className="text-xs hidden sm:block" style={{ color: active ? 'var(--ink)' : 'var(--ink-dim)' }}>
                  {label}
                </span>
              </div>
              {i < 4 && (
                <div
                  className="flex-1 h-0.5 max-w-[40px]"
                  style={{ background: done ? 'var(--accent)' : 'var(--border)', transition: 'background 0.3s' }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Form area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-5 py-8 space-y-6">

          {/* ── Step 1: Property basics ─────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-up">
              <div>
                <h2 style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 700, fontSize: '1.125rem', color: 'var(--ink)' }}>
                  Tell us about your property
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>Basic details about the unit you want to list.</p>
              </div>

              {/* Unit type */}
              <div>
                <label className="input-label">Unit Type</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {UNIT_TYPES.map(u => (
                    <button
                      key={u.value}
                      type="button"
                      onClick={() => set('unitType', u.value)}
                      className="py-2 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: form.unitType === u.value ? 'var(--primary-dim)' : 'var(--surface)',
                        border: `1px solid ${form.unitType === u.value ? 'var(--primary)' : 'var(--border)'}`,
                        color: form.unitType === u.value ? 'var(--primary)' : 'var(--ink-dim)',
                      }}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Furnishing */}
              <div>
                <label className="input-label">Furnishing</label>
                <div className="space-y-2">
                  {FURNISHINGS.map(f => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => set('furnishing', f.value)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all"
                      style={{
                        background: form.furnishing === f.value ? 'var(--primary-dim)' : 'var(--surface)',
                        border: `1px solid ${form.furnishing === f.value ? 'var(--primary)' : 'var(--border)'}`,
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                        style={{ borderColor: form.furnishing === f.value ? 'var(--primary)' : 'var(--ink-dim)' }}
                      >
                        {form.furnishing === f.value && (
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--primary)' }} />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{f.label}</p>
                        <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>{f.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Floor</label>
                  <input type="number" min={0} max={50} value={form.floor}
                    onChange={e => set('floor', e.target.value)}
                    placeholder="e.g. 3" className="input" />
                </div>
                <div>
                  <label className="input-label">Area (sq.ft)</label>
                  <input type="number" min={100} value={form.areaSqft}
                    onChange={e => set('areaSqft', e.target.value)}
                    placeholder="e.g. 950" className="input" />
                </div>
              </div>

              <div>
                <label className="input-label">City</label>
                <select value={form.city} onChange={e => set('city', e.target.value)} className="input">
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">Locality / Area</label>
                <input type="text" value={form.locality} onChange={e => set('locality', e.target.value)}
                  placeholder="e.g. Koramangala" className="input" />
              </div>
              <div>
                <label className="input-label">Full Address</label>
                <input type="text" value={form.address} onChange={e => set('address', e.target.value)}
                  placeholder="Building name, street, pincode" className="input" />
              </div>
            </div>
          )}

          {/* ── Step 2: Rent & deposit ─────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-up">
              <div>
                <h2 style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 700, fontSize: '1.125rem', color: 'var(--ink)' }}>
                  Pricing details
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>Set fair rent and see your brokerage savings.</p>
              </div>

              <div>
                <label className="input-label">Monthly Rent (₹)</label>
                <input type="number" min={1000} value={form.monthlyRent}
                  onChange={e => set('monthlyRent', e.target.value)}
                  placeholder="e.g. 25000" className="input" />
              </div>

              {rent > 0 && (
                <div
                  className="rounded-lg p-4 space-y-2 animate-fade-up"
                  style={{ background: 'var(--accent-dim)', border: '1px solid rgba(0,212,160,0.2)' }}
                >
                  <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                    💰 Zero-Brokerage Savings
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--ink-dim)' }}>Traditional broker would charge</span>
                    <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                      {formatINR(rent * 2)} (2 months)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--ink-dim)' }}>Tenant pays TenantOS</span>
                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>₹999/year</span>
                  </div>
                  <div className="divider" style={{ borderColor: 'rgba(0,212,160,0.2)' }} />
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span style={{ color: 'var(--ink)' }}>Tenant saves</span>
                    <span style={{ color: 'var(--accent)' }}>{formatINR(rent * 2 - 999)} ✓</span>
                  </div>
                </div>
              )}

              <div>
                <label className="input-label">
                  Security Deposit (₹)
                  {rent > 0 && (
                    <button
                      type="button"
                      className="ml-2 text-xs"
                      style={{ color: 'var(--primary)' }}
                      onClick={() => set('securityDeposit', String(suggestedDeposit))}
                    >
                      Use suggested ({formatINR(suggestedDeposit)})
                    </button>
                  )}
                </label>
                <input type="number" min={0} value={form.securityDeposit}
                  onChange={e => set('securityDeposit', e.target.value)}
                  placeholder="e.g. 75000" className="input" />
                <p className="text-xs mt-1" style={{ color: 'var(--ink-dim)' }}>
                  Held in TenantOS Deposit Vault — refunded at lease end
                </p>
              </div>

              <div>
                <label className="input-label">Available From</label>
                <input type="date" value={form.availableFrom}
                  onChange={e => set('availableFrom', e.target.value)} className="input" />
              </div>
            </div>
          )}

          {/* ── Step 3: Amenities ─────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5 animate-fade-up">
              <div>
                <h2 style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 700, fontSize: '1.125rem', color: 'var(--ink)' }}>
                  Amenities
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>
                  Select all amenities available in your building/society.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {AMENITIES.map(a => {
                  const Icon = a.icon;
                  const on = form.amenities[a.key];
                  return (
                    <button
                      key={a.key}
                      type="button"
                      onClick={() => toggleAmenity(a.key)}
                      className="flex items-center gap-3 p-3 rounded-lg text-left transition-all"
                      style={{
                        background: on ? 'var(--accent-dim)' : 'var(--surface)',
                        border: `1px solid ${on ? 'rgba(0,212,160,0.3)' : 'var(--border)'}`,
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: on ? 'rgba(0,212,160,0.15)' : 'var(--bg)' }}
                      >
                        <Icon className="w-4 h-4" style={{ color: on ? 'var(--accent)' : 'var(--ink-dim)' }} />
                      </div>
                      <span className="text-sm font-medium" style={{ color: on ? 'var(--ink)' : 'var(--ink-dim)' }}>
                        {a.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Photo upload */}
              <div>
                <h3 className="text-sm font-semibold mb-2" style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)' }}>
                  Property Photos <span className="font-normal text-xs" style={{ color: 'var(--ink-dim)' }}>(optional, max 6)</span>
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {photoUrls.map((url, i) => (
                    <div key={i} className="relative rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                      <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => setPhotoUrls(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.6)' }}
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  {photoUrls.length < 6 && (
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="rounded-lg flex flex-col items-center justify-center gap-1.5 transition-all"
                      style={{ aspectRatio: '4/3', background: 'var(--bg)', border: '1.5px dashed var(--border)' }}
                    >
                      {uploadingPhoto
                        ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--primary)' }} />
                        : <ImagePlus className="w-5 h-5" style={{ color: 'var(--ink-dim)' }} />
                      }
                      <span className="text-xs" style={{ color: 'var(--ink-dim)' }}>
                        {uploadingPhoto ? 'Uploading…' : 'Add photo'}
                      </span>
                    </button>
                  )}
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>
            </div>
          )}

          {/* ── Step 4: Preferences ───────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-5 animate-fade-up">
              <div>
                <h2 style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 700, fontSize: '1.125rem', color: 'var(--ink)' }}>
                  Preferred tenants
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>
                  Who would you ideally like in your property? (Select all that apply)
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {TENANT_PREFS.map(pref => {
                  const selected = form.preferences.includes(pref);
                  return (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => togglePref(pref)}
                      className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                      style={{
                        background: selected ? 'var(--primary-dim)' : 'var(--surface)',
                        border: `1px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                        color: selected ? 'var(--primary)' : 'var(--ink-dim)',
                      }}
                    >
                      {selected && <Check className="w-3 h-3 inline mr-1" />}
                      {pref}
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="input-label">Property description</label>
                <textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Describe the flat, neighbourhood, nearby landmarks, and any special features..."
                  rows={4}
                  className="input resize-none"
                />
              </div>
            </div>
          )}

          {/* ── Step 5: Review & Publish ──────────────────────────────── */}
          {step === 5 && (
            <div className="space-y-5 animate-fade-up">
              <div>
                <h2 style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 700, fontSize: '1.125rem', color: 'var(--ink)' }}>
                  Review your listing
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>
                  Double-check everything before publishing.
                </p>
              </div>

              {/* Summary card */}
              <div className="card p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 700, fontSize: '1.125rem', color: 'var(--ink)' }}
                    >
                      {form.unitType.toUpperCase()} · {form.locality}, {form.city}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ink-dim)' }}>Floor {form.floor} · {form.areaSqft} sq.ft</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 700, fontSize: '1.25rem', color: 'var(--ink)' }}
                    >
                      {form.monthlyRent ? formatINR(Number(form.monthlyRent)) : '—'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>/month</p>
                  </div>
                </div>

                <div className="divider" />

                <div className="grid grid-cols-2 gap-3 text-xs">
                  {[
                    { l: 'Furnishing', v: form.furnishing || '—' },
                    { l: 'Deposit', v: form.securityDeposit ? formatINR(Number(form.securityDeposit)) : '—' },
                    { l: 'Available', v: form.availableFrom ? new Date(form.availableFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—' },
                    { l: 'Preferred', v: form.preferences.slice(0, 2).join(', ') || '—' },
                  ].map(({ l, v }) => (
                    <div key={l}>
                      <p style={{ color: 'var(--ink-dim)' }}>{l}</p>
                      <p className="font-medium mt-0.5 capitalize" style={{ color: 'var(--ink)' }}>{v}</p>
                    </div>
                  ))}
                </div>

                {/* Amenity pills */}
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(form.amenities)
                    .filter(([, on]) => on)
                    .map(([key]) => {
                      const a = AMENITIES.find(am => am.key === key)!;
                      return (
                        <span key={key} className="badge-success text-xs">
                          {a.label}
                        </span>
                      );
                    })}
                </div>
              </div>

              {/* Zero-brokerage badge */}
              <div
                className="rounded-xl p-4 flex items-center gap-3"
                style={{ background: 'var(--accent-dim)', border: '1px solid rgba(0,212,160,0.2)' }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'var(--accent)', boxShadow: '0 0 12px rgba(0,212,160,0.4)' }}
                >
                  <CheckCircle2 className="w-5 h-5 text-black" />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                    Zero Brokerage Listing
                  </p>
                  <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>
                    Tenants will see a "Zero Brokerage" badge — attracting more qualified applicants.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 pt-2">
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)} className="btn-secondary flex-1">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}
            {step < 5 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                className="btn-primary flex-1"
                disabled={!canProceed()}
                style={!canProceed() ? { opacity: 0.4 } : {}}
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handlePublish} disabled={publishing} className="btn-primary flex-1 justify-center py-3 flex items-center gap-2">
                {publishing && <Loader2 className="w-4 h-4 animate-spin" />}
                Publish Listing <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
