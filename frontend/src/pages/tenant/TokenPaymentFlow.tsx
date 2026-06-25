import React, { useState } from 'react';
import { Check, X, ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';
import { formatINR } from '../../utils/format';
import { tenantApi } from '../../lib/api';

interface TokenPaymentFlowProps {
  applicationId: string;
  amount: number;
  propertyName: string;
  onSuccess: () => void;
  onClose: () => void;
}

export default function TokenPaymentFlow({
  applicationId,
  amount,
  propertyName,
  onSuccess,
  onClose,
}: TokenPaymentFlowProps) {
  const [step, setStep] = useState<'confirm' | 'processing' | 'success'>('confirm');

  const handlePay = async () => {
    setStep('processing');

    try {
      // 1. Create Order
      const { data } = await tenantApi.post(`/api/tenant/applications/${applicationId}/pay-token/create-order`);
      const { order_id, amount: orderAmount, currency, is_mock } = data.data;

      // If keys are missing and backend returns a mock, simulate success
      if (is_mock) {
        setTimeout(async () => {
          await tenantApi.post(`/api/tenant/applications/${applicationId}/pay-token/verify`, {
            razorpay_order_id: order_id,
            razorpay_payment_id: 'mock_pay_12345',
            razorpay_signature: 'mock_sig',
          });
          setStep('success');
        }, 1500);
        return;
      }

      // 2. Open Razorpay Checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderAmount,
        currency,
        name: 'TenantOS',
        description: `Token Deposit for ${propertyName}`,
        order_id,
        handler: async function (response: any) {
          // 3. Verify Payment Signature
          try {
            await tenantApi.post(`/api/tenant/applications/${applicationId}/pay-token/verify`, {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
            setStep('success');
          } catch (err) {
            setStep('confirm'); // Go back on failure
          }
        },
        prefill: {
          name: 'Tenant',
          email: 'tenant@tenantos.com',
          contact: '9999999999',
        },
        theme: {
          color: '#6366f1',
        },
      };

      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', function (response: any) {
        setStep('confirm');
      });

      rzp.open();
    } catch (error) {
      setStep('confirm');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden animate-slide-up"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            {step === 'confirm' && (
              <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--ink-dim)]">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h3 className="font-bold text-base text-[var(--ink)]">
                {step === 'success' ? 'Property Secured!' : 'Pay Token Amount'}
              </h3>
              <p className="text-xs text-[var(--ink-dim)] truncate w-48">{propertyName}</p>
            </div>
          </div>
          {step !== 'processing' && (
            <button onClick={onClose} className="p-2 rounded-xl text-[var(--ink-dim)] bg-[var(--bg)]">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Step: Confirm Payment */}
        {step === 'confirm' && (
          <div className="p-5 space-y-4">
            <div className="p-4 rounded-xl bg-[var(--bg)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[var(--ink-dim)] mb-0.5">Token Deposit</p>
                  <p className="text-3xl font-bold text-[var(--primary)]">{formatINR(amount)}</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-[var(--ink-dim)] text-center px-4">
              Secure this property by paying a refundable token deposit via Razorpay.
            </p>

            <button onClick={handlePay} className="btn-primary w-full justify-center py-3 text-base">
              Pay Securely
            </button>
          </div>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <div className="p-10 flex flex-col items-center gap-4 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            <div>
              <p className="font-bold text-base text-[var(--ink)]">Securely initializing payment...</p>
              <p className="text-sm text-[var(--ink-dim)] mt-1">Please do not close this window</p>
            </div>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="p-5 flex flex-col items-center gap-4 text-center pb-8">
            <div className="w-20 h-20 rounded-full flex items-center justify-center bg-[rgba(34,197,94,0.15)] border-2 border-[rgba(34,197,94,0.3)]">
              <Check className="w-10 h-10 text-[#22c55e]" />
            </div>
            <div>
              <p className="font-bold text-xl text-[var(--ink)]">Congratulations! 🎉</p>
              <p className="text-sm mt-2 text-[var(--ink-dim)]">You have successfully secured the property. The landlord will contact you shortly to finalize the lease agreement.</p>
            </div>
            <button onClick={onSuccess} className="btn-primary w-full justify-center">
              View Application
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
