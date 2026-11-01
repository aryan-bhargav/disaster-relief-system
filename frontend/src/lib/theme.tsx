"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { ThemeMode, ThemeContextType } from "@/types";
import { THEME_STORAGE_KEY, DEFAULT_THEME } from "@/constants";

const ThemeContext = createContext<ThemeContextType>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
      if (savedTheme && (savedTheme === "light" || savedTheme === "dark" || savedTheme === "tactical")) {
        setThemeState(savedTheme);
        document.documentElement.setAttribute("data-theme", savedTheme);
      } else {
        document.documentElement.setAttribute("data-theme", DEFAULT_THEME);
      }
    } catch {
      document.documentElement.setAttribute("data-theme", DEFAULT_THEME);
    }
    setMounted(true);
  }, []);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      document.documentElement.setAttribute("data-theme", newTheme);
    } catch {
      // ignore storage errors
    }
  };

  const toggleTheme = () => {
    const sequence: ThemeMode[] = ["light", "dark", "tactical"];
    const nextIdx = (sequence.indexOf(theme) + 1) % sequence.length;
    setTheme(sequence[nextIdx]);
  };

  // Prevent hydration mismatch by always rendering context
  return (
    <ThemeContext.Provider value={{ theme: mounted ? theme : DEFAULT_THEME, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
