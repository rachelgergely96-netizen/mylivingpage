import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        gold: "#3B82F6",
        "gold-light": "#93C5FD",
        "deep-purple": "#0A1628",
        "mid-purple": "#060E1C",
        "rich-purple": "#081222",
        "text-primary": "#F0F4FF",
      },
      fontFamily: {
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
