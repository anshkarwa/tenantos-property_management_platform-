import React from 'react';
import { Sparkles, Plus } from 'lucide-react';

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  accentColor?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  accentColor = 'var(--primary)',
}: EmptyStateProps) {
  return (
    <div className="card p-10 flex flex-col items-center justify-center text-center border border-dashed border-[var(--border)] rounded-2xl animate-fade-up">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 relative group"
        style={{ background: `${accentColor}18` }}
      >
        <Icon className="w-8 h-8 animate-float-y" style={{ color: accentColor }} />
        <div
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center bg-[var(--surface)] border border-[var(--border)]"
        >
          <Sparkles className="w-2.5 h-2.5 text-[var(--warning)]" />
        </div>
      </div>

      <h3 className="text-lg font-bold text-[var(--ink)] mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>
        {title}
      </h3>
      <p className="text-sm text-[var(--ink-dim)] max-w-sm mb-6">
        {description}
      </p>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="btn-primary"
          style={{ background: accentColor }}
        >
          <Plus className="w-4 h-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
