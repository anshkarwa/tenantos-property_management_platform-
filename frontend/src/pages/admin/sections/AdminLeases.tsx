import React, { useEffect, useState } from 'react';
import { XCircle, Edit2, Trash2, X, AlertTriangle } from 'lucide-react';
import { adminApi } from '../../../context/AdminContext';

interface Lease {
  id: string; status: string; esign_status: string;
  monthly_rent: number; start_date: string; end_date: string; created_at: string;
  tenant: { name: string; phone: string };
  unit: { unit_number: string; property: { name: string; city: string; landlord: { name: string } } };
}

const STATUS_COLORS: Record<string, [string, string]> = {
  active:     ['var(--accent)',   'var(--accent-dim)'],
  draft:      ['var(--ink-dim)', 'var(--border)'],
  notice:     ['var(--warning)',  'var(--warning-dim)'],
  expired:    ['var(--ink-dim)', 'var(--border)'],
  terminated: ['var(--danger)',   'var(--danger-dim)'],
};

export default function AdminLeases() {
  const [leases, setLeases]     = useState<Lease[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [terminateConfirmId, setTerminateConfirmId] = useState<string | null>(null);

  const [editingLease, setEditingLease] = useState<Lease | null>(null);
  const [deletingLease, setDeletingLease] = useState<Lease | null>(null);
  const [editForm, setEditForm] = useState({ status: '', esign_status: '', monthly_rent: 0 });

  const load = (s = '') => {
    setLoading(true);
    adminApi.get(`/api/admin/leases${s ? `?status=${s}` : ''}`)
      .then(r => setLeases(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const terminate = async (id: string) => {
    setActionId(id);
    try {
      await adminApi.patch(`/api/admin/leases/${id}/terminate`);
      setLeases(prev => prev.map(l => l.id === id ? { ...l, status: 'terminated' } : l));
    } catch { /* ignore */ }
    setActionId(null);
    setTerminateConfirmId(null);
  };

  const handleEditSave = async () => {
    if (!editingLease) return;
    setActionId('saving');
    try {
      const payload = { ...editForm, monthly_rent: parseInt(editForm.monthly_rent as any) || 0 };
      const res = await adminApi.put(`/api/admin/leases/${editingLease.id}`, payload);
      setLeases(prev => prev.map(x => x.id === editingLease.id ? { ...x, ...res.data.data } : x));
      setEditingLease(null);
    } catch (err) {
      alert('Failed to save lease');
    }
    setActionId(null);
  };

  const handleDelete = async () => {
    if (!deletingLease) return;
    setActionId('deleting');
    try {
      await adminApi.delete(`/api/admin/leases/${deletingLease.id}`);
      setLeases(prev => prev.filter(x => x.id !== deletingLease.id));
      setDeletingLease(null);
    } catch (err) {
      alert('Failed to delete lease');
    }
    setActionId(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.03em', color: 'var(--ink)' }}>
            Leases
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ink-dim)' }}>{leases.length} records</p>
        </div>
        <select
          className="input py-2 pr-8 text-sm w-40"
          value={filter}
          onChange={e => { setFilter(e.target.value); load(e.target.value); }}
        >
          <option value="">All statuses</option>
          {['active', 'draft', 'notice', 'expired', 'terminated'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              {['Tenant', 'Property / Unit', 'Landlord', 'Rent/mo', 'Period', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-dim)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ink-dim)' }}>Loading…</td></tr>
            ) : leases.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ink-dim)' }}>No leases found</td></tr>
            ) : leases.map((l, i) => {
              const [color, bg] = STATUS_COLORS[l.status] || STATUS_COLORS.draft;
              return (
                <tr key={l.id} style={{ borderBottom: i < leases.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td className="px-4 py-3">
                    <div className="font-medium" style={{ color: 'var(--ink)' }}>{l.tenant.name}</div>
                    <div className="text-xs" style={{ color: 'var(--ink-dim)' }}>{l.tenant.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-xs" style={{ color: 'var(--ink)' }}>{l.unit.property.name}</div>
                    <div className="text-xs" style={{ color: 'var(--ink-dim)' }}>Property {l.unit.unit_number.replace('Unit ', '')} · {l.unit.property.city}</div>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--ink-dim)' }}>{l.unit.property.landlord.name}</td>
                  <td className="px-4 py-3 text-xs font-semibold" style={{ color: 'var(--ink)' }}>
                    ₹{l.monthly_rent.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--ink-dim)' }}>
                    {new Date(l.start_date).toLocaleDateString('en-IN')} →<br />
                    {new Date(l.end_date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize" style={{ background: bg, color }}>{l.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingLease(l);
                          setEditForm({ status: l.status, esign_status: l.esign_status, monthly_rent: l.monthly_rent });
                        }}
                        className="p-1.5 hover:bg-[rgba(255,255,255,0.05)] rounded-md text-[var(--ink-dim)] hover:text-[var(--primary)] transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {l.status === 'active' && (
                        <button
                          onClick={() => setTerminateConfirmId(l.id)}
                          disabled={actionId === l.id}
                          className="p-1.5 hover:bg-[rgba(255,255,255,0.05)] rounded-md text-[var(--ink-dim)] hover:text-[var(--warning)] transition-colors"
                          title="Terminate"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setDeletingLease(l)}
                        className="p-1.5 hover:bg-[rgba(255,255,255,0.05)] rounded-md text-[var(--ink-dim)] hover:text-[var(--danger)] transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Edit Modal ────────────────────────────────────────────────────────── */}
      {editingLease && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in" onClick={() => setEditingLease(null)}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 flex items-center justify-between border-b border-[var(--border)]">
              <h3 className="font-semibold text-lg" style={{ color: 'var(--ink)' }}>Edit Lease</h3>
              <button onClick={() => setEditingLease(null)} className="p-1 rounded-md hover:bg-[rgba(255,255,255,0.05)] text-[var(--ink-dim)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--ink-dim)' }}>Monthly Rent</label>
                <input type="number" min="0" className="input w-full" value={editForm.monthly_rent} onChange={e => setEditForm(f => ({ ...f, monthly_rent: e.target.value as any }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--ink-dim)' }}>Status</label>
                <select className="input w-full" value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="notice">Notice</option>
                  <option value="expired">Expired</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--ink-dim)' }}>eSign Status</label>
                <select className="input w-full" value={editForm.esign_status} onChange={e => setEditForm(f => ({ ...f, esign_status: e.target.value }))}>
                  <option value="pending">Pending</option>
                  <option value="landlord_signed">Landlord Signed</option>
                  <option value="tenant_signed">Tenant Signed</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-[var(--border)] flex gap-3 justify-end">
              <button onClick={() => setEditingLease(null)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleEditSave} disabled={actionId === 'saving'} className="btn-primary px-4 py-2">
                {actionId === 'saving' ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ─────────────────────────────────────────── */}
      {deletingLease && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in" onClick={() => setDeletingLease(null)}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-sm overflow-hidden text-center p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center" style={{ background: 'var(--danger-dim)' }}>
              <AlertTriangle className="w-6 h-6" style={{ color: 'var(--danger)' }} />
            </div>
            <div>
              <h3 className="font-semibold text-lg" style={{ color: 'var(--ink)' }}>Delete Lease?</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>
                Are you sure you want to delete this lease for <strong>{deletingLease.tenant.name}</strong>?
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeletingLease(null)} className="btn-secondary w-full py-2.5">Cancel</button>
              <button onClick={handleDelete} disabled={actionId === 'deleting'} className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-150" style={{ background: 'var(--danger)', color: 'white' }}>
                {actionId === 'deleting' ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Terminate Confirm Modal ─────────────────────────────────────── */}
      {terminateConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in" onClick={() => setTerminateConfirmId(null)}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-sm overflow-hidden shadow-xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-[rgba(239,68,68,0.1)] flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-6 h-6 text-[var(--danger)]" />
              </div>
              <h3 className="text-lg font-bold text-[var(--ink)] mb-2">Terminate Lease</h3>
              <p className="text-sm text-[var(--ink-dim)]">Are you sure you want to terminate this lease? This action cannot be undone.</p>
            </div>
            <div className="flex border-t border-[var(--border)]">
              <button
                onClick={() => setTerminateConfirmId(null)}
                className="flex-1 p-3 text-sm font-medium text-[var(--ink-dim)] hover:bg-[rgba(232,234,240,0.05)] transition-colors"
                disabled={actionId === terminateConfirmId}
              >
                Cancel
              </button>
              <div className="w-[1px] bg-[var(--border)]" />
              <button
                onClick={() => terminate(terminateConfirmId)}
                className="flex-1 p-3 text-sm font-bold text-[var(--danger)] hover:bg-[rgba(239,68,68,0.05)] transition-colors"
                disabled={actionId === terminateConfirmId}
              >
                {actionId === terminateConfirmId ? 'Terminating...' : 'Terminate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
