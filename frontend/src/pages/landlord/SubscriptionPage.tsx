import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Check, ArrowRight, Shield, Clock } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const unwrap = (res: any) => res.data.data;

const LANDLORD_PLANS = [
  { 
    id: 'free', 
    name: 'Starter', 
    subtitle: 'Up to 2 Units', 
    priceDisplay: 'Free', 
    badge: '', 
    perks: ['Basic tenant registration', 'Manual rent tracking', 'Standard lease templates', 'WhatsApp payment links'] 
  },
  { 
    id: 'pro', 
    name: 'Pro Landlord', 
    subtitle: '3 - 50 Units', 
    priceDisplay: '₹49', 
    period: '/unit/month',
    badge: 'MOST POPULAR', 
    perks: ['Everything in Starter', 'Auto UPI Rent Collection', 'Instant Aadhaar KYC', 'Automated WhatsApp reminders', 'AI Lease Clause Analysis (5/mo)', 'P&L & TDS reports export'] 
  },
  { 
    id: 'portfolio', 
    name: 'Portfolio', 
    subtitle: '50+ Units / PG Operators', 
    priceDisplay: '₹39', 
    period: '/unit/month',
    badge: '', 
    perks: ['Everything in Pro', 'Priority settlements', 'Dedicated WhatsApp Bot', 'Unlimited AI lease parsing', 'Multi-manager permissions', 'Custom legal agreements'] 
  },
];

export default function SubscriptionPage() {
  const { landlord, refreshLandlord } = useAuth();
  const currentTier = landlord?.subscription_tier || 'free';

  const [step, setStep] = useState<'plans' | 'processing' | 'success'>('plans');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const createOrder = useMutation({
    mutationFn: (data: { plan_id: string }) => 
      api.post('/api/dashboard/subscription/create-order', data).then(unwrap),
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Failed to initialize payment'),
  });

  const verifySubscription = useMutation({
    mutationFn: (data: any) => 
      api.post('/api/dashboard/subscription/verify', data).then(unwrap),
    onSuccess: () => {
      refreshLandlord();
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message || 'Verification failed'),
  });

  const handlePay = async (planId: string) => {
    if (planId === 'free') {
      toast.success('You are already on the Free Starter plan.');
      return;
    }
    
    setLoadingId(planId);

    try {
      // 1. Create Order
      const { order_id, amount, currency, is_mock } = (await createOrder.mutateAsync({ plan_id: planId })) as any;

      // If mock mode
      if (is_mock) {
        setStep('processing');
        setTimeout(() => {
          verifySubscription.mutate({
            plan_id: planId,
            razorpay_order_id: order_id,
            razorpay_payment_id: 'mock_pay_123',
            razorpay_signature: 'mock_sig',
          }, {
            onSuccess: () => setStep('success'),
            onError: () => { setStep('plans'); setLoadingId(null); }
          });
        }, 1500);
        return;
      }

      // 2. Open Razorpay Checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount,
        currency,
        name: 'TenantOS',
        description: `Landlord Subscription`,
        order_id,
        handler: async function (response: any) {
          setStep('processing');
          // 3. Verify Payment
          try {
            await verifySubscription.mutateAsync({
              plan_id: planId,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
            setStep('success');
          } catch (err) {
            setStep('plans');
            setLoadingId(null);
          }
        },
        prefill: {
          name: landlord?.name || '',
          email: landlord?.email || '',
          contact: landlord?.phone?.replace('+91', '') || '',
        },
        theme: {
          color: '#3d7bff',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function () {
        setLoadingId(null);
      });
      rzp.open();
    } catch (error) {
      setLoadingId(null);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6 animate-fade-in" style={{ background: 'var(--bg)' }}>
        <div className="max-w-md w-full p-8 rounded-2xl flex flex-col items-center text-center space-y-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center animate-bounce" style={{ background: 'var(--primary-dim)' }}>
            <Check className="w-8 h-8" style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)' }}>
              Subscription Upgraded! 🎉
            </h2>
            <p className="text-sm" style={{ color: 'var(--ink-dim)' }}>
              Your landlord account has been upgraded successfully. You now have access to premium features.
            </p>
          </div>
          <button onClick={() => window.location.href = '/dashboard'} className="btn-primary w-full justify-center py-3 mt-4">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
        <div className="p-10 flex flex-col items-center gap-4 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
          <div>
            <p className="font-bold text-base text-[var(--ink)]">Securely verifying payment...</p>
            <p className="text-sm text-[var(--ink-dim)] mt-1">Please do not close this window</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 animate-fade-in">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)', letterSpacing: '-0.03em' }}>
          Upgrade your property empire
        </h1>
        <p style={{ color: 'var(--ink-dim)' }}>
          Choose a plan that scales with your portfolio. Pay only for the units you manage.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {LANDLORD_PLANS.map(plan => (
          <div
            key={plan.id}
            className="p-6 md:p-8 rounded-2xl flex flex-col relative transition-transform hover:-translate-y-1"
            style={{
              background: 'var(--surface)',
              border: plan.badge ? '2px solid var(--primary)' : '1px solid var(--border)',
              boxShadow: plan.badge ? '0 16px 48px rgba(61,123,255,0.12)' : '0 4px 24px rgba(0,0,0,0.02)',
            }}
          >
            {plan.badge && (
              <span
                className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm"
                style={{ background: 'var(--primary)', color: '#fff' }}
              >
                {plan.badge}
              </span>
            )}

            <div className="mb-8">
              <p className="font-semibold text-sm mb-1" style={{ color: 'var(--ink)' }}>{plan.name}</p>
              <p className="text-xs mb-4" style={{ color: 'var(--ink-dim)' }}>{plan.subtitle}</p>
              
              <div className="flex items-baseline gap-1">
                {plan.priceDisplay === 'Free' ? (
                  <span className="text-4xl font-bold" style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)' }}>
                    Free
                  </span>
                ) : (
                  <>
                    <span className="text-4xl font-bold" style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)', letterSpacing: '-0.02em' }}>
                      {plan.priceDisplay}
                    </span>
                    <span className="text-sm font-medium" style={{ color: 'var(--ink-dim)' }}>{plan.period}</span>
                  </>
                )}
              </div>
            </div>

            <ul className="space-y-4 flex-1 mb-8">
              {plan.perks.map((p, i) => (
                <li key={i} className="flex items-start gap-3 text-sm" style={{ color: 'var(--ink)' }}>
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: plan.badge ? 'var(--primary-dim)' : 'rgba(0,0,0,0.04)' }}
                  >
                    <Check className="w-3 h-3" style={{ color: plan.badge ? 'var(--primary)' : 'var(--ink)' }} />
                  </div>
                  <span className="leading-tight">{p}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handlePay(plan.id)}
              disabled={loadingId === plan.id || plan.id === currentTier}
              className={`w-full justify-center py-3 text-sm font-semibold rounded-xl transition-all ${
                plan.id === currentTier ? 'bg-[var(--bg)] text-[var(--ink-dim)] border border-[var(--border)] opacity-70 cursor-not-allowed' :
                plan.id === 'pro' ? 'bg-[var(--primary)] text-white hover:opacity-90 shadow-lg shadow-blue-500/20' : 
                plan.id === 'portfolio' ? 'bg-[var(--ink)] text-[var(--surface)] hover:opacity-90' :
                'bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)] hover:bg-[var(--bg)]'
              }`}
              style={loadingId === plan.id ? { opacity: 0.7 } : {}}
            >
              {loadingId === plan.id ? (
                <span className="flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4 animate-spin" /> Processing
                </span>
              ) : plan.id === currentTier ? (
                'Current Plan'
              ) : (
                plan.id === 'free' ? 'Get Started Free' : 
                plan.id === 'pro' ? 'Go Pro' : 'Go Portfolio'
              )}
            </button>
          </div>
        ))}
      </div>
      
      <div className="mt-8 flex items-center justify-center gap-2 text-xs" style={{ color: 'var(--ink-dim)' }}>
        <Shield className="w-4 h-4 text-green-500" />
        <span>Payments are securely processed by Razorpay. Cancel anytime.</span>
      </div>
    </div>
  );
}
