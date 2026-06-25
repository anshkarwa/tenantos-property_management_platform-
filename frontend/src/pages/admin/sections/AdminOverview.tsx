import React, { useEffect, useState } from 'react';
import { Building2, Users, FileText, IndianRupee, Wrench, TrendingUp } from 'lucide-react';
import { adminApi } from '../../../context/AdminContext';

interface Stats {
  landlords:   { total: number; suspended: number };
  tenants:     { total: number; flagged: number };
  properties:  { total: number };
  units:       { total: number; occupied: number; vacant: number };
  leases:      { active: number };
  revenue:     { collected: number; pending: number };
  maintenance: { open: number };
}

function StatCard({ label, value, sub, icon: Icon, color, delay = 0 }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; delay?: number;
}) {
  return (
    <div
      className="p-5 rounded-xl kpi-card animate-fade-up"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="p-2 rounded-lg"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <div
        className="animate-count-up"
        style={{
          fontFamily: 'Syne, Inter, sans-serif',
          fontWeight: 800, fontSize: '1.75rem',
          color: 'var(--ink)', letterSpacing: '-0.04em', lineHeight: 1,
          animationDelay: `${delay + 60}ms`,
        }}
      >
        {value}
      </div>
      <div className="text-sm mt-1" style={{ color: 'var(--ink-dim)' }}>{label}</div>
      {sub && <div className="text-xs mt-0.5" style={{ color }}>{sub}</div>}
    </div>
  );
}

export default function AdminOverview() {
  const [stats, setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.get('/api/admin/stats')
      .then(r => setStats(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <div>
        <div className="h-7 w-48 rounded-lg skeleton mb-2" />
        <div className="h-4 w-72 rounded-lg skeleton" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="p-5 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="h-8 w-8 rounded-lg skeleton mb-4" />
            <div className="h-8 w-16 rounded-lg skeleton mb-2" />
            <div className="h-4 w-24 rounded-lg skeleton" />
          </div>
        ))}
      </div>
    </div>
  );

  if (!stats) return null;

  const fmt = (n: number) => n >= 10000000
    ? `₹${(n / 10000000).toFixed(1)}Cr`
    : n >= 100000
    ? `₹${(n / 100000).toFixed(1)}L`
    : `₹${n.toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          style={{
            fontFamily: 'Syne, Inter, sans-serif',
            fontWeight: 800, fontSize: '1.5rem',
            letterSpacing: '-0.03em', color: 'var(--ink)',
          }}
        >
          Platform Overview
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--ink-dim)' }}>
          Live stats across all landlords, tenants, and properties.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard label="Landlords"     value={stats.landlords.total}  delay={0}
          sub={stats.landlords.suspended ? `${stats.landlords.suspended} suspended` : undefined}
          icon={Building2} color="var(--primary)" />
        <StatCard label="Tenants"       value={stats.tenants.total}    delay={50}
          sub={stats.tenants.flagged ? `${stats.tenants.flagged} flagged` : undefined}
          icon={Users} color="var(--accent)" />
        <StatCard label="Properties"    value={stats.properties.total} delay={100}
          icon={Building2} color="var(--warning)" />
        <StatCard label="Units"         value={stats.units.total}      delay={150}
          sub={`${stats.units.occupied} occupied · ${stats.units.vacant} vacant`}
          icon={TrendingUp} color="var(--primary)" />
        <StatCard label="Active Leases" value={stats.leases.active}    delay={200}
          icon={FileText} color="var(--accent)" />
        <StatCard label="Rent Collected" value={fmt(stats.revenue.collected)} delay={250}
          icon={IndianRupee} color="var(--accent)" />
        <StatCard label="Pending Dues"  value={fmt(stats.revenue.pending)}    delay={300}
          sub="across all units"
          icon={IndianRupee} color="var(--warning)" />
        <StatCard label="Open Tickets"  value={stats.maintenance.open} delay={350}
          icon={Wrench} color="var(--danger)" />
      </div>

      {/* Occupancy bar */}
      {stats.units.total > 0 && (
        <div
          className="p-5 rounded-xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Portfolio Occupancy</span>
            <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
              {Math.round((stats.units.occupied / stats.units.total) * 100)}%
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div
              className="h-full rounded-full progress-fill"
              style={{
                width: `${(stats.units.occupied / stats.units.total) * 100}%`,
                background: 'linear-gradient(90deg, var(--accent), var(--primary))',
                boxShadow: '0 0 8px rgba(0,212,160,0.4)',
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs" style={{ color: 'var(--ink-dim)' }}>
            <span>{stats.units.occupied} occupied</span>
            <span>{stats.units.vacant} vacant</span>
          </div>
        </div>
      )}
    </div>
  );
}
