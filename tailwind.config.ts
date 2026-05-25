import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#11110f",
        bone: "#f6f1e7",
        volt: "#ccff00",
        coral: "#ff5d4d",
        cyan: "#37d5ff",
        plum: "#6c4cff"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "Arial", "sans-serif"],
        display: ["var(--font-space)", "Space Grotesk", "Inter", "sans-serif"]
      },
      boxShadow: {
        hard: "6px 6px 0 #11110f"
      }
    }
  },
  plugins: []
};

export default config;
