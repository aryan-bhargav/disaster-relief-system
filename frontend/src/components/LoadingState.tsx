"use client";

import React from "react";

export interface LoadingStateProps {
  rows?: number;
  className?: string;
  type?: "table" | "metric" | "card";
}

export function LoadingState({
  rows = 4,
  className = "",
  type = "table",
}: LoadingStateProps) {
  if (type === "metric") {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] animate-pulse"
          >
            <div className="h-3 w-20 bg-[var(--surface-muted)] rounded mb-3" />
            <div className="h-7 w-12 bg-[var(--surface-muted)] rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (type === "card") {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] animate-pulse space-y-3"
          >
            <div className="h-4 w-1/3 bg-[var(--surface-muted)] rounded" />
            <div className="h-3 w-2/3 bg-[var(--surface-muted)] rounded" />
          </div>
        ))}
      </div>
    );
  }

  // Table skeleton default
  return (
    <div
      className={`rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden ${className}`}
    >
      <div className="h-10 bg-[var(--surface-muted)] border-b border-[var(--border)] flex items-center px-4">
        <div className="h-3.5 w-1/4 bg-[#DCE3E8] rounded animate-pulse" />
      </div>
      <div className="divide-y divide-[var(--border)]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-12 px-4 flex items-center gap-4 animate-pulse">
            <div className="h-3.5 w-1/5 bg-[var(--surface-muted)] rounded" />
            <div className="h-3.5 w-1/3 bg-[var(--surface-muted)] rounded" />
            <div className="h-3.5 w-1/6 bg-[var(--surface-muted)] rounded" />
            <div className="h-3.5 w-16 bg-[var(--surface-muted)] rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
