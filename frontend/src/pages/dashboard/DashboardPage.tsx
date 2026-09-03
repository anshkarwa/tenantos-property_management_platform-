import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useDashboardKPIs, useActivityLog, useRevenueData, usePendingApplications } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { CardSkeleton } from '../../components/SkeletonLoaders';
import {
  formatINRCompact,
  formatPercent,
  getTimeOfDay,
  formatINR
} from '../../utils/format';
import {
  Building2,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Wrench,
  TrendingUp,
  ChevronRight,
  Plus,
  Loader2,
  Bell,
  X,
  ArrowRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';


/* ── KPI card data ─────────────────────────────────────────────────────── */
interface KpiCardProps {
  title: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  variant?: 'default' | 'danger' | 'accent';
  animClass?: string;
}

function KpiCard({ title, value, sub, icon: Icon, variant = 'default', animClass = '' }: KpiCardProps) {
  const accentColor =
    variant === 'danger' ? 'var(--danger)' :
    variant === 'accent' ? 'var(--accent)' :
    'var(--primary)';

  const accentDim =
    variant === 'danger' ? 'var(--danger-dim)' :
    variant === 'accent' ? 'var(--accent-dim)' :
    'var(--primary-dim)';

  return (
    <div
      className={`card kpi-card p-5 flex flex-col gap-4 ${animClass}`}
      style={{
        ...(variant !== 'default' && {
          borderLeft: `3px solid ${accentColor}`,
        }),
      }}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium" style={{ color: 'var(--ink-dim)' }}>
          {title}
        </span>
        <div
          className="p-1.5 rounded-lg"
          style={{ background: accentDim }}
        >
          <Icon className="w-4 h-4" style={{ color: accentColor }} />
        </div>
      </div>

      <div>
        <p
          className="text-2xl font-bold tabular-nums leading-none animate-count-up"
          style={{
            fontFamily: 'Syne, Inter, sans-serif',
            color: 'var(--ink)',
            animationDelay: '80ms',
          }}
        >
          {value}
        </p>
        <p className="text-xs mt-1.5" style={{ color: 'var(--ink-dim)' }}>
          {sub}
        </p>
      </div>
    </div>
  );
}

/* ── Custom tooltip for recharts ────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2.5 rounded-lg text-xs"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      }}
    >
      <p className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {formatINRCompact(entry.value)}
        </p>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { landlord } = useAuth();
  const navigate = useNavigate();
  const { data: kpi, isLoading: kpiLoading } = useDashboardKPIs();
  const { data: activityData } = useActivityLog();
  const { data: revenueData } = useRevenueData();
  const { data: pendingApps = [] } = usePendingApplications();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const timeKey = getTimeOfDay();

  if (kpiLoading || !kpi) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 skeleton-shimmer rounded-lg" />
        <CardSkeleton count={4} />
      </div>
    );
  }

  const cards: KpiCardProps[] = [
    {
      title: t('dashboard.total_units'),
      value: `${kpi.occupied_units}/${kpi.total_units}`,
      sub: `${kpi.total_properties} ${kpi.total_properties === 1 ? 'Location' : 'Locations'}`,
      icon: Building2,
      variant: 'default',
      animClass: 'animate-fade-up delay-50',
    },
    {
      title: t('dashboard.occupancy'),
      value: formatPercent(kpi.occupancy_rate),
      sub: 'Portfolio occupancy',
      icon: Users,
      variant: 'accent',
      animClass: 'animate-fade-up delay-100',
    },
    {
      title: t('dashboard.rent_collected'),
      value: formatINRCompact(kpi.rent_collected_this_month),
      sub: `Of ${formatINRCompact(kpi.rent_due_this_month)} expected`,
      icon: TrendingUp,
      variant: 'accent',
      animClass: 'animate-fade-up delay-150',
    },
    {
      title: t('dashboard.rent_due'),
      value: formatINR(kpi.overdue_amount),
      sub: `${kpi.overdue_count} overdue payments`,
      icon: AlertTriangle,
      variant: 'danger',
      animClass: 'animate-fade-up delay-200',
    },
  ];


  const showBanner = pendingApps.length > 0 && !bannerDismissed;

  return (
    <div className="space-y-6 page-enter">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 header-glow">
        <div>
          <h1
            className="text-xl font-bold"
            style={{ fontFamily: 'Syne, Inter, sans-serif', color: 'var(--ink)', letterSpacing: '-0.02em' }}
          >
            {t('dashboard.greeting', { timeOfDay: t(`dashboard.${timeKey}`), name: landlord?.name?.split(' ')[0] || 'there' })}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>
            Here's what's happening across your portfolio today.
          </p>
        </div>
      </div>

      {/* ── Pending Applications Banner ──────────────────────────────────── */}
      {showBanner && (
        <div
          className="relative overflow-hidden rounded-xl animate-fade-up"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(234,88,12,0.10) 100%)',
            border: '1px solid rgba(245,158,11,0.3)',
          }}
        >
          {/* Subtle glow strip on top */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.6), transparent)' }}
          />

          <div className="flex items-center gap-4 px-5 py-4">
            {/* Pulsing icon */}
            <div className="relative shrink-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(245,158,11,0.15)' }}
              >
                <Bell className="w-5 h-5" style={{ color: '#f59e0b' }} />
              </div>
              {/* Pulse ring */}
              <span
                className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ background: '#f59e0b', color: '#000' }}
              >
                {pendingApps.length}
              </span>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: '#f59e0b' }}>
                {pendingApps.length === 1
                  ? '1 new application waiting for your response'
                  : `${pendingApps.length} new applications waiting for your response`}
              </p>
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--ink-dim)' }}>
                {pendingApps
                  .slice(0, 3)
                  .map((a: any) => a.tenant?.name)
                  .filter(Boolean)
                  .join(', ')}
                {pendingApps.length > 3 ? ` and ${pendingApps.length - 3} more` : ''}
                {' · '}Tap to review
              </p>
            </div>

            {/* CTA */}
            <button
              onClick={() => navigate('/applications')}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 hover:scale-105 active:scale-95"
              style={{ background: '#f59e0b', color: '#000' }}
            >
              Review Now <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Dismiss */}
            <button
              onClick={() => setBannerDismissed(true)}
              className="shrink-0 p-1.5 rounded-md transition-colors"
              style={{ color: 'var(--ink-dim)' }}
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <KpiCard key={card.title} {...card} />
        ))}
      </div>

      {/* ── Chart + Activity ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Revenue Chart */}
        <div
          className="lg:col-span-2 card p-5 flex flex-col gap-4 animate-fade-up delay-250"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3
                className="text-sm font-semibold"
                style={{ color: 'var(--ink)', fontFamily: 'Syne, Inter, sans-serif' }}
              >
                Revenue Overview
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-dim)' }}>
                Rent collections over the last 6 months
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5" style={{ color: 'var(--primary)' }}>
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: 'var(--primary)' }}
                />
                Collected
              </span>
              <span className="flex items-center gap-1.5" style={{ color: 'var(--ink-dim)' }}>
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: 'var(--border)' }}
                />
                Target
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData || []} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3D7BFF" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3D7BFF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00D4A0" stopOpacity={0.08} />
                    <stop offset="95%" stopColor="#00D4A0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="var(--ink-dim)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--ink-dim)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="collected"
                  stroke="#3D7BFF"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCollected)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#3D7BFF', strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey="due"
                  stroke="#00D4A0"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fillOpacity={1}
                  fill="url(#colorDue)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#00D4A0', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card p-5 flex flex-col gap-4 animate-fade-up delay-300">
          <div className="flex items-center justify-between">
            <h3
              className="text-sm font-semibold"
              style={{ color: 'var(--ink)', fontFamily: 'Syne, Inter, sans-serif' }}
            >
              {t('dashboard.recent_activity')}
            </h3>
            <button
              className="text-xs font-medium inline-flex items-center gap-0.5 transition-colors"
              style={{ color: 'var(--primary)' }}
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {(activityData || []).slice(0, 5).map((activity, i) => {
              const isPayment     = activity.type === 'payment';
              const isMaintenance = activity.type === 'maintenance';
              const color = isPayment ? 'var(--accent)' : isMaintenance ? 'var(--danger)' : 'var(--ink-dim)';
              const dimColor = isPayment ? 'var(--accent-dim)' : isMaintenance ? 'var(--danger-dim)' : 'rgba(90,97,122,0.15)';

              return (
                <div
                  key={activity.id}
                  className="flex gap-3 items-start animate-fade-up"
                  style={{ animationDelay: `${300 + i * 60}ms` }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: dimColor }}
                  >
                    {isPayment ? (
                      <CheckCircle2 className="w-3.5 h-3.5" style={{ color }} />
                    ) : isMaintenance ? (
                      <Wrench className="w-3.5 h-3.5" style={{ color }} />
                    ) : (
                      <Clock className="w-3.5 h-3.5" style={{ color }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-snug" style={{ color: 'var(--ink)' }}>
                      {activity.message}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ink-dim)' }}>
                      {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
