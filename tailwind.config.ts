import type { Config } from "tailwindcss";

// LockIn design tokens. See BRAND.md for roles and contrast budgets.
// Two-color logic: signal (teal) = live, flare (coral) = stakes.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#010A13", // page background
        stage: "#111826", // full-screen moment backdrop
        tile: "#1B2332", // board cells, cards, idle buzzer
        signal: "#43E2D2", // brand primary: live states, CTAs, values
        flare: "#F38764", // stakes: Wildcard, wagers, Last Call
        win: "#2FD46D", // correct adjudication
        loss: "#F0335A", // wrong adjudication, negatives, urgency
      },
      fontFamily: {
        display: ["var(--font-display)", "Arial Black", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      keyframes: {
        pulseglow: {
          // signal (#43E2D2) as rgb; keep in sync with the token above.
          "0%, 100%": { boxShadow: "0 0 20px 4px rgba(67,226,210,0.55)" },
          "50%": { boxShadow: "0 0 50px 14px rgba(67,226,210,0.9)" },
        },
        breathe: {
          // Slow teal breath for the landing lock. drop-shadow (not box-shadow)
          // so the glow hugs the padlock silhouette, not its square bounding box.
          "0%, 100%": { filter: "drop-shadow(0 0 16px rgba(67,226,210,0.28))" },
          "50%": { filter: "drop-shadow(0 0 40px rgba(67,226,210,0.55))" },
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
        breathe: "breathe 4.5s ease-in-out infinite",
        pop: "pop 0.35s ease-out",
        fall: "fall 3.5s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
