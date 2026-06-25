import React, { useState, useEffect } from 'react';
import {
  FileText, AlertCircle, ChevronDown,
  ChevronUp, Printer, Info, Loader2
} from 'lucide-react';
import { formatINR, formatDateIN, isValidPAN, getFinancialYear } from '../../utils/format';
import { tenantApi } from '../../lib/api';
import toast from 'react-hot-toast';

interface HRAReceiptData {
  month: string;
  amount: number;
  paid_at: string;
  receipt_number: string;
  landlord_name: string;
  landlord_pan: string;
  landlord_address: string;
  tenant_name: string;
  tenant_pan: string | null;
  property_address: string;
}

interface Payment {
  id: string;
  due_date: string;
  amount_due: number;
  amount_paid: number | null;
  status: string;
  paid_at: string | null;
  payment_method: string | null;
  receipt_number: string | null;
}

interface Me {
  name: string;
  pan: string | null;
  active_lease: {
    monthly_rent: number;
    unit: {
      unit_number: string;
      property: {
        name: string;
        address_line1: string;
        city: string;
        landlord: { name: string; phone: string; pan: string | null };
      };
    };
  } | null;
}

function PANValidationBadge({ pan }: { pan: string | null }) {
  if (!pan) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
        style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
        <AlertCircle className="w-3 h-3" /> PAN Missing
      </span>
    );
  }
  const valid = isValidPAN(pan);
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
      style={{
        background: valid ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
        color: valid ? "#22c55e" : "#ef4444",
      }}>
      {valid ? "✓" : "✗"} {valid ? "PAN Valid" : "PAN Invalid"}
    </span>
  );
}

function monthLabel(due_date: string) {
  return new Date(due_date).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function HRAReceiptPrint({ data }: { data: HRAReceiptData }) {
  const annualRent = data.amount * 12;
  const panRequired = annualRent > 100000;
  return (
    <div className="p-6 text-sm" style={{ fontFamily: "Inter, sans-serif", color: "#111", background: "#fff", minHeight: "400px" }}>
      <div className="text-center border-b-2 border-gray-300 pb-4 mb-4">
        <h1 className="text-xl font-bold uppercase tracking-wider">RENT RECEIPT</h1>
        <p className="text-xs text-gray-500 mt-1">For House Rent Allowance (HRA) Tax Exemption</p>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div><p className="text-xs text-gray-500">Receipt Number</p><p className="font-bold">{data.receipt_number}</p></div>
        <div className="text-right"><p className="text-xs text-gray-500">Date</p><p className="font-bold">{data.paid_at ? formatDateIN(data.paid_at) : "—"}</p></div>
      </div>
      <div className="border border-gray-200 rounded-lg p-4 mb-4 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment Details</p>
        <div className="flex justify-between"><span className="text-gray-600">For the Month of</span><span className="font-semibold">{data.month}</span></div>
        <div className="flex justify-between border-t pt-2"><span className="font-bold">Amount Paid</span><span className="font-bold text-lg">{formatINR(data.amount)}</span></div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="border border-gray-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Received From (Tenant)</p>
          <p className="font-semibold">{data.tenant_name}</p>
          <p className="text-xs text-gray-500 mt-1">PAN: {data.tenant_pan || "Not Provided"}</p>
          <p className="text-xs text-gray-500">Property: {data.property_address}</p>
        </div>
        <div className="border border-gray-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Received By (Landlord)</p>
          <p className="font-semibold">{data.landlord_name}</p>
          <p className="text-xs text-gray-500 mt-1">PAN: {data.landlord_pan || (panRequired ? "⚠ Required (annual rent > ₹1L)" : "Not Required")}</p>
          <p className="text-xs text-gray-500">{data.landlord_address}</p>
        </div>
      </div>
      <div className="border-t-2 border-gray-300 pt-4 mt-4">
        <p className="text-xs text-gray-500 italic">I hereby declare that the rent mentioned above has been paid by the above-mentioned tenant for the property at the above-mentioned address. This receipt is issued for the purpose of claiming HRA exemption under Section 10(13A) of the Income Tax Act, 1961.</p>
        <div className="flex justify-between mt-6 pt-4 border-t border-dashed border-gray-200">
          <div><p className="text-xs text-gray-400">Tenant Signature</p><div className="w-28 border-b border-gray-400 mt-8" /></div>
          <div className="text-right"><p className="text-xs text-gray-400">Landlord Signature</p><div className="w-28 border-b border-gray-400 mt-8" /></div>
        </div>
      </div>
    </div>
  );
}

export default function RentReceiptsPage({ onBack }: { onBack: () => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>(getFinancialYear());
  const [me, setMe] = useState<Me | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      tenantApi.get("/api/tenant/me"),
      tenantApi.get("/api/tenant/payments"),
    ]).then(([meRes, paymentsRes]) => {
      setMe(meRes.data.data);
      setPayments(paymentsRes.data.data || []);
    }).catch(() => toast.error("Failed to load receipts"))
    .finally(() => setLoading(false));
  }, []);

  const paidRecordsAll = payments.filter(p => p.status === "paid" || p.status === "late");
  
  const availableYears = Array.from(new Set(paidRecordsAll.map(p => getFinancialYear(new Date(p.due_date))))).sort().reverse();
  const currentFY = getFinancialYear();
  if (!availableYears.includes(currentFY)) {
    availableYears.unshift(currentFY);
  }

  // Ensure selected year is in available years, otherwise reset
  useEffect(() => {
    if (!availableYears.includes(selectedYear) && availableYears.length > 0) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const paidRecords = paidRecordsAll.filter(p => getFinancialYear(new Date(p.due_date)) === selectedYear);

  const lease = me?.active_lease || null;
  const annualRent = (lease?.monthly_rent || 0) * 12;
  const panRequired = annualRent > 100000;
  const landlordPan = lease?.unit.property.landlord.pan || null;
  const landlordPanValid = isValidPAN(landlordPan);
  const propertyAddress = lease ? `${lease.unit.unit_number}, ${lease.unit.property.name}, ${lease.unit.property.city}` : "";

  const handlePrint = async (record: Payment) => {
    setDownloadingId(record.id);
    try {
      const res = await tenantApi.get(`/api/tenant/receipts/${record.id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 5000);
    } catch (err) {
      toast.error('Failed to generate PDF for printing');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto p-4 pb-24 space-y-4">
        <div className="pt-2">
          <h2 className="text-xl font-bold" style={{ color: "var(--ink)" }}>HRA Receipts</h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--ink-dim)" }}>Download rent receipts for income tax HRA exemption</p>
        </div>

        {lease && (
          <div className="p-4 rounded-xl" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}>
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--primary)" }} />
              <div className="text-xs space-y-1" style={{ color: "var(--ink)" }}>
                <p className="font-semibold">HRA Exemption (Sec 10(13A))</p>
                <p style={{ color: "var(--ink-dim)" }}>
                  Annual rent is <strong>{formatINR(annualRent)}</strong>.{" "}
                  {panRequired ? "Since this exceeds ₹1,00,000/year, Landlord PAN is mandatory for HRA claims." : "Landlord PAN is not mandatory (annual rent ≤ ₹1,00,000)."}
                </p>
                {panRequired && (
                  <div className="flex items-center gap-2 mt-1">
                    <span style={{ color: "var(--ink-dim)" }}>Landlord PAN:</span>
                    <span className="font-mono font-semibold" style={{ color: "var(--ink)" }}>{landlordPan || "Not on file"}</span>
                    <PANValidationBadge pan={landlordPan} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: "var(--ink-dim)" }}>Financial Year:</span>
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
            className="text-sm rounded-lg px-3 py-1.5 font-medium cursor-pointer"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--ink)" }}>
            {availableYears.map(year => (
              <option key={year} value={year}>FY {year}</option>
            ))}
          </select>
        </div>

        {paidRecords.length === 0 ? (
          <div className="text-center py-12 text-sm" style={{ color: "var(--ink-dim)" }}>No paid receipts yet</div>
        ) : (
          <div className="space-y-3">
            {paidRecords.map(record => (
              <div key={record.id} className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(99,102,241,0.1)" }}>
                      <FileText className="w-4 h-4" style={{ color: "var(--primary)" }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{monthLabel(record.due_date)}</p>
                      <p className="text-xs" style={{ color: "var(--ink-dim)" }}>
                        {record.receipt_number || `RC-${record.id.slice(0,8).toUpperCase()}`} · {record.paid_at ? formatDateIN(record.paid_at) : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm" style={{ color: "var(--ink)" }}>{formatINR(record.amount_paid || record.amount_due)}</span>
                    <button 
                      onClick={() => handlePrint(record)} 
                      disabled={downloadingId === record.id}
                      className="p-2 rounded-lg transition-all disabled:opacity-50" 
                      style={{ color: "var(--primary)", background: "rgba(99,102,241,0.08)" }} 
                      title="Print"
                    >
                      {downloadingId === record.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setExpandedId(expandedId === record.id ? null : record.id)} className="p-2 rounded-lg transition-all" style={{ color: "var(--ink-dim)", background: "var(--bg)" }}>
                      {expandedId === record.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {expandedId === record.id && (
                  <div id={`receipt-${record.id}`} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <HRAReceiptPrint data={{
                      month: monthLabel(record.due_date),
                      amount: record.amount_paid || record.amount_due,
                      paid_at: record.paid_at || "",
                      receipt_number: record.receipt_number || `RC-${record.id.slice(0,8).toUpperCase()}`,
                      landlord_name: lease?.unit.property.landlord.name || "—",
                      landlord_pan: landlordPan || "",
                      landlord_address: propertyAddress,
                      tenant_name: me?.name || "—",
                      tenant_pan: me?.pan || null,
                      property_address: propertyAddress,
                    }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="p-4 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-sm font-bold mb-3" style={{ color: "var(--ink)" }}>Annual Summary — FY {selectedYear}</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span style={{ color: "var(--ink-dim)" }}>Receipts Generated</span><span className="font-semibold" style={{ color: "var(--ink)" }}>{paidRecords.length}</span></div>
            <div className="flex justify-between text-sm"><span style={{ color: "var(--ink-dim)" }}>Total Rent Paid</span><span className="font-semibold" style={{ color: "var(--ink)" }}>{formatINR(paidRecords.reduce((s, r) => s + (r.amount_paid || r.amount_due), 0))}</span></div>
            <div className="flex justify-between text-sm border-t pt-2" style={{ borderColor: "var(--border)" }}>
              <span style={{ color: "var(--ink-dim)" }}>HRA Eligible</span>
              <span className="font-semibold" style={{ color: landlordPanValid || !panRequired ? "#22c55e" : "#ef4444" }}>
                {landlordPanValid || !panRequired ? "✓ Yes" : "✗ PAN Missing"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
