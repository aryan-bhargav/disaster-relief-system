"use client";

import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Unable to load data",
  message = "A system error occurred while contacting the server. Please try again.",
  onRetry,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-bg)] text-[var(--danger)] ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <h4 className="text-sm font-semibold text-[#8E1C13]">{title}</h4>
          <p className="mt-0.5 text-xs text-[#A32218]">{message}</p>
        </div>
      </div>

      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          icon={<RotateCcw className="h-3.5 w-3.5" />}
          className="shrink-0 border-[#F5B5B1] bg-white text-[#8E1C13] hover:bg-[#FEECEB]"
        >
          Retry
        </Button>
      )}
    </div>
  );
}
