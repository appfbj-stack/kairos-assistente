/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Paleta Kairos
        primary: { DEFAULT: "#5c7cfa", dark: "#4c6ef5" },
      },
    },
  },
  plugins: [],
};
