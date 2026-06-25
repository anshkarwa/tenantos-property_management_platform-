import React, { useEffect, useState } from 'react';
import { Search, Flag, CheckCircle, Edit2, Trash2, X, AlertTriangle } from 'lucide-react';
import { adminApi } from '../../../context/AdminContext';

interface Tenant {
  id: string; name: string; email: string | null; phone: string;
  aadhaar_verified: boolean; police_verification_status: string;
  membership_tier: string; is_flagged: boolean; created_at: string;
  _count: { leases: number };
}

export default function AdminTenants() {
  const [tenants, setTenants]   = useState<Tenant[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', membership_tier: '' });

  const load = (q = '') => {
    setLoading(true);
    adminApi.get(`/api/admin/tenants${q ? `?search=${encodeURIComponent(q)}` : ''}`)
      .then(r => setTenants(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleFlag = async (t: Tenant) => {
    setActionId(t.id);
    try {
      const endpoint = t.is_flagged ? 'unflag' : 'flag';
      const res = await adminApi.patch(`/api/admin/tenants/${t.id}/${endpoint}`);
      setTenants(prev => prev.map(x => x.id === t.id ? { ...x, is_flagged: res.data.data.is_flagged } : x));
    } catch { /* ignore */ }
    setActionId(null);
  };

  const handleEditSave = async () => {
    if (!editingTenant) return;
    setActionId('saving');
    try {
      const res = await adminApi.put(`/api/admin/tenants/${editingTenant.id}`, editForm);
      setTenants(prev => prev.map(x => x.id === editingTenant.id ? { ...x, ...res.data.data } : x));
      setEditingTenant(null);
    } catch (err) {
      alert('Failed to save tenant');
    }
    setActionId(null);
  };

  const handleDelete = async () => {
    if (!deletingTenant) return;
    setActionId('deleting');
    try {
      await adminApi.delete(`/api/admin/tenants/${deletingTenant.id}`);
      setTenants(prev => prev.filter(x => x.id !== deletingTenant.id));
      setDeletingTenant(null);
    } catch (err) {
      alert('Failed to delete tenant');
    }
    setActionId(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.03em', color: 'var(--ink)' }}>
            Tenants
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ink-dim)' }}>{tenants.length} total</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--ink-dim)' }} />
          <input
            className="input pl-9 pr-3 py-2 text-sm w-56"
            placeholder="Search name, email, phone…"
            value={search}
            onChange={e => { setSearch(e.target.value); load(e.target.value); }}
          />
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              {['Tenant', 'Phone', 'Aadhaar', 'Police', 'Membership', 'Leases', 'Joined', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-dim)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ink-dim)' }}>Loading…</td></tr>
            ) : tenants.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ink-dim)' }}>No tenants found</td></tr>
            ) : tenants.map((t, i) => (
              <tr
                key={t.id}
                style={{
                  borderBottom: i < tenants.length - 1 ? '1px solid var(--border)' : 'none',
                  background: t.is_flagged ? 'rgba(255,77,109,0.03)' : 'transparent',
                }}
              >
                <td className="px-4 py-3">
                  <div className="font-medium flex items-center gap-1.5" style={{ color: 'var(--ink)' }}>
                    {t.name}
                    {t.is_flagged && <Flag className="w-3 h-3" style={{ color: 'var(--danger)' }} />}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--ink-dim)' }}>{t.email || '—'}</div>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--ink-dim)' }}>{t.phone}</td>
                <td className="px-4 py-3">
                  <span className="text-xs" style={{ color: t.aadhaar_verified ? 'var(--accent)' : 'var(--ink-dim)' }}>
                    {t.aadhaar_verified ? '✓ Verified' : 'Not verified'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs capitalize" style={{
                    color: t.police_verification_status === 'verified' ? 'var(--accent)'
                      : t.police_verification_status === 'pending' ? 'var(--warning)'
                      : 'var(--ink-dim)',
                  }}>
                    {t.police_verification_status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs capitalize" style={{ color: t.membership_tier === 'free' ? 'var(--ink-dim)' : 'var(--primary)' }}>
                    {t.membership_tier}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--ink-dim)' }}>{t._count.leases}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--ink-dim)' }}>
                  {new Date(t.created_at).toLocaleDateString('en-IN')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingTenant(t);
                        setEditForm({ name: t.name, email: t.email || '', phone: t.phone, membership_tier: t.membership_tier });
                      }}
                      className="p-1.5 hover:bg-[rgba(255,255,255,0.05)] rounded-md text-[var(--ink-dim)] hover:text-[var(--primary)] transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleFlag(t)}
                      disabled={actionId === t.id}
                      className="p-1.5 hover:bg-[rgba(255,255,255,0.05)] rounded-md text-[var(--ink-dim)] transition-colors"
                      style={{ color: t.is_flagged ? 'var(--accent)' : 'var(--danger)', opacity: actionId === t.id ? 0.5 : 1 }}
                      title={t.is_flagged ? 'Unflag' : 'Flag'}
                    >
                      {t.is_flagged ? <CheckCircle className="w-4 h-4" /> : <Flag className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setDeletingTenant(t)}
                      className="p-1.5 hover:bg-[rgba(255,255,255,0.05)] rounded-md text-[var(--ink-dim)] hover:text-[var(--danger)] transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Edit Modal ────────────────────────────────────────────────────────── */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in" onClick={() => setEditingTenant(null)}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 flex items-center justify-between border-b border-[var(--border)]">
              <h3 className="font-semibold text-lg" style={{ color: 'var(--ink)' }}>Edit Tenant</h3>
              <button onClick={() => setEditingTenant(null)} className="p-1 rounded-md hover:bg-[rgba(255,255,255,0.05)] text-[var(--ink-dim)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--ink-dim)' }}>Full Name</label>
                <input className="input w-full" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--ink-dim)' }}>Email Address</label>
                <input type="email" className="input w-full" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--ink-dim)' }}>Phone Number</label>
                <input className="input w-full" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--ink-dim)' }}>Membership Tier</label>
                <select className="input w-full" value={editForm.membership_tier} onChange={e => setEditForm(f => ({ ...f, membership_tier: e.target.value }))}>
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-[var(--border)] flex gap-3 justify-end">
              <button onClick={() => setEditingTenant(null)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleEditSave} disabled={actionId === 'saving'} className="btn-primary px-4 py-2">
                {actionId === 'saving' ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ─────────────────────────────────────────── */}
      {deletingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in" onClick={() => setDeletingTenant(null)}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-sm overflow-hidden text-center p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center" style={{ background: 'var(--danger-dim)' }}>
              <AlertTriangle className="w-6 h-6" style={{ color: 'var(--danger)' }} />
            </div>
            <div>
              <h3 className="font-semibold text-lg" style={{ color: 'var(--ink)' }}>Delete Tenant?</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>
                Are you sure you want to delete <strong>{deletingTenant.name}</strong>?
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeletingTenant(null)} className="btn-secondary w-full py-2.5">Cancel</button>
              <button onClick={handleDelete} disabled={actionId === 'deleting'} className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-150" style={{ background: 'var(--danger)', color: 'white' }}>
                {actionId === 'deleting' ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
