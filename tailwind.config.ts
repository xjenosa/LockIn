import type { Config } from "tailwindcss";

// LOCKIN design tokens. See BRAND.md for roles and contrast budgets.
// Two-color logic: signal (teal) = live, flare (coral) = stakes.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B0D12", // page background
        stage: "#111826", // full-screen moment backdrop
        tile: "#1B2332", // board cells, cards, idle buzzer
        signal: "#25E6C4", // brand primary: live states, CTAs, values
        flare: "#FF6A3D", // stakes: Wildcard, wagers, Last Call
        win: "#2FD46D", // correct adjudication
        loss: "#F0335A", // wrong adjudication, negatives, urgency
      },
      fontFamily: {
        display: ["var(--font-display)", "Arial Black", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      keyframes: {
        pulseglow: {
          "0%, 100%": { boxShadow: "0 0 20px 4px rgba(37,230,196,0.55)" },
          "50%": { boxShadow: "0 0 50px 14px rgba(37,230,196,0.9)" },
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
