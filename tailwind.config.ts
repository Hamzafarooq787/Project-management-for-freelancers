import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#030a07",
          900: "#060e0b",
          850: "#08120e",
          800: "#0b1914",
          700: "#10231c",
          600: "#162e25",
          500: "#1f3a2e",
        },
        accent: {
          50: "#e9fdf3",
          100: "#c8fadf",
          200: "#95f2c1",
          300: "#5fe6a2",
          400: "#33d485",
          500: "#1fb96e",
          600: "#169458",
          700: "#12744a",
          800: "#115c3d",
          900: "#0f4b34",
        },
        amber: {
          400: "#f2b84b",
          500: "#e5a032",
        },
        rose: {
          400: "#f2707a",
          500: "#e5525e",
        },
        sky: {
          400: "#4fc3e0",
          500: "#2fa9c9",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.4), 0 8px 24px -12px rgba(0,0,0,0.5)",
        glow: "0 0 0 1px rgba(51,212,133,0.15), 0 8px 24px -8px rgba(31,185,110,0.25)",
      },
      borderRadius: {
        xl2: "1.1rem",
      },
    },
  },
  plugins: [],
};

export default config;
