import React, { useEffect, useState } from 'react';
import { Edit2, Trash2, X, AlertTriangle } from 'lucide-react';
import { adminApi } from '../../../context/AdminContext';

interface MRequest {
  id: string; title: string; category: string; priority: string;
  status: string; repair_cost: number | null; created_at: string; resolved_at: string | null;
  tenant: { name: string; phone: string } | null;
  unit: { unit_number: string; property: { name: string; city: string; landlord: { name: string } } };
  vendor: { name: string } | null;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'var(--danger)', high: 'var(--warning)', medium: 'var(--primary)', low: 'var(--ink-dim)',
};
const STATUS_COLORS: Record<string, [string, string]> = {
  open:         ['var(--danger)',   'var(--danger-dim)'],
  acknowledged: ['var(--warning)',  'var(--warning-dim)'],
  in_progress:  ['var(--primary)',  'var(--primary-dim)'],
  resolved:     ['var(--accent)',   'var(--accent-dim)'],
  closed:       ['var(--ink-dim)', 'var(--border)'],
  cancelled:    ['var(--ink-dim)', 'var(--border)'],
};

export default function AdminMaintenance() {
  const [requests, setRequests] = useState<MRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  const [editingRequest, setEditingRequest] = useState<MRequest | null>(null);
  const [deletingRequest, setDeletingRequest] = useState<MRequest | null>(null);
  const [editForm, setEditForm] = useState({ title: '', category: '', priority: '', status: '', repair_cost: 0 });

  const load = (s = '') => {
    setLoading(true);
    adminApi.get(`/api/admin/maintenance${s ? `?status=${s}` : ''}`)
      .then(r => setRequests(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleEditSave = async () => {
    if (!editingRequest) return;
    setActionId('saving');
    try {
      const payload = { ...editForm, repair_cost: parseFloat(editForm.repair_cost as any) || null };
      const res = await adminApi.put(`/api/admin/maintenance/${editingRequest.id}`, payload);
      setRequests(prev => prev.map(x => x.id === editingRequest.id ? { ...x, ...res.data.data } : x));
      setEditingRequest(null);
    } catch (err) {
      alert('Failed to save maintenance request');
    }
    setActionId(null);
  };

  const handleDelete = async () => {
    if (!deletingRequest) return;
    setActionId('deleting');
    try {
      await adminApi.delete(`/api/admin/maintenance/${deletingRequest.id}`);
      setRequests(prev => prev.filter(x => x.id !== deletingRequest.id));
      setDeletingRequest(null);
    } catch (err) {
      alert('Failed to delete maintenance request');
    }
    setActionId(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.03em', color: 'var(--ink)' }}>
            Maintenance
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ink-dim)' }}>{requests.length} records</p>
        </div>
        <select
          className="input py-2 pr-8 text-sm w-44"
          value={filter}
          onChange={e => { setFilter(e.target.value); load(e.target.value); }}
        >
          <option value="">All statuses</option>
          {['open', 'acknowledged', 'in_progress', 'resolved', 'closed', 'cancelled'].map(s => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              {['Title / Category', 'Property', 'Landlord', 'Tenant', 'Priority', 'Status', 'Cost', 'Raised', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-dim)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ink-dim)' }}>Loading…</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ink-dim)' }}>No maintenance requests found</td></tr>
            ) : requests.map((r, i) => {
              const [statusColor, statusBg] = STATUS_COLORS[r.status] || ['var(--ink-dim)', 'var(--border)'];
              return (
                <tr key={r.id} style={{ borderBottom: i < requests.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td className="px-4 py-3">
                    <div className="font-medium" style={{ color: 'var(--ink)' }}>{r.title}</div>
                    <div className="text-xs capitalize" style={{ color: 'var(--ink-dim)' }}>{r.category}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs font-medium" style={{ color: 'var(--ink)' }}>{r.unit.property.name}</div>
                    <div className="text-xs" style={{ color: 'var(--ink-dim)' }}>Property {r.unit.unit_number.replace('Unit ', '')} · {r.unit.property.city}</div>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--ink-dim)' }}>{r.unit.property.landlord.name}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--ink-dim)' }}>
                    {r.tenant ? r.tenant.name : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold capitalize" style={{ color: PRIORITY_COLORS[r.priority] || 'var(--ink-dim)' }}>
                      {r.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                      style={{ background: statusBg, color: statusColor }}>
                      {r.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: r.repair_cost ? 'var(--ink)' : 'var(--ink-dim)' }}>
                    {r.repair_cost ? `₹${r.repair_cost.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--ink-dim)' }}>
                    {new Date(r.created_at).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingRequest(r);
                          setEditForm({ title: r.title, category: r.category, priority: r.priority, status: r.status, repair_cost: r.repair_cost || 0 });
                        }}
                        className="p-1.5 hover:bg-[rgba(255,255,255,0.05)] rounded-md text-[var(--ink-dim)] hover:text-[var(--primary)] transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingRequest(r)}
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
      {editingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in" onClick={() => setEditingRequest(null)}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 flex items-center justify-between border-b border-[var(--border)]">
              <h3 className="font-semibold text-lg" style={{ color: 'var(--ink)' }}>Edit Maintenance Request</h3>
              <button onClick={() => setEditingRequest(null)} className="p-1 rounded-md hover:bg-[rgba(255,255,255,0.05)] text-[var(--ink-dim)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--ink-dim)' }}>Title</label>
                <input className="input w-full" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--ink-dim)' }}>Category</label>
                <select className="input w-full" value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="plumbing">Plumbing</option>
                  <option value="electrical">Electrical</option>
                  <option value="appliance">Appliance</option>
                  <option value="structural">Structural</option>
                  <option value="pest">Pest</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="carpentry">Carpentry</option>
                  <option value="painting">Painting</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--ink-dim)' }}>Priority</label>
                <select className="input w-full" value={editForm.priority} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--ink-dim)' }}>Status</label>
                <select className="input w-full" value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="open">Open</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--ink-dim)' }}>Repair Cost</label>
                <input type="number" min="0" className="input w-full" value={editForm.repair_cost} onChange={e => setEditForm(f => ({ ...f, repair_cost: e.target.value as any }))} />
              </div>
            </div>
            <div className="p-5 border-t border-[var(--border)] flex gap-3 justify-end">
              <button onClick={() => setEditingRequest(null)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleEditSave} disabled={actionId === 'saving'} className="btn-primary px-4 py-2">
                {actionId === 'saving' ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ─────────────────────────────────────────── */}
      {deletingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in" onClick={() => setDeletingRequest(null)}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-sm overflow-hidden text-center p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center" style={{ background: 'var(--danger-dim)' }}>
              <AlertTriangle className="w-6 h-6" style={{ color: 'var(--danger)' }} />
            </div>
            <div>
              <h3 className="font-semibold text-lg" style={{ color: 'var(--ink)' }}>Delete Request?</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>
                Are you sure you want to delete this maintenance request?
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeletingRequest(null)} className="btn-secondary w-full py-2.5">Cancel</button>
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
