"use client";

import React from "react";
import { Sun, Moon, Shield, Waves, Trees } from "lucide-react";

import { useTheme } from "@/lib/theme";
import type { ThemeMode } from "@/types";

interface ThemeToggleProps {
  compact?: boolean;
}

interface ThemeChoice {
  id: ThemeMode;
  label: string;
  icon: React.ReactNode;
}

const THEME_OPTIONS: ThemeChoice[] = [
  {
    id: "light",
    label: "Light",
    icon: <Sun className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  {
    id: "dark",
    label: "Dark",
    icon: <Moon className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  {
    id: "tactical",
    label: "Tactical",
    icon: <Shield className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  {
    id: "ocean",
    label: "Ocean",
    icon: <Waves className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  {
    id: "forest",
    label: "Forest",
    icon: <Trees className="h-3.5 w-3.5" aria-hidden="true" />,
  },
];

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  if (compact) {
    return (
      <div
        className="inline-flex items-center gap-0.5 rounded-lg border border-sidebar-divider bg-sidebar-hover p-0.5"
        role="group"
        aria-label="Interface theme"
      >
        {THEME_OPTIONS.map((option) => {
          const isActive = theme === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setTheme(option.id)}
              title={`${option.label} theme`}
              aria-label={`Switch to ${option.label} theme`}
              aria-pressed={isActive}
              className={[
                "flex items-center justify-center rounded-md p-1.5 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                isActive
                  ? "bg-accent text-accent-text shadow-sm"
                  : "text-sidebar-muted hover:bg-sidebar hover:text-sidebar-text",
              ].join(" ")}
            >
              {option.icon}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-center justify-between px-0.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted">
        <span>Interface Theme</span>
        <span className="font-mono text-[10px] normal-case text-sidebar-text">
          {THEME_OPTIONS.find((option) => option.id === theme)?.label ??
            "Light"}
        </span>
      </div>

      <div
        className="grid grid-cols-5 gap-1 rounded-lg border border-sidebar-divider bg-sidebar-hover p-1"
        role="group"
        aria-label="Choose interface theme"
      >
        {THEME_OPTIONS.map((option) => {
          const isActive = theme === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setTheme(option.id)}
              aria-pressed={isActive}
              aria-label={`Switch to ${option.label} theme`}
              title={`${option.label} theme`}
              className={[
                "flex min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-[10px] font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                isActive
                  ? "bg-accent text-accent-text shadow-sm"
                  : "text-sidebar-muted hover:bg-sidebar hover:text-sidebar-text",
              ].join(" ")}
            >
              {option.icon}
              <span className="truncate">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
