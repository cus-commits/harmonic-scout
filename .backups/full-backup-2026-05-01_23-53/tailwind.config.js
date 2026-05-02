/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bright: '#f5f0e8',
        muted: '#a89f91',
        accent: {
          DEFAULT: '#d2b48c',
          glow: 'rgba(210, 180, 140, 0.08)',
        },
        ink: '#1a1714',
        surface: '#262320',
        card: '#2e2a25',
        border: '#3d3730',
      },
    },
  },
  plugins: [],
}
