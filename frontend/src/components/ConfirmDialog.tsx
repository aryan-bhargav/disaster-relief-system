"use client";

import React, { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "./Button";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "primary";
  loading?: boolean;
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "destructive",
  loading = false,
  error,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Esc key and focus management
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !loading) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    // Autofocus safe cancel option
    cancelBtnRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Scrim */}
      <div
        className="fixed inset-0 bg-[#17232D]/50 transition-opacity"
        onClick={() => !loading && onClose()}
        aria-hidden="true"
      />

      {/* Dialog card */}
      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-[440px] rounded-xl bg-[var(--surface)] p-6 shadow-2xl border border-[var(--border)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                variant === "destructive"
                  ? "bg-[var(--danger-bg)] text-[var(--danger)]"
                  : "bg-[var(--info-bg)] text-[var(--info)]"
              }`}
            >
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3
              id="confirm-dialog-title"
              className="text-base font-semibold text-[var(--text)]"
            >
              {title}
            </h3>
          </div>

          <button
            onClick={() => !loading && onClose()}
            disabled={loading}
            className="text-[var(--text-muted)] hover:text-[var(--text)] rounded-md p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-sm text-[var(--text-muted)] leading-relaxed">
          {description}
        </p>

        {error && (
          <div
            role="alert"
            className="mt-4 p-3 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-bg)] text-xs text-[var(--danger)]"
          >
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button
            ref={cancelBtnRef}
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={onClose}
          >
            {cancelLabel}
          </Button>

          <Button
            type="button"
            variant={variant}
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
