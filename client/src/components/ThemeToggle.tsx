import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "@/store/themeStore";

export default function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={toggleTheme}
      className="relative inline-flex h-9 w-[4.25rem] shrink-0 items-center rounded-full border border-slate-700 bg-slate-800 px-1 shadow-sm transition hover:border-slate-600"
    >
      <Sun
        size={14}
        className="absolute left-2.5 text-amber-400 opacity-70"
        aria-hidden
      />
      <Moon
        size={14}
        className="absolute right-2.5 text-blue-400 opacity-70"
        aria-hidden
      />
      <span
        className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow transition-transform duration-200 ${
          isDark ? "translate-x-[1.875rem]" : "translate-x-0"
        }`}
      >
        {isDark ? <Moon size={14} /> : <Sun size={14} />}
      </span>
    </button>
  );
}
