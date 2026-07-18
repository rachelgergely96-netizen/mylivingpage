import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        site: {
          canvas: "var(--site-canvas)",
          "canvas-alt": "var(--site-canvas-alt)",
          surface: "var(--site-surface)",
          "surface-raised": "var(--site-surface-raised)",
          selected: "var(--site-surface-selected)",
          border: "var(--site-border)",
          "border-strong": "var(--site-border-strong)",
          text: "var(--site-text)",
          secondary: "var(--site-text-secondary)",
          muted: "var(--site-text-muted)",
          action: "var(--site-action)",
          "action-hover": "var(--site-action-hover)",
          "action-active": "var(--site-action-active)",
          "action-ink": "var(--site-action-ink)",
          success: "var(--site-success)",
          warning: "var(--site-warning)",
          danger: "var(--site-danger)",
          focus: "var(--site-focus)",
        },
        gold: "#3B82F6",
        "gold-light": "#93C5FD",
        "deep-purple": "#0A1628",
        "mid-purple": "#060E1C",
        "rich-purple": "#081222",
        "text-primary": "#F0F4FF",
      },
      fontFamily: {
        site: ["var(--font-dm-sans)", "sans-serif"],
        heading: ["var(--font-playfair)", "serif"],
        body: ["var(--font-dm-sans)", "sans-serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
      },
      transitionTimingFunction: {
        soft: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      boxShadow: {
        glow: "0 0 40px rgba(59, 130, 246, 0.2)",
      },
    },
  },
  plugins: [],
};

export default config;
