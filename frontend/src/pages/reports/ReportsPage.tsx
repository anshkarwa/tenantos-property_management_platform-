import React, { useState } from 'react';
import { FileSpreadsheet, FileText, Download, Loader2, TrendingUp, Receipt } from 'lucide-react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

export default function ReportsPage() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [loading, setLoading] = useState<string | null>(null);

  const download = async (type: 'pl' | 'tds' | 'rent-collection') => {
    setLoading(type);
    try {
      const res = await api.get(`/api/reports/${type}?year=${year}`, { responseType: 'blob' });
      const isExcel = type === 'rent-collection';
      const ext = isExcel ? 'xlsx' : 'pdf';
      const label = type === 'pl' ? 'PL' : type === 'tds' ? 'TDS' : 'RentCollection';
      downloadBlob(res.data, `TenantOS_${label}_${year}.${ext}`);
      toast.success('Report downloaded!');
    } catch (err: any) {
      toast.error('Failed to generate report. Make sure you have data for this year.');
    } finally {
      setLoading(null);
    }
  };

  const reports = [
    {
      key: 'pl' as const,
      icon: TrendingUp,
      title: 'Profit & Loss Statement',
      desc: 'Monthly rent revenue, collection rates, maintenance costs, and net income summary. Ideal for tax assessment and CA filing.',
      btn: 'Download PDF',
      variant: 'btn-primary',
    },
    {
      key: 'tds' as const,
      icon: FileText,
      title: 'TDS Compliance Report',
      desc: 'Section 194-IB report for leases exceeding ₹50,000/month. Includes tenant PAN, rent paid, and 5% TDS deduction per tenant.',
      btn: 'Download PDF',
      variant: 'btn-secondary',
    },
    {
      key: 'rent-collection' as const,
      icon: FileSpreadsheet,
      title: 'Rent Collection Register',
      desc: 'Full Excel register of every payment — tenant name, property, amount due/paid, status, payment method, and date.',
      btn: 'Download Excel',
      variant: 'btn-secondary',
    },
    {
      key: null,
      icon: Receipt,
      title: 'HRA Rent Receipts',
      desc: 'Tenants can download individual month-wise HRA receipts from their Tenant Portal under Lease & Rent.',
      btn: null,
      variant: '',
    },
  ];

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-xl font-bold"
            style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)', letterSpacing: '-0.02em' }}
          >
            Reports
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>
            Download financial reports and compliance documents
          </p>
        </div>

        {/* Year picker */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium" style={{ color: 'var(--ink-dim)' }}>Financial Year</label>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="input py-1.5 px-3 text-sm w-32"
          >
            {YEARS.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map(r => {
          const Icon = r.icon;
          const isLoading = loading === r.key;
          return (
            <div
              key={r.key ?? 'hra'}
              className="rounded-xl p-5 flex flex-col justify-between gap-5"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="space-y-3">
                <div className="p-2 rounded-lg w-fit" style={{ background: 'rgba(232,234,240,0.06)' }}>
                  <Icon className="w-5 h-5" style={{ color: 'var(--ink-dim)' }} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{r.title}</h3>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--ink-dim)' }}>{r.desc}</p>
                </div>
              </div>

              {r.btn && r.key ? (
                <button
                  onClick={() => download(r.key!)}
                  disabled={!!loading}
                  className={`${r.variant} w-full justify-center`}
                >
                  {isLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                    : <><Download className="w-4 h-4" /> {r.btn} — {year}</>
                  }
                </button>
              ) : (
                <div
                  className="w-full text-center text-xs py-2.5 rounded-lg"
                  style={{ background: 'rgba(232,234,240,0.04)', color: 'var(--ink-dim)', border: '1px dashed var(--border)' }}
                >
                  Available in Tenant Portal
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info note */}
      <div
        className="rounded-xl p-4 text-xs leading-relaxed"
        style={{ background: 'rgba(61,123,255,0.06)', border: '1px solid rgba(61,123,255,0.15)', color: 'var(--ink-dim)' }}
      >
        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Note: </span>
        Reports are generated live from your actual data. P&L and TDS reports are PDFs formatted for CA submission.
        The Rent Collection Register is an Excel file compatible with GST software. All amounts are in INR (₹).
      </div>
    </div>
  );
}
