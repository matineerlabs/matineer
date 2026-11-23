export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: "rgb(var(--color-dark-bg) / <alpha-value>)",
          card: "rgb(var(--color-dark-card) / <alpha-value>)",
          surface: "rgb(var(--color-dark-surface) / <alpha-value>)",
          border: "rgb(var(--color-dark-border) / <alpha-value>)",
          hover: "rgb(var(--color-dark-hover) / <alpha-value>)",
        },
        gray: {
          100: "rgb(var(--color-gray-100) / <alpha-value>)",
          200: "rgb(var(--color-gray-200) / <alpha-value>)",
          300: "rgb(var(--color-gray-300) / <alpha-value>)",
          400: "rgb(var(--color-gray-400) / <alpha-value>)",
          500: "rgb(var(--color-gray-500) / <alpha-value>)",
          600: "rgb(var(--color-gray-600) / <alpha-value>)",
          700: "rgb(var(--color-gray-700) / <alpha-value>)",
          800: "rgb(var(--color-gray-800) / <alpha-value>)",
          900: "rgb(var(--color-gray-900) / <alpha-value>)",
        },
        slate: {
          300: "rgb(var(--color-gray-300) / <alpha-value>)",
          400: "rgb(var(--color-gray-400) / <alpha-value>)",
          600: "rgb(var(--color-gray-600) / <alpha-value>)",
          700: "rgb(var(--color-gray-700) / <alpha-value>)",
          800: "rgb(var(--color-gray-800) / <alpha-value>)",
        },
        brand: {
          blue: "rgb(var(--color-brand-blue) / <alpha-value>)",
          blueHover: "rgb(var(--color-brand-blueHover) / <alpha-value>)",
          accent: "rgb(var(--color-brand-accent) / <alpha-value>)",
          accentHover: "rgb(var(--color-brand-accentHover) / <alpha-value>)",
          purple: "rgb(var(--color-brand-purple) / <alpha-value>)",
          purpleHover: "rgb(var(--color-brand-purpleHover) / <alpha-value>)",
          text: "rgb(var(--color-brand-text) / <alpha-value>)",
          green: "rgb(var(--color-brand-green) / <alpha-value>)",
          greenHover: "rgb(var(--color-brand-greenHover) / <alpha-value>)",
          orange: "#d97706"
        }
      }
    },
  },
  plugins: [],
}
