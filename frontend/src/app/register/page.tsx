"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShieldAlert, Layers } from "lucide-react";
import { Button, FormField } from "@/components";
import { apiRequest } from "@/lib/api";
import type { AuthResponse } from "@/types/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("authToken");
    if (token) {
      router.replace("/dashboard");
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please provide your full name.");
      return;
    }

    if (!email.trim()) {
      setError("Please provide a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      const result = await apiRequest<AuthResponse>("/auth/register", {
        method: "POST",
        body: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        },
      });

      sessionStorage.setItem("authToken", result.token);
      sessionStorage.setItem("authUser", JSON.stringify(result.user));

      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--canvas)] flex flex-col items-center justify-center p-4">
      {/* 400px Centred Panel */}
      <div className="w-full max-w-[400px] bg-white border border-[var(--border)] rounded-xl p-8 shadow-sm">
        {/* Product Mark & Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[var(--accent)] text-white shadow-xs mb-3">
            <Layers className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">
            ReliefOps
          </h1>
          <p className="text-[11px] font-semibold tracking-wider text-[var(--text-muted)] uppercase mt-0.5">
            DISASTER RESPONSE
          </p>
          <h2 className="text-base font-semibold text-[var(--text)] mt-3">
            Create field account
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Register to submit and coordinate ground relief requests.
          </p>
        </div>

        {/* Error Notice */}
        {error && (
          <div
            role="alert"
            className="mb-5 p-3 rounded-lg border border-[var(--danger)] bg-red-50 text-[var(--danger)] text-xs flex items-start gap-2.5"
          >
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField id="reg-name" label="Full name" required>
            <input
              id="reg-name"
              type="text"
              autoComplete="name"
              required
              minLength={2}
              maxLength={100}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              placeholder="e.g. John Doe"
              className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </FormField>

          <FormField id="reg-email" label="Email address" required>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              placeholder="you@relief.org"
              className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </FormField>

          <FormField
            id="reg-password"
            label="Password"
            required
            helperText="At least 8 characters"
          >
            <div className="relative">
              <input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="••••••••"
                className="w-full h-10 pl-3 pr-10 rounded-lg border border-[var(--border)] bg-white text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] p-1 rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </FormField>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={loading}
              loadingText="Creating account..."
            >
              Create account
            </Button>
          </div>
        </form>

        {/* Sign In Link */}
        <div className="mt-6 pt-5 border-t border-[var(--border)] text-center text-xs text-[var(--text-muted)]">
          Already registered?{" "}
          <Link
            href="/login"
            className="font-medium text-[var(--accent)] hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>

      {/* College Project Disclaimer Footer */}
      <footer className="mt-6 text-center text-xs text-[var(--text-muted)]">
        College project — not an official emergency service.
      </footer>
    </main>
  );
}
