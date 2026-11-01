"use client";

import React, { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  description?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  breadcrumb?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  primaryAction,
  secondaryAction,
  breadcrumb,
  className = "",
}: PageHeaderProps) {
  return (
    <header className={`mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div className="min-w-0">
        {breadcrumb && <div className="mb-1 text-xs text-[var(--text-muted)]">{breadcrumb}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-[var(--text-muted)] line-clamp-1">
            {description}
          </p>
        )}
      </div>

      {(primaryAction || secondaryAction) && (
        <div className="flex shrink-0 items-center gap-3">
          {secondaryAction}
          {primaryAction}
        </div>
      )}
    </header>
  );
}
