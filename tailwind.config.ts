import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Strictly black/white theme tokens — no gray-scale drift between modes.
        // Light: background #fff, foreground #000. Dark: exact inverse.
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        border: "var(--border)",
        muted: "var(--muted)",
      },
    },
  },
  plugins: [],
} satisfies Config;
