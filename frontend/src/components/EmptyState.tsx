"use client";

import React, { ReactNode } from "react";
import { Inbox } from "lucide-react";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-xl bg-[var(--surface)] border border-[var(--border)] ${className}`}
    >
      <div className="text-[var(--text-muted)] mb-3" aria-hidden="true">
        {icon ?? <Inbox className="h-10 w-10 stroke-[1.5]" />}
      </div>
      <h3 className="text-base font-semibold text-[var(--text)]">{title}</h3>
      <p className="mt-1 text-sm text-[var(--text-muted)] max-w-sm">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
