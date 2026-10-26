"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  Building2,
  ArrowLeftRight,
  MapPin,
  LogOut,
  X,
  Shield,
  type LucideIcon,
} from "lucide-react";
import type { AuthUser, UserRole } from "@/types/auth";

export interface SidebarProps {
  user: AuthUser | null;
  onLogout: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  allowedRoles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    allowedRoles: ["admin", "coordinator", "field_user"],
  },
  {
    label: "Relief Requests",
    href: "/requests",
    icon: ClipboardList,
    allowedRoles: ["admin", "coordinator", "field_user"],
  },
  {
    label: "Resource Inventory",
    href: "/resources",
    icon: Package,
    allowedRoles: ["admin", "coordinator"],
  },
  {
    label: "Relief Centres",
    href: "/centres",
    icon: Building2,
    allowedRoles: ["admin", "coordinator"],
  },
  {
    label: "Allocations",
    href: "/allocations",
    icon: ArrowLeftRight,
    allowedRoles: ["admin", "coordinator"],
  },
  {
    label: "Operations Map",
    href: "/map",
    icon: MapPin,
    allowedRoles: ["admin", "coordinator"],
  },
];

export function Sidebar({
  user,
  onLogout,
  isOpenMobile = false,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const userRole = user?.role ?? "field_user";

  const visibleNav = NAV_ITEMS.filter((item) =>
    item.allowedRoles.includes(userRole)
  );

  function formatRole(role: string): string {
    if (role === "field_user") return "Field User";
    if (role === "coordinator") return "Coordinator";
    if (role === "admin") return "Administrator";
    return role;
  }

  const content = (
    <div className="flex h-full w-[240px] flex-col bg-[var(--sidebar)] text-[var(--sidebar-text)] select-none">
      {/* Top Brand Block (64px height) */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--sidebar-divider)] px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-lg p-1"
        >
          {/* Product Mark (28px) */}
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent)] text-white shadow-sm">
            <Shield className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <span className="text-base font-semibold text-white tracking-tight leading-none block">
              ReliefOps
            </span>
            <span className="text-[10px] uppercase font-semibold text-[var(--sidebar-muted)] tracking-wider mt-0.5 block">
              Disaster Response
            </span>
          </div>
        </Link>

        {/* Close button for mobile drawer */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1 text-[var(--sidebar-muted)] hover:text-white rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav items list */}
      <nav
        aria-label="Primary"
        className="flex-1 space-y-1 overflow-y-auto px-3 py-4"
      >
        {visibleNav.map((item) => {
          const isActive = pathname === item.href;
          const IconComponent = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onCloseMobile?.()}
              aria-current={isActive ? "page" : undefined}
              className={`group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                isActive
                  ? "bg-[var(--sidebar-hover)] text-white font-semibold"
                  : "text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] hover:text-white"
              }`}
            >
              {/* 3px accent strip on left edge when active */}
              {isActive && (
                <span
                  className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-[var(--accent)]"
                  aria-hidden="true"
                />
              )}

              <IconComponent
                className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                  isActive
                    ? "text-[var(--accent)]"
                    : "text-[var(--sidebar-muted)] group-hover:text-white"
                }`}
                aria-hidden="true"
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom User Info & Logout Block */}
      {user && (
        <div className="border-t border-[var(--sidebar-divider)] p-4 shrink-0">
          <div className="mb-3">
            <p className="truncate text-xs font-semibold text-white">
              {user.name}
            </p>
            <p className="text-[11px] text-[var(--sidebar-muted)] mt-0.5">
              {formatRole(user.role)}
            </p>
          </div>

          <button
            onClick={onLogout}
            className="flex w-full items-center gap-2 rounded-lg py-1.5 text-xs font-medium text-[var(--sidebar-muted)] hover:text-white hover:bg-[var(--sidebar-hover)] px-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Fixed desktop sidebar (>= 1024px) */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-[240px] border-r border-[var(--sidebar-divider)]">
        {content}
      </aside>

      {/* Mobile drawer (< 1024px) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          {/* Scrim */}
          <div
            className="fixed inset-0 bg-[#17232D]/60 transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          {/* Drawer content */}
          <div className="relative z-10 flex h-full max-w-xs shadow-2xl animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
