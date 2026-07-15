import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#12140F",
        paper: "#F6F4EC",
        moss: "#2B3A2A",
        clay: "#C8622D",
        wheat: "#E4DCC0",
        line: "#D8D1BC",
        good: "#3F6B3F",
        bad: "#B03A2E",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        card: "28px",
      },
    },
  },
  plugins: [],
};
export default config;
