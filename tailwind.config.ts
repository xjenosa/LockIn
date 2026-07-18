import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        board: "#060CE9",
        boarddark: "#040875",
        boardcell: "#0510CE",
        gold: "#FFCC00",
        goldsoft: "#D69F4C",
      },
      fontFamily: {
        display: ["var(--font-display)", "Impact", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      keyframes: {
        pulseglow: {
          "0%, 100%": { boxShadow: "0 0 20px 4px rgba(34,197,94,0.7)" },
          "50%": { boxShadow: "0 0 50px 14px rgba(34,197,94,0.95)" },
        },
        pop: {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "80%": { transform: "scale(1.06)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        fall: {
          "0%": { transform: "translateY(-10vh) rotate(0deg)" },
          "100%": { transform: "translateY(110vh) rotate(720deg)" },
        },
      },
      animation: {
        pulseglow: "pulseglow 1.2s ease-in-out infinite",
        pop: "pop 0.35s ease-out",
        fall: "fall 3.5s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
