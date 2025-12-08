import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark backgrounds with depth
        background: {
          DEFAULT: "#050507",
          secondary: "#0a0a0f",
        },
        surface: {
          DEFAULT: "#0f0f14",
          light: "#16161d",
          elevated: "#1a1a24",
        },
        border: {
          DEFAULT: "rgba(255, 255, 255, 0.08)",
          light: "rgba(255, 255, 255, 0.12)",
          glow: "rgba(139, 92, 246, 0.3)",
        },
        // Primary blue
        primary: {
          DEFAULT: "#3b82f6",
          hover: "#2563eb",
          muted: "rgba(59, 130, 246, 0.15)",
          glow: "rgba(59, 130, 246, 0.4)",
        },
        // Purple accent - new!
        accent: {
          DEFAULT: "#8b5cf6",
          light: "#a78bfa",
          dark: "#7c3aed",
          muted: "rgba(139, 92, 246, 0.15)",
          glow: "rgba(139, 92, 246, 0.4)",
        },
        // Status colors
        success: {
          DEFAULT: "#10b981",
          light: "#34d399",
          muted: "rgba(16, 185, 129, 0.15)",
          glow: "rgba(16, 185, 129, 0.4)",
        },
        warning: {
          DEFAULT: "#f59e0b",
          light: "#fbbf24",
          muted: "rgba(245, 158, 11, 0.15)",
        },
        error: {
          DEFAULT: "#ef4444",
          light: "#f87171",
          muted: "rgba(239, 68, 68, 0.15)",
          glow: "rgba(239, 68, 68, 0.4)",
        },
        // Text colors
        text: {
          primary: "#ffffff",
          secondary: "#a1a1aa",
          muted: "#71717a",
          accent: "#c4b5fd",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        // Gradient backgrounds
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "gradient-primary": "linear-gradient(135deg, #3b82f6, #8b5cf6)",
        "gradient-accent": "linear-gradient(135deg, #8b5cf6, #ec4899)",
        "gradient-dark": "linear-gradient(180deg, #0f0f14 0%, #050507 100%)",
        "gradient-card": "linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)",
        "gradient-glow": "radial-gradient(ellipse at center, rgba(139, 92, 246, 0.15) 0%, transparent 70%)",
        "mesh-gradient": "radial-gradient(at 40% 20%, rgba(139, 92, 246, 0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(59, 130, 246, 0.1) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(139, 92, 246, 0.08) 0px, transparent 50%)",
      },
      boxShadow: {
        "glow-sm": "0 0 15px -3px rgba(139, 92, 246, 0.2)",
        "glow-md": "0 0 25px -5px rgba(139, 92, 246, 0.25)",
        "glow-lg": "0 0 35px -5px rgba(139, 92, 246, 0.3)",
        "glow-primary": "0 0 20px rgba(59, 130, 246, 0.3)",
        "glow-accent": "0 0 20px rgba(139, 92, 246, 0.3)",
        "glow-success": "0 0 20px rgba(16, 185, 129, 0.3)",
        "glow-error": "0 0 20px rgba(239, 68, 68, 0.3)",
        "inner-glow": "inset 0 1px 0 0 rgba(255, 255, 255, 0.05)",
        "card": "0 4px 24px -4px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)",
        "card-hover": "0 8px 32px -4px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(139, 92, 246, 0.2)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        "gradient-shift": "gradientShift 8s ease infinite",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(139, 92, 246, 0.2)" },
          "50%": { boxShadow: "0 0 30px rgba(139, 92, 246, 0.4)" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
