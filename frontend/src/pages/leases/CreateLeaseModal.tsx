import React, { useState, useEffect } from 'react';
import { X, FileDigit } from 'lucide-react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

export default function CreateLeaseModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [tenants, setTenants] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    tenant_id: '',
    unit_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    monthly_rent: '',
    security_deposit: '',
    rent_due_day: '1',
  });

  useEffect(() => {
    Promise.all([
      api.get('/api/tenants'),
      api.get('/api/properties')
    ]).then(([tenantsRes, propsRes]) => {
      setTenants(tenantsRes.data.data || []);
      setProperties(propsRes.data.data || []);
    }).catch(() => {
      toast.error('Failed to load form data');
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tenant_id || !formData.unit_id) {
      return toast.error('Please select a tenant and a unit');
    }

    setLoading(true);
    try {
      await api.post('/api/leases', {
        ...formData,
        monthly_rent: Number(formData.monthly_rent),
        security_deposit: Number(formData.security_deposit),
        rent_due_day: Number(formData.rent_due_day),
      });
      toast.success('Lease created successfully!');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to create lease');
    } finally {
      setLoading(false);
    }
  };

  const availableUnits = properties.flatMap(p => 
    p.units.map((u: any) => ({ ...u, propertyName: p.name }))
  ).filter(u => u.status !== 'occupied');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in modal-backdrop"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg p-6 space-y-5 relative rounded-2xl animate-modal-pop"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
      >
        <button onClick={onClose} className="btn-icon absolute top-4 right-4">
          <X className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-base font-bold" style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)' }}>Create Lease Agreement</h2>
          <p className="text-xs mt-1" style={{ color: 'var(--ink-dim)' }}>Select tenant and define rent terms</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="space-y-4">
            <div>
              <label className="input-label">Select Tenant *</label>
              <select required className="input" value={formData.tenant_id} onChange={e => setFormData({ ...formData, tenant_id: e.target.value })}>
                <option value="">-- Choose Tenant --</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="input-label">Select Unit *</label>
              <select required className="input" value={formData.unit_id} onChange={e => setFormData({ ...formData, unit_id: e.target.value })}>
                <option value="">-- Choose Unit --</option>
                {availableUnits.map(u => (
                  <option key={u.id} value={u.id}>{u.propertyName} - Unit {u.unit_number} ({u.unit_type})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">Start Date *</label>
                <input required type="date" className="input" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} />
              </div>
              <div>
                <label className="input-label">End Date *</label>
                <input required type="date" className="input" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">Monthly Rent (₹) *</label>
                <input required type="number" min="0" className="input" value={formData.monthly_rent} onChange={e => setFormData({ ...formData, monthly_rent: e.target.value })} />
              </div>
              <div>
                <label className="input-label">Security Deposit (₹) *</label>
                <input required type="number" min="0" className="input" value={formData.security_deposit} onChange={e => setFormData({ ...formData, security_deposit: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Creating...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
