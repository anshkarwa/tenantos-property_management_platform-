import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { formatPhone } from '../../utils/format';
import {
  UserPlus, Search, CheckCircle2, MessageCircle, ShieldAlert,
  SlidersHorizontal, X, ShieldCheck, Shield, Upload,
  Phone, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import WhatsAppNotifier from '../../components/WhatsAppNotifier';

/* ── Types ────────────────────────────────────────────────────────────────── */
interface Tenant {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  aadhaar_verified: boolean;
  police_verification_status: 'not_started' | 'pending' | 'verified' | 'rejected';
  id_proof_type: string | null;
  emergency_contact: { name: string; phone: string; relation: string } | null;
  notes: string | null;
  membership_tier: string;
  is_flagged: boolean;
  created_at: string;
  // enriched
  unit: string | null;
  property: string | null;
  lease_status: 'active' | 'notice' | 'no_lease';
  monthly_rent: number;
}

/* ── Avatar ───────────────────────────────────────────────────────────────── */
const AVATAR_PALETTES = [
  { bg: 'rgba(61,123,255,0.15)',  color: '#3D7BFF' },
  { bg: 'rgba(0,212,160,0.15)',   color: '#00D4A0' },
  { bg: 'rgba(245,158,11,0.15)',  color: '#F59E0B' },
  { bg: 'rgba(255,77,109,0.15)',  color: '#FF4D6D' },
  { bg: 'rgba(139,92,246,0.15)',  color: '#8B5CF6' },
  { bg: 'rgba(20,184,166,0.15)',  color: '#14B8A6' },
];

function getAvatarPalette(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTES[hash % AVATAR_PALETTES.length];
}

function TenantAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const { bg, color } = getAvatarPalette(name);
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0" style={{ background: bg, color }}>
      {initials}
    </div>
  );
}

function PoliceVerificationBadge({ status }: { status: string }) {
  if (status === 'verified') return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
      <ShieldCheck className="w-3 h-3" /> Verified
    </span>
  );
  if (status === 'pending') return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
      <Shield className="w-3 h-3" /> Pending
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
      <AlertTriangle className="w-3 h-3" /> Not Done
    </span>
  );
}

function LeaseStatusBadge({ status }: { status: string }) {
  if (status === 'active')  return <span className="badge-success">Active</span>;
  if (status === 'notice')  return <span className="badge-warning">Notice</span>;
  return <span className="badge-neutral">No Lease</span>;
}

/* ── Police Verification Modal ────────────────────────────────────────────── */
function PoliceVerificationModal({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const [idType, setIdType] = useState<string>(tenant.id_proof_type || 'aadhaar');
  const [uploaded, setUploaded] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(`Police verification request sent for ${tenant.name}! Documents submitted.`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl overflow-hidden animate-modal-pop"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
              <ShieldCheck className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            </div>
            <div>
              <h3 className="font-bold text-base" style={{ color: 'var(--ink)', fontFamily: 'Syne, Inter, sans-serif' }}>Police Verification</h3>
              <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>{tenant.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl" style={{ color: 'var(--ink-dim)', background: 'var(--bg)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: 'var(--ink)' }}>
            <p className="font-semibold mb-0.5">⚠ Legally Mandatory in Most Indian Cities</p>
            <p style={{ color: 'var(--ink-dim)' }}>Submit tenant's identity and address proof to the nearest police station for tenant verification.</p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
            <span className="text-sm" style={{ color: 'var(--ink-dim)' }}>Current Status</span>
            <PoliceVerificationBadge status={tenant.police_verification_status} />
          </div>

          <div>
            <label className="input-label">ID Proof Type</label>
            <select value={idType} onChange={(e) => setIdType(e.target.value)} className="input">
              <option value="aadhaar">Aadhaar Card</option>
              <option value="voter_id">Voter ID Card</option>
              <option value="passport">Passport</option>
              <option value="driving_licence">Driving Licence</option>
            </select>
          </div>

          <div>
            <label className="input-label">Upload Documents</label>
            <div
              className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all"
              style={{ borderColor: uploaded ? 'var(--primary)' : 'var(--border)', background: uploaded ? 'rgba(99,102,241,0.04)' : 'var(--bg)' }}
              onClick={() => { setUploaded(true); toast.success('Documents uploaded (demo)'); }}
            >
              {uploaded ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--primary)' }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--primary)' }}>Documents uploaded!</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8" style={{ color: 'var(--ink-dim)' }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Click to upload ID & address proof</p>
                  <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>PDF, JPG or PNG up to 5 MB each</p>
                </div>
              )}
            </div>
          </div>

          {tenant.emergency_contact && (
            <div className="p-3 rounded-xl" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--ink-dim)' }}>Emergency Contact on Record</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                {tenant.emergency_contact.name}
                <span className="text-xs font-normal ml-1" style={{ color: 'var(--ink-dim)' }}>({tenant.emergency_contact.relation})</span>
              </p>
              <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--ink-dim)' }}>{tenant.emergency_contact.phone}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">
              <ShieldCheck className="w-4 h-4" /> Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────────── */
export default function TenantsPage() {
  const { t } = useTranslation();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [policeVerifyTenant, setPoliceVerifyTenant] = useState<Tenant | null>(null);
  const [whatsappTarget, setWhatsappTarget] = useState<Tenant | null>(null);
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [tenantProfession, setTenantProfession] = useState('');

  useEffect(() => {
    api.get('/api/tenants')
      .then(r => setTenants(r.data.data || []))
      .catch(() => toast.error('Failed to load tenants'))
      .finally(() => setLoading(false));
  }, []);

  const filteredTenants = tenants.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.phone.includes(searchQuery) ||
    (t.unit?.toLowerCase() ?? '').includes(searchQuery.toLowerCase())
  );

  const verificationSummary = {
    verified:    tenants.filter(t => t.police_verification_status === 'verified').length,
    pending:     tenants.filter(t => t.police_verification_status === 'pending').length,
    not_started: tenants.filter(t => t.police_verification_status === 'not_started').length,
  };

  const handleAddTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantName || !tenantPhone) { toast.error('Name and Phone are required.'); return; }
    const phone = tenantPhone.startsWith('+91') ? tenantPhone : `+91${tenantPhone.replace(/\D/g, '')}`;
    try {
      const res = await api.post('/api/tenants', {
        name: tenantName,
        phone,
        email: tenantEmail || undefined,
        profession: tenantProfession || undefined,
      });
      setTenants(prev => [res.data.data, ...prev]);
      toast.success(`Tenant ${tenantName} registered! WhatsApp invite sent. 🎉`);
      setShowAddForm(false);
      setTenantName(''); setTenantPhone(''); setTenantEmail(''); setTenantProfession('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to add tenant');
    }
  };

  return (
    <div className="space-y-5 page-enter">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            {t('tenants.title')}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>{t('tenants.subtitle')}</p>
        </div>
        <button onClick={() => setShowAddForm(true)} className="btn-primary animate-fade-up delay-100">
          <UserPlus className="w-4 h-4" /> {t('tenants.add')}
        </button>
      </div>

      {/* ── Police Verification Summary ──────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 animate-fade-up delay-100">
        {[
          { label: 'Police Verified', count: verificationSummary.verified,    color: '#22c55e', bg: 'rgba(34,197,94,0.08)',   icon: ShieldCheck },
          { label: 'Pending Docs',    count: verificationSummary.pending,     color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  icon: Shield },
          { label: 'Not Started',     count: verificationSummary.not_started, color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   icon: AlertTriangle },
        ].map(({ label, count, color, bg, icon: Icon }) => (
          <div key={label} className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                <Icon className="w-3.5 h-3.5" style={{ color }} />
              </div>
              <span className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>{count}</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between animate-fade-up delay-150">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ink-dim)' }} />
          <input type="text" placeholder="Search by name, phone or unit..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)} className="input pl-9" />
        </div>
        <button className="btn-secondary w-full md:w-auto">
          <SlidersHorizontal className="w-4 h-4" /> {t('common.filter')}
        </button>
      </div>

      {/* ── Loading Skeleton ─────────────────────────────────────────────── */}
      {loading && (
        <div className="table-container hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Tenant', 'Unit / Property', 'Aadhaar KYC', 'Police Verif.', 'Lease Status', 'Monthly Rent', 'Actions'].map(h => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl skeleton shrink-0" />
                        <div className="space-y-1.5"><div className="h-3.5 w-28 skeleton rounded" /><div className="h-3 w-20 skeleton rounded" /></div>
                      </div>
                    </td>
                    {[24, 20, 20, 16, 16, 10].map((w, j) => (
                      <td key={j} className="table-cell"><div className={`h-3.5 w-${w} skeleton rounded`} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && (
        <>
          {/* Mobile Cards */}
          <div className="flex flex-col gap-3 md:hidden animate-fade-up delay-200">
            {filteredTenants.map((tenant, i) => (
              <div key={tenant.id} className="p-4 rounded-xl space-y-3"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', animationDelay: `${i * 40}ms` }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <TenantAvatar name={tenant.name} />
                    <div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{tenant.name}</p>
                      <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>{formatPhone(tenant.phone)}</p>
                    </div>
                  </div>
                  <LeaseStatusBadge status={tenant.lease_status} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--ink-dim)' }}>
                    {tenant.unit ?? '—'} {tenant.property ? `· ${tenant.property}` : ''}
                  </span>
                  <div className="flex items-center gap-1">
                    {tenant.aadhaar_verified
                      ? <span className="badge-success inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> KYC</span>
                      : <span className="badge-warning inline-flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> KYC</span>
                    }
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <PoliceVerificationBadge status={tenant.police_verification_status} />
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setWhatsappTarget(tenant)} className="btn-icon" title="WhatsApp">
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button onClick={() => setPoliceVerifyTenant(tenant)} className="btn-icon" title="Police Verification">
                      <ShieldCheck className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="table-container animate-fade-up delay-200 hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] border-collapse">
                <thead>
                  <tr>
                    <th className="table-header">Tenant</th>
                    <th className="table-header">Unit / Property</th>
                    <th className="table-header">Aadhaar KYC</th>
                    <th className="table-header">Police Verif.</th>
                    <th className="table-header">Lease Status</th>
                    <th className="table-header">Monthly Rent</th>
                    <th className="table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTenants.length > 0 ? filteredTenants.map((tenant, i) => (
                    <tr key={tenant.id} className="table-row"
                      style={{ animation: 'fadeUp 0.3s cubic-bezier(0.22,1,0.36,1) both', animationDelay: `${i * 40}ms` }}>
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <TenantAvatar name={tenant.name} />
                          <div>
                            <div className="font-medium text-sm" style={{ color: 'var(--ink)' }}>{tenant.name}</div>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--ink-dim)' }}>{formatPhone(tenant.phone)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="font-medium text-sm" style={{ color: 'var(--ink)' }}>{tenant.unit ? `Property ${tenant.unit.replace('Unit ', '')}` : '—'}</div>
                        <div className="text-xs" style={{ color: 'var(--ink-dim)' }}>{tenant.property ?? '—'}</div>
                      </td>
                      <td className="table-cell">
                        {tenant.aadhaar_verified
                          ? <span className="badge-success inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Verified</span>
                          : <span className="badge-warning inline-flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Pending</span>
                        }
                      </td>
                      <td className="table-cell">
                        <PoliceVerificationBadge status={tenant.police_verification_status} />
                      </td>
                      <td className="table-cell">
                        <LeaseStatusBadge status={tenant.lease_status} />
                      </td>
                      <td className="table-cell">
                        <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                          {tenant.monthly_rent > 0 ? `₹${tenant.monthly_rent.toLocaleString('en-IN')}` : '—'}
                        </span>
                      </td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setWhatsappTarget(tenant)} className="btn-icon" title="Send WhatsApp">
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => setPoliceVerifyTenant(tenant)} className="btn-icon" title="Police Verification">
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="table-cell text-center py-16 text-sm" style={{ color: 'var(--ink-dim)' }}>
                        {searchQuery ? 'No tenants match your search' : 'No tenants yet. Add your first tenant!'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Police Verification Modal ────────────────────────────────────── */}
      {policeVerifyTenant && (
        <PoliceVerificationModal tenant={policeVerifyTenant} onClose={() => setPoliceVerifyTenant(null)} />
      )}

      {/* ── WhatsApp Notifier ────────────────────────────────────────────── */}
      {whatsappTarget && (
        <WhatsAppNotifier
          notification={{
            type: 'rent_reminder',
            tenantName: whatsappTarget.name,
            tenantPhone: whatsappTarget.phone,
            data: {
              tenantName: whatsappTarget.name,
              amount: whatsappTarget.monthly_rent,
              month: 'June 2026',
              dueDate: '5th June 2026',
              upiId: 'ansh.karwa@hdfcbank',
              landlordName: 'Ansh Karwa',
            },
          }}
          onClose={() => setWhatsappTarget(null)}
        />
      )}

      {/* ── Add Tenant Modal ─────────────────────────────────────────────── */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in modal-backdrop"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddForm(false); }}>
          <div className="w-full max-w-lg p-6 space-y-5 relative rounded-2xl animate-modal-pop"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
            <button onClick={() => setShowAddForm(false)} className="btn-icon absolute top-4 right-4">
              <X className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base font-bold" style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)' }}>Add New Tenant</h2>
              <p className="text-xs mt-1" style={{ color: 'var(--ink-dim)' }}>Add profile details to trigger WhatsApp portal onboarding</p>
            </div>
            <form onSubmit={handleAddTenant} className="space-y-4">
              <div>
                <label className="input-label">Full Name *</label>
                <input type="text" value={tenantName} onChange={e => setTenantName(e.target.value)} placeholder="e.g. Priyanjali Sen" className="input" required />
              </div>
              <div>
                <label className="input-label">Phone Number * (Indian mobile)</label>
                <input type="tel" value={tenantPhone} onChange={e => setTenantPhone(e.target.value)} placeholder="+91 98450 12345" className="input" required />
              </div>
              <div>
                <label className="input-label">Email Address</label>
                <input type="email" value={tenantEmail} onChange={e => setTenantEmail(e.target.value)} placeholder="name@domain.com" className="input" />
              </div>
              <div>
                <label className="input-label">Profession</label>
                <input type="text" value={tenantProfession} onChange={e => setTenantProfession(e.target.value)} placeholder="e.g. Software Engineer" className="input" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary flex-1">{t('common.cancel')}</button>
                <button type="submit" className="btn-primary flex-1">{t('common.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
