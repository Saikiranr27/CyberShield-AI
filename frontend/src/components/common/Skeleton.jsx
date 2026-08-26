import React from "react";

/** A shimmering placeholder block, used while real data is loading (never shown alongside fabricated data). */
export function Skeleton({ className = "", style }) {
  return <div className={`cs-shimmer bg-white/[0.04] rounded-md ${className}`} style={style} aria-hidden="true" />;
}

/** A row-shaped skeleton matching Reports/history list items. */
export function SkeletonRow() {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-2.5 w-28" />
      </div>
      <Skeleton className="h-6 w-10" />
    </div>
  );
}

/** A card-shaped skeleton matching dashboard Panel components. */
export function SkeletonPanel({ lines = 4 }) {
  return (
    <div className="cs-glass rounded-xl p-4 md:p-5">
      <Skeleton className="h-3 w-28 mb-4" />
      <div className="space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-3" style={{ width: `${70 - i * 8}%` }} />
        ))}
      </div>
    </div>
  );
}
