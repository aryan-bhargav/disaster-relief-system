"use client";

import React, { ReactNode } from "react";
import { AlertCircle } from "lucide-react";

export interface FormFieldProps {
  id: string;
  label: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}

export function FormField({
  id,
  label,
  helperText,
  error,
  required,
  optional,
  children,
  className = "",
}: FormFieldProps) {
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  return (
    <div className={`flex flex-col space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="text-sm font-medium text-[var(--text)] select-none"
        >
          {label}
          {required && (
            <span className="ml-1 text-[var(--danger)]" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {optional && (
          <span className="text-xs text-[var(--text-muted)]">Optional</span>
        )}
      </div>

      <div className="relative">{children}</div>

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1.5 text-xs text-[var(--danger)] font-normal"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-[var(--text-muted)]">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error, className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        aria-invalid={error ? "true" : undefined}
        className={`w-full h-10 px-3 py-2 text-sm rounded-lg border bg-[var(--surface)] text-[var(--text)] placeholder-[var(--text-muted)]/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 disabled:bg-[var(--surface-muted)] disabled:text-[var(--text-muted)] disabled:cursor-not-allowed ${
          error
            ? "border-[var(--danger)] focus-visible:ring-[var(--danger)]"
            : "border-[var(--border)] hover:border-[#b8c5ce]"
        } ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ error, className = "", children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        aria-invalid={error ? "true" : undefined}
        className={`w-full h-10 px-3 py-2 text-sm rounded-lg border bg-[var(--surface)] text-[var(--text)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 disabled:bg-[var(--surface-muted)] disabled:text-[var(--text-muted)] disabled:cursor-not-allowed ${
          error
            ? "border-[var(--danger)] focus-visible:ring-[var(--danger)]"
            : "border-[var(--border)] hover:border-[#b8c5ce]"
        } ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        aria-invalid={error ? "true" : undefined}
        className={`w-full p-3 text-sm rounded-lg border bg-[var(--surface)] text-[var(--text)] placeholder-[var(--text-muted)]/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 disabled:bg-[var(--surface-muted)] disabled:text-[var(--text-muted)] disabled:cursor-not-allowed resize-y ${
          error
            ? "border-[var(--danger)] focus-visible:ring-[var(--danger)]"
            : "border-[var(--border)] hover:border-[#b8c5ce]"
        } ${className}`}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
