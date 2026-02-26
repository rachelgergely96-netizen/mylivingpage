import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        gold: "#D4A654",
        "gold-light": "#F0D48A",
        "deep-purple": "#1A0A2E",
        "mid-purple": "#0F0519",
        "rich-purple": "#120A20",
        "text-primary": "#F5F0EB",
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
        glow: "0 0 40px rgba(212, 166, 84, 0.2)",
      },
    },
  },
  plugins: [],
};

export default config;
