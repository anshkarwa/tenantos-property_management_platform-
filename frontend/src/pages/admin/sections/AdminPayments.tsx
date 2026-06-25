import React, { useEffect, useState } from 'react';
import { Edit2, Trash2, X, AlertTriangle } from 'lucide-react';
import { adminApi } from '../../../context/AdminContext';

interface Payment {
  id: string; status: string; amount_due: number; amount_paid: number;
  due_date: string; paid_at: string | null; payment_method: string | null;
  upi_ref: string | null; receipt_number: string | null;
  lease: {
    tenant: { name: string; phone: string };
    unit: { unit_number: string; property: { name: string; city: string } };
  };
}

const STATUS_COLORS: Record<string, [string, string]> = {
  paid:    ['var(--accent)',   'var(--accent-dim)'],
  pending: ['var(--warning)',  'var(--warning-dim)'],
  overdue: ['var(--danger)',   'var(--danger-dim)'],
  late:    ['var(--danger)',   'var(--danger-dim)'],
  waived:  ['var(--ink-dim)', 'var(--border)'],
};

export default function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null);
  const [editForm, setEditForm] = useState({ status: '', amount_due: 0, amount_paid: 0, payment_method: '' });

  const load = (s = '') => {
    setLoading(true);
    adminApi.get(`/api/admin/payments${s ? `?status=${s}` : ''}`)
      .then(r => setPayments(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleEditSave = async () => {
    if (!editingPayment) return;
    setActionId('saving');
    try {
      const payload = {
        ...editForm,
        amount_due: parseFloat(editForm.amount_due as any) || 0,
        amount_paid: parseFloat(editForm.amount_paid as any) || 0,
        payment_method: editForm.payment_method || null
      };
      const res = await adminApi.put(`/api/admin/payments/${editingPayment.id}`, payload);
      setPayments(prev => prev.map(x => x.id === editingPayment.id ? { ...x, ...res.data.data } : x));
      setEditingPayment(null);
    } catch (err) {
      alert('Failed to save payment');
    }
    setActionId(null);
  };

  const handleDelete = async () => {
    if (!deletingPayment) return;
    setActionId('deleting');
    try {
      await adminApi.delete(`/api/admin/payments/${deletingPayment.id}`);
      setPayments(prev => prev.filter(x => x.id !== deletingPayment.id));
      setDeletingPayment(null);
    } catch (err) {
      alert('Failed to delete payment');
    }
    setActionId(null);
  };

  const totalCollected = payments.filter(p => p.status === 'paid').reduce((a, p) => a + p.amount_paid, 0);
  const totalPending   = payments.filter(p => ['pending', 'overdue'].includes(p.status)).reduce((a, p) => a + p.amount_due, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: 'Syne, Inter, sans-serif', fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.03em', color: 'var(--ink)' }}>
            Rent Payments
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ink-dim)' }}>{payments.length} records</p>
        </div>
        <select
          className="input py-2 pr-8 text-sm w-40"
          value={filter}
          onChange={e => { setFilter(e.target.value); load(e.target.value); }}
        >
          <option value="">All statuses</option>
          {['paid', 'pending', 'overdue', 'late', 'waived'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--ink-dim)' }}>Collected (shown)</div>
          <div className="text-xl font-bold" style={{ color: 'var(--accent)', fontFamily: 'Syne, Inter, sans-serif' }}>
            ₹{totalCollected.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--ink-dim)' }}>Pending / Overdue</div>
          <div className="text-xl font-bold" style={{ color: 'var(--warning)', fontFamily: 'Syne, Inter, sans-serif' }}>
            ₹{totalPending.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              {['Tenant', 'Property', 'Due Date', 'Amount Due', 'Amount Paid', 'Method', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-dim)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ink-dim)' }}>Loading…</td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ink-dim)' }}>No payments found</td></tr>
            ) : payments.map((p, i) => {
              const [color, bg] = STATUS_COLORS[p.status] || ['var(--ink-dim)', 'var(--border)'];
              return (
                <tr key={p.id} style={{ borderBottom: i < payments.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td className="px-4 py-3">
                    <div className="font-medium" style={{ color: 'var(--ink)' }}>{p.lease.tenant.name}</div>
                    <div className="text-xs" style={{ color: 'var(--ink-dim)' }}>{p.lease.tenant.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs font-medium" style={{ color: 'var(--ink)' }}>{p.lease.unit.property.name}</div>
                    <div className="text-xs" style={{ color: 'var(--ink-dim)' }}>Property {p.lease.unit.unit_number.replace('Unit ', '')} · {p.lease.unit.property.city}</div>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--ink-dim)' }}>
                    {new Date(p.due_date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold" style={{ color: 'var(--ink)' }}>
                    ₹{p.amount_due.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold" style={{ color: p.amount_paid > 0 ? 'var(--accent)' : 'var(--ink-dim)' }}>
                    {p.amount_paid > 0 ? `₹${p.amount_paid.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs capitalize" style={{ color: 'var(--ink-dim)' }}>
                    {p.payment_method || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize" style={{ background: bg, color }}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingPayment(p);
                          setEditForm({ status: p.status, amount_due: p.amount_due, amount_paid: p.amount_paid, payment_method: p.payment_method || '' });
                        }}
                        className="p-1.5 hover:bg-[rgba(255,255,255,0.05)] rounded-md text-[var(--ink-dim)] hover:text-[var(--primary)] transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingPayment(p)}
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
      {editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in" onClick={() => setEditingPayment(null)}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 flex items-center justify-between border-b border-[var(--border)]">
              <h3 className="font-semibold text-lg" style={{ color: 'var(--ink)' }}>Edit Payment</h3>
              <button onClick={() => setEditingPayment(null)} className="p-1 rounded-md hover:bg-[rgba(255,255,255,0.05)] text-[var(--ink-dim)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--ink-dim)' }}>Amount Due</label>
                <input type="number" min="0" className="input w-full" value={editForm.amount_due} onChange={e => setEditForm(f => ({ ...f, amount_due: e.target.value as any }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--ink-dim)' }}>Amount Paid</label>
                <input type="number" min="0" className="input w-full" value={editForm.amount_paid} onChange={e => setEditForm(f => ({ ...f, amount_paid: e.target.value as any }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--ink-dim)' }}>Status</label>
                <select className="input w-full" value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="late">Late</option>
                  <option value="waived">Waived</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--ink-dim)' }}>Payment Method</label>
                <select className="input w-full" value={editForm.payment_method} onChange={e => setEditForm(f => ({ ...f, payment_method: e.target.value }))}>
                  <option value="">None</option>
                  <option value="upi">UPI</option>
                  <option value="neft">NEFT</option>
                  <option value="rtgs">RTGS</option>
                  <option value="imps">IMPS</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card</option>
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-[var(--border)] flex gap-3 justify-end">
              <button onClick={() => setEditingPayment(null)} className="btn-secondary px-4 py-2">Cancel</button>
              <button onClick={handleEditSave} disabled={actionId === 'saving'} className="btn-primary px-4 py-2">
                {actionId === 'saving' ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ─────────────────────────────────────────── */}
      {deletingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in" onClick={() => setDeletingPayment(null)}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-sm overflow-hidden text-center p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center" style={{ background: 'var(--danger-dim)' }}>
              <AlertTriangle className="w-6 h-6" style={{ color: 'var(--danger)' }} />
            </div>
            <div>
              <h3 className="font-semibold text-lg" style={{ color: 'var(--ink)' }}>Delete Payment Record?</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>
                Are you sure you want to delete this payment record for <strong>{deletingPayment.lease.tenant.name}</strong>?
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeletingPayment(null)} className="btn-secondary w-full py-2.5">Cancel</button>
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
