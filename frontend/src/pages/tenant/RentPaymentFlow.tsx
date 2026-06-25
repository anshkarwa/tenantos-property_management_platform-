import React, { useState } from 'react';
import { Check, X, ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';
import { formatINR } from '../../utils/format';
import { useCreateRentOrder, useVerifyRentPayment } from '../../hooks/useApi';

interface RentPaymentFlowProps {
  amount: number;
  month: string;
  landlordName: string;
  collectionId: string;
  onSuccess: () => void;
  onClose: () => void;
}

// Ensure typescript knows about window.Razorpay
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function RentPaymentFlow({
  amount,
  month,
  landlordName,
  collectionId,
  onSuccess,
  onClose,
}: RentPaymentFlowProps) {
  const [step, setStep] = useState<'confirm' | 'processing' | 'success'>('confirm');
  
  const createOrder = useCreateRentOrder();
  const verifyPayment = useVerifyRentPayment();

  const handlePay = async () => {
    setStep('processing');

    try {
      // 1. Create Order
      const { order_id, amount: orderAmount, currency, is_mock } = await createOrder.mutateAsync({ collection_id: collectionId });

      // If keys are missing and backend returns a mock, simulate success
      if (is_mock) {
        setTimeout(() => {
          verifyPayment.mutate({
            collection_id: collectionId,
            razorpay_order_id: order_id,
            razorpay_payment_id: 'mock_pay_12345',
            razorpay_signature: 'mock_sig',
          }, {
            onSuccess: () => setStep('success')
          });
        }, 1500);
        return;
      }

      // 2. Open Razorpay Checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderAmount,
        currency,
        name: 'TenantOS',
        description: `Rent for ${month}`,
        order_id,
        handler: async function (response: any) {
          // 3. Verify Payment Signature
          try {
            await verifyPayment.mutateAsync({
              collection_id: collectionId,
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
          color: '#6366f1', // var(--primary)
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
                {step === 'success' ? 'Payment Successful' : 'Checkout'}
              </h3>
              <p className="text-xs text-[var(--ink-dim)]">{month}</p>
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
                  <p className="text-xs text-[var(--ink-dim)] mb-0.5">Amount Due</p>
                  <p className="text-3xl font-bold text-[var(--primary)]">{formatINR(amount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[var(--ink-dim)] mb-0.5">Pay to</p>
                  <p className="text-sm font-semibold text-[var(--ink)]">{landlordName}</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-[var(--ink-dim)] text-center px-4">
              You will be redirected to the secure Razorpay gateway to complete your payment via UPI, Card, or Netbanking.
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
              <p className="font-bold text-xl text-[var(--ink)]">Payment Successful! 🎉</p>
              <p className="text-base font-semibold mt-1 text-[#22c55e]">{formatINR(amount)}</p>
              <p className="text-sm mt-2 text-[var(--ink-dim)]">Your rent for {month} is paid.</p>
            </div>
            <div className="w-full p-3 rounded-xl flex items-center gap-3 bg-[var(--bg)]">
              <ShieldCheck className="w-5 h-5 shrink-0 text-[#22c55e]" />
              <p className="text-xs text-left text-[var(--ink-dim)]">Receipt & HRA certificate are automatically generated and saved to your dashboard.</p>
            </div>
            <button onClick={onSuccess} className="btn-primary w-full justify-center">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
