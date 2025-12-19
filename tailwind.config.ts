import type { Config } from "tailwindcss";

const config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#020617",
        scroll: {
          DEFAULT: "#e2d5b6",
          dark: "#d6c6a1",
        },
        mana: {
          DEFAULT: "#22d3ee",
          border: "rgb(6 182 212 / 0.5)",
        },
        gold: {
          DEFAULT: "#fbbf24",
          solid: "#f59e0b",
        },
        blood: {
          DEFAULT: "#f43f5e",
          shadow: "rgb(244 63 94 / 0.2)",
        },
      },
      fontFamily: {
        serif: ["Cinzel", "ui-serif", "Georgia", "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
