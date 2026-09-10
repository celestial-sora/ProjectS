/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fantasy: {
          bg: "#090a0f",
          card: "#12141d",
          border: "#232736",
          purple: "#7928ca",
          crimson: "#ff0080",
          cyan: "#00dfd8",
          gold: "#ffd700",
          blood: "#8b0000",
          abyss: "#050508"
        }
      },
      fontFamily: {
        cinzel: ['"Cinzel"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
