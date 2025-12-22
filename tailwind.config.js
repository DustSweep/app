/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dust: {
          50: "#fdf8f3",
          100: "#f9ede0",
          200: "#f2d8bd",
          300: "#e9bc8f",
          400: "#de9960",
          500: "#d57d3f",
          600: "#c66633",
          700: "#a5502c",
          800: "#85422a",
          900: "#6c3825",
        },
        void: {
          950: "#0a0908",
          900: "#141211",
          800: "#1f1c1a",
          700: "#2d2926",
          600: "#3d3834",
        },
      },
      fontFamily: {
        display: ["Instrument Serif", "Georgia", "serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        sans: ["Satoshi", "system-ui", "sans-serif"],
      },
      animation: {
        shimmer: "shimmer 2s linear infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
};
