import React from 'react';

interface CardSkeletonProps {
  count?: number;
}

export function CardSkeleton({ count = 4 }: CardSkeletonProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="card p-5 flex flex-col gap-4 border border-[var(--border)] rounded-xl bg-[var(--surface)]"
        >
          <div className="flex items-center justify-between">
            <div className="h-3 w-24 skeleton-shimmer" />
            <div className="w-8 h-8 rounded-lg skeleton-shimmer" />
          </div>
          <div className="space-y-2 mt-2">
            <div className="h-7 w-32 skeleton-shimmer" />
            <div className="h-3 w-20 skeleton-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full space-y-3">
      <div className="h-10 w-full skeleton-shimmer rounded-lg" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 w-full skeleton-shimmer rounded-lg" />
      ))}
    </div>
  );
}
