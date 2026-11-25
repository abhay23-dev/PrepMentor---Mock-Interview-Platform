import { create } from "zustand";

export type Theme = "light" | "dark";

const STORAGE_KEY = "prepmentor-theme";

// Keep this logic in sync with the inline script in index.html, which runs
// before React so the right theme is painted from the first frame.
const getInitialTheme = (): Theme => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage unavailable (private mode, etc.)
  }
  return window.matchMedia?.("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
};

const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
};

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initial = getInitialTheme();
  applyTheme(initial);

  return {
    theme: initial,
    setTheme: (theme) => {
      applyTheme(theme);
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        // ignore: the theme still changes for this session
      }
      set({ theme });
    },
    toggleTheme: () => {
      get().setTheme(get().theme === "dark" ? "light" : "dark");
    },
  };
});
