import type { Config } from "tailwindcss";

/** Theme tokens live in app/globals.css as `R G B` channel triplets so that
 *  opacity modifiers (text-ink/55) and the dark theme both keep working. */
const token = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: token("ink"),
        bone: token("bone"),
        white: token("paper"),
        volt: token("volt"),
        coral: token("coral"),
        cyan: token("cyan"),
        plum: token("plum"),
        // Fixed values that never flip: for text sitting on a vivid accent,
        // and for the rare element that must stay dark in both themes.
        scrim: token("scrim"),
        stamp: "#11110f",
        chalk: "#f6f1e7"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "Arial", "sans-serif"],
        display: ["var(--font-space)", "Space Grotesk", "Inter", "sans-serif"]
      },
      boxShadow: {
        hard: "6px 6px 0 rgb(var(--c-ink))",
        "hard-sm": "4px 4px 0 rgb(var(--c-ink))",
        "hard-lg": "8px 8px 0 rgb(var(--c-ink))",
        "hard-inv": "6px 6px 0 rgb(var(--c-bone))",
        "hard-soft": "6px 6px 0 rgb(var(--c-ink) / 0.72)",
        "hard-sm-soft": "4px 4px 0 rgb(var(--c-ink) / 0.72)"
      }
    }
  },
  plugins: []
};

export default config;
