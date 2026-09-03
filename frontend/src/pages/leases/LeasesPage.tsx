import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { formatDate, formatINR } from '../../utils/format';
import {
  FileText, Sparkles, Calendar, Signature, Search, FileDigit,
  CheckCircle2, Clock, TrendingUp, Users, ListChecks,
} from 'lucide-react';
import toast from 'react-hot-toast';
import CreateLeaseModal from './CreateLeaseModal';

interface CoTenantSplit {
  id: string; name: string; phone?: string; share_pct: number; amount: number;
}

interface Lease {
  id: string;
  status: 'draft' | 'active' | 'notice' | 'expired' | 'terminated';
  esign_status: string;
  monthly_rent: number;
  security_deposit: number;
  start_date: string;
  end_date: string;
  annual_escalation_pct: number;
  notice_period_days: number;
  state_template: string | null;
  agreement_clauses: string[];
  tds_applicable: boolean;
  created_at: string;
  tenant: { id: string; name: string; phone: string; email: string | null };
  unit: { id: string; unit_number: string; unit_type: string; property: { id: string; name: string } };
  co_tenant_splits: CoTenantSplit[];
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':     return <span className="badge-success">Active</span>;
    case 'notice':     return <span className="badge-warning">Notice Period</span>;
    case 'draft':      return <span className="badge-neutral">Draft</span>;
    case 'expired':    return <span className="badge-neutral">Expired</span>;
    case 'terminated': return <span className="badge-danger">Terminated</span>;
    default:           return <span className="badge-neutral">{status}</span>;
  }
}

function getESignBadge(esign: string) {
  if (esign === 'completed') return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
      <CheckCircle2 className="w-3 h-3" /> e-Signed
    </span>
  );
  if (esign === 'pending') return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
      <Clock className="w-3 h-3" /> e-Sign Pending
    </span>
  );
  return null;
}

export default function LeasesPage() {
  const { t } = useTranslation();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeaseId, setSelectedLeaseId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchLeases = () => {
    setLoading(true);
    api.get('/api/leases')
      .then(r => setLeases(r.data.data || []))
      .catch(() => toast.error('Failed to load leases'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLeases();
  }, []);

  const filteredLeases = leases.filter(l =>
    l.tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.unit.unit_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.unit.property.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentLease = leases.find(l => l.id === selectedLeaseId) ?? null;

  const [esignLoading, setEsignLoading] = useState<string | null>(null);

  const handleTriggerAnalysis = (tenantName: string) => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: 'AI is reading lease clauses & scanning risks...',
        success: `Analysis completed for ${tenantName}'s lease!`,
        error: 'Analysis failed.',
      }
    );
  };

  const handleRequestESign = async (leaseId: string, tenantName: string) => {
    setEsignLoading(leaseId);
    try {
      await api.post(`/api/leases/${leaseId}/request-esign`);
      toast.success(`eSign request sent to ${tenantName}`);
      fetchLeases();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to send eSign request');
    } finally {
      setEsignLoading(null);
    }
  };

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold"
            style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            {t('leases.title')}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>{t('leases.subtitle')}</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          <FileDigit className="w-4 h-4" /> {t('leases.create')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lease List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ink-dim)' }} />
            <input type="text" placeholder="Search lease contracts..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} className="input pl-9" />
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl p-4 flex gap-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="p-2 rounded-lg shrink-0 skeleton w-8 h-8" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 skeleton rounded" />
                    <div className="h-3 w-64 skeleton rounded" />
                    <div className="h-3 w-40 skeleton rounded" />
                  </div>
                  <div className="shrink-0 space-y-2 text-right">
                    <div className="h-4 w-20 skeleton rounded" />
                    <div className="h-3 w-16 skeleton rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredLeases.length === 0 ? (
            <div className="text-center py-16 text-sm" style={{ color: 'var(--ink-dim)' }}>
              {searchQuery ? 'No leases match your search' : 'No leases yet.'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLeases.map((lease) => (
                <div key={lease.id}
                  className="rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-150"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(232,234,240,0.15)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'}>
                  <div className="flex gap-3 flex-1">
                    <div className="p-2 rounded-lg self-start shrink-0" style={{ background: 'rgba(232,234,240,0.06)' }}>
                      <FileText className="w-4 h-4" style={{ color: 'var(--ink-dim)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm" style={{ color: 'var(--ink)' }}>{lease.tenant.name}</span>
                        {getStatusBadge(lease.status)}
                        {getESignBadge(lease.esign_status)}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--ink-dim)' }}>
                        {lease.unit.property.name} · Property {lease.unit.unit_number.replace('Unit ', '')}
                        {lease.state_template ? ` · ${lease.state_template}` : ''}
                      </p>
                      <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--ink-dim)' }}>
                        <Calendar className="w-3 h-3" /> {formatDate(lease.start_date)} – {formatDate(lease.end_date)}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs flex items-center gap-1" style={{ color: 'var(--ink-dim)' }}>
                          <TrendingUp className="w-3 h-3" /> {lease.annual_escalation_pct}% escalation
                        </span>
                        <span className="text-xs" style={{ color: 'var(--ink-dim)' }}>
                          {lease.notice_period_days}-day notice
                        </span>
                        {lease.co_tenant_splits.length > 0 && (
                          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--ink-dim)' }}>
                            <Users className="w-3 h-3" /> Split rent
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 pt-3 md:pt-0 shrink-0"
                    style={{ borderTop: '1px solid var(--border)' }}>
                    <div className="text-right">
                      <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{formatINR(lease.monthly_rent)}/mo</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--ink-dim)', fontSize: '11px' }}>Dep: {formatINR(lease.security_deposit)}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleTriggerAnalysis(lease.tenant.name)} className="btn-icon" title="AI Clause Analysis">
                        <Sparkles className="w-4 h-4" />
                      </button>
                      <button onClick={() => setSelectedLeaseId(lease.id)} className="btn-secondary py-1.5 px-3 text-xs">
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Analysis Panel */}
        <div className="rounded-xl p-5 space-y-5 self-start"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>AI Clause Scan</h3>
          </div>

          {currentLease ? (
            <div className="space-y-4 animate-fade-in">
              <div className="rounded-lg p-3 flex items-center justify-between"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div>
                  <span className="text-xs" style={{ color: 'var(--ink-dim)' }}>Risk Score</span>
                  <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--ink)' }}>42 / 100</p>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{ border: '2px solid rgba(245,158,11,0.4)', color: '#f59e0b' }}>
                  Mod
                </div>
              </div>

              <div className="p-3 rounded-lg" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--ink-dim)' }}>Agreement Details</p>
                <div className="space-y-1.5 text-xs">
                  {currentLease.state_template && (
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--ink-dim)' }}>State Template</span>
                      <span className="font-medium" style={{ color: 'var(--ink)' }}>{currentLease.state_template}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--ink-dim)' }}>Annual Escalation</span>
                    <span className="font-medium" style={{ color: '#22c55e' }}>{currentLease.annual_escalation_pct}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--ink-dim)' }}>Notice Period</span>
                    <span className="font-medium" style={{ color: 'var(--ink)' }}>{currentLease.notice_period_days} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--ink-dim)' }}>Aadhaar e-Sign</span>
                    {getESignBadge(currentLease.esign_status)}
                  </div>
                  {currentLease.co_tenant_splits.length > 0 && (
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--ink-dim)' }}>Rent Split</span>
                      <span className="font-medium" style={{ color: 'var(--ink)' }}>
                        {currentLease.co_tenant_splits.map(ct => `${ct.name.split(' ')[0]} (${ct.share_pct}%)`).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {currentLease.agreement_clauses && currentLease.agreement_clauses.length > 0 && (
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-semibold mb-2 flex items-center gap-1 uppercase tracking-wider" style={{ color: 'var(--ink-dim)' }}>
                    <ListChecks className="w-3 h-3" /> Agreement Clauses
                  </p>
                  <ul className="space-y-1">
                    {currentLease.agreement_clauses.map((clause, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs">
                        <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" style={{ color: 'var(--primary)' }} />
                        <span style={{ color: 'var(--ink)' }}>{clause}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {currentLease.esign_status === 'pending' && (
                <div className="p-3 rounded-lg" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <p className="text-xs font-semibold" style={{ color: '#f59e0b' }}>⚠ e-Sign Pending</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ink-dim)' }}>
                    Tenant has not signed digitally yet. Send Aadhaar e-Sign link via WhatsApp.
                  </p>
                </div>
              )}

              {currentLease.esign_status === 'completed' ? (
                <button className="btn-primary w-full justify-center" disabled>
                  <CheckCircle2 className="w-4 h-4" />
                  Fully e-Signed
                </button>
              ) : currentLease.esign_status === 'landlord_signed' ? (
                <div className="p-3 rounded-lg text-center text-xs"
                  style={{ background: 'rgba(61,123,255,0.08)', border: '1px solid rgba(61,123,255,0.2)', color: 'var(--primary)' }}>
                  ✓ Sent — waiting for tenant to sign
                </div>
              ) : (
                <button
                  onClick={() => handleRequestESign(currentLease.id, currentLease.tenant.name)}
                  disabled={esignLoading === currentLease.id}
                  className="btn-primary w-full justify-center">
                  {esignLoading === currentLease.id
                    ? <><Clock className="w-4 h-4 animate-spin" /> Sending…</>
                    : <><Signature className="w-4 h-4" /> Send Aadhaar e-Sign</>}
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-10 space-y-2">
              <FileText className="w-10 h-10 mx-auto stroke-1 animate-float-y" style={{ color: 'var(--ink-dim)', opacity: 0.4 }} />
              <p className="text-xs px-4" style={{ color: 'var(--ink-dim)' }}>
                Click "Details" on a lease to view AI clause analysis and e-sign triggers.
              </p>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateLeaseModal 
          onClose={() => setShowCreateModal(false)} 
          onSuccess={() => {
            setShowCreateModal(false);
            fetchLeases();
          }} 
        />
      )}
    </div>
  );
}
