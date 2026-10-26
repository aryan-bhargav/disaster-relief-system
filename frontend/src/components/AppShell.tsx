"use client";

import React, { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import type { AuthUser } from "@/types/auth";

export interface AppShellProps {
  children: ReactNode;
  user?: AuthUser | null;
  onLogout?: () => void;
  fullBleed?: boolean;
}

export function AppShell({
  children,
  user: userProp,
  onLogout: onLogoutProp,
  fullBleed = false,
}: AppShellProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(userProp ?? null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (userProp !== undefined) {
      setUser(userProp);
      return;
    }

    try {
      const storedToken = sessionStorage.getItem("authToken");
      const storedUser = sessionStorage.getItem("authUser");
      if (!storedToken || !storedUser) {
        router.replace("/login");
        return;
      }
      setUser(JSON.parse(storedUser) as AuthUser);
    } catch {
      router.replace("/login");
    }
  }, [userProp, router]);

  function handleLogout() {
    if (onLogoutProp) {
      onLogoutProp();
      return;
    }
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("authUser");
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text)]">
      {/* Accessible skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--accent)] focus:text-white focus:rounded-md focus:shadow-md"
      >
        Skip to main content
      </a>

      {/* Shared Responsive Sidebar */}
      <Sidebar
        user={user}
        onLogout={handleLogout}
        isOpenMobile={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      {/* Mobile Top Bar (< 1024px) */}
      <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 lg:hidden">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <span className="text-sm font-semibold text-[var(--text)]">ReliefOps</span>

        <div className="w-10" aria-hidden="true" />
      </div>

      {/* Main Content Area */}
      <div className="lg:pl-[240px] flex flex-col min-h-screen">
        <main
          id="main-content"
          tabIndex={-1}
          className={`flex-1 focus:outline-none ${
            fullBleed
              ? "h-[calc(100vh-3.5rem)] lg:h-screen overflow-hidden p-0"
              : "p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
