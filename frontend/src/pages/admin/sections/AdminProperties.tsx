import React, { useEffect, useState } from 'react';
import { Search, MapPin, Edit2, Trash2, X, AlertTriangle } from 'lucide-react';
import { adminApi } from '../../../context/AdminContext';

interface Property {
  id: string; name: string; city: string; state: string; pincode: string;
  property_type: string; total_units: number; created_at: string;
  landlord: { id: string; name: string; email: string };
  _count: { units: number };
}

export default function AdminProperties() {
  const [props, setProps]     = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  const [editingProp, setEditingProp] = useState<Property | null>(null);
  const [deletingProp, setDeletingProp] = useState<Property | null>(null);
  const [editForm, setEditForm] = useState({ name: '', city: '', state: '', pincode: '', property_type: '', total_units: 1 });

  const load = (q = '') => {
    setLoading(true);
    adminApi.get(`/api/admin/properties${q ? `?search=${encodeURIComponent(q)}` : ''}`)
      .then(r => setProps(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleEditSave = async () => {
    if (!editingProp) return;
    setActionId('saving');
    try {
      const payload = { ...editForm, total_units: parseInt(editForm.total_units as any) || 1 };
      const res = await adminApi.put(`/api/admin/properties/${editingProp.id}`, payload);
      setProps(prev => prev.map(x => x.id === editingProp.id ? { ...x, ...res.data.data } : x));
      setEditingProp(null);
    } catch (err) {
      alert('Failed to save property');
    }
    setActionId(null);
  };

  const handleDelete = async () => {
    if (!deletingProp) return;
    setActionId('deleting');
    try {
      await adminApi.delete(`/api/admin/properties/${deletingProp.id}`);
      setProps(prev => prev.filter(x => x.id !== deletingProp.id));
      setDeletingProp(null);
    } catch (err) {
      alert('Failed to delete property');
    }
    setActionId(null);
  };

  const typeBadge = (type: string) => {
    const map: Record<string, string> = { residential: 'var(--primary)', commercial: 'var(--warning)', pg: 'var(--accent)', hostel: 'var(--danger)' };
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
        style={{ background: `${map[type] || 'var(--ink-dim)'}18`, color: map[type] || 'var(--ink-dim)' }}>
        {type}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.03em', color: 'var(--ink)' }}>
            Properties
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ink-dim)' }}>{props.length} total</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--ink-dim)' }} />
          <input
            className="input pl-9 pr-3 py-2 text-sm w-56"
            placeholder="Search name, city, pincode…"
            value={search}
            onChange={e => { setSearch(e.target.value); load(e.target.value); }}
          />
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              {['Property', 'Type', 'Location', 'Units', 'Landlord', 'Added', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-dim)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ink-dim)' }}>Loading…</td></tr>
            ) : props.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ink-dim)' }}>No properties found</td></tr>
            ) : props.map((p, i) => (
              <tr key={p.id} style={{ borderBottom: i < props.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <td className="px-4 py-3">
                  <div className="font-medium" style={{ color: 'var(--ink)' }}>{p.name}</div>
                </td>
                <td className="px-4 py-3">{typeBadge(p.property_type)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--ink-dim)' }}>
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    {p.city}, {p.state} — {p.pincode}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--ink-dim)' }}>
                  {p._count.units} / {p.total_units}
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs font-medium" style={{ color: 'var(--ink)' }}>{p.landlord.name}</div>
                  <div className="text-xs" style={{ color: 'var(--ink-dim)' }}>{p.landlord.email}</div>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--ink-dim)' }}>
                  {new Date(p.created_at).toLocaleDateString('en-IN')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingProp(p);
                        setEditForm({ name: p.name, city: p.city, state: p.state, pincode: p.pincode, property_type: p.property_type, total_units: p.total_units });
                      }}
                      className="p-1.5 hover:bg-[rgba(255,255,255,0.05)] rounded-md text-[var(--ink-dim)] hover:text-[var(--primary)] transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingProp(p)}
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
      {editingProp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in" onClick={() => setEditingProp(null)}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 flex items-center justify-between border-b border-[var(--border)]">
              <h3 className="font-semibold text-lg" style={{ color: 'var(--ink)' }}>Edit Property</h3>
              <button onClick={() => setEditingProp(null)} className="p-1 rounded-md hover:bg-[rgba(255,255,255,0.05)] text-[var(--ink-dim)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--ink-dim)' }}>Property Name</label>
                <input className="input w-full" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--ink-dim)' }}>Type</label>
                <select className="input w-full" value={editForm.property_type} onChange={e => setEditForm(f => ({ ...f, property_type: e.target.value }))}>
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="pg">PG</option>
                  <option value="hostel">Hostel</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--ink-dim)' }}>City</label>
                <input className="input w-full" value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--ink-dim)' }}>State</label>
                <input className="input w-full" value={editForm.state} onChange={e => setEditForm(f => ({ ...f, state: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--ink-dim)' }}>Pincode</label>
                <input className="input w-full" value={editForm.pincode} onChange={e => setEditForm(f => ({ ...f, pincode: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--ink-dim)' }}>Total Units</label>
                <input type="number" min="1" className="input w-full" value={editForm.total_units} onChange={e => setEditForm(f => ({ ...f, total_units: e.target.value as any }))} />
              </div>
            </div>
            <div className="p-5 border-t border-[var(--border)] flex gap-3 justify-end">
              <button onClick={() => setEditingProp(null)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleEditSave} disabled={actionId === 'saving'} className="btn-primary px-4 py-2">
                {actionId === 'saving' ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ─────────────────────────────────────────── */}
      {deletingProp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in" onClick={() => setDeletingProp(null)}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-sm overflow-hidden text-center p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center" style={{ background: 'var(--danger-dim)' }}>
              <AlertTriangle className="w-6 h-6" style={{ color: 'var(--danger)' }} />
            </div>
            <div>
              <h3 className="font-semibold text-lg" style={{ color: 'var(--ink)' }}>Delete Property?</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>
                Are you sure you want to delete <strong>{deletingProp.name}</strong>?
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeletingProp(null)} className="btn-secondary w-full py-2.5">Cancel</button>
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
