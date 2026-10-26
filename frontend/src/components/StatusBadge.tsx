"use client";

import React from "react";
import {
  Clock,
  Package,
  Layers,
  Truck,
  CheckCircle2,
  XCircle,
  Check,
  Ban,
} from "lucide-react";

export type StatusType =
  | "pending"
  | "partially_allocated"
  | "allocated"
  | "dispatched"
  | "delivered"
  | "cancelled"
  | "active"
  | "inactive";

export interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const normalized = status?.toLowerCase().trim() || "pending";

  switch (normalized) {
    case "pending":
      return (
        <span
          className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-medium bg-[var(--warning-bg)] text-[var(--warning)] select-none ${className}`}
        >
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Pending</span>
        </span>
      );

    case "partially_allocated":
      return (
        <span
          className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-medium bg-[#FFF7E6] text-[#A6630B] border border-[#FFE7BA] select-none ${className}`}
        >
          <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Partially allocated</span>
        </span>
      );

    case "allocated":
      return (
        <span
          className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-medium bg-[var(--info-bg)] text-[var(--info)] select-none ${className}`}
        >
          <Package className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Allocated</span>
        </span>
      );

    case "dispatched":
      return (
        <span
          className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-medium bg-[var(--info-bg)] text-[var(--info)] border border-[#C5DCF0] select-none ${className}`}
        >
          <Truck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Dispatched</span>
        </span>
      );

    case "delivered":
      return (
        <span
          className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-medium bg-[var(--success-bg)] text-[var(--success)] select-none ${className}`}
        >
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Delivered</span>
        </span>
      );

    case "cancelled":
      return (
        <span
          className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-medium bg-[var(--surface-muted)] text-[var(--text-muted)] select-none ${className}`}
        >
          <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Cancelled</span>
        </span>
      );

    case "active":
      return (
        <span
          className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-medium bg-[var(--success-bg)] text-[var(--success)] select-none ${className}`}
        >
          <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Active</span>
        </span>
      );

    case "inactive":
      return (
        <span
          className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-xs font-medium bg-[var(--surface-muted)] text-[var(--text-muted)] select-none ${className}`}
        >
          <Ban className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Inactive</span>
        </span>
      );

    default:
      return (
        <span
          className={`inline-flex items-center gap-1 h-6 px-2 rounded-full text-xs font-medium bg-[var(--surface-muted)] text-[var(--text-muted)] select-none ${className}`}
        >
          <span className="capitalize">{normalized.replace("_", " ")}</span>
        </span>
      );
  }
}
