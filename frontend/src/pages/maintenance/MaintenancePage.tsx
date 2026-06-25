import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { formatDate, formatINR } from '../../utils/format';
import {
  Wrench, Search, Plus, SlidersHorizontal, X, Star,
  Phone, UserCheck, CheckCircle2, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ── Types ────────────────────────────────────────────────────────────────── */
interface Vendor {
  id: string; name: string; phone: string; category: string; rating: number;
}

interface MaintenanceRequest {
  id: string;
  title: string;
  description?: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed' | 'cancelled';
  repair_cost: number | null;
  created_at: string;
  resolved_at: string | null;
  tenant: { id: string; name: string; phone: string } | null;
  unit: { unit_number: string; property: { name: string } };
  vendor: Vendor | null;
}

/* ── Badges ───────────────────────────────────────────────────────────────── */
function getPriorityBadge(prio: string) {
  switch (prio) {
    case 'urgent': return <span className="badge-danger uppercase font-mono">{prio}</span>;
    case 'high':   return <span className="badge-warning uppercase font-mono">{prio}</span>;
    default:       return <span className="badge-neutral uppercase font-mono">{prio}</span>;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'resolved':    return <span className="badge-success">Resolved</span>;
    case 'in_progress': return <span className="badge-warning">In Progress</span>;
    case 'open':        return <span className="badge-danger">Open</span>;
    case 'acknowledged':return <span className="badge-warning">Acknowledged</span>;
    default:            return <span className="badge-neutral">{status}</span>;
  }
}

/* ── Main Page ────────────────────────────────────────────────────────────── */
export default function MaintenancePage() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendorRequest, setSelectedVendorRequest] = useState<string | null>(null);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [vName, setVName] = useState('');
  const [vPhone, setVPhone] = useState('');
  const [vCategory, setVCategory] = useState('plumbing');

  useEffect(() => {
    Promise.all([
      api.get('/api/maintenance').then(r => r.data.data || []),
      api.get('/api/maintenance/vendors/list').then(r => r.data.data || []).catch(() => []),
    ])
      .then(([reqs, vends]) => { setRequests(reqs); setVendors(vends); })
      .catch(() => toast.error('Failed to load maintenance data'))
      .finally(() => setLoading(false));
  }, []);

  const filteredRequests = requests.filter(r =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.tenant?.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.unit.unit_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.unit.property.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAssignVendor = async (requestId: string, vendor: Vendor) => {
    try {
      await api.put(`/api/maintenance/${requestId}`, { vendor_id: vendor.id, status: 'in_progress' });
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, vendor, status: 'in_progress' } : r));
      toast.success(`${vendor.name} assigned! WhatsApp sent to tenant & vendor. 📱`);
      setSelectedVendorRequest(null);
    } catch (e) {
      toast.error('Failed to assign vendor');
    }
  };

  const handleMarkResolved = async (requestId: string) => {
    try {
      setResolvingId(requestId);
      await api.put(`/api/maintenance/${requestId}`, { status: 'resolved' });
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'resolved' } : r));
      toast.success('Maintenance request marked as resolved! ✅');
    } catch (e) {
      toast.error('Failed to mark resolved');
    } finally {
      setResolvingId(null);
    }
  };

  const performDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await api.delete(`/api/maintenance/${deleteConfirmId}`);
      setRequests(prev => prev.filter(r => r.id !== deleteConfirmId));
      toast.success('Maintenance request deleted! 🗑️');
      setDeleteConfirmId(null);
    } catch (e) {
      toast.error('Failed to delete request');
    }
  };

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/maintenance/vendors', { name: vName, phone: vPhone, category: vCategory });
      setVendors([...vendors, res.data.data]);
      toast.success('Vendor added successfully! 🛠️');
      setShowAddVendor(false);
      setVName(''); setVPhone('');
    } catch (e) {
      toast.error('Failed to add vendor');
    }
  };

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold"
            style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            {t('maintenance.title')}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>{t('maintenance.subtitle')}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ink-dim)' }} />
          <input type="text" placeholder="Search maintenance jobs..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} className="input pl-9" />
        </div>
        <button className="btn-secondary w-full md:w-auto">
          <SlidersHorizontal className="w-4 h-4" /> Filters
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 space-y-3" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-start justify-between">
                <div className="space-y-1.5">
                  <div className="h-4 w-36 skeleton rounded" />
                  <div className="h-3 w-24 skeleton rounded" />
                </div>
                <div className="h-5 w-16 skeleton rounded-full" />
              </div>
              <div className="h-3 w-full skeleton rounded" />
              <div className="h-3 w-3/4 skeleton rounded" />
              <div className="flex items-center justify-between pt-1">
                <div className="h-5 w-14 skeleton rounded-full" />
                <div className="flex gap-2">
                  <div className="h-7 w-20 skeleton rounded-lg" />
                  <div className="h-7 w-7 skeleton rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-16 text-sm" style={{ color: 'var(--ink-dim)' }}>
          {searchQuery ? 'No requests match your search' : 'No maintenance requests yet.'}
        </div>
      ) : (
        /* Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRequests.map((request, i) => (
            <div key={request.id}
              className="rounded-xl p-5 flex flex-col justify-between gap-4 transition-all duration-150"
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                animation: 'fadeUp 0.3s cubic-bezier(0.22,1,0.36,1) both',
                animationDelay: `${i * 40}ms`
              }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(232,234,240,0.15)'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'}>
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-sm leading-snug" style={{ color: 'var(--ink)' }}>{request.title}</h3>
                    {request.description && (
                      <p className="text-sm mt-1 mb-2 leading-relaxed" style={{ color: 'var(--ink)' }}>
                        {request.description}
                      </p>
                    )}
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ink-dim)' }}>
                      {request.unit.property.name} · Property {request.unit.unit_number.replace('Unit ', '')}
                      {request.tenant ? ` · ${request.tenant.name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {request.status === 'resolved' && (
                      <button onClick={() => setDeleteConfirmId(request.id)} className="p-1 rounded-md transition-colors hover:bg-red-50 text-red-500" title="Delete Request">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {getStatusBadge(request.status)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {getPriorityBadge(request.priority)}
                  <span className="badge-neutral uppercase font-mono">{request.category}</span>
                </div>
              </div>

              {/* Vendor Assignment UI */}
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                {request.vendor ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
                        <UserCheck className="w-4 h-4" style={{ color: '#22c55e' }} />
                      </div>
                      <div>
                        <p className="text-xs font-medium" style={{ color: 'var(--ink)' }}>{request.vendor.name}</p>
                        <p className="text-xs capitalize" style={{ color: 'var(--ink-dim)' }}>{request.vendor.category}</p>
                      </div>
                    </div>
                      <div className="flex items-center gap-2">
                        {request.status !== 'closed' && request.status !== 'resolved' && (
                          <button
                            onClick={() => handleMarkResolved(request.id)}
                            disabled={resolvingId === request.id}
                            className="text-xs font-medium px-2.5 py-1.5 rounded-md transition-colors disabled:opacity-50"
                            style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                            {resolvingId === request.id ? 'Resolving...' : 'Mark Resolved'}
                          </button>
                        )}
                        <a href={`tel:${request.vendor.phone}`} className="p-1.5 rounded transition-colors" style={{ background: 'rgba(232,234,240,0.1)' }}>
                          <Phone className="w-3.5 h-3.5" style={{ color: 'var(--ink)' }} />
                        </a>
                      </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>No vendor assigned</p>
                    {request.status !== 'resolved' && request.status !== 'closed' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleMarkResolved(request.id)}
                          disabled={resolvingId === request.id}
                          className="text-xs font-medium px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
                          style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                          {resolvingId === request.id ? 'Resolving...' : 'Mark Resolved'}
                        </button>
                        <button
                          onClick={() => setSelectedVendorRequest(request.id)}
                          className="text-xs font-medium px-2.5 py-1 rounded-md transition-colors"
                          style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary)' }}>
                          Assign Vendor
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs" style={{ color: 'var(--ink-dim)' }}>
                <span>{formatDate(request.created_at)}</span>
                {request.repair_cost && (
                  <span className="font-medium" style={{ color: 'var(--ink)' }}>Cost: {formatINR(request.repair_cost)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign Vendor Modal */}
      {selectedVendorRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in modal-backdrop"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedVendorRequest(null); }}>
          <div className="w-full max-w-md rounded-2xl p-5 space-y-4 animate-modal-pop" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base" style={{ color: 'var(--ink)' }}>Assign Vendor</h3>
              <button onClick={() => setSelectedVendorRequest(null)} className="btn-icon"><X className="w-4 h-4" /></button>
            </div>
            
            {showAddVendor ? (
              <form onSubmit={handleAddVendor} className="space-y-3">
                <input type="text" placeholder="Vendor Name" value={vName} onChange={e => setVName(e.target.value)} className="input text-sm" required />
                <input type="tel" placeholder="Phone Number" value={vPhone} onChange={e => setVPhone(e.target.value)} className="input text-sm" required />
                <select value={vCategory} onChange={e => setVCategory(e.target.value)} className="input text-sm">
                  <option value="plumbing">Plumbing</option>
                  <option value="electrical">Electrical</option>
                  <option value="appliance">Appliance</option>
                  <option value="carpentry">Carpentry</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="pest">Pest Control</option>
                  <option value="other">Other</option>
                </select>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowAddVendor(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" className="btn-primary flex-1">Add Vendor</button>
                </div>
              </form>
            ) : vendors.length === 0 ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm" style={{ color: 'var(--ink-dim)' }}>No vendors available. You need to add a vendor to your contact book first.</p>
                <button onClick={() => setShowAddVendor(true)} className="btn-primary mx-auto">
                  <Plus className="w-4 h-4" /> Add New Vendor
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {vendors.map(vendor => (
                    <div key={vendor.id} className="p-3 rounded-xl flex items-center justify-between" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{vendor.name}</p>
                        <p className="text-xs capitalize" style={{ color: 'var(--ink-dim)' }}>
                          {vendor.category} · <Star className="w-3 h-3 inline pb-0.5 text-amber-500 fill-amber-500" /> {vendor.rating}
                        </p>
                      </div>
                      <button onClick={() => handleAssignVendor(selectedVendorRequest, vendor)} className="btn-primary py-1.5 px-3 text-xs">
                        Assign
                      </button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setShowAddVendor(true)} className="btn-secondary w-full">
                  <Plus className="w-4 h-4" /> Add New Vendor
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in modal-backdrop"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirmId(null); }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-5 animate-modal-pop text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-2" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-bold text-lg" style={{ color: 'var(--ink)' }}>Delete Request?</h3>
            <p className="text-sm" style={{ color: 'var(--ink-dim)' }}>
              Are you sure you want to delete this maintenance request? This action cannot be undone and will remove it from the tenant's view as well.
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeleteConfirmId(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={performDelete} className="btn-primary flex-1" style={{ background: '#ef4444', color: 'white', border: 'none' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
