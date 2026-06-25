import React, { useState } from 'react';
import { MessageCircle, Check, Clock, X, Send, ChevronDown } from 'lucide-react';
import { formatINR } from '../utils/format';

export type NotificationType = 'rent_reminder' | 'rent_receipt' | 'maintenance_update' | 'lease_expiry' | 'police_verification';

interface WhatsAppNotification {
  type: NotificationType;
  tenantName: string;
  tenantPhone: string;
  data: Record<string, string | number>;
}

interface WhatsAppNotifierProps {
  notification: WhatsAppNotification;
  onClose: () => void;
}

const TEMPLATES: Record<NotificationType, (data: Record<string, string | number>) => string> = {
  rent_reminder: (d) =>
    `🏠 *Kiraya Reminder — TenantOS*\n\nNamaste ${d.tenantName}! 🙏\n\nYour rent of *${formatINR(Number(d.amount))}* for *${d.month}* is due on *${d.dueDate}*.\n\nPay karo UPI se: *${d.upiId}*\n\nSamay pe kiraya dene ke liye shukriya! 🙂\n\n— ${d.landlordName} (via TenantOS)`,

  rent_receipt: (d) =>
    `✅ *Kiraya Receipt — TenantOS*\n\nNamaste ${d.tenantName}!\n\nHamein *${formatINR(Number(d.amount))}* ${d.month} ka kiraya mil gaya. Dhanyavaad! 🎉\n\nReceipt No: *${d.receiptNumber}*\nYour HRA receipt is available in the TenantOS app.\n\n— ${d.landlordName}`,

  maintenance_update: (d) =>
    `🔧 *Maintenance Update — TenantOS*\n\nNamaste ${d.tenantName}!\n\nAapki request *"${d.issueTitle}"* ka update:\n\nStatus: *${d.status}*\n${d.vendorName ? `Vendor: ${d.vendorName}` : ''}\n${d.note ? `Note: ${d.note}` : ''}\n\nKoi pareshani ho to reply karein.\n\n— ${d.landlordName}`,

  lease_expiry: (d) =>
    `📋 *Lease Expiry Alert — TenantOS*\n\nNamaste ${d.tenantName}!\n\nAapka rent agreement *${d.endDate}* ko khatam ho raha hai.\n\nRenewal ke liye ghar malik se baat karein.\n\n— TenantOS`,

  police_verification: (d) =>
    `🔐 *Police Verification — TenantOS*\n\nNamaste ${d.tenantName}!\n\nKripya police verification ke liye apne documents (Aadhaar / Voter ID / Passport) jaldi se upload karein.\n\nYeh aapki suraksha ke liye zaroori hai. 🙏\n\n— ${d.landlordName}`,
};

const TYPE_LABELS: Record<NotificationType, string> = {
  rent_reminder: 'Rent Reminder',
  rent_receipt: 'Payment Receipt',
  maintenance_update: 'Maintenance Update',
  lease_expiry: 'Lease Expiry Alert',
  police_verification: 'Police Verification Request',
};

type SendStatus = 'idle' | 'sending' | 'sent' | 'failed';

export default function WhatsAppNotifier({ notification, onClose }: WhatsAppNotifierProps) {
  const [status, setStatus] = useState<SendStatus>('idle');
  const [showPreview, setShowPreview] = useState(true);

  const message = TEMPLATES[notification.type](notification.data);
  const encodedMessage = encodeURIComponent(message);
  const phone = notification.tenantPhone.replace(/\D/g, '');
  const waLink = `https://wa.me/${phone}?text=${encodedMessage}`;

  const handleSend = () => {
    setStatus('sending');
    // Mock API call — in production this would call Gupshup/Twilio WhatsApp API
    setTimeout(() => {
      setStatus('sent');
    }, 1200);
  };

  const handleOpenWhatsApp = () => {
    window.open(waLink, '_blank');
    setStatus('sent');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ background: '#25D366' }}>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-white" />
            <span className="text-white font-semibold text-sm">WhatsApp Notification</span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Recipient */}
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--ink-dim)' }}>Sending to</p>
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{notification.tenantName}</p>
                <p className="text-xs font-mono" style={{ color: 'var(--ink-dim)' }}>{notification.tenantPhone}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(37,211,102,0.12)', color: '#25D366' }}>
                {TYPE_LABELS[notification.type]}
              </span>
            </div>
          </div>

          {/* Message Preview Toggle */}
          <div>
            <button
              onClick={() => setShowPreview((p) => !p)}
              className="flex items-center gap-1 text-xs font-medium"
              style={{ color: 'var(--ink-dim)' }}
            >
              Message Preview
              <ChevronDown
                className="w-3 h-3 transition-transform"
                style={{ transform: showPreview ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>
            {showPreview && (
              <div
                className="mt-2 p-3 rounded-xl text-xs whitespace-pre-line leading-relaxed"
                style={{
                  background: '#E8F5E9',
                  color: '#1B5E20',
                  border: '1px solid #A5D6A7',
                  fontFamily: 'system-ui, sans-serif',
                  maxHeight: '200px',
                  overflowY: 'auto',
                }}
              >
                {message}
              </div>
            )}
          </div>

          {/* Actions */}
          {status === 'sent' ? (
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.2)' }}>
              <Check className="w-4 h-4" style={{ color: '#25D366' }} />
              <p className="text-sm font-medium" style={{ color: '#25D366' }}>Message sent successfully!</p>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSend}
                disabled={status === 'sending'}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: status === 'sending' ? 'rgba(37,211,102,0.4)' : '#25D366',
                  color: '#fff',
                }}
              >
                {status === 'sending' ? (
                  <>
                    <Clock className="w-4 h-4 animate-pulse" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send via API
                  </>
                )}
              </button>
              <button
                onClick={handleOpenWhatsApp}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--ink)',
                }}
              >
                <MessageCircle className="w-4 h-4" />
                Open WA
              </button>
            </div>
          )}

          <p className="text-xs text-center" style={{ color: 'var(--ink-dim)' }}>
            Powered by Gupshup / Twilio WhatsApp API (mock)
          </p>
        </div>
      </div>
    </div>
  );
}
