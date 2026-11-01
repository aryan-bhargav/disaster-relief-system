import type { ThemeMode, ThemeOption } from "@/types";

export const THEME_STORAGE_KEY = "reliefops_theme_preference";

export const THEMES: Record<ThemeMode, ThemeOption> = {
  light: {
    id: "light",
    name: "ReliefOps Light",
    description:
      "Clean operational workspace with crisp surfaces and teal accents",
    icon: "sun",
  },
  dark: {
    id: "dark",
    name: "Midnight Operations",
    description:
      "Low-light charcoal workspace with cool teal highlights",
    icon: "moon",
  },
  tactical: {
    id: "tactical",
    name: "Tactical High-Visibility",
    description:
      "High-visibility dark interface with amber accents for field operations",
    icon: "shield",
  },
  ocean: {
    id: "ocean",
    name: "Ocean Blue",
    description:
      "Professional blue and slate palette for a calm enterprise workspace",
    icon: "waves",
  },
  forest: {
    id: "forest",
    name: "Forest Green",
    description:
      "Muted green and natural neutral palette for extended dashboard use",
    icon: "trees",
  },
};

export const DEFAULT_THEME: ThemeMode = "light";
