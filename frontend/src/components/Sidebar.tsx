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
  BarChart3,
  Users,
  LogOut,
  X,
  Shield,
  type LucideIcon,
} from "lucide-react";

import type { AuthUser, UserRole } from "@/types";
import { ThemeToggle } from "./ThemeToggle";

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
    allowedRoles: ["admin", "coordinator", "field_user"],
  },
  {
    label: "Reports & Analytics",
    href: "/analytics",
    icon: BarChart3,
    allowedRoles: ["admin", "coordinator"],
  },
  {
    label: "User Management",
    href: "/users",
    icon: Users,
    allowedRoles: ["admin"],
  },
];

function formatRole(role: string): string {
  switch (role) {
    case "field_user":
      return "Field User";
    case "coordinator":
      return "Relief Coordinator";
    case "admin":
      return "System Administrator";
    default:
      return role;
  }
}

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

  const content = (
    <div className="flex h-full w-[240px] select-none flex-col bg-sidebar text-sidebar-text">
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-divider px-4">
        <Link
          href="/dashboard"
          onClick={onCloseMobile}
          className="flex items-center gap-3 rounded-lg p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-text shadow-sm">
            <Shield className="h-4 w-4" aria-hidden="true" />
          </div>

          <div>
            <span className="block text-base font-semibold leading-none tracking-tight text-sidebar-text">
              ReliefOps
            </span>
            <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted">
              Disaster Response
            </span>
          </div>
        </Link>

        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-md p-1 text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav
        aria-label="Primary navigation"
        className="flex-1 space-y-1 overflow-y-auto px-3 py-3"
      >
        {visibleNav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" &&
              pathname.startsWith(`${item.href}/`));

          const IconComponent = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              aria-current={isActive ? "page" : undefined}
              className={[
                "group relative flex h-9 items-center gap-3 rounded-lg px-3 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                isActive
                  ? "bg-sidebar-hover font-semibold text-sidebar-text"
                  : "text-sidebar-text hover:bg-sidebar-hover",
              ].join(" ")}
            >
              {isActive && (
                <span
                  className="absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-r bg-accent"
                  aria-hidden="true"
                />
              )}

              <IconComponent
                className={[
                  "h-4 w-4 shrink-0 transition-colors",
                  isActive
                    ? "text-accent"
                    : "text-sidebar-muted group-hover:text-sidebar-text",
                ].join(" ")}
                aria-hidden="true"
              />

              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div className="shrink-0 space-y-3 border-t border-sidebar-divider p-3">
        <ThemeToggle />

        {user && (
          <div className="flex items-center justify-between border-t border-sidebar-divider pt-3">
            <div className="min-w-0 pr-2">
              <p className="truncate text-xs font-semibold text-sidebar-text">
                {user.name}
              </p>
              <p className="truncate text-[10px] text-sidebar-muted">
                {formatRole(user.role)}
              </p>
            </div>

            <button
              type="button"
              onClick={onLogout}
              title="Log out"
              aria-label="Log out"
              className="shrink-0 rounded-lg p-1.5 text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] border-r border-sidebar-divider lg:flex">
        {content}
      </aside>

      {/* Mobile drawer */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-overlay"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
          />

          <div className="relative z-10 flex h-full max-w-xs animate-in slide-in-from-left flex-col shadow-2xl duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
