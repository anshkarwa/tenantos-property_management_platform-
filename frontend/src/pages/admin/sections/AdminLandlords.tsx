import React, { useEffect, useState } from 'react';
import { Search, Ban, CheckCircle, Building2, Edit2, Trash2, X, AlertTriangle } from 'lucide-react';
import { adminApi } from '../../../context/AdminContext';

interface Landlord {
  id: string; name: string; email: string; phone: string;
  kyc_status: string; subscription_tier: string;
  is_suspended: boolean; onboarding_done: boolean; created_at: string;
  _count: { properties: number };
}

export default function AdminLandlords() {
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [actionId, setActionId]   = useState<string | null>(null);

  const [editingLandlord, setEditingLandlord] = useState<Landlord | null>(null);
  const [deletingLandlord, setDeletingLandlord] = useState<Landlord | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', subscription_tier: '' });

  const load = (q = '') => {
    setLoading(true);
    adminApi.get(`/api/admin/landlords${q ? `?search=${encodeURIComponent(q)}` : ''}`)
      .then(r => setLandlords(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleSuspend = async (l: Landlord) => {
    setActionId(l.id);
    try {
      const endpoint = l.is_suspended ? 'activate' : 'suspend';
      const res = await adminApi.patch(`/api/admin/landlords/${l.id}/${endpoint}`);
      setLandlords(prev => prev.map(x => x.id === l.id ? { ...x, is_suspended: res.data.data.is_suspended } : x));
    } catch { /* ignore */ }
    setActionId(null);
  };

  const handleEditSave = async () => {
    if (!editingLandlord) return;
    setActionId('saving');
    try {
      const res = await adminApi.put(`/api/admin/landlords/${editingLandlord.id}`, editForm);
      setLandlords(prev => prev.map(x => x.id === editingLandlord.id ? { ...x, ...res.data.data } : x));
      setEditingLandlord(null);
    } catch (err) {
      alert('Failed to save landlord');
    }
    setActionId(null);
  };

  const handleDelete = async () => {
    if (!deletingLandlord) return;
    setActionId('deleting');
    try {
      await adminApi.delete(`/api/admin/landlords/${deletingLandlord.id}`);
      setLandlords(prev => prev.filter(x => x.id !== deletingLandlord.id));
      setDeletingLandlord(null);
    } catch (err) {
      alert('Failed to delete landlord (Check if they have active properties)');
    }
    setActionId(null);
  };

  const kycBadge = (s: string) => {
    const map: Record<string, [string, string]> = {
      verified:    ['var(--accent)',   'var(--accent-dim)'],
      pending:     ['var(--warning)',  'var(--warning-dim)'],
      rejected:    ['var(--danger)',   'var(--danger-dim)'],
      not_started: ['var(--ink-dim)', 'var(--border)'],
    };
    const [color, bg] = map[s] || map.not_started;
    return (
      <span
        className="px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ background: bg, color }}
      >
        {s.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.03em', color: 'var(--ink)' }}>
            Landlords
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ink-dim)' }}>{landlords.length} total</p>
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
              {['Landlord', 'Phone', 'KYC', 'Plan', 'Properties', 'Joined', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-dim)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ink-dim)' }}>Loading…</td></tr>
            ) : landlords.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ink-dim)' }}>No landlords found</td></tr>
            ) : landlords.map((l, i) => (
              <tr
                key={l.id}
                style={{
                  borderBottom: i < landlords.length - 1 ? '1px solid var(--border)' : 'none',
                  background: l.is_suspended ? 'rgba(255,77,109,0.03)' : 'transparent',
                }}
              >
                <td className="px-4 py-3">
                  <div className="font-medium" style={{ color: 'var(--ink)' }}>{l.name}</div>
                  <div className="text-xs" style={{ color: 'var(--ink-dim)' }}>{l.email}</div>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--ink-dim)' }}>{l.phone}</td>
                <td className="px-4 py-3">{kycBadge(l.kyc_status)}</td>
                <td className="px-4 py-3">
                  <span className="text-xs capitalize" style={{ color: l.subscription_tier === 'pro' ? 'var(--primary)' : 'var(--ink-dim)' }}>
                    {l.subscription_tier}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--ink-dim)' }}>
                    <Building2 className="w-3.5 h-3.5" />
                    {l._count.properties}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--ink-dim)' }}>
                  {new Date(l.created_at).toLocaleDateString('en-IN')}
                </td>
                <td className="px-4 py-3">
                  {l.is_suspended ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'var(--danger-dim)', color: 'var(--danger)' }}>Suspended</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>Active</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingLandlord(l);
                        setEditForm({ name: l.name, email: l.email, phone: l.phone, subscription_tier: l.subscription_tier });
                      }}
                      className="p-1.5 hover:bg-[rgba(255,255,255,0.05)] rounded-md text-[var(--ink-dim)] hover:text-[var(--primary)] transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleSuspend(l)}
                      disabled={actionId === l.id}
                      className="p-1.5 hover:bg-[rgba(255,255,255,0.05)] rounded-md text-[var(--ink-dim)] transition-colors"
                      style={{ color: l.is_suspended ? 'var(--accent)' : 'var(--warning)', opacity: actionId === l.id ? 0.5 : 1 }}
                      title={l.is_suspended ? 'Activate' : 'Suspend'}
                    >
                      {l.is_suspended ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setDeletingLandlord(l)}
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
      {editingLandlord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in" onClick={() => setEditingLandlord(null)}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 flex items-center justify-between border-b border-[var(--border)]">
              <h3 className="font-semibold text-lg" style={{ color: 'var(--ink)' }}>Edit Landlord</h3>
              <button onClick={() => setEditingLandlord(null)} className="p-1 rounded-md hover:bg-[rgba(255,255,255,0.05)] text-[var(--ink-dim)]">
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
                <label className="text-sm font-medium" style={{ color: 'var(--ink-dim)' }}>Subscription Tier</label>
                <select className="input w-full" value={editForm.subscription_tier} onChange={e => setEditForm(f => ({ ...f, subscription_tier: e.target.value }))}>
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="portfolio">Portfolio</option>
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-[var(--border)] flex gap-3 justify-end">
              <button onClick={() => setEditingLandlord(null)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleEditSave} disabled={actionId === 'saving'} className="btn-primary px-4 py-2">
                {actionId === 'saving' ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ─────────────────────────────────────────── */}
      {deletingLandlord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in" onClick={() => setDeletingLandlord(null)}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-sm overflow-hidden text-center p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center" style={{ background: 'var(--danger-dim)' }}>
              <AlertTriangle className="w-6 h-6" style={{ color: 'var(--danger)' }} />
            </div>
            <div>
              <h3 className="font-semibold text-lg" style={{ color: 'var(--ink)' }}>Delete Landlord?</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>
                Are you sure you want to completely delete <strong>{deletingLandlord.name}</strong>? This action cannot be undone and will delete all associated properties.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeletingLandlord(null)} className="btn-secondary w-full py-2.5">Cancel</button>
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
