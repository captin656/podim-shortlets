import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0f172a",
          soft: "#334155",
          mute: "#64748b",
          faint: "#94a3b8",
        },
        accent: {
          DEFAULT: "#f97316",
          deep: "#ea580c",
          wash: "#fff4ec",
        },
        mist: {
          DEFAULT: "#f5f5f7",
          deep: "#e8e8ed",
        },
        hairline: "rgba(15, 23, 42, 0.1)",
      },
      fontFamily: {
        sans: [
          '"Inter Variable"',
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "system-ui",
          "sans-serif",
        ],
      },
      fontSize: {
        // Fluid type scale. Display sizes tighten tracking the way SF Pro does.
        "display-xl": ["clamp(2.75rem, 1.4rem + 6.4vw, 7rem)", { lineHeight: "1.02", letterSpacing: "-0.045em", fontWeight: "650" }],
        "display-lg": ["clamp(2.25rem, 1.3rem + 4.2vw, 5rem)", { lineHeight: "1.04", letterSpacing: "-0.04em", fontWeight: "650" }],
        "display-md": ["clamp(1.75rem, 1.2rem + 2.4vw, 3.25rem)", { lineHeight: "1.08", letterSpacing: "-0.03em", fontWeight: "620" }],
        "title": ["clamp(1.25rem, 1.1rem + 0.7vw, 1.75rem)", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "620" }],
        "lead": ["clamp(1.0625rem, 1rem + 0.45vw, 1.5rem)", { lineHeight: "1.4", letterSpacing: "-0.012em" }],
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        lift: "0 1px 2px rgba(15,23,42,0.04), 0 12px 40px -12px rgba(15,23,42,0.18)",
        float: "0 2px 6px rgba(15,23,42,0.06), 0 30px 80px -20px rgba(15,23,42,0.35)",
        ring: "0 0 0 1px rgba(15,23,42,0.08)",
      },
      transitionTimingFunction: {
        apple: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        rise: {
          from: { opacity: "0", transform: "translateY(28px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        sheet: {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        fade: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        rise: "rise 1s cubic-bezier(0.32, 0.72, 0, 1) both",
        sheet: "sheet 0.45s cubic-bezier(0.32, 0.72, 0, 1) both",
        fade: "fade 0.3s ease both",
      },
    },
  },
  plugins: [],
};

export default config;
