import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, FileText, ExternalLink, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { adminApi } from '../../../context/AdminContext';
import toast from 'react-hot-toast';

// Opens a private Supabase doc via a short-lived signed URL
function ViewDocButton({ storageUrl }: { storageUrl: string }) {
  const [loading, setLoading] = useState(false);

  const open = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/api/admin/signed-doc-url', {
        params: { url: storageUrl },
      });
      const signed = res.data.data.signed_url;
      window.open(signed, '_blank', 'noreferrer');
    } catch {
      toast.error('Could not open document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={open}
      disabled={loading}
      className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 shrink-0"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
      View Doc
      {!loading && <ExternalLink className="w-3 h-3" />}
    </button>
  );
}

interface KycTenant {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  kyc_status: string;
  aadhaar_verified: boolean;
  created_at: string;
  documents: { id: string; storage_url: string; file_name: string | null; verified: boolean; created_at: string }[];
}

interface PoliceTenant {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  police_verification_status: string;
  notes: string | null;
  created_at: string;
  documents: { id: string; storage_url: string; file_name: string | null; verified: boolean; created_at: string }[];
}

export default function AdminKYCReview() {
  const [kycList, setKycList]       = useState<KycTenant[]>([]);
  const [policeList, setPoliceList] = useState<PoliceTenant[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<'kyc' | 'police'>('kyc');
  const [processing, setProcessing] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      adminApi.get('/api/admin/kyc-reviews'),
      adminApi.get('/api/admin/police-reviews'),
    ])
      .then(([kycRes, policeRes]) => {
        setKycList(kycRes.data.data || []);
        setPoliceList(policeRes.data.data || []);
      })
      .catch(() => toast.error('Failed to load review queue'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleKyc = async (tenantId: string, action: 'approve' | 'reject') => {
    setProcessing(tenantId + action);
    try {
      await adminApi.patch(`/api/admin/kyc-reviews/${tenantId}/${action}`, {});
      toast.success(action === 'approve' ? 'KYC approved ✓' : 'KYC rejected');
      load();
    } catch {
      toast.error('Action failed');
    } finally {
      setProcessing(null);
    }
  };

  const handlePolice = async (tenantId: string, action: 'approve' | 'reject') => {
    setProcessing(tenantId + action);
    try {
      await adminApi.patch(`/api/admin/police-reviews/${tenantId}/${action}`, {});
      toast.success(action === 'approve' ? 'Verification approved ✓' : 'Verification rejected');
      load();
    } catch {
      toast.error('Action failed');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)' }}>
            KYC &amp; Verification Review
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--ink-dim)' }}>Approve or reject tenant identity verification submissions</p>
        </div>
        <button onClick={load} className="btn-secondary py-1.5 px-3 text-xs">Refresh</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {([['kyc', `Aadhaar KYC (${kycList.length})`], ['police', `Police Verification (${policeList.length})`]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="px-4 py-1.5 rounded-md text-xs font-medium transition-all"
            style={tab === id
              ? { background: 'var(--primary)', color: '#fff' }
              : { color: 'var(--ink-dim)' }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--primary)' }} />
        </div>
      ) : tab === 'kyc' ? (
        kycList.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--ink-dim)' }}>
            <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No pending KYC submissions</p>
          </div>
        ) : (
          <div className="space-y-3">
            {kycList.map(t => (
              <div key={t.id} className="rounded-xl p-4 space-y-3"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--ink)' }}>{t.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ink-dim)' }}>{t.phone} {t.email ? `· ${t.email}` : ''}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                      {t.kyc_status}
                    </span>
                  </div>
                  {t.documents[0] && (
                    <ViewDocButton storageUrl={t.documents[0].storage_url} />
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleKyc(t.id, 'approve')}
                    disabled={!!processing}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
                    {processing === t.id + 'approve'
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Approve KYC
                  </button>
                  <button
                    onClick={() => handleKyc(t.id, 'reject')}
                    disabled={!!processing}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                    {processing === t.id + 'reject'
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <XCircle className="w-3.5 h-3.5" />}
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        policeList.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--ink-dim)' }}>
            <ShieldAlert className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No pending police verification requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {policeList.map(t => {
              // Extract submitted address from notes
              const addrMatch = t.notes?.match(/\[POLICE_VER_ADDR\] (.+)/);
              const address = addrMatch ? addrMatch[1] : null;

              return (
                <div key={t.id} className="rounded-xl p-4 space-y-3"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-sm" style={{ color: 'var(--ink)' }}>{t.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--ink-dim)' }}>{t.phone} {t.email ? `· ${t.email}` : ''}</p>
                      {address && (
                        <p className="text-xs mt-1 px-2 py-1 rounded" style={{ background: 'var(--bg)', color: 'var(--ink-dim)', border: '1px solid var(--border)' }}>
                          📍 {address}
                        </p>
                      )}
                    </div>
                    {t.documents[0] && (
                      <ViewDocButton storageUrl={t.documents[0].storage_url} />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePolice(t.id, 'approve')}
                      disabled={!!processing}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
                      {processing === t.id + 'approve'
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Approve
                    </button>
                    <button
                      onClick={() => handlePolice(t.id, 'reject')}
                      disabled={!!processing}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                      {processing === t.id + 'reject'
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <XCircle className="w-3.5 h-3.5" />}
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
