import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff8eb",
          100: "#feefc7",
          200: "#fde08b",
          300: "#fbce4e",
          400: "#fabe24",
          500: "#f9b12b",
          600: "#e4920e",
          700: "#be6e0c",
          800: "#965210",
          900: "#7c4411",
        },
        ink: {
          950: "#09090b",
          900: "#18181b",
          850: "#222225",
          800: "#27272a",
          700: "#3f3f46",
          600: "#52525b",
        },
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      boxShadow: {
        card: "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 24px 38px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
        glow: "0 0 20px rgba(249,177,43,0.35), 0 0 40px rgba(228,146,14,0.15)",
        "glass-inset": "inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.5)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        }
      },
      animation: {
        "fade-in": "fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "scale-in": "scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "float": "float 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-in-right": "slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    function ({ addUtilities, addComponents, matchUtilities }: any) {
      // Dark mode toggle component utilities will be added here
    }
  ],
  darkMode: 'class',
};

export default config;
