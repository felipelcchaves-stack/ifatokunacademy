import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Forest palette - main green tones
        forest: {
          50: "hsl(145, 40%, 96%)",
          100: "hsl(145, 38%, 90%)",
          200: "hsl(145, 40%, 78%)",
          300: "hsl(145, 42%, 62%)",
          400: "hsl(145, 44%, 48%)",
          500: "hsl(145, 45%, 35%)",
          600: "hsl(145, 48%, 28%)",
          700: "hsl(145, 50%, 22%)",
          800: "hsl(145, 52%, 16%)",
          900: "hsl(145, 55%, 10%)",
        },
        // Sacred gold palette
        sacred: {
          50: "hsl(45, 85%, 96%)",
          100: "hsl(44, 80%, 90%)",
          200: "hsl(43, 78%, 80%)",
          300: "hsl(42, 76%, 68%)",
          400: "hsl(42, 75%, 58%)",
          500: "hsl(42, 75%, 55%)",
          600: "hsl(40, 72%, 45%)",
          700: "hsl(38, 70%, 38%)",
          800: "hsl(35, 68%, 30%)",
          900: "hsl(32, 65%, 22%)",
        },
        // Earth brown palette
        earth: {
          50: "hsl(30, 30%, 96%)",
          100: "hsl(28, 28%, 90%)",
          200: "hsl(26, 32%, 78%)",
          300: "hsl(24, 38%, 62%)",
          400: "hsl(24, 42%, 45%)",
          500: "hsl(25, 45%, 25%)",
          600: "hsl(24, 48%, 20%)",
          700: "hsl(23, 50%, 16%)",
          800: "hsl(22, 52%, 12%)",
          900: "hsl(20, 55%, 8%)",
        },
        // Legacy gold (now maps to sacred)
        gold: {
          50: "hsl(45, 85%, 95%)",
          100: "hsl(45, 80%, 88%)",
          200: "hsl(42, 78%, 78%)",
          300: "hsl(40, 76%, 68%)",
          400: "hsl(38, 75%, 58%)",
          500: "hsl(38, 75%, 50%)",
          600: "hsl(35, 72%, 42%)",
          700: "hsl(32, 70%, 35%)",
          800: "hsl(28, 68%, 28%)",
          900: "hsl(25, 65%, 20%)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-left": {
          from: { transform: "translateX(-100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-forest": {
          "0%, 100%": { boxShadow: "0 0 0 0 hsla(145, 45%, 35%, 0.5)" },
          "50%": { boxShadow: "0 0 25px 12px hsla(145, 45%, 35%, 0.15)" },
        },
        "glow-sacred": {
          "0%, 100%": { filter: "drop-shadow(0 0 8px hsla(42, 75%, 55%, 0.6))" },
          "50%": { filter: "drop-shadow(0 0 16px hsla(42, 75%, 55%, 0.8))" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.5s ease-out",
        "slide-in-left": "slide-in-left 0.5s ease-out",
        "float": "float 3s ease-in-out infinite",
        "pulse-forest": "pulse-forest 2.5s infinite",
        "glow-sacred": "glow-sacred 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
