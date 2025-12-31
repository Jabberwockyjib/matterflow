import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1200px",
      },
    },
    extend: {
      fontFamily: {
        lora: ["var(--font-lora)", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        border: "var(--border)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        card: "var(--card)",
        primary: {
          DEFAULT: "#1a2f4d",
          foreground: "#ffffff",
        },
        accent: {
          DEFAULT: "#d4a929",
          foreground: "#1a2f4d",
        },
        success: "#0ea5e9",
        warning: "#f59e0b",
        danger: "#dc2626",
      },
      borderRadius: {
        lg: "12px",
        md: "10px",
        sm: "8px",
      },
      boxShadow: {
        sm: "0 2px 4px 0 rgba(30, 58, 95, 0.08), 0 1px 2px 0 rgba(30, 58, 95, 0.04)",
        DEFAULT: "0 4px 6px -1px rgba(30, 58, 95, 0.15), 0 2px 4px -1px rgba(30, 58, 95, 0.1)",
        md: "0 8px 12px -2px rgba(30, 58, 95, 0.15), 0 4px 6px -2px rgba(30, 58, 95, 0.1)",
        lg: "0 16px 24px -4px rgba(30, 58, 95, 0.18), 0 8px 12px -4px rgba(30, 58, 95, 0.12)",
        xl: "0 24px 36px -6px rgba(30, 58, 95, 0.2), 0 12px 16px -6px rgba(30, 58, 95, 0.15)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "fade-in": "fade-in 300ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in": "slide-in-right 400ms cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scale-in 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
