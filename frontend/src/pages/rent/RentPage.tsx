import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { formatDate, formatINR, calcTDS, calcGST } from '../../utils/format';
import {
  Search, CheckCircle2, Clock, AlertTriangle, Download,
  MessageSquare, SlidersHorizontal, IndianRupee,
  Zap, Receipt, Info, Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import WhatsAppNotifier from '../../components/WhatsAppNotifier';

const TDS_THRESHOLD_MONTHLY = 50000;

interface CoTenantPayment {
  id: string; name: string; amount: number; status: string;
}

interface RentCollection {
  id: string;
  status: 'pending' | 'paid' | 'overdue' | 'late' | 'waived';
  amount_due: number;
  amount_paid: number;
  due_date: string;
  paid_at: string | null;
  payment_method: string | null;
  upi_ref: string | null;
  receipt_number: string | null;
  late_fee_applied: number;
  tds_deducted: number;
  gst_amount: number;
  lease: {
    id: string;
    monthly_rent: number;
    tenant: { id: string; name: string; phone: string };
    unit: { unit_number: string; property: { name: string } };
  };
  co_tenant_payments: CoTenantPayment[];
}

export default function RentPage() {
  const { t } = useTranslation();
  const [collections, setCollections] = useState<RentCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [whatsappTarget, setWhatsappTarget] = useState<null | { name: string; phone: string; amount: number }>(null);

  useEffect(() => {
    api.get('/api/rent')
      .then(r => setCollections(r.data.data || []))
      .catch(() => toast.error('Failed to load rent collections'))
      .finally(() => setLoading(false));
  }, []);

  const filteredCollections = collections.filter(c =>
    c.lease.tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lease.unit.unit_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lease.unit.property.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCollected = collections.filter(c => c.status === 'paid').reduce((s, c) => s + c.amount_paid, 0);
  const totalPending   = collections.filter(c => c.status !== 'paid').reduce((s, c) => s + c.amount_due, 0);
  const tdsYtd         = collections.filter(c => c.status === 'paid').reduce((s, c) => s + (c.tds_deducted || 0), 0);
  const gstYtd         = collections.filter(c => c.status === 'paid').reduce((s, c) => s + (c.gst_amount || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':    return <span className="badge-success inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Paid</span>;
      case 'pending': return <span className="badge-warning inline-flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>;
      case 'overdue':
      case 'late':    return <span className="badge-danger inline-flex items-center gap-1 badge-urgent-pulse"><AlertTriangle className="w-3 h-3" /> {status === 'overdue' ? 'Overdue' : 'Late'}</span>;
      default:        return <span className="badge-neutral">{status}</span>;
    }
  };

  const handleDownloadReceipt = (receipt: string) => {
    toast.success(`Receipt ${receipt} generated & downloaded!`);
  };

  const handleSendReminder = (c: RentCollection) => {
    setWhatsappTarget({ name: c.lease.tenant.name, phone: c.lease.tenant.phone, amount: c.lease.monthly_rent });
  };

  return (
    <div className="space-y-5 page-enter">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            {t('rent.title')}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>{t('rent.subtitle')}</p>
        </div>
        <button onClick={() => toast.success('UPI collection link generated!')} className="btn-primary animate-fade-up">
          <IndianRupee className="w-4 h-4" /> {t('rent.collect')}
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-up delay-100">
        {[
          { label: 'Collected This Month', value: formatINR(totalCollected), color: '#22c55e', icon: CheckCircle2 },
          { label: 'Pending / Overdue',    value: formatINR(totalPending),   color: '#ef4444', icon: AlertTriangle },
          { label: 'TDS Tracked (YTD)',    value: formatINR(tdsYtd),         color: '#f59e0b', icon: Receipt },
          { label: 'GST Collected (YTD)',  value: formatINR(gstYtd),         color: 'var(--primary)', icon: IndianRupee },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-4 h-4" style={{ color }} />
              <span className="text-xs" style={{ color: 'var(--ink-dim)' }}>{label}</span>
            </div>
            <p className="text-lg font-bold" style={{ color: 'var(--ink)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* TDS/GST Info Banner */}
      <div className="p-4 rounded-xl animate-fade-up delay-150" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--primary)' }} />
          <div className="text-xs space-y-1">
            <p className="font-semibold" style={{ color: 'var(--ink)' }}>Indian Tax Compliance</p>
            <p style={{ color: 'var(--ink-dim)' }}>
              <strong style={{ color: 'var(--ink)' }}>TDS (Sec 194-IB):</strong> 5% TDS applies when monthly rent exceeds {formatINR(TDS_THRESHOLD_MONTHLY)}.
            </p>
            <p style={{ color: 'var(--ink-dim)' }}>
              <strong style={{ color: 'var(--ink)' }}>GST (18%):</strong> Applicable on commercial properties.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between animate-fade-up delay-200">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ink-dim)' }} />
          <input type="text" placeholder="Search tenant, unit or property..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)} className="input pl-9" />
        </div>
        <button className="btn-secondary w-full md:w-auto">
          <SlidersHorizontal className="w-4 h-4" /> {t('common.filter')}
        </button>
      </div>

      {loading && (
        <div className="table-container hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Tenant','Unit / Property','Due Date','Amount','TDS / GST','Method','Split','Status','Actions'].map(h => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="table-cell"><div className="h-3.5 w-28 skeleton rounded" /></td>
                    <td className="table-cell"><div className="space-y-1"><div className="h-3.5 w-16 skeleton rounded" /><div className="h-3 w-24 skeleton rounded" /></div></td>
                    <td className="table-cell"><div className="h-3.5 w-20 skeleton rounded" /></td>
                    <td className="table-cell"><div className="h-3.5 w-16 skeleton rounded" /></td>
                    <td className="table-cell"><div className="h-3 w-12 skeleton rounded" /></td>
                    <td className="table-cell"><div className="h-5 w-12 skeleton rounded-full" /></td>
                    <td className="table-cell"><div className="h-3 w-8 skeleton rounded" /></td>
                    <td className="table-cell"><div className="h-5 w-14 skeleton rounded-full" /></td>
                    <td className="table-cell text-right"><div className="h-7 w-7 skeleton rounded-lg ml-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && (
        <>
          {/* Mobile Cards */}
          <div className="flex flex-col gap-3 md:hidden animate-fade-up delay-200">
            {filteredCollections.map((c, i) => {
              const tds = calcTDS(c.amount_due);
              const hasCoTenants = c.co_tenant_payments.length > 0;
              return (
                <div key={c.id} className="p-4 rounded-xl space-y-3"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', animationDelay: `${i * 40}ms` }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{c.lease.tenant.name}</p>
                      <p className="text-xs" style={{ color: 'var(--ink-dim)' }}>
                        Property {c.lease.unit.unit_number.replace('Unit ', '')} · {c.lease.unit.property.name} · Due {formatDate(c.due_date)}
                      </p>
                    </div>
                    {getStatusBadge(c.status)}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold" style={{ color: 'var(--ink)' }}>{formatINR(c.amount_due)}</p>
                      {tds > 0 && <p className="text-xs" style={{ color: '#f59e0b' }}>TDS: {formatINR(tds)}</p>}
                    </div>
                    <div className="flex gap-1.5">
                      {c.status === 'paid' && c.receipt_number && (
                        <button onClick={() => handleDownloadReceipt(c.receipt_number!)} className="btn-icon">
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      {c.status !== 'paid' && (
                        <button onClick={() => handleSendReminder(c)} className="btn-icon">
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {hasCoTenants && (
                    <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                      <p className="text-xs font-medium mb-1.5 flex items-center gap-1" style={{ color: 'var(--ink-dim)' }}>
                        <Users className="w-3 h-3" /> Split Payment
                      </p>
                      <div className="space-y-1">
                        {c.co_tenant_payments.map((ct, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span style={{ color: 'var(--ink)' }}>{ct.name}</span>
                            <div className="flex items-center gap-2">
                              <span style={{ color: 'var(--ink-dim)' }}>{formatINR(ct.amount)}</span>
                              <span className={ct.status === 'paid' ? 'badge-success' : 'badge-warning'}>
                                {ct.status === 'paid' ? '✓' : 'Pending'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {filteredCollections.length === 0 && (
              <div className="text-center py-16 text-sm" style={{ color: 'var(--ink-dim)' }}>
                {searchQuery ? 'No records match your search' : 'No rent collections yet.'}
              </div>
            )}
          </div>

          {/* Desktop Table */}
          <div className="table-container animate-fade-up delay-200 hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse">
                <thead>
                  <tr>
                    <th className="table-header">Tenant</th>
                    <th className="table-header">Unit / Property</th>
                    <th className="table-header">Due Date</th>
                    <th className="table-header">Amount</th>
                    <th className="table-header">TDS / GST</th>
                    <th className="table-header">Method</th>
                    <th className="table-header">Split</th>
                    <th className="table-header">Status</th>
                    <th className="table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCollections.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="table-cell text-center py-16 text-sm" style={{ color: 'var(--ink-dim)' }}>
                        {searchQuery ? 'No records match your search' : 'No rent collections yet.'}
                      </td>
                    </tr>
                  ) : filteredCollections.map((c, i) => {
                    const tds = calcTDS(c.amount_due);
                    const gst = c.gst_amount;
                    const hasCoTenants = c.co_tenant_payments.length > 0;
                    return (
                      <tr key={c.id} className="table-row"
                        style={{ animation: 'fadeUp 0.3s cubic-bezier(0.22,1,0.36,1) both', animationDelay: `${i * 40}ms` }}>
                        <td className="table-cell">
                          <div className="font-medium text-sm" style={{ color: 'var(--ink)' }}>{c.lease.tenant.name}</div>
                        </td>
                        <td className="table-cell">
                          <div className="text-sm font-mono" style={{ color: 'var(--ink)' }}>Property {c.lease.unit.unit_number.replace('Unit ', '')}</div>
                          <div className="text-xs" style={{ color: 'var(--ink-dim)' }}>{c.lease.unit.property.name}</div>
                        </td>
                        <td className="table-cell">
                          <span className="text-sm" style={{ color: 'var(--ink)' }}>{formatDate(c.due_date)}</span>
                        </td>
                        <td className="table-cell">
                          <div>
                            <span className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{formatINR(c.amount_due)}</span>
                            {c.late_fee_applied > 0 && (
                              <div className="text-xs" style={{ color: '#ef4444' }}>+{formatINR(c.late_fee_applied)} late fee</div>
                            )}
                          </div>
                        </td>
                        <td className="table-cell">
                          {tds > 0 ? (
                            <div className="text-xs"><span style={{ color: '#f59e0b' }}>TDS: {formatINR(tds)}</span></div>
                          ) : gst > 0 ? (
                            <div className="text-xs"><span style={{ color: 'var(--primary)' }}>GST: {formatINR(gst)}</span></div>
                          ) : (
                            <span className="text-xs" style={{ color: 'var(--ink-dim)' }}>—</span>
                          )}
                        </td>
                        <td className="table-cell">
                          {c.payment_method ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary)' }}>
                              {c.payment_method === 'upi' && <Zap className="w-3 h-3" />}
                              {c.payment_method.toUpperCase()}
                            </span>
                          ) : (
                            <span className="text-xs" style={{ color: 'var(--ink-dim)' }}>—</span>
                          )}
                        </td>
                        <td className="table-cell">
                          {hasCoTenants ? (
                            <div className="space-y-1">
                              {c.co_tenant_payments.map((ct, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-xs">
                                  <span style={{ color: 'var(--ink)' }}>{ct.name.split(' ')[0]}</span>
                                  <span className={ct.status === 'paid' ? 'badge-success' : 'badge-warning'}>
                                    {ct.status === 'paid' ? '✓ Paid' : 'Pending'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs" style={{ color: 'var(--ink-dim)' }}>—</span>
                          )}
                        </td>
                        <td className="table-cell">{getStatusBadge(c.status)}</td>
                        <td className="table-cell text-right">
                          <div className="flex items-center justify-end gap-1">
                            {c.status === 'paid' && c.receipt_number && (
                              <button onClick={() => handleDownloadReceipt(c.receipt_number!)} className="btn-icon" title="Download Receipt">
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                            {c.status !== 'paid' && (
                              <button onClick={() => handleSendReminder(c)} className="btn-icon" title="Send WhatsApp Reminder">
                                <MessageSquare className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {whatsappTarget && (
        <WhatsAppNotifier
          notification={{
            type: 'rent_reminder',
            tenantName: whatsappTarget.name,
            tenantPhone: whatsappTarget.phone,
            data: {
              tenantName: whatsappTarget.name,
              amount: whatsappTarget.amount,
              month: 'June 2026',
              dueDate: '5th June 2026',
              upiId: 'ansh.karwa@hdfcbank',
              landlordName: 'Ansh Karwa',
            },
          }}
          onClose={() => setWhatsappTarget(null)}
        />
      )}
    </div>
  );
}
