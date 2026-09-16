"use client";

import { useTheme } from "~/lib/theme/context";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={toggleTheme}
      className="rounded border border-border bg-card px-2 py-1 text-sm text-foreground"
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}
