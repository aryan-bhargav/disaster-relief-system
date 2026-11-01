export type ThemeMode =
  | "light"
  | "dark"
  | "tactical"
  | "ocean"
  | "forest";

export interface ThemeOption {
  id: ThemeMode;
  name: string;
  description: string;
  icon: "sun" | "moon" | "shield" | "waves" | "trees";
}

export interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}
