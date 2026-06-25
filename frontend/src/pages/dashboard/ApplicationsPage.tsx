import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { formatINR, formatDate } from '../../utils/format';
import { Building2, CheckCircle2, XCircle, FileText, Calendar, MapPin, Search } from 'lucide-react';
import toast from 'react-hot-toast';

interface LandlordApplication {
  id: string;
  status: string;
  message: string | null;
  visit_date: string | null;
  created_at: string;
  tenant: {
    name: string;
    phone: string;
    email: string;
  };
  unit: {
    unit_number: string;
    unit_type: string;
    monthly_rent: number;
    property: {
      name: string;
      city: string;
    };
  };
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<LandlordApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const res = await api.get('/api/applications');
      setApplications(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    setProcessingId(id);
    try {
      await api.put(`/api/applications/${id}`, { status });
      toast.success(`Application marked as ${status}`);
      fetchApplications();
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)' }}>
            Applications
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>
            Review and manage tenant interest in your properties.
          </p>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-20 bg-surface border border-border rounded-xl">
          <FileText className="w-10 h-10 mx-auto text-ink-dim" style={{ opacity: 0.5 }} />
          <p className="mt-4 text-ink font-medium">No applications found</p>
          <p className="text-sm text-ink-dim mt-1">You haven't received any tenant interest yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app, i) => (
            <div key={app.id} className="bg-surface border border-border rounded-xl p-5 flex flex-col md:flex-row gap-6 animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex-1 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-semibold text-ink">{app.tenant.name}</h3>
                    <p className="text-xs text-ink-dim mt-0.5">{app.tenant.email} • {app.tenant.phone}</p>
                  </div>
                  <div>
                    <span className={`badge ${
                      app.message?.includes('[TOKEN PAID]') ? 'badge-success bg-[rgba(34,197,94,0.1)] text-[#22c55e]' :
                      app.status === 'accepted' ? 'badge-success' :
                      app.status === 'rejected' ? 'badge-danger' :
                      'badge-warning'
                    } uppercase text-[10px]`}>
                      {app.message?.includes('[TOKEN PAID]') ? 'Token Paid' : app.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-ink-dim mb-1 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Property</p>
                    <p className="text-sm font-medium text-ink">{app.unit.property.name}</p>
                    <p className="text-xs text-ink-dim">Property {app.unit.unit_number.replace('Unit ', '')} • {app.unit.unit_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-dim mb-1 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Applied</p>
                    <p className="text-sm font-medium text-ink">{formatDate(app.created_at)}</p>
                    <p className="text-xs text-ink-dim">{formatINR(app.unit.monthly_rent)}/mo</p>
                  </div>
                </div>

                {app.message && !app.message.includes('[TOKEN PAID]') && (
                  <div className="bg-[rgba(232,234,240,0.06)] rounded-lg p-3">
                    <p className="text-xs text-ink-dim mb-1">Message from applicant:</p>
                    <p className="text-sm text-ink leading-relaxed">"{app.message}"</p>
                  </div>
                )}
                {app.message?.includes('[TOKEN PAID]') && (
                  <div className="bg-[rgba(34,197,94,0.04)] border border-[rgba(34,197,94,0.1)] rounded-lg p-3">
                    <p className="text-sm font-semibold text-[#22c55e] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Token Paid (₹5,000)
                    </p>
                    <p className="text-xs text-ink-dim mt-1">
                      The tenant has successfully paid the token deposit to secure this property. 
                      {app.message.replace('[TOKEN PAID]', '').trim() ? ` Message: "${app.message.replace('[TOKEN PAID]', '').trim()}"` : ''}
                    </p>
                  </div>
                )}
              </div>

              <div className="md:w-48 flex flex-col justify-center gap-2 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
                {app.status === 'pending' ? (
                  <>
                    <button 
                      onClick={() => handleUpdateStatus(app.id, 'accepted')}
                      disabled={processingId === app.id}
                      className="btn-primary w-full justify-center"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Accept
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus(app.id, 'rejected')}
                      disabled={processingId === app.id}
                      className="btn-secondary w-full justify-center"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </>
                ) : (
                  <div className="text-center">
                    <p className="text-xs text-ink-dim mb-1">Status</p>
                    <p className={`text-sm font-semibold capitalize ${
                      app.message?.includes('[TOKEN PAID]') ? 'text-[#22c55e]' :
                      app.status === 'accepted' ? 'text-[var(--success)]' : 
                      'text-[var(--danger)]'
                    }`}>
                      {app.message?.includes('[TOKEN PAID]') ? 'Secured' : app.status}
                    </p>
                    {app.status === 'accepted' && !app.message?.includes('[TOKEN PAID]') && (
                      <p className="text-[10px] text-ink-dim mt-2 leading-tight">Waiting for tenant to pay security deposit / token.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
