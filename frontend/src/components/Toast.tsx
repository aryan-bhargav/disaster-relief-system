"use client";

import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastProps {
  id?: string;
  type?: ToastType;
  message: string;
  onClose: () => void;
  durationMs?: number;
}

export function Toast({
  type = "success",
  message,
  onClose,
  durationMs = 5000,
}: ToastProps) {
  useEffect(() => {
    if (durationMs <= 0) return;
    const timer = setTimeout(() => {
      onClose();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [durationMs, onClose]);

  const config = {
    success: {
      bg: "bg-[var(--success-bg)]",
      border: "border-[#BBE3CA]",
      text: "text-[var(--success)]",
      icon: <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--success)]" />,
    },
    error: {
      bg: "bg-[var(--danger-bg)]",
      border: "border-[#FCD2CF]",
      text: "text-[var(--danger)]",
      icon: <AlertCircle className="h-4 w-4 shrink-0 text-[var(--danger)]" />,
    },
    info: {
      bg: "bg-[var(--info-bg)]",
      border: "border-[#C5DCF0]",
      text: "text-[var(--info)]",
      icon: <Info className="h-4 w-4 shrink-0 text-[var(--info)]" />,
    },
  }[type];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg max-w-sm ${config.bg} ${config.border} ${config.text} transition-all`}
    >
      {config.icon}
      <p className="text-xs font-medium flex-1">{message}</p>
      <button
        onClick={onClose}
        className="rounded p-0.5 opacity-70 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
