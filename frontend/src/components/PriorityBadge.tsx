"use client";

import React from "react";
import { AlertTriangle, ChevronUp, Minus, ChevronDown } from "lucide-react";

export type PriorityType = "critical" | "high" | "medium" | "low";

export interface PriorityBadgeProps {
  priority: PriorityType | string;
  className?: string;
}

export function PriorityBadge({
  priority,
  className = "",
}: PriorityBadgeProps) {
  const normalized = priority?.toLowerCase().trim() || "medium";

  switch (normalized) {
    case "critical":
      return (
        <span
          className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-semibold bg-[var(--danger-bg)] text-[var(--danger)] border border-[#FCD2CF] select-none ${className}`}
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Critical</span>
        </span>
      );

    case "high":
      return (
        <span
          className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-medium bg-[var(--warning-bg)] text-[var(--warning)] border border-[#FBE3B5] select-none ${className}`}
        >
          <ChevronUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>High</span>
        </span>
      );

    case "medium":
      return (
        <span
          className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-medium bg-[var(--info-bg)] text-[var(--info)] border border-[#D5E5F5] select-none ${className}`}
        >
          <Minus className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span>Medium</span>
        </span>
      );

    case "low":
      return (
        <span
          className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-medium bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border)] select-none ${className}`}
        >
          <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Low</span>
        </span>
      );

    default:
      return (
        <span
          className={`inline-flex items-center h-6 px-2 rounded-full text-xs font-medium bg-[var(--surface-muted)] text-[var(--text-muted)] select-none ${className}`}
        >
          <span className="capitalize">{normalized}</span>
        </span>
      );
  }
}
